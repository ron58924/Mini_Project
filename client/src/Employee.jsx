import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Navbar from "./Navbar";

function Employee() {
  const [users, setUsers] = useState([]);
  
  // เพิ่ม State สำหรับเก็บตัวเลือก Dropdown
  const [roleOptions, setRoleOptions] = useState([]);
  const [deptOptions, setDeptOptions] = useState([]);

  const [formData, setFormData] = useState({
    user_code: "", first_name: "", last_name: "", email: "", 
    username: "", password: "", role_code: "", dept_code: ""
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchUsers();
    fetchOptions(); // เรียกใช้งานดึงข้อมูล Dropdown ตอนโหลดหน้าเว็บ
  }, []);

  const fetchUsers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/users");
      setUsers(response.data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  // ฟังก์ชันสำหรับดึงข้อมูล Role และ Dept จาก Backend
  const fetchOptions = async () => {
    try {
      const [roleRes, deptRes] = await Promise.all([
        axios.get("http://localhost:5000/api/roles"),
        axios.get("http://localhost:5000/api/departments")
      ]);
      setRoleOptions(roleRes.data);
      setDeptOptions(deptRes.data);
    } catch (error) {
      console.error("Error fetching options:", error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      setFormData({ user_code: "", first_name: "", last_name: "", email: "", username: "", password: "", role_code: "", dept_code: "" });
      setIsEditing(false);
      fetchUsers();
    } catch (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.response?.data?.message || "ไม่สามารถบันทึกข้อมูลได้" });
    }
  };

  const handleEdit = (user) => {
    setFormData({ ...user, password: "" }); // เว้นว่างรหัสผ่านไว้ ถ้าไม่กรอกแปลว่าไม่เปลี่ยน
    setIsEditing(true);
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
        <h2>จัดการผู้ใช้งาน (Users)</h2>
        
        {/* ฟอร์มเพิ่ม/แก้ไข */}
        <div className="card p-3 mb-4">
          <form onSubmit={handleSubmit} className="row g-3">
            <div className="col-md-3">
              <input type="text" name="first_name" className="form-control" placeholder="ชื่อ (First Name)" value={formData.first_name} onChange={handleInputChange} required />
            </div>
            <div className="col-md-3">
              <input type="text" name="last_name" className="form-control" placeholder="นามสกุล (Last Name)" value={formData.last_name} onChange={handleInputChange} required />
            </div>
            <div className="col-md-3">
              <input type="email" name="email" className="form-control" placeholder="อีเมล (Email)" value={formData.email} onChange={handleInputChange} required />
            </div>
            <div className="col-md-3">
              <input type="text" name="username" className="form-control" placeholder="ชื่อผู้ใช้ (Username)" value={formData.username} onChange={handleInputChange} required />
            </div>
            <div className="col-md-3">
              <input type="password" name="password" className="form-control" placeholder={isEditing ? "รหัสผ่านใหม่ (ปล่อยว่างถ้าไม่เปลี่ยน)" : "รหัสผ่าน (Password)"} value={formData.password} onChange={handleInputChange} required={!isEditing} />
            </div>
            
            {/* ---------------- เปลี่ยนเป็น Dropdown ดึงจาก DB ตรงนี้ ---------------- */}
            <div className="col-md-3">
              <select name="role_code" className="form-select" value={formData.role_code} onChange={handleInputChange} required>
                <option value="">-- เลือกสิทธิ์ (Role) --</option>
                {roleOptions.map((role) => (
                  <option key={role.role_code} value={role.role_code}>
                    {role.role_name}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-md-3">
              <select name="dept_code" className="form-select" value={formData.dept_code} onChange={handleInputChange} required>
                <option value="">-- เลือกแผนก (Dept) --</option>
                {deptOptions.map((dept) => (
                  <option key={dept.dept_code} value={dept.dept_code}>
                    {dept.dept_name}
                  </option>
                ))}
              </select>
            </div>
            {/* ------------------------------------------------------------------------- */}

            <div className="col-md-3 d-flex align-items-center">
              <button type="submit" className="btn btn-primary w-100">{isEditing ? "อัปเดตข้อมูล" : "เพิ่มผู้ใช้"}</button>
              {isEditing && (
                <button type="button" className="btn btn-secondary ms-2" onClick={() => { setIsEditing(false); setFormData({ user_code: "", first_name: "", last_name: "", email: "", username: "", password: "", role_code: "", dept_code: "" }); }}>
                  ยกเลิก
                </button>
              )}
            </div>
          </form>
        </div>

        {/* ตารางแสดงข้อมูล */}
        <table className="table table-bordered table-hover">
          <thead className="table-dark">
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
            {users.map((user) => (
              <tr key={user.user_code}>
                <td>{user.user_code}</td>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>{user.username}</td>
                
                {/* แสดงชื่อ Role และ Dept ในตาราง */}
                <td>{user.role_name}</td>
                <td>{user.dept_name}</td>
                
                <td>
                  <button className="btn btn-warning btn-sm me-2" onClick={() => handleEdit(user)}>แก้ไข</button>
                  <button className="btn btn-danger btn-sm" onClick={() => handleDelete(user.user_code)}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default Employee;