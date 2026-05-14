# Secure Notes Microservice Project

A secure microservice notes app with a React frontend, Express API Gateway, Express backend, JWT authentication, refresh tokens, role-based access control, MongoDB Atlas persistence, Swagger docs, validation, rate limiting, input sanitization, and Winston logging.

## Project Structure

```text
.
├── .env.example
├── .gitignore
├── package.json                  # Backend service
├── README.md
├── client                        # React frontend
├── gateway-service               # API Gateway
└── src
    ├── app.js
    ├── server.js
    ├── config
    │   ├── db.js
    │   └── logger.js
    ├── controllers
    │   ├── auth.controller.js
    │   └── note.controller.js
    ├── middleware
    │   ├── auth.middleware.js
    │   ├── error.middleware.js
    │   ├── rateLimiter.middleware.js
    │   └── validate.middleware.js
    ├── models
    │   ├── Note.js
    │   └── User.js
    └── routes
        ├── auth.routes.js
        └── note.routes.js
```

## Security Features

- Passwords are hashed with bcrypt before storage.
- JWT authentication protects notes routes.
- Role-based authorization restricts note deletion to admins.
- `express-validator` validates and sanitizes request input.
- `express-mongo-sanitize` strips MongoDB operator injection payloads.
- `express-rate-limit` limits repeated requests.
- `helmet` sets common secure HTTP headers.
- Winston logs application and request activity.
- Secrets and runtime config are loaded from environment variables.

## API Endpoints

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/api/auth/register` | Public | Register a user. |
| POST | `/api/auth/login` | Public | Login and receive a JWT. |
| GET | `/api/notes` | Authenticated | List notes. Admins see all notes; users see their own. |
| POST | `/api/notes` | Authenticated | Create a note owned by the current user. |
| DELETE | `/api/notes/:id` | Admin only | Delete any note by id. |

## Run Locally

1. Install dependencies:

   ```bash
   npm install
   ```

2. Create a local environment file:

   ```bash
   cp .env.example .env
   ```

3. Edit `.env` and set at least:

   ```text
   MONGO_URI=mongodb+srv://<username>:<password>@<cluster-url>/<database-name>?retryWrites=true&w=majority
   JWT_SECRET=replace-this-with-a-long-random-secret
   ```

4. Set `MONGO_URI` to your MongoDB Atlas connection string. The app does not fall back to local MongoDB.

5. Start the development server:

   ```bash
   npm run dev
   ```

   For production-style startup:

   ```bash
   npm start
   ```

Set `PORT` in `.env` to choose the local backend port. Health check: `GET /health`.

## Example Requests

Register:

```bash
curl -X POST "$API_BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Admin User",
    "email": "admin@example.com",
    "password": "StrongPass1!",
    "role": "admin"
  }'
```

Login:

```bash
curl -X POST "$API_BASE_URL/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "StrongPass1!"
  }'
```

Create a note:

```bash
curl -X POST "$API_BASE_URL/api/notes" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "First note",
    "content": "Private note content"
  }'
```

Delete a note as admin:

```bash
curl -X DELETE "$API_BASE_URL/api/notes/NOTE_ID" \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```

## Render Deployment

Deploy the three services independently.

| Service | Render type | Root directory | Build command | Start command / Publish directory |
| --- | --- | --- | --- | --- |
| Backend | Web Service | repo root | `npm install` | `npm start` |
| Gateway | Web Service | `gateway-service` | `npm install` | `npm start` |
| Frontend | Static Site | `client` | `npm install && npm run build` | `dist` |

If you move the backend into a `backend-service` directory, use that as the backend root directory and keep the same backend build and start commands.

Backend environment variables:

```text
NODE_ENV=production
PORT=<Render provides this automatically>
MONGO_URI=<MongoDB Atlas connection string>
JWT_SECRET=<long random secret>
REFRESH_TOKEN_SECRET=<different long random secret>
FRONTEND_URL=https://your-frontend.onrender.com
API_PUBLIC_URL=https://your-gateway.onrender.com
BACKEND_PUBLIC_URL=https://your-backend.onrender.com
CORS_ORIGIN=https://your-frontend.onrender.com,https://your-gateway.onrender.com
```

Gateway environment variables:

```text
NODE_ENV=production
PORT=<Render provides this automatically>
BACKEND_URL=https://your-backend.onrender.com
FRONTEND_URL=https://your-frontend.onrender.com
GATEWAY_CORS_ORIGIN=https://your-frontend.onrender.com
```

Frontend environment variables:

```text
REACT_APP_API_URL=https://your-gateway.onrender.com
```

Swagger remains available at `/api/docs`. Use the gateway URL for normal traffic and docs access, for example `https://your-gateway.onrender.com/api/docs`.

Notes for Render free tier:

- Services may sleep when idle; the first request after sleep can be slow.
- Use MongoDB Atlas, not a local MongoDB instance.
- Keep `.env` files local only. Commit `.env.example` files, but set real secrets in Render's Environment tab.
