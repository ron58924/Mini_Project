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

  const handleAddRole = async () => {
    const { value: formValues } = await Swal.fire({
      title: "เพิ่มกลุ่มผู้ใช้งาน (Add Role)",
      html: `
        <div class="text-start mb-2">
          <label class="form-label">รหัส Role (เช่น R04)</label>
          <input id="swal-role-code" class="form-control" placeholder="Role Code">
        </div>
        <div class="text-start">
          <label class="form-label">ชื่อ Role (เช่น Manager)</label>
          <input id="swal-role-name" class="form-control" placeholder="Role Name">
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonColor: "#d32f2f",
      confirmButtonText: "บันทึกข้อมูล",
      cancelButtonText: "ยกเลิก",
      preConfirm: () => {
        const code = document.getElementById("swal-role-code").value.trim();
        const name = document.getElementById("swal-role-name").value.trim();
        if (!code || !name) {
          Swal.showValidationMessage("กรุณากรอกข้อมูลให้ครบทั้ง 2 ช่อง");
        }
        return { role_code: code, role_name: name };
      },
    });

    if (formValues) {
      try {
        await axios.post(`${API_URL}/roles`, formValues);
        Swal.fire({ icon: "success", title: "สำเร็จ", text: "เพิ่ม Role ใหม่เรียบร้อยแล้ว", timer: 1500, showConfirmButton: false });
        
        await fetchRoles(); 
        setSelectedRole(formValues.role_code); 
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.response?.data?.message || "ไม่สามารถเพิ่ม Role ได้ รหัสนี้อาจซ้ำ" });
      }
    }
  };

  const checkedCount = permissions.filter((p) => p.checked).length;
  const currentRoleName = roles.find((r) => r.role_code === selectedRole)?.role_name || "";

  return (
    <>
      <Navbar />
      <div className="permission-page container-fluid py-4 px-lg-5 min-vh-100">
        <h2 className="mb-4">จัดการสิทธิ์การใช้งาน (Permissions)</h2>

        <div className="row g-4">
          
          {/* =====================================================
              ฝั่งซ้าย (col-lg-4): รายชื่อกลุ่มผู้ใช้งาน (Roles List)
          ===================================================== */}
          <div className="col-lg-4">
            <div className="card shadow-sm sticky-top" style={{ top: "20px" }}>
              <div className="card-body p-0">
                <div className="p-4 d-flex justify-content-between align-items-center border-bottom">
                  <h5 className="mb-0 fw-bold">กลุ่มผู้ใช้งาน (Roles)</h5>
                  <button 
                    className="btn btn-sm btn-outline-secondary px-3"
                    onClick={handleAddRole}
                  >
                    + เพิ่ม Role
                  </button>
                </div>
                
                <div className="list-group list-group-flush" style={{ maxHeight: "calc(100vh - 200px)", overflowY: "auto" }}>
                  {roles.length === 0 ? (
                    <div className="p-4 text-center text-muted">ไม่พบข้อมูล Role</div>
                  ) : (
                    roles.map((r) => (
                      <button
                        key={r.role_code}
                        type="button"
                        className={`list-group-item list-group-item-action py-3 px-4 d-flex justify-content-between align-items-center border-bottom ${
                          selectedRole === r.role_code ? "active" : ""
                        }`}
                        onClick={() => setSelectedRole(r.role_code)}
                        style={{ cursor: "pointer", transition: "0.2s" }}
                      >
                        <div>
                          <div className="fs-5 fw-bold">
                            {r.role_name}
                          </div>
                          <small className="text-muted d-block mt-1">
                            รหัส: {r.role_code}
                          </small>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* =====================================================
              ฝั่งขวา (col-lg-8): ตารางจัดการสิทธิ์หน้าจอ
          ===================================================== */}
          <div className="col-lg-8">
            <div className="card shadow-sm h-100">
              <div className="card-body p-0">
                <div className="p-4 d-flex justify-content-between align-items-center border-bottom">
                  <h5 className="mb-0 fw-bold" style={{ color: "#9a0007" }}>
                    {selectedRole ? `สิทธิ์การเข้าถึงของ: ${currentRoleName}` : "การเข้าถึงหน้าจอ (Screen Access)"}
                  </h5>
                  {selectedRole && (
                    <span className="badge bg-primary fs-6 px-3 py-2 rounded-pill">
                      เปิดใช้งาน {checkedCount} / {permissions.length} หน้าจอ
                    </span>
                  )}
                </div>

                {!selectedRole ? (
                  <div className="text-center py-5 text-muted">
                    <h4 className="mb-3">👈 กรุณาเลือกกลุ่มผู้ใช้งานจากเมนูด้านซ้าย</h4>
                    <p>เพื่อดูและจัดการสิทธิ์การเข้าถึงหน้าจอต่างๆ</p>
                  </div>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                      <thead className="table-light text-secondary">
                        <tr>
                          <th className="text-center border-0" style={{ width: "120px" }}>เปิดใช้งาน</th>
                          <th className="border-0">ชื่อหน้าจอ (Screen Name)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {loading ? (
                          <tr>
                            <td colSpan="2" className="text-center py-5 text-muted">
                              <div className="spinner-border spinner-border-sm me-2" role="status"></div>
                              กำลังโหลดข้อมูล...
                            </td>
                          </tr>
                        ) : permissions.length === 0 ? (
                          <tr>
                            <td colSpan="2" className="text-center py-5 text-muted">ไม่มีข้อมูลหน้าจอในระบบ</td>
                          </tr>
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
                )}
              </div>
              
              {selectedRole && (
                <div className="card-footer bg-white py-4 border-top text-end">
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleSave}
                    disabled={saving}
                  >
                    {saving ? "กำลังบันทึก..." : "บันทึกสิทธิ์การใช้งาน"}
                  </button>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

export default Permission;