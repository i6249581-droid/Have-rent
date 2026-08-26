# HavenRent Backend — Netlify Connected

Frontend:
https://haverent.netlify.app

Backend:
https://have-rent.onrender.com

The server CORS configuration allows the HavenRent Netlify frontend.

## Render settings
- Build Command: `npm install`
- Start Command: `npm start`

## Environment Variables on Render
Set these in Render → Environment:
- `MONGODB_URI` = your MongoDB Atlas connection string
- `JWT_SECRET` = a long random secret
- `PORT` = `10000` (Render can also provide PORT automatically)

Do not commit real secrets to GitHub.
