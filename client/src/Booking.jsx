import React, { useState, useEffect } from 'react';
import Navbar from './Navbar'; 
import './Booking.css'; 
import { useAuth } from './context/AuthContext'; 

const Booking = () => {
  const { user } = useAuth();

  // ================= State สำหรับระบบ Tab =================
  const [activeTab, setActiveTab] = useState('booking'); // 'booking' | 'history'

  // ================= State สำหรับการจอง (เดิม) =================
  const [routes, setRoutes] = useState([]);
  const [stops, setStops] = useState([]);
  const [schedules, setSchedules] = useState([]);
  const [isLoadingSchedules, setIsLoadingSchedules] = useState(false);

  const [selectedRoute, setSelectedRoute] = useState('');
  const [pickupOrder, setPickupOrder] = useState('');
  const [dropoffOrder, setDropoffOrder] = useState('');
  const [selectedSchedule, setSelectedSchedule] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);

  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ================= State สำหรับประวัติการเดินทาง =================
  const [historyBookings, setHistoryBookings] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('ACTIVE'); // ACTIVE, COMPLETED, CANCELLED, ALL

  // Fetch ข้อมูลเริ่มต้น (Routes)
  useEffect(() => {
    fetch('http://localhost:5000/api/booking/routes')
      .then(res => res.json())
      .then(data => setRoutes(data))
      .catch(err => console.error(err));
  }, []);

  // Fetch จุดจอดเมื่อเปลี่ยนสายรถ
  useEffect(() => {
    if (selectedRoute) {
      fetch(`http://localhost:5000/api/booking/routes/${selectedRoute}/stops`)
        .then(res => res.json())
        .then(data => setStops(data));

      setPickupOrder('');
      setDropoffOrder('');
      setSelectedSchedule('');
      setSchedules([]);
    }
  }, [selectedRoute]);

  // Fetch รอบรถและที่นั่งว่าง
  useEffect(() => {
    if (!selectedRoute || !pickupOrder || !dropoffOrder) {
      setSchedules([]);
      return;
    }
    
    setIsLoadingSchedules(true);
    const localDate = new Date();
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    const today = localDate.toISOString().split('T')[0]; 
    
    const url = `http://localhost:5000/api/booking/schedules/${selectedRoute}/availability?pickup_order=${pickupOrder}&dropoff_order=${dropoffOrder}&travel_date=${today}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => setSchedules(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoadingSchedules(false));
  }, [selectedRoute, pickupOrder, dropoffOrder]);

  // Fetch ประวัติการจองเมื่อเปลี่ยนมา Tab ประวัติ หรือเมื่อ user เปลี่ยน
  useEffect(() => {
    if (activeTab === 'history' && user?.user_code) {
      fetchHistoryBookings();
    }
  }, [activeTab, user]);

  const fetchHistoryBookings = () => {
    fetch(`http://localhost:5000/api/user/bookings/${user.user_code}`)
      .then(res => res.json())
      .then(data => setHistoryBookings(data))
      .catch(err => console.error(err));
  };

  // ================= ฟังก์ชัน Helper =================
  const getStopName = (order) => {
    const found = stops.find(s => s.stop_order === parseInt(order));
    return found ? found.stop_name : order;
  };

  const getRouteName = (routeCode) => {
    const found = routes.find(r => r.route_code === routeCode);
    return found ? found.route_name : routeCode;
  };

  const getScheduleTime = (scheduleCode) => {
    const found = schedules.find(s => s.schedule_code === scheduleCode);
    return found ? found.start_time : scheduleCode;
  };

  // ================= ฟังก์ชันการทำงาน (Actions) =================
  const handleAddToCart = (e) => {
      e.preventDefault();

      if (!selectedRoute || !pickupOrder || !dropoffOrder || !selectedSchedule) {
        alert('กรุณากรอกข้อมูลการเดินทางให้ครบถ้วน');
        return;
      }

      // 1. คำนวณที่นั่งที่จองไปแล้วและสถานะยัง ACTIVE ในระบบ
      const activeSeatsInDB = historyBookings
        .filter(b => b.status === 'ACTIVE')
        .reduce((sum, b) => sum + b.passenger_count, 0);

      // 2. คำนวณที่นั่งที่อยู่ในตะกร้าตอนนี้
      const seatsInCart = cart.reduce((sum, item) => sum + item.passenger_count, 0);

      // 3. รวมทั้งหมด (ในระบบ + ในตะกร้า + ที่กำลังจะกด)
      const totalRequestedSeats = activeSeatsInDB + seatsInCart + passengerCount;

      // 4. เช็คโควต้า
      if (totalRequestedSeats > 4) {
        alert(`ไม่สามารถจองได้! โควต้าของคุณจำกัดสูงสุด 4 ที่นั่ง\n(ปัจจุบันจองแล้ว ${activeSeatsInDB} ที่นั่ง, ในตะกร้า ${seatsInCart} ที่นั่ง)`);
        return;
      }

      const newItem = {
        id: Date.now(),
        route_code: selectedRoute,
        route_name: getRouteName(selectedRoute),
        schedule_code: selectedSchedule,
        schedule_time: getScheduleTime(selectedSchedule),
        pickup_order: parseInt(pickupOrder),
        pickup_name: getStopName(pickupOrder),
        dropoff_order: parseInt(dropoffOrder),
        dropoff_name: getStopName(dropoffOrder),
        passenger_count: passengerCount
      };

      setCart([...cart, newItem]);
      setPickupOrder('');
      setDropoffOrder('');
      setSelectedSchedule('');
      setSchedules([]);
    };
  const handleRemoveItem = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleConfirmCheckout = async () => {
    if (!user || !user.user_code) {
      alert('กรุณาเข้าสู่ระบบก่อนทำการจอง');
      return;
    }

    if (cart.length === 0) {
      alert('ไม่มีรายการในตะกร้า');
      return;
    }

    setIsSubmitting(true);
    let successCount = 0;
    let failMessages = [];

    try {
      for (const item of cart) {
        const payload = {
          user_code: user.user_code,
          schedule_code: item.schedule_code,
          pickup_order: item.pickup_order,
          dropoff_order: item.dropoff_order,
          passenger_count: item.passenger_count
        };

        const response = await fetch('http://localhost:5000/api/bookings/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const result = await response.json();
        if (response.ok) {
          successCount++;
        } else {
          failMessages.push(`รอบ ${item.schedule_time}: ${result.message}`);
        }
      }

      if (successCount === cart.length) {
        alert(`จองสำเร็จทั้งหมด ${successCount} รายการ!`);
        setCart([]);
        setSelectedRoute('');
        setActiveTab('history'); // ย้ายไปหน้าประวัติอัตโนมัติเมื่อจองสำเร็จ
      } else {
        alert(`จองสำเร็จ ${successCount} รายการ, ล้มเหลวบางรายการ:\n${failMessages.join('\n')}`);
      }
    } catch (err) {
      console.error(err);
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingCode) => {
    if (!window.confirm('คุณต้องการยกเลิกการเดินทางนี้ใช่หรือไม่? ที่นั่งจะถูกคืนกลับระบบทันที')) return;

    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${bookingCode}/cancel`, {
        method: 'PUT'
      });
      const data = await res.json();
      if (res.ok) {
        alert(data.message);
        fetchHistoryBookings(); // รีเฟรชข้อมูลประวัติหลังยกเลิกสำเร็จ
      } else {
        alert(data.message);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อเซิร์ฟเวอร์');
    }
  };

  // กรองประวัติการเดินทางตาม Tab ที่เลือก
  const filteredBookings = historyFilter === 'ALL' 
    ? historyBookings 
    : historyBookings.filter(b => b.status === historyFilter);

  return (
    <>
      <Navbar />
      <div className="booking-page-wrapper">
        <div className="booking-card" style={{ maxWidth: '800px', width: '100%' }}>
          
          <div className="booking-header">
            <h2 className="booking-title">บริการรถรับส่ง (Shuttle Bus)</h2>
            <p className="booking-subtitle">
              ผู้ใช้งาน: {user ? `${user.first_name}` : 'กรุณาเข้าสู่ระบบ'}
            </p>
          </div>

          {/* ================= เมนู Tabs สลับหน้า ================= */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
            <button 
              onClick={() => setActiveTab('booking')}
              style={tabStyle(activeTab === 'booking')}
            >
              🚐 จองตั๋วโดยสาร
            </button>
            <button 
              onClick={() => setActiveTab('history')}
              style={tabStyle(activeTab === 'history')}
            >
              📝 ประวัติการเดินทาง
            </button>
          </div>

          {/* ================= ส่วนที่ 1: หน้าจองตั๋ว ================= */}
          {activeTab === 'booking' && (
            <>
              <form onSubmit={handleAddToCart} className="booking-form">
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
                          value={pickupOrder}
                          onChange={(e) => {
                            setPickupOrder(e.target.value);
                            setDropoffOrder(''); 
                            setSelectedSchedule('');
                          }}
                        >
                          <option value="">-- จุดขึ้นรถ --</option>
                          {stops.map(stop => (
                            <option key={`pickup-${stop.stop_order}`} value={stop.stop_order}>
                              {stop.stop_order}. {stop.stop_name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="form-group half-width">
                        <label className="form-label">จุดลงรถ</label>
                        <select 
                          className="form-control"
                          value={dropoffOrder}
                          onChange={(e) => {
                            setDropoffOrder(e.target.value);
                            setSelectedSchedule('');
                          }}
                          disabled={!pickupOrder}
                        >
                          <option value="">-- จุดลงรถ --</option>
                          {stops.map(stop => (
                            <option 
                              key={`dropoff-${stop.stop_order}`} 
                              value={stop.stop_order}
                              disabled={stop.stop_order <= parseInt(pickupOrder || 0)} 
                            >
                              {stop.stop_order}. {stop.stop_name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="form-group mb-20">
                      <label className="form-label">จำนวนผู้โดยสาร (สูงสุด 4 ที่นั่ง)</label>
                        <input 
                          type="number" 
                          min="1"
                          max="4"
                          className="form-control"
                          value={passengerCount}
                          onChange={(e) => {
                            const val = e.target.value;
                            
                            // 1. อนุญาตให้ช่องเป็นค่าว่างได้เมื่อผู้ใช้กดลบ (Backspace)
                            if (val === '') {
                              setPassengerCount('');
                              setSelectedSchedule('');
                              return;
                            }

                            // 2. ตรวจสอบและอัปเดตเฉพาะเมื่อพิมพ์ตัวเลข 1 ถึง 4
                            const num = parseInt(val);
                            if (!isNaN(num) && num >= 1 && num <= 4) {
                              setPassengerCount(num);
                              setSelectedSchedule('');
                            }
                            // หากพิมพ์เลขอื่นนอกจาก 1-4 ค่าใน State จะไม่เปลี่ยน (พิมพ์ไม่ติด)
                          }}
                          onBlur={() => {
                            // 3. ป้องกันผู้ใช้ทิ้งช่องว่างไว้ หากคลิกที่อื่นแล้วช่องยังว่าง ให้ปรับเป็น 1
                            if (passengerCount === '') {
                              setPassengerCount(1);
                            }
                          }}
                        />
                      </div>

                    {pickupOrder && dropoffOrder && (
                      <div className="form-group">
                        <div className="schedule-header">
                          <label className="form-label mb-0">เลือกรอบเวลา (แสดงเฉพาะรอบที่เกิน 20 นาที)</label>
                          {isLoadingSchedules && <span className="loading-badge">กำลังตรวจสอบ...</span>}
                        </div>
                        
                        <div className="schedule-cards-container">
                          {!isLoadingSchedules && schedules.length === 0 ? (
                            <p className="loading-text">ไม่พบรอบการเดินรถสำหรับเส้นทางนี้</p>
                          ) : (
                            schedules.map(sch => {
                              const inCartCount = cart
                                .filter(item => item.schedule_code === sch.schedule_code)
                                .reduce((sum, item) => sum + item.passenger_count, 0);

                              const effectiveAvailableSeats = sch.available_seats - inCartCount;
                              const isFull = effectiveAvailableSeats < passengerCount;
                              const isSelected = selectedSchedule === sch.schedule_code;
                              
                              return (
                                <button
                                  key={sch.schedule_code}
                                  type="button"
                                  disabled={isFull}
                                  onClick={() => setSelectedSchedule(sch.schedule_code)}
                                  className={`schedule-card ${isFull ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
                                >
                                  <div className="schedule-time">{sch.start_time}</div>
                                  <div className={`schedule-seats ${isFull ? 'full' : 'available'}`}>
                                    {isFull ? 'ที่นั่งไม่พอ' : `ว่าง ${effectiveAvailableSeats} ที่นั่ง`}
                                  </div>
                                  {inCartCount > 0 && (
                                    <div style={{ fontSize: '10px', color: '#f59e0b', marginTop: '2px' }}>
                                      (อยู่ในตะกร้า {inCartCount} ที่)
                                    </div>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="form-submit-container">
                  <button 
                    type="submit" 
                    className="btn-submit"
                    style={{ backgroundColor: '#0ea5e9' }}
                    disabled={!selectedRoute || !pickupOrder || !dropoffOrder || !selectedSchedule}
                  >
                    + เพิ่มลงตะกร้าจอง
                  </button>
                </div>
              </form>

              {cart.length > 0 && (
                <div style={{ marginTop: '30px', borderTop: '2px dashed #cbd5e1', paddingTop: '20px' }} className="fade-in-down">
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px', color: '#1e293b' }}>
                    🛒 ตะกร้าการจองของคุณ ({cart.length} รายการ)
                  </h3>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    {cart.map((item, index) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold', color: '#0f172a' }}>
                            {index + 1}. {item.route_name} (รอบ {item.schedule_time})
                          </div>
                          <div style={{ fontSize: '13px', color: '#64748b', marginTop: '2px' }}>
                            ขึ้น: {item.pickup_name} ➔ ลง: {item.dropoff_name} | จำนวน: {item.passenger_count} ที่นั่ง
                          </div>
                        </div>
                        <button 
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: '600' }}
                        >
                          ลบ
                        </button>
                      </div>
                    ))}
                  </div>

                  <button 
                    type="button"
                    onClick={handleConfirmCheckout}
                    disabled={isSubmitting}
                    className="btn-submit"
                    style={{ backgroundColor: '#10b981' }}
                  >
                    {isSubmitting ? 'กำลังบันทึกการจอง...' : `ยืนยันการจองทั้งหมด (${cart.length} รายการ)`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ================= ส่วนที่ 2: หน้าประวัติการเดินทาง ================= */}
          {activeTab === 'history' && (
            <div className="fade-in-down">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <button onClick={() => setHistoryFilter('ACTIVE')} style={filterBtnStyle(historyFilter === 'ACTIVE')}>กำลังจะถึง</button>
                <button onClick={() => setHistoryFilter('COMPLETED')} style={filterBtnStyle(historyFilter === 'COMPLETED')}>เสร็จสิ้นแล้ว</button>
                <button onClick={() => setHistoryFilter('CANCELLED')} style={filterBtnStyle(historyFilter === 'CANCELLED')}>ยกเลิกแล้ว</button>
                <button onClick={() => setHistoryFilter('ALL')} style={filterBtnStyle(historyFilter === 'ALL')}>ทั้งหมด</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {filteredBookings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
                    ไม่พบประวัติการเดินทางในสถานะนี้
                  </div>
                ) : (
                  filteredBookings.map(item => (
                    <div key={item.booking_code} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#ffffff', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', alignItems: 'center' }}>
                        <h4 style={{ margin: 0, color: '#0f172a', fontSize: '16px' }}>{item.route_name}</h4>
                        <span style={statusBadgeStyle(item.status)}>{item.status}</span>
                      </div>
                      
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', color: '#475569', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                        <div><strong>📅 วันที่:</strong> {item.travel_date}</div>
                        <div><strong>⏰ รอบเวลา:</strong> {item.start_time}</div>
                        <div><strong>📍 ขึ้นรถ:</strong> {item.pickup_name}</div>
                        <div><strong>🏁 ลงรถ:</strong> {item.dropoff_name}</div>
                        <div style={{ gridColumn: '1 / -1' }}><strong>👥 จำนวน:</strong> {item.passenger_count} ที่นั่ง</div>
                      </div>
                      
                      {item.status === 'ACTIVE' && (
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '16px' }}>
                          <div style={{ fontSize: '13px', color: '#0ea5e9', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '20px' }}>📱</span> Check-in QR: {item.qr_code}
                          </div>
                          <button 
                            onClick={() => handleCancelBooking(item.booking_code)}
                            style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer', fontWeight: '600', transition: '0.2s' }}
                            onMouseOver={(e) => e.target.style.backgroundColor = '#fecaca'}
                            onMouseOut={(e) => e.target.style.backgroundColor = '#fee2e2'}
                          >
                            ยกเลิกการจอง
                          </button>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

        </div>
      </div>
    </>
  );
};

// ================= Styles สำหรับตกแต่งในไฟล์ JSX =================
const tabStyle = (isActive) => ({
  flex: 1, 
  padding: '14px', 
  fontSize: '16px', 
  fontWeight: 'bold',
  textAlign: 'center', 
  background: 'none', 
  border: 'none',
  borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
  color: isActive ? '#2563eb' : '#64748b',
  cursor: 'pointer',
  transition: 'all 0.2s'
});

const filterBtnStyle = (isActive) => ({
  flex: 1, 
  minWidth: '100px',
  padding: '8px 12px', 
  borderRadius: '20px', 
  border: isActive ? 'none' : '1px solid #cbd5e1',
  backgroundColor: isActive ? '#3b82f6' : '#f8fafc',
  color: isActive ? '#ffffff' : '#475569',
  cursor: 'pointer', 
  fontWeight: '600',
  fontSize: '13px',
  transition: 'all 0.2s'
});

const statusBadgeStyle = (status) => {
  let bg = '#f1f5f9', color = '#64748b';
  if (status === 'ACTIVE') { bg = '#dbeafe'; color = '#2563eb'; }
  if (status === 'COMPLETED') { bg = '#dcfce3'; color = '#16a34a'; }
  if (status === 'CANCELLED') { bg = '#fee2e2'; color = '#dc2626'; }
  return { backgroundColor: bg, color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' };
};

export default Booking;