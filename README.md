# MediSync — Guide de démarrage

Ce dépôt contient:
- `webapp/backend` : API Django (auth, patients, rendez-vous, fichiers médicaux)
- `webapp/frontend` : interface Next.js
- `ai_model` : dépendances/data science liées au modèle IA

## Prérequis

- Python 3.12+ (ou version compatible Django 6)
- Node.js 20+
- npm

## 1) Démarrer le backend (Django)

Depuis la racine du projet:

```bash
cd webapp/backend
python -m venv .venv
```

### Windows (PowerShell)
```powershell
.\.venv\Scripts\Activate.ps1
```

### macOS / Linux
```bash
source .venv/bin/activate
```

Installer les dépendances:

```bash
pip install -r requirements.txt
```

Appliquer les migrations:

```bash
python manage.py migrate
```

Lancer le serveur:

```bash
python manage.py runserver 8000
```

API disponible sur: `http://127.0.0.1:8000`

## 2) Démarrer le frontend (Next.js)

Ouvrir un second terminal:

```bash
cd webapp/frontend
npm install
npm run dev
```

Frontend disponible sur: `http://localhost:3000`

## 3) Variables d'environnement frontend

Fichier: `webapp/frontend/.env.local`

Valeurs utilisées:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_AI_SERVICE_URL=http://localhost:8001
```

> Note: les fonctionnalités IA côté frontend attendent un service IA accessible sur `NEXT_PUBLIC_AI_SERVICE_URL`.

## 4) Tests backend rapides

Depuis `webapp/backend` (backend déjà lancé):

```bash
python test_api.py
```

## 5) Endpoints utiles

- Auth token: `POST /api/token/`
- Refresh token: `POST /api/token/refresh/`
- Users: `GET /api/users/...`
- Patients: `GET /api/patients/...`

Base URL locale: `http://127.0.0.1:8000`
