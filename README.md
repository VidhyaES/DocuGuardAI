# DocuGuard AI 🛡️

> **AI-powered ID Document Forgery Detection System**  
> Interview Task Submission — AI/ML Engineer Position

[![Live Demo](https://img.shields.io/badge/Live%20Demo-docuguardai.onrender.com-00e5ff?style=for-the-badge)](https://docuguardai.onrender.com)
[![GitHub](https://img.shields.io/badge/GitHub-VidhyaES-181717?style=for-the-badge&logo=github)](https://github.com/VidhyaES)
[![Portfolio](https://img.shields.io/badge/Portfolio-vidhya--es-7c3aed?style=for-the-badge](https://vidhya-es-portfolio.vercel.app/)

---

## 🌐 Live Demo
👉 **[https://docuguardai.onrender.com](https://docuguardai.onrender.com)**

> Note: Hosted on Render free tier — may take ~30 seconds to wake up on first visit.

---

## Overview

DocuGuard AI is a full-stack prototype that accepts an uploaded ID document image and produces a structured forensic fraud detection report indicating whether the document may be genuine or suspicious.

Built as a technical assessment to evaluate:
- Problem understanding
- Approach to fraud detection
- Ability to combine AI tools
- Reasoning and reporting

---

## Features

- 📄 **Image Upload** — Drag-and-drop or file picker (JPG, PNG, WEBP, BMP, GIF)
- ✅ **Image Validation** — MIME type whitelist + file size check (max 15 MB)
- 🔍 **AI Forensic Analysis** — 8-dimension tampering detection via Groq Vision (Llama 4 Scout 17B)
- 📊 **Structured Report** — Verdict, risk score (0–100), per-check cards, findings, summary, recommendation
- 🎨 **Animated UI** — Dark forensic-themed interface with live step-by-step loading

---

## Task Requirements vs Implementation

| Requirement | Implementation |
|---|---|
| Accept ID document image | Drag-and-drop + file picker, all common image formats |
| Validate image type | MIME type whitelist + file size check on the backend |
| Detect potential tampering | Groq Vision API with structured forensic prompt across 8 dimensions |
| Generate structured fraud report | JSON report: verdict, risk score, 8 checks, findings, summary, recommendation |
| Display the report | Animated UI with color-coded risk indicators and per-check status cards |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Backend | FastAPI (Python) |
| AI Vision | Groq — Llama 4 Scout 17B Vision |
| Frontend | Vanilla JS + CSS (served via Jinja2) |
| Deployment | Render |

---

## Forensic Analysis Dimensions

The AI model analyzes each document across 8 dimensions:

1. **Document Structure** — Layout, proportions, standard formatting
2. **Font & Text Consistency** — Character spacing, font uniformity, bleed artifacts
3. **Photo Integration** — Boundary artifacts, lighting mismatches, pasting signs
4. **Edge & Border Analysis** — Cutting, cropping, distortion indicators
5. **Security Features** — Visible holograms, microprint, watermarks, MRZ
6. **Pixel Anomaly Detection** — Compression artifacts, cloning, smearing
7. **Color & Lighting Uniformity** — Inconsistent shadows, saturation shifts
8. **Layout & Alignment** — Text misalignment, spacing irregularities

---

## Report Output

Each analysis returns a structured JSON report:

```json
{
  "verdict": "GENUINE | SUSPICIOUS | LIKELY_FORGED | UNCERTAIN",
  "risk_score": 0,
  "document_type": "Passport",
  "issuing_country": "India",
  "checks": [...],
  "key_findings": [...],
  "summary": "...",
  "recommendation": "..."
}
```

---

## Project Structure

```
DocuGuardAI/
│
├── main.py                 ← FastAPI backend (validation + AI analysis)
├── requirements.txt        ← Python dependencies
├── render.yaml             ← Render deployment config
├── .env.example            ← Environment variable template
├── .gitignore
│
├── templates/
│   └── index.html          ← Jinja2 HTML template
│
└── static/
    ├── style.css           ← Forensic dark-theme UI
    └── app.js              ← Upload, API call, report rendering
```

---

## Run Locally

```bash
# 1. Clone the repo
git clone https://github.com/VidhyaES/DocuGuardAI.git
cd DocuGuardAI

# 2. Create virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Mac/Linux

# 3. Install dependencies
pip install -r requirements.txt

# 4. Set up environment variables
copy .env.example .env
# Add your GROQ_API_KEY inside .env

# 5. Start the server
uvicorn main:app --reload

# 6. Open browser
# → http://127.0.0.1:8000
```

---

## Environment Variables

| Variable | Description | Get it here |
|---|---|---|
| `GROQ_API_KEY` | Groq API key for Llama 4 Scout Vision | [console.groq.com](https://console.groq.com) |

---

## Limitations & Future Work

| Limitation | Production Solution |
|---|---|
| No ELA (Error Level Analysis) | Byte-level pixel compression artifact analysis |
| No EXIF metadata parsing | Extract GPS, timestamps, editing software traces |
| No MRZ validation | Machine Readable Zone parsing for passports |
| No report persistence | Database logging for audit trails |
| AI accuracy is indicative | Ensemble of specialized CV models |

---

## Submitted by

**Vidhya ES** — Junior AI/ML Engineer & Computer Vision Specialist  
🌐 [Portfolio](https://vidhya-es-portfolio.vercel.app/) &nbsp;·&nbsp; 💻 [GitHub](https://github.com/VidhyaES)

---

> ⚠️ DocuGuard AI is a prototype forensic tool. Results are indicative only and should not be the sole basis for legal or security decisions.
