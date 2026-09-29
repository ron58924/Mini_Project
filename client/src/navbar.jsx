import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  Bus, 
  User, 
  LogOut, 
  LogIn 
} from "lucide-react";
import "./navbar.css";

function Navbar() {
  const navigate = useNavigate();

  // ดึงข้อมูลผู้ใช้งานจาก LocalStorage
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const allowedScreens = user?.allowedScreens || [];

  // เช็คสิทธิ์ตาม SCREEN_CODE
 const canAccessReportPage   = allowedScreens.includes("S01");
  const canAccessDriverPage   = allowedScreens.includes("S02");
  const canAccessBookingPage  = allowedScreens.includes("S03");
  const canAccessEmp          = allowedScreens.includes("S04");
  const canAccessPas          = allowedScreens.includes("S05");
  const canAccessPermission   = allowedScreens.includes("S06");
  
  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary px-3">
      
      {/* Brand Logo: เปลี่ยนเป็น div เพื่อโชว์เฉยๆ ไม่มีฟังก์ชันกดเปลี่ยนหน้า */}
      <div className="navbar-brand navbar-brand-stacked d-flex align-items-center gap-2" style={{ cursor: "default" }}>
        <Bus size={28} className="text-white" />
        <div>
          <span className="navbar-brand-mut">MUT</span>
          <span className="navbar-brand-sub">Shuttle Bus</span>
        </div>
      </div>

      {/* Hamburger Menu สำหรับ Mobile */}
      <button
        className="navbar-toggler"
        type="button"
        data-bs-toggle="collapse"
        data-bs-target="#navbarContent"
        aria-controls="navbarContent"
        aria-expanded="false"
        aria-label="Toggle navigation"
      >
        <span className="navbar-toggler-icon"></span>
      </button>

      <div className="collapse navbar-collapse" id="navbarContent">
        <ul className="navbar-nav me-auto align-items-lg-center">
          
          {canAccessReportPage && (
            <li className="nav-item">
              <Link className="nav-link" to="/report">
                Report
              </Link>
            </li>
          )}

          {canAccessDriverPage && (
            <li className="nav-item">
              <Link className="nav-link" to="/driver">
                Driver
              </Link>
            </li>
          )}

          {canAccessBookingPage && (
            <li className="nav-item">
              <Link className="nav-link" to="/booking">
                Booking
              </Link>
            </li>
          )}

          {canAccessEmp && (
            <li className="nav-item">
              <Link className="nav-link" to="/employee">
                Employee
              </Link>
            </li>
          )}

          {canAccessPas && (
            <li className="nav-item">
              <Link className="nav-link" to="/passenger">
                Passenger
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

        {/* ส่วนแสดงข้อมูลผู้ใช้ / Login / Logout */}
        <div className="d-flex align-items-center text-white gap-2">
          {user ? (
            <>
              <div className="d-flex align-items-center gap-2 me-2">
                <User size={20} className="text-white-50" />
                <span className="user-label">
                  ผู้ใช้งาน:
                  <br />
                  <strong>{user.first_name}</strong>
                </span>
              </div>
              <button
                className="btn btn-outline-light btn-sm d-flex align-items-center gap-1"
                onClick={handleLogout}
              >
                <LogOut size={16} />
                <span>Logout</span>
              </button>
            </>
          ) : (
            <Link className="btn btn-primary btn-sm d-flex align-items-center gap-1" to="/login">
              <LogIn size={16} />
              <span>Login</span>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

// นี่คือบรรทัดที่ทำให้ไฟล์อื่นนำไปใช้งานได้ครับ
export default Navbar;