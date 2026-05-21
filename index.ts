import express from "express";
import cors from "cors";
import dotenv from "dotenv";

// Manage import file
import { authenticateToken } from "./src/middleware/auth.ts"; 
import { AuthController } from "./src/controllers/AuthController.ts";
import { WeightController } from "./src/controllers/WeightController.ts";

dotenv.config(); // load dotenv

const app = express();

// ดึงค่าจาก .env
const databaseUrl = process.env.DATABASE_URL;
const port = process.env.PORT || 5001;

app.use(express.json());

// เปิดการใช้งาน cors ให้เข้าถึงจาก domain frontend ได้
app.use(cors({
  origin: "http://localhost:3000", // URL ของ Next.js
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true // จำเป็นมากถ้าเราจะใช้ Cookie/Header
}));

// Test API
app.get('/', (req, res) => {
  res.send('Weight Loss System Test API')
})

// ----- Auth API -----
app.post('/api/auth/register', AuthController.register);
app.post('/api/auth/login', AuthController.login);

// ----- Weight API -----
app.get('/api/weight-history', authenticateToken as any, WeightController.getWeightHistory);
app.post('/api/create-weight-log', authenticateToken as any, WeightController.createWeightLog);
app.put('/api/update-weight-log/:weight_id', authenticateToken as any, WeightController.updateWeightLog);
app.delete('/api/delete-weight-log/:weight_id', authenticateToken as any, WeightController.deleteWeightLog);

app.listen(port, () => {
  console.log(`🚀 SQL Server ready at http://localhost:${port}`);
  console.log(`🔗 Database connected to: ${databaseUrl.split('@')[1]}`); // โชว์แค่ host ปลายทางเพื่อความปลอดภัย
});