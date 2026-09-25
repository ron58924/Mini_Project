import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import Navbar from "./Navbar";

function Passenger() {
  const [passengers, setPassengers] = useState([]);
  
  // สังเกตว่า formData เราจะตั้งค่าเริ่มต้น role_code เป็น "R03" เสมอ
  const [formData, setFormData] = useState({
    user_code: "", first_name: "", last_name: "", email: "", 
    username: "", password: "", role_code: "R03", dept_code: ""
  });
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    fetchPassengers();
  }, []);

  const fetchPassengers = async () => {
    try {
      const response = await axios.get("http://localhost:5000/api/users");
      
      // กรองเอาเฉพาะผู้โดยสาร (Role: R03) มาแสดง
      const passengersOnly = response.data.filter((user) => user.role_code === 'R03');
      setPassengers(passengersOnly);
    } catch (error) {
      console.error("Error fetching passengers:", error);
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
        Swal.fire({ icon: "success", title: "เพิ่มผู้โดยสารสำเร็จ", timer: 1500, showConfirmButton: false });
      }
      // รีเซ็ตฟอร์ม โดยคงค่า role_code เป็น R03 ไว้
      setFormData({ user_code: "", first_name: "", last_name: "", email: "", username: "", password: "", role_code: "R03", dept_code: "" });
      setIsEditing(false);
      fetchPassengers();
    } catch (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: error.response?.data?.message || "ไม่สามารถบันทึกข้อมูลได้" });
    }
  };

  const handleEdit = (user) => {
    setFormData({ ...user, password: "", role_code: "R03", dept_code: "" });
    setIsEditing(true);
  };

  const handleDelete = async (id) => {
    const confirm = await Swal.fire({
      title: "ยืนยันการลบ?",
      text: "คุณต้องการลบผู้โดยสารท่านนี้ใช่หรือไม่",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ใช่, ลบเลย!",
      cancelButtonText: "ยกเลิก"
    });

    if (confirm.isConfirmed) {
      try {
        await axios.delete(`http://localhost:5000/api/users/${id}`);
        Swal.fire({ icon: "success", title: "ลบสำเร็จ", timer: 1500, showConfirmButton: false });
        fetchPassengers();
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถลบข้อมูลได้" });
      }
    }
  };

  return (
    <>
      <Navbar />
      <div className="container mt-4">
        <h2>จัดการผู้โดยสาร (Passengers)</h2>
        
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

            <div className="col-md-3 d-flex align-items-center">
              <button type="submit" className="btn btn-primary w-100">{isEditing ? "อัปเดตข้อมูล" : "เพิ่มผู้โดยสาร"}</button>
              {isEditing && (
                <button type="button" className="btn btn-secondary ms-2" onClick={() => { setIsEditing(false); setFormData({ user_code: "", first_name: "", last_name: "", email: "", username: "", password: "", role_code: "R03", dept_code: "" }); }}>
                  ยกเลิก
                </button>
              )}
            </div>
          </form>
        </div>

        <table className="table table-bordered table-hover">
          <thead className="table-dark">
            <tr>
              <th>รหัส</th>
              <th>ชื่อ - นามสกุล</th>
              <th>อีเมล</th>
              <th>Username</th>
              <th>จัดการ</th>
            </tr>
          </thead>
          <tbody>
            {passengers.map((user) => (
              <tr key={user.user_code}>
                <td>{user.user_code}</td>
                <td>{user.first_name} {user.last_name}</td>
                <td>{user.email}</td>
                <td>{user.username}</td>
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

export default Passenger;