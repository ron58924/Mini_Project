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
          <label class="form-label text-muted d-block">รหัสระบบจะสร้างให้: <strong class="text-danger">${nextCode}</strong></label>
        </div>
        <div class="text-start">
          <label class="form-label fw-bold">ชื่อ Role (เช่น Manager, Support)</label>
          <input id="swal-role-name" class="form-control" placeholder="พิมพ์ชื่อกลุ่มผู้ใช้งาน...">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: "#be123c",
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
        Swal.fire({ icon: "success", title: "สำเร็จ", text: `เพิ่มสิทธิ์ ${roleName} เรียบร้อยแล้ว`, timer: 1500, showConfirmButton: false });
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
      confirmButtonColor: "#be123c",
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
      confirmButtonColor: "#dc2626",
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
          <label class="form-label text-muted d-block">รหัสหน้าจอระบบจะสร้างให้: <strong class="text-danger">${nextCode}</strong></label>
        </div>
        <div class="text-start">
          <label class="form-label fw-bold">ชื่อหน้าจอ (เช่น ข้อมูลผู้โดยสาร, รายงาน)</label>
          <input id="swal-screen-name" class="form-control" placeholder="พิมพ์ชื่อหน้าจอระบบ...">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: "#be123c",
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
      confirmButtonColor: "#be123c",
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
      confirmButtonColor: "#dc2626",
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
    <div className="permission-page" style={{ backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <Navbar />
      <div className="container py-4 px-lg-4">
        
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-dark mb-0" style={{ fontSize: "28px" }}>
            จัดการสิทธิ์และหน้าจอระบบ (Permissions)
          </h2>
          {selectedRole && (
            <button className="btn btn-outline-secondary rounded-pill fw-bold px-4" onClick={() => setSelectedRole("")}>
              ⚙️ กลับไปหน้าจัดการหน้าจอ (Screens Master)
            </button>
          )}
        </div>

        <div className="row g-4">
          {/* =====================================================
              ฝั่งซ้าย: รายชื่อกลุ่มผู้ใช้งาน (Roles List)
          ===================================================== */}
          <div className="col-lg-4">
            <div className="card border-0 shadow-sm rounded-4 sticky-top" style={{ top: "20px", overflow: "hidden" }}>
              <div className="card-header bg-white p-4 d-flex justify-content-between align-items-center border-bottom">
                <h5 className="mb-0 fw-bold text-dark">กลุ่มผู้ใช้งาน (Roles)</h5>
                <button className="btn btn-mut-red btn-sm px-3" onClick={handleAddRole}>
                  + เพิ่ม Role
                </button>
              </div>
              
              <div className="card-body p-0" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
                {roles.length === 0 ? (
                  <div className="p-5 text-center text-muted">ไม่พบข้อมูล Role</div>
                ) : (
                  roles.map((r) => (
                    <div
                      key={r.role_code}
                      className={`role-list-item p-3 px-4 d-flex justify-content-between align-items-center ${
                        selectedRole === r.role_code ? "active" : ""
                      }`}
                      onClick={() => setSelectedRole(r.role_code)}
                    >
                      <div>
                        <div className="role-title fs-6 fw-bold text-dark">
                          {r.role_name}
                        </div>
                        <small className={`d-block mt-1 ${selectedRole === r.role_code ? "text-danger" : "text-secondary"}`}>
                          รหัส: {r.role_code}
                        </small>
                      </div>
                      <div className="d-flex gap-2">
                        <button className="btn btn-edit-action" onClick={(e) => handleEditRole(e, r)} title="แก้ไข">✏️</button>
                        <button className="btn btn-delete-action" onClick={(e) => handleDeleteRole(e, r.role_code)} title="ลบ">🗑️</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* =====================================================
              ฝั่งขวา: ตารางจัดการสิทธิ์ / จัดการหน้าจอ
          ===================================================== */}
          <div className="col-lg-8">
            <div className="card border-0 shadow-sm rounded-4 h-100 overflow-hidden">
              
              {/* กรณีที่ยังไม่เลือก Role -> จะแสดงหน้า จัดการหน้าจอระบบ (Screen Master) แทน */}
              {!selectedRole ? (
                <>
                  <div className="card-header bg-white p-4 d-flex justify-content-between align-items-center border-bottom">
                    <h5 className="mb-0 fw-bold" style={{ color: "#3d080b" }}>⚙️ จัดการหน้าจอระบบ (Screen Master)</h5>
                    <button className="btn btn-mut-red btn-sm px-4" onClick={handleAddScreen}>+ เพิ่มหน้าจอ</button>
                  </div>
                  <div className="card-body p-4 bg-white">
                    <div className="table-responsive table-custom-wrapper">
                      <table className="table table-custom align-middle mb-0">
                        <thead>
                          <tr className="table-custom-header">
                            <th className="ps-4 py-3" style={{ width: "15%" }}>รหัส</th>
                            <th className="py-3">ชื่อหน้าจอ (Screen Name)</th>
                            <th className="text-end pe-4 py-3" style={{ width: "20%" }}>จัดการ</th>
                          </tr>
                        </thead>
                        <tbody>
                          {screens.length === 0 ? (
                            <tr><td colSpan="3" className="text-center py-5 text-muted">ยังไม่มีข้อมูลหน้าจอในระบบ</td></tr>
                          ) : (
                            screens.map((s) => (
                              <tr key={s.screen_code}>
                                <td className="ps-4 fw-medium text-muted">{s.screen_code}</td>
                                <td className="fs-6 text-dark fw-semibold">{s.screen_name}</td>
                                <td className="text-end pe-4">
                                  <button className="btn btn-edit-action me-2" onClick={() => handleEditScreen(s)} title="แก้ไข">แก้ไข</button>
                                  <button className="btn btn-delete-action" onClick={() => handleDeleteScreen(s.screen_code)} title="ลบ">ลบ</button>
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
                  <div className="card-header bg-white p-4 d-flex justify-content-between align-items-center border-bottom">
                    <h5 className="mb-0 fw-bold" style={{ color: "#3d080b" }}>
                      สิทธิ์การเข้าถึงของ: <span style={{ color: "#be123c" }}>{currentRoleName}</span>
                    </h5>
                    <span className="badge fs-6 px-3 py-2 rounded-pill" style={{ backgroundColor: "#fef2f2", color: "#be123c", border: "1px solid #fecdd3" }}>
                      เปิดใช้งาน {checkedCount} / {permissions.length} หน้าจอ
                    </span>
                  </div>

                  <div className="card-body p-4 bg-white">
                    <div className="table-responsive table-custom-wrapper">
                      <table className="table table-custom align-middle mb-0">
                        <thead>
                          <tr className="table-custom-header">
                            <th className="text-center py-3" style={{ width: "120px" }}>เปิดใช้งาน</th>
                            <th className="py-3">ชื่อหน้าจอ (Screen Name)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {loading ? (
                            <tr><td colSpan="2" className="text-center py-5 text-muted"><div className="spinner-border spinner-border-sm me-2"></div>กำลังโหลดข้อมูล...</td></tr>
                          ) : permissions.length === 0 ? (
                            <tr><td colSpan="2" className="text-center py-5 text-muted">ไม่มีข้อมูลหน้าจอในระบบ</td></tr>
                          ) : (
                            permissions.map((p) => (
                              <tr key={p.screen_code}>
                                <td className="text-center py-3">
                                  <input
                                    type="checkbox"
                                    className="form-check-input"
                                    style={{ width: "22px", height: "22px", cursor: "pointer" }}
                                    checked={p.checked}
                                    onChange={() => toggleScreen(p.screen_code)}
                                  />
                                </td>
                                <td className={p.checked ? "fw-bold text-dark" : "text-muted fw-medium"}>
                                  {p.screen_name}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  
                  <div className="card-footer bg-light p-4 border-top text-end rounded-bottom-4">
                    <button type="button" className="btn btn-mut-red px-5" onClick={handleSave} disabled={saving}>
                      {saving ? "กำลังบันทึก..." : "บันทึกการแก้ไขสิทธิ์"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Permission;