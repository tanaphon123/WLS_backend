import { Request, Response } from 'express';
import sql from '../config/db';

const getWeightHistory = async (req: Request, res: Response) => {
  try {
    // ดึงข้อมูลเรียงตามวันเพื่อไปพล็อตใน Chart.js
    const history = await sql`
      SELECT weight_id, weight, logged_date 
      FROM weight_logs 
      -- WHERE user_id = 1 
      ORDER BY logged_date ASC
    `;
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

const createWeightLog = async (req: Request, res: Response) => {
  const { weight, logged_at } = req.body; // logged_at ส่งมาจากหน้าบ้านเผื่อเลือกเวลาย้อนหลัง
  try {
    // 💥 Feature ดึงสติ: เช็คน้ำหนักวันก่อนหน้าก่อนจะบันทึกค่าใหม่
    const latestLog = await sql`
      SELECT weight FROM weight_logs 
      WHERE user_id = 1 
      ORDER BY logged_at DESC LIMIT 1
    `;

    let alertMessage = null;
    if (latestLog.length > 0 && weight > latestLog[0].weight) {
      // ถ้าน้ำหนักเยอะกว่าวันก่อนหน้า เตรียมส่งข้อความด่าดึงสติ!
      alertMessage = "กากมาก! น้ำหนักชั่งวันนี้เยอะกว่าของวันก่อน ตั้งใจให้มากกว่านี้หน่อย อย่าให้เตือนอีก ไม่งั้นมีระบบไปก็ไม่มีความหมาย!";
      // TODO: เรียกใช้ฟังก์ชันส่ง LINE Notify หรือ Email ตรงนี้ได้เลย
    }

    const newLog = await sql`
      INSERT INTO weight_logs (user_id, weight, logged_at)
      VALUES (1, ${weight}, ${logged_at ? new Date(logged_at) : new Date()})
      RETURNING *
    `;

    res.json({ success: true, data: newLog[0], alert: alertMessage });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};


// มัดรวมตัวแม่ส่งออก สไตล์โปรเจกต์เรา
export const WeightController = {
  getWeightHistory,
  createWeightLog
};