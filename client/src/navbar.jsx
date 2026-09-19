import React from "react";

import { Link, Router, Routes, useNavigate } from "react-router-dom";

function Navbar() {
  const navigate = useNavigate();
  const user = JSON.parse(localStorage.getItem("user") || "null");
  const permission = user?.permission || "0000";

  // เช็คสิทธิ์แต่ละตำแหน่ง (index 0 = Emp, 1 = Cus, 2 = Prod, 3 = Rep)
  const canAccessEmp = permission[0] === "1";
  const canAccessCus = permission[1] === "1";
  const canAccessProd = permission[2] === "1";
  const canAccessReport = permission[3] === "1";

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
              <span className="me-3">ผู้ใช้งาน: {user.empname}</span>
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
