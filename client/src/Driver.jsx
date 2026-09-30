import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { Html5Qrcode } from "html5-qrcode";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Driver.css";
import Navbar from "./Navbar";
import { useAuth } from "./context/AuthContext"; 

import { 
  Calendar, MapPin, Bus, CheckCircle2, QrCode, Users, ChevronDown, 
  X, Clock, Navigation, Check, UserX, RefreshCw, History
} from "lucide-react";

const API_URL = "http://localhost:5000/api";

function Driver() {
  const [schedules, setSchedules] = useState([]);
  const [selectedSchedule, setSelectedSchedule] = useState("");
  const [isChoosingSchedule, setIsChoosingSchedule] = useState(true); 
  const [scheduleTab, setScheduleTab] = useState('active'); 
  
  const [passengers, setPassengers] = useState([]);
  const [tripLogs, setTripLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  
  const [isScanning, setIsScanning] = useState(false);
  const [isPassengerListOpen, setIsPassengerListOpen] = useState(true);

  const html5QrCodeRef = useRef(null);
  const { user } = useAuth(); 
  const mutRed = '#c8102e';

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
      setIsChoosingSchedule(false); 
    } else {
      setPassengers([]);
      setTripLogs([]);
    }
  }, [selectedSchedule]);

  useEffect(() => {
    let currentScanner = null;
    if (isScanning) {
      const qrCodeId = "real-qr-reader";
      const timer = setTimeout(() => {
        if (!html5QrCodeRef.current) {
          html5QrCodeRef.current = new Html5Qrcode(qrCodeId);
        }
        currentScanner = html5QrCodeRef.current;
        currentScanner.start(
          { facingMode: "environment" }, 
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => { handleScanSuccess(decodedText, currentScanner); },
          (errorMessage) => {}
        ).catch((err) => {
          Swal.fire({ icon: "error", title: "ไม่สามารถเปิดกล้องได้", text: "กรุณาอนุญาตการใช้งานกล้องบนมือถือ" });
          setIsScanning(false);
        });
      }, 100);
      return () => clearTimeout(timer);
    } else {
      if (html5QrCodeRef.current && html5QrCodeRef.current.isScanning) {
        html5QrCodeRef.current.stop().then(() => {
          html5QrCodeRef.current.clear();
          html5QrCodeRef.current = null;
        }).catch((err) => console.error(err));
      }
    }
  }, [isScanning, passengers]);

  const fetchSchedules = async (driverCode) => {
    try {
      const response = await axios.get(`${API_URL}/driver/schedules`, { params: { driver_code: driverCode } });
      setSchedules(response.data);
    } catch (error) { console.error(error); }
  };

  const fetchPassengers = async (scheduleCode) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/driver/passengers`, { params: { schedule_code: scheduleCode } });
      setPassengers(response.data);
    } catch (error) { console.error(error); } finally { setLoading(false); }
  };

  const fetchTripLogs = async (scheduleCode) => {
    try {
      const response = await axios.get(`${API_URL}/driver/trip-logs`, { params: { schedule_code: scheduleCode } });
      setTripLogs(response.data);
    } catch (error) { console.error(error); }
  };

  const handleUpdateStatus = async (bookingCode, status) => {
    try {
      await axios.put(`${API_URL}/bookings/${bookingCode}/status`, { status });
      setPassengers((prev) => prev.map((p) => p.booking_code === bookingCode ? { ...p, status } : p));
      Swal.fire({ icon: "success", title: status === 'COMPLETED' ? "เช็คอินสำเร็จ" : "อัปเดตสถานะแล้ว", timer: 1500, showConfirmButton: false, position: "center", toast: true });
    } catch (error) {
      Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถอัปเดตสถานะได้" });
    }
  };

  const handleScanSuccess = async (scannedText, scannerInstance) => {
    if (scannerInstance && scannerInstance.isScanning) await scannerInstance.stop().catch(() => {});
    setIsScanning(false);

    const bookingCodeClean = scannedText.trim();
    const matchedPassenger = passengers.find(p => p.booking_code === bookingCodeClean);

    if (matchedPassenger) {
      if (matchedPassenger.status === 'ACTIVE') {
        await handleUpdateStatus(matchedPassenger.booking_code, 'COMPLETED');
        Swal.fire({ icon: "success", title: "เช็คอินเรียบร้อย", text: `ผู้โดยสาร: ${matchedPassenger.passenger_name}`, timer: 2000, showConfirmButton: false });
      } else {
        Swal.fire({ icon: "warning", title: "ตั๋วถูกใช้งานแล้ว", text: `สถานะปัจจุบัน: ${matchedPassenger.status}` });
      }
    } else {
      Swal.fire({ icon: "error", title: "ไม่พบข้อมูลตั๋ว", text: `QR Code ไม่ตรงกับรอบรถนี้` });
    }
  };

  const handleArriveAtStop = async (logCode, stopName) => {
    const confirm = await Swal.fire({
      title: `ถึงจุดจอด ${stopName}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยันถึงป้าย",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: mutRed
    });

    if (confirm.isConfirmed) {
      try {
        await axios.put(`${API_URL}/driver/trip-logs/${logCode}/arrive`);
        await fetchTripLogs(selectedSchedule); 
        if (user && user.user_code) {
          await fetchSchedules(user.user_code);
        }
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึกเวลาได้" });
      }
    }
  };

  // ----------------------------------------------------
  // การประมวลผลแท็บ และ การจัดกลุ่มประวัติ (Group By Date)
  // ----------------------------------------------------
  const activeSchedules = schedules.filter(s => s.status !== 'COMPLETED');
  const historySchedules = schedules.filter(s => s.status === 'COMPLETED');
  
  const activeScheduleObj = schedules.find(s => s.schedule_code === selectedSchedule);
  const nextStop = tripLogs.find(log => log.actual_time === null);
  const isScheduleFinished = activeScheduleObj?.status === 'COMPLETED';

  // แปลงวันที่เป็นภาษาไทย
  const formatThaiDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุวันที่';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Group ข้อมูลประวัติการเดินรถตามวัน
  const groupedHistory = historySchedules.reduce((groups, sch) => {
    const date = sch.travel_date || 'ไม่ระบุวันที่';
    if (!groups[date]) groups[date] = [];
    groups[date].push(sch);
    return groups;
  }, {});

  // เรียงลำดับวันล่าสุดขึ้นก่อน
  const sortedHistoryDates = Object.keys(groupedHistory).sort((a, b) => {
    if (a === 'ไม่ระบุวันที่') return 1;
    if (b === 'ไม่ระบุวันที่') return -1;
    return new Date(b) - new Date(a);
  });

  return (
    <div className="position-relative min-vh-100" style={{ backgroundColor: "#f3f4f6" }}>
      <div className="position-absolute top-0 start-0 w-100" style={{ height: '220px', backgroundColor: mutRed, zIndex: 0, borderBottomLeftRadius: '24px', borderBottomRightRadius: '24px' }}></div>

      <div className="position-relative" style={{ zIndex: 1 }}>
        <Navbar />

        <div className="driver-page">
          <div className="text-center text-white mb-4">
            <h2 className="fw-bold fs-3 mb-1">หน้าจอคนขับ</h2>
            <p className="opacity-75 small mb-0">MUT Shuttle Bus Driver</p>
          </div>

          {(!selectedSchedule || isChoosingSchedule) ? (
            <div className="driver-panel-card animate-fade-in">
              <h2 className="driver-section-title mb-3">
                <Calendar size={20} className="text-danger" /> เลือกรอบเดินรถประจำวัน
              </h2>

              <div className="driver-tabs">
                <button 
                  className={`driver-tab-btn ${scheduleTab === 'active' ? 'is-active' : ''}`}
                  onClick={() => setScheduleTab('active')}
                >
                  รอรับส่ง ({activeSchedules.length})
                </button>
                <button 
                  className={`driver-tab-btn ${scheduleTab === 'history' ? 'is-active' : ''}`}
                  onClick={() => setScheduleTab('history')}
                >
                  ประวัติ ({historySchedules.length})
                </button>
              </div>

              {/* แท็บ: รอรับส่ง (Active) */}
              {scheduleTab === 'active' && (
                activeSchedules.length === 0 ? (
                  <div className="text-center py-5 text-muted bg-light rounded-4 border border-dashed">
                    <Bus size={32} className="opacity-25 mb-2" />
                    <p className="mb-0 small">ไม่มีรอบการเดินรถที่ต้องดำเนินการ</p>
                  </div>
                ) : (
                  <div className="driver-schedule-list">
                    {activeSchedules.map((sch) => (
                      <div 
                        key={sch.schedule_code}
                        className="driver-schedule-item"
                        onClick={() => { setSelectedSchedule(sch.schedule_code); setIsChoosingSchedule(false); }}
                      >
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <span className="driver-schedule-time">{sch.start_time} น.</span>
                          <span className={`driver-schedule-state ${selectedSchedule === sch.schedule_code ? 'is-active' : ''}`}>
                            {selectedSchedule === sch.schedule_code ? 'กำลังปฏิบัติงาน' : 'รอดำเนินการ'}
                          </span>
                        </div>
                        <span className="driver-schedule-route text-truncate">{sch.route_name}</span>
                      </div>
                    ))}
                  </div>
                )
              )}

              {/* แท็บ: ประวัติการเดินรถ (History - Group By Date) */}
              {scheduleTab === 'history' && (
                historySchedules.length === 0 ? (
                  <div className="text-center py-5 text-muted bg-light rounded-4 border border-dashed">
                    <History size={32} className="opacity-25 mb-2" />
                    <p className="mb-0 small">ยังไม่มีประวัติการเดินรถที่สิ้นสุดแล้ว</p>
                  </div>
                ) : (
                  <div className="driver-schedule-list">
                    {sortedHistoryDates.map(date => (
                      <div key={date} className="mb-3">
                        <h6 className="fw-bold text-secondary mb-2 px-2" style={{ fontSize: '13px' }}>
                          <Calendar size={14} className="me-1 mb-1"/> {date !== 'ไม่ระบุวันที่' ? 'วันที่' : ''} {formatThaiDate(date)}
                        </h6>
                        <div className="d-flex flex-column gap-2">
                          {groupedHistory[date].map((sch) => (
                            <div 
                              key={sch.schedule_code}
                              className="driver-schedule-item opacity-75"
                              onClick={() => { setSelectedSchedule(sch.schedule_code); setIsChoosingSchedule(false); }}
                            >
                              <div className="d-flex justify-content-between align-items-center mb-1">
                                <span className="driver-schedule-time text-secondary">{sch.start_time} น.</span>
                                <span className="driver-schedule-state is-completed">สิ้นสุดการเดินรถ</span>
                              </div>
                              <span className="driver-schedule-route text-truncate">{sch.route_name}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              )}
            </div>
          ) : (
            
          /* ======================================
              ส่วนพื้นที่ทำงาน (Working Panel)
          ====================================== */
            <div className="animate-fade-in">
              <div className={`driver-panel-card py-3 px-3 d-flex justify-content-between align-items-center mb-3 border-start border-4 ${isScheduleFinished ? 'border-success' : 'border-danger'}`}>
                <div>
                  <div className={`fw-bold mb-1 ${isScheduleFinished ? 'text-success' : 'text-danger'}`} style={{ fontSize: "12px" }}>
                    {isScheduleFinished ? 'สิ้นสุดการให้บริการแล้ว' : 'รอบรถปัจจุบันกำลังให้บริการ'}
                  </div>
                  <div className="fw-bold fs-4 text-dark lh-1">{activeScheduleObj?.start_time} น.</div>
                </div>
                <button className="btn btn-sm btn-light text-secondary rounded-pill fw-bold border" onClick={() => setIsChoosingSchedule(true)}>
                  <RefreshCw size={14} className="me-1 mb-1"/> เปลี่ยนรอบ
                </button>
              </div>

              <div className="driver-panel-card">
                <h2 className="driver-section-title"><MapPin size={20} className="text-danger" /> จุดจอดรถ</h2>
                <div className="driver-stop-list">
                  {tripLogs.map((log, index) => {
                    const isArrived = log.actual_time !== null;
                    const isNext = nextStop && nextStop.log_code === log.log_code;
                    return (
                      <div key={log.log_code} className={`driver-stop-row ${isNext ? 'is-next' : ''}`}>
                        <div className={`driver-stop-info ${isArrived ? 'is-arrived' : ''}`}>
                          <div className={`driver-stop-marker ${isArrived ? 'is-arrived' : ''}`}>
                            {isArrived ? <Check size={14} /> : isNext ? <Bus size={14} /> : index + 1}
                          </div>
                          <div>
                            <h3>{log.stop_name}</h3>
                            {!isArrived && (
                              <span className="driver-eta-text"><Clock size={12} /> {log.expected_time}</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {!isScheduleFinished && nextStop ? (
                  <button className="driver-arrive-btn shadow-sm" onClick={() => handleArriveAtStop(nextStop.log_code, nextStop.stop_name)}>
                    <Navigation size={18} className="me-2" /> ยืนยันถึง: {nextStop.stop_name}
                  </button>
                ) : (
                  <div className="text-center fw-bold text-success bg-success bg-opacity-10 p-3 rounded-3 mt-3">
                    <CheckCircle2 size={20} className="me-2 mb-1" /> สิ้นสุดการเดินรถ
                  </div>
                )}
              </div>

              <div className="driver-panel-card mb-5">
                <button className="driver-passenger-toggle" onClick={() => setIsPassengerListOpen(!isPassengerListOpen)}>
                  <span className="d-flex align-items-center">
                    <Users size={20} className="text-danger me-2" /> ผู้โดยสาร
                    <span className="badge bg-danger ms-2 rounded-pill px-2">{passengers.filter(p => p.status === 'COMPLETED').length}/{passengers.length}</span>
                  </span>
                  <ChevronDown size={20} style={{ transform: isPassengerListOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                </button>

                {isPassengerListOpen && (
                  <div className="driver-passenger-list custom-scrollbar">
                    {loading ? (
                      <div className="text-center py-4 text-muted">กำลังโหลดข้อมูล...</div>
                    ) : passengers.length === 0 ? (
                      <div className="text-center py-4 text-muted bg-light rounded-3 border border-dashed">ไม่มีผู้โดยสารจองรอบนี้</div>
                    ) : (
                      passengers.map((p) => (
                        <div key={p.booking_code} className={`driver-passenger-row ${p.status !== 'ACTIVE' ? 'is-complete' : ''}`}>
                          <div className="driver-passenger-details">
                            <h3>{p.passenger_name}</h3>
                            <span className="text-muted small">รหัส: {p.booking_code}</span>
                          </div>
                          <div className="d-flex align-items-center gap-2">
                            {p.status === 'ACTIVE' ? (
                              <>
                                <button className="driver-checkin-btn" onClick={() => handleUpdateStatus(p.booking_code, 'COMPLETED')}><Check size={14} /></button>
                                <button className="driver-noshow-btn" onClick={() => handleUpdateStatus(p.booking_code, 'NO_SHOW')}><UserX size={14} /></button>
                              </>
                            ) : (
                              <span className={`driver-status ${p.status === 'COMPLETED' ? 'driver-status-complete' : 'bg-light text-muted'}`}>
                                {p.status === 'COMPLETED' ? 'เช็คอินแล้ว' : 'ไม่มา'}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
              <div style={{ height: "40px" }}></div>
            </div>
          )}
        </div>
      </div>

      {selectedSchedule && !isChoosingSchedule && !isScheduleFinished && (
        <div className="driver-floating-bar animate-fade-in-up">
          <button className="btn-massive-scan" onClick={() => setIsScanning(true)}>
            <QrCode size={24} /> สแกนตั๋ว QR Code
          </button>
        </div>
      )}

      {isScanning && (
        <div className="driver-scan-overlay">
          <div className="driver-scan-header w-100">
            <h2>สแกนตั๋วผู้โดยสาร</h2>
            <button className="driver-close-scan" onClick={() => setIsScanning(false)}><X size={24} /></button>
          </div>
          <div id="real-qr-reader" className="driver-qr-reader"></div>
          <div className="text-center text-white p-4 pb-5 w-100" style={{ background: 'rgba(0,0,0,0.8)' }}>
            <p className="mb-0">กรุณาหันกล้องให้เห็น QR Code ชัดเจน<br/>ระบบจะเช็คอินให้อัตโนมัติ</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Driver;