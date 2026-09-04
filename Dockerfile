# Multi-stage Dockerfile: Unified Full-Stack Deployment (Frontend + Backend + AASIST)
# Builds React UI and serves it directly via FastAPI with the AASIST model loaded.

# Stage 1: Build React Frontend
FROM node:18-alpine AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm install

COPY frontend/ ./
ENV REACT_APP_API_URL=""
RUN npm run build

# Stage 2: Python Backend + AASIST AI Model
FROM python:3.10-slim AS runner

WORKDIR /app

# Install system audio and C dependencies
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    libsndfile1-dev \
    ffmpeg \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend source code & AASIST model files
COPY backend/ ./backend/
COPY aasist_code/ ./aasist_code/

# Copy built frontend assets to frontend/build
COPY --from=frontend-builder /app/frontend/build ./frontend/build

WORKDIR /app/backend

EXPOSE 8000
ENV PORT=8000

CMD ["python", "main.py"]
