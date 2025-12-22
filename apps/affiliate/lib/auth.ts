import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { env } from './env';
import { db } from './db';

export interface JWTPayload {
  adminId: string;
  email: string;
  role: string;
  iat?: number;
  exp?: number;
}

export class AuthService {
  static async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, env.BCRYPT_ROUNDS);
  }

  static async verifyPassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  static generateToken(payload: Omit<JWTPayload, 'iat' | 'exp'>): string {
    return jwt.sign(payload, env.JWT_SECRET, {
      expiresIn: '24h',
    });
  }

  static verifyToken(token: string): JWTPayload {
    try {
      return jwt.verify(token, env.JWT_SECRET) as JWTPayload;
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  static async authenticateAdmin(email: string, password: string) {
    const admin = await db.admin.findUnique({
      where: { email },
    });

    if (!admin || !admin.isActive) {
      throw new Error('Invalid credentials');
    }

    const isValid = await this.verifyPassword(password, admin.password);
    if (!isValid) {
      throw new Error('Invalid credentials');
    }

    const token = this.generateToken({
      adminId: admin.id,
      email: admin.email,
      role: admin.role,
    });

    return {
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      token,
    };
  }

  static async createAdmin(data: {
    email: string;
    name: string;
    password: string;
    role?: string;
  }) {
    const hashedPassword = await this.hashPassword(data.password);
    
    return db.admin.create({
      data: {
        ...data,
        password: hashedPassword,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        createdAt: true,
      },
    });
  }
}

export function extractTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  return authHeader.substring(7);
}

export async function requireAuth(authHeader: string | null) {
  const token = extractTokenFromHeader(authHeader);
  if (!token) {
    throw new Error('Authentication required');
  }

  const payload = AuthService.verifyToken(token);
  
  // Verify admin still exists and is active
  const admin = await db.admin.findUnique({
    where: { id: payload.adminId },
  });

  if (!admin || !admin.isActive) {
    throw new Error('Invalid authentication');
  }

  return { admin, payload };
}
