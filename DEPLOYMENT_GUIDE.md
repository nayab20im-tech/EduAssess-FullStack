# EduAssess Deployment Guide

This project is prepared for:

- Frontend: Vercel
- Backend: Render
- Database: MongoDB Atlas
- AI evaluation: Gemini API
- Media: Cloudinary
- Email: Gmail App Password or SMTP

## 1. Push the project to GitHub

Upload the `EduAssess-FullStack-Fixed` folder to one GitHub repository. Do not upload local `.env` files.

## 2. Deploy the backend on Render first

Create a new Blueprint from the repository. Render will read `render.yaml`.

If creating a Web Service manually, use:

- Root directory: `backend`
- Build command: `npm ci`
- Start command: `npm start`
- Health check path: `/api/health`
- Runtime: Node
- Plan: Free

Add these Render environment variables:

- `NODE_ENV=production`
- `CLIENT_URL=http://localhost:5173` temporarily
- `MONGODB_URI`
- `JWT_SECRET` (at least 32 characters)
- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`
- `GOOGLE_CALLBACK_URL=https://YOUR-RENDER-SERVICE.onrender.com/api/auth/google/callback`
- `GEMINI_API_KEY`
- `GEMINI_MODEL=gemini-2.5-flash`
- Cloudinary variables
- Email variables

After deployment, verify:

`https://YOUR-RENDER-SERVICE.onrender.com/api/health`

## 3. MongoDB Atlas

In Atlas Network Access, allow `0.0.0.0/0` for testing because Render uses dynamic outbound addresses. Use a strong database password and keep the connection string only in Render.

## 4. Deploy the frontend on Vercel

Import the same GitHub repository and set:

- Framework preset: Vite
- Root directory: `frontend`
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm ci`

Add the Vercel environment variable:

`VITE_API_URL=https://YOUR-RENDER-SERVICE.onrender.com`

Deploy the frontend.

## 5. Connect the final URLs

Copy the final Vercel URL and update Render:

`CLIENT_URL=https://YOUR-PROJECT.vercel.app`

Then redeploy the Render service.

In Google Cloud Console, update the OAuth client:

Authorized JavaScript origin:

`https://YOUR-PROJECT.vercel.app`

Authorized redirect URI:

`https://YOUR-RENDER-SERVICE.onrender.com/api/auth/google/callback`

The Google OAuth branding and client for this project are in the Google Cloud project named **My First Project**.

## 6. Classroom check

Before sharing the URL with 20–30 students:

1. Open the Render health URL and wait for a successful response.
2. Open the Vercel frontend.
3. Test teacher login.
4. Test two different student accounts in separate browser tabs or devices.
5. Confirm live monitoring updates.
6. Submit a mixed MCQ/short-answer quiz and confirm Gemini evaluation.
7. Confirm teacher notifications, result page, PDF, and email actions.

Students should receive only the Vercel URL.
