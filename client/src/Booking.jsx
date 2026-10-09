import React, { useState, useEffect, useRef } from 'react';
import Navbar from './Navbar'; 
import './Booking.css'; 
import { useAuth } from './context/AuthContext'; 
import { MapPin, Navigation, Users, Clock, Info, ShoppingBag, Trash2, CheckCircle2, XCircle, Search, CalendarDays, ChevronDown, AlertCircle, HelpCircle, UserX, ArrowRight } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import axios from 'axios';

const Booking = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('booking'); 
  const [stations, setStations] = useState([]);
  const [pickupCode, setPickupCode] = useState('');
  const [dropoffCode, setDropoffCode] = useState('');
  const [passengerCount, setPassengerCount] = useState(1);
  const [travelDate, setTravelDate] = useState(() => {
    const d = new Date();
    d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
    return d.toISOString().split('T')[0];
  }); 

  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);
  const searchBoxRef = useRef(null);

  const [searchResults, setSearchResults] = useState([]);
  const [isLoadingSearch, setIsLoadingSearch] = useState(false);
  const [selectedResult, setSelectedResult] = useState(null);

  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [historyBookings, setHistoryBookings] = useState([]);
  const [historyFilter, setHistoryFilter] = useState('ACTIVE');
  const [selectedQRCode, setSelectedQRCode] = useState(null);
  const [popup, setPopup] = useState({ show: false, title: '', message: '', type: 'info', isConfirm: false, onConfirm: null });

  const mutRed = '#c8102e';

  const showAlert = (title, message, type = 'info') => setPopup({ show: true, title, message, type, isConfirm: false, onConfirm: null });
  const showConfirm = (title, message, onConfirmCallback) => setPopup({ show: true, title, message, type: 'warning', isConfirm: true, onConfirm: onConfirmCallback });
  const closePopup = () => setPopup({ ...popup, show: false });

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target)) { setShowPickupDropdown(false); setShowDropoffDropdown(false); }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    fetch('http://localhost:5000/api/stations').then(res => res.json()).then(data => setStations(data)).catch(console.error);
  }, []);

  useEffect(() => { if (user?.user_code) fetchHistoryBookings(); }, [user, activeTab]);

  useEffect(() => {
    if (!pickupCode || !dropoffCode || pickupCode === dropoffCode || !travelDate) {
      setSearchResults([]); setSelectedResult(null); return;
    }
    setIsLoadingSearch(true);
    setSelectedResult(null);
    
    fetch(`http://localhost:5000/api/booking/search?pickup_code=${pickupCode}&dropoff_code=${dropoffCode}&travel_date=${travelDate}`)
      .then(res => res.json())
      .then(data => Array.isArray(data) ? setSearchResults(data) : setSearchResults([]))
      .catch(console.error)
      .finally(() => setIsLoadingSearch(false));
  }, [pickupCode, dropoffCode, travelDate]);

  const fetchHistoryBookings = () => {
    fetch(`http://localhost:5000/api/user/bookings/${user.user_code}`).then(res => res.json()).then(data => setHistoryBookings(data)).catch(console.error);
  };

  const getStationName = (code) => {
    const st = stations.find(s => s.stop_code === code);
    return st ? st.stop_name : code;
  };

  const formatThaiDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // =====================================
  // เพิ่มสินค้าลงตะกร้า (รองรับการแตกเป็น 2 เส้นทางถ้ามีจุดต่อรถ)
  // =====================================
  const handleAddToCart = (e) => {
    e.preventDefault();
    if (!selectedResult) return showAlert('แจ้งเตือน', 'กรุณาเลือกรอบการเดินทางก่อนเพิ่มลงรายการ', 'warning');

    const activeSeatsInDB = historyBookings.filter(b => b.status === 'ACTIVE').reduce((sum, b) => sum + b.passenger_count, 0);
    const seatsInCart = cart.reduce((sum, item) => sum + item.passenger_count, 0);
    const totalRequestedSeats = activeSeatsInDB + seatsInCart + passengerCount;

    if (totalRequestedSeats > 4) {
      return showAlert('โควต้าเต็ม!', `โควต้าสูงสุด 4 ที่นั่ง/บัญชี\n(คุณมีรายการจองค้างอยู่ ${activeSeatsInDB} ที่นั่ง, ในตะกร้า ${seatsInCart} ที่นั่ง)`, 'danger');
    }

    if (selectedResult.is_transfer) {
      // แตกเป็น 2 เส้นทางย่อย
      const item1 = {
        id: Date.now(),
        route_name: selectedResult.leg1.route_name, schedule_code: selectedResult.leg1.schedule_code,
        schedule_time: selectedResult.leg1.expected_pickup_time, pickup_order: selectedResult.leg1.pickup_order,
        pickup_name: getStationName(pickupCode), dropoff_order: selectedResult.leg1.dropoff_order,
        dropoff_name: selectedResult.transfer_station_name + " (จุดต่อรถ)", passenger_count: passengerCount, travel_date: travelDate 
      };
      const item2 = {
        id: Date.now() + 1,
        route_name: selectedResult.leg2.route_name, schedule_code: selectedResult.leg2.schedule_code,
        schedule_time: selectedResult.leg2.expected_pickup_time, pickup_order: selectedResult.leg2.pickup_order,
        pickup_name: selectedResult.transfer_station_name + " (จุดต่อรถ)", dropoff_order: selectedResult.leg2.dropoff_order,
        dropoff_name: getStationName(dropoffCode), passenger_count: passengerCount, travel_date: travelDate 
      };
      setCart([...cart, item1, item2]);
    } else {
      // เส้นทางตรง
      const newItem = {
        id: Date.now(),
        route_name: selectedResult.route_name, schedule_code: selectedResult.schedule_code,
        schedule_time: selectedResult.expected_pickup_time, pickup_order: selectedResult.pickup_order,
        pickup_name: getStationName(pickupCode), dropoff_order: selectedResult.dropoff_order,
        dropoff_name: getStationName(dropoffCode), passenger_count: passengerCount, travel_date: travelDate 
      };
      setCart([...cart, newItem]);
    }

    setPickupCode(''); setDropoffCode(''); setSelectedResult(null); setSearchResults([]);
  };

  const handleRemoveItem = (id) => setCart(cart.filter(item => item.id !== id));

  const handleConfirmCheckout = async () => {
    if (!user || !user.user_code) return showAlert('ผิดพลาด', 'กรุณาเข้าสู่ระบบก่อน', 'danger');
    if (cart.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload = {
        user_code: user.user_code,
        trips: cart.map(item => ({ schedule_code: item.schedule_code, pickup_order: item.pickup_order, dropoff_order: item.dropoff_order, passenger_count: item.passenger_count, travel_date: item.travel_date }))
      };
      const response = await fetch('http://localhost:5000/api/bookings/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const result = await response.json();
      
      if (response.ok) {
        fetchHistoryBookings(); setCart([]); setActiveTab('history');
        showAlert('จองตั๋วสำเร็จ', `รหัสอ้างอิง: ${result.booking_code}\n(ระบบรวมเป็น QR Code เดียวให้แล้ว)`, 'success');
      } else {
        showAlert('ไม่สามารถจองตั๋วได้', result.message || 'เกิดข้อผิดพลาดในการจอง', 'danger');
      }
    } catch (err) { showAlert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'danger'); } finally { setIsSubmitting(false); }
  };

  const handleCancelBooking = (bookingCode) => {
    showConfirm('ยืนยันการยกเลิก', 'คุณต้องการยกเลิกการเดินทางนี้ใช่หรือไม่?', async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/bookings/${bookingCode}/cancel`, { method: 'PUT' });
        if (res.ok) { fetchHistoryBookings(); showAlert('สำเร็จ', 'ยกเลิกการจองเรียบร้อยแล้ว', 'success'); }
      } catch (err) { showAlert('ผิดพลาด', 'เกิดข้อผิดพลาดในการเชื่อมต่อ', 'danger'); }
    });
  };

  return (
    <div className="bg-light min-vh-100 position-relative pb-5">
      {/* ... (Modal ของ QR Code และ Popup คงเดิม) ... */}
      {selectedQRCode && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade-in" style={{ zIndex: 10000, backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}>
          <div className="bg-white rounded-4 shadow-lg p-4 text-center position-relative mx-3" style={{ maxWidth: '380px', width: '100%' }}>
            <button className="btn-close position-absolute top-0 end-0 m-3" onClick={() => setSelectedQRCode(null)}></button>
            <h4 className="fw-bold mb-3 text-dark mt-2">สแกนเพื่อขึ้นรถ</h4>
            <div className="bg-light p-3 border rounded-4 d-inline-block mb-3 shadow-sm"><QRCodeSVG value={selectedQRCode.qr_code} size={220} /></div>
            <div className="fw-bold fs-3 text-dark mb-1" style={{ letterSpacing: '1px' }}>{selectedQRCode.booking_code}</div>
            <div className="bg-danger bg-opacity-10 text-danger rounded-3 p-3 mb-4 mt-2">
              <p className="mb-0 fw-bold">กรุณาแสดง QR Code นี้ให้คนขับสแกน</p>
              <p className="small mb-0">ตั๋วใบนี้สามารถใช้เชื่อมต่อหลายเส้นทางได้</p>
            </div>
            <button className="btn text-white w-100 rounded-pill fw-bold py-3 shadow-sm fs-6" style={{ backgroundColor: mutRed }} onClick={() => setSelectedQRCode(null)}>ปิดหน้าต่าง</button>
          </div>
        </div>
      )}

      {popup.show && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade-in" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white rounded-4 shadow-lg p-4 text-center position-relative" style={{ maxWidth: '400px', width: '90%' }}>
            <div className="mb-3 d-flex justify-content-center">
              {popup.type === 'success' && <CheckCircle2 size={64} className="text-success" />}
              {popup.type === 'danger' && <XCircle size={64} className="text-danger" />}
              {popup.type === 'warning' && <HelpCircle size={64} className="text-warning" />}
              {popup.type === 'info' && <AlertCircle size={64} className="text-info" />}
            </div>
            <h5 className="fw-bold mb-3 text-dark">{popup.title}</h5>
            <p className="text-secondary mb-4 px-2 text-start" style={{ whiteSpace: 'pre-line', fontSize: '14px', lineHeight: '1.6' }}>{popup.message}</p>
            <div className="d-flex gap-2 justify-content-center">
              {popup.isConfirm ? (
                <><button className="btn btn-light flex-fill rounded-pill fw-bold py-2" onClick={closePopup}>ยกเลิก</button><button className="btn text-white flex-fill rounded-pill fw-bold py-2" style={{ backgroundColor: mutRed }} onClick={() => { closePopup(); popup.onConfirm(); }}>ยืนยัน</button></>
              ) : (<button className="btn text-white flex-fill rounded-pill fw-bold py-2" style={{ backgroundColor: mutRed }} onClick={closePopup}>ตกลง</button>)}
            </div>
          </div>
        </div>
      )}

      <div className="position-absolute top-0 start-0 w-100 shadow-sm" style={{ height: '320px', backgroundColor: mutRed, zIndex: 0, borderBottomLeftRadius: '32px', borderBottomRightRadius: '32px' }}></div>

      <div className="position-relative" style={{ zIndex: 1 }}>
        <Navbar />
        <div className="container text-center text-white mt-4 mb-5" style={{ maxWidth: '750px' }}>
          <h2 className="fw-bold mb-2">ค้นหาเที่ยวรถ</h2>
          <p className="opacity-75 small mb-0">บริการ Shuttle Bus มหาวิทยาลัยเทคโนโลยีมหานคร</p>
        </div>

        <div className="container" style={{ maxWidth: '750px' }}>
          <div className="bg-white rounded-4 shadow-sm animate-fade-in">
            
            <div className="d-flex border-bottom bg-light rounded-top-4 overflow-hidden">
              <button onClick={() => setActiveTab('booking')} className={`flex-fill btn border-0 py-3 fw-bold rounded-0 ${activeTab === 'booking' ? 'bg-white' : 'text-secondary'}`} style={{ borderBottom: activeTab === 'booking' ? `3px solid ${mutRed}` : '3px solid transparent', color: activeTab === 'booking' ? mutRed : '', transition: 'all 0.2s' }}>
                <Search size={18} className="me-2 mb-1" />ค้นหาเที่ยวรถ
              </button>
              <button onClick={() => setActiveTab('history')} className={`flex-fill btn border-0 py-3 fw-bold rounded-0 ${activeTab === 'history' ? 'bg-white' : 'text-secondary'}`} style={{ borderBottom: activeTab === 'history' ? `3px solid ${mutRed}` : '3px solid transparent', color: activeTab === 'history' ? mutRed : '', transition: 'all 0.2s' }}>
                <CalendarDays size={18} className="me-2 mb-1" />การเดินทางของฉัน
              </button>
            </div>

            <div className="p-3 p-md-5">
              
              {/* --- BOOKING TAB --- */}
              {activeTab === 'booking' && (
                <div className="animate-fade-in">
                  <form onSubmit={handleAddToCart}>
                    <div ref={searchBoxRef} className="border rounded-4 p-3 p-md-4 mb-3 bg-white position-relative shadow-sm" style={{ zIndex: 10 }}>
                      <div className="position-absolute" style={{ left: '41px', top: '55px', bottom: '55px', width: '2px', backgroundColor: '#e2e8f0', zIndex: 0 }}></div>
                      
                      {/* จุดขึ้นรถ */}
                      <div className="d-flex align-items-start mb-4 position-relative" style={{ zIndex: showPickupDropdown ? 100 : 2 }}>
                        <div className="bg-light rounded-circle d-flex align-items-center justify-content-center border me-3 mt-1" style={{ width: '28px', height: '28px' }}><div className="rounded-circle bg-secondary" style={{ width: '10px', height: '10px' }}></div></div>
                        <div className="custom-dropdown-container flex-fill">
                          <label className="text-muted small fw-semibold mb-1">จุดขึ้นรถ</label>
                          <div className="d-flex justify-content-between align-items-center cursor-pointer py-2 border-bottom border-2 bg-white" onClick={() => { setShowPickupDropdown(!showPickupDropdown); setShowDropoffDropdown(false); }}>
                            <span className={`fw-bold fs-6 ${pickupCode ? 'text-dark' : 'text-muted'}`}>{pickupCode ? getStationName(pickupCode) : 'เลือกจุดเริ่มต้น'}</span>
                            <ChevronDown size={18} className="text-secondary" style={{ transform: showPickupDropdown ? 'rotate(180deg)' : 'rotate(0)' }} />
                          </div>
                          {showPickupDropdown && (
                            <div className="custom-dropdown-menu shadow-lg">
                              {stations.map(st => (<div key={`p-${st.stop_code}`} className="custom-dropdown-item cursor-pointer py-3 border-bottom bg-white" onClick={() => { setPickupCode(st.stop_code); setShowPickupDropdown(false); if(dropoffCode === st.stop_code) setDropoffCode(''); }}>{st.stop_name}</div>))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* จุดลงรถ */}
                      <div className="d-flex align-items-start position-relative" style={{ zIndex: showDropoffDropdown ? 100 : 1 }}>
                        <div className="bg-white rounded-circle d-flex align-items-center justify-content-center border me-3 mt-1" style={{ width: '28px', height: '28px', borderColor: `${mutRed} !important` }}><div className="rounded-circle" style={{ width: '10px', height: '10px', backgroundColor: mutRed }}></div></div>
                        <div className="custom-dropdown-container flex-fill">
                          <label className="text-muted small fw-semibold mb-1">จุดลงรถ</label>
                          <div className="d-flex justify-content-between align-items-center cursor-pointer py-2 border-bottom border-2 bg-white" onClick={() => { if(!pickupCode) return showAlert('แจ้งเตือน', 'กรุณาเลือกจุดขึ้นรถก่อน', 'warning'); setShowDropoffDropdown(!showDropoffDropdown); setShowPickupDropdown(false); }}>
                            <span className={`fw-bold fs-6 ${dropoffCode ? 'text-dark' : 'text-muted'}`}>{dropoffCode ? getStationName(dropoffCode) : 'เลือกจุดหมายปลายทาง'}</span>
                            <ChevronDown size={18} className="text-secondary" style={{ transform: showDropoffDropdown ? 'rotate(180deg)' : 'rotate(0)' }} />
                          </div>
                          {showDropoffDropdown && (
                            <div className="custom-dropdown-menu shadow-lg">
                              {stations.filter(st => st.stop_code !== pickupCode).map(st => (<div key={`d-${st.stop_code}`} className="custom-dropdown-item cursor-pointer py-3 border-bottom bg-white" onClick={() => { setDropoffCode(st.stop_code); setShowDropoffDropdown(false); }}>{st.stop_name}</div>))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-between border rounded-4 p-3 p-md-4 mb-3 bg-white shadow-sm position-relative" style={{ zIndex: 1 }}>
                      <div className="d-flex align-items-center w-100">
                        <CalendarDays size={22} className="text-secondary me-3" />
                        <div className="flex-fill">
                          <div className="text-muted small fw-semibold mb-1">วันที่เดินทาง</div>
                          <input type="date" className="form-control border-0 p-0 fw-bold fs-6 bg-transparent" value={travelDate} min={new Date().toISOString().split('T')[0]} onChange={(e) => { setTravelDate(e.target.value); setSelectedResult(null); }} style={{ cursor: 'pointer', outline: 'none', boxShadow: 'none' }}/>
                        </div>
                      </div>
                    </div>

                    <div className="d-flex align-items-center justify-content-between border rounded-4 p-3 p-md-4 mb-4 bg-white shadow-sm position-relative" style={{ zIndex: 1 }}>
                      <div className="d-flex align-items-center">
                        <Users size={22} className="text-secondary me-3" />
                        <div>
                          <div className="text-muted small fw-semibold">จำนวนผู้โดยสาร</div>
                          <div className="fw-bold fs-6">{passengerCount} คน</div>
                        </div>
                      </div>
                      <div className="d-flex align-items-center gap-3">
                        <button type="button" className="btn btn-outline-secondary stepper-btn rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => { if(passengerCount > 1) { setPassengerCount(passengerCount - 1); setSelectedResult(null); } }}>-</button>
                        <span className="fw-bold fs-5" style={{ width: '20px', textAlign: 'center' }}>{passengerCount}</span>
                        <button type="button" className="btn btn-outline-secondary stepper-btn rounded-circle d-flex align-items-center justify-content-center" style={{ width: '40px', height: '40px' }} onClick={() => { if(passengerCount < 4) { setPassengerCount(passengerCount + 1); setSelectedResult(null); } }}>+</button>
                      </div>
                    </div>

                    {pickupCode && dropoffCode && travelDate && (
                      <div className="mt-5 animate-fade-in">
                        <h6 className="fw-bold mb-4">เลือกรอบการเดินทาง</h6>
                        {isLoadingSearch && <div className="text-center text-muted py-5"><span className="spinner-border spinner-border-sm me-2 text-danger"></span>กำลังค้นหา...</div>}
                        {!isLoadingSearch && searchResults.length === 0 && (
                          <div className="text-center p-4 bg-light rounded-4 text-muted border border-dashed">
                            <Search size={32} className="opacity-50 mb-3 mx-auto" />
                            <p className="mb-0 small">ไม่พบรอบรถในเส้นทางและเวลาที่คุณเลือก</p>
                          </div>
                        )}

                        <div className="d-flex flex-column gap-3">
                          {!isLoadingSearch && searchResults.map((res, idx) => {
                            const isFull = res.available_seats < passengerCount;
                            // แยกตัวแปรกดเลือกสำหรับ Direct และ Transfer
                            const isSelected = res.is_transfer 
                                ? (selectedResult?.is_transfer && selectedResult?.leg1.schedule_code === res.leg1.schedule_code && selectedResult?.leg2.schedule_code === res.leg2.schedule_code)
                                : (selectedResult?.schedule_code === res.schedule_code && selectedResult?.dropoff_order === res.dropoff_order);

                            return (
                              <div key={idx} onClick={() => !isFull && setSelectedResult(res)} className={`card border shadow-sm rounded-4 interactive-card ${isFull ? 'disabled opacity-50 bg-light' : 'bg-white'}`} style={{ borderColor: isSelected ? mutRed : '#e2e8f0', borderWidth: isSelected ? '2px' : '1px' }}>
                                <div className={`card-body p-4 ${isSelected ? 'bg-danger bg-opacity-10' : ''}`}>
                                  
                                  {/* ส่วนหัวแสดงชื่อสายรถ (รองรับแบบต่อรถ) */}
                                  <div className="d-flex justify-content-between align-items-center mb-4">
                                    {res.is_transfer ? (
                                      <div className="d-flex align-items-center flex-wrap gap-2">
                                        <span className="badge bg-dark text-white text-uppercase py-2 px-3 rounded-pill" style={{ fontSize: '11px' }}>{res.leg1.route_name}</span>
                                        <ArrowRight size={14} className="text-secondary" />
                                        <span className="badge bg-dark text-white text-uppercase py-2 px-3 rounded-pill" style={{ fontSize: '11px' }}>{res.leg2.route_name}</span>
                                      </div>
                                    ) : (
                                      <span className="badge bg-dark text-white text-uppercase py-2 px-3 rounded-pill" style={{ fontSize: '11px' }}>{res.route_name}</span>
                                    )}
                                    <span className={`small fw-bold ${isFull ? 'text-danger' : 'text-success'}`}>{isFull ? 'ที่นั่งไม่พอ' : `ว่าง ${res.available_seats} ที่นั่ง`}</span>
                                  </div>
                                  
                                  {/* เวลาเดินทาง */}
                                  <div className="d-flex align-items-center justify-content-between mb-2">
                                    <div className="text-center" style={{ minWidth: '85px' }}>
                                      <div className="text-muted small text-nowrap mb-1" style={{ fontSize: '12px' }}>เวลาขึ้นรถ</div>
                                      <div className="fw-bold fs-2 text-nowrap text-primary" style={{ letterSpacing: '-1px' }}>{res.expected_pickup_time}</div>
                                    </div>
                                    
                                    <div className="flex-fill px-2 px-md-3 text-center position-relative">
                                      {res.is_transfer ? (
                                        <div className="badge bg-warning text-dark py-1 px-2 mb-2 w-100 text-truncate" style={{ fontSize: '11px' }}>
                                          <Navigation size={10} className="me-1"/> ต่อรถที่: {res.transfer_station_name}
                                        </div>
                                      ) : (
                                        <div className="text-dark fw-bold mb-2" style={{ fontSize: '13px' }}>วิ่งตรง</div>
                                      )}
                                      <div className="d-flex align-items-center">
                                        <div className="rounded-circle border border-2 border-secondary bg-white" style={{ width: '8px', height: '8px' }}></div>
                                        <div className="flex-fill border-top border-secondary border-2 opacity-25 mx-1"></div>
                                        <div className="rounded-circle border border-2 border-secondary bg-white" style={{ width: '8px', height: '8px' }}></div>
                                      </div>
                                    </div>

                                    <div className="text-center" style={{ minWidth: '85px' }}>
                                      <div className="text-muted small text-nowrap mb-1" style={{ fontSize: '12px' }}>เวลาถึงปลายทาง</div>
                                      <div className="fw-bold fs-2 text-nowrap" style={{ letterSpacing: '-1px' }}>{res.expected_dropoff_time}</div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    <button type="submit" className="btn w-100 py-3 rounded-4 fw-bold mt-5 shadow-sm text-white interactive-card fs-6" style={{ backgroundColor: mutRed }} disabled={!selectedResult}>
                      เพิ่มลงตะกร้า
                    </button>
                  </form>

                  {cart.length > 0 && (
                    <div className="mt-5 pt-4 border-top animate-fade-in">
                      <div className="d-flex align-items-center mb-4">
                        <ShoppingBag size={22} color={mutRed} className="me-2" />
                        <h5 className="fw-bold mb-0">เส้นทางที่เลือกเตรียมจอง ({cart.length})</h5>
                      </div>
                      <div className="d-flex flex-column gap-3 mb-4">
                        {cart.map((item) => (
                          <div key={item.id} className="bg-white p-3 p-md-4 rounded-4 border shadow-sm d-flex justify-content-between align-items-center">
                            <div className="flex-fill pe-2">
                              <div className="fw-bold mb-1">
                                {item.route_name} <span className="text-muted small fw-normal ms-2 d-inline-block">({formatThaiDate(item.travel_date)})</span>
                              </div>
                              <div className="text-muted small" style={{ fontSize: '12px' }}>
                                {item.pickup_name} <span className="fw-bold text-dark mx-1 text-nowrap">{item.schedule_time}</span> <span className="mx-1">→</span> {item.dropoff_name}
                              </div>
                            </div>
                            <div className="d-flex align-items-center">
                              <span className="badge bg-light text-dark border me-3 py-2 px-3 rounded-pill"><Users size={12} className="me-1"/> {item.passenger_count}</span>
                              <button type="button" onClick={() => handleRemoveItem(item.id)} className="btn btn-light text-danger rounded-circle p-2 interactive-card" style={{ width: '40px', height: '40px' }}><Trash2 size={18} /></button>
                            </div>
                          </div>
                        ))}
                      </div>
                      <button type="button" onClick={handleConfirmCheckout} disabled={isSubmitting} className="btn btn-success w-100 py-3 rounded-4 fw-bold shadow-sm interactive-card fs-6">
                        {isSubmitting ? 'กำลังประมวลผล...' : 'ยืนยันการจองตั๋ว (ได้ QR Code เดียว)'}
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* --- HISTORY TAB (ส่วนประวัติไม่มีการแก้ ปล่อยไว้เหมือนเดิมได้เลย) --- */}
              {activeTab === 'history' && (
                <div className="animate-fade-in">
                  <div className="d-flex gap-2 overflow-auto pb-3 mb-4 hide-scrollbar" style={{ whiteSpace: 'nowrap' }}>
                    {['ACTIVE', 'ONGOING', 'COMPLETED', 'NO_SHOW', 'CANCELLED', 'ALL'].map(status => {
                      const labels = { ACTIVE: 'กำลังดำเนินการ', ONGOING: 'กำลังเดินทาง', COMPLETED: 'เดินทางแล้ว', NO_SHOW: 'ไม่มาแสดงตัว', CANCELLED: 'ยกเลิก', ALL: 'ทั้งหมด' };
                      const isActive = historyFilter === status;
                      return (
                        <button key={status} onClick={() => setHistoryFilter(status)} className={`btn rounded-pill px-4 py-2 small fw-bold border-0 interactive-card ${isActive ? 'text-white shadow-sm' : 'bg-light text-secondary border'}`} style={{ backgroundColor: isActive ? mutRed : '' }}>{labels[status]}</button>
                      )
                    })}
                  </div>
                  <div className="d-flex flex-column gap-4">
                    {historyBookings.length === 0 ? (
                      <div className="text-center p-5 bg-light rounded-4 border text-muted animate-fade-in">
                        <CalendarDays size={48} className="opacity-25 mb-3 mx-auto" />
                        <p className="mb-0">ไม่มีประวัติการเดินทาง</p>
                      </div>
                    ) : (
                      (() => {
                        const grouped = Object.values(historyBookings.reduce((acc, item) => {
                          if (!acc[item.booking_code]) { acc[item.booking_code] = { booking_code: item.booking_code, travel_date: item.travel_date, qr_code: item.qr_code, passenger_count: item.passenger_count, routes: [] }; }
                          acc[item.booking_code].routes.push(item); return acc;
                        }, {}));

                        const displayGroups = grouped.filter(group => {
                          const allCancelled = group.routes.every(r => r.status === 'CANCELLED');
                          const allNoShow = group.routes.every(r => r.status === 'NO_SHOW');
                          const allFinished = group.routes.every(r => ['COMPLETED', 'CANCELLED', 'NO_SHOW'].includes(r.status));
                          const anyOngoing = group.routes.some(r => r.status === 'ONGOING');
                          
                          if (allCancelled) group.overall_status = 'CANCELLED'; else if (allNoShow) group.overall_status = 'NO_SHOW'; else if (allFinished) group.overall_status = 'COMPLETED'; else if (anyOngoing) group.overall_status = 'ONGOING'; else group.overall_status = 'ACTIVE';
                          if (historyFilter === 'ALL') return true;
                          return group.routes.some(r => r.status === historyFilter) || group.overall_status === historyFilter;
                        });

                        if (displayGroups.length === 0) return (<div className="text-center p-5 bg-light rounded-4 border text-muted animate-fade-in"><Search size={48} className="opacity-25 mb-3 mx-auto" /><p className="mb-0">ไม่มีรายการในสถานะนี้</p></div>);

                        return displayGroups.map((group) => (
                          <div key={group.booking_code} className="card border shadow-sm rounded-4 overflow-hidden animate-fade-in">
                            <div className="card-header bg-light border-bottom pt-4 px-4 pb-3 d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-2">
                              <div>
                                <div className="d-flex align-items-center mb-1"><span className="fw-bold text-dark fs-5" style={{ letterSpacing: '0.5px' }}>{group.booking_code}</span></div>
                                <div className="d-flex align-items-center text-secondary small"><CalendarDays size={14} className="me-2" /> วันที่เดินทาง: {formatThaiDate(group.travel_date)}</div>
                              </div>
                              <div>
                                {group.overall_status === 'ACTIVE' && <span className="badge bg-warning text-dark px-3 py-2 rounded-pill d-flex align-items-center"><Clock size={12} className="me-1"/> มีรายการรอเดินทาง</span>}
                                {group.overall_status === 'ONGOING' && <span className="badge bg-info text-white px-3 py-2 rounded-pill d-flex align-items-center"><Navigation size={12} className="me-1"/> มีเส้นทางกำลังเดินทาง</span>}
                                {group.overall_status === 'COMPLETED' && <span className="badge bg-success text-white px-3 py-2 rounded-pill d-flex align-items-center"><CheckCircle2 size={12} className="me-1"/> เดินทางครบแล้ว</span>}
                                {group.overall_status === 'CANCELLED' && <span className="badge bg-danger text-white px-3 py-2 rounded-pill d-flex align-items-center"><XCircle size={12} className="me-1"/> ยกเลิกทั้งหมด</span>}
                                {group.overall_status === 'NO_SHOW' && <span className="badge bg-secondary text-white px-3 py-2 rounded-pill d-flex align-items-center"><UserX size={12} className="me-1"/> ไม่มาแสดงตัว</span>}
                              </div>
                            </div>
                            
                            <div className="card-body p-0">
                              <div className="p-4 bg-white">
                                {group.routes.map((route, idx) => {
                                  const isDimmed = ['CANCELLED', 'NO_SHOW'].includes(route.status);
                                  return (
                                  <div key={route.detail_code} className={`d-flex ${idx !== group.routes.length - 1 ? 'mb-4 pb-4 border-bottom border-dashed' : ''} ${isDimmed ? 'opacity-50' : ''}`}>
                                    <div className="me-3 me-md-4 text-center" style={{ minWidth: '70px' }}>
                                      <div className="text-muted small mb-1 text-nowrap">เวลาขึ้นรถ</div>
                                      <div className="fw-bold fs-3 text-primary text-nowrap" style={{ letterSpacing: '-1px' }}>{route.start_time}</div>
                                    </div>
                                    <div className="position-relative px-2 d-flex flex-column align-items-center">
                                      <div className="rounded-circle border border-3 bg-white z-1" style={{ width: '14px', height: '14px', borderColor: mutRed }}></div>
                                      <div className="border-start border-2 opacity-25 flex-fill my-1" style={{ borderColor: mutRed }}></div>
                                      <div className="rounded-circle z-1" style={{ width: '14px', height: '14px', backgroundColor: mutRed }}></div>
                                    </div>
                                    <div className="ms-3 ms-md-4 flex-fill pb-1 d-flex flex-column justify-content-between">
                                      <div>
                                        <div className="d-flex align-items-center gap-2 mb-1 flex-wrap">
                                          <span className="badge bg-light text-secondary border small">เส้นทางที่ {idx + 1}</span>
                                          <span className="text-muted small">{route.route_name}</span>
                                          {route.status === 'ACTIVE' && <span className="badge bg-warning text-dark" style={{fontSize: '10px'}}>รอขึ้นรถ</span>}
                                          {route.status === 'ONGOING' && <span className="badge bg-info text-white" style={{fontSize: '10px'}}>กำลังเดินทาง</span>}
                                          {route.status === 'COMPLETED' && <span className="badge bg-success text-white" style={{fontSize: '10px'}}>✓ สแกนแล้ว</span>}
                                          {route.status === 'CANCELLED' && <span className="badge bg-danger text-white" style={{fontSize: '10px'}}>ยกเลิกแล้ว</span>}
                                          {route.status === 'NO_SHOW' && <span className="badge bg-secondary text-white" style={{fontSize: '10px'}}>ไม่มาตามนัด</span>}
                                        </div>
                                        <div className={`fw-bold text-dark fs-6 ${isDimmed ? 'text-decoration-line-through' : ''}`}>{route.pickup_name}</div>
                                      </div>
                                      <div className={`fw-bold text-dark fs-6 pt-2 ${isDimmed ? 'text-decoration-line-through' : ''}`}>{route.dropoff_name}</div>
                                    </div>
                                  </div>
                                )})}
                              </div>

                              {['ACTIVE', 'ONGOING'].includes(group.overall_status) && (
                                <div className="bg-light p-4 border-top d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
                                  <div className="d-flex align-items-center w-100">
                                    <div className="d-flex align-items-center cursor-pointer p-2 rounded-4 bg-white border shadow-sm interactive-card me-3" onClick={() => setSelectedQRCode(group)}>
                                      <QRCodeSVG value={group.qr_code} size={50} />
                                    </div>
                                    <div>
                                      <div className="fw-semibold text-dark mb-1 d-flex align-items-center"><Users size={16} className="me-2 text-secondary"/> ผู้โดยสาร {group.passenger_count} ท่าน</div>
                                      <div className="text-danger small fw-bold cursor-pointer" onClick={() => setSelectedQRCode(group)}>🔍 กดขยาย QR Code</div>
                                    </div>
                                  </div>
                                  {group.routes.some(r => r.status === 'ACTIVE') && (
                                    <button onClick={() => handleCancelBooking(group.booking_code)} className="btn btn-outline-danger rounded-pill px-4 py-2 fw-bold interactive-card w-100 text-nowrap" style={{ maxWidth: '200px' }}>ยกเลิกที่ยังไม่เดินทาง</button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        ));
                      })()
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Booking;