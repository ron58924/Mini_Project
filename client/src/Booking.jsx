import React, { useState, useEffect } from 'react';
import Navbar from './Navbar'; 
import './Booking.css'; 

// ดึง useAuth เข้ามาใช้งาน (ปรับ Path ให้ตรงกับที่เก็บไฟล์ AuthContext ของคุณ)
import { useAuth } from './context/AuthContext'; 

const Booking = () => {
  // เรียกใช้งานข้อมูล user จาก Context
  const { user } = useAuth();

  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [schedules, setSchedules] = useState([]);

  const [selectedRoute, setSelectedRoute] = useState('');
  const [pickupStop, setPickupStop] = useState('');
  const [dropoffStop, setDropoffStop] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);

  // ดึงข้อมูลเส้นทางตั้งแต่เริ่มโหลดหน้า
  useEffect(() => {
    fetch('http://localhost:5000/api/booking/routes')
      .then(res => res.json())
      .then(data => setRoutes(data))
      .catch(err => console.error(err));
  }, []);

  // ดึงข้อมูลป้ายและรอบรถ เมื่อมีการเลือกเส้นทาง
  useEffect(() => {
    if (selectedRoute) {
      fetch(`http://localhost:5000/api/booking/routes/${selectedRoute}/stops`)
        .then(res => res.json())
        .then(data => setStops(data));

      fetch(`http://localhost:5000/api/booking/schedules/${selectedRoute}`)
        .then(res => res.json())
        .then(data => setSchedules(data));
        
      // เคลียร์ค่าที่เลือกไว้เดิมเมื่อเปลี่ยนเส้นทาง
      setPickupStop('');
      setDropoffStop('');
      setSelectedSchedule('');
    }
  }, [selectedRoute]);

  const handleSubmit = async (e) => {
    e.preventDefault();

    // เช็คว่าผู้ใช้ล็อกอินอยู่หรือไม่
    if (!user || !user.user_code) {
      alert('กรุณาเข้าสู่ระบบก่อนทำการจอง');
      return;
    }

    if (!selectedRoute || !pickupStop || !dropoffStop || !selectedSchedule) {
      alert('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    // ใช้ user_code จากระบบ Login จริง
    const payload = {
      user_code: user.user_code,
      schedule_code: selectedSchedule,
      pickup_stop_code: pickupStop,
      dropoff_stop_code: dropoffStop,
      passenger_count: passengerCount
    };

    try {
      const response = await fetch('http://localhost:5000/api/booking/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const result = await response.json();
      
      if (response.ok) {
        alert(`จองสำเร็จ! รหัสการจอง: ${result.booking_code}\nQR Code: ${result.qr_code}`);
        // รีเซ็ตฟอร์มหลังจากจองเสร็จ
        setSelectedRoute('');
        setPickupStop('');
        setDropoffStop('');
        setSelectedSchedule('');
        setPassengerCount(1);
      } else {
        alert(`เกิดข้อผิดพลาด: ${result.message}`);
      }
    } catch (err) {
      console.error(err);
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
  };

  return (
    <>
      <Navbar />
      
      <div className="booking-page-wrapper">
        <div className="booking-card">
          
          <div className="booking-header">
            <h2 className="booking-title">จองตั๋วโดยสาร</h2>
            {/* แสดงชื่อผู้ใช้งานที่กำลังจอง */}
            <p className="booking-subtitle">
              ผู้ใช้งาน: {user ? `${user.first_name}` : 'กำลังโหลด...'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="booking-form">
            
            <div className="form-group">
              <label className="form-label">สายการเดินรถ</label>
              <select 
                className="form-control"
                value={selectedRoute}
                onChange={(e) => setSelectedRoute(e.target.value)}
              >
                <option value="">-- กรุณาเลือกเส้นทาง --</option>
                {routes.map(route => (
                  <option key={route.route_code} value={route.route_code}>
                    {route.route_name}
                  </option>
                ))}
              </select>
            </div>

            {selectedRoute && (
              <div className="fade-in-down">
                
                <div className="form-row">
                  <div className="form-group half-width">
                    <label className="form-label">จุดขึ้นรถ</label>
                    <select 
                      className="form-control"
                      value={pickupStop}
                      onChange={(e) => setPickupStop(e.target.value)}
                    >
                      <option value="">-- จุดขึ้นรถ --</option>
                      {stops.map(stop => (
                        <option key={`pickup-${stop.stop_code}`} value={stop.stop_code}>
                          {stop.stop_order}. {stop.stop_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group half-width">
                    <label className="form-label">จุดลงรถ</label>
                    <select 
                      className="form-control"
                      value={dropoffStop}
                      onChange={(e) => setDropoffStop(e.target.value)}
                    >
                      <option value="">-- จุดลงรถ --</option>
                      {stops.map(stop => (
                        <option key={`dropoff-${stop.stop_code}`} value={stop.stop_code}>
                          {stop.stop_order}. {stop.stop_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group half-width">
                    <label className="form-label">เวลารถออก</label>
                    <select 
                      className="form-control"
                      value={selectedSchedule}
                      onChange={(e) => setSelectedSchedule(e.target.value)}
                    >
                      <option value="">-- เลือกรอบเวลา --</option>
                      {schedules.map(sch => (
                        <option key={sch.schedule_code} value={sch.schedule_code}>
                          รอบ {sch.start_time} น.
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group half-width">
                    <label className="form-label">จำนวนผู้โดยสาร</label>
                    <input 
                      type="number" 
                      min="1"
                      className="form-control"
                      value={passengerCount}
                      onChange={(e) => setPassengerCount(parseInt(e.target.value))}
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="form-submit-container">
              <button 
                type="submit" 
                className="btn-submit"
                disabled={!selectedRoute || !pickupStop || !dropoffStop || !selectedSchedule}
              >
                ยืนยันการจองที่นั่ง
              </button>
            </div>

          </form>
        </div>
      </div>
    </>
  );
};

export default Booking;