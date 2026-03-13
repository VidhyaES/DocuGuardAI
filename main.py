import os
import base64
import json
import uuid
from datetime import datetime

import httpx
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.requests import Request
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="DocuGuard AI", version="1.0.0")

app.mount("/static", StaticFiles(directory="static"), name="static")
templates = Jinja2Templates(directory="templates")

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"

ALLOWED_MIME_TYPES = {
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
    "image/bmp",
    "image/gif",
}

MAX_FILE_SIZE_MB = 15
MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024


# ─── ROUTES ────────────────────────────────────────────────────────────────

@app.get("/", response_class=HTMLResponse)
async def index(request: Request):
    return templates.TemplateResponse("index.html", {"request": request})


@app.post("/analyze")
async def analyze(file: UploadFile = File(...)):
    # ── Step 1: Read file ──────────────────────────────────────────────────
    contents = await file.read()

    # ── Step 2: Validate image type & size ────────────────────────────────
    mime_type = file.content_type or ""

    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file type '{mime_type}'. Allowed: JPEG, PNG, WEBP, BMP, GIF."
        )

    file_size_mb = len(contents) / (1024 * 1024)
    if len(contents) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=400,
            detail=f"File too large ({file_size_mb:.2f} MB). Maximum allowed is {MAX_FILE_SIZE_MB} MB."
        )

    if not GROQ_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GROQ_API_KEY is not set in .env file."
        )

    # ── Step 3: Encode image & call Groq Vision ───────────────────────────
    # Normalize mime type for data URL
    display_mime = "image/jpeg" if mime_type in ("image/jpg", "image/jpeg") else mime_type
    image_b64 = base64.standard_b64encode(contents).decode("utf-8")
    data_url = f"data:{display_mime};base64,{image_b64}"

    forensic_prompt = """You are a forensic document analysis AI. Analyze this ID document image for signs of forgery or tampering.

Respond ONLY with a valid JSON object in this exact format (no markdown, no backticks, just raw JSON):
{
  "verdict": "GENUINE" or "SUSPICIOUS" or "LIKELY_FORGED" or "UNCERTAIN",
  "risk_score": <integer 0-100, where 0=definitely genuine, 100=definitely forged>,
  "document_type": "<detected type, e.g. Passport, Driver License, National ID, Unknown>",
  "issuing_country": "<detected country or Unknown>",
  "checks": [
    {"name": "Document Structure",          "status": "PASS or WARN or FAIL or INFO", "detail": "<brief finding>"},
    {"name": "Font & Text Consistency",     "status": "PASS or WARN or FAIL or INFO", "detail": "<brief finding>"},
    {"name": "Photo Integration",           "status": "PASS or WARN or FAIL or INFO", "detail": "<brief finding>"},
    {"name": "Edge & Border Analysis",      "status": "PASS or WARN or FAIL or INFO", "detail": "<brief finding>"},
    {"name": "Security Features",           "status": "PASS or WARN or FAIL or INFO", "detail": "<brief finding>"},
    {"name": "Pixel Anomaly Detection",     "status": "PASS or WARN or FAIL or INFO", "detail": "<brief finding>"},
    {"name": "Color & Lighting Uniformity", "status": "PASS or WARN or FAIL or INFO", "detail": "<brief finding>"},
    {"name": "Layout & Alignment",          "status": "PASS or WARN or FAIL or INFO", "detail": "<brief finding>"}
  ],
  "key_findings": ["<finding 1>", "<finding 2>", "<finding 3>"],
  "summary": "<2-3 sentence professional summary of the overall analysis>",
  "recommendation": "<actionable recommendation based on the verdict>"
}"""

    payload = {
        "model": "meta-llama/llama-4-scout-17b-16e-instruct",
        "max_tokens": 1500,
        "temperature": 0.1,
        "messages": [
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": data_url}
                    },
                    {
                        "type": "text",
                        "text": forensic_prompt
                    }
                ]
            }
        ]
    }

    headers = {
        "Authorization": f"Bearer {GROQ_API_KEY}",
        "Content-Type": "application/json",
    }

    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(GROQ_API_URL, json=payload, headers=headers)

    if response.status_code != 200:
        err = response.json().get("error", {})
        raise HTTPException(
            status_code=502,
            detail=f"Groq API error: {err.get('message', response.text)}"
        )

    # ── Step 4: Parse structured report ───────────────────────────────────
    api_data = response.json()

    try:
        raw_text = api_data["choices"][0]["message"]["content"].strip()
    except (KeyError, IndexError):
        raise HTTPException(
            status_code=500,
            detail="Unexpected response structure from Groq API."
        )

    # Strip accidental markdown fences
    clean_text = raw_text.replace("```json", "").replace("```", "").strip()

    try:
        report = json.loads(clean_text)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=500,
            detail="Failed to parse analysis response. Please try again."
        )

    # ── Step 5: Enrich with metadata & return ─────────────────────────────
    report["report_id"]    = "DG-" + uuid.uuid4().hex[:6].upper()
    report["timestamp"]    = datetime.utcnow().isoformat() + "Z"
    report["filename"]     = file.filename
    report["file_size_mb"] = round(file_size_mb, 2)
    report["mime_type"]    = mime_type

    return JSONResponse(content=report)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "DocuGuard AI", "model": "llama-4-scout-17b"}