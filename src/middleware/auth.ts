import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// 🌟 จุดสำคัญ: ประกาศขยายความสามารถให้ Express Request รู้จักคีย์ user
export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    username: string;
  };
}

export const authenticateToken = (
  req: AuthenticatedRequest, // เปลี่ยนมาใช้ Type ที่เราขยายไว้ข้างบน
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // แยก "Bearer <TOKEN>"

  if (!token) {
    return res.status(401).json({ error: "Access denied, no token provided" });
  }

  // ปรับคีย์ลับให้ตรงกับที่เราตั้งใน .env (JWT_SECRET)
  const jwtSecret = process.env.JWT_SECRET || 'super_secret_fallback_key';

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    
    // แกะข้อมูล { id, username } จาก token แล้วยัดใส่ req.user
    req.user = decoded as { id: number; username: string }; 
    
    next(); // ผ่านฉลุย ไปต่อที่ Controller ได้!
  });
};