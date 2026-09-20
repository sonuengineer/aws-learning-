# TaskFlow

A small full-stack task management app built for AWS deployment practice. It includes a React + Vite frontend and a Node.js + Express backend with PostgreSQL support. The backend connects to AWS RDS or a local PostgreSQL database.

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
│   │   ├── db.js
│   │   └── server.js
│   ├── Dockerfile
│   ├── schema.sql
│   ├── .env.example
│   └── package.json
├── .gitignore
└── README.md
```

## Prerequisites

- Node.js 20+
- npm
- PostgreSQL 14+ (local or AWS RDS)

## Backend setup

Create a PostgreSQL database and user:

```bash
psql -U postgres -d postgres -c "CREATE USER taskflow_user WITH PASSWORD 'your_password';"
psql -U postgres -d postgres -c "CREATE DATABASE taskflow OWNER taskflow_user;"
psql -U postgres -d taskflow -f backend/schema.sql
```

Then configure the backend:

```bash
cd taskflow/backend
cp .env.example .env
# Edit .env with your database credentials
npm install
npm run dev
```

Environment variables (`.env`):

```env
PORT=5000
DB_HOST=localhost
DB_PORT=5432
DB_NAME=taskflow
DB_USER=taskflow_user
DB_PASSWORD=your_password
JWT_SECRET=your_jwt_secret_key
DEFAULT_USERNAME=admin
DEFAULT_PASSWORD=admin123
```

The backend exposes:

- `GET /api/health` - Health check with database time
- `POST /api/login` - User authentication with JWT
- `GET /api/tasks` - Fetch user tasks
- `POST /api/tasks` - Create task
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

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

## AWS RDS deployment

1. Create an RDS PostgreSQL instance in AWS Console
2. Update `.env` with your RDS endpoint:

```env
DB_HOST=your-rds-endpoint.region.rds.amazonaws.com
DB_PORT=5432
DB_NAME=taskflow
DB_USER=taskflow_user
DB_PASSWORD=your_secure_password
```

3. Initialize the database by running the backend once
4. Deploy using Docker or AWS Elastic Beanstalk

## Docker build

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
