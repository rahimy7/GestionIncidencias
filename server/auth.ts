import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { storage } from './storage';
import type { RequestHandler } from 'express';

export interface AuthUser {
  id: string;
  email: string;
  role: string;
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function login(email: string, password: string) {
  const user = await storage.getUserByEmail(email);
  if (!user || !user.password) {
    throw new Error('Credenciales inválidas');
  }
  
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new Error('Credenciales inválidas');
  }
  
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.SESSION_SECRET!,
    { expiresIn: '7d' }
  );
  
  return {
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      department: user.department,
      location: user.location
    },
    token
  };
}

export async function register(userData: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
  department?: string;
  location?: string;
}) {
  const hashedPassword = await hashPassword(userData.password);
  
  const user = await storage.createUser({
    ...userData,
    password: hashedPassword,
    role: userData.role as any || 'user'
  });
  
  const token = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.SESSION_SECRET!,
    { expiresIn: '7d' }
  );
  
  return { user, token };
}

export function verifyToken(token: string): AuthUser {
  try {
    const payload = jwt.verify(token, process.env.SESSION_SECRET!) as any;
    return {
      id: payload.userId,
      email: payload.email,
      role: payload.role
    };
  } catch (error) {
    throw new Error('Token inválido');
  }
}

export const isAuthenticated: RequestHandler = (req: any, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  
  if (!token) {
    return res.status(401).json({ message: 'Token requerido' });
  }
  
  try {
    const user = verifyToken(token);
    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token inválido' });
  }
};