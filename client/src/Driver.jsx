import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Html5Qrcode } from "html5-qrcode";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Driver.css";
import Navbar from "./Navbar";
import { useAuth } from "./context/AuthContext"; 

import { 
  Calendar, 
  MapPin, 
  Bus, 
  CheckCircle2, 
  QrCode, 
  Users, 
  ChevronDown, 
  X, 
  Clock, 
  Navigation,
  Check,
  UserX
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

function Driver() {
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [passengers, setPassengers] = useState([]);
  const [tripLogs, setTripLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isPassengerListOpen, setIsPassengerListOpen] = useState(true);

  const html5QrCodeRef = useRef(null);
  const { user } = useAuth(); 

  useEffect(() => {
    if (user && user.user_code) {
      fetchSchedules(user.user_code);
    }
  }, [user]);

  useEffect(() => {
    if (selectedSchedule) {
      fetchPassengers(selectedSchedule);
      fetchTripLogs(selectedSchedule);
      setIsScanning(false);
      setIsPassengerListOpen(true);
    } else {
      setPassengers([]);
      setTripLogs([]);
    }
  }, [selectedSchedule]);

  // ระบบเปิด/ปิดกล้องสแกน QR Code จริง (Real Camera Scanner)
  useEffect(() => {
    let currentScanner = null;

    if (isScanning) {
      const qrCodeId = "real-qr-reader";
      
      // หน่วงเวลาเล็กน้อยเพื่อให้ DOM Render element id="real-qr-reader" เสร็จก่อน
      const timer = setTimeout(() => {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(qrCodeId);
        }
        currentScanner = html5QrCodeRef.current;

        currentScanner.start(
          { facingMode: "environment" }, // ใช้กล้องหลังของมือถือ
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 } 
          },
          (decodedText) => {
            // เมื่อสแกน QR สำเร็จ นำข้อความที่ได้ไปประมวลผลทันที
            handleScanSuccess(decodedText, currentScanner);
          },
          (errorMessage) => {
            // Error ระหว่างสแกนหา QR (ปล่อยว่างไว้เพราะเป็นเรื่องปกติที่ยังสแกนไม่เจอในแต่ละเฟรม)
          }
        ).catch((err) => {
          console.error("Failed to start scanner:", err);
          Swal.fire({ 
            icon: "error", 
            title: "ไม่สามารถเปิดกล้องได้", 
            text: "กรุณาอนุญาตการใช้งานกล้อง หรือตรวจสอบว่าใช้งานผ่าน HTTPS / Localhost" 
          });
          setIsScanning(false);
        });
      }, 100);

      return () => clearTimeout(timer);
    } else {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        }).catch((err) => console.error("Failed to stop scanner", err));
      }
    }
  }, [isScanning, passengers]);

  const fetchSchedules = async (driverCode) => {
    try {
      const response = await axios.get(`${API_URL}/driver/schedules`, {
        params: { driver_code: driverCode } 
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

  const handleScanSuccess = async (scannedText, scannerInstance) => {
    // ปิดกล้องชั่วคราวเพื่อป้องกันการสแกนซ้ำซ้อนทันที
    if (scannerInstance && scannerInstance.isScanning) {
      await scannerInstance.stop().catch(() => {});
    }
    setIsScanning(false);

    const bookingCodeClean = scannedText.trim();
    const matchedPassenger = passengers.find(p => p.booking_code === bookingCodeClean);

    if (matchedPassenger) {
      if (matchedPassenger.status === 'ACTIVE') {
        await handleUpdateStatus(matchedPassenger.booking_code, 'COMPLETED');
        Swal.fire({
          icon: "success",
          title: "เช็คอินเรียบร้อย",
          text: `ผู้โดยสาร: ${matchedPassenger.passenger_name}`,
          timer: 2000,
          showConfirmButton: false
        });
      } else {
        Swal.fire({ 
          icon: "warning", 
          title: "ตั๋วถูกใช้งานแล้วหรือยกเลิก", 
          text: `สถานะปัจจุบัน: ${matchedPassenger.status}` 
        });
      }
    } else {
      Swal.fire({ 
        icon: "error", 
        title: "ไม่พบข้อมูลผู้โดยสาร", 
        text: `QR Code (${bookingCodeClean}) ไม่ตรงกับรอบรถนี้` 
      });
    }
  };

  const handleArriveAtStop = async (logCode, stopName) => {
    const confirm = await Swal.fire({
      title: `ถึงจุดจอด ${stopName}?`,
      text: "ยืนยันการบันทึกเวลาถึงป้ายจริงลงระบบ",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#a61920"
    });

    if (confirm.isConfirmed) {
      try {
        await axios.put(`${API_URL}/driver/trip-logs/${logCode}/arrive`);
        fetchTripLogs(selectedSchedule); 
        Swal.fire({ icon: "success", title: "บันทึกเวลาสำเร็จ", timer: 1000, showConfirmButton: false });
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึกเวลาได้" });
      }
    }
  };

  const nextStop = tripLogs.find(log => log.actual_time === null);

  return (
    <>
      <Navbar />
      <div className="driver-page">
        <div className="driver-heading">
          <h1>ระบบคนขับรถ</h1>
          <p>จัดการรอบเดินรถ สแกนตั๋วผู้โดยสาร และบันทึกเวลาจุดจอด</p>
        </div>

        <div className="driver-layout">
          {/* แผงรอบรถ */}
          <div className="driver-schedule-panel">
            <h2>
              <Calendar size={18} className="text-danger" />
              รอบรถของคุณ
            </h2>
            {schedules.length === 0 ? (
              <div className="driver-empty">ไม่มีรอบการเดินรถวันนี้</div>
            ) : (
              <div className="driver-schedule-list">
                {schedules.map((sch) => (
                  <button 
                    key={sch.schedule_code}
                    className={`driver-schedule-item ${selectedSchedule === sch.schedule_code ? 'is-selected' : ''}`}
                    onClick={() => setSelectedSchedule(sch.schedule_code)}
                  >
                    <span className="driver-schedule-time">{sch.start_time}</span>
                    <span className={`driver-schedule-state ${selectedSchedule === sch.schedule_code ? 'is-active' : ''}`}>
                      {selectedSchedule === sch.schedule_code ? 'กำลังปฏิบัติงาน' : 'รอดำเนินการ'}
                    </span>
                    <span className="driver-schedule-route">{sch.route_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* แผงควบคุมหลัก */}
          <div className="driver-main-panel">
            {selectedSchedule ? (
              <>
                <div className="driver-trip-summary">
                  <div>
                    <span className="driver-summary-time">รอบเวลาเดินรถ</span>
                    <h2>เส้นทางเดินรถมหาวิทยาลัย</h2>
                    <p>สถานะรอบปัจจุบันกำลังให้บริการ</p>
                  </div>
                  <div className="driver-seat-count">
                    <strong>{passengers.filter(p => p.status === 'COMPLETED').length}/{passengers.length}</strong>
                    <span>เช็คอินแล้ว</span>
                  </div>
                  <div className="driver-seat-track">
                    <span style={{ width: `${(passengers.filter(p => p.status === 'COMPLETED').length / (passengers.length || 1)) * 100}%` }}></span>
                  </div>
                </div>

                {/* ปุ่มเปิดกล้องสแกน QR จริง */}
                <button 
                  className="driver-scan-btn"
                  onClick={() => setIsScanning(true)}
                >
                  <QrCode size={18} />
                  เปิดกล้องสแกน QR Code ผู้โดยสาร
                </button>

                {/* จุดจอดรถ */}
                <div className="driver-route-section">
                  <h2>
                    <MapPin size={18} className="text-danger" />
                    สถานีจุดจอดตามกำหนด
                  </h2>
                  <div className="driver-stop-list">
                    {tripLogs.map((log, index) => {
                      const isArrived = log.actual_time !== null;
                      const isNext = nextStop && nextStop.log_code === log.log_code;
                      return (
                        <div key={log.log_code} className={`driver-stop-row ${isNext ? 'is-next' : ''}`}>
                          <div className="driver-stop-info">
                            <div className={`driver-stop-marker ${isArrived ? 'is-arrived' : ''}`}>
                              {isArrived ? <Check size={14} /> : isNext ? <Bus size={14} /> : index + 1}
                            </div>
                            <div>
                              <h3 className={`${isArrived ? 'is-arrived' : ''} ${isNext ? 'is-next' : ''}`}>{log.stop_name}</h3>
                              <span className="driver-eta-text"><Clock size={12} /> คาดการณ์: <strong>{log.expected_time}</strong></span>
                            </div>
                          </div>
                          <div className="driver-stop-state">
                            {isArrived ? (
                              <span className="driver-stop-arrived">ถึงแล้ว ({log.actual_time})</span>
                            ) : isNext ? (
                              <span className="driver-stop-next">กำลังไป</span>
                            ) : (
                              <span className="driver-stop-waiting">รอคิว</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {nextStop ? (
                    <button 
                      className="driver-arrive-btn"
                      onClick={() => handleArriveAtStop(nextStop.log_code, nextStop.stop_name)}
                    >
                      <Navigation size={16} className="me-1" /> บันทึกถึงจุดจอด: {nextStop.stop_name}
                    </button>
                  ) : (
                    <div className="driver-route-complete">
                      <CheckCircle2 size={16} className="me-1" /> สิ้นสุดเส้นทางเดินรถรอบนี้เรียบร้อยแล้ว
                    </div>
                  )}
                </div>

                {/* รายชื่อผู้โดยสาร */}
                <div className="driver-passenger-section">
                  <button 
                    className="driver-passenger-toggle"
                    onClick={() => setIsPassengerListOpen(!isPassengerListOpen)}
                  >
                    <span>
                      <Users size={18} className="text-danger" />
                      รายชื่อผู้โดยสารในรอบนี้ <small>({passengers.length} คน)</small>
                    </span>
                    <ChevronDown size={18} className={`driver-chevron ${isPassengerListOpen ? 'is-open' : ''}`} />
                  </button>

                  {isPassengerListOpen && (
                    <div className="driver-passenger-list">
                      {loading ? (
                        <div className="text-center py-4 text-muted">กำลังโหลดข้อมูล...</div>
                      ) : passengers.length === 0 ? (
                        <div className="driver-empty">ไม่มีผู้โดยสารจองรอบนี้</div>
                      ) : (
                        passengers.map((p) => (
                          <div key={p.booking_code} className={`driver-passenger-row ${p.status !== 'ACTIVE' ? 'is-complete' : ''}`}>
                            <div className="driver-passenger-details">
                              <h3>{p.passenger_name}</h3>
                              <div>
                                <span>รหัสตั๋ว: {p.booking_code}</span>
                              </div>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              <span className={`driver-status ${p.status === 'ACTIVE' ? 'driver-status-waiting' : p.status === 'COMPLETED' ? 'driver-status-complete' : 'driver-status-noshow'}`}>
                                {p.status === 'ACTIVE' ? 'รอขึ้นรถ' : p.status === 'COMPLETED' ? 'ขึ้นรถแล้ว' : 'ไม่มา'}
                              </span>
                              {p.status === 'ACTIVE' && (
                                <div className="driver-passenger-actions">
                                  <button className="driver-checkin-btn" onClick={() => handleUpdateStatus(p.booking_code, 'COMPLETED')}>
                                    <Check size={12} /> เช็คอิน
                                  </button>
                                  <button className="driver-noshow-btn" onClick={() => handleUpdateStatus(p.booking_code, 'NO_SHOW')}>
                                    <UserX size={12} /> ไม่มา
                                  </button>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="driver-empty driver-no-selection">
                กรุณาเลือกรอบรถจากแถบด้านซ้ายเพื่อเริ่มปฏิบัติงาน
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal เปิดกล้องสแกน QR Code จริงผ่านมือถือหรือเว็บแคม */}
      {isScanning && (
        <div className="driver-scan-overlay">
          <div className="driver-scan-dialog">
            <div className="driver-scan-header">
              <h2>สแกนตั๋ว QR Code ผู้โดยสาร</h2>
              <button className="driver-close-scan" onClick={() => setIsScanning(false)}>
                <X size={18} />
              </button>
            </div>
            {/* Element สำคัญสำหรับแสดง Video Stream จากกล้อง */}
            <div id="real-qr-reader" className="driver-qr-reader"></div>
            <p className="mt-3 text-muted small">กรุณาหันกล้องไปที่ QR Code ของผู้โดยสาร ระบบจะบันทึกสถานะลงฐานข้อมูลให้อัตโนมัติ</p>
          </div>
        </div>
      )}
    </>
  );
}

export default Driver;