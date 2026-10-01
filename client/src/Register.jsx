import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useNavigate } from "react-router-dom";
import "./Register.css";

function EyeIcon({ open }) {
  return open ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8M9.5 5.3A10.6 10.6 0 0112 5c5 0 9 4 10.5 7-.6 1.2-1.5 2.5-2.7 3.6M6.2 6.6C4.1 8 2.5 10 1.5 12c1.5 3 5.5 7 10.5 7-10.5-7z"
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

function Register() {
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [deptCode, setDeptCode] = useState("");
  const [deptOptions, setDeptOptions] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const goToLogin = () => navigate("/login");

  // ระบบฟิสิกส์คำนวณการวิ่งเด้งชนขอบจอ 25 ชิ้น (ขนาด +3% และช้าลง)
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");

    let animationFrameId;

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);

    // สีสี่เหลี่ยมตามธีม (ชมพูอ่อน, ชมพูเข้ม, แดงอ่อน, ขาว)
    const colors = ["#fde8e8", "#fca5a5", "#f87171", "#ffffff"];

    // สร้างกล่องสี่เหลี่ยม 25 ชิ้น
    const boxes = Array.from({ length: 50 }, () => {
      // เพิ่มขนาดขึ้น 3% (ประมาณ 36px - 88px)
      const baseSize = Math.floor(Math.random() * 50) + 35;
      const size = Math.round(baseSize * 1.5);

      // ปรับความเร็วลงเพื่อให้เด้งช้าลง นุ่มนวลขึ้น
      const speedX = (Math.random() - 0.05) * 0.5;
      const speedY = (Math.random() - 0.05) * 0.5;

      return {
        x: Math.random() * (canvas.width - size),
        y: Math.random() * (canvas.height - size),
        size: size,
        vx: speedX === 0 ? 0.8 : speedX,
        vy: speedY === 0 ? 0.8 : speedY,
        color: colors[Math.floor(Math.random() * colors.length)],
        radius: Math.round(14 * 1.03),
      };
    });

    // วาดสี่เหลี่ยมขอบมน
    const drawRoundedRect = (x, y, size, radius, color) => {
      ctx.save();
      ctx.fillStyle = color;
      ctx.shadowColor = "rgba(0, 0, 0, 0.05)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + size, y, x + size, y + size, radius);
      ctx.arcTo(x + size, y + size, x, y + size, radius);
      ctx.arcTo(x, y + size, x, y, radius);
      ctx.arcTo(x, y, x + size, y, radius);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    // ลูปคำนวณพิกัดและการเด้งชนขอบ
    const update = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      boxes.forEach((box) => {
        box.x += box.vx;
        box.y += box.vy;

        // ชนขอบซ้าย/ขวา แล้วเด้งกลับ
        if (box.x <= 0) {
          box.x = 0;
          box.vx *= -1;
        } else if (box.x + box.size >= canvas.width) {
          box.x = canvas.width - box.size;
          box.vx *= -1;
        }

        // ชนขอบบน/ล่าง แล้วเด้งกลับ
        if (box.y <= 0) {
          box.y = 0;
          box.vy *= -1;
        } else if (box.y + box.size >= canvas.height) {
          box.y = canvas.height - box.size;
          box.vy *= -1;
        }

        drawRoundedRect(box.x, box.y, box.size, box.radius, box.color);
      });

      animationFrameId = requestAnimationFrame(update);
    };

    update();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get("http://localhost:5000/api/departments");
        const facultiesOnly = response.data.filter((dept) =>
          dept.dept_name.includes("คณะ")
        );
        setDeptOptions(facultiesOnly);
      } catch (error) {
        console.error("Error fetching departments:", error);
      }
    };
    fetchDepartments();
  }, []);

  const handleRegister = async (e) => {
    e.preventDefault();
    const newErrors = {};
    const englishOnlyRegex = /^[A-Za-z\s]+$/;

    if (!firstName.trim()) {
      newErrors.firstName = "กรุณากรอกชื่อ";
    } else if (!englishOnlyRegex.test(firstName)) {
      newErrors.firstName = "กรุณากรอกเป็นภาษาอังกฤษเท่านั้น";
    }

    if (!lastName.trim()) {
      newErrors.lastName = "กรุณากรอกนามสกุล";
    } else if (!englishOnlyRegex.test(lastName)) {
      newErrors.lastName = "กรุณากรอกเป็นภาษาอังกฤษเท่านั้น";
    }

    if (!email.trim()) {
      newErrors.email = "กรุณากรอกอีเมล";
    } else if (!email.endsWith("@mut.ac.th")) {
      newErrors.email = "กรุณาใช้อีเมล @mut.ac.th เท่านั้น";
    }

    if (!deptCode) newErrors.deptCode = "กรุณาเลือกคณะ";

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

    try {
      const usernameAuto = email.split("@")[0];
      await axios.post("http://localhost:5000/api/users", {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        email: email,
        username: usernameAuto,
        password: password,
        role_code: "R03",
        dept_code: deptCode,
      });

      await Swal.fire({
        icon: "success",
        title: "สมัครสมาชิกสำเร็จ!",
        text: "คุณสามารถเข้าสู่ระบบด้วยอีเมลนี้ได้ทันที",
        timer: 2000,
        showConfirmButton: false,
      });

      navigate("/login");
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "เกิดข้อผิดพลาด",
        text:
          error.response?.data?.message ||
          "ไม่สามารถสมัครสมาชิกได้ อีเมลนี้อาจมีในระบบแล้ว",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="register-page">
      <canvas ref={canvasRef} className="bounce-canvas" />

      <section className="register-card">
        <header className="register-header">
          <h2>สมัครสมาชิกใหม่ (Register)</h2>
          <p>กรอกข้อมูลด้านล่างเพื่อลงทะเบียนเข้าใช้งานระบบ</p>
        </header>

        <form className="register-form" onSubmit={handleRegister} noValidate>
          <div className="field field-full">
            <label>
              ชื่อ (First Name) <span>*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น Somchai"
              value={firstName}
              onChange={(e) => {
                setFirstName(e.target.value);
                if (errors.firstName)
                  setErrors((prev) => ({ ...prev, firstName: null }));
              }}
            />
            {errors.firstName && (
              <p className="field-error">{errors.firstName}</p>
            )}
          </div>

          <div className="field field-full">
            <label>
              นามสกุล (Last Name) <span>*</span>
            </label>
            <input
              type="text"
              placeholder="เช่น Jaidee"
              value={lastName}
              onChange={(e) => {
                setLastName(e.target.value);
                if (errors.lastName)
                  setErrors((prev) => ({ ...prev, lastName: null }));
              }}
            />
            {errors.lastName && (
              <p className="field-error">{errors.lastName}</p>
            )}
          </div>

          <div className="field field-full">
            <label>
              คณะ (Faculty) <span>*</span>
            </label>
            <select
              className="form-select"
              value={deptCode}
              onChange={(e) => {
                setDeptCode(e.target.value);
                if (errors.deptCode)
                  setErrors((prev) => ({ ...prev, deptCode: null }));
              }}
            >
              <option value="">-- เลือกคณะของคุณ --</option>
              {deptOptions.map((dept) => (
                <option key={dept.dept_code} value={dept.dept_code}>
                  {dept.dept_name}
                </option>
              ))}
            </select>
            {errors.deptCode && (
              <p className="field-error">{errors.deptCode}</p>
            )}
          </div>

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
                  if (errors.email)
                    setErrors((prev) => ({ ...prev, email: null }));
                }}
              />
              {errors.phone && <p className="field-error">{errors.phone}</p>}
            </div>
          </div>

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
                    if (errors.password)
                      setErrors((prev) => ({ ...prev, password: null }));
                  }}
                />
                <button
                  type="button"
                  className="eye-button"
                  onClick={() => setShowPassword((v) => !v)}
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
                >
                  <EyeIcon open={showConfirmPassword} />
                </button>
              </div>
              {errors.confirmPassword && (
                <p className="field-error">{errors.confirmPassword}</p>
              )}
            </div>
          </div>

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

          <button
            type="submit"
            className="register-button"
            disabled={submitting}
          >
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

        <footer className="register-footer">
          <span>มีบัญชีผู้ใช้งานอยู่แล้ว?</span>
          <button type="button" className="login-link" onClick={goToLogin}>
            เข้าสู่ระบบ
          </button>
        </footer>
      </section>
    </main>
  );
}

export default Register;