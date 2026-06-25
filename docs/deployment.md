# TeamFlow Production Deployment Guide

A step-by-step walkthrough to deploy TeamFlow to production using Vercel (Frontend), Render (Backend), and MongoDB Atlas (Database).

---

## 1. Database Setup: MongoDB Atlas

1. **Create Account**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) and sign in.
2. **Deploy Cluster**: Create a new free-tier database cluster (Shared M0).
3. **Database User**: Create a database user with read/write privileges (under Security -> Database Access). Save the username and password securely.
4. **IP Access List**: Under Security -> Network Access, click **Add IP Address**. Choose **Allow Access from Anywhere (0.0.0.0/0)** so Render can connect dynamically (or restrict to Render's outbound IPs if static IPs are configured).
5. **Connection String**: Click **Connect** on your Database Cluster, choose **Drivers**, and copy the connection URI (e.g., `mongodb+srv://<username>:<password>@cluster.mongodb.net/teamflow?retryWrites=true&w=majority`).

---

## 2. Backend Setup: Render

1. **Create Account**: Go to [Render](https://render.com) and log in.
2. **New Web Service**: Click **New +** -> **Web Service**.
3. **Connect Repository**: Link your GitHub account and select your `TeamFlow` repository.
4. **Service Configuration**:
   - **Name**: `teamflow-backend`
   - **Environment**: `Node`
   - **Root Directory**: `server`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm run start`
   - **Instance Type**: Free
5. **Environment Variables**: Click **Advanced** and add the following keys:
   - `PORT`: `5000` (Render binds dynamically, but defining it is standard)
   - `MONGO_URI`: `your_mongodb_atlas_connection_string`
   - `JWT_ACCESS_SECRET`: `a_long_random_secure_secret_key`
   - `JWT_REFRESH_SECRET`: `another_long_random_secure_secret_key`
   - `NODE_ENV`: `production`
   - `FRONTEND_URL`: `your_vercel_frontend_url` (add after Vercel deployment is completed)
6. **Deploy**: Render will automatically trigger the build and start the service. Copy the URL (e.g., `https://teamflow-backend.onrender.com`).

---

## 3. Frontend Setup: Vercel

1. **Create Account**: Log in to [Vercel](https://vercel.com).
2. **Import Project**: Click **Add New** -> **Project** and import your `TeamFlow` repository.
3. **Project Configuration**:
   - **Framework Preset**: `Vite`
   - **Root Directory**: `client` (Very Important!)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. **Environment Variables**: Add the following key:
   - `VITE_API_URL`: `https://teamflow-backend.onrender.com` (Your Render backend service URL)
5. **Deploy**: Click **Deploy**. Vercel will build the frontend assets and host them. Copy the deployment URL.
6. **Final Loop**: Remember to go back to Render and update the `FRONTEND_URL` environment variable to match this Vercel deployment URL so that CORS works correctly.
