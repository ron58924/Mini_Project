import { useState, useEffect } from 'react';
import Navbar from './Navbar'; 
import './Booking.css'; 
import { useAuth } from './context/AuthContext'; 
import { QRCodeSVG } from 'qrcode.react';

const Booking = () => {
  const { user } = useAuth();

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
  const [confirmedTickets, setConfirmedTickets] = useState([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/booking/routes')
      .then(res => res.json())
      .then(data => setRoutes(data))
      .catch(err => console.error(err));
  }, []);

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

  const handleAddToCart = (e) => {
    e.preventDefault();

    if (!selectedRoute || !pickupOrder || !dropoffOrder || !selectedSchedule) {
      alert('กรุณากรอกข้อมูลการเดินทางให้ครบถ้วน');
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
    const createdTickets = [];

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
          createdTickets.push({ ...item, ...result });
        } else {
          failMessages.push(`รอบ ${item.schedule_time}: ${result.message}`);
        }
      }

      setConfirmedTickets(createdTickets);
      if (successCount === cart.length) {
        alert(`จองสำเร็จทั้งหมด ${successCount} รายการ!`);
        setCart([]);
        setSelectedRoute('');
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

  return (
    <>
      <Navbar />
      <div className="booking-page-wrapper">
        <div className="booking-card" style={{ maxWidth: '800px' }}>
          <div className="booking-header">
            <h2 className="booking-title">จองตั๋วโดยสาร (ระบบตะกร้า)</h2>
            <p className="booking-subtitle">
              ผู้ใช้งาน: {user ? `${user.first_name}` : 'กำลังโหลด...'}
            </p>
          </div>

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
                      let val = parseInt(e.target.value);
                      if (isNaN(val) || val < 1) val = 1;
                      if (val > 4) val = 4;
                      setPassengerCount(val);
                      setSelectedSchedule('');
                    }}
                  />
                </div>

                {pickupOrder && dropoffOrder && (
                  <div className="form-group">
                    <div className="schedule-header">
                      <label className="form-label mb-0">เลือกรอบเวลา</label>
                      {isLoadingSchedules && <span className="loading-badge">กำลังตรวจสอบ...</span>}
                    </div>
                    
                    <div className="schedule-cards-container">
                      {!isLoadingSchedules && schedules.length === 0 ? (
                        <p className="loading-text">ไม่พบรอบการเดินรถสำหรับเส้นทางนี้</p>
                      ) : (
                        schedules.map(sch => {
                          // คำนวณหักลบจำนวนที่นั่งที่ถูกจองค้างไว้ในตะกร้าสำหรับรอบเวลานี้โดยเฉพาะ
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
            <div style={{ marginTop: '30px', borderTop: '2px dashed #cbd5e1', paddingTop: '20px' }}>
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

          {confirmedTickets.length > 0 && (
            <section className="booking-confirmed-tickets" aria-live="polite">
              <h3>ตั๋วที่จองสำเร็จ</h3>
              <div className="booking-ticket-list">
                {confirmedTickets.map((ticket) => (
                  <article className="booking-ticket" key={ticket.booking_code}>
                    <div>
                      <strong>{ticket.route_name} · {ticket.schedule_time}</strong>
                      <span>รหัสจอง {ticket.booking_code}</span>
                      <span>ขึ้น {ticket.pickup_name} · ลง {ticket.dropoff_name}</span>
                    </div>
                    <QRCodeSVG value={ticket.qr_code} size={128} level="M" title={`QR ตั๋ว ${ticket.booking_code}`} />
                  </article>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>
    </>
  );
};

export default Booking;