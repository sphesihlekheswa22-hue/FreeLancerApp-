# Campus Gigs (Student Freelance Marketplace)

Monorepo with:
- `backend/`: Flask REST API (SQLite by default)
- `frontend/`: Vite + React + TypeScript

## Run backend (Windows PowerShell)

```powershell
cd backend
py -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
copy .env.example .env
python run.py
```

Backend health check: `http://127.0.0.1:5000/api/health`

## Run frontend

```powershell
cd frontend
npm install
npm run dev
```

## Implemented so far

- Auth: `POST /api/register`, `POST /api/login`, `GET /api/me`
- Gigs: `GET /api/gigs`, `POST /api/gigs`

