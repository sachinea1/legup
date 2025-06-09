import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { z } from "zod";
import { storage } from "./storage";
import { User } from "@shared/schema";

declare global {
  namespace Express {
    interface Request {
      user?: User;
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";
const JWT_EXPIRES_IN = "1h";
const BCRYPT_ROUNDS = 12;

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, BCRYPT_ROUNDS);
  }

  static async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateJWT(userId: number): string {
    return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  }

  static verifyJWT(token: string): { userId: number } | null {
    try {
      const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
      return decoded;
    } catch {
      return null;
    }
  }

  static generateResetToken(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  static hashResetToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }
}

export function authenticateToken(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  const decoded = AuthService.verifyJWT(token);
  if (!decoded) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }

  // Attach user to request
  storage.getUser(decoded.userId).then(user => {
    if (!user) {
      return res.status(403).json({ error: "User not found" });
    }
    req.user = user;
    next();
  }).catch(() => {
    return res.status(500).json({ error: "Authentication error" });
  });
}

export function optionalAuth(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (token) {
    const decoded = AuthService.verifyJWT(token);
    if (decoded) {
      storage.getUser(decoded.userId).then(user => {
        if (user) {
          req.user = user;
        }
        next();
      }).catch(() => {
        next();
      });
    } else {
      next();
    }
  } else {
    next();
  }
}