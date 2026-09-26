import React from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { 
  Bus, 
  Home, 
  Users, 
  Contact, 
  Package, 
  BarChart3, 
  KeyRound, 
  User, 
  LogOut, 
  LogIn 
} from "lucide-react";
import "./navbar.css";

// รายการเมนูพร้อม SCREEN_CODE และ Icon
const NAV_ITEMS = [
  { code: "S04", label: "Employee", to: "/employee", icon: Users },
  { code: "S02", label: "Passenger", to: "/passenger", icon: Contact },
  { code: "S03", label: "Product", to: "/product", icon: Package },
  { code: "S01", label: "Report", to: "/report", icon: BarChart3 },
  { code: "S05", label: "Permission", to: "/permission", icon: KeyRound },
];

function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // ดึงข้อมูลผู้ใช้งานจาก LocalStorage
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const allowedScreens = user?.allowedScreens || [];

  const handleLogout = () => {
    localStorage.removeItem("user");
    navigate("/login");
  };

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-primary px-3">
      {/* Brand Logo พร้อม ไอคอนรถบัส */}
      <Link className="navbar-brand navbar-brand-stacked d-flex align-items-center gap-2" to="/">
        <Bus size={28} className="text-white" />
        <div>
          <span className="navbar-brand-mut">MUT</span>
          <span className="navbar-brand-sub">Shuttle Bus</span>
        </div>
      </Link>

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
          {/* เมนูหลัก Home */}
          <li className="nav-item">
            <Link
              className={`nav-link-icon ${isActive("/") ? "active-pill" : ""}`}
              to="/"
            >
              <Home size={18} />
              <span>Home</span>
            </Link>
          </li>

          {/* วนลูปเมนูตามสิทธิ์ allowedScreens */}
          {NAV_ITEMS.map(({ code, label, to, icon: Icon }) =>
            allowedScreens.includes(code) ? (
              <li className="nav-item" key={code}>
                <Link
                  className={`nav-link-icon ${isActive(to) ? "active-pill" : ""}`}
                  to={to}
                >
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              </li>
            ) : null
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

export default Navbar;