# Docker Setup Guide for Aegis AI

## 1. Prerequisites

- Docker and Docker Compose installed
- Copy the example environment file:
  ```
  cp .env.example .env
  ```
  Edit `.env` to set strong secrets for:
  - JWT_ACCESS_SECRET
  - JWT_REFRESH_SECRET
  - ENCRYPTION_KEY (32+ chars)
  - OPENROUTER_API_KEY (get from https://openrouter.ai/keys)

## 2. Build and Start All Services

From the `infra/docker` directory, run:

```sh
docker-compose up --build
```

## 3. Access the Application

- Web app: http://localhost:3000
- pgAdmin (optional): http://localhost:5050 (default email/password in `.env`)

## 4. Stopping Services

```sh
docker-compose down
```

## 5. Data Persistence

- Database, uploads, and backups are stored in `backups/`, `uploads/`, and `data/` folders (mounted as volumes).

## 6. Troubleshooting

- Check logs: `docker-compose logs -f`
- Ensure secrets are set in `.env`.
- For database issues, verify `DATABASE_URL` and `DB_*` variables.

---

For advanced options, see `infra/docker/docker-compose.yml` and the main README.
