import dotenv from "dotenv";
// Load env vars first
dotenv.config();

import express from "express";
import { createServer } from "http";
import cors from "cors";
import helmet from "helmet";
import { connectDB } from "./config/db";
import { initSocket } from "./config/socket";
import { errorHandler } from "./middleware/errorHandler";
import logger from "./utils/logger";
import apiRouter from "./routes";

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 5000;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

// Connect to Database
connectDB();

// Init Socket.io
initSocket(httpServer);

// Global Middleware
app.use(helmet());
app.use(
  cors({
    origin: FRONTEND_URL,
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE"],
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic health check route
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

// Root API path
app.get("/", (_req, res) => {
  res.status(200).json({ message: "Welcome to TeamFlow API" });
});

// Mount API routes
app.use("/api/v1", apiRouter);

// Centralized Error Handler (Must be registered last)
app.use(errorHandler);

// Start Server
httpServer.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV || "development"} mode on port ${PORT}`);
});

export default httpServer;
