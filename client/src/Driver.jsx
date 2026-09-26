import React, { useState, useEffect } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./Navbar";

const API_URL = "http://localhost:5000/api";

function Driver() {
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [passengers, setPassengers] = useState([]);
  
  const [tripLogs, setTripLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isScanning, setIsScanning] = useState(false);
  const [fakeQrText, setFakeQrText] = useState("");

  // State สำหรับเปิด-ปิดการแสดงผลรายชื่อผู้โดยสาร
  const [isPassengerListOpen, setIsPassengerListOpen] = useState(true);

  const currentUser = JSON.parse(localStorage.getItem("user") || "{}");

  useEffect(() => {
    if (currentUser.user_code) {
      fetchSchedules();
    }
  }, []);

  useEffect(() => {
    if (selectedSchedule) {
      fetchPassengers(selectedSchedule);
      fetchTripLogs(selectedSchedule);
      setIsScanning(false);
      setIsPassengerListOpen(true); // กางรายชื่อผู้โดยสารอัตโนมัติเมื่อเลือกรอบใหม่
    } else {
      setPassengers([]);
      setTripLogs([]);
    }
  }, [selectedSchedule]);

  const fetchSchedules = async () => {
    try {
      const response = await axios.get(`${API_URL}/driver/schedules`, {
        params: { driver_code: currentUser.user_code }
      });
      setSchedules(response.data);
    } catch (error) {
      console.error("Error fetching schedules:", error);
    }
  };

  const fetchPassengers = async (scheduleCode) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/driver/passengers`, {
        params: { schedule_code: scheduleCode }
      });
      setPassengers(response.data);
    } catch (error) {
      console.error("Error fetching passengers:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTripLogs = async (scheduleCode) => {
    try {
      const response = await axios.get(`${API_URL}/driver/trip-logs`, {
        params: { schedule_code: scheduleCode }
      });
      setTripLogs(response.data);
    } catch (error) {
      console.error("Error fetching trip logs:", error);
    }
  };

  const handleUpdateStatus = async (bookingCode, status) => {
    try {
      await axios.put(`${API_URL}/bookings/${bookingCode}/status`, { status });
      setPassengers((prev) => 
        prev.map((p) => p.booking_code === bookingCode ? { ...p, status } : p)
      );
      Swal.fire({
        icon: "success",
        title: status === 'COMPLETED' ? "เช็คอินสำเร็จ" : "อัปเดตสถานะแล้ว",
        timer: 1500,
        showConfirmButton: false,
        position: "top-end",
        toast: true
      });
    } catch (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถอัปเดตสถานะได้" });
    }
  };

  const handleArriveAtStop = async (logCode, stopName) => {
    const confirm = await Swal.fire({
      title: `ถึง ${stopName}?`,
      text: "ยืนยันว่ารถเดินทางมาถึงป้ายนี้แล้ว",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#198754"
    });

    if (confirm.isConfirmed) {
      try {
        await axios.put(`${API_URL}/driver/trip-logs/${logCode}/arrive`);
        fetchTripLogs(selectedSchedule); 
        Swal.fire({ icon: "success", title: "บันทึกเวลาถึงป้ายสำเร็จ", timer: 1000, showConfirmButton: false });
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึกเวลาได้" });
      }
    }
  };

  const handleScanSuccess = () => {
    if (!fakeQrText.trim()) return;
    const scannedText = fakeQrText.trim();
    setIsScanning(false); 
    setFakeQrText("");    
    
    const matchedPassenger = passengers.find(p => p.booking_code === scannedText);

    if (matchedPassenger) {
      if (matchedPassenger.status === 'ACTIVE') {
        handleUpdateStatus(matchedPassenger.booking_code, 'COMPLETED');
        Swal.fire({
          icon: "success",
          title: "เช็คอินเรียบร้อย",
          text: `คุณ ${matchedPassenger.passenger_name}`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({ icon: "warning", title: "ตั๋วถูกใช้งานแล้วหรือยกเลิก", text: `สถานะปัจจุบัน: ${matchedPassenger.status}` });
      }
    } else {
      Swal.fire({ icon: "error", title: "ไม่พบข้อมูล", text: "QR Code นี้ไม่ได้จองในรอบรถปัจจุบัน" });
    }
  };

  const renderStatusBadge = (status) => {
    switch (status) {
      case 'ACTIVE': return <span className="badge bg-warning text-dark px-3 py-2 rounded-pill">รอขึ้นรถ</span>;
      case 'COMPLETED': return <span className="badge bg-success px-3 py-2 rounded-pill">ขึ้นรถแล้ว</span>;
      case 'NO_SHOW': return <span className="badge bg-secondary px-3 py-2 rounded-pill">ไม่มา</span>;
      case 'CANCELLED': return <span className="badge bg-danger px-3 py-2 rounded-pill">ยกเลิก</span>;
      default: return null;
    }
  };

  // หาจุดจอดถัดไปที่ยังไปไม่ถึง (เพื่อปั้นเป็นปุ่มกดอันเดียว)
  const nextStop = tripLogs.find(log => log.actual_time === null);

  return (
    <>
      <Navbar />
      <div className="container-fluid py-3 px-3" style={{ fontFamily: "'Prompt', sans-serif", backgroundColor: "#f8f9fa", minHeight: "100vh", paddingBottom: "80px" }}>
        <h4 className="fw-bold text-dark mb-3">ระบบคนขับรถ</h4>

        {/* 1. เลือกรอบรถ (เปลี่ยนจาก Dropdown เป็นปุ่มการ์ดให้กดง่ายๆ) */}
        <div className="mb-4">
          <label className="form-label fw-bold text-primary mb-2">รอบรถของคุณ (วันนี้)</label>
          {schedules.length === 0 ? (
            <div className="alert alert-light text-muted border text-center rounded-4">
              ไม่มีรอบการเดินรถที่ได้รับมอบหมายในวันนี้
            </div>
          ) : (
            <div className="d-flex flex-column gap-2">
              {schedules.map((sch) => (
                <button 
                  key={sch.schedule_code}
                  className={`btn text-start p-3 rounded-4 shadow-sm fw-bold border-0 ${selectedSchedule === sch.schedule_code ? 'btn-primary' : 'bg-white text-dark'}`}
                  onClick={() => setSelectedSchedule(sch.schedule_code)}
                  style={{ transition: "0.2s" }}
                >
                  <div className="d-flex justify-content-between align-items-center">
                    <span>เวลา {sch.start_time} - {sch.route_name}</span>
                    {selectedSchedule === sch.schedule_code && <span>✅</span>}
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 2. สถานะการเดินทาง (จุดจอด) */}
        {selectedSchedule && tripLogs.length > 0 && (
          <div className="card shadow-sm border-0 mb-4 rounded-4 border-start border-primary border-4">
            <div className="card-body p-3">
              <h5 className="fw-bold text-dark mb-3">📍 เส้นทางการเดินรถ</h5>
              
              {/* ปุ่มกดไปสถานีถัดไป (ปุ่มเดียวใหญ่ๆ) */}
              {nextStop ? (
                <button 
                  className="btn btn-primary w-100 rounded-pill fw-bold py-3 mb-4 shadow-sm fs-5"
                  onClick={() => handleArriveAtStop(nextStop.log_code, nextStop.stop_name)}
                >
                  มุ่งหน้าไป: {nextStop.stop_name} (กดเมื่อถึง)
                </button>
              ) : (
                <div className="alert alert-success text-center fw-bold rounded-4 mb-4">
                  🎉 รถเดินทางถึงปลายทางเรียบร้อยแล้ว
                </div>
              )}
              
              {/* แสดงสถานะว่าผ่านป้ายไหนมาแล้วบ้าง */}
              <div className="d-flex flex-column gap-2">
                {tripLogs.map((log) => {
                  const isArrived = log.actual_time !== null;
                  const isNext = nextStop && nextStop.log_code === log.log_code;

                  return (
                    <div key={log.log_code} className={`d-flex align-items-center justify-content-between p-2 rounded-3 border ${isNext ? 'bg-light border-primary border-2' : 'bg-white'}`}>
                      <div className="d-flex align-items-center">
                        <div className="me-3 text-center fs-5">
                          {isArrived ? "✅" : isNext ? "🚌" : "📌"}
                        </div>
                        <div>
                          <h6 className={`mb-0 fw-bold ${isArrived ? 'text-muted text-decoration-line-through' : isNext ? 'text-primary' : 'text-dark'}`}>
                            {log.stop_name}
                          </h6>
                          <small className="text-muted">คาดว่าถึง: {log.expected_time}</small>
                        </div>
                      </div>

                      <div>
                        {isArrived ? (
                          <span className="badge bg-success bg-opacity-10 text-success border border-success px-2 py-1">ถึงแล้ว {log.actual_time}</span>
                        ) : isNext ? (
                          <span className="badge bg-primary px-3 py-1 animate-pulse">กำลังมุ่งหน้า</span>
                        ) : (
                          <span className="badge bg-light text-muted border px-3 py-1">รอคิว</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 3. รายชื่อผู้โดยสาร (เปิด/ปิด ได้) */}
        {selectedSchedule && (
          <div className="mb-3">
            <div 
              className="d-flex justify-content-between align-items-center bg-white p-3 rounded-4 shadow-sm mb-3"
              onClick={() => setIsPassengerListOpen(!isPassengerListOpen)}
              style={{ cursor: "pointer", borderLeft: "4px solid #9a0007" }}
            >
              <h5 className="mb-0 fw-bold" style={{ color: "#9a0007" }}>
                รายชื่อผู้โดยสารในรอบนี้ {isPassengerListOpen ? "▼" : "▶"}
              </h5>
              <span className="badge bg-primary rounded-pill px-3 py-2">ยอดรวม {passengers.length} คน</span>
            </div>

            {isPassengerListOpen && (
              loading ? (
                <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
              ) : passengers.length === 0 ? (
                <div className="text-center py-4 bg-white rounded-4 shadow-sm"><p className="text-muted mb-0">ไม่มีผู้โดยสารจองในรอบนี้</p></div>
              ) : (
                <div className="d-flex flex-column gap-3 mb-5">
                  {passengers.map((p) => (
                    <div key={p.booking_code} className={`card border-0 shadow-sm rounded-4 ${p.status !== 'ACTIVE' ? 'opacity-75 bg-light' : ''}`}>
                      <div className="card-body p-3">
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <h5 className="fw-bold mb-1">{p.passenger_name}</h5>
                            <span className="text-muted small">รหัส: {p.booking_code}</span>
                          </div>
                          {renderStatusBadge(p.status)}
                        </div>
                        
                        {p.status === 'ACTIVE' && (
                          <div className="d-flex gap-2 mt-2">
                            <button className="btn btn-outline-success flex-grow-1 fw-bold py-2 rounded-4" onClick={() => handleUpdateStatus(p.booking_code, 'COMPLETED')}>
                              ✓ กดเช็คอิน
                            </button>
                            <button className="btn btn-outline-secondary flex-grow-1 fw-bold py-2 rounded-4" onClick={() => handleUpdateStatus(p.booking_code, 'NO_SHOW')}>
                              ✗ ไม่มา
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}

        {/* ปุ่มจำลองสแกน */}
        {selectedSchedule && !isScanning && (
          <button 
            className="btn btn-dark shadow-lg rounded-pill fw-bold"
            style={{ position: "fixed", bottom: "30px", left: "50%", transform: "translateX(-50%)", zIndex: 1000, padding: "12px 30px", fontSize: "1.1rem", whiteSpace: "nowrap" }}
            onClick={() => setIsScanning(true)}
          >
            📷 สแกน QR (จำลอง)
          </button>
        )}

        {isScanning && (
          <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0, 0, 0, 0.8)', zIndex: 1050 }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0 rounded-4 shadow-lg">
                <div className="modal-header bg-light border-bottom-0">
                  <h5 className="modal-title fw-bold">จำลองสแกน QR Code</h5>
                  <button type="button" className="btn-close" onClick={() => setIsScanning(false)}></button>
                </div>
                <div className="modal-body p-4 text-center">
                  <p className="text-muted mb-4">พิมพ์รหัส Booking Code (เช่น BK_TEST01)</p>
                  <input 
                    type="text" 
                    className="form-control form-control-lg text-center mb-3 fw-bold text-primary" 
                    value={fakeQrText}
                    onChange={(e) => setFakeQrText(e.target.value)}
                    autoFocus
                  />
                  <button className="btn btn-success btn-lg w-100 fw-bold rounded-pill shadow-sm" onClick={handleScanSuccess}>
                    ยืนยัน
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </>
  );
}

export default Driver;