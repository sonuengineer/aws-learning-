# TaskFlow

A small full-stack TaskFlow app built for AWS deployment practice. It includes a React + Vite frontend and a Node.js + Express backend with PostgreSQL.

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
│   ├── Dockerfile
│   ├── schema.sql
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm

## Local database setup

Create a PostgreSQL user and database, then import the schema:

```bash
psql -U postgres -d postgres -c "CREATE USER taskflow_user WITH PASSWORD 'taskflow_pass';"
psql -U postgres -d postgres -c "CREATE DATABASE taskflow OWNER taskflow_user;"
psql -U postgres -d taskflow -f backend/schema.sql
```

## Backend setup

```bash
cd taskflow/backend
cp .env.example .env
npm install
npm run dev
```

Update `backend/.env` if needed:

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskflow
DB_USER=taskflow_user
DB_PASSWORD=taskflow_pass
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
cp .env.example .env
npm install
npm run dev
```

Update `frontend/.env` if needed:

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
- Backend uses `dotenv` for environment variables and JWT authentication.
- Database access is implemented using PostgreSQL and the `pg` client without database-specific local behavior.
- This is intentionally small and easy to deploy to AWS infrastructure.
