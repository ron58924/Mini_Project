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
// GENERATE USER ID (EMP001, EMP002, ...)
// =====================================================
async function generateUserCode(connection) {
  const result = await connection.execute(
    // เปลี่ยนเงื่อนไขให้ค้นหารหัสที่ขึ้นต้นด้วย 'EMP'
    `SELECT MAX(user_code) AS MAXID FROM users WHERE user_code LIKE 'EMP%'`
  );
  let runningNumber = 1;
  if (result.rows[0][0]) {
    const maxId = result.rows[0][0]; // ตัวอย่างข้อมูลที่ได้มาคือ 'EMP001'
    
    // ตัดตัวอักษร 3 ตัวแรก ("EMP") ออก แล้วเอาตัวเลขมาบวก 1
    const lastNumber = parseInt(maxId.substring(3), 10); 
    runningNumber = lastNumber + 1;
  }
  
  // คืนค่ารูปแบบใหม่โดยใช้คำว่า EMP นำหน้า
  return `EMP${String(runningNumber).padStart(3, "0")}`;
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
// GET ROLES FOR DROPDOWN (ไม่เอา Passenger)
// =====================================================
app.get("/api/roles", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    // ใช้ LOWER() เพื่อให้เช็คคำว่า passenger ได้ครอบคลุมทั้งตัวเล็กตัวใหญ่
    const result = await connection.execute(
      `SELECT role_code, role_name 
       FROM roles 
       WHERE LOWER(role_name) NOT LIKE '%passenger%' 
         AND LOWER(role_name) NOT LIKE '%passanger%'
       ORDER BY role_code`
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
// CREATE USER
// =====================================================
app.post("/api/users", async (req, res) => {
  let connection;
  try {
    const { first_name, last_name, email, username, password, role_code, dept_code } = req.body;
    if (!password || password.trim() === "") {
      return res.status(400).json({ message: "Password is required" });
    }
    
    connection = await getConnection();
    const user_code = await generateUserCode(connection);
    const hashedPassword = await bcrypt.hash(password, 10);

    await connection.execute(
      `INSERT INTO users(user_code, first_name, last_name, email, username, password, role_code, dept_code)
       VALUES(:user_code, :first_name, :last_name, :email, :username, :password, :role_code, :dept_code)`,
      {
        user_code, first_name, last_name, email, username,
        password: hashedPassword, role_code, dept_code
      },
      { autoCommit: true }
    );

    res.status(201).json({ message: "User created successfully", user_code });
  } catch (error) {
    res.status(500).json({ message: "Cannot create user", error: error.message });
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
