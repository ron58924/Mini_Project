const oracledb = require("oracledb");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`,
};

// สมมติ: R01=Admin, R02=Driver, R03=Passenger (แก้ R03 ให้ตรงกับสิทธิ์ผู้โดยสารของคุณได้เลย)
// สมมติ: แผนก D01=บริหาร, D03=ปฏิบัติการ ส่วนผู้โดยสารไม่มีแผนก
const mockUsers = [
  // ผู้โดยสารอาจจะให้รหัสขึ้นต้นด้วย CUS หรือ EMP ต่อก็ได้
  { code: "PAS001", name: "Passenger1", email: "Passenger1@gmail.com", user: "pass1", pass: "1234", role: "R03", dept: "" }, 
  { code: "PAS002", name: "Passenger2", email: "Passenger2@gmail.com", user: "pass2", pass: "1234", role: "R03", dept: "" }
];

async function seedData() {
  let connection;
  try {
    connection = await oracledb.getConnection(dbConfig);
    console.log("เชื่อมต่อ Database สำเร็จ กำลังเพิ่มข้อมูล...");

    for (const u of mockUsers) {
      // ทำการเข้ารหัส 1234 ด้วย bcrypt
      const hashedPassword = await bcrypt.hash(u.pass, 10);
      
      await connection.execute(
        `INSERT INTO users (user_code, first_name, last_name, email, username, password, role_code, dept_code)
         VALUES (:1, :2, :3, :4, :5, :6, :7, :8)`,
        [u.code, u.name, "Test", u.email, u.user, hashedPassword, u.role, u.dept || null],
        { autoCommit: true }
      );
      console.log(`เพิ่มผู้ใช้สำเร็จ: ${u.email}`);
    }
    console.log("เสร็จสิ้น!");
  } catch (err) {
    console.error("เกิดข้อผิดพลาด:", err);
  } finally {
    if (connection) await connection.close();
  }
}

seedData();