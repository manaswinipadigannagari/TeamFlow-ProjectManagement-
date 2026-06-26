import jwt from "jsonwebtoken";

const ACCESS_SECRET = process.env.JWT_ACCESS_SECRET || "default_access_secret_123456";
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "default_refresh_secret_123456";

export interface IAccessPayload {
  userId: string;
  role: string;
}

export interface IRefreshPayload {
  userId: string;
}

export const generateAccessToken = (payload: IAccessPayload): string => {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: "15m" });
};

export const generateRefreshToken = (payload: IRefreshPayload): string => {
  return jwt.sign(payload, REFRESH_SECRET, { expiresIn: "7d" });
};

export const verifyAccessToken = (token: string): IAccessPayload => {
  return jwt.verify(token, ACCESS_SECRET) as IAccessPayload;
};

export const verifyRefreshToken = (token: string): IRefreshPayload => {
  return jwt.verify(token, REFRESH_SECRET) as IRefreshPayload;
};
