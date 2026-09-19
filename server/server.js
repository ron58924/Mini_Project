const express = require("express");
const cors = require("cors");
const oracledb = require("oracledb");
const bcrypt = require("bcryptjs");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// =====================================================
// Oracle Database Configuration
// =====================================================
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  connectString: `${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_SERVICE}`,
};

// =====================================================
// Get Oracle Connection
// =====================================================
async function getConnection() {
  try {
    const connection = await oracledb.getConnection(dbConfig);
    return connection;
  } catch (error) {
    console.error("Oracle Connection Error:");
    console.error(error);
    throw error;
  }
}

// =====================================================
// Auto Generate Employee ID (EMP69001)
// =====================================================
async function generateEmpId(connection) {
  const currentYear = new Date().getFullYear();
  const buddhistYear = currentYear + 543;
  const yearCode = String(buddhistYear).slice(-2);

  const result = await connection.execute(
    `
SELECT MAX(EMPID) AS MAXID
FROM MUTEMP
WHERE EMPID LIKE :prefix
`,
    {
      prefix: `EMP${yearCode}%`,
    },
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
// Auto Generate Customer ID (CUS69001)
// =====================================================
async function generateCusId(connection) {
  const currentYear = new Date().getFullYear();
  const buddhistYear = currentYear + 543;
  const yearCode = String(buddhistYear).slice(-2);

  const result = await connection.execute(
    `
SELECT MAX(CUSID) AS MAXID
FROM MUTCOUSTOMER
WHERE CUSID LIKE :prefix
`,
    {
      prefix: `CUS${yearCode}%`,
    },
  );

  let runningNumber = 1;
  if (result.rows[0][0]) {
    const maxId = result.rows[0][0];
    const lastNumber = parseInt(maxId.substring(5), 10);
    runningNumber = lastNumber + 1;
  }

  const runningCode = String(runningNumber).padStart(3, "0");
  return `CUS${yearCode}${runningCode}`;
}

// =====================================================
// [EMPLOYEE] GET ALL
// =====================================================
app.get("/api/mutemp", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
SELECT
  EMPID,
  EMPNAME,
  EMPADDRESS,
  EMPEMAIL,
  SALARY
FROM MUTEMP
ORDER BY EMPID
`,
    );
    const employees = result.rows.map((row) => ({
      empId: row[0],
      empname: row[1],
      empaddress: row[2],
      empemail: row[3],
      salary: row[4],
    }));

    res.json(employees);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Cannot get employees",
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// =====================================================
// [EMPLOYEE] GET BY ID
// =====================================================
app.get("/api/mutemp/:id", async (req, res) => {
  let connection;
  try {
    const empId = req.params.id;
    connection = await getConnection();
    const result = await connection.execute(
      `
SELECT
  EMPID,
  EMPNAME,
  EMPADDRESS,
  EMPEMAIL,
  SALARY
FROM MUTEMP
WHERE EMPID = :empId
`,
      { empId },
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Employee not found" });
    }

    const row = result.rows[0];
    res.json({
      empId: row[0],
      empname: row[1],
      empaddress: row[2],
      empemail: row[3],
      salary: row[4],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Cannot get employee",
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// =====================================================
// [EMPLOYEE] CREATE
// =====================================================
app.post("/api/mutemp", async (req, res) => {
  let connection;
  try {
    const { empname, empaddress, empemail, emppassword, salary } = req.body;

    if (!emppassword || emppassword.trim() === "") {
      return res.status(400).json({ message: "Password is required" });
    }

    connection = await getConnection();
    const empId = await generateEmpId(connection);
    const hashedPassword = await bcrypt.hash(emppassword, 10);

    await connection.execute(
      `
INSERT INTO MUTEMP
(EMPID, EMPNAME, EMPADDRESS, EMPEMAIL, EMPPASSWORD, SALARY)
VALUES
(:empId, :empname, :empaddress, :empemail, :emppassword, :salary)
`,
      {
        empId,
        empname,
        empaddress,
        empemail,
        emppassword: hashedPassword,
        salary,
      },
      { autoCommit: true },
    );

    res.status(201).json({
      message: "Employee created successfully",
      empId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Cannot create employee",
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// =====================================================
// [EMPLOYEE] UPDATE
// =====================================================
app.put("/api/mutemp/:id", async (req, res) => {
  let connection;
  try {
    const empId = req.params.id;
    const { empname, empaddress, empemail, emppassword, salary } = req.body;
    connection = await getConnection();

    if (emppassword && emppassword.trim() !== "") {
      const hashedPassword = await bcrypt.hash(emppassword, 10);
      await connection.execute(
        `
UPDATE MUTEMP
SET
  EMPNAME = :empname,
  EMPADDRESS = :empaddress,
  EMPEMAIL = :empemail,
  EMPPASSWORD = :emppassword,
  SALARY = :salary
WHERE EMPID = :empId
`,
        {
          empId,
          empname,
          empaddress,
          empemail,
          emppassword: hashedPassword,
          salary,
        },
        { autoCommit: true },
      );
    } else {
      await connection.execute(
        `
UPDATE MUTEMP
SET
  EMPNAME = :empname,
  EMPADDRESS = :empaddress,
  EMPEMAIL = :empemail,
  SALARY = :salary
WHERE EMPID = :empId
`,
        {
          empId,
          empname,
          empaddress,
          empemail,
          salary,
        },
        { autoCommit: true },
      );
    }

    res.json({ message: "Employee updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Cannot update employee",
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// =====================================================
// [EMPLOYEE] DELETE
// =====================================================
app.delete("/api/mutemp/:id", async (req, res) => {
  let connection;
  try {
    const empId = req.params.id;
    connection = await getConnection();
    await connection.execute(
      `
DELETE FROM MUTEMP
WHERE EMPID = :empId
`,
      { empId },
      { autoCommit: true },
    );

    res.json({ message: "Employee deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Cannot delete employee",
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// =====================================================
// [CUSTOMER] GET ALL
// =====================================================
app.get("/api/mutcustomer", async (req, res) => {
  let connection;
  try {
    connection = await getConnection();
    const result = await connection.execute(
      `
SELECT
  CUSID,
  CUSNAME,
  CUSADDRESS,
  CUSTEL,
  CUSEMAIL
FROM MUTCOUSTOMER
ORDER BY CUSID
`,
    );

    const customers = result.rows.map((row) => ({
      cusId: row[0],
      cusname: row[1],
      cusaddress: row[2],
      custel: row[3],
      cusemail: row[4],
    }));

    res.json(customers);
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Cannot get customers",
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// =====================================================
// [CUSTOMER] GET BY ID
// =====================================================
app.get("/api/mutcustomer/:id", async (req, res) => {
  let connection;
  try {
    const cusId = req.params.id;
    connection = await getConnection();
    const result = await connection.execute(
      `
SELECT
  CUSID,
  CUSNAME,
  CUSADDRESS,
  CUSTEL,
  CUSEMAIL
FROM MUTCOUSTOMER
WHERE CUSID = :cusId
`,
      { cusId },
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ message: "Customer not found" });
    }

    const row = result.rows[0];
    res.json({
      cusId: row[0],
      cusname: row[1],
      cusaddress: row[2],
      custel: row[3],
      cusemail: row[4],
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Cannot get customer",
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// =====================================================
// [CUSTOMER] CREATE
// =====================================================
app.post("/api/mutcustomer", async (req, res) => {
  let connection;
  try {
    const { cusname, cusaddress, custel, cusemail } = req.body;

    connection = await getConnection();
    const cusId = await generateCusId(connection);

    await connection.execute(
      `
INSERT INTO MUTCOUSTOMER
(CUSID, CUSNAME, CUSADDRESS, CUSTEL, CUSEMAIL)
VALUES
(:cusId, :cusname, :cusaddress, :custel, :cusemail)
`,
      {
        cusId,
        cusname: cusname || "",
        cusaddress: cusaddress || "",
        custel: custel || "",
        cusemail: cusemail || "",
      },
      { autoCommit: true },
    );

    res.status(201).json({
      message: "Customer created successfully",
      cusId,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Cannot create customer",
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// =====================================================
// [CUSTOMER] UPDATE
// =====================================================
app.put("/api/mutcustomer/:id", async (req, res) => {
  let connection;
  try {
    const cusId = req.params.id;
    const { cusname, cusaddress, custel, cusemail } = req.body;
    connection = await getConnection();

    await connection.execute(
      `
UPDATE MUTCOUSTOMER
SET
  CUSNAME = :cusname,
  CUSADDRESS = :cusaddress,
  CUSTEL = :custel,
  CUSEMAIL = :cusemail
WHERE CUSID = :cusId
`,
      {
        cusId,
        cusname,
        cusaddress,
        custel,
        cusemail,
      },
      { autoCommit: true },
    );

    res.json({ message: "Customer updated successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Cannot update customer",
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// =====================================================
// [CUSTOMER] DELETE
// =====================================================
app.delete("/api/mutcustomer/:id", async (req, res) => {
  let connection;
  try {
    const cusId = req.params.id;
    connection = await getConnection();

    await connection.execute(
      `
DELETE FROM MUTCOUSTOMER
WHERE CUSID = :cusId
`,
      { cusId },
      { autoCommit: true },
    );

    res.json({ message: "Customer deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Cannot delete customer",
      error: error.message,
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});

// =====================================================
// Start Server
// =====================================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`
========================================
Server running
http://localhost:${PORT}
========================================
`);
});
