import { Request, Response, NextFunction } from "express";
import { UnauthorizedError } from "../utils/errors";
import { verifyAccessToken } from "../utils/jwt";

export const requireAuth = (req: Request, _res: Response, next: NextFunction): void => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      throw new UnauthorizedError("Authentication token is missing or invalid");
    }

    const token = authHeader.split(" ")[1];
    if (!token) {
      throw new UnauthorizedError("Authentication token is empty");
    }

    const payload = verifyAccessToken(token);

    req.user = {
      id: payload.userId,
      role: payload.role as "admin" | "member",
    };

    next();
  } catch {
    next(new UnauthorizedError("Authentication failed: invalid or expired token"));
  }
};
