import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Navbar from "./Navbar";

function Employee() {
  const [users, setUsers] = useState([]);
  const [roleOptions, setRoleOptions] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);       // ใช้ในฟอร์ม เพิ่ม/แก้ไข
  const [allDeptOptions, setAllDeptOptions] = useState([]); // รายชื่อแผนกฉบับเต็ม
  const [searchTerm, setSearchTerm] = useState(""); 
  const [filterDept, setFilterDept] = useState(""); 
  const [formData, setFormData] = useState({
    user_code: "", first_name: "", last_name: "", email: "", 
    username: "", password: "", role_code: "", dept_code: ""
  });
  const [isEditing, setIsEditing] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchOptions(); 
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/users");
      // กรองเอาเฉพาะพนักงาน (Role ไม่ใช่ ผู้โดยสาร)
      const employeesOnly = response.data.filter((user) => {
        const roleName = user.role_name ? user.role_name.toLowerCase() : "";
        return !roleName.includes("passenger") && !roleName.includes("ผู้โดยสาร");
      });
      setUsers(employeesOnly); 
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchOptions = async () => {
    try {
      const [roleRes, deptRes] = await Promise.all([
        axios.get("http://localhost:5000/api/roles"),
        axios.get("http://localhost:5000/api/departments")
      ]);
      
      const staffRoles = roleRes.data.filter(
        (role) => !role.role_name.toLowerCase().includes("passenger") && !role.role_name.includes("ผู้โดยสาร")
      );
      setRoleOptions(staffRoles);

      // กรองเอาเฉพาะแผนกพนักงาน (ไม่มีคำว่า "คณะ")
      const staffDepartments = deptRes.data.filter(
        (dept) => !dept.dept_name.includes("คณะ")
      );
      setDeptOptions(staffDepartments);
      setAllDeptOptions(deptRes.data);
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleAddClick = () => {
    setIsEditing(false);
    setFormData({ user_code: "", first_name: "", last_name: "", email: "", username: "", password: "", role_code: "", dept_code: "" });
    setShowModal(true);
  };

  const handleEditClick = (user) => {
    setIsEditing(true);
    setFormData({ ...user, password: "" }); 
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setFormData({ user_code: "", first_name: "", last_name: "", email: "", username: "", password: "", role_code: "", dept_code: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        await axios.put(`http://localhost:5000/api/users/${formData.user_code}`, formData);
        Swal.fire({ icon: "success", title: "อัปเดตข้อมูลสำเร็จ", timer: 1500, showConfirmButton: false });
      } else {
        await axios.post("http://localhost:5000/api/users", formData);
        Swal.fire({ icon: "success", title: "เพิ่มผู้ใช้สำเร็จ", timer: 1500, showConfirmButton: false });
      }
      closeModal();
      fetchUsers();
    } catch (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.response?.data?.message || "ไม่สามารถบันทึกข้อมูลได้" });
    }
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: "คุณต้องการลบผู้ใช้นี้ใช่หรือไม่",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่, ลบเลย!",
      cancelButtonText: "ยกเลิก"
    });

    if (confirm.isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/users/${id}`);
        Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1500, showConfirmButton: false });
        fetchUsers();
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถลบข้อมูลได้" });
      }
    }
  };

  // ตัวเลือกสำหรับช่องค้นหา (กรองเอาเฉพาะแผนก ไม่มีคำว่า "คณะ")
  const searchDeptOptions = allDeptOptions.filter((dept) => !dept.dept_name.includes("คณะ"));

  const filteredUsers = users.filter((user) => {
    const keyword = searchTerm.trim().toLowerCase();
    const matchSearch =
      keyword === "" ||
      user.first_name?.toLowerCase().includes(keyword) ||
      user.last_name?.toLowerCase().includes(keyword) ||
      user.username?.toLowerCase().includes(keyword);

    const matchDept = filterDept === "" || user.dept_code === filterDept;

    return matchSearch && matchDept;
  });

  return (
    <div style={{ fontFamily: "'Prompt', sans-serif", backgroundColor: "#fafafa", minHeight: "100vh" }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap');
        * { font-family: 'Prompt', sans-serif !important; }
        .search-box-custom { background-color: #f4f6f8 !important; border: 1px solid #e5e7eb !important; border-radius: 10px !important; font-size: 14px; color: #374151; }
        .search-box-custom:focus { border-color: #be123c !important; box-shadow: 0 0 0 3px rgba(190, 18, 60, 0.15) !important; }
        .table-custom-wrapper { border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb; }
        .table-custom-header th { background-color: #3d080b !important; color: #ffffff !important; font-size: 14px !important; font-weight: 600 !important; letter-spacing: 0.5px; border-bottom: none !important; }
        .table-custom tbody tr:nth-of-type(even) { background-color: #f9fafb; }
        .table-custom tbody tr:hover { background-color: #f3f4f6; }
        .btn-add-passenger { background-color: #be123c !important; color: #ffffff !important; border: none !important; border-radius: 30px !important; padding: 8px 24px !important; font-weight: 600 !important; font-size: 15px !important; box-shadow: 0 4px 12px rgba(190, 18, 60, 0.3) !important; transition: all 0.2s ease-in-out; }
        .btn-add-passenger:hover { background-color: #9f1239 !important; transform: translateY(-1px); }
        .btn-edit-action { background-color: #f59e0b !important; color: #000000 !important; border: none !important; border-radius: 6px !important; font-weight: 600 !important; font-size: 13px !important; padding: 4px 14px !important; }
        .btn-edit-action:hover { background-color: #d97706 !important; }
        .btn-delete-action { background-color: #dc2626 !important; color: #ffffff !important; border: none !important; border-radius: 6px !important; font-weight: 600 !important; font-size: 13px !important; padding: 4px 14px !important; }
        .btn-delete-action:hover { background-color: #b91c1c !important; }
      `}</style>
      <Navbar />
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="fw-bold text-dark mb-0" style={{ fontSize: "28px" }}>จัดการพนักงาน (Empolyee)</h2>
          <button className="btn btn-add-passenger" onClick={handleAddClick}>+ เพิ่มพนักงาน</button>
        </div>
        <div className="row g-3 mb-4">
          <div className="col-md-6">
            <input type="text" className="form-control search-box-custom py-2 px-3" placeholder="ค้นหาชื่อ, นามสกุล หรือ Username..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <div className="col-md-6">
            <select className="form-select search-box-custom py-2 px-3" value={filterDept} onChange={(e) => setFilterDept(e.target.value)}>
              <option value="">-- ทุกแผนก --</option>
              {searchDeptOptions.map((dept) => (
                <option key={dept.dept_code} value={dept.dept_code}>{dept.dept_name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="table-responsive table-custom-wrapper">
          <table className="table table-custom align-middle mb-0">
            <thead>
              <tr className="text-center table-custom-header">
                <th className="py-3" style={{ width: "10%" }}>รหัส</th>
                <th className="py-3">ชื่อ - นามสกุล</th>
                <th className="py-3">อีเมล</th>
                <th className="py-3" style={{ width: "15%" }}>USERNAME</th>
                <th className="py-3">ROLE (สิทธิ์)</th>
                <th className="py-3">DEPT (แผนก)</th>
                <th className="py-3" style={{ width: "14%" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody style={{ fontSize: "14px", color: "#1f2937" }}>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.user_code}>
                    <td className="text-center fw-medium">{user.user_code}</td>
                    <td>{user.first_name} {user.last_name}</td>
                    <td>{user.email}</td>
                    <td className="text-center">{user.username}</td>
                    <td className="text-center">{user.role_name}</td>
                    <td>{user.dept_name || "-"}</td>
                    <td className="text-center">
                      <button className="btn btn-edit-action me-2" onClick={() => handleEditClick(user)}>แก้ไข</button>
                      <button className="btn btn-delete-action" onClick={() => handleDelete(user.user_code)}>ลบ</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">ไม่พบข้อมูลพนักงานที่ตรงกับเงื่อนไข</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {showModal && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content shadow-lg border-0 rounded-4">
                <div className="modal-header bg-light border-bottom-0">
                  <h5 className="modal-title fw-bold text-dark">{isEditing ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"}</h5>
                  <button type="button" className="btn-close" onClick={closeModal}></button>
                </div>
                <form onSubmit={handleSubmit}>
                  <div className="modal-body p-4">
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label fw-bold">ชื่อ (First Name)</label>
                        <input type="text" name="first_name" className="form-control" placeholder="กรอกชื่อ" value={formData.first_name} onChange={handleInputChange} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">นามสกุล (Last Name)</label>
                        <input type="text" name="last_name" className="form-control" placeholder="กรอกนามสกุล" value={formData.last_name} onChange={handleInputChange} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">อีเมล (Email)</label>
                        <input type="email" name="email" className="form-control" placeholder="example@mut.ac.th" value={formData.email} onChange={handleInputChange} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">ชื่อผู้ใช้ (Username)</label>
                        <input type="text" name="username" className="form-control" placeholder="Username สำหรับเข้าสู่ระบบ" value={formData.username} onChange={handleInputChange} required />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">รหัสผ่าน (Password)</label>
                        <input type="password" name="password" className="form-control" placeholder={isEditing ? "ปล่อยว่างถ้าไม่ต้องการเปลี่ยน" : "กำหนดรหัสผ่าน"} value={formData.password} onChange={handleInputChange} required={!isEditing} />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label fw-bold">สิทธิ์การใช้งาน (Role)</label>
                        <select name="role_code" className="form-select" value={formData.role_code} onChange={handleInputChange} required>
                          <option value="">-- เลือกสิทธิ์ --</option>
                          {roleOptions.map((role) => (
                            <option key={role.role_code} value={role.role_code}>{role.role_name}</option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-12">
                        <label className="form-label fw-bold">แผนก (Department)</label>
                        <select name="dept_code" className="form-select" value={formData.dept_code} onChange={handleInputChange} required>
                          <option value="">-- เลือกแผนก --</option>
                          {deptOptions.map((dept) => (
                            <option key={dept.dept_code} value={dept.dept_code}>{dept.dept_name}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-top-0 bg-light rounded-bottom-4">
                    <button type="button" className="btn btn-secondary px-4 fw-bold" onClick={closeModal}>ยกเลิก</button>
                    <button type="submit" className="btn text-white px-4 fw-bold" style={{ backgroundColor: "#be123c", borderRadius: "8px" }}>
                      {isEditing ? "บันทึกการแก้ไข" : "ยืนยันการเพิ่ม"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Employee;