# EduAssess Backend

Express and MongoDB backend for the EduAssess quiz platform.

## What was fixed

- The server now waits for MongoDB before accepting requests.
- Registration and login responses match the React frontend.
- Registration signs the new user in immediately and returns the saved user.
- Authentication works with both an HTTP-only cookie and a bearer token.
- Local Vite ports and `127.0.0.1` are accepted during development.
- Google OAuth is disabled gracefully when credentials are missing.
- Google account IDs are now stored in the user schema.
- Public registration is restricted to Student and Teacher accounts.
- Student quiz lists exclude expired and already-attempted quizzes.
- Teacher subject selection now matches quiz-creation authorization.
- A database health endpoint and authentication verification script were added.
- Hardcoded database credentials were removed from diagnostic code.
- Destructive database seeding now requires explicit confirmation.

## 1. Configure MongoDB Atlas

In MongoDB Atlas:

1. Open **Security → Network Access**.
2. Add your laptop's current public IP address.
3. Open **Security → Database Access** and confirm the database user is active.
4. Copy the application's connection string.

Do not keep credentials inside source files.

## 2. Create `.env`

```bash
cp .env.example .env
```

Fill in at least:

```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://USER:PASSWORD@CLUSTER.mongodb.net/eduassess?retryWrites=true&w=majority
JWT_SECRET=use_a_random_secret_with_at_least_32_characters
JWT_EXPIRES_IN=7d
```

If the frontend starts on another Vite port, development CORS accepts local
`localhost` and `127.0.0.1` ports automatically.

## 3. Install and run

```bash
npm install
npm run dev
```

Expected startup:

```text
✅ MongoDB connected: ...
🚀 EduAssess API running on http://localhost:5000
```

Check health:

```bash
curl http://localhost:5000/api/health
```

## 4. Verify authentication and MongoDB persistence

```bash
npm run verify:auth
```

This command:

- starts the API on a temporary local port;
- registers a temporary Student account through the real HTTP route;
- confirms the user exists in MongoDB;
- confirms the password is hashed;
- verifies token authentication and login;
- deletes the temporary account.

## Useful commands

```bash
npm run check
npm run test:db
npm run verify:auth
```

Database seeding deletes existing collections. It is blocked unless explicitly confirmed:

```bash
SEED_CONFIRM=YES npm run seed
```

Use seeding only on a disposable development database.
