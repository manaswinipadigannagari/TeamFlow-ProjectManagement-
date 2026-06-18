import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import User from "../models/User";
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from "../utils/jwt";
import { BadRequestError, ConflictError, UnauthorizedError, NotFoundError } from "../utils/errors";
import { sendEmail as mailService } from "../config/mailer";
import jwt from "jsonwebtoken";

// Local cookie helper settings
const COOKIE_NAME = "refreshToken";

const getCookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
});

const getCookieValue = (cookieHeader: string | undefined, name: string): string | null => {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(^|;)\\s*${name}\\s*=\\s*([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

export const register = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw new ConflictError("A user with this email address already exists");
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Create user. If it's the very first user globally, we can set role to 'admin'
    const totalUsers = await User.countDocuments();
    const role = totalUsers === 0 ? "admin" : "member";

    const newUser = await User.create({
      name,
      email,
      passwordHash,
      role,
      isEmailVerified: true, // Default to true for dev ease
    });

    const accessToken = generateAccessToken({ userId: newUser._id.toString(), role: newUser.role });
    const refreshToken = generateRefreshToken({ userId: newUser._id.toString() });

    // Set HTTP-only Cookie
    res.cookie(COOKIE_NAME, refreshToken, getCookieOptions());

    res.status(201).json({
      success: true,
      data: {
        user: newUser,
        accessToken,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      throw new NotFoundError("Account not found");
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedError("Incorrect password");
    }

    // Update last login
    user.lastLoginAt = new Date();
    await user.save();

    const accessToken = generateAccessToken({ userId: user._id.toString(), role: user.role });
    const refreshToken = generateRefreshToken({ userId: user._id.toString() });

    // Set cookie
    res.cookie(COOKIE_NAME, refreshToken, getCookieOptions());

    res.status(200).json({
      success: true,
      data: {
        user,
        accessToken,
      },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Attempt parsing from request cookies (if cookie-parser is installed) or raw header cookies
    const token = req.body.refreshToken || getCookieValue(req.headers.cookie, COOKIE_NAME);

    if (!token) {
      throw new UnauthorizedError("Refresh token is missing");
    }

    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.userId);

    if (!user) {
      throw new UnauthorizedError("User associated with token does not exist");
    }

    const accessToken = generateAccessToken({ userId: user._id.toString(), role: user.role });
    const newRefreshToken = generateRefreshToken({ userId: user._id.toString() });

    res.cookie(COOKIE_NAME, newRefreshToken, getCookieOptions());

    res.status(200).json({
      success: true,
      data: {
        user,
        accessToken,
      },
      error: null,
    });
  } catch {
    next(new UnauthorizedError("Refresh token is invalid or expired"));
  }
};

export const logout = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    res.clearCookie(COOKIE_NAME, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    });

    res.status(200).json({
      success: true,
      data: { message: "Successfully logged out" },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    // For security, don't throw error if email not found, just return generic success
    if (!user) {
      res.status(200).json({
        success: true,
        data: { message: "If the email exists, a password reset link has been sent" },
        error: null,
      });
      return;
    }

    // Generate reset token containing user ID (expires in 1 hour)
    const resetSecret =
      (process.env.JWT_REFRESH_SECRET || "default_refresh_secret") + user.passwordHash;
    const token = jwt.sign({ userId: user._id.toString() }, resetSecret, { expiresIn: "1h" });

    const resetUrl = `${process.env.FRONTEND_URL || "http://localhost:5173"}/reset-password?token=${token}&userId=${user._id}`;

    // Send email via mailer service
    await mailService(
      user.email,
      "TeamFlow — Reset Password Request",
      `<p>You requested a password reset. Click the link below to set a new password:</p>
       <p><a href="${resetUrl}">${resetUrl}</a></p>
       <p>This link will expire in 1 hour.</p>`
    );

    res.status(200).json({
      success: true,
      data: { message: "If the email exists, a password reset link has been sent" },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;
    const userId = req.body.userId || req.query.userId; // we can get it from body or query

    if (!token || !userId) {
      throw new BadRequestError("Missing token or userId");
    }

    const user = await User.findById(userId);
    if (!user) {
      throw new NotFoundError("User not found");
    }

    const resetSecret =
      (process.env.JWT_REFRESH_SECRET || "default_refresh_secret") + user.passwordHash;

    try {
      jwt.verify(token, resetSecret);
    } catch {
      throw new BadRequestError("Reset link is invalid or has expired");
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    await user.save();

    res.status(200).json({
      success: true,
      data: { message: "Password updated successfully" },
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    res.status(200).json({
      success: true,
      data: user,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};

export const updateMe = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, avatarUrl } = req.body;
    const user = await User.findById(req.user?.id);
    if (!user) {
      throw new NotFoundError("User not found");
    }
    if (name) user.name = name;
    if (avatarUrl !== undefined) user.avatarUrl = avatarUrl;
    await user.save();
    res.status(200).json({
      success: true,
      data: user,
      error: null,
    });
  } catch (error) {
    next(error);
  }
};
