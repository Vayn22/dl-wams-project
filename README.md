# WAMS Web App (Microservices + AI)

Presentation video (demo of the web app): https://youtu.be/iysXjYfrufE

## Repo Contents (high level)

- `webapp/` – the application
  - `webapp/frontend/` – Next.js UI (admin/doctor views)
  - `webapp/backend/services/` – Docker Compose + Django microservices:
    - `auth_service/` – authentication + JWT/RBAC (port `8001`)
    - `patient_service/` – patients, appointments, medical files (port `8002`)
    - `ai_service/` – U-Net image segmentation API (port `8003`, returns a base64 PNG mask)
  - `webapp/run.py` – helper to start/stop services (single-machine or multi-machine)
  - `webapp/MULTI_MACHINE_SETUP.md` – detailed LAN/multi-PC setup (Consul + Traefik)
- `ai_model/requirements.txt` – Python dependencies for model/dev work (Torch, OpenCV, etc.)

## Quick Start (local)

Backend (Docker):
```powershell
python webapp\run.py --mode all
```

Frontend:
```powershell
cd webapp\frontend
npm install
npm run dev
```

Useful ports when running:
- Consul UI: `http://localhost:8500`
- Traefik dashboard: `http://localhost:8081` (proxy listens on `http://localhost:8080`)
- Auth service: `http://localhost:8001`
- Patient service: `http://localhost:8002`
- AI service: `http://localhost:8003`
