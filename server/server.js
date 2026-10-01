const express = require("express");
const cors = require("cors");
const oracledb = require("oracledb");
const bcrypt = require("bcryptjs");
const multer = require("multer"); 
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

    if (!isMatch) {
      return res.status(401).json({ message: "อีเมลหรือรหัสผ่านไม่ถูกต้อง" });
    }

    const roleCode = row[5];
    let allowedScreens = [];

    if (roleCode) {
      const permResult = await connection.execute(
        `SELECT screen_code FROM role_permissions WHERE role_code = :roleCode`,
        { roleCode: roleCode }
      );
      allowedScreens = permResult.rows.map(r => r[0]);
    }

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
    const { first_name, last_name, email, username, password, role_code, dept_code } = req.body;
    connection = await getConnection();
    const user_code = await generateUserCode(connection, role_code);
    const bcrypt = require("bcryptjs");
    const hashedPassword = await bcrypt.hash(password, 10);

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


//----------------------product--------------------------//

app.use("/img", express.static(path.join(__dirname, "img")));

const imgDir = path.join(__dirname, "img");
if (!fs.existsSync(imgDir)) {
  fs.mkdirSync(imgDir);
}

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

async function generateProId(connection) {
  const result = await connection.execute(
    `SELECT MAX(PROID) AS MAXID FROM MUTPRODUCT WHERE PROID LIKE 'P%'`,
  );
  let runningNumber = 1;
  if (result.rows[0][0]) {
    const maxId = result.rows[0][0]; 
    const lastNumber = parseInt(maxId.substring(1), 10);
    runningNumber = lastNumber + 1;
  }
  return `P${String(runningNumber).padStart(4, "0")}`;
}

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
    res.status(500).json({ message: "Cannot get products", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

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
      { proId, proName, img: imgFilename, detail: detail || "", price: parseFloat(price) || 0 },
      { autoCommit: true }
    );
    res.status(201).json({ message: "Product created successfully", proId });
  } catch (error) {
    res.status(500).json({ message: "Cannot create product", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.put("/api/mutproduct/:id", upload.single("img"), async (req, res) => {
  let connection;
  try {
    const proId = req.params.id;
    const { proName, detail, price } = req.body;
    connection = await getConnection();

    if (req.file) {
      const imgFilename = req.file.filename;
      await connection.execute(
        `UPDATE MUTPRODUCT SET PRONAME = :proName, IMG = :img, DETAIL = :detail, PRICE = :price WHERE PROID = :proId`,
        { proId, proName, img: imgFilename, detail, price: parseFloat(price) || 0 },
        { autoCommit: true }
      );
    } else {
      await connection.execute(
        `UPDATE MUTPRODUCT SET PRONAME = :proName, DETAIL = :detail, PRICE = :price WHERE PROID = :proId`,
        { proId, proName, detail, price: parseFloat(price) || 0 },
        { autoCommit: true }
      );
    }
    res.json({ message: "Product updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Cannot update product", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete("/api/mutproduct/:id", async (req, res) => {
  let connection;
  try {
    const proId = req.params.id;
    connection = await getConnection();
    await connection.execute(
      `DELETE FROM MUTPRODUCT WHERE PROID = :proId`,
      { proId },
      { autoCommit: true }
    );
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Cannot delete product", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =====================================================
// GET FACULTIES FOR REGISTER DROPDOWN
// =====================================================
app.get("/api/faculties", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT dept_code, dept_name FROM departments WHERE dept_name LIKE 'Faculty%' ORDER BY dept_code`
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
      `SELECT screen_code, seq_no FROM role_permissions WHERE role_code = :roleCode ORDER BY seq_no`,
      { roleCode }
    );
    const perms = result.rows.map((row) => ({
      screen_code: row[0],
      seq_no: row[1],
    }));
    res.json(perms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Cannot get role permissions", error: error.message });
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

app.put("/api/role-permissions/:roleCode", async (req, res) => {
  let connection;
  try {
    const { roleCode } = req.params;
    const { screens } = req.body;
    if (!Array.isArray(screens)) return res.status(400).json({ message: "screens must be an array" });

    connection = await getConnection();
    await connection.execute(`DELETE FROM role_permissions WHERE role_code = :roleCode`, { roleCode });

    for (const s of screens) {
      await connection.execute(
        `INSERT INTO role_permissions (role_code, screen_code, seq_no) VALUES (:roleCode, :screenCode, :seqNo)`,
        { roleCode, screenCode: s.screen_code, seqNo: s.seq_no }
      );
    }
    await connection.commit();
    res.json({ message: "Permissions updated successfully" });
  } catch (error) {
    console.error(error);
    if (connection) {
      try { await connection.rollback(); } catch (rollbackErr) { console.error("Rollback failed:", rollbackErr); }
    }
    res.status(500).json({ message: "Cannot update permissions", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete("/api/roles/:role_code", async (req, res) => {
  const { role_code } = req.params;
  let connection;
  try {
    connection = await getConnection();
    const checkUser = await connection.execute(`SELECT COUNT(*) FROM users WHERE role_code = :role_code`, { role_code });
    if (checkUser.rows[0][0] > 0) {
      return res.status(400).json({ message: "ไม่สามารถลบได้ เนื่องจากมีผู้ใช้งานกำลังผูกกับสิทธิ์นี้อยู่" });
    }
    await connection.execute(`DELETE FROM role_permissions WHERE role_code = :role_code`, { role_code }, { autoCommit: false });
    await connection.execute(`DELETE FROM roles WHERE role_code = :role_code`, { role_code }, { autoCommit: true });
    res.json({ message: "Role deleted successfully" });
  } catch (error) {
    console.error("Delete Role Error:", error);
    res.status(500).json({ message: "เกิดข้อผิดพลาดที่เซิร์ฟเวอร์", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.get("/api/reports/user-behavior", async (req, res) => {
  const { startDate, endDate } = req.query;
  let connection;
  try {
    connection = await getConnection();
    const query = `
      SELECT u.first_name || ' ' || u.last_name AS user_name,
             COUNT(b.booking_code) AS total_bookings,
             SUM(CASE WHEN UPPER(b.status) = 'COMPLETED' THEN 1 ELSE 0 END) AS boarded,
             SUM(CASE WHEN UPPER(b.status) = 'CANCELLED' THEN 1 ELSE 0 END) AS canceled,
             SUM(CASE WHEN UPPER(b.status) = 'NO_SHOW' THEN 1 ELSE 0 END) AS no_show
      FROM bookings b
      JOIN users u ON b.user_code = u.user_code
      WHERE b.travel_date BETWEEN TO_DATE(:startDate, 'YYYY-MM-DD') AND TO_DATE(:endDate, 'YYYY-MM-DD')
      GROUP BY u.first_name, u.last_name
      ORDER BY total_bookings DESC
    `;
    const result = await connection.execute(query, { startDate, endDate });
    const reportData = result.rows.map((row) => ({
      user_name: row[0], total: row[1] || 0, boarded: row[2] || 0, canceled: row[3] || 0, no_show: row[4] || 0,
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

// 1. ดึงรอบรถที่มอบหมายให้คนขับคนนี้ (เช็คสถานะและดึงวันที่)
app.get("/api/driver/schedules", async (req, res) => {
  const { driver_code } = req.query;
  let connection;
  try {
    connection = await getConnection();
    const query = `
      SELECT 
        s.schedule_code, 
        s.start_time, 
        r.route_name, 
        v.capacity,
        (SELECT NVL(SUM(b.passenger_count), 0)
         FROM bookings b
         JOIN trip_logs pickup_log ON b.pickup_log_code = pickup_log.log_code
         WHERE pickup_log.schedule_code = s.schedule_code
           AND b.status = 'COMPLETED') AS boarded_count,
        NVL(s.status, 'ACTIVE') AS status,
        (SELECT TO_CHAR(MIN(expected_timestamp), 'YYYY-MM-DD') 
         FROM trip_logs 
         WHERE schedule_code = s.schedule_code) AS travel_date
      FROM schedules s
      JOIN routes r ON s.route_code = r.route_code
      JOIN vehicles v ON s.vehicle_code = v.vehicle_code
      WHERE s.driver_code = :driver_code
      ORDER BY travel_date DESC, s.start_time ASC
    `;
    const result = await connection.execute(query, { driver_code });
    const schedules = result.rows.map(row => ({
      schedule_code: row[0],
      start_time: row[1],
      route_name: row[2],
      capacity: row[3],
      boarded_count: row[4],
      status: row[5],
      travel_date: row[6] // เพิ่มวันที่ในการส่งค่า
    }));
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: "Error fetching schedules", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// 2. ดึงรายชื่อผู้โดยสารในรอบรถที่เลือก 
app.get("/api/driver/passengers", async (req, res) => {
  const { schedule_code } = req.query;
  let connection;
  try {
    connection = await getConnection();
    const query = `
      SELECT b.booking_code, u.first_name || ' ' || u.last_name AS passenger_name, sp.stop_name AS pickup_station, sd.stop_name AS dropoff_station, b.status
      FROM bookings b
      JOIN users u ON b.user_code = u.user_code
      JOIN trip_logs tp ON b.pickup_log_code = tp.log_code
      JOIN stations sp ON tp.stop_code = sp.stop_code
      JOIN trip_logs td ON b.dropoff_log_code = td.log_code
      JOIN stations sd ON td.stop_code = sd.stop_code
      WHERE tp.schedule_code = :schedule_code AND TRUNC(b.travel_date) = TRUNC(SYSDATE)
      ORDER BY tp.expected_timestamp ASC
    `;
    const result = await connection.execute(query, { schedule_code });
    const passengers = result.rows.map(row => ({
      booking_code: row[0], passenger_name: row[1], pickup_station: row[2], dropoff_station: row[3], status: row[4]
    }));
    res.json(passengers);
  } catch (error) {
    res.status(500).json({ message: "Error fetching passengers", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});
// ==========================================
// API 1: ดึงข้อมูลจุดจอด (เพิ่ม DEPART_TIMESTAMP)
// ==========================================
app.get("/api/driver/trip-logs", async (req, res) => {
  const { schedule_code } = req.query;
  let connection;
  try {
    connection = await getConnection();
    const query = `
      SELECT t.log_code, s.stop_name, 
             TO_CHAR(t.expected_timestamp, 'HH24:MI:SS') AS expected_time, 
             TO_CHAR(t.actual_timestamp, 'HH24:MI:SS') AS actual_time,
             TO_CHAR(t.depart_timestamp, 'HH24:MI:SS') AS depart_time
      FROM trip_logs t JOIN stations s ON t.stop_code = s.stop_code 
      WHERE t.schedule_code = :schedule_code ORDER BY t.expected_timestamp ASC
    `;
    const result = await connection.execute(query, { schedule_code });
    res.json(result.rows.map(row => ({ 
      log_code: row[0], stop_name: row[1], expected_time: row[2], actual_time: row[3], depart_time: row[4] 
    })));
  } catch (error) {
    res.status(500).json({ message: "Error fetching trip logs", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==========================================
// API 2: กดยืนยันว่า "ถึงป้าย" (Arrive)
// ==========================================
app.put("/api/driver/trip-logs/:log_code/arrive", async (req, res) => {
  const { log_code } = req.params;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(`UPDATE trip_logs SET actual_timestamp = SYSTIMESTAMP WHERE log_code = :log_code`, { log_code }, { autoCommit: false });

    const schRes = await connection.execute(`SELECT schedule_code FROM trip_logs WHERE log_code = :log_code`, { log_code });
    if (schRes.rows.length > 0) {
      const scheduleCode = schRes.rows[0][0];
      const checkNulls = await connection.execute(`SELECT COUNT(*) FROM trip_logs WHERE schedule_code = :1 AND actual_timestamp IS NULL`, [scheduleCode]);
      if (parseInt(checkNulls.rows[0][0]) === 0) {
        // ถ้าเป็นป้ายสุดท้าย ให้จบงานและเซ็ตเวลาออกรถให้ด้วยเลย
        await connection.execute(`UPDATE schedules SET status = 'COMPLETED' WHERE schedule_code = :1`, [scheduleCode], { autoCommit: false });
        await connection.execute(`UPDATE trip_logs SET depart_timestamp = SYSTIMESTAMP WHERE log_code = :log_code`, { log_code }, { autoCommit: false });
      }
    }
    await connection.commit();
    res.json({ message: "อัปเดตเวลาถึงป้ายสำเร็จ" });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Error updating trip log", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==========================================
// API 3: กดยืนยันว่า "ออกรถจากป้าย" (Depart) + ตัด No Show
// ==========================================
app.put("/api/driver/trip-logs/:log_code/depart", async (req, res) => {
  const { log_code } = req.params;
  let connection;
  try {
    connection = await getConnection();
    
    // 1. เซ็ตเวลาออกรถ
    await connection.execute(`UPDATE trip_logs SET depart_timestamp = SYSTIMESTAMP WHERE log_code = :log_code`, { log_code }, { autoCommit: false });

    // 2. [ตัด No-Show ทันที] ใครจองขึ้นป้ายนี้ แล้วยังไม่สแกนตั๋ว ตัดทิ้งคืนที่นั่ง!
    await connection.execute(`
      UPDATE bookings 
      SET status = 'NO_SHOW' 
      WHERE status = 'ACTIVE' AND pickup_log_code = :log_code
    `, { log_code }, { autoCommit: false });

    await connection.commit();
    res.json({ message: "ออกจากป้ายและกวาดล้างที่นั่งสำเร็จ" });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "Error departing trip log", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// 4. อัปเดตเวลาเมื่อรถเดินทางถึงจุดจอดจริง (แก้ไขให้นับค่า NULL ชัวร์ 100%)
app.put("/api/driver/trip-logs/:log_code/arrive", async (req, res) => {
  const { log_code } = req.params;
  let connection;
  try {
    connection = await getConnection();
    
    // 1. อัปเดตเวลาถึงป้าย
    await connection.execute(
      `UPDATE trip_logs SET actual_timestamp = SYSTIMESTAMP WHERE log_code = :log_code`,
      { log_code },
      { autoCommit: false }
    );

    // 2. หารหัสรอบรถ (schedule_code) จาก log_code นี้
    const schRes = await connection.execute(
      `SELECT schedule_code FROM trip_logs WHERE log_code = :log_code`,
      { log_code }
    );
    
    if (schRes.rows.length > 0) {
      const scheduleCode = schRes.rows[0][0];

      // 3. ใช้ SQL นับว่ารอบรถนี้ เหลือป้ายที่ยังไม่ได้ลงเวลา (NULL) อีกกี่ป้าย
      const checkNulls = await connection.execute(
        `SELECT COUNT(*) FROM trip_logs WHERE schedule_code = :1 AND actual_timestamp IS NULL`,
        [scheduleCode]
      );
      
      const remainingStops = parseInt(checkNulls.rows[0][0]);

      // 4. ถ้าไม่เหลือป้ายที่เวลาเป็น NULL แล้ว (0 ป้าย) = สิ้นสุดการเดินรถ
      if (remainingStops === 0) {
        await connection.execute(
          `UPDATE schedules SET status = 'COMPLETED' WHERE schedule_code = :1`,
          [scheduleCode],
          { autoCommit: false }
        );
      }
    }

    await connection.commit();
    res.json({ message: "อัปเดตเวลาถึงป้ายสำเร็จ" });
  } catch (error) {
    if (connection) await connection.rollback();
    console.error("Update Arrive Error:", error);
    res.status(500).json({ message: "Error updating trip log", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.put("/api/bookings/:booking_code/status", async (req, res) => {
  const { booking_code } = req.params;
  const { status } = req.body;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(`UPDATE bookings SET status = :status WHERE booking_code = :booking_code`, { status, booking_code }, { autoCommit: true });
    res.json({ message: "Status updated successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error updating status", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.post("/api/driver/check-in", async (req, res) => {
  const { qr_code, schedule_code } = req.body;
  if (!qr_code || !schedule_code) return res.status(400).json({ message: "กรุณาระบุ QR Code และรอบรถ" });

  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT b.booking_code, u.first_name || ' ' || u.last_name, b.status, tp.schedule_code
       FROM bookings b
       JOIN users u ON b.user_code = u.user_code
       JOIN trip_logs tp ON b.pickup_log_code = tp.log_code
       WHERE b.qr_code = :qr_code AND TRUNC(b.travel_date) = TRUNC(SYSDATE)`,
      { qr_code }
    );

    if (result.rows.length === 0) return res.status(404).json({ message: "ไม่พบตั๋ว QR นี้สำหรับการเดินทางวันนี้" });

    const [bookingCode, passengerName, status, bookingSchedule] = result.rows[0];
    if (bookingSchedule !== schedule_code) return res.status(409).json({ message: "ตั๋วนี้เป็นของรอบรถอื่น" });
    if (status !== "ACTIVE") return res.status(409).json({ message: "ตั๋วนี้ถูกใช้แล้วหรือถูกยกเลิก" });

    const updateResult = await connection.execute(
      `UPDATE bookings SET status = 'COMPLETED' WHERE booking_code = :booking_code AND qr_code = :qr_code AND status = 'ACTIVE' AND TRUNC(travel_date) = TRUNC(SYSDATE)`,
      { booking_code: bookingCode, qr_code },
      { autoCommit: true }
    );

    if (updateResult.rowsAffected !== 1) return res.status(409).json({ message: "ตั๋วนี้ถูกเช็คอินไปแล้ว" });

    res.json({ booking_code: bookingCode, passenger_name: passengerName, status: "COMPLETED" });
  } catch (error) {
    console.error("Driver check-in error:", error);
    res.status(500).json({ message: "ไม่สามารถบันทึกการเช็คอินได้", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// ==========================================
// Booking API (สำหรับผู้โดยสารจองตั๋ว)
// ==========================================

app.get('/api/booking/routes', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT route_code, route_name FROM routes ORDER BY route_code`);
    const routes = result.rows.map((row) => ({ route_code: row[0], route_name: row[1] }));
    res.json(routes);
  } catch (error) {
    res.status(500).json({ message: "Cannot get routes", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

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
    const stops = result.rows.map((row) => ({ stop_code: row[0], stop_name: row[1], stop_order: row[2] }));
    res.json(stops);
  } catch (error) {
    res.status(500).json({ message: "Cannot get stops", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.get('/api/booking/schedules/:routeCode', async (req, res) => {
  let connection;
  try {
    const { routeCode } = req.params;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT schedule_code, start_time FROM schedules WHERE route_code = :routeCode ORDER BY start_time`,
      { routeCode }
    );
    const schedules = result.rows.map((row) => ({ schedule_code: row[0], start_time: row[1] }));
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: "Cannot get schedules", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});
app.post('/api/bookings/create', async (req, res) => {
    const { user_code, schedule_code, pickup_order, dropoff_order, passenger_count, travel_date } = req.body;
    let connection;
    try {
        connection = await getConnection();

        // กวาดล้างที่นั่งก่อนการตรวจสอบโควต้า (Auto No-Show ตัดจาก DEPART_TIMESTAMP)
        await connection.execute(`
          UPDATE bookings
          SET status = 'NO_SHOW'
          WHERE status = 'ACTIVE' AND pickup_log_code IN (
              SELECT log_code FROM trip_logs WHERE depart_timestamp IS NOT NULL
              UNION SELECT tl.log_code FROM trip_logs tl JOIN schedules s ON tl.schedule_code = s.schedule_code WHERE s.status = 'COMPLETED'
          )
        `, [], { autoCommit: true });

        const checkActiveSeats = await connection.execute(`SELECT NVL(SUM(passenger_count), 0) AS total_active FROM bookings WHERE user_code = :user_code AND status = 'ACTIVE'`, { user_code });
        const currentActiveSeats = checkActiveSeats.rows[0][0];

        if (currentActiveSeats + passenger_count > 4) {
            return res.status(400).json({ message: `โควต้าเต็ม! คุณมีรายการจองค้างอยู่ ${currentActiveSeats} ที่นั่ง สามารถจองเพิ่มได้อีกแค่ ${4 - currentActiveSeats} ที่นั่งเท่านั้น` });
        }

        const logResult = await connection.execute(
            `WITH OrderedLogs AS (SELECT log_code, ROW_NUMBER() OVER (ORDER BY expected_timestamp ASC) as stop_order FROM trip_logs WHERE schedule_code = :schedule_code)
             SELECT log_code, stop_order FROM OrderedLogs WHERE stop_order IN (:pickup, :dropoff)`,
            { schedule_code, pickup: pickup_order, dropoff: dropoff_order }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );

        const pickupLog = logResult.rows.find(row => row.STOP_ORDER === parseInt(pickup_order));
        const dropoffLog = logResult.rows.find(row => row.STOP_ORDER === parseInt(dropoff_order));
        if (!pickupLog || !dropoffLog) return res.status(400).json({ message: 'ไม่พบข้อมูลจุดจอดในรอบการเดินรถนี้' });

        const bookingCode = 'BK' + Date.now().toString().slice(-8);
        const qrCode = `QR_${bookingCode}`;
        const targetDate = travel_date ? travel_date : new Date().toISOString().split('T')[0];

        await connection.execute(
            `INSERT INTO bookings (booking_code, user_code, pickup_log_code, dropoff_log_code, passenger_count, travel_date, booking_timestamp, status, qr_code)
             VALUES (:booking_code, :user_code, :pickup_log, :dropoff_log, :count, TO_DATE(:travel_date, 'YYYY-MM-DD'), SYSTIMESTAMP, 'ACTIVE', :qr_code)`,
            { booking_code: bookingCode, user_code: user_code, pickup_log: pickupLog.LOG_CODE, dropoff_log: dropoffLog.LOG_CODE, count: passenger_count, travel_date: targetDate, qr_code: qrCode },
            { autoCommit: true }
        );
        res.status(201).json({ message: 'จองสำเร็จ', booking_code: bookingCode, qr_code: qrCode });
    } catch (err) {
        res.status(500).json({ message: 'Cannot create booking', error: err.message });
    } finally {
        if (connection) await connection.close();
    }
});
app.get('/api/stations', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`SELECT stop_code, stop_name FROM stations ORDER BY stop_name`);
    const stations = result.rows.map(row => ({ stop_code: row[0], stop_name: row[1] }));
    res.json(stations);
  } catch (error) {
    res.status(500).json({ message: "Cannot get stations", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});
// ค้นหารอบรถ และกรองรอบที่เสร็จสิ้นแล้วออก
app.get('/api/booking/search', async (req, res) => {
  const { pickup_code, dropoff_code, travel_date } = req.query;
  let connection;
  try {
    connection = await getConnection();

    // กวาดล้างที่นั่งก่อนการค้นหา (Auto No-Show ตัดจาก DEPART_TIMESTAMP)
    await connection.execute(`
      UPDATE bookings
      SET status = 'NO_SHOW'
      WHERE status = 'ACTIVE' AND pickup_log_code IN (
          SELECT log_code FROM trip_logs WHERE depart_timestamp IS NOT NULL
          UNION SELECT tl.log_code FROM trip_logs tl JOIN schedules s ON tl.schedule_code = s.schedule_code WHERE s.status = 'COMPLETED'
      )
    `, [], { autoCommit: true });

    const query = `
      WITH OrderedLogs AS (
          SELECT log_code, schedule_code, stop_code, expected_timestamp, ROW_NUMBER() OVER (PARTITION BY schedule_code ORDER BY expected_timestamp ASC) as stop_order
          FROM trip_logs
      ),
      MatchingSchedules AS (
          SELECT p.schedule_code, p.log_code as pickup_log_code, p.stop_order as pickup_order, p.expected_timestamp as pickup_time,
                 d.log_code as dropoff_log_code, d.stop_order as dropoff_order, d.expected_timestamp as dropoff_time
          FROM OrderedLogs p JOIN OrderedLogs d ON p.schedule_code = d.schedule_code JOIN schedules sch ON p.schedule_code = sch.schedule_code
          WHERE p.stop_code = :pickup_code AND d.stop_code = :dropoff_code AND p.stop_order < d.stop_order 
            AND TRUNC(p.expected_timestamp) = TO_DATE(:travel_date, 'YYYY-MM-DD') AND p.expected_timestamp > (SYSTIMESTAMP + INTERVAL '20' MINUTE)
            AND NVL(sch.status, 'ACTIVE') != 'COMPLETED'
      ),
      BookingOrders AS (
          SELECT b.booking_code, b.passenger_count, p.schedule_code, p.stop_order as p_order, d.stop_order as d_order
          FROM bookings b JOIN OrderedLogs p ON b.pickup_log_code = p.log_code JOIN OrderedLogs d ON b.dropoff_log_code = d.log_code
          WHERE b.status IN ('ACTIVE', 'COMPLETED') AND TRUNC(b.travel_date) = TO_DATE(:travel_date, 'YYYY-MM-DD')
      ),
      ScheduleUsage AS (
          SELECT ms.schedule_code, ms.pickup_time, ms.dropoff_time, ms.pickup_order, ms.dropoff_order, s.start_time, r.route_code, r.route_name, v.capacity,
              NVL((SELECT MAX(passengers_on_board) FROM (SELECT segments.check_order, NVL(SUM(bo.passenger_count), 0) as passengers_on_board FROM (SELECT ms.pickup_order + LEVEL - 1 AS check_order FROM DUAL CONNECT BY LEVEL <= (ms.dropoff_order - ms.pickup_order)) segments LEFT JOIN BookingOrders bo ON bo.schedule_code = ms.schedule_code AND bo.p_order <= segments.check_order AND bo.d_order > segments.check_order GROUP BY segments.check_order)), 0) AS max_used_seats
          FROM MatchingSchedules ms JOIN schedules s ON ms.schedule_code = s.schedule_code JOIN routes r ON s.route_code = r.route_code JOIN vehicles v ON s.vehicle_code = v.vehicle_code
      )
      SELECT schedule_code, route_code, route_name, TO_CHAR(pickup_time, 'HH24:MI') as expected_pickup_time, TO_CHAR(dropoff_time, 'HH24:MI') as expected_dropoff_time, capacity, max_used_seats, (capacity - max_used_seats) AS available_seats, pickup_order, dropoff_order 
      FROM ScheduleUsage ORDER BY pickup_time ASC
    `;
    const result = await connection.execute(query, { pickup_code, dropoff_code, travel_date });
    res.json(result.rows.map(row => ({
      schedule_code: row[0], route_code: row[1], route_name: row[2], expected_pickup_time: row[3], expected_dropoff_time: row[4], total_capacity: row[5], used_seats: row[6], available_seats: row[7], pickup_order: row[8], dropoff_order: row[9]
    })));
  } catch (error) {
    res.status(500).json({ message: "Error searching schedules", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});
app.get('/api/user/bookings/:userCode', async (req, res) => {
  let connection;
  try {
    const { userCode } = req.params;
    connection = await getConnection();

    // กวาดล้างที่นั่งก่อนส่งตั๋วให้หน้าเว็บ (Auto No-Show ตัดจาก DEPART_TIMESTAMP)
    await connection.execute(`
      UPDATE bookings
      SET status = 'NO_SHOW'
      WHERE status = 'ACTIVE' AND pickup_log_code IN (
          SELECT log_code FROM trip_logs WHERE depart_timestamp IS NOT NULL
          UNION SELECT tl.log_code FROM trip_logs tl JOIN schedules s ON tl.schedule_code = s.schedule_code WHERE s.status = 'COMPLETED'
      )
    `, [], { autoCommit: true });

    const query = `
      SELECT b.booking_code, TO_CHAR(b.travel_date, 'YYYY-MM-DD') as travel_date, b.passenger_count, b.status, b.qr_code, s.start_time, r.route_name, sp.stop_name as pickup_name, sd.stop_name as dropoff_name
      FROM bookings b JOIN trip_logs tp ON b.pickup_log_code = tp.log_code JOIN stations sp ON tp.stop_code = sp.stop_code JOIN trip_logs td ON b.dropoff_log_code = td.log_code JOIN stations sd ON td.stop_code = sd.stop_code JOIN schedules s ON tp.schedule_code = s.schedule_code JOIN routes r ON s.route_code = r.route_code
      WHERE b.user_code = :userCode ORDER BY b.booking_timestamp DESC
    `;
    const result = await connection.execute(query, { userCode });
    res.json(result.rows.map(row => ({ booking_code: row[0], travel_date: row[1], passenger_count: row[2], status: row[3], qr_code: row[4], start_time: row[5], route_name: row[6], pickup_name: row[7], dropoff_name: row[8] })));
  } catch (error) {
    res.status(500).json({ message: "Error fetching user bookings", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.put('/api/bookings/:bookingCode/cancel', async (req, res) => {
  let connection;
  try {
    const { bookingCode } = req.params;
    connection = await getConnection();
    const checkStatus = await connection.execute(`SELECT status FROM bookings WHERE booking_code = :bookingCode`, { bookingCode });
    if (checkStatus.rows.length === 0) return res.status(404).json({ message: "ไม่พบข้อมูลการจอง" });
    if (checkStatus.rows[0][0] !== 'ACTIVE') return res.status(400).json({ message: "ไม่สามารถยกเลิกรายการนี้ได้ เนื่องจากสถานะไม่ใช่ ACTIVE" });

    await connection.execute(`UPDATE bookings SET status = 'CANCELLED' WHERE booking_code = :bookingCode`, { bookingCode }, { autoCommit: true });
    res.json({ message: "ยกเลิกการจองสำเร็จ ที่นั่งถูกคืนเข้าสู่ระบบแล้ว" });
  } catch (error) {
    res.status(500).json({ message: "Error canceling booking", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

// =========================================================================
// [ API ฝั่งผู้ดูแลระบบ (Admin) ]
// =========================================================================

app.get('/api/admin/master-data', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const routesRes = await connection.execute(`SELECT route_code, route_name FROM routes ORDER BY route_code`);
    const routes = routesRes.rows.map(r => ({ route_code: r[0], route_name: r[1] }));

    const driversRes = await connection.execute(`SELECT user_code, first_name || ' ' || last_name FROM users WHERE role_code IN ('R02', 'EMP') ORDER BY user_code`);
    const drivers = driversRes.rows.map(d => ({ driver_code: d[0], driver_name: d[1] }));

    const vehiclesRes = await connection.execute(`
      SELECT v.vehicle_code, v.capacity, v.license_plate, t.type_name 
      FROM vehicles v LEFT JOIN vehicle_types t ON v.type_code = t.type_code ORDER BY v.vehicle_code
    `);
    const vehicles = vehiclesRes.rows.map(v => ({ vehicle_code: v[0], capacity: v[1], license_plate: v[2], type_name: v[3] }));

    const vTypesRes = await connection.execute(`SELECT type_code, type_name FROM vehicle_types ORDER BY type_code`);
    const vehicle_types = vTypesRes.rows.map(t => ({ type_code: t[0], type_name: t[1] }));

    res.json({ routes, drivers, vehicles, vehicle_types });
  } catch (error) {
    res.status(500).json({ message: "Error fetching master data", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.get('/api/admin/routes/:routeCode/details', async (req, res) => {
  let connection;
  try {
    const { routeCode } = req.params;
    connection = await getConnection();
    const result = await connection.execute(
      `SELECT rd.stop_order, rd.stop_code, s.stop_name, rd.avg_travel_minutes 
       FROM route_details rd JOIN stations s ON rd.stop_code = s.stop_code
       WHERE rd.route_code = :routeCode ORDER BY rd.stop_order`,
      { routeCode }
    );
    const details = result.rows.map(row => ({ stop_order: row[0], stop_code: row[1], stop_name: row[2], avg_travel_minutes: row[3] }));
    res.json(details);
  } catch (err) {
    res.status(500).json({ message: "Error", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.post('/api/admin/schedules/create', async (req, res) => {
  const { route_code, vehicle_code, driver_code, start_time, travel_date } = req.body;
  let connection;
  try {
    connection = await getConnection();
    const maxRes = await connection.execute(`SELECT schedule_code FROM schedules WHERE schedule_code LIKE 'SCH_%'`);
    let maxNum = 0;
    maxRes.rows.forEach(row => {
      const num = parseInt(row[0].replace('SCH_', ''), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    });
    const schedule_code = `SCH_${String(maxNum + 1).padStart(2, '0')}`;

    await connection.execute(
      `INSERT INTO schedules (schedule_code, route_code, vehicle_code, driver_code, start_time) VALUES (:1, :2, :3, :4, :5)`,
      [schedule_code, route_code, vehicle_code, driver_code, start_time], { autoCommit: false }
    );

    const routeRes = await connection.execute(`SELECT stop_code, avg_travel_minutes FROM route_details WHERE route_code = :1 ORDER BY stop_order`, [route_code]);
    let cumulativeMinutes = 0;
    const baseDate = new Date(`${travel_date}T${start_time}:00`);

    for (let i = 0; i < routeRes.rows.length; i++) {
      const stop_code = routeRes.rows[i][0];
      const avg_minutes = routeRes.rows[i][1] || 0;
      cumulativeMinutes += avg_minutes;
      const expectedTime = new Date(baseDate.getTime() + cumulativeMinutes * 60000);
      const exp_time_str = expectedTime.toISOString().replace('T', ' ').substring(0, 19);
      const log_code = `TL_${schedule_code}_${i+1}`;

      await connection.execute(
        `INSERT INTO trip_logs (log_code, schedule_code, stop_code, expected_timestamp) VALUES (:1, :2, :3, TO_TIMESTAMP(:4, 'YYYY-MM-DD HH24:MI:SS'))`,
        [log_code, schedule_code, stop_code, exp_time_str], { autoCommit: false }
      );
    }
    await connection.commit();
    res.status(201).json({ message: "สร้างรอบรถรหัส " + schedule_code + " เรียบร้อยแล้ว!" });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "ไม่สามารถสร้างรอบรถได้", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.get('/api/admin/schedules', async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(`
      SELECT s.schedule_code, r.route_name, s.start_time, v.vehicle_code, u.first_name,
        (SELECT TO_CHAR(MIN(expected_timestamp), 'YYYY-MM-DD') FROM trip_logs WHERE schedule_code = s.schedule_code) as travel_date, s.driver_code
      FROM schedules s JOIN routes r ON s.route_code = r.route_code JOIN vehicles v ON s.vehicle_code = v.vehicle_code LEFT JOIN users u ON s.driver_code = u.user_code ORDER BY s.schedule_code ASC
    `);
    const schedules = result.rows.map(row => ({
      schedule_code: row[0], route_name: row[1], start_time: row[2], vehicle_code: row[3], driver_name: row[4], travel_date: row[5], driver_code: row[6]
    }));
    res.json(schedules);
  } catch (error) {
    res.status(500).json({ message: "Error fetching schedules", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.put('/api/admin/schedules/:code', async (req, res) => {
  const { code } = req.params;
  const { vehicle_code, driver_code } = req.body;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(`UPDATE schedules SET vehicle_code = :1, driver_code = :2 WHERE schedule_code = :3`, [vehicle_code, driver_code, code], { autoCommit: true });
    res.json({ message: "อัปเดตข้อมูลรอบรถสำเร็จ" });
  } catch (err) {
    res.status(500).json({ message: "ไม่สามารถอัปเดตได้", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete('/api/admin/schedules/:code', async (req, res) => {
  const { code } = req.params;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(`DELETE FROM trip_logs WHERE schedule_code = :1`, [code], { autoCommit: false });
    await connection.execute(`DELETE FROM schedules WHERE schedule_code = :1`, [code], { autoCommit: false });
    await connection.commit();
    res.json({ message: "ลบรอบรถเรียบร้อยแล้ว" });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "ไม่สามารถลบรอบรถได้", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.post('/api/admin/vehicles', async (req, res) => {
  const { vehicle_code, type_code, license_plate, capacity } = req.body;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO vehicles (vehicle_code, type_code, license_plate, capacity) VALUES (:1, :2, :3, :4)`, 
      [vehicle_code, type_code, license_plate, parseInt(capacity)], { autoCommit: true }
    );
    res.status(201).json({ message: "เพิ่มยานพาหนะสำเร็จ" });
  } catch (err) {
    res.status(500).json({ message: "รหัสยานพาหนะอาจซ้ำกัน", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete('/api/admin/vehicles/:code', async (req, res) => {
  const { code } = req.params;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(`DELETE FROM vehicles WHERE vehicle_code = :1`, [code], { autoCommit: true });
    res.json({ message: "ลบยานพาหนะสำเร็จ" });
  } catch (err) {
    res.status(500).json({ message: "ไม่สามารถลบได้ อาจถูกใช้งานอยู่", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.put('/api/admin/routes/:code/details', async (req, res) => {
  const { code } = req.params;
  const { route_name, details } = req.body;
  let connection;
  try {
    connection = await getConnection();
    const check = await connection.execute(`SELECT 1 FROM routes WHERE route_code = :1`, [code]);
    if (check.rows.length === 0) {
      await connection.execute(`INSERT INTO routes (route_code, route_name) VALUES (:1, :2)`, [code, route_name], { autoCommit: false });
    } else {
      await connection.execute(`UPDATE routes SET route_name = :1 WHERE route_code = :2`, [route_name, code], { autoCommit: false });
    }

    await connection.execute(`DELETE FROM route_details WHERE route_code = :1`, [code], { autoCommit: false });
    for (let i = 0; i < details.length; i++) {
      const stop = details[i];
      await connection.execute(
        `INSERT INTO route_details (route_code, stop_code, stop_order, avg_travel_minutes) VALUES (:1, :2, :3, :4)`,
        [code, stop.stop_code, i + 1, parseInt(stop.avg_travel_minutes) || 0], { autoCommit: false }
      );
    }
    await connection.commit();
    res.json({ message: "บันทึกเส้นทางและป้ายจอดสำเร็จ!" });
  } catch (err) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "ไม่สามารถบันทึกเส้นทางได้", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete('/api/admin/routes/:code', async (req, res) => {
  const { code } = req.params;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(`DELETE FROM route_details WHERE route_code = :1`, [code], { autoCommit: false });
    await connection.execute(`DELETE FROM routes WHERE route_code = :1`, [code], { autoCommit: false });
    await connection.commit();
    res.json({ message: "ลบเส้นทางเรียบร้อยแล้ว" });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "ไม่สามารถลบเส้นทางได้", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.post('/api/admin/stations', async (req, res) => {
  const { stop_code, stop_name } = req.body;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(`INSERT INTO stations (stop_code, stop_name) VALUES (:1, :2)`, [stop_code, stop_name], { autoCommit: true });
    res.status(201).json({ message: "เพิ่มจุดจอดสำเร็จ" });
  } catch (err) {
    res.status(500).json({ message: "รหัสจุดจอดอาจซ้ำกัน", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.put('/api/admin/stations/:code', async (req, res) => {
  const { code } = req.params;
  const { stop_name } = req.body;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(`UPDATE stations SET stop_name = :1 WHERE stop_code = :2`, [stop_name, code], { autoCommit: true });
    res.json({ message: "อัปเดตจุดจอดสำเร็จ" });
  } catch (err) {
    res.status(500).json({ message: "ไม่สามารถอัปเดตได้", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete('/api/admin/stations/:code', async (req, res) => {
  const { code } = req.params;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(`DELETE FROM stations WHERE stop_code = :1`, [code], { autoCommit: true });
    res.json({ message: "ลบจุดจอดสำเร็จ" });
  } catch (err) {
    res.status(500).json({ message: "ไม่สามารถลบได้ อาจมีเส้นทางใช้งานป้ายนี้อยู่", error: err.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.post("/api/screens", async (req, res) => {
  const { screen_code, screen_name } = req.body;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `INSERT INTO screens (screen_code, screen_name) VALUES (:1, :2)`,
      [screen_code, screen_name],
      { autoCommit: true }
    );
    res.status(201).json({ message: "เพิ่มหน้าจอเรียบร้อยแล้ว" });
  } catch (error) {
    res.status(500).json({ message: "เกิดข้อผิดพลาดในการสร้างหน้าจอ", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.put("/api/screens/:code", async (req, res) => {
  const { code } = req.params;
  const { screen_name } = req.body;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(
      `UPDATE screens SET screen_name = :1 WHERE screen_code = :2`,
      [screen_name, code],
      { autoCommit: true }
    );
    res.json({ message: "แก้ไขชื่อหน้าจอสำเร็จ" });
  } catch (error) {
    res.status(500).json({ message: "ไม่สามารถแก้ไขหน้าจอได้", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

app.delete("/api/screens/:code", async (req, res) => {
  const { code } = req.params;
  let connection;
  try {
    connection = await getConnection();
    await connection.execute(`DELETE FROM role_permissions WHERE screen_code = :1`, [code], { autoCommit: false });
    await connection.execute(`DELETE FROM screens WHERE screen_code = :1`, [code], { autoCommit: true });
    res.json({ message: "ลบหน้าจอเรียบร้อยแล้ว" });
  } catch (error) {
    if (connection) await connection.rollback();
    res.status(500).json({ message: "ไม่สามารถลบหน้าจอได้", error: error.message });
  } finally {
    if (connection) await connection.close();
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});