import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import Admin from '../models/Admin';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AuthRequest extends Request {
  admin?: {
    _id: string;
    username: string;
    email: string;
    name: string;
    role: 'superadmin' | 'subadmin';
    avatar?: string;
  };
}

export async function authenticateToken(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    // Import dynamically to avoid circular dependency
    const { isMongoDBAvailable } = await import('../db');
    const { memoryStorage } = await import('../storage/memory-storage');
    
    const admin = isMongoDBAvailable
      ? await Admin.findById(decoded.id).select('-password')
      : await memoryStorage.findAdminById(decoded.id);

    if (!admin) {
      return res.status(401).json({ message: 'Admin not found' });
    }

    req.admin = {
      _id: admin._id.toString(),
      username: admin.username,
      email: admin.email,
      name: admin.name,
      role: admin.role,
      avatar: admin.avatar,
    };

    next();
  } catch (error) {
    return res.status(403).json({ message: 'Invalid token' });
  }
}

export function requireSuperAdmin(
  req: AuthRequest,
  res: Response,
  next: NextFunction
) {
  if (req.admin?.role !== 'superadmin') {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  next();
}

export function generateToken(adminId: string): string {
  return jwt.sign({ id: adminId }, JWT_SECRET, { expiresIn: '7d' });
}
