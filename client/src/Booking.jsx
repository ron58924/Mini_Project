import React, { useState, useEffect } from 'react';
import Navbar from './Navbar'; 
import './Booking.css'; 
import { useAuth } from './context/AuthContext'; 

const Booking = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('booking'); 

  // ================= State สำหรับการจอง (แบบ Smart Search) =================
  const [stations, setStations] = useState([]);
  const [pickupCode, setPickupCode] = useState('');
  const [dropoffCode, setDropoffCode] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  
  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [historyBookings, setHistoryBookings] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('ACTIVE');

  // Fetch รายชื่อสถานีทั้งหมดครั้งแรก
  useEffect(() => {
    fetch('http://localhost:5000/api/stations')
      .then(res => res.json())
      .then(data => setStations(data))
      .catch(err => console.error(err));
  }, []);

  // เมื่อจุดขึ้น-ลง เปลี่ยนแปลง ให้ยิง API ค้นหา
  useEffect(() => {
    if (!pickupCode || !dropoffCode || pickupCode === dropoffCode) {
      setSearchResults([]);
      setSelectedResult(null);
      return;
    }
    
    setIsLoadingSearch(true);
    setSelectedResult(null);
    const localDate = new Date();
    localDate.setMinutes(localDate.getMinutes() - localDate.getTimezoneOffset());
    const today = localDate.toISOString().split('T')[0]; 
    
    const url = `http://localhost:5000/api/booking/search?pickup_code=${pickupCode}&dropoff_code=${dropoffCode}&travel_date=${today}`;
    
    fetch(url)
      .then(res => res.json())
      .then(data => setSearchResults(data))
      .catch(err => console.error(err))
      .finally(() => setIsLoadingSearch(false));
  }, [pickupCode, dropoffCode]);

  useEffect(() => {
    if (activeTab === 'history' && user?.user_code) {
      fetchHistoryBookings();
    }
  }, [activeTab, user]);

  const fetchHistoryBookings = () => {
    fetch(`http://localhost:5000/api/user/bookings/${user.user_code}`)
      .then(res => res.json())
      .then(data => setHistoryBookings(data));
  };

  const getStationName = (code) => {
    const st = stations.find(s => s.stop_code === code);
    return st ? st.stop_name : code;
  };

  const handleAddToCart = (e) => {
    e.preventDefault();

    if (!selectedResult) {
      alert('กรุณาเลือกรอบการเดินทาง');
      return;
    }

    // --- เช็คโควต้าที่นั่งไม่ให้เกิน 4 ---
    const activeSeatsInDB = historyBookings
      .filter(b => b.status === 'ACTIVE')
      .reduce((sum, b) => sum + b.passenger_count, 0);

    const seatsInCart = cart.reduce((sum, item) => sum + item.passenger_count, 0);
    const totalRequestedSeats = activeSeatsInDB + seatsInCart + passengerCount;

    if (totalRequestedSeats > 4) {
      alert(`ไม่สามารถจองได้! โควต้าจำกัด 4 ที่นั่ง\n(จองแล้ว ${activeSeatsInDB} ที่นั่ง, ในตะกร้า ${seatsInCart} ที่นั่ง)`);
      return;
    }

    const newItem = {
      id: Date.now(),
      route_code: selectedResult.route_code,
      route_name: selectedResult.route_name,
      schedule_code: selectedResult.schedule_code,
      schedule_time: selectedResult.expected_pickup_time,
      pickup_order: selectedResult.pickup_order,
      pickup_name: getStationName(pickupCode),
      dropoff_order: selectedResult.dropoff_order,
      dropoff_name: getStationName(dropoffCode),
      passenger_count: passengerCount
    };

    setCart([...cart, newItem]);
    
    // รีเซ็ตค่าหลังจากใส่ตะกร้า
    setPickupCode('');
    setDropoffCode('');
    setSelectedResult(null);
    setSearchResults([]);
  };

  const handleRemoveItem = (id) => {
    setCart(cart.filter(item => item.id !== id));
  };

  const handleConfirmCheckout = async () => {
    if (!user || !user.user_code) { alert('กรุณาเข้าสู่ระบบก่อน'); return; }
    if (cart.length === 0) return;

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
        setActiveTab('history');
      } else {
        alert(`จองสำเร็จ ${successCount} รายการ, ล้มเหลว:\n${failMessages.join('\n')}`);
      }
    } catch (err) {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelBooking = async (bookingCode) => {
    if (!window.confirm('คุณต้องการยกเลิกการเดินทางนี้ใช่หรือไม่?')) return;
    try {
      const res = await fetch(`http://localhost:5000/api/bookings/${bookingCode}/cancel`, { method: 'PUT' });
      const data = await res.json();
      alert(data.message);
      if (res.ok) fetchHistoryBookings();
    } catch (err) {
      alert('เชื่อมต่อเซิร์ฟเวอร์ไม่ได้');
    }
  };

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
            <p className="booking-subtitle">ผู้ใช้งาน: {user ? `${user.first_name}` : 'กรุณาเข้าสู่ระบบ'}</p>
          </div>

          {/* ================= เมนู Tabs ================= */}
          <div style={{ display: 'flex', borderBottom: '2px solid #e2e8f0', marginBottom: '24px' }}>
            <button onClick={() => setActiveTab('booking')} style={tabStyle(activeTab === 'booking')}>🚐 จองตั๋วโดยสาร</button>
            <button onClick={() => setActiveTab('history')} style={tabStyle(activeTab === 'history')}>📝 ประวัติการเดินทาง</button>
          </div>

          {/* ================= หน้าจองตั๋ว ================= */}
          {activeTab === 'booking' && (
            <>
              <form onSubmit={handleAddToCart} className="booking-form">
                <div className="form-row">
                  <div className="form-group half-width">
                    <label className="form-label">จุดขึ้นรถ</label>
                    <select 
                      className="form-control"
                      value={pickupCode}
                      onChange={(e) => setPickupCode(e.target.value)}
                    >
                      <option value="">-- เลือกจุดขึ้นรถ --</option>
                      {stations.map(st => (
                        <option key={`p-${st.stop_code}`} value={st.stop_code}>{st.stop_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group half-width">
                    <label className="form-label">จุดลงรถ</label>
                    <select 
                      className="form-control"
                      value={dropoffCode}
                      onChange={(e) => setDropoffCode(e.target.value)}
                      disabled={!pickupCode}
                    >
                      <option value="">-- เลือกจุดลงรถ --</option>
                      {stations
                        .filter(st => st.stop_code !== pickupCode) // ป้องกันการเลือกจุดลงซ้ำจุดขึ้น
                        .map(st => (
                        <option key={`d-${st.stop_code}`} value={st.stop_code}>{st.stop_name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group mb-20">
                  <label className="form-label">จำนวนผู้โดยสาร (สูงสุด 4 ที่นั่ง)</label>
                  <input 
                    type="number" min="1" max="4"
                    className="form-control"
                    value={passengerCount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '') {
                        setPassengerCount('');
                        setSelectedResult(null);
                        return;
                      }
                      const num = parseInt(val);
                      if (!isNaN(num) && num >= 1 && num <= 4) {
                        setPassengerCount(num);
                        setSelectedResult(null);
                      }
                    }}
                    onBlur={() => { if (passengerCount === '') setPassengerCount(1); }}
                  />
                </div>

                {pickupCode && dropoffCode && (
                  <div className="form-group fade-in-down">
                    <div className="schedule-header">
                      <label className="form-label mb-0">เลือกรอบการเดินทาง (แสดงเฉพาะรอบที่เกิน 20 นาที)</label>
                      {isLoadingSearch && <span className="loading-badge">กำลังค้นหาเส้นทาง...</span>}
                    </div>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {!isLoadingSearch && searchResults.length === 0 ? (
                        <p className="loading-text" style={{ padding: '20px', backgroundColor: '#f1f5f9', borderRadius: '8px' }}>
                          ❌ ไม่พบเส้นทาง/รอบรถ ที่เชื่อมต่อระหว่างสองจุดนี้ในเวลาปัจจุบัน
                        </p>
                      ) : (
                        searchResults.map(res => {
                          const inCartCount = cart
                            .filter(item => item.schedule_code === res.schedule_code)
                            .reduce((sum, item) => sum + item.passenger_count, 0);

                          const effectiveSeats = res.available_seats - inCartCount;
                          const isFull = effectiveSeats < passengerCount;
                          const isSelected = selectedResult?.schedule_code === res.schedule_code;
                          
                          return (
                            <div 
                              key={res.schedule_code}
                              onClick={() => !isFull && setSelectedResult(res)}
                              style={{
                                border: isSelected ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                                backgroundColor: isFull ? '#f8fafc' : (isSelected ? '#eff6ff' : '#ffffff'),
                                opacity: isFull ? 0.6 : 1,
                                padding: '16px', borderRadius: '12px', cursor: isFull ? 'not-allowed' : 'pointer',
                                transition: '0.2s', display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                              }}
                            >
                              <div>
                                <div style={{ fontSize: '15px', fontWeight: 'bold', color: '#0f172a' }}>
                                  เส้นทาง: {res.route_name}
                                </div>
                                <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                  ประเภทรถ: {res.total_capacity <= 15 ? 'รถตู้' : 'รถมินิบัส'} ({res.total_capacity} ที่นั่ง)
                                </div>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                <div style={{ fontSize: '18px', fontWeight: '800', color: '#2563eb' }}>
                                  ถึงจุดขึ้นรถ {res.expected_pickup_time} น.
                                </div>
                                <div style={{ fontSize: '13px', fontWeight: 'bold', color: isFull ? '#dc2626' : '#16a34a', marginTop: '2px' }}>
                                  {isFull ? 'ที่นั่งไม่พอ' : `ว่าง ${effectiveSeats} ที่นั่ง`}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}

                <div className="form-submit-container">
                  <button type="submit" className="btn-submit" style={{ backgroundColor: '#0ea5e9' }} disabled={!selectedResult}>
                    + เพิ่มลงตะกร้าจอง
                  </button>
                </div>
              </form>

              {cart.length > 0 && (
                <div style={{ marginTop: '30px', borderTop: '2px dashed #cbd5e1', paddingTop: '20px' }}>
                  <h3 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '15px' }}>🛒 ตะกร้าการจอง ({cart.length})</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '20px' }}>
                    {cart.map((item, index) => (
                      <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                        <div>
                          <div style={{ fontWeight: 'bold' }}>{index + 1}. {item.route_name}</div>
                          <div style={{ fontSize: '13px', color: '#64748b' }}>
                            ขึ้น: {item.pickup_name} (เวลา {item.schedule_time} น.) ➔ ลง: {item.dropoff_name} | {item.passenger_count} ที่นั่ง
                          </div>
                        </div>
                        <button type="button" onClick={() => handleRemoveItem(item.id)} style={{ backgroundColor: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer' }}>ลบ</button>
                      </div>
                    ))}
                  </div>
                  <button type="button" onClick={handleConfirmCheckout} disabled={isSubmitting} className="btn-submit" style={{ backgroundColor: '#10b981' }}>
                    {isSubmitting ? 'กำลังบันทึก...' : `ยืนยันการจองทั้งหมด`}
                  </button>
                </div>
              )}
            </>
          )}

          {/* ================= หน้าประวัติ ================= */}
          {activeTab === 'history' && (
            <div className="fade-in-down">
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <button onClick={() => setHistoryFilter('ACTIVE')} style={filterBtnStyle(historyFilter === 'ACTIVE')}>กำลังจะถึง</button>
                <button onClick={() => setHistoryFilter('COMPLETED')} style={filterBtnStyle(historyFilter === 'COMPLETED')}>เสร็จสิ้นแล้ว</button>
                <button onClick={() => setHistoryFilter('CANCELLED')} style={filterBtnStyle(historyFilter === 'CANCELLED')}>ยกเลิกแล้ว</button>
                <button onClick={() => setHistoryFilter('ALL')} style={filterBtnStyle(historyFilter === 'ALL')}>ทั้งหมด</button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                {filteredBookings.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '30px', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>ไม่พบประวัติการเดินทาง</div>
                ) : (
                  filteredBookings.map(item => (
                    <div key={item.booking_code} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px', backgroundColor: '#ffffff' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <h4 style={{ margin: 0 }}>{item.route_name}</h4>
                        <span style={statusBadgeStyle(item.status)}>{item.status}</span>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '14px', backgroundColor: '#f8fafc', padding: '12px', borderRadius: '8px' }}>
                        <div><strong>📅 วันที่:</strong> {item.travel_date}</div>
                        <div><strong>⏰ ถึงจุดขึ้นรถ:</strong> {item.start_time}</div>
                        <div><strong>📍 ขึ้น:</strong> {item.pickup_name}</div>
                        <div><strong>🏁 ลง:</strong> {item.dropoff_name}</div>
                        <div style={{ gridColumn: '1 / -1' }}><strong>👥 ผู้โดยสาร:</strong> {item.passenger_count} ที่นั่ง</div>
                      </div>
                      {item.status === 'ACTIVE' && (
                        <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed #e2e8f0', paddingTop: '16px' }}>
                          <div style={{ fontSize: '13px', color: '#0ea5e9', fontWeight: 'bold' }}>QR Code: {item.qr_code}</div>
                          <button onClick={() => handleCancelBooking(item.booking_code)} style={{ backgroundColor: '#fee2e2', color: '#dc2626', border: '1px solid #fca5a5', padding: '8px 16px', borderRadius: '8px', cursor: 'pointer' }}>ยกเลิกการจอง</button>
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

// Styles
const tabStyle = (isActive) => ({
  flex: 1, padding: '14px', fontSize: '16px', fontWeight: 'bold', background: 'none', border: 'none',
  borderBottom: isActive ? '3px solid #2563eb' : '3px solid transparent',
  color: isActive ? '#2563eb' : '#64748b', cursor: 'pointer', transition: '0.2s'
});
const filterBtnStyle = (isActive) => ({
  flex: 1, padding: '8px 12px', borderRadius: '20px', border: isActive ? 'none' : '1px solid #cbd5e1',
  backgroundColor: isActive ? '#3b82f6' : '#f8fafc', color: isActive ? '#ffffff' : '#475569',
  cursor: 'pointer', fontWeight: '600', fontSize: '13px'
});
const statusBadgeStyle = (status) => {
  let bg = '#f1f5f9', color = '#64748b';
  if (status === 'ACTIVE') { bg = '#dbeafe'; color = '#2563eb'; }
  if (status === 'COMPLETED') { bg = '#dcfce3'; color = '#16a34a'; }
  if (status === 'CANCELLED') { bg = '#fee2e2'; color = '#dc2626'; }
  return { backgroundColor: bg, color, padding: '4px 10px', borderRadius: '12px', fontSize: '12px', fontWeight: 'bold' };
};

export default Booking;