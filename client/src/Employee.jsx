import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Navbar from "./Navbar";

function Employee() {
  const [users, setUsers] = useState([]);
  
  const [roleOptions, setRoleOptions] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);

  const [formData, setFormData] = useState({
    user_code: "", first_name: "", last_name: "", email: "", 
    username: "", password: "", role_code: "", dept_code: ""
  });
  
  const [isEditing, setIsEditing] = useState(false);
  
  // เพิ่ม State สำหรับควบคุมการเปิด/ปิด Modal
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchOptions(); 
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/users");
      const employeesOnly = response.data.filter((user) => {
        const roleName = user.role_name ? user.role_name.toLowerCase() : "";
        return !roleName.includes("passenger") && !roleName.includes("passanger");
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
        (role) => !role.role_name.toLowerCase().includes("passenger")
      );
      setRoleOptions(staffRoles);

      const staffDepartments = deptRes.data.filter(
        (dept) => !dept.dept_name.includes("Faculty")
      );
      setDeptOptions(staffDepartments);

    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // ฟังก์ชันเปิด Modal สำหรับ "เพิ่มพนักงาน"
  const handleAddClick = () => {
    setIsEditing(false);
    setFormData({ user_code: "", first_name: "", last_name: "", email: "", username: "", password: "", role_code: "", dept_code: "" });
    setShowModal(true);
  };

  // ฟังก์ชันเปิด Modal สำหรับ "แก้ไขพนักงาน"
  const handleEditClick = (user) => {
    setIsEditing(true);
    setFormData({ ...user, password: "" }); 
    setShowModal(true);
  };

  // ฟังก์ชันปิด Modal
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
      closeModal(); // ปิดหน้าต่างเมื่อบันทึกสำเร็จ
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

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        
        {/* Header และปุ่มเพิ่มพนักงาน */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2>จัดการผู้ใช้งาน (Users)</h2>
          <button className="btn btn-primary" onClick={handleAddClick}>
            + เพิ่มพนักงาน
          </button>
        </div>

        {/* ตารางแสดงข้อมูล */}
        <div className="table-responsive">
          <table className="table table-bordered table-hover align-middle">
            <thead className="table-dark text-center">
              <tr>
                <th>รหัส</th>
                <th>ชื่อ - นามสกุล</th>
                <th>อีเมล</th>
                <th>Username</th>
                <th>Role (สิทธิ์)</th>
                <th>Dept (แผนก)</th>
                <th>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {users.length > 0 ? (
                users.map((user) => (
                  <tr key={user.user_code}>
                    <td className="text-center">{user.user_code}</td>
                    <td>{user.first_name} {user.last_name}</td>
                    <td>{user.email}</td>
                    <td>{user.username}</td>
                    <td className="text-center">{user.role_name}</td>
                    <td>{user.dept_name}</td>
                    <td className="text-center">
                      <button className="btn btn-warning btn-sm me-2" onClick={() => handleEditClick(user)}>แก้ไข</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user.user_code)}>ลบ</button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">ไม่พบข้อมูลพนักงาน</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* =====================================================
            Popup Modal สำหรับ เพิ่ม/แก้ไข
        ===================================================== */}
        {showModal && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.5)' }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content shadow-lg border-0 rounded-4">
                <div className="modal-header bg-light border-bottom-0">
                  <h5 className="modal-title fw-bold text-dark">
                    {isEditing ? "แก้ไขข้อมูลพนักงาน" : "เพิ่มพนักงานใหม่"}
                  </h5>
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
                            <option key={role.role_code} value={role.role_code}>
                              {role.role_name}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div className="col-md-12">
                        <label className="form-label fw-bold">แผนก (Department)</label>
                        <select name="dept_code" className="form-select" value={formData.dept_code} onChange={handleInputChange} required>
                          <option value="">-- เลือกแผนก --</option>
                          {deptOptions.map((dept) => (
                            <option key={dept.dept_code} value={dept.dept_code}>
                              {dept.dept_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="modal-footer border-top-0 bg-light rounded-bottom-4">
                    <button type="button" className="btn btn-secondary px-4" onClick={closeModal}>ยกเลิก</button>
                    <button type="submit" className="btn btn-primary px-4">
                      {isEditing ? "บันทึกการแก้ไข" : "ยืนยันการเพิ่ม"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default Employee;