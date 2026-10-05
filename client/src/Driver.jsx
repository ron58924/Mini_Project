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
  X, Clock, Navigation, Check, UserX, RefreshCw, History, Upload, FileText
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
  
  // [เพิ่มใหม่] State สำหรับจัดการแท็บรายชื่อผู้โดยสาร
  const [passengerTab, setPassengerTab] = useState('waiting');

  const html5QrCodeRef = useRef(null);
  const { user } = useAuth(); 
  const mutRed = '#c8102e';
  const [manualCode, setManualCode] = useState("");

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
      setPassengerTab('waiting'); // รีเซ็ตกลับไปหน้าคนรอขึ้นรถเวลาเปลี่ยนรอบ
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
          { facingMode: "user" }, 
          { fps: 15, qrbox: { width: 250, height: 250 } },
          (decodedText) => { handleScanSuccess(decodedText, currentScanner); },
          (errorMessage) => { }
        ).catch((err) => {
          console.error("Camera error:", err);
          Swal.fire({ icon: "error", title: "เปิดกล้องไม่สำเร็จ", text: "กรุณาใช้ช่องกรอกรหัสด้านล่างแทนครับ" });
          setIsScanning(false);
        });
      }, 300); 
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
      // อัปเดตข้อมูลผู้โดยสารในแอปทันที
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
    const matchedPassenger = passengers.find(p => p.qr_code === bookingCodeClean || p.booking_code === bookingCodeClean || p.detail_code === bookingCodeClean);

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

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        
        const decodedText = await html5QrCodeRef.current.scanFile(file, true);
        handleScanSuccess(decodedText, html5QrCodeRef.current);
        
      } catch (err) {
        console.error("Error scanning file:", err);
        Swal.fire({
          icon: "error",
          title: "สแกนไม่สำเร็จ",
          text: "ระบบไม่พบ QR Code ในรูปภาพนี้ หรือภาพอาจไม่ชัดเจนครับ",
        });
        
        setIsScanning(false);
      }
    }
  };

  const handleArriveAtStop = async (logCode, stopName) => {
    const confirm = await Swal.fire({
      title: `ถึงจุดจอด ${stopName}?`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "ยืนยัน",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: mutRed
    });

    if (confirm.isConfirmed) {
      try {
        await axios.put(`${API_URL}/driver/trip-logs/${logCode}/arrive`);
        await fetchTripLogs(selectedSchedule); 
        if (user && user.user_code) await fetchSchedules(user.user_code);
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึกเวลาได้" });
      }
    }
  };

  const handleDepartAtStop = async (logCode, stopName) => {
    const confirm = await Swal.fire({
      title: `ออกรถจาก ${stopName}?`,
      text: "ผู้โดยสารที่ยังไม่สแกนตั๋วจะถูกปรับเป็น No Show ทันที",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ยืนยันออกรถ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: '#f59e0b'
    });

    if (confirm.isConfirmed) {
      try {
        await axios.put(`${API_URL}/driver/trip-logs/${logCode}/depart`);
        await fetchTripLogs(selectedSchedule); 
        await fetchPassengers(selectedSchedule); 
        if (user && user.user_code) await fetchSchedules(user.user_code);
      } catch (error) {
        Swal.fire({ icon: "error", title: "เกิดข้อผิดพลาด", text: "ไม่สามารถบันทึกเวลาได้" });
      }
    }
  };

  const handleCloseJob = async (scheduleCode) => {
    try {
      const summaryRes = await axios.get(`${API_URL}/driver/schedules/${scheduleCode}/summary`);
      const data = summaryRes.data;

      const result = await Swal.fire({
        title: 'ยืนยันการปิดรอบเดินรถ?',
        html: `
          <div style="text-align: left; background: #f8f9fa; padding: 15px; border-radius: 10px; margin-top: 10px;">
            <p style="margin-bottom: 8px;">👥 <b>ยอดจองทั้งหมด:</b> ${data.total_booked} ที่นั่ง</p>
            <p style="margin-bottom: 8px; color: green;">✅ <b>สแกนขึ้นรถจริง:</b> ${data.total_boarded} ที่นั่ง</p>
            <p style="margin-bottom: 8px; color: red;">❌ <b>ยกเลิก / ไม่มา:</b> ${data.total_no_show + data.total_cancelled} ที่นั่ง</p>
            ${data.total_pending > 0 ? `<hr/><p style="color: orange; margin-bottom: 0; font-size: 14px;">⚠️ <b>พบผู้โดยสารค้างในระบบ ${data.total_pending} ที่นั่ง</b><br><small>(ระบบจะตัดเป็น ไม่มาแสดงตัว ทันที)</small></p>` : ''}
          </div>
        `,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: mutRed, 
        cancelButtonColor: '#6c757d',
        confirmButtonText: 'ยืนยันปิดรอบรถ',
        cancelButtonText: 'กลับไปตรวจสอบ'
      });

      if (result.isConfirmed) {
        await axios.put(`${API_URL}/driver/schedules/${scheduleCode}/complete`);
        Swal.fire('ปิดงานสำเร็จ!', 'รอบรถนี้ถูกบันทึกเป็นที่เรียบร้อย', 'success');
        if (user && user.user_code) await fetchSchedules(user.user_code);
        setIsChoosingSchedule(true);
      }
    } catch (error) {
      Swal.fire('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์เพื่อปิดรอบรถได้', 'error');
    }
  };

  const activeSchedules = schedules.filter(s => s.status !== 'COMPLETED');
  const historySchedules = schedules.filter(s => s.status === 'COMPLETED');
  
  const activeScheduleObj = schedules.find(s => s.schedule_code === selectedSchedule);
  
  const currentStop = tripLogs.find(log => log.depart_time === null);
  const isScheduleFinished = activeScheduleObj?.status === 'COMPLETED';

  const formatThaiDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุวันที่';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' });
  };

  const groupedHistory = historySchedules.reduce((groups, sch) => {
    const date = sch.travel_date || 'ไม่ระบุวันที่';
    if (!groups[date]) groups[date] = [];
    groups[date].push(sch);
    return groups;
  }, {});

  const sortedHistoryDates = Object.keys(groupedHistory).sort((a, b) => {
    if (a === 'ไม่ระบุวันที่') return 1;
    if (b === 'ไม่ระบุวันที่') return -1;
    return new Date(b) - new Date(a);
  });

  const groupedActive = activeSchedules.reduce((groups, sch) => {
    const date = sch.travel_date || 'ไม่ระบุวันที่';
    if (!groups[date]) groups[date] = [];
    groups[date].push(sch);
    return groups;
  }, {});

  const sortedActiveDates = Object.keys(groupedActive).sort((a, b) => {
    if (a === 'ไม่ระบุวันที่') return 1;
    if (b === 'ไม่ระบุวันที่') return -1;
    return new Date(a) - new Date(b); 
  });
  
  const todayObj = new Date();
  const todayStr = `${todayObj.getFullYear()}-${String(todayObj.getMonth() + 1).padStart(2, '0')}-${String(todayObj.getDate()).padStart(2, '0')}`;
  
  // ==========================================
  // [เพิ่มใหม่] คำนวณยอดผู้โดยสารสำหรับแสดงในแท็บ
  // ==========================================
  const countWaiting = passengers.filter(p => p.status === 'ACTIVE').length;
  const countBoarded = passengers.filter(p => p.status === 'COMPLETED').length;
  const countMissed = passengers.filter(p => p.status === 'NO_SHOW' || p.status === 'CANCELLED').length;
  const countTotal = passengers.length;

  const filteredPassengers = passengers.filter(p => {
    if (passengerTab === 'waiting') return p.status === 'ACTIVE';
    if (passengerTab === 'boarded') return p.status === 'COMPLETED';
    if (passengerTab === 'missed') return p.status === 'NO_SHOW' || p.status === 'CANCELLED';
    return true; // 'all'
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
                <button className={`driver-tab-btn ${scheduleTab === 'active' ? 'is-active' : ''}`} onClick={() => setScheduleTab('active')}>
                  รอรับส่ง ({activeSchedules.length})
                </button>
                <button className={`driver-tab-btn ${scheduleTab === 'history' ? 'is-active' : ''}`} onClick={() => setScheduleTab('history')}>
                  ประวัติ ({historySchedules.length})
                </button>
              </div>

              {scheduleTab === 'active' && (
                activeSchedules.length === 0 ? (
                  <div className="text-center py-5 text-muted bg-light rounded-4 border border-dashed">
                    <Bus size={32} className="opacity-25 mb-2" />
                    <p className="mb-0 small">ไม่มีรอบการเดินรถที่ต้องดำเนินการ</p>
                  </div>
                ) : (
                  <div className="driver-schedule-list">
                    {sortedActiveDates.map(date => {
                      const isToday = date === todayStr; 
                      const isFuture = date !== 'ไม่ระบุวันที่' && date > todayStr;
                      
                      return (
                        <div key={date} className="mb-3">
                          <div className="d-flex align-items-center mb-2 px-1">
                            <span 
                              className={`badge rounded-pill px-3 py-2 fw-bold shadow-sm ${isToday ? 'bg-danger text-white' : 'bg-danger bg-opacity-10 text-danger'}`} 
                              style={{ fontSize: '12px' }}
                            >
                              <Calendar size={14} className="me-1 mb-1"/> 
                              {isToday ? '📌 วันนี้ ' : (date !== 'ไม่ระบุวันที่' ? 'วันที่ ' : '')} 
                              {formatThaiDate(date)}
                            </span>
                          </div>
                          
                          <div className="d-flex flex-column gap-2">
                            {groupedActive[date].map((sch) => (
                              <div 
                                key={sch.schedule_code} 
                                className={`driver-schedule-item ${isFuture ? 'opacity-50' : ''}`} 
                                style={{ 
                                  cursor: isFuture ? 'not-allowed' : 'pointer', 
                                  backgroundColor: isFuture ? '#f9fafb' : '' 
                                }}
                                onClick={() => { 
                                  if (isFuture) {
                                    Swal.fire({
                                      icon: 'info',
                                      title: 'ยังไม่ถึงรอบให้บริการ',
                                      text: 'คุณสามารถเริ่มงานรอบนี้ได้เมื่อถึงวันที่กำหนดเท่านั้น',
                                      timer: 2000,
                                      showConfirmButton: false,
                                      position: 'center'
                                    });
                                  } else {
                                    setSelectedSchedule(sch.schedule_code); 
                                    setIsChoosingSchedule(false); 
                                  }
                                }}
                              >
                                <div className="d-flex justify-content-between align-items-center mb-1">
                                  <span className="driver-schedule-time">{sch.start_time} น.</span>
                                  <span className={`driver-schedule-state ${selectedSchedule === sch.schedule_code ? 'is-active' : ''} ${isFuture ? 'bg-secondary text-white' : ''}`}>
                                    {isFuture ? 'ยังไม่ถึงรอบ' : (selectedSchedule === sch.schedule_code ? 'กำลังปฏิบัติงาน' : 'รอดำเนินการ')}
                                  </span>
                                </div>
                                <span className="driver-schedule-route text-truncate">{sch.route_name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )
              )}

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
                            <div key={sch.schedule_code} className="driver-schedule-item opacity-75" onClick={() => { setSelectedSchedule(sch.schedule_code); setIsChoosingSchedule(false); }}>
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
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h2 className="driver-section-title mb-0"><MapPin size={20} className="text-danger" /> จุดจอดรถ</h2>
                  
                  {!isScheduleFinished && (!currentStop || (tripLogs.length > 0 && currentStop.log_code === tripLogs[tripLogs.length - 1].log_code && currentStop.actual_time !== null)) && (
                     <button className="btn btn-sm btn-outline-danger fw-bold rounded-pill" onClick={() => handleCloseJob(selectedSchedule)}>
                       <FileText size={14} className="me-1 mb-1"/> สรุปและปิดรอบเดินรถ
                     </button>
                  )}
                </div>
                
                <div className="driver-stop-list">
                  {tripLogs.map((log, index) => {
                    const isArrived = log.actual_time !== null && log.actual_time !== undefined;
                    const isDeparted = log.depart_time !== null && log.depart_time !== undefined;
                    const isCurrent = currentStop && currentStop.log_code === log.log_code;
                    
                    return (
                      <div key={log.log_code} className={`driver-stop-row ${isCurrent ? 'is-next' : ''}`}>
                        <div className={`driver-stop-info ${isArrived ? 'is-arrived' : ''}`}>
                          <div className={`driver-stop-marker ${isArrived ? 'is-arrived' : ''}`}>
                            {isDeparted ? <Check size={14} /> : isCurrent ? <Bus size={14} /> : index + 1}
                          </div>
                          <div>
                            <h3 className={isCurrent ? 'text-danger fw-bold mb-1' : 'mb-1'}>{log.stop_name}</h3>
                            
                            {!isArrived && (
                              <div className="text-muted small d-flex align-items-center">
                                <Clock size={12} className="me-1" /> คาดว่าจะถึง: {log.expected_time} น.
                              </div>
                            )}
                            
                            {isArrived && !isDeparted && (
                              <div className="badge bg-warning text-dark mt-1 px-2 py-1">กำลังจอดรับผู้โดยสาร...</div>
                            )}

                            {isDeparted && (
                              <div className="text-muted small mt-1">
                                ออกรถแล้ว: <span className="fw-bold text-success">{log.depart_time} น.</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                
                {!isScheduleFinished && currentStop ? (
                  currentStop.actual_time === null ? (
                    <button className="driver-arrive-btn shadow-sm mt-4" onClick={() => handleArriveAtStop(currentStop.log_code, currentStop.stop_name)}>
                      <Navigation size={18} className="me-2" /> ยืนยันถึงป้าย: {currentStop.stop_name}
                    </button>
                  ) : (
                    <button className="btn w-100 py-3 rounded-4 fw-bold shadow-sm text-white fs-6 mt-4" style={{ backgroundColor: '#f59e0b' }} onClick={() => handleDepartAtStop(currentStop.log_code, currentStop.stop_name)}>
                      <Navigation size={18} className="me-2" /> ยืนยันออกรถจาก: {currentStop.stop_name}
                    </button>
                  )
                ) : (
                  <div className="text-center fw-bold text-success bg-success bg-opacity-10 p-3 rounded-3 mt-4">
                    <CheckCircle2 size={20} className="me-2 mb-1" /> สิ้นสุดการเดินรถ
                  </div>
                )}
              </div>

            <div className="driver-panel-card mb-5 pb-2">
                <button className="driver-passenger-toggle" onClick={() => setIsPassengerListOpen(!isPassengerListOpen)} style={{ background: 'none', border: 'none', width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0' }}>
                  <span className="d-flex align-items-center fw-bold fs-5">
                    <Users size={20} className="text-danger me-2" /> รายชื่อผู้โดยสาร
                  </span>
                  <div className="d-flex align-items-center">
                    {/* ป้ายแสดงสถานะตามรูปภาพ (ใช้บริการ X/Y คน) */}
                    <span className="badge bg-danger bg-opacity-10 text-danger border border-danger rounded-pill px-3 py-2 me-3" style={{ fontSize: '13px', fontWeight: 'bold' }}>
                      ใช้บริการ {countBoarded}/{countTotal} คน
                    </span>
                    <ChevronDown size={20} className="text-dark" style={{ transform: isPassengerListOpen ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />
                  </div>
                </button>

                {isPassengerListOpen && (
                  <div className="animate-fade-in mt-4 border-top pt-4">
                    
                    {/* แถบเมนู (Tabs) แยกประเภทผู้โดยสาร */}
                    <div className="d-flex gap-2 overflow-auto pb-2 mb-3 hide-scrollbar">
                      <button 
                        onClick={() => setPassengerTab('waiting')} 
                        className={`btn rounded-pill px-3 py-1 small fw-bold border-0 text-nowrap ${passengerTab === 'waiting' ? 'bg-warning text-dark shadow-sm' : 'bg-light text-secondary'}`}
                      >
                        รอขึ้นรถ ({countWaiting})
                      </button>
                      <button 
                        onClick={() => setPassengerTab('boarded')} 
                        className={`btn rounded-pill px-3 py-1 small fw-bold border-0 text-nowrap ${passengerTab === 'boarded' ? 'bg-success text-white shadow-sm' : 'bg-light text-secondary'}`}
                      >
                        เช็คอินแล้ว ({countBoarded})
                      </button>
                      <button 
                        onClick={() => setPassengerTab('missed')} 
                        className={`btn rounded-pill px-3 py-1 small fw-bold border-0 text-nowrap ${passengerTab === 'missed' ? 'bg-secondary text-white shadow-sm' : 'bg-light text-secondary'}`}
                      >
                        ไม่มา/ยกเลิก ({countMissed})
                      </button>
                      <button 
                        onClick={() => setPassengerTab('all')} 
                        className={`btn rounded-pill px-3 py-1 small fw-bold border-0 text-nowrap ${passengerTab === 'all' ? 'text-white shadow-sm' : 'bg-light text-secondary'}`} 
                        style={{ backgroundColor: passengerTab === 'all' ? mutRed : '' }}
                      >
                        ทั้งหมด ({countTotal})
                      </button>
                    </div>

                    <div className="driver-passenger-list custom-scrollbar" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                      {loading ? (
                        <div className="text-center py-4 text-muted">กำลังโหลดข้อมูล...</div>
                      ) : filteredPassengers.length === 0 ? (
                        <div className="text-center py-4 text-muted bg-light rounded-3 border border-dashed">ไม่มีผู้โดยสารในสถานะนี้</div>
                      ) : (
                        filteredPassengers.map((p, i) => (
                          <div key={p.booking_code + "-" + i} className={`driver-passenger-row ${p.status !== 'ACTIVE' ? 'is-complete' : ''}`}>
                            <div className="driver-passenger-details">
                              <h3 className={p.status === 'NO_SHOW' || p.status === 'CANCELLED' ? 'text-decoration-line-through text-muted' : ''}>{p.passenger_name}</h3>
                              <span className="text-muted small">รหัส: {p.booking_code}</span>
                            </div>
                            <div className="d-flex align-items-center gap-2">
                              {p.status === 'ACTIVE' ? (
                                <>
                                  <button className="driver-checkin-btn" onClick={() => handleUpdateStatus(p.booking_code, 'COMPLETED')}><Check size={14} /></button>
                                  <button className="driver-noshow-btn" onClick={() => handleUpdateStatus(p.booking_code, 'NO_SHOW')}><UserX size={14} /></button>
                                </>
                              ) : (
                                <span className={`driver-status ${p.status === 'COMPLETED' ? 'driver-status-complete' : (p.status === 'NO_SHOW' ? 'bg-secondary text-white' : 'bg-light text-muted')}`}>
                                  {p.status === 'COMPLETED' ? 'เช็คอินแล้ว' : (p.status === 'NO_SHOW' ? 'ไม่มา' : 'ยกเลิก')}
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
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
            <p className="mb-3 small">หันกล้องให้เห็น QR Code หรืออัปโหลดรูปภาพสลิปตั๋ว</p>
            
            <div className="d-flex flex-column gap-3 justify-content-center mx-auto" style={{ maxWidth: '300px' }}>
              
              <div className="w-100">
                <input 
                  type="file" 
                  id="qr-upload" 
                  accept="image/*" 
                  className="d-none" 
                  onChange={handleImageUpload} 
                />
                <label htmlFor="qr-upload" className="btn btn-outline-light w-100 fw-bold d-flex align-items-center justify-content-center py-2" style={{ cursor: 'pointer' }}>
                  <Upload size={18} className="me-2" /> เลือกรูป QR Code ในเครื่อง
                </label>
              </div>

              <div className="text-white-50 small" style={{ fontSize: '11px' }}>- หรือกรอกรหัสด้วยมือ -</div>

              <div className="d-flex gap-2">
                <input 
                  type="text" 
                  className="form-control text-center fw-bold" 
                  placeholder="เช่น BK12345678" 
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  style={{ textTransform: 'uppercase' }}
                />
                <button 
                  className="btn text-white fw-bold px-3" 
                  style={{ backgroundColor: mutRed, whiteSpace: 'nowrap' }}
                  onClick={() => {
                    if(!manualCode) return;
                    handleScanSuccess(manualCode.toUpperCase(), html5QrCodeRef.current);
                    setManualCode(""); 
                  }}
                >
                  ยืนยัน
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Driver;