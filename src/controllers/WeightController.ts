import { Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth'; // นำเข้า Type ที่เราขยายไว้
import sql from '../config/db';

// 1. [GET] ดึงประวัติน้ำหนัก (อัปเกรดให้ดึงเฉพาะของตัวเอง)
const getWeightHistory = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id; // ดึง ID จาก token ที่มิดเดิลแวร์แกะไว้ให้
  // console.log('user: ', userId);

  try {
    const history = await sql`
      SELECT weight_id, weight, logged_date 
      FROM weight_logs 
      WHERE user_id = ${userId}
      ORDER BY logged_date ASC
    `;
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// 2. [POST] บันทึกน้ำหนักใหม่ (อัปเกรดใช้รหัสผู้ใช้จริงจาก Token)
const createWeightLog = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { weight, logged_date } = req.body;

  if (!weight) {
    return res.status(400).json({ message: 'กรุณากรอกน้ำหนักตัว' });
  }

  try {
    // Feature ดึงสติ: เช็คน้ำหนักล่าสุดของ "ตัวเอง"
    const latestLog = await sql`
      SELECT weight FROM weight_logs 
      WHERE user_id = ${userId} 
      ORDER BY logged_date DESC LIMIT 1
    `;

    let alertMessage = null;
    if (latestLog.length > 0 && Number(weight) > Number(latestLog[0].weight)) {
      alertMessage = "กากมาก! น้ำหนักชั่งวันนี้เยอะกว่าของวันก่อน ตั้งใจให้มากกว่านี้หน่อย อย่าให้เตือนอีก ไม่งั้นมีระบบไปก็ไม่มีความหมาย!";
    }

    const newLog = await sql`
      INSERT INTO weight_logs (user_id, weight, logged_date)
      VALUES (${userId}, ${weight}, ${logged_date ? new Date(logged_date) : new Date()})
      RETURNING *
    `;

    res.json({ success: true, data: newLog[0], alert: alertMessage });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// 3. [PUT] แก้ไขบันทึกน้ำหนัก
const updateWeightLog = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { weight_id } = req.params; // รับ weight_id ผ่าน URL parameter
  const { weight, logged_date } = req.body;

  if (!weight) {
    return res.status(400).json({ message: 'กรุณากรอกน้ำหนักที่ต้องการแก้ไข' });
  }

  try {
    // ยิง SQL ตรวจสอบและอัปเดต โดยต้องมั่นใจว่าเป็นข้อมูลของ user_id คนนี้จริงๆ (ป้องกันแอบแก้ของคนอื่น)
    const updatedLog = await sql`
      UPDATE weight_logs 
      SET weight = ${weight}, 
          logged_date = ${logged_date ? new Date(logged_date) : sql`logged_date`} -- ถ้าไม่ส่งมา ให้ใช้ค่าเดิมใน DB
      WHERE weight_id = ${weight_id} AND user_id = ${userId}
      RETURNING *
    `;

    if (updatedLog.length === 0) {
      return res.status(44) .json({ message: 'ไม่พบข้อมูลบันทึกน้ำหนักนี้ หรือคุณไม่มีสิทธิ์แก้ไข' });
    }

    res.json({ success: true, message: 'แก้ไขข้อมูลสำเร็จ', data: updatedLog[0] });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// 4. [DELETE] ลบบันทึกน้ำหนัก (Delete)
const deleteWeightLog = async (req: AuthenticatedRequest, res: Response) => {
  const userId = req.user?.id;
  const { weight_id } = req.params;

  try {
    // ป้องกันความปลอดภัยด้วยการเช็คทั้ง weight_id และ user_id คู่กัน
    const deletedLog = await sql`
      DELETE FROM weight_logs 
      WHERE weight_id = ${weight_id} AND user_id = ${userId}
      RETURNING *
    `;

    if (deletedLog.length === 0) {
      return res.status(404).json({ message: 'ไม่พบข้อมูลที่ต้องการลบ หรือคุณไม่มีสิทธิ์เข้าถึง' });
    }

    res.json({ success: true, message: 'ลบบันทึกน้ำหนักเรียบร้อยแล้ว' });
  } catch (error) {
    res.status(500).json({ error: (error as Error).message });
  }
};

// ส่งออกฟังก์ชัน api ไป index
export const WeightController = {
  getWeightHistory,
  createWeightLog,
  updateWeightLog,
  deleteWeightLog
};