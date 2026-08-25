# HavenRent Database

HavenRent uses MongoDB through the backend.

## Recommended production setup
Use MongoDB Atlas as the hosted database. You normally do NOT deploy MongoDB as a folder on Netlify/Render.

1. Create a MongoDB Atlas cluster.
2. Create a database named `havenrent`.
3. Create a database user.
4. Copy the MongoDB connection string.
5. Put it in Render as the backend environment variable:

MONGODB_URI=mongodb+srv://...

The backend connects to MongoDB. The frontend should never connect directly to MongoDB.

## Architecture

Frontend (Netlify)
        |
        v
Backend API (Render)
        |
        v
MongoDB Atlas

Keep database credentials private. Never put a real MongoDB URI/password in GitHub or frontend JavaScript.
