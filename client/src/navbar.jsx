import React from "react";
import { Link, useNavigate } from "react-router-dom"; 

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  
  // 1. ดึงข้อมูล allowedScreens ที่เซฟมาจากตอน Login 
  const allowedScreens = user?.allowedScreens || [];

  // 2. เช็คสิทธิ์ตาม SCREEN_CODE จากตารางของคุณ
  // (คุณสามารถแก้รหัส S04, S02, S03 ให้ตรงกับหน้าเว็บจริงๆ ในตาราง screens ได้เลย)
  const canAccessEmp = allowedScreens.includes("S04"); 
  const canAccessCus = allowedScreens.includes("S02"); 
  const canAccessProd = allowedScreens.includes("S03"); 
  const canAccessReport = allowedScreens.includes("S01"); // สมมติให้ S01 คือ Report

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
                Employees
              </Link>
            </li>
          )}
          
          {canAccessCus && (
            <li className="nav-item">
              <Link className="nav-link" to="/customer">
                Customers
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
        </ul>

        <div className="d-flex align-items-center text-white">
          {user ? (
            <>
              {/* 3. แก้จาก empname เป็น first_name ตามคอลัมน์ในตาราง users ใหม่ */}
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