import React from "react";
import { Link, useNavigate } from "react-router-dom"; 

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  
  // 1. ดึงข้อมูล allowedScreens ที่เซฟมาจากตอน Login 
  const allowedScreens = user?.allowedScreens || [];

  // 2. เช็คสิทธิ์ตาม SCREEN_CODE
  const canAccessEmp = allowedScreens.includes("S04"); 
  const canAccessPas = allowedScreens.includes("S02"); 
  const canAccessProd = allowedScreens.includes("S03"); 
  const canAccessReport = allowedScreens.includes("S01");
  // เพิ่มบรรทัดนี้เข้ามา เพื่อเช็คสิทธิ์หน้า Permission
  const canAccessPermission = allowedScreens.includes("S05");

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary px-3">
      <Link className="navbar-brand" to="/">
        ตัวอย่างโปรแกรม อ.ใหญ่
      </Link>
      <div className="collapse navbar-collapse">
        <ul className="navbar-nav me-auto">
          <li className="nav-item">
            <Link className="nav-link" to="/">
              Home
            </Link>
          </li>
          
          {canAccessEmp && (
            <li className="nav-item">
              <Link className="nav-link" to="/employee">
                Employee
              </Link>
            </li>
          )}
          
          {/* เปลี่ยนจาก Customers เป็น Passenger */}
          {canAccessPas && (
            <li className="nav-item">
              <Link className="nav-link" to="/passenger">
                Passenger
              </Link>
            </li>
          )}
          
          {canAccessProd && (
            <li className="nav-item">
              <Link className="nav-link" to="/product">
                Product
              </Link>
            </li>
          )}
          
          {canAccessReport && (
            <li className="nav-item">
              <Link className="nav-link" to="/report">
                Report
              </Link>
            </li>
          )}

          {canAccessPermission && (
            <li className="nav-item">
              <Link className="nav-link" to="/permission">
                Permission
              </Link>
            </li>
          )}
        </ul>

        <div className="d-flex align-items-center text-white">
          {user ? (
            <>
              <span className="me-3">ผู้ใช้งาน: {user.first_name}</span>
              <button
                className="btn btn-outline-light btn-sm"
                onClick={handleLogout}
              >
                Logout
              </button>
            </>
          ) : (
            <Link className="btn btn-primary btn-sm" to="/login">
              Login
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;