# TaskFlow

A small full-stack TaskFlow app built for AWS deployment practice. It includes a React + Vite frontend and a Node.js + Express backend. The backend uses an in-memory task repository by default, so the complete app can run locally without installing or configuring a database.

Task data is stored only in the backend process and is reset when the backend restarts.

## Project structure

```text
taskflow/
├── frontend/
│   ├── src/
│   ├── Dockerfile
│   ├── .env.example
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
├── backend/
│   ├── src/
│   │   ├── repositories/
│   │   └── server.js
│   ├── Dockerfile
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 20+
- npm

## Backend setup

```bash
cd taskflow/backend
npm install
npm run dev
```

No database setup or `.env` file is required for local development. Optional settings are documented in `backend/.env.example`:

```env
PORT=5000
JWT_SECRET=change_this_secret
DEFAULT_USERNAME=admin
DEFAULT_PASSWORD=admin123
```

The backend exposes:

- `GET /api/health`
- `POST /api/login`
- `GET /api/tasks`
- `POST /api/tasks`
- `PUT /api/tasks/:id`
- `DELETE /api/tasks/:id`

Default login credentials:

- Username: `admin`
- Password: `admin123`

## Frontend setup

```bash
cd taskflow/frontend
npm install
npm run dev
```

Update `frontend/.env` if the backend uses a different address:

```env
VITE_API_BASE_URL=http://localhost:5000/api
```

Open the frontend in the browser at:

```text
http://localhost:5173
```

## Production-style Docker build

Backend:

```bash
cd taskflow/backend
docker build -t taskflow-backend .
docker run -p 5000:5000 --env-file .env taskflow-backend
```

Frontend:

```bash
cd taskflow/frontend
docker build -t taskflow-frontend .
docker run -p 80:80 taskflow-frontend
```

## Notes

- Frontend uses `VITE_API_BASE_URL` from environment variables.
- Backend uses `dotenv` for optional environment variables and JWT authentication.
- Task persistence is isolated behind `backend/src/repositories/inMemoryTaskRepository.js`.
- To use PostgreSQL or Amazon RDS later, implement the same repository methods (`listForUser`, `create`, `update`, and `remove`) with the target database and replace the repository imported by `server.js`.
- In-memory data is intended for local development and testing only; it is not persisted across backend restarts.
