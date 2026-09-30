import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Permission.css";
import Navbar from "./Navbar";

const API_URL = "http://localhost:5000/api";

function Permission() {
  const [roles, setRoles] = useState([]);
  const [screens, setScreens] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");

  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchRoles();
    fetchScreens();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API_URL}/roles`);
      setRoles(response.data);
    } catch (error) {
      console.error("GET ROLES ERROR:", error);
      Swal.fire({ icon: "error", title: "Error", text: "ไม่สามารถโหลดข้อมูล Role ได้" });
    }
  };

  const fetchScreens = async () => {
    try {
      const response = await axios.get(`${API_URL}/screens`);
      setScreens(response.data); 
    } catch (error) {
      console.error("GET SCREENS ERROR:", error);
      Swal.fire({ icon: "error", title: "Error", text: "ไม่สามารถโหลดข้อมูลหน้าจอได้" });
    }
  };

  useEffect(() => {
    if (!selectedRole || screens.length === 0) {
      setPermissions([]);
      return;
    }
    fetchRolePermissions(selectedRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, screens]);

  const fetchRolePermissions = async (roleCode) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/role-permissions/${roleCode}`);
      const allowedMap = {};
      response.data.forEach((p) => {
        allowedMap[p.screen_code] = true;
      });

      const merged = screens.map((s) => ({
        screen_code: s.screen_code,
        screen_name: s.screen_name,
        checked: allowedMap[s.screen_code] !== undefined
      }));
      setPermissions(merged);
    } catch (error) {
      console.error("GET ROLE PERMISSIONS ERROR:", error);
      Swal.fire({ icon: "error", title: "Error", text: "ไม่สามารถโหลดสิทธิ์ของ Role นี้ได้" });
    } finally {
      setLoading(false);
    }
  };

  const toggleScreen = (screenCode) => {
    setPermissions((prev) =>
      prev.map((p) =>
        p.screen_code === screenCode ? { ...p, checked: !p.checked } : p
      )
    );
  };

  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      let seq = 1;
      const payload = permissions
        .filter((p) => p.checked)
        .map((p) => ({ screen_code: p.screen_code, seq_no: seq++ }));

      await axios.put(`${API_URL}/role-permissions/${selectedRole}`, {
        screens: payload,
      });

      await Swal.fire({ icon: "success", title: "Saved!", text: "บันทึกสิทธิ์เรียบร้อยแล้ว", timer: 1500, showConfirmButton: false });
    } catch (error) {
      console.error("SAVE PERMISSIONS ERROR:", error);
      Swal.fire({ icon: "error", title: "Save Failed", text: error.response?.data?.message || "ไม่สามารถบันทึกสิทธิ์ได้" });
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // CRUD Roles
  // ==========================================
  const handleAddRole = async () => {
    let nextCode = "R01";
    if (roles.length > 0) {
      const numericCodes = roles
        .map((r) => parseInt(r.role_code.replace(/\D/g, ""), 10))
        .filter((n) => !isNaN(n));
      
      if (numericCodes.length > 0) {
        const maxCode = Math.max(...numericCodes);
        nextCode = `R${(maxCode + 1).toString().padStart(2, "0")}`; 
      }
    }

    const { value: roleName } = await Swal.fire({
      title: "เพิ่มกลุ่มผู้ใช้งาน (Add Role)",
      html: `
        <div class="text-start mb-3">
          <label class="form-label text-muted d-block">รหัสระบบจะสร้างให้: <strong class="text-primary">${nextCode}</strong></label>
        </div>
        <div class="text-start">
          <label class="form-label fw-bold">ชื่อ Role (เช่น Manager, Support)</label>
          <input id="swal-role-name" class="form-control" placeholder="พิมพ์ชื่อกลุ่มผู้ใช้งาน...">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: "#d32f2f",
      confirmButtonText: "บันทึกข้อมูล",
      cancelButtonText: "ยกเลิก",
      preConfirm: () => {
        const name = document.getElementById("swal-role-name").value.trim();
        if (!name) Swal.showValidationMessage("กรุณากรอกชื่อ Role");
        return name;
      },
    });

    if (roleName) {
      try {
        await axios.post(`${API_URL}/roles`, { role_code: nextCode, role_name: roleName });
        Swal.fire({ icon: "success", title: "สำเร็จ", text: `เพิ่มสิทธิ์ ${roleName} (${nextCode}) เรียบร้อยแล้ว`, timer: 1500, showConfirmButton: false });
        await fetchRoles(); 
        setSelectedRole(nextCode); 
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.response?.data?.message || "ไม่สามารถเพิ่ม Role ได้" });
      }
    }
  };

  const handleEditRole = async (e, role) => {
    e.stopPropagation(); 
    const { value: newName } = await Swal.fire({
      title: `แก้ไขชื่อ Role (${role.role_code})`,
      input: "text",
      inputValue: role.role_name,
      showCancelButton: true,
      confirmButtonColor: "#d32f2f",
      confirmButtonText: "บันทึกการแก้ไข",
      cancelButtonText: "ยกเลิก",
      inputValidator: (value) => {
        if (!value.trim()) return "กรุณากรอกชื่อ Role";
      }
    });

    if (newName && newName !== role.role_name) {
      try {
        await axios.put(`${API_URL}/roles/${role.role_code}`, { role_name: newName });
        Swal.fire({ icon: "success", title: "สำเร็จ", text: "แก้ไขชื่อ Role เรียบร้อยแล้ว", timer: 1500, showConfirmButton: false });
        fetchRoles();
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.response?.data?.message || "ไม่สามารถแก้ไข Role ได้" });
      }
    }
  };

  const handleDeleteRole = async (e, roleCode) => {
    e.stopPropagation(); 
    const confirm = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `คุณต้องการลบสิทธิ์รหัส ${roleCode} ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d32f2f",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "ใช่, ลบเลย!",
      cancelButtonText: "ยกเลิก"
    });

    if (confirm.isConfirmed) {
      try {
        await axios.delete(`${API_URL}/roles/${roleCode}`);
        Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1500, showConfirmButton: false });
        if (selectedRole === roleCode) {
          setSelectedRole("");
          setPermissions([]);
        }
        fetchRoles();
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.response?.data?.message || "ไม่สามารถลบ Role ได้" });
      }
    }
  };

  // ==========================================
  // CRUD Screens (หน้าจอ)
  // ==========================================
  const handleAddScreen = async () => {
    let nextCode = "SCR_01";
    if (screens.length > 0) {
      const numericCodes = screens
        .map((s) => parseInt(s.screen_code.replace(/\D/g, ""), 10))
        .filter((n) => !isNaN(n));
      if (numericCodes.length > 0) {
        const maxCode = Math.max(...numericCodes);
        nextCode = `SCR_${(maxCode + 1).toString().padStart(2, "0")}`;
      }
    }

    const { value: screenName } = await Swal.fire({
      title: "เพิ่มหน้าจอระบบ (Add Screen)",
      html: `
        <div class="text-start mb-3">
          <label class="form-label text-muted d-block">รหัสหน้าจอระบบจะสร้างให้: <strong class="text-primary">${nextCode}</strong></label>
        </div>
        <div class="text-start">
          <label class="form-label fw-bold">ชื่อหน้าจอ (เช่น ข้อมูลผู้โดยสาร, รายงาน)</label>
          <input id="swal-screen-name" class="form-control" placeholder="พิมพ์ชื่อหน้าจอระบบ...">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: "#0d6efd",
      confirmButtonText: "บันทึกข้อมูล",
      cancelButtonText: "ยกเลิก",
      preConfirm: () => {
        const name = document.getElementById("swal-screen-name").value.trim();
        if (!name) Swal.showValidationMessage("กรุณากรอกชื่อหน้าจอ");
        return name;
      },
    });

    if (screenName) {
      try {
        await axios.post(`${API_URL}/screens`, { screen_code: nextCode, screen_name: screenName });
        Swal.fire({ icon: "success", title: "สำเร็จ", text: `เพิ่มหน้าจอ ${screenName} เรียบร้อยแล้ว`, timer: 1500, showConfirmButton: false });
        fetchScreens(); 
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.response?.data?.message || "ไม่สามารถเพิ่มหน้าจอได้" });
      }
    }
  };

  const handleEditScreen = async (screen) => {
    const { value: newName } = await Swal.fire({
      title: `แก้ไขชื่อหน้าจอ (${screen.screen_code})`,
      input: "text",
      inputValue: screen.screen_name,
      showCancelButton: true,
      confirmButtonColor: "#0d6efd",
      confirmButtonText: "บันทึกการแก้ไข",
      cancelButtonText: "ยกเลิก",
      inputValidator: (value) => {
        if (!value.trim()) return "กรุณากรอกชื่อหน้าจอ";
      }
    });

    if (newName && newName !== screen.screen_name) {
      try {
        await axios.put(`${API_URL}/screens/${screen.screen_code}`, { screen_name: newName });
        Swal.fire({ icon: "success", title: "สำเร็จ", text: "แก้ไขชื่อหน้าจอเรียบร้อยแล้ว", timer: 1500, showConfirmButton: false });
        fetchScreens();
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.response?.data?.message || "ไม่สามารถแก้ไขหน้าจอได้" });
      }
    }
  };

  const handleDeleteScreen = async (screenCode) => {
    const confirm = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: `คุณต้องการลบหน้าจอ ${screenCode} ใช่หรือไม่? ข้อมูลสิทธิ์ที่ผูกกับหน้าจอนี้จะถูกลบออกด้วย`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d32f2f",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "ใช่, ลบเลย!",
      cancelButtonText: "ยกเลิก"
    });

    if (confirm.isConfirmed) {
      try {
        await axios.delete(`${API_URL}/screens/${screenCode}`);
        Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1500, showConfirmButton: false });
        fetchScreens();
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.response?.data?.message || "ไม่สามารถลบหน้าจอได้" });
      }
    }
  };

  const checkedCount = permissions.filter((p) => p.checked).length;
  const currentRoleName = roles.find((r) => r.role_code === selectedRole)?.role_name || "";

  return (
    <>
      <Navbar />
      <div className="permission-page container-fluid py-4 px-lg-5 min-vh-100">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>จัดการสิทธิ์การใช้งาน และ หน้าจอระบบ</h2>
          {selectedRole && (
            <button className="btn btn-outline-primary" onClick={() => setSelectedRole("")}>
              ⚙️ กลับไปหน้าจัดการหน้าจอ (Screens Master)
            </button>
          )}
        </div>

        <div className="row g-4">
          
          {/* =====================================================
              ฝั่งซ้าย: รายชื่อกลุ่มผู้ใช้งาน (Roles List)
          ===================================================== */}
          <div className="col-lg-4">
            <div className="card shadow-sm sticky-top" style={{ top: "20px" }}>
              <div className="card-body p-0">
                <div className="p-4 d-flex justify-content-between align-items-center border-bottom">
                  <h5 className="mb-0 fw-bold">กลุ่มผู้ใช้งาน (Roles)</h5>
                  <button className="btn btn-sm btn-outline-secondary px-3" onClick={handleAddRole}>
                    + เพิ่ม Role
                  </button>
                </div>
                
                <div className="list-group list-group-flush" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
                  {roles.length === 0 ? (
                    <div className="p-4 text-center text-muted">ไม่พบข้อมูล Role</div>
                  ) : (
                    roles.map((r) => (
                      <div
                        key={r.role_code}
                        className={`list-group-item list-group-item-action py-3 px-4 d-flex justify-content-between align-items-center border-bottom ${
                          selectedRole === r.role_code ? "active" : ""
                        }`}
                        onClick={() => setSelectedRole(r.role_code)}
                        style={{ cursor: "pointer", transition: "0.2s" }}
                      >
                        <div>
                          <div className="fs-5 fw-bold">{r.role_name}</div>
                          <small className={`d-block mt-1 ${selectedRole === r.role_code ? "text-light opacity-75" : "text-muted"}`}>
                            รหัส: {r.role_code}
                          </small>
                        </div>
                        <div className="d-flex gap-2">
                          <button className={`btn btn-sm ${selectedRole === r.role_code ? 'btn-light text-primary' : 'btn-outline-secondary'}`} onClick={(e) => handleEditRole(e, r)} title="แก้ไขชื่อ Role">✏️</button>
                          <button className={`btn btn-sm ${selectedRole === r.role_code ? 'btn-light text-danger' : 'btn-outline-danger'}`} onClick={(e) => handleDeleteRole(e, r.role_code)} title="ลบ Role">🗑️</button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              ฝั่งขวา: ตารางจัดการสิทธิ์ / จัดการหน้าจอ
          ===================================================== */}
          <div className="col-lg-8">
            <div className="card shadow-sm h-100">
              
              {/* กรณีที่ยังไม่เลือก Role -> จะแสดงหน้า จัดการหน้าจอระบบ (Screen Master) แทน */}
              {!selectedRole ? (
                <>
                  <div className="p-4 d-flex justify-content-between align-items-center border-bottom bg-light rounded-top">
                    <h5 className="mb-0 fw-bold text-primary">⚙️ จัดการหน้าจอระบบ (Screen Master)</h5>
                    <button className="btn btn-sm btn-primary px-3" onClick={handleAddScreen}>+ เพิ่มหน้าจอ</button>
                  </div>
                  <div className="card-body p-0">
                    <div className="table-responsive" style={{ maxHeight: "calc(100vh - 220px)", overflowY: "auto" }}>
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light text-secondary sticky-top">
                          <tr>
                            <th className="border-0 ps-4" style={{ width: "15%" }}>รหัส</th>
                            <th className="border-0">ชื่อหน้าจอ (Screen Name)</th>
                            <th className="text-end border-0 pe-4" style={{ width: "20%" }}>จัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {screens.length === 0 ? (
                            <tr><td colSpan="3" className="text-center py-5 text-muted">ยังไม่มีข้อมูลหน้าจอในระบบ</td></tr>
                          ) : (
                            screens.map((s) => (
                              <tr key={s.screen_code}>
                                <td className="ps-4 fw-bold text-muted">{s.screen_code}</td>
                                <td className="fs-5 text-dark fw-semibold">{s.screen_name}</td>
                                <td className="text-end pe-4">
                                  <button className="btn btn-sm btn-outline-secondary rounded-circle p-2 me-2" onClick={() => handleEditScreen(s)} title="แก้ไข">✏️️</button>
                                  <button className="btn btn-sm btn-outline-danger rounded-circle p-2" onClick={() => handleDeleteScreen(s.screen_code)} title="ลบ">🗑️</button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                
                // กรณีเลือก Role แล้ว -> แสดงหน้า ติ๊กสิทธิ์การเข้าถึง (Permission Matrix)
                <>
                  <div className="card-body p-0">
                    <div className="p-4 d-flex justify-content-between align-items-center border-bottom">
                      <h5 className="mb-0 fw-bold" style={{ color: "#9a0007" }}>
                        สิทธิ์การเข้าถึงของ: {currentRoleName}
                      </h5>
                      <span className="badge bg-primary fs-6 px-3 py-2 rounded-pill">
                        เปิดใช้งาน {checkedCount} / {permissions.length} หน้าจอ
                      </span>
                    </div>

                    <div className="table-responsive" style={{ maxHeight: "calc(100vh - 280px)", overflowY: "auto" }}>
                      <table className="table table-hover align-middle mb-0">
                        <thead className="table-light text-secondary sticky-top">
                          <tr>
                            <th className="text-center border-0" style={{ width: "120px" }}>เปิดใช้งาน</th>
                            <th className="border-0">ชื่อหน้าจอ (Screen Name)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr><td colSpan="2" className="text-center py-5 text-muted"><div className="spinner-border spinner-border-sm me-2"></div>กำลังโหลดข้อมูล...</td></tr>
                          ) : permissions.length === 0 ? (
                            <tr><td colSpan="2" className="text-center py-5 text-muted">ไม่มีข้อมูลหน้าจอในระบบ</td></tr>
                          ) : (
                            permissions.map((p) => (
                              <tr key={p.screen_code} className={p.checked ? "table-primary" : ""}>
                                <td className="text-center">
                                  <div className="form-check d-flex justify-content-center">
                                    <input
                                      type="checkbox"
                                      className="form-check-input m-0"
                                      style={{ width: "24px", height: "24px", cursor: "pointer" }}
                                      checked={p.checked}
                                      onChange={() => toggleScreen(p.screen_code)}
                                    />
                                  </div>
                                </td>
                                <td className={p.checked ? "fw-bold fs-5" : "text-muted fs-5"} style={{ color: p.checked ? "#9a0007" : "inherit" }}>
                                  {p.screen_name}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="card-footer bg-white py-4 border-top text-end">
                    <button type="button" className="btn btn-primary px-4 fw-bold" onClick={handleSave} disabled={saving}>
                      {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไขสิทธิ์"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default Permission;