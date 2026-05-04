# Secure Notes Microservice Backend

A secure Node.js and Express backend for a Notes API with JWT authentication, role-based authorization, MongoDB persistence, validation, rate limiting, input sanitization, and Winston logging.

## Project Structure

```text
.
├── .env.example
├── .gitignore
├── package.json
├── README.md
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

The server runs on `http://localhost:5000` by default. Health check: `GET /health`.

## Example Requests

Register:

```bash
curl -X POST http://localhost:5000/api/auth/register \
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
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "StrongPass1!"
  }'
```

Create a note:

```bash
curl -X POST http://localhost:5000/api/notes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "title": "First note",
    "content": "Private note content"
  }'
```

Delete a note as admin:

```bash
curl -X DELETE http://localhost:5000/api/notes/NOTE_ID \
  -H "Authorization: Bearer YOUR_ADMIN_JWT_TOKEN"
```
