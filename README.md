# HavenRent MongoDB Backend

## Render settings
Build command:
`npm install`

Start command:
`npm start`

Environment variables:
`MONGODB_URI` = your MongoDB Atlas connection string
`JWT_SECRET` = a long random secret
`FRONTEND_URL` = `https://netrent.netlify.app`
`PAYMENT_UPI` = `9553473078-4@ybl`

Do not commit `.env` or expose the MongoDB URI in frontend code.

Health:
`GET /api/health`

API:
POST `/api/auth/signup`
POST `/api/auth/login`
GET `/api/me`
GET `/api/properties`
GET `/api/properties/:id`
POST `/api/properties`
GET `/api/my-properties`
POST `/api/bookings`
GET `/api/my-bookings`
