# AI-Powered Real-Time Detection and Prevention of Voice Cloning Impersonation Attacks

## SIH Problem Statement

**Problem Statement ID:** SIH26104 / PS26104  
**Theme:** Blockchain & Cybersecurity  
**Category:** Software  
**Organization:** All India Council for Technical Education (Cyber Security Cell)

## Overview

This project is an AI-powered security framework designed to detect synthetic or cloned voices during live or near-real-time communication.

The system combines voice anti-spoofing (AASIST model), speaker verification, behavioral/prosodic analysis, contextual risk assessment, and security response workflows to identify potential voice-cloning impersonation attacks.

The objective is to provide an additional security layer for scenarios such as:

- Financial transactions
- Executive/CXO impersonation
- Government communication
- Privileged approvals
- Confidential information disclosure
- Enterprise and contact-center communication

## Project Structure

```
├── backend/                    # FastAPI REST + WebSocket API server
│   ├── main.py                 # FastAPI app with /upload, /predict, /ws/live
│   ├── audio_processing.py     # Real AASIST-based detection engine
│   ├── requirements.txt        # Python dependencies
│   └── Dockerfile
├── frontend/                   # React web application (MUI + Charts)
│   ├── src/
│   │   ├── App.js              # Router with Upload & Live pages
│   │   ├── pages/
│   │   │   ├── UploadPage.js   # File upload → analysis dashboard
│   │   │   └── LivePage.js     # Real-time mic → WebSocket detection
│   │   └── components/         # AudioGraph, Waveform, Gauge, RiskSignals
│   ├── package.json
│   └── Dockerfile
├── aasist_code/                # AASIST ML model core
│   ├── models/AASIST.py        # Model architecture (Graph Attention Network)
│   ├── models/weights/AASIST.pth  # Trained weights
│   ├── main.py                 # Training pipeline (ASVspoof2019)
│   ├── detect_audio.py         # CLI: detect a single audio file
│   ├── realtime_detector.py    # CLI: real-time mic detection
│   ├── data_utils.py           # Dataset loaders
│   ├── evaluation.py           # EER & t-DCF evaluation
│   └── utils.py                # Optimizers, seeds, helpers
├── README.md
└── .gitignore
```

## Proposed Architecture

```text
Incoming Voice
      |
      v
Real-Time Audio Capture
      |
      v
Audio Preprocessing
      |
      +----------------------+
      |                      |
      v                      v
 AASIST Detector        ECAPA-TDNN
      |                Speaker Verification
      |                      |
      v                      v
Synthetic Voice       Speaker Similarity
 Detection                  |
      |                      |
      +----------+-----------+
                 |
                 v
       Prosody / Behavioral
             Analysis
                 |
                 v
        Contextual Analysis
                 |
                 v
       Dynamic Risk Engine
                 |
        +--------+--------+
        |        |        |
       LOW    MEDIUM     HIGH
        |        |        |
      Allow   Verify   Block/Alert
```

## Quick Start

### Prerequisites

- Python 3.8+
- Node.js 16+
- PyTorch (CPU or CUDA)

### 🚀 Run Frontend + Backend Together (Fastest)

**Windows:**
Double-click `run_together.bat` or run:
```cmd
.\run_together.bat
```

**Linux / macOS:**
```bash
chmod +x run_together.sh
./run_together.sh
```

**Using npm:**
```bash
npm run dev
```

---

### 🐳 Deploy Together with Docker Compose

To build and run both frontend (port 3000) and backend (port 8000) inside Docker containers:

```bash
docker compose up --build
```

- Frontend: `http://localhost:3000`
- Backend API: `http://localhost:8000`
- API Docs: `http://localhost:8000/docs`

---

### ☁️ Single-Container Unified Cloud Deployment

Deploy the entire fullstack app (React UI + FastAPI + AASIST model) as a single container on **Render**, **Railway**, **Fly.io**, or **Cloud Run**:

```bash
docker build -t voice-clone-detection .
docker run -p 8000:8000 voice-clone-detection
```

The entire system (UI + REST API + WebSocket) will be accessible on port 8000.

---

### 1. Manual Backend Setup (FastAPI + AASIST)

```bash
cd backend
pip install -r requirements.txt
python main.py
```

The API server starts at `http://localhost:8000`.

### 2. Manual Frontend Setup (React)

```bash
cd frontend
npm install
npm start
```

The web UI opens at `http://localhost:3000`.

### 3. CLI Usage (Alternative)

Detect a single audio file:

```bash
python aasist_code/detect_audio.py <path_to_audio.wav>
```

Real-time microphone detection:

```bash
python aasist_code/realtime_detector.py
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Health check |
| POST | `/upload` | Upload audio file for analysis |
| POST | `/predict` | Run prediction on pre-processed features |
| WS | `/ws/live` | WebSocket for real-time audio streaming |

## Tech Stack

- **ML Model:** AASIST (Audio Anti-Spoofing using Integrated Spectro-Temporal Graph Attention Networks)
- **Backend:** FastAPI, PyTorch, librosa, soundfile
- **Frontend:** React 18, Material-UI, Chart.js, Recharts
- **Dataset:** ASVspoof2019 (Logical Access track)