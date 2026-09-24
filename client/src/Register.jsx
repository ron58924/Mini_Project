import React, { useState } from "react";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "./Register.css";

// ==========================================
// SVG Icons Components
// ==========================================
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
        d="M1.5 12S5.5 5 12 5s10.5 7 10.5 7-4 7-10.5 7-10.5-7z"
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

function BackArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path
        d="M19 12H5M12 19l-7-7 7-7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ==========================================
// Main Register Component
// ==========================================
function Register() {
  const navigate = useNavigate();

  // State สำหรับเก็บข้อมูลในฟอร์ม
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);

  // State ควบคุม UI และ Validate[cite: 3]
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const goToLogin = () => navigate("/login");

  // ==========================================
  // ฟังก์ชันสมัครสมาชิก (LocalStorage)
  // ==========================================
  const handleRegister = async (e) => {
    e.preventDefault();

    const newErrors = {};

    if (!name.trim()) newErrors.name = "กรุณากรอกชื่อ - นามสกุล";
    if (!email.trim()) newErrors.email = "กรุณากรอกอีเมล";
    if (!phone.trim()) newErrors.phone = "กรุณากรอกเบอร์โทรศัพท์";

    if (!password) {
      newErrors.password = "กรุณากรอกรหัสผ่าน";
    } else if (password.length < 8) {
      newErrors.password = "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "กรุณายืนยันรหัสผ่าน";
    } else if (confirmPassword !== password) {
      newErrors.confirmPassword = "รหัสผ่านไม่ตรงกัน";
    }

    if (!acceptTerms) {
      newErrors.acceptTerms = "กรุณายอมรับเงื่อนไขการใช้งาน";
    }

    setErrors(newErrors);
    if (Object.keys(newErrors).length > 0) return;

    setSubmitting(true);

    // อ่านข้อมูลผู้ใช้เก่าจาก LocalStorage[cite: 3]
    const oldUsers = JSON.parse(localStorage.getItem("users")) || [];

    // ตรวจสอบอีเมลซ้ำ[cite: 3]
    const duplicateUser = oldUsers.find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );

    if (duplicateUser) {
      setErrors({ email: "อีเมลนี้มีบัญชีในระบบอยู่แล้ว" });
      setSubmitting(false);
      return;
    }

    // บันทึกผู้ใช้ใหม่ลง LocalStorage[cite: 3]
    const newUser = { name, email, phone, password };
    oldUsers.push(newUser);
    localStorage.setItem("users", JSON.stringify(oldUsers));

    setSubmitting(false);

    // แสดง Pop-up แจ้งเตือนเมื่อสมัครสำเร็จ
    await Swal.fire({
      icon: "success",
      title: "สมัครสมาชิกสำเร็จ!",
      text: "คุณสามารถเข้าสู่ระบบด้วยอีเมลนี้ได้ทันที",
      timer: 2000,
      showConfirmButton: false,
    });

    navigate("/login");
  };

  return (
    <main className="register-page">
      <section className="register-card">
        
          

          <div className="support-text">
            <PhoneIcon />
            <span>ศูนย์ควบคุมยานพาหนะ: 02-988-3655 ต่อ 1102</span>
          </div>
        

        {/* ================= ฝั่งขวา Form Area ================= */}
        <div className="register-form-area">
          <header className="register-header">
            <h2>สมัครสมาชิกใหม่ (Register)</h2>
            <p>กรอกข้อมูลด้านล่างเพื่อลงทะเบียนเข้าใช้งานระบบ</p>
          </header>

          <form className="register-form" onSubmit={handleRegister} noValidate>
            {/* ชื่อ - นามสกุล */}
            <div className="field field-full">
              <label>
                ชื่อ - นามสกุล <span>*</span>
              </label>
              <input
                type="text"
                placeholder="เช่น สมชาย ใจดี"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: null }));
                }}
              />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>

            {/* Email + Phone */}
            <div className="field-row">
              <div className="field">
                <label>
                  อีเมล <span>*</span>
                </label>
                <input
                  type="email"
                  placeholder="เช่น example@mut.ac.th"
                  value={email}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    if (errors.email) setErrors((prev) => ({ ...prev, email: null }));
                  }}
                />
                {errors.email && <p className="field-error">{errors.email}</p>}
              </div>

              <div className="field">
                <label>
                  เบอร์โทรศัพท์ <span>*</span>
                </label>
                <input
                  type="tel"
                  placeholder="08x-xxx-xxxx"
                  value={phone}
                  onChange={(e) => {
                    setPhone(e.target.value);
                    if (errors.phone) setErrors((prev) => ({ ...prev, phone: null }));
                  }}
                />
                {errors.phone && <p className="field-error">{errors.phone}</p>}
              </div>
            </div>

            {/* Password + Confirm Password */}
            <div className="field-row">
              <div className="field">
                <label>
                  รหัสผ่าน <span>*</span>
                </label>
                <div className="password-input">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="อย่างน้อย 8 ตัวอักษร"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: null }));
                    }}
                  />
                  <button
                    type="button"
                    className="eye-button"
                    onClick={() => setShowPassword((v) => !v)}
                    aria-label="แสดง/ซ่อนรหัสผ่าน"
                  >
                    <EyeIcon open={showPassword} />
                  </button>
                </div>
                {errors.password && (
                  <p className="field-error">{errors.password}</p>
                )}
              </div>

              <div className="field">
                <label>
                  ยืนยันรหัสผ่าน <span>*</span>
                </label>
                <div className="password-input">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="กรอกอีกครั้ง"
                    value={confirmPassword}
                    onChange={(e) => {
                      setConfirmPassword(e.target.value);
                      if (errors.confirmPassword)
                        setErrors((prev) => ({ ...prev, confirmPassword: null }));
                    }}
                  />
                  <button
                    type="button"
                    className="eye-button"
                    onClick={() => setShowConfirmPassword((v) => !v)}
                    aria-label="แสดง/ซ่อนรหัสผ่าน"
                  >
                    <EyeIcon open={showConfirmPassword} />
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="field-error">{errors.confirmPassword}</p>
                )}
              </div>
            </div>

            {/* Terms Checkbox */}
            <div className="terms-container">
              <label className="agreement">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => {
                    setAcceptTerms(e.target.checked);
                    if (errors.acceptTerms)
                      setErrors((prev) => ({ ...prev, acceptTerms: null }));
                  }}
                />
                <span className="custom-checkbox">{acceptTerms ? "✓" : ""}</span>
                <span className="agreement-text">
                  ฉันยอมรับ <strong>เงื่อนไขการใช้งาน</strong> และ{" "}
                  <strong>นโยบายความเป็นส่วนตัว</strong>
                </span>
              </label>
              {errors.acceptTerms && (
                <p className="field-error">{errors.acceptTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <button type="submit" className="register-button" disabled={submitting}>
              <span>{submitting ? "กำลังสมัครสมาชิก..." : "ยืนยันสมัครสมาชิก"}</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path
                  d="M5 12h14M13 6l6 6-6 6"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </form>

          {/* Footer */}
          <footer className="register-footer">
            <span>มีบัญชีผู้ใช้งานอยู่แล้ว?</span>
            <button type="button" className="login-link" onClick={goToLogin}>
              เข้าสู่ระบบ
            </button>
          </footer>
        </div>
      </section>
    </main>
  );
}

export default Register;