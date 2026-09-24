import React, { useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "./Login.css";

// ==========================================
// SVG Icons Components
// ==========================================
function UserIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.8" />
      <path
        d="M4 20c0-3.9 3.6-7 8-7s8 3.1 8 7"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none">
      <rect x="5" y="10" width="14" height="10" rx="2" stroke="currentColor" strokeWidth="1.8" />
      <path d="M8 10V7a4 4 0 018 0v3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.5 5.3A10.6 10.6 0 0112 5c5 0 9 4 10.5 7-.6 1.2-1.5 2.5-2.7 3.6M6.2 6.6C4.1 8 2.5 10 1.5 12c1.5 3 5.5 7 10.5 7 1.2 0 2.4-.2 3.5-.6"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7-10.5-7-10.5-7z"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.8" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
      <path
        d="M6.6 10.8c1.4 2.8 3.8 5.1 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.9 21 3 13.1 3 3.9c0-.6.4-1 1-1h3.4c.6 0 1 .4 1 1 0 1.2.2 2.4.6 3.6.1.4 0 .8-.2 1L6.6 10.8z"
        fill="currentColor"
      />
    </svg>
  );
}

// ==========================================
// Main Login Component
// ==========================================
export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    
    if (!email.trim() || !password.trim()) {
      Swal.fire({
        icon: "warning",
        title: "กรอกข้อมูลไม่ครบ",
        text: "กรุณากรอกอีเมลและรหัสผ่าน",
      });
      return;
    }

    setLoading(true);

    try {
      // ยิง API ด้วย Axios
      const response = await axios.post("http://localhost:5000/api/login", {
        email: email,
        password: password,
      });

      // บันทึกข้อมูล Session
      localStorage.setItem("user", JSON.stringify(response.data.user));

      if (rememberMe) {
        localStorage.setItem("rememberEmail", email);
      } else {
        localStorage.removeItem("rememberEmail");
      }

      await Swal.fire({
        icon: "success",
        title: "เข้าสู่ระบบสำเร็จ",
        timer: 1500,
        showConfirmButton: false,
      });

      navigate("/");
      window.location.reload();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เข้าสู่ระบบไม่สำเร็จ",
        text: error.response?.data?.message || "เกิดข้อผิดพลาดในการเชื่อมต่อ",
      });
    } finally {
      setLoading(false);
    }
  };

  const goToRegister = () => {
    navigate("/register");
  };

  return (
    <main className="login-page">
      <section className="login-card">
        {/* ================= ฝั่งซ้าย Brand ================= */}
        <div className="brand-panel">
          {/* ก้อนสี่เหลี่ยมจัตุรัส Glassmorphic ครบ 12 ชิ้น */}
          <div className="shape shape-1"></div>
          <div className="shape shape-2"></div>
          <div className="shape shape-3"></div>
          <div className="shape shape-4"></div>
          <div className="shape shape-5"></div>
          <div className="shape shape-6"></div>
          <div className="shape shape-7"></div>
          <div className="shape shape-8"></div>
          <div className="shape shape-9"></div>
        
         

          <div className="brand-content">
            <h1 className="brand-title">
              <span className="brand-mut">MUT</span>
              <span className="brand-sub">Shuttle Bus</span>
            </h1>

            <p>
              ระบบจองที่นั่งและบริหารยานพาหนะอัจฉริยะ
              <br />
              มหาวิทยาลัยเทคโนโลยีมหานคร
            </p>
          </div>

          <div className="support-text">
            <PhoneIcon />
            <span>ศูนย์ควบคุมยานพาหนะ: 02-988-3655 ต่อ 1102</span>
          </div>
        </div>

        {/* ================= ฝั่งขวา Form ================= */}
        <div className="login-form-area">
          <h2 className="login-title">เข้าสู่ระบบ (Sign In)</h2>
          <p className="login-subtitle">
            กรอกอีเมลและรหัสผ่านเพื่อเข้าใช้งานระบบ
          </p>

          <form className="login-form" onSubmit={handleLogin} noValidate>
            {/* Email Field */}
            <div className="field-group">
              <div className="label-row">
                <label htmlFor="email">อีเมล (Email)</label>
                <span className="hint-text">อีเมลสถาบัน / ผู้ใช้งาน</span>
              </div>
              <div className="input-with-icon">
                <span className="input-icon">
                  <UserIcon />
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="example@mut.ac.th"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="field-group">
              <div className="label-row">
                <label htmlFor="password">รหัสผ่าน (Password)</label>
              </div>
              <div className="input-with-icon">
                <span className="input-icon">
                  <LockIcon />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-visibility"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label="แสดง/ซ่อนรหัสผ่าน"
                >
                  <EyeIcon open={showPassword} />
                </button>
              </div>
              <button
                type="button"
                className="forgot-link"
                onClick={() =>
                  Swal.fire({
                    icon: "info",
                    title: "ลืมรหัสผ่าน?",
                    text: "กรุณาติดต่อศูนย์ควบคุมยานพาหนะ หรือผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน",
                  })
                }
              >
                ลืมรหัสผ่าน?
              </button>
            </div>

            {/* Options Row */}
            <div className="options-row">
              <label className="checkbox-row">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                />
                <span>จดจำการเข้าสู่ระบบ</span>
              </label>

              <span className="status-row">
                <span className="status-dot" />
                ระบบพร้อมใช้งาน
              </span>
            </div>

            {/* Submit Button */}
            <button type="submit" className="submit-btn" disabled={loading}>
              <span>{loading ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ (Sign In)"}</span>
              <span aria-hidden="true">›</span>
            </button>
          </form>

          <p className="register-link-text">
            ยังไม่มีบัญชีผู้ใช้งาน?{" "}
            <button type="button" onClick={goToRegister}>
              สมัครสมาชิกใหม่ (Register)
            </button>
          </p>
        </div>
      </section>
    </main>
  );
}