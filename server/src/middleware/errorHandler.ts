import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/errors";
import logger from "../utils/logger";
import { ZodError } from "zod";

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,

  _next: NextFunction
) => {
  let statusCode = 500;
  let message = "Internal Server Error";
  let details: unknown = undefined;

  // Log the error
  logger.error(`${err.name} - ${err.message}`, {
    method: req.method,
    url: req.originalUrl,
    stack: err.stack,
  });

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    message = err.message;
  } else if (err instanceof ZodError) {
    statusCode = 400;
    message = "Validation Error";
    details = err.errors.map((e) => ({
      field: e.path.join("."),
      message: e.message,
    }));
  } else if (err.name === "ValidationError") {
    // Mongoose validation error
    statusCode = 400;
    message = err.message;
  } else if (err.name === "CastError") {
    // Mongoose cast error (invalid ID)
    statusCode = 400;
    message = "Invalid Resource Identifier";
  }

  const responseBody = {
    success: false,
    message,
    data: null,
    error: {
      message,
      ...(details ? { details } : {}),
      ...(process.env.NODE_ENV === "development" && !(err instanceof ZodError)
        ? { stack: err.stack }
        : {}),
    },
  };

  res.status(statusCode).json(responseBody);
};
