const express = require("express");
const cors = require("cors");
const oracledb = require("oracledb");
const bcrypt = require("bcryptjs");
const multer = require("multer"); // เพิ่ม multer สำหรับ upload รูป
const path = require("path");
const fs = require("fs");

require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`,
};

async function getConnection() {
  try {
    const connection = await oracledb.getConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error("Oracle Connection Error:", error);
    throw error;
  }
}

async function generateEmpId(connection) {
  const currentYear = new Date().getFullYear();
  const buddhistYear = currentYear + 543;
  const yearCode = String(buddhistYear).slice(-2);
  const result = await connection.execute(
    `SELECT MAX(EMPID) AS MAXID
      FROM MUTEMP
      WHERE EMPID LIKE :prefix`,
    { prefix: `EMP${yearCode}%` },
  );
  let runningNumber = 1;
  if (result.rows[0][0]) {
    const maxId = result.rows[0][0];
    const lastNumber = parseInt(maxId.substring(5), 10);
    runningNumber = lastNumber + 1;
  }
  const runningCode = String(runningNumber).padStart(3, "0");
  return `EMP${yearCode}${runningCode}`;
}

// =====================================================
// LOGIN API
// =====================================================
app.post("/api/login", async (req, res) => {
  let connection;
  try {
    const { email, password } = req.body;
    connection = await getConnection();

    // 1. ดึงข้อมูลผู้ใช้จากตาราง users ใหม่
    const result = await connection.execute(
      `SELECT user_code, first_name, last_name, email, password, role_code
       FROM users
       WHERE email = :email`,
      { email }
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const row = result.rows[0];
    const isMatch = await bcrypt.compare(password, row[4]);
    //const isMatch = (password === row[4]);

    if (!isMatch) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    // 2. ดึงสิทธิ์หน้าจอจาก role_permissions
    const roleCode = row[5];
    let allowedScreens = [];

    if (roleCode) {
      const permResult = await connection.execute(
        `SELECT screen_code FROM role_permissions WHERE role_code = :roleCode`,
        { roleCode: roleCode }
      );
      // แปลงผลลัพธ์เป็น Array ธรรมดา เช่น ['SCR_EMP', 'SCR_PROD']
      allowedScreens = permResult.rows.map(r => r[0]);
    }

    // 3. ส่งข้อมูลกลับให้ Frontend (พร้อม allowedScreens)
    res.json({
      message: "Login successful",
      user: {
        user_code: row[0],
        first_name: row[1],
        email: row[3],
        role_code: roleCode,
        allowedScreens: allowedScreens 
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Login failed", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// GENERATE USER ID (แยก EMP และ PAS)
// =====================================================
async function generateUserCode(connection, roleCode) {
  // ถ้า role_code เป็น R03 ให้ใช้ 'PAS' ถ้าไม่ใช่ให้ใช้ 'EMP'
  const prefix = (roleCode === 'R03') ? 'PAS' : 'EMP';
  
  const result = await connection.execute(
    `SELECT MAX(user_code) AS MAXID FROM users WHERE user_code LIKE '${prefix}%'`
  );
  
  let runningNumber = 1;
  if (result.rows[0][0]) {
    const maxId = result.rows[0][0]; 
    const lastNumber = parseInt(maxId.substring(3), 10); 
    runningNumber = lastNumber + 1;
  }
  
  return `${prefix}${String(runningNumber).padStart(3, "0")}`;
}

// =====================================================
// GET ALL USERS
// =====================================================
app.get("/api/users", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    // ใช้ LEFT JOIN เพื่อดึง role_name และ dept_name มาแสดง
    const result = await connection.execute(
      `SELECT u.user_code, u.first_name, u.last_name, u.email, u.username, 
              u.role_code, r.role_name, 
              u.dept_code, d.dept_name 
       FROM users u
       LEFT JOIN roles r ON u.role_code = r.role_code
       LEFT JOIN departments d ON u.dept_code = d.dept_code
       ORDER BY u.user_code`
    );
    const users = result.rows.map((row) => ({
      user_code: row[0],
      first_name: row[1],
      last_name: row[2],
      email: row[3],
      username: row[4],
      role_code: row[5],
      role_name: row[6] || "-",
      dept_code: row[7],
      dept_name: row[8] || "-",
    }));
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: "Cannot get users", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// GET ROLES FOR DROPDOWN
// =====================================================
app.get("/api/roles", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    // ดึงข้อมูลทั้งหมดเรียงตามรหัส โดยไม่มี WHERE กรองทิ้ง
    const result = await connection.execute(
      `SELECT role_code, role_name FROM roles ORDER BY role_code`
    );
    
    const roles = result.rows.map((row) => ({
      role_code: row[0],
      role_name: row[1],
    }));
    res.json(roles);
  } catch (error) {
    res.status(500).json({ message: "Cannot get roles", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// GET DEPARTMENTS FOR DROPDOWN
// =====================================================
app.get("/api/departments", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT dept_code, dept_name FROM departments ORDER BY dept_code`
    );
    const depts = result.rows.map((row) => ({
      dept_code: row[0],
      dept_name: row[1],
    }));
    res.json(depts);
  } catch (error) {
    res.status(500).json({ message: "Cannot get depts", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});


// =====================================================
// CREATE USER (เพิ่มผู้ใช้งาน)
// =====================================================
app.post("/api/users", async (req, res) => {
  let connection;
  try {
    // 1. รับค่าต่างๆ มาจากหน้าเว็บ (มี role_code มาด้วย)
    const { first_name, last_name, email, username, password, role_code, dept_code } = req.body;
    
    connection = await getConnection();

    // 2. เรียกใช้ฟังก์ชันสร้างรหัส โดยส่ง role_code เข้าไปด้วย เพื่อให้มันรู้ว่าต้องรัน EMP หรือ PAS
    const user_code = await generateUserCode(connection, role_code);

    // เข้ารหัสผ่าน
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. บันทึกลง Database
    await connection.execute(
      `INSERT INTO users (user_code, first_name, last_name, email, username, password, role_code, dept_code)
       VALUES (:1, :2, :3, :4, :5, :6, :7, :8)`,
      [user_code, first_name, last_name, email, username, hashedPassword, role_code, dept_code || null],
      { autoCommit: true }
    );
    
    res.status(201).json({ message: "User created successfully", user_code });
  } catch (error) {
    res.status(500).json({ message: "Error creating user", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// UPDATE USER
// =====================================================
app.put("/api/users/:id", async (req, res) => {
  let connection;
  try {
    const user_code = req.params.id;
    const { first_name, last_name, email, username, password, role_code, dept_code } = req.body;
    connection = await getConnection();

    if (password && password.trim() !== "") {
      const hashedPassword = await bcrypt.hash(password, 10);
      await connection.execute(
        `UPDATE users SET 
         first_name = :first_name, last_name = :last_name, email = :email, 
         username = :username, password = :password, role_code = :role_code, dept_code = :dept_code 
         WHERE user_code = :user_code`,
        { user_code, first_name, last_name, email, username, password: hashedPassword, role_code, dept_code },
        { autoCommit: true }
      );
    } else {
      await connection.execute(
        `UPDATE users SET 
         first_name = :first_name, last_name = :last_name, email = :email, 
         username = :username, role_code = :role_code, dept_code = :dept_code 
         WHERE user_code = :user_code`,
        { user_code, first_name, last_name, email, username, role_code, dept_code },
        { autoCommit: true }
      );
    }
    res.json({ message: "User updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Cannot update user", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// DELETE USER
// =====================================================
app.delete("/api/users/:id", async (req, res) => {
  let connection;
  try {
    const user_code = req.params.id;
    connection = await getConnection();
    await connection.execute(
      `DELETE FROM users WHERE user_code = :user_code`,
      { user_code },
      { autoCommit: true }
    );
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Cannot delete user", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

//---------------------- customer ------------------------//

app.get("/api/mutcus", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT *
      FROM MUTCUSTOMER
      ORDER BY CUSID`,
    );
    const employees = result.rows.map((row) => ({
      cusId: row[0],
      cusname: row[1],
      cusaddress: row[2],
      custel: row[3],
      cusemail: row[4],
    }));

    res.json(employees);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Cannot get customer", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

//----------------------product--------------------------//

// เปิดให้เข้าถึงโฟลเดอร์รูปภาพ static
app.use("/img", express.static(path.join(__dirname, "img")));

// สร้างโฟลเดอร์ img อัตโนมัติถ้ายังไม่มี
const imgDir = path.join(__dirname, "img");
if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir);
}

// ตั้งค่า Storage สำหรับ Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "img/");
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, "PROD-" + uniqueSuffix + ext);
  },
});
const upload = multer({ storage: storage });

// =====================================================
// GENERATE PRODUCT ID (P0001, P0002, ...)
// =====================================================
async function generateProId(connection) {
  const result = await connection.execute(
    `SELECT MAX(PROID) AS MAXID FROM MUTPRODUCT WHERE PROID LIKE 'P%'`,
  );
  let runningNumber = 1;
  if (result.rows[0][0]) {
    const maxId = result.rows[0][0]; // ตัวอย่าง P0001
    const lastNumber = parseInt(maxId.substring(1), 10);
    runningNumber = lastNumber + 1;
  }
  return `P${String(runningNumber).padStart(4, "0")}`;
}

// =====================================================
// GET ALL PRODUCTS
// =====================================================
app.get("/api/mutproduct", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT PROID, PRONAME, IMG, DETAIL, PRICE FROM MUTPRODUCT ORDER BY PROID`,
    );
    const products = result.rows.map((row) => ({
      proId: row[0],
      proName: row[1],
      img: row[2],
      detail: row[3],
      price: row[4],
    }));
    res.json(products);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Cannot get products", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// CREATE PRODUCT (พร้อมอัปโหลดรูป)
// =====================================================
app.post("/api/mutproduct", upload.single("img"), async (req, res) => {
  let connection;
  try {
    const { proName, detail, price } = req.body;
    const imgFilename = req.file ? req.file.filename : "";

    connection = await getConnection();
    const proId = await generateProId(connection);

    await connection.execute(
      `INSERT INTO MUTPRODUCT(PROID, PRONAME, IMG, DETAIL, PRICE)
       VALUES(:proId, :proName, :img, :detail, :price)`,
      {
        proId,
        proName,
        img: imgFilename,
        detail: detail || "",
        price: parseFloat(price) || 0,
      },
      { autoCommit: true },
    );

    res.status(201).json({ message: "Product created successfully", proId });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Cannot create product", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// UPDATE PRODUCT
// =====================================================
app.put("/api/mutproduct/:id", upload.single("img"), async (req, res) => {
  let connection;
  try {
    const proId = req.params.id;
    const { proName, detail, price } = req.body;
    connection = await getConnection();

    if (req.file) {
      // มีการอัปโหลดรูปใหม่
      const imgFilename = req.file.filename;
      await connection.execute(
        `UPDATE MUTPRODUCT SET
         PRONAME = :proName,
         IMG = :img,
         DETAIL = :detail,
         PRICE = :price
         WHERE PROID = :proId`,
        {
          proId,
          proName,
          img: imgFilename,
          detail,
          price: parseFloat(price) || 0,
        },
        { autoCommit: true },
      );
    } else {
      // ไม่ได้เปลี่ยนรูปใหม่
      await connection.execute(
        `UPDATE MUTPRODUCT SET
         PRONAME = :proName,
         DETAIL = :detail,
         PRICE = :price
         WHERE PROID = :proId`,
        { proId, proName, detail, price: parseFloat(price) || 0 },
        { autoCommit: true },
      );
    }

    res.json({ message: "Product updated successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Cannot update product", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// DELETE PRODUCT
// =====================================================
app.delete("/api/mutproduct/:id", async (req, res) => {
  let connection;
  try {
    const proId = req.params.id;
    connection = await getConnection();

    await connection.execute(
      `DELETE FROM MUTPRODUCT WHERE PROID = :proId`,
      { proId },
      { autoCommit: true },
    );

    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Cannot delete product", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

//--------------------------------------------------------//

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// =====================================================
// GET FACULTIES FOR REGISTER DROPDOWN
// =====================================================
app.get("/api/faculties", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    // ค้นหาเฉพาะชื่อที่ขึ้นต้นด้วยคำว่า Faculty
    const result = await connection.execute(
      `SELECT dept_code, dept_name 
       FROM departments 
       WHERE dept_name LIKE 'Faculty%' 
       ORDER BY dept_code`
    );
    const faculties = result.rows.map((row) => ({
      dept_code: row[0],
      dept_name: row[1],
    }));
    res.json(faculties);
  } catch (error) {
    res.status(500).json({ message: "Cannot get faculties", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// GET ALL ROLES
// =====================================================
app.get("/api/roles", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT role_code, role_name FROM roles ORDER BY role_code`
    );
    const roles = result.rows.map((row) => ({
      role_code: row[0],
      role_name: row[1],
    }));
    res.json(roles);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Cannot get roles", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// GET ALL SCREENS
// =====================================================
app.get("/api/screens", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT screen_code, screen_name FROM screens ORDER BY screen_code`
    );
    const screens = result.rows.map((row) => ({
      screen_code: row[0],
      screen_name: row[1],
    }));
    res.json(screens);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Cannot get screens", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// GET PERMISSIONS OF A SPECIFIC ROLE
// =====================================================
app.get("/api/role-permissions/:roleCode", async (req, res) => {
  let connection;
  try {
    const { roleCode } = req.params;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT screen_code, seq_no FROM role_permissions
       WHERE role_code = :roleCode
       ORDER BY seq_no`,
      { roleCode }
    );
    const perms = result.rows.map((row) => ({
      screen_code: row[0],
      seq_no: row[1],
    }));
    res.json(perms);
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Cannot get role permissions", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.post("/api/roles", async (req, res) => {
  const { role_code, role_name } = req.body;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO roles (role_code, role_name) VALUES (:1, :2)`,
      [role_code, role_name],
      { autoCommit: true }
    );
    res.status(201).json({ message: "Role created successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error creating role", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// REPLACE PERMISSIONS OF A ROLE
// (ลบสิทธิ์เดิมทั้งหมดของ role นี้ แล้วใส่ชุดใหม่ที่ frontend ส่งมา)
// body: { screens: [{ screen_code, seq_no }, ...] }
// =====================================================
app.put("/api/role-permissions/:roleCode", async (req, res) => {
  let connection;
  try {
    const { roleCode } = req.params;
    const { screens } = req.body;

    if (!Array.isArray(screens)) {
      return res.status(400).json({ message: "screens must be an array" });
    }

    connection = await getConnection();

    // ลบสิทธิ์เดิมของ role นี้ทั้งหมดก่อน
    await connection.execute(
      `DELETE FROM role_permissions WHERE role_code = :roleCode`,
      { roleCode }
    );

    // ใส่สิทธิ์ใหม่ทีละแถว
    for (const s of screens) {
      await connection.execute(
        `INSERT INTO role_permissions (role_code, screen_code, seq_no)
         VALUES (:roleCode, :screenCode, :seqNo)`,
        { roleCode, screenCode: s.screen_code, seqNo: s.seq_no }
      );
    }

    await connection.commit();
    res.json({ message: "Permissions updated successfully" });
  } catch (error) {
    console.error(error);
    if (connection) {
      try {
        await connection.rollback();
      } catch (rollbackErr) {
        console.error("Rollback failed:", rollbackErr);
      }
    }
    res
      .status(500)
      .json({ message: "Cannot update permissions", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==========================================
// API: ลบ Role (Update แบบเช็คข้อมูลอ้างอิง)
// ==========================================
app.delete("/api/roles/:role_code", async (req, res) => {
  const { role_code } = req.params;
  let connection;
  try {
    connection = await getConnection();

    // 1. เช็คก่อนว่ามี Users คนไหนใช้ Role นี้อยู่หรือไม่
    const checkUser = await connection.execute(
      `SELECT COUNT(*) FROM users WHERE role_code = :role_code`,
      { role_code }
    );
    
    // ถ้ามี User ใช้อยู่ (Count > 0) ให้ส่งแจ้งเตือนกลับไป
    if (checkUser.rows[0][0] > 0) {
      return res.status(400).json({ 
        message: "ไม่สามารถลบได้ เนื่องจากมีผู้ใช้งานกำลังผูกกับสิทธิ์นี้อยู่ กรุณาเปลี่ยนสิทธิ์ให้ผู้ใช้เหล่านั้นก่อน" 
      });
    }

    // 2. ลบข้อมูลสิทธิ์หน้าจอในตาราง role_permissions ก่อน (ล้างข้อมูลลูก)
    await connection.execute(
      `DELETE FROM role_permissions WHERE role_code = :role_code`,
      { role_code },
      { autoCommit: false } // ยังไม่ commit รอทำพร้อมลบ Role
    );

    // 3. ลบ Role ในตารางหลัก
    await connection.execute(
      `DELETE FROM roles WHERE role_code = :role_code`,
      { role_code },
      { autoCommit: true } // Commit ทีเดียว
    );

    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Delete Role Error:", error);
    res.status(500).json({ 
      message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์ ไม่สามารถลบข้อมูลได้", 
      error: error.message 
    });
  } finally {
    if (connection) await connection.close();
  }
});

// ==========================================
// API: ดึงรายงานพฤติกรรมผู้ใช้งาน (Report)
// ==========================================
app.get("/api/reports/user-behavior", async (req, res) => {
  const { startDate, endDate } = req.query;
  let connection;

  try {
    connection = await getConnection();
    
    const query = `
      SELECT 
        u.first_name || ' ' || u.last_name AS user_name,
        COUNT(b.booking_code) AS total_bookings,
        SUM(CASE WHEN UPPER(b.status) = 'COMPLETED' THEN 1 ELSE 0 END) AS boarded,
        SUM(CASE WHEN UPPER(b.status) = 'CANCELLED' THEN 1 ELSE 0 END) AS canceled,
        SUM(CASE WHEN UPPER(b.status) = 'NO_SHOW' THEN 1 ELSE 0 END) AS no_show
      FROM bookings b
      JOIN users u ON b.user_code = u.user_code
      /* ใช้คอลัมน์ travel_date ที่สร้างใหม่ในการกรองวันที่ */
      WHERE b.travel_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD')
      GROUP BY u.first_name, u.last_name
      ORDER BY total_bookings DESC
    `;

    const result = await connection.execute(query, { startDate, endDate });

    const reportData = result.rows.map((row) => ({
      user_name: row[0],
      total: row[1] || 0,
      boarded: row[2] || 0,
      canceled: row[3] || 0,
      no_show: row[4] || 0,
    }));

    res.json(reportData);
  } catch (error) {
    console.error("Error generating report:", error);
    res.status(500).json({ message: "Cannot generate report", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==========================================
// API: Driver Panel
// ==========================================
// 1. ดึงรอบรถที่มอบหมายให้คนขับคนนี้ (ดึงเฉพาะของวันนี้)
app.get("/api/driver/schedules", async (req, res) => {
  const { driver_code } = req.query;
  let connection;
  try {
    connection = await getConnection();
    const query = `
      SELECT s.schedule_code, s.start_time, r.route_name
      FROM schedules s
      JOIN routes r ON s.route_code = r.route_code
      WHERE s.driver_code = :driver_code
      ORDER BY s.start_time ASC
    `;
    const result = await connection.execute(query, { driver_code });
    const schedules = result.rows.map(row => ({
      schedule_code: row[0],
      start_time: row[1],
      route_name: row[2]
    }));
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: "Error fetching schedules", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// 2. ดึงรายชื่อผู้โดยสารในรอบรถที่เลือก (JOIN หาจุดขึ้น/ลงรถ)
app.get("/api/driver/passengers", async (req, res) => {
  const { schedule_code } = req.query;
  let connection;
  try {
    connection = await getConnection();
    const query = `
      SELECT 
        b.booking_code, 
        u.first_name || ' ' || u.last_name AS passenger_name,
        sp.stop_name AS pickup_station,
        sd.stop_name AS dropoff_station,
        b.status
      FROM bookings b
      JOIN users u ON b.user_code = u.user_code
      JOIN trip_logs tp ON b.pickup_log_code = tp.log_code
      JOIN stations sp ON tp.stop_code = sp.stop_code
      JOIN trip_logs td ON b.dropoff_log_code = td.log_code
      JOIN stations sd ON td.stop_code = sd.stop_code
      WHERE tp.schedule_code = :schedule_code 
      -- ดึงเฉพาะการจองของวันนี้
      AND TRUNC(b.travel_date) = TRUNC(SYSDATE)
      ORDER BY tp.expected_timestamp ASC
    `;
    const result = await connection.execute(query, { schedule_code });
    const passengers = result.rows.map(row => ({
      booking_code: row[0],
      passenger_name: row[1],
      pickup_station: row[2],
      dropoff_station: row[3],
      status: row[4]
    }));
    res.json(passengers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching passengers", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// 3. อัปเดตสถานะผู้โดยสาร (COMPLETED / NO_SHOW)
app.put("/api/bookings/:booking_code/status", async (req, res) => {
  const { booking_code } = req.params;
  const { status } = req.body;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `UPDATE bookings SET status = :status WHERE booking_code = :booking_code`,
      { status, booking_code },
      { autoCommit: true }
    );
    res.json({ message: "Status updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});
// ==========================================
// 4. ดึงข้อมูลจุดจอด (Trip Logs) 
// ==========================================
app.get("/api/driver/trip-logs", async (req, res) => {
  const { schedule_code } = req.query;
  let connection;
  try {
    connection = await getConnection();
    const query = `
      SELECT 
        t.log_code, 
        s.stop_name, 
        TO_CHAR(t.expected_timestamp, 'HH24:MI:SS') AS expected_time, 
        TO_CHAR(t.actual_timestamp, 'HH24:MI:SS') AS actual_time
      FROM trip_logs t
      JOIN stations s ON t.stop_code = s.stop_code
      WHERE t.schedule_code = :schedule_code
      ORDER BY t.expected_timestamp ASC
    `;
    const result = await connection.execute(query, { schedule_code });
    const logs = result.rows.map(row => ({
      log_code: row[0],
      stop_name: row[1],
      expected_time: row[2],
      actual_time: row[3] // ถ้าระบบยังไม่ถึงป้าย ค่านี้จะเป็น null
    }));
    res.json(logs);
  } catch (error) {
    console.error("Trip Logs Error:", error);
    res.status(500).json({ message: "Error fetching trip logs", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==========================================
// 5. อัปเดตเวลาเมื่อรถเดินทางถึงจุดจอดจริง
// ==========================================
app.put("/api/driver/trip-logs/:log_code/arrive", async (req, res) => {
  const { log_code } = req.params;
  let connection;
  try {
    connection = await getConnection();
    // อัปเดต actual_timestamp เป็นเวลาปัจจุบันของระบบฐานข้อมูล (SYSTIMESTAMP)
    await connection.execute(
      `UPDATE trip_logs SET actual_timestamp = SYSTIMESTAMP WHERE log_code = :log_code`,
      { log_code },
      { autoCommit: true }
    );
    res.json({ message: "อัปเดตเวลาถึงป้ายสำเร็จ" });
  } catch (error) {
    console.error("Update Arrive Error:", error);
    res.status(500).json({ message: "Error updating trip log", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==========================================
// Booking API (สำหรับผู้โดยสารจองตั๋ว)
// ==========================================

// 1. ดึงข้อมูลเส้นทางทั้งหมด
app.get('/api/booking/routes', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT route_code, route_name FROM routes ORDER BY route_code`
    );
    const routes = result.rows.map((row) => ({
      route_code: row[0],
      route_name: row[1],
    }));
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: "Cannot get routes", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// 2. ดึงข้อมูลจุดขึ้น-ลงรถ โดยทำการ Map การอ้างอิงตำแหน่งเข้ากับรายละเอียดเส้นทางโดยตรง
app.get('/api/booking/routes/:routeCode/stops', async (req, res) => {
  let connection;
  try {
    const { routeCode } = req.params;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT rd.stop_code, s.stop_name, rd.stop_order 
       FROM route_details rd
       JOIN stations s ON rd.stop_code = s.stop_code
       WHERE rd.route_code = :routeCode
       ORDER BY rd.stop_order`,
      { routeCode }
    );
    const stops = result.rows.map((row) => ({
      stop_code: row[0],
      stop_name: row[1],
      stop_order: row[2],
    }));
    res.json(stops);
  } catch (error) {
    res.status(500).json({ message: "Cannot get stops", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// 3. ดึงรอบการเดินรถตามเส้นทาง
app.get('/api/booking/schedules/:routeCode', async (req, res) => {
  let connection;
  try {
    const { routeCode } = req.params;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT schedule_code, start_time 
       FROM schedules 
       WHERE route_code = :routeCode 
       ORDER BY start_time`,
      { routeCode }
    );
    const schedules = result.rows.map((row) => ({
      schedule_code: row[0],
      start_time: row[1],
    }));
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: "Cannot get schedules", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==========================================
// 4. บันทึกการจองใหม่ (แก้ไขคอลัมน์ให้ตรงกับ DB)
// ==========================================
// ในไฟล์ server.js หาบรรทัด app.post('/api/bookings/create', async (req, res) => {
app.post('/api/bookings/create', async (req, res) => {
    const { user_code, schedule_code, pickup_order, dropoff_order, passenger_count } = req.body;
    let connection;
    
    try {
        connection = await getConnection();

        // ---------------------------------------------------------
        // [เพิ่มใหม่] 1. เช็คโควต้าที่นั่งของผู้ใช้รายนี้ ว่ารวมของใหม่แล้วเกิน 4 หรือไม่
        // ---------------------------------------------------------
        const checkActiveSeats = await connection.execute(
            `SELECT NVL(SUM(passenger_count), 0) AS total_active
             FROM bookings
             WHERE user_code = :user_code AND status = 'ACTIVE'`,
            { user_code }
        );
        
        const currentActiveSeats = checkActiveSeats.rows[0][0];

        if (currentActiveSeats + passenger_count > 4) {
            return res.status(400).json({ 
                message: `โควต้าเต็ม! คุณมีรายการจองค้างอยู่ ${currentActiveSeats} ที่นั่ง สามารถจองเพิ่มได้อีกแค่ ${4 - currentActiveSeats} ที่นั่งเท่านั้น` 
            });
        }
        // ---------------------------------------------------------

        // 2. ดึง log_code (โค้ดเดิมของคุณ)
        const logResult = await connection.execute(
            `WITH OrderedLogs AS (
                SELECT log_code, 
                       ROW_NUMBER() OVER (ORDER BY expected_timestamp ASC) as stop_order
                FROM trip_logs
                WHERE schedule_code = :schedule_code
             )
             SELECT log_code, stop_order FROM OrderedLogs 
             WHERE stop_order IN (:pickup, :dropoff)`,
            { schedule_code, pickup: pickup_order, dropoff: dropoff_order },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const pickupLog = logResult.rows.find(row => row.STOP_ORDER === parseInt(pickup_order));
        const dropoffLog = logResult.rows.find(row => row.STOP_ORDER === parseInt(dropoff_order));

        if (!pickupLog || !dropoffLog) {
            return res.status(400).json({ message: 'ไม่พบข้อมูลจุดจอดในรอบการเดินรถนี้' });
        }

        const bookingCode = 'BK' + Date.now().toString().slice(-8);
        const qrCode = `QR_${bookingCode}`;

        // 3. บันทึกข้อมูล
        await connection.execute(
            `INSERT INTO bookings 
             (booking_code, user_code, pickup_log_code, dropoff_log_code, passenger_count, travel_date, booking_timestamp, status, qr_code)
             VALUES (:booking_code, :user_code, :pickup_log, :dropoff_log, :count, TRUNC(SYSDATE), SYSTIMESTAMP, 'ACTIVE', :qr_code)`,
            {
                booking_code: bookingCode,
                user_code: user_code,
                pickup_log: pickupLog.LOG_CODE,
                dropoff_log: dropoffLog.LOG_CODE,
                count: passenger_count,
                qr_code: qrCode
            },
            { autoCommit: true }
        );

        res.status(201).json({ message: 'จองสำเร็จ', booking_code: bookingCode, qr_code: qrCode });
    } catch (err) {
        console.error("Booking Error:", err);
        res.status(500).json({ message: 'Cannot create booking', error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});

// ==========================================
// API คำนวณที่นั่งว่าง (Availability - แก้ไขลอจิกลำดับป้ายที่ซ้ำกัน)
// ==========================================
app.get('/api/booking/schedules/:routeCode/availability', async (req, res) => {
  const { routeCode } = req.params;
  const { pickup_order, dropoff_order, travel_date } = req.query;
  let connection;

  try {
    connection = await getConnection();

    const query = `
      WITH OrderedLogs AS (
          SELECT log_code, schedule_code, expected_timestamp,
                 ROW_NUMBER() OVER (PARTITION BY schedule_code ORDER BY expected_timestamp ASC) as stop_order
          FROM trip_logs
      ),
      BookingOrders AS (
          SELECT b.booking_code, b.passenger_count,
                 p.schedule_code,
                 p.stop_order as pickup_order,
                 d.stop_order as dropoff_order
          FROM bookings b
          JOIN OrderedLogs p ON b.pickup_log_code = p.log_code
          JOIN OrderedLogs d ON b.dropoff_log_code = d.log_code
          WHERE b.status IN ('ACTIVE', 'COMPLETED')
            AND TRUNC(b.travel_date) = TO_DATE(:travel_date, 'YYYY-MM-DD')
      ),
      SegmentBounds AS (
          SELECT TO_NUMBER(:pickup_order) as p_order, TO_NUMBER(:dropoff_order) as d_order FROM DUAL
      ),
      ScheduleUsage AS (
          SELECT 
              s.schedule_code,
              s.start_time,
              v.capacity,
              NVL((
                  SELECT MAX(passengers_on_board)
                  FROM (
                      SELECT segments.check_order, NVL(SUM(bo.passenger_count), 0) as passengers_on_board
                      FROM (
                          SELECT (SELECT p_order FROM SegmentBounds) + LEVEL - 1 AS check_order
                          FROM DUAL
                          CONNECT BY LEVEL <= (SELECT d_order - p_order FROM SegmentBounds)
                      ) segments
                      LEFT JOIN BookingOrders bo 
                             ON bo.schedule_code = s.schedule_code
                            AND bo.pickup_order <= segments.check_order
                            AND bo.dropoff_order > segments.check_order
                      GROUP BY segments.check_order
                  )
              ), 0) AS max_used_seats
          FROM schedules s
          JOIN vehicles v ON s.vehicle_code = v.vehicle_code
          -- [เพิ่มใหม่] เช็คเวลาที่รถจะถึงจุดขึ้นรถ ต้องมากกว่าเวลาปัจจุบัน 20 นาที --
          JOIN OrderedLogs plog ON plog.schedule_code = s.schedule_code 
               AND plog.stop_order = (SELECT p_order FROM SegmentBounds)
          WHERE s.route_code = :routeCode
            -- SYSTIMESTAMP + 20 นาที
            AND plog.expected_timestamp > (SYSTIMESTAMP + INTERVAL '20' MINUTE) 
      )
      SELECT 
          schedule_code, start_time, capacity, max_used_seats,
          (capacity - max_used_seats) AS available_seats
      FROM ScheduleUsage
      ORDER BY start_time ASC
    `;

    const result = await connection.execute(query, {
      routeCode,
      pickup_order,
      dropoff_order,
      travel_date: travel_date 
    });

    const schedules = result.rows.map(row => ({
      schedule_code: row[0],
      start_time: row[1],
      total_capacity: row[2],
      used_seats: row[3],
      available_seats: row[4]
    }));

    res.json(schedules);
  } catch (error) {
    console.error("Availability Error:", error);
    res.status(500).json({ message: "Error calculating availability", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});
// ==========================================
// [เพิ่มใหม่] ดึงประวัติการจองของผู้ใช้งาน
// ==========================================
app.get('/api/user/bookings/:userCode', async (req, res) => {
  let connection;
  try {
    const { userCode } = req.params;
    connection = await getConnection();
    const query = `
      SELECT 
        b.booking_code, 
        TO_CHAR(b.travel_date, 'YYYY-MM-DD') as travel_date,
        b.passenger_count, 
        b.status,
        b.qr_code,
        s.start_time,
        r.route_name,
        sp.stop_name as pickup_name,
        sd.stop_name as dropoff_name
      FROM bookings b
      JOIN trip_logs tp ON b.pickup_log_code = tp.log_code
      JOIN stations sp ON tp.stop_code = sp.stop_code
      JOIN trip_logs td ON b.dropoff_log_code = td.log_code
      JOIN stations sd ON td.stop_code = sd.stop_code
      JOIN schedules s ON tp.schedule_code = s.schedule_code
      JOIN routes r ON s.route_code = r.route_code
      WHERE b.user_code = :userCode
      ORDER BY b.booking_timestamp DESC
    `;
    const result = await connection.execute(query, { userCode });
    const bookings = result.rows.map(row => ({
      booking_code: row[0],
      travel_date: row[1],
      passenger_count: row[2],
      status: row[3], // ACTIVE, COMPLETED, CANCELLED
      qr_code: row[4],
      start_time: row[5],
      route_name: row[6],
      pickup_name: row[7],
      dropoff_name: row[8]
    }));
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user bookings", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==========================================
// [เพิ่มใหม่] ยกเลิกการจอง (โดยผู้ใช้งาน)
// ==========================================
app.put('/api/bookings/:bookingCode/cancel', async (req, res) => {
  let connection;
  try {
    const { bookingCode } = req.params;
    connection = await getConnection();
    
    // ตรวจสอบสถานะก่อนว่ายังเป็น ACTIVE อยู่หรือไม่
    const checkStatus = await connection.execute(
      `SELECT status FROM bookings WHERE booking_code = :bookingCode`,
      { bookingCode }
    );

    if (checkStatus.rows.length === 0) {
      return res.status(404).json({ message: "ไม่พบข้อมูลการจอง" });
    }
    if (checkStatus.rows[0][0] !== 'ACTIVE') {
      return res.status(400).json({ message: "ไม่สามารถยกเลิกรายการนี้ได้ เนื่องจากสถานะไม่ใช่ ACTIVE" });
    }

    // อัปเดตสถานะเป็น CANCELLED
    // (เมื่อเปลี่ยนสถานะแล้ว จำนวนที่นั่งว่างในรอบนั้นจะคืนกลับมาอัตโนมัติใน API Availability)
    await connection.execute(
      `UPDATE bookings SET status = 'CANCELLED' WHERE booking_code = :bookingCode`,
      { bookingCode },
      { autoCommit: true }
    );
    
    res.json({ message: "ยกเลิกการจองสำเร็จ ที่นั่งถูกคืนเข้าสู่ระบบแล้ว" });
  } catch (error) {
    res.status(500).json({ message: "Error canceling booking", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});
// ==========================================
// [เพิ่มใหม่] 1. ดึงข้อมูลจุดจอดทั้งหมด (ไม่แบ่งสาย) เพื่อทำ Dropdown
// ==========================================
app.get('/api/stations', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT stop_code, stop_name FROM stations ORDER BY stop_name`
    );
    const stations = result.rows.map(row => ({
      stop_code: row[0],
      stop_name: row[1]
    }));
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: "Cannot get stations", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==========================================
// [เพิ่มใหม่] 2. ค้นหารอบรถจากจุดขึ้น-จุดลง (Smart Search)
// ==========================================
app.get('/api/booking/search', async (req, res) => {
  const { pickup_code, dropoff_code, travel_date } = req.query;
  let connection;

  try {
    connection = await getConnection();
    // Query นี้จะหาว่ามีรอบรถไหนบ้างที่ผ่านจุดขึ้น และไปจุดลง ตามลำดับ
    // พร้อมดึงเวลาที่คาดว่าจะถึงจุดขึ้นรถ (expected_pickup_time) และเช็คที่นั่งว่าง
    const query = `
      WITH OrderedLogs AS (
          SELECT log_code, schedule_code, stop_code, expected_timestamp,
                 ROW_NUMBER() OVER (PARTITION BY schedule_code ORDER BY expected_timestamp ASC) as stop_order
          FROM trip_logs
      ),
      MatchingSchedules AS (
          SELECT p.schedule_code,
                 p.log_code as pickup_log_code, p.stop_order as pickup_order, p.expected_timestamp as pickup_time,
                 d.log_code as dropoff_log_code, d.stop_order as dropoff_order, d.expected_timestamp as dropoff_time
          FROM OrderedLogs p
          JOIN OrderedLogs d ON p.schedule_code = d.schedule_code
          WHERE p.stop_code = :pickup_code
            AND d.stop_code = :dropoff_code
            AND p.stop_order < d.stop_order
            -- เช็คว่าเวลาที่รถจะถึงจุดขึ้น ต้องมากกว่าเวลาปัจจุบัน 20 นาที
            AND p.expected_timestamp > (SYSTIMESTAMP + INTERVAL '20' MINUTE)
      ),
      BookingOrders AS (
          SELECT b.booking_code, b.passenger_count,
                 p.schedule_code, p.stop_order as p_order, d.stop_order as d_order
          FROM bookings b
          JOIN OrderedLogs p ON b.pickup_log_code = p.log_code
          JOIN OrderedLogs d ON b.dropoff_log_code = d.log_code
          WHERE b.status IN ('ACTIVE', 'COMPLETED')
            AND TRUNC(b.travel_date) = TO_DATE(:travel_date, 'YYYY-MM-DD')
      ),
      ScheduleUsage AS (
          SELECT 
              ms.schedule_code, ms.pickup_time, ms.pickup_order, ms.dropoff_order,
              s.start_time, r.route_code, r.route_name, v.capacity,
              NVL((
                  SELECT MAX(passengers_on_board)
                  FROM (
                      SELECT segments.check_order, NVL(SUM(bo.passenger_count), 0) as passengers_on_board
                      FROM (
                          SELECT ms.pickup_order + LEVEL - 1 AS check_order FROM DUAL
                          CONNECT BY LEVEL <= (ms.dropoff_order - ms.pickup_order)
                      ) segments
                      LEFT JOIN BookingOrders bo 
                             ON bo.schedule_code = ms.schedule_code
                            AND bo.p_order <= segments.check_order
                            AND bo.d_order > segments.check_order
                      GROUP BY segments.check_order
                  )
              ), 0) AS max_used_seats
          FROM MatchingSchedules ms
          JOIN schedules s ON ms.schedule_code = s.schedule_code
          JOIN routes r ON s.route_code = r.route_code
          JOIN vehicles v ON s.vehicle_code = v.vehicle_code
      )
      SELECT 
          schedule_code, route_code, route_name, 
          TO_CHAR(pickup_time, 'HH24:MI') as expected_pickup_time, 
          capacity, max_used_seats,
          (capacity - max_used_seats) AS available_seats,
          pickup_order, dropoff_order
      FROM ScheduleUsage
      ORDER BY pickup_time ASC
    `;

    const result = await connection.execute(query, { pickup_code, dropoff_code, travel_date });

    const schedules = result.rows.map(row => ({
      schedule_code: row[0],
      route_code: row[1],
      route_name: row[2],
      expected_pickup_time: row[3], // เวลาที่ต้องไปรอรถ
      total_capacity: row[4],
      used_seats: row[5],
      available_seats: row[6],
      pickup_order: row[7],
      dropoff_order: row[8]
    }));

    res.json(schedules);
  } catch (error) {
    console.error("Search Error:", error);
    res.status(500).json({ message: "Error searching schedules", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});