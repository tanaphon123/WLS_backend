import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import sql from '../config/db';


// [TODO] /api/auth/register
const register = async (req: Request, res: Response) => {
  const { username, email, password } = req.body;

  // 1. Validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'กรุณากรอกข้อมูลให้ครบถ้วน' });
  }

  try {
    // 2. เช็คก่อนว่า username หรือ email นี้ถูกใช้ไปหรือยัง
    const existingUser = await sql`
      SELECT user_id FROM users 
      WHERE username = ${username} OR email = ${email} 
      LIMIT 1
    `;

    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Username หรือ Email นี้ถูกใช้งานแล้ว' });
    }

    // 3. แฮชรหัสผ่านก่อนลง Database
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // 4. ยิง SQL ดิบ Insert ข้อมูลเข้าไปใน db
    const newUser = await sql`
      INSERT INTO users (username, email, password, created_by)
      VALUES (${username}, ${email}, ${hashedPassword}, 'register_form')
      RETURNING user_id, username, email
    `;

    return res.status(201).json({
      message: 'สมัครสมาชิกสำเร็จ!',
      user: newUser[0]
    });

  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// [TODO] /api/auth/login
const login = async (req: Request, res: Response) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: 'กรุณากรอก Username และ Password' });
  }

  try {
    // 1. ค้นหา User จากชื่อผู้ใช้
    const user = await sql`
      SELECT user_id, username, password FROM users 
      WHERE username = ${username} 
      LIMIT 1
    `;

    if (user.length === 0) {
      return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
    }

    // 2. ตรวจสอบรหัสผ่านว่าตรงกับที่แฮชไว้ไหม
    const isPasswordMatch = await bcrypt.compare(password, user[0].password);
    if (!isPasswordMatch) {
      return res.status(401).json({ message: 'Username หรือ Password ไม่ถูกต้อง' });
    }

    // 3. สร้าง JWT Token โดยแอบยัด user_id และ username เข้าไปด้วย
    const jwtSecret = process.env.JWT_SECRET || 'super_secret_fallback_key_21052026_1824';
    const token = jwt.sign(
      { id: user[0].user_id, username: user[0].username },
      jwtSecret,
      { expiresIn: '1d' } // Token มีอายุใช้งาน 1 วัน
    );

    // 4. ส่ง Token กลับไปให้หน้าบ้านเอาไปใช้ต่อ
    return res.json({
      message: 'เข้าสู่ระบบสำเร็จ!',
      token,
      user: {
        id: user[0].user_id,
        username: user[0].username
      }
    });

  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
};

// ส่งออกฟังก์ชัน api ไป index
export const AuthController = {
  register,
  login
};