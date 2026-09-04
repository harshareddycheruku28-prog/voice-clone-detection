# Deployment Guide: Voice Clone Detection System

This guide explains how to deploy both the **React Frontend** and **FastAPI + AASIST Backend** together.

---

## 🎯 Architecture Options

| Option | Method | Best For | Cost |
|---|---|---|---|
| **Option 1** | **Docker Compose** (`docker-compose.yml`) | Local Docker, Ubuntu VPS, AWS EC2, DigitalOcean | Free / VPS cost |
| **Option 2** | **Single-Container Unified** (Root `Dockerfile`) | Render, Railway, Fly.io, Cloud Run | Free tier available |
| **Option 3** | **One-Click Local Scripts** (`run_together.bat` / `.sh`) | Testing locally on Windows / Mac / Linux | Free |

---

## 🐳 Option 1: Deploy with Docker Compose (Recommended for VPS / Local Docker)

Both services run as isolated containers with networking configured:
- **Frontend Container:** Nginx serving React on port `3000`, reverse-proxying `/upload`, `/predict`, and `/ws/` to backend.
- **Backend Container:** Python 3.10 + PyTorch + AASIST Model on port `8000`.

### Steps:

1. Ensure [Docker Desktop](https://www.docker.com/) is installed and running.
2. In the repository root, run:
   ```bash
   docker compose up --build
   ```
3. Open your browser:
   - **Web UI:** [http://localhost:3000](http://localhost:3000)
   - **Backend API:** [http://localhost:8000](http://localhost:8000)
   - **Interactive API Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)

To stop the containers:
```bash
docker compose down
```

---

## ☁️ Option 2: Single-Container Unified Cloud Deployment (Render / Railway / Fly.io)

This uses the root [Dockerfile](file:///./Dockerfile), which:
1. Compiles the React frontend using Node 18.
2. Installs Python 3.10 dependencies, PyTorch, and AASIST model weights.
3. Configures FastAPI to serve both the React Web UI on `/` and the REST + WebSocket API endpoints on the same port!

### Deploying to Render.com (Free Tier):

1. Push your code to a GitHub repository.
2. Log in to [Render Dashboard](https://dashboard.render.com).
3. Click **New +** → **Web Service**.
4. Connect your GitHub repository.
5. Configure:
   - **Environment:** `Docker`
   - **Dockerfile Path:** `./Dockerfile`
   - **Instance Type:** Free (or Starter with 1GB+ RAM for PyTorch)
6. Click **Deploy Web Service**.
7. Render will provide a public URL (e.g. `https://your-app.onrender.com`). Both frontend and backend work out-of-the-box!

### Deploying to Railway.app:

1. Create a new project on [Railway](https://railway.app/).
2. Select **Deploy from GitHub repo**.
3. Railway will automatically detect the root `Dockerfile` and build both the frontend and backend into a single unified service.
4. Add a custom domain or generate a Railway domain in the service **Settings** → **Networking**.

### Deploying to Fly.io:

```bash
fly launch
fly deploy
```

---

## 💻 Option 3: Local One-Click Execution (No Docker Required)

If you have Python 3.8+ and Node.js 16+ installed:

### On Windows:
Double-click `run_together.bat` or open PowerShell / Command Prompt:
```cmd
.\run_together.bat
```
This automatically launches two terminal windows:
- One running `uvicorn main:app` on port `8000`
- One running `react-scripts start` on port `3000`

### On Linux / macOS:
```bash
chmod +x run_together.sh
./run_together.sh
```

### Using npm:
```bash
npm run dev
```

---

## ⚙️ Environment Variables (Optional)

| Variable | Description | Default |
|---|---|---|
| `PORT` | Port for the backend server | `8000` |
| `REACT_APP_API_URL` | Base URL for REST API calls | Same origin in production, `http://localhost:8000` in dev |
| `REACT_APP_WS_URL` | Base WebSocket URL | Same host in production, `ws://localhost:8000` in dev |

---

## 🔍 Verification & Health Check

After deployment, check that the service is running:

1. **Health Check:**
   ```bash
   curl http://localhost:8000/health
   # Response: {"status": "healthy", "service": "audio-ai-detection", ...}
   ```
2. **Model Status:**
   Check the server logs for:
   ```text
   [AASIST] Loading model weights from: .../AASIST.pth
   [AASIST] Model loaded successfully on cpu
   ```
