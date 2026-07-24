# EduAssess Frontend

React and Vite frontend for the EduAssess quiz platform.

## Backend integration fixes

- All API requests now use one shared Axios client.
- The backend URL is controlled through `VITE_API_URL`.
- Cookies are included automatically with every API request.
- Registration creates an account and opens the correct role dashboard.
- Login updates both the current user and the role-based application shell.
- Network and backend connection errors are shown clearly.
- Student and teacher dashboards use real backend analytics.
- Quiz attempt loads real MongoDB questions and submits real answers.
- Quiz results load the saved submission and grading information.
- Grade export uses backend submission records instead of demo rows.

## Configure the API

```bash
cp .env.example .env
```

Default configuration:

```env
VITE_API_URL=http://localhost:5000
```

## Install and run

```bash
npm install
npm run dev
```

Open the Vite URL, normally:

```text
http://localhost:5173
```

Run the backend before testing registration, login, quizzes, dashboards, and results.

## Quality checks

```bash
npm run lint
npm run build
```

Do not copy `node_modules` from another computer. Run `npm install` locally so
Linux creates executable permissions correctly.
