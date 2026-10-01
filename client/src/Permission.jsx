import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Navbar from "./Navbar";
import "bootstrap/dist/css/bootstrap.min.css";
import { Shield, ShieldCheck, LayoutGrid, Plus, Edit, Trash2, KeySquare, ChevronRight, Save, ShieldAlert, MonitorPlay } from "lucide-react";

const API_URL = "http://localhost:5000/api";

function Permission() {
  const [roles, setRoles] = useState([]);
  const [screens, setScreens] = useState([]);
  const [selectedRole, setSelectedRole] = useState(null);
  const [rolePermissions, setRolePermissions] = useState([]);
  const [loading, setLoading] = useState(false);

  const mutRed = '#c8102e';

  useEffect(() => {
    fetchRoles();
    fetchScreens();
  }, []);

  const fetchRoles = async () => {
    try {
      const res = await axios.get(`${API_URL}/roles`);
      setRoles(res.data);
    } catch (error) { console.error(error); }
  };

  const fetchScreens = async () => {
    try {
      const res = await axios.get(`${API_URL}/screens`);
      setScreens(res.data);
    } catch (error) { console.error(error); }
  };

  const handleRoleSelect = async (role) => {
    setSelectedRole(role);
    setLoading(true);
    try {
      const res = await axios.get(`${API_URL}/role-permissions/${role.role_code}`);
      setRolePermissions(res.data.map((p) => p.screen_code));
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePermission = (screenCode) => {
    setRolePermissions((prev) =>
      prev.includes(screenCode)
        ? prev.filter((code) => code !== screenCode)
        : [...prev, screenCode]
    );
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    try {
      const payload = rolePermissions.map((code, index) => ({
        screen_code: code,
        seq_no: index + 1,
      }));
      await axios.put(`${API_URL}/role-permissions/${selectedRole.role_code}`, payload);
      Swal.fire({ icon: "success", title: "บันทึกสิทธิ์สำเร็จ", text: `อัปเดตสิทธิ์สำหรับ ${selectedRole.role_name} เรียบร้อยแล้ว`, timer: 2000, showConfirmButton: false });
    } catch (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึกสิทธิ์ได้" });
    }
  };

  // ==========================================
  // จัดการ Roles (บทบาท)
  // ==========================================
  const handleAddRole = async () => {
    let nextRoleCode = "R01";
    if (roles.length > 0) {
      const rRoles = roles.filter(r => r.role_code.startsWith('R')).map(r => parseInt(r.role_code.replace('R', ''), 10)).filter(n => !isNaN(n));
      if (rRoles.length > 0) {
        nextRoleCode = 'R' + String(Math.max(...rRoles) + 1).padStart(2, '0');
      }
    }

    const { value: formValues } = await Swal.fire({
      title: "เพิ่มสิทธิ์การใช้งานใหม่",
      html: `
        <div class="text-start mb-3 px-2">
          <label class="text-muted small fw-bold mb-1">รหัสสิทธิ์ (สร้างอัตโนมัติ)</label>
          <input id="swal-role-code" class="form-control bg-light text-secondary fw-bold" value="${nextRoleCode}" readonly>
        </div>
        <div class="text-start px-2">
          <label class="text-muted small fw-bold mb-1">ชื่อสิทธิ์</label>
          <input id="swal-role-name" class="form-control" placeholder="เช่น ผู้ดูแลระบบ, พนักงาน">
        </div>
      `,
      focusConfirm: false, showCancelButton: true, confirmButtonText: "บันทึก", cancelButtonText: "ยกเลิก", confirmButtonColor: mutRed,
      preConfirm: () => {
        const code = document.getElementById("swal-role-code").value;
        const name = document.getElementById("swal-role-name").value;
        if (!name.trim()) Swal.showValidationMessage("กรุณากรอกชื่อสิทธิ์การใช้งาน");
        return { role_code: code, role_name: name };
      },
    });

    if (formValues) {
      try {
        await axios.post(`${API_URL}/roles`, formValues);
        Swal.fire({ icon: "success", title: "เพิ่มสำเร็จ", timer: 1500, showConfirmButton: false });
        fetchRoles();
      } catch (error) { Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.response?.data?.message || "ไม่สามารถเพิ่มสิทธิ์ได้" }); }
    }
  };

  const handleEditRole = async (role, e) => {
    e.stopPropagation();
    const { value: newName } = await Swal.fire({
      title: `แก้ไขชื่อสิทธิ์`, input: "text", inputLabel: `รหัส: ${role.role_code}`, inputValue: role.role_name,
      showCancelButton: true, confirmButtonText: "บันทึก", cancelButtonText: "ยกเลิก", confirmButtonColor: mutRed,
      inputValidator: (value) => { if (!value) return "กรุณากรอกชื่อสิทธิ์!"; }
    });

    if (newName) {
      try {
        await axios.put(`${API_URL}/roles/${role.role_code}`, { role_name: newName });
        Swal.fire({ icon: "success", title: "อัปเดตสำเร็จ", timer: 1500, showConfirmButton: false });
        fetchRoles();
        if (selectedRole?.role_code === role.role_code) setSelectedRole({ ...selectedRole, role_name: newName });
      } catch (error) { Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถแก้ไขสิทธิ์ได้" }); }
    }
  };

  const handleDeleteRole = (role, e) => {
    e.stopPropagation();
    Swal.fire({
      title: `ยืนยันการลบ ${role.role_name}?`, text: "หากลบแล้วจะไม่สามารถกู้คืนข้อมูลสิทธิ์นี้ได้", icon: "warning",
      showCancelButton: true, confirmButtonColor: mutRed, cancelButtonColor: "#6c757d", confirmButtonText: "ใช่, ลบเลย", cancelButtonText: "ยกเลิก"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_URL}/roles/${role.role_code}`);
          Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1500, showConfirmButton: false });
          fetchRoles();
          if (selectedRole?.role_code === role.role_code) setSelectedRole(null);
        } catch (error) { Swal.fire({ icon: "error", title: "ลบไม่ได้", text: error.response?.data?.message || "มีการใช้งานสิทธิ์นี้อยู่" }); }
      }
    });
  };

  // ==========================================
  // จัดการ Screens (หน้าจอ)
  // ==========================================
  const handleAddScreen = async () => {
    let nextScreenCode = "S01";
    if (screens.length > 0) {
      const sScreens = screens.filter(s => s.screen_code.startsWith('S')).map(s => parseInt(s.screen_code.replace('S', ''), 10)).filter(n => !isNaN(n));
      if (sScreens.length > 0) nextScreenCode = 'S' + String(Math.max(...sScreens) + 1).padStart(2, '0');
    }

    const { value: formValues } = await Swal.fire({
      title: "เพิ่มหน้าจอใหม่",
      html: `
        <div class="text-start mb-3 px-2">
          <label class="text-muted small fw-bold mb-1">รหัสหน้าจอ (สร้างอัตโนมัติ หรือแก้ไขได้)</label>
          <input id="swal-screen-code" class="form-control fw-bold" value="${nextScreenCode}">
        </div>
        <div class="text-start px-2">
          <label class="text-muted small fw-bold mb-1">ชื่อหน้าจอ</label>
          <input id="swal-screen-name" class="form-control" placeholder="เช่น จัดการตารางเดินรถ">
        </div>
      `,
      focusConfirm: false, showCancelButton: true, confirmButtonText: "บันทึก", cancelButtonText: "ยกเลิก", confirmButtonColor: mutRed,
      preConfirm: () => {
        const code = document.getElementById("swal-screen-code").value;
        const name = document.getElementById("swal-screen-name").value;
        if (!code || !name.trim()) Swal.showValidationMessage("กรุณากรอกรหัสและชื่อหน้าจอ");
        return { screen_code: code, screen_name: name };
      },
    });

    if (formValues) {
      try {
        await axios.post(`${API_URL}/screens`, formValues);
        Swal.fire({ icon: "success", title: "เพิ่มสำเร็จ", timer: 1500, showConfirmButton: false });
        fetchScreens();
      } catch (error) { Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "รหัสหน้าจออาจซ้ำกัน" }); }
    }
  };

  const handleEditScreen = async (screen, e) => {
    e.stopPropagation();
    const { value: newName } = await Swal.fire({
      title: `แก้ไขชื่อหน้าจอ`, input: "text", inputLabel: `รหัส: ${screen.screen_code}`, inputValue: screen.screen_name,
      showCancelButton: true, confirmButtonText: "บันทึก", cancelButtonText: "ยกเลิก", confirmButtonColor: mutRed,
      inputValidator: (value) => { if (!value) return "กรุณากรอกชื่อหน้าจอ!"; }
    });

    if (newName) {
      try {
        await axios.put(`${API_URL}/screens/${screen.screen_code}`, { screen_name: newName });
        Swal.fire({ icon: "success", title: "อัปเดตสำเร็จ", timer: 1500, showConfirmButton: false });
        fetchScreens();
      } catch (error) { Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถแก้ไขได้" }); }
    }
  };

  const handleDeleteScreen = (screen, e) => {
    e.stopPropagation();
    Swal.fire({
      title: `ยืนยันการลบ ${screen.screen_name}?`, text: "หากลบแล้ว หน้าจอนี้จะหายไปจากทุกสิทธิ์ที่เคยมี", icon: "warning",
      showCancelButton: true, confirmButtonColor: mutRed, cancelButtonColor: "#6c757d", confirmButtonText: "ใช่, ลบเลย", cancelButtonText: "ยกเลิก"
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_URL}/screens/${screen.screen_code}`);
          Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1500, showConfirmButton: false });
          fetchScreens();
          setRolePermissions(prev => prev.filter(code => code !== screen.screen_code));
        } catch (error) { Swal.fire({ icon: "error", title: "ลบไม่ได้", text: "ไม่สามารถลบหน้าจอนี้ได้" }); }
      }
    });
  };

  return (
    <div className="bg-light min-vh-100 position-relative pb-5">
      <div className="position-absolute top-0 start-0 w-100 shadow-sm" style={{ height: '240px', backgroundColor: mutRed, zIndex: 0, borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}></div>

      <div className="position-relative" style={{ zIndex: 1 }}>
        <Navbar />

        <div className="container mt-4 mb-4 text-white">
          <div className="d-flex align-items-center mb-2">
            <ShieldCheck size={32} className="me-2" />
            <h2 className="fw-bold mb-0">จัดการสิทธิ์ (Permissions)</h2>
          </div>
          <p className="opacity-75 mb-0 ms-1">กำหนดสิทธิ์และตั้งค่าการเข้าถึงหน้าจอต่างๆ ของแต่ละบทบาท</p>
        </div>

        <div className="container">
          <div className="row g-4">
            
            {/* ซ้าย: รายการ Role */}
            <div className="col-12 col-lg-5">
              <div className="bg-white rounded-4 shadow-sm p-4 animate-fade-in h-100">
                <div className="d-flex justify-content-between align-items-center mb-4">
                  <h5 className="fw-bold text-dark mb-0 d-flex align-items-center">
                    <KeySquare size={20} className="me-2 text-danger" /> บทบาท (Roles)
                  </h5>
                  <button onClick={handleAddRole} className="btn btn-sm btn-outline-danger rounded-pill fw-bold d-flex align-items-center px-3 interactive-card">
                    <Plus size={16} className="me-1" /> เพิ่ม
                  </button>
                </div>

                <div className="d-flex flex-column gap-2 custom-scrollbar" style={{ maxHeight: '600px', overflowY: 'auto', paddingRight: '5px' }}>
                  {roles.map((role) => {
                    const isSelected = selectedRole?.role_code === role.role_code;
                    return (
                      <div 
                        key={role.role_code} 
                        onClick={() => handleRoleSelect(role)}
                        className={`p-3 rounded-4 cursor-pointer d-flex justify-content-between align-items-center border interactive-card`}
                        style={{ 
                          transition: 'all 0.2s', borderColor: isSelected ? mutRed : '#e2e8f0',
                          backgroundColor: isSelected ? 'rgba(200, 16, 46, 0.05)' : '#fff', borderWidth: isSelected ? '2px' : '1px'
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div className={`rounded-circle d-flex align-items-center justify-content-center me-3 ${isSelected ? 'bg-danger text-white' : 'bg-light text-secondary'}`} style={{ width: '40px', height: '40px' }}>
                            <Shield size={20} />
                          </div>
                          <div>
                            <div className={`fw-bold ${isSelected ? 'text-danger' : 'text-dark'}`}>{role.role_name}</div>
                            <div className="text-muted small">รหัส: {role.role_code}</div>
                          </div>
                        </div>
                        
                        <div className="d-flex align-items-center gap-1">
                          <button onClick={(e) => handleEditRole(role, e)} className="btn btn-sm btn-light text-secondary rounded-circle p-2 interactive-card" title="แก้ไข"><Edit size={16}/></button>
                          <button onClick={(e) => handleDeleteRole(role, e)} className="btn btn-sm btn-light text-danger rounded-circle p-2 interactive-card" title="ลบ"><Trash2 size={16}/></button>
                          <ChevronRight size={20} className={`ms-1 ${isSelected ? 'text-danger' : 'text-muted opacity-25'}`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* ขวา: หน้าจอและสิทธิ์ */}
            <div className="col-12 col-lg-7">
              <div className="bg-white rounded-4 shadow-sm p-4 animate-fade-in h-100 d-flex flex-column">
                
                {!selectedRole ? (
                  <div className="text-center text-muted my-auto py-5">
                    <ShieldAlert size={64} className="opacity-25 mb-3 mx-auto text-danger" />
                    <h5 className="fw-bold">ยังไม่ได้เลือกบทบาท</h5>
                    <p className="small">กรุณาเลือกบทบาทจากเมนูด้านซ้ายเพื่อตั้งค่าสิทธิ์การเข้าถึง</p>
                  </div>
                ) : (
                  <>
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 pb-3 border-bottom gap-3">
                      <div>
                        <h5 className="fw-bold text-dark mb-1 d-flex align-items-center">
                          <LayoutGrid size={20} className="me-2 text-danger" /> กำหนดหน้าจอที่เข้าถึงได้
                        </h5>
                        <div className="text-muted small">
                          กำลังแก้ไขสิทธิ์ของ: <span className="fw-bold text-danger">{selectedRole.role_name}</span>
                        </div>
                      </div>
                      
                      {/* ปุ่มเพิ่มหน้าจอ และ บันทึกสิทธิ์ */}
                      <div className="d-flex gap-2">
                        <button onClick={handleAddScreen} className="btn btn-outline-secondary rounded-pill fw-bold px-3 py-2 d-flex align-items-center shadow-sm interactive-card">
                          <Plus size={16} className="me-1" /> หน้าจอ
                        </button>
                        <button onClick={handleSavePermissions} className="btn text-white rounded-pill fw-bold px-4 py-2 d-flex align-items-center shadow-sm interactive-card" style={{ backgroundColor: mutRed }}>
                          <Save size={18} className="me-2" /> บันทึกสิทธิ์
                        </button>
                      </div>
                    </div>

                    {loading ? (
                      <div className="text-center py-5 text-muted"><span className="spinner-border spinner-border-sm me-2 text-danger"></span>กำลังโหลดข้อมูล...</div>
                    ) : (
                      <div className="row g-3">
                        {screens.map((screen) => {
                          const isAllowed = rolePermissions.includes(screen.screen_code);
                          return (
                            <div className="col-12 col-md-6" key={screen.screen_code}>
                              <div 
                                className={`p-3 rounded-4 border d-flex justify-content-between align-items-center cursor-pointer interactive-card ${isAllowed ? 'border-danger bg-danger bg-opacity-10' : 'bg-white'}`}
                                onClick={() => handleTogglePermission(screen.screen_code)}
                                style={{ transition: 'all 0.2s', borderWidth: isAllowed ? '2px' : '1px' }}
                              >
                                <div className="d-flex align-items-center">
                                  {/* ปรับให้เป็น Checkbox แบบติ๊กถูกดูง่ายๆ */}
                                  <div className="form-check mb-0 me-3">
                                    <input 
                                      className="form-check-input cursor-pointer shadow-sm" 
                                      type="checkbox" 
                                      checked={isAllowed} 
                                      readOnly
                                      style={{ width: '22px', height: '22px', backgroundColor: isAllowed ? mutRed : '', borderColor: isAllowed ? mutRed : '#cbd5e1' }}
                                    />
                                  </div>
                                  <div>
                                    <div className={`fw-bold mb-1 ${isAllowed ? 'text-danger' : 'text-dark'}`}>{screen.screen_name}</div>
                                    <div className="text-muted d-flex align-items-center" style={{ fontSize: '11px' }}>
                                      <MonitorPlay size={12} className="me-1"/> {screen.screen_code}
                                    </div>
                                  </div>
                                </div>
                                
                                {/* ปุ่มแก้ไข/ลบ หน้าจอ */}
                                <div className="d-flex align-items-center gap-1">
                                  <button onClick={(e) => handleEditScreen(screen, e)} className="btn btn-sm btn-light text-secondary rounded-circle p-2 interactive-card" title="แก้ไขหน้าจอ"><Edit size={14}/></button>
                                  <button onClick={(e) => handleDeleteScreen(screen, e)} className="btn btn-sm btn-light text-danger rounded-circle p-2 interactive-card" title="ลบหน้าจอ"><Trash2 size={14}/></button>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </>
                )}
                
              </div>
            </div>

          </div>
        </div>
      </div>

      <style>{`
        .cursor-pointer { cursor: pointer; }
        .interactive-card:hover { transform: translateY(-2px); box-shadow: 0 4px 8px rgba(0,0,0,0.05); }
        .interactive-card:active { transform: translateY(0); }
        .animate-fade-in { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
      `}</style>
    </div>
  );
}

export default Permission;