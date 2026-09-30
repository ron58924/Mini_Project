import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import './Booking.css';
import { useAuth } from './context/AuthContext';
// แก้บัค: เพิ่ม Info เข้ามาในบรรทัดนี้แล้วครับ
import { Calendar, Clock, Bus, UserCheck, MapPin, CheckCircle2, XCircle, AlertCircle, Trash2, List, Plus, Map, Settings, Info } from 'lucide-react';

const ScheduleManager = () => {
  const { user } = useAuth();
  const mutRed = '#c8102e';

  // แท็บเมนู: 'list', 'add', 'routes', 'vehicles'
  const [viewMode, setViewMode] = useState('list'); 
  const [schedules, setSchedules] = useState([]);
  
  const [masterData, setMasterData] = useState({ routes: [], drivers: [], vehicles: [] });
  const [stations, setStations] = useState([]);
  const [routeDetails, setRouteDetails] = useState([]);

  // State สำหรับสร้างรอบรถ
  const [formData, setFormData] = useState({
    route_code: '', vehicle_code: '', driver_code: '', start_time: '08:00', travel_date: new Date().toISOString().split('T')[0]
  });

  // State สำหรับจัดการเส้นทาง
  const [editRouteCode, setEditRouteCode] = useState('');
  const [editRouteName, setEditRouteName] = useState('');
  const [editRouteDetails, setEditRouteDetails] = useState([]);

  // State สำหรับยานพาหนะ
  const [newVehicleCode, setNewVehicleCode] = useState('');
  const [newVehicleCap, setNewVehicleCap] = useState(15);

  const [popup, setPopup] = useState({ show: false, title: '', message: '', type: 'info', isConfirm: false, onConfirm: null });

  const showAlert = (title, message, type = 'info') => setPopup({ show: true, title, message, type, isConfirm: false });
  const showConfirm = (title, message, onConfirm) => setPopup({ show: true, title, message, type: 'warning', isConfirm: true, onConfirm });
  const closePopup = () => setPopup({ ...popup, show: false });

  useEffect(() => {
    fetchMasterData();
    fetchSchedules();
    fetchStations();
  }, [viewMode]);

  useEffect(() => {
    if (formData.route_code && viewMode === 'add') {
      fetch(`http://localhost:5000/api/admin/routes/${formData.route_code}/details`)
        .then(res => res.json())
        .then(data => setRouteDetails(Array.isArray(data) ? data : []))
        .catch(err => setRouteDetails([]));
    }
  }, [formData.route_code, viewMode]);

  const fetchMasterData = () => {
    fetch('http://localhost:5000/api/admin/master-data')
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.vehicles && data.drivers) {
          setMasterData(data);
          if (data.routes.length > 0 && !formData.route_code) setFormData(prev => ({ ...prev, route_code: data.routes[0].route_code }));
          if (data.vehicles.length > 0 && !formData.vehicle_code) setFormData(prev => ({ ...prev, vehicle_code: data.vehicles[0].vehicle_code }));
        } else {
          setMasterData({ routes: [], drivers: [], vehicles: [] });
        }
      })
      .catch(() => setMasterData({ routes: [], drivers: [], vehicles: [] }));
  };

  const fetchSchedules = () => {
    fetch('http://localhost:5000/api/admin/schedules')
      .then(res => res.json())
      .then(data => setSchedules(Array.isArray(data) ? data : []))
      .catch(() => setSchedules([]));
  };

  const fetchStations = () => {
    fetch('http://localhost:5000/api/stations')
      .then(res => res.json())
      .then(data => setStations(Array.isArray(data) ? data : []))
      .catch(() => setStations([]));
  };

  const calculatePreviewTime = (baseTime, accumulatedMinutes) => {
    if (!baseTime) return '-';
    const baseDate = new Date(`2000-01-01T${baseTime}:00`);
    const targetDate = new Date(baseDate.getTime() + accumulatedMinutes * 60000);
    return targetDate.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
  };

  // --- ฟังก์ชันจัดการรอบรถ ---
  const handleCreateSchedule = async (e) => {
    e.preventDefault();
    if (!formData.driver_code) return showAlert('แจ้งเตือน', 'กรุณาเลือกพนักงานขับรถ', 'warning');
    try {
      const response = await fetch('http://localhost:5000/api/admin/schedules/create', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData)
      });
      const result = await response.json();
      if (response.ok) {
        showAlert('สำเร็จ', result.message, 'success');
        setViewMode('list');
      } else showAlert('ผิดพลาด', result.message, 'danger');
    } catch (err) {
      showAlert('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    }
  };

  const handleDeleteSchedule = (code) => {
    showConfirm('ลบรอบรถ', `ลบรอบรถ ${code} ใช่หรือไม่?`, async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/admin/schedules/${code}`, { method: 'DELETE' });
        if (res.ok) { fetchSchedules(); showAlert('สำเร็จ', 'ลบเรียบร้อย', 'success'); }
        else showAlert('ผิดพลาด', 'ไม่สามารถลบได้', 'danger');
      } catch (err) { showAlert('ผิดพลาด', 'เครือข่ายขัดข้อง', 'danger'); }
    });
  };

  // --- ฟังก์ชันจัดการเส้นทาง (CRUD Routes) ---
  const handleSelectEditRoute = (code) => {
    setEditRouteCode(code);
    const r = masterData.routes.find(x => x.route_code === code);
    setEditRouteName(r ? r.route_name : '');
    fetch(`http://localhost:5000/api/admin/routes/${code}/details`)
      .then(res => res.json())
      .then(data => setEditRouteDetails(Array.isArray(data) ? data : []))
      .catch(() => setEditRouteDetails([]));
  };

  const handleSaveRoute = async () => {
    if(!editRouteCode || !editRouteName) return showAlert('แจ้งเตือน', 'กรุณากรอกรหัสและชื่อเส้นทาง', 'warning');
    try {
      const res = await fetch(`http://localhost:5000/api/admin/routes/${editRouteCode}/details`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route_name: editRouteName, details: editRouteDetails })
      });
      const result = await res.json();
      if (res.ok) {
        showAlert('สำเร็จ', result.message, 'success');
        fetchMasterData();
      } else showAlert('ผิดพลาด', result.message, 'danger');
    } catch (err) { showAlert('ผิดพลาด', 'เครือข่ายขัดข้อง', 'danger'); }
  };

  // --- ฟังก์ชันจัดการยานพาหนะ ---
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/admin/vehicles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_code: newVehicleCode, capacity: newVehicleCap })
      });
      if (res.ok) { fetchMasterData(); setNewVehicleCode(''); showAlert('สำเร็จ', 'เพิ่มรถสำเร็จ', 'success'); }
      else showAlert('ผิดพลาด', 'รหัสรถอาจซ้ำกัน', 'danger');
    } catch (err) { showAlert('ผิดพลาด', 'เครือข่ายขัดข้อง', 'danger'); }
  };

  const handleDeleteVehicle = (code) => {
    showConfirm('ลบยานพาหนะ', `ลบรถ ${code} ใช่หรือไม่?`, async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/admin/vehicles/${code}`, { method: 'DELETE' });
        if (res.ok) { fetchMasterData(); showAlert('สำเร็จ', 'ลบเรียบร้อย', 'success'); }
        else showAlert('ผิดพลาด', 'ลบไม่ได้ อาจมีรอบรถใช้งานอยู่', 'danger');
      } catch (err) { showAlert('ผิดพลาด', 'เครือข่ายขัดข้อง', 'danger'); }
    });
  };

  return (
    <div className="bg-light min-vh-100 position-relative pb-5">
      {popup.show && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade-in" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(3px)' }}>
          <div className="bg-white rounded-4 shadow-lg p-4 text-center" style={{ maxWidth: '350px', width: '90%' }}>
            <div className="mb-3 d-flex justify-content-center">
              {popup.type === 'success' && <CheckCircle2 size={56} className="text-success" />}
              {popup.type === 'danger' && <XCircle size={56} className="text-danger" />}
              {popup.type === 'warning' && <AlertCircle size={56} className="text-warning" />}
              {popup.type === 'info' && <AlertCircle size={56} className="text-info" />}
            </div>
            <h5 className="fw-bold mb-2 text-dark">{popup.title}</h5>
            <p className="text-secondary mb-4 small">{popup.message}</p>
            <div className="d-flex gap-2">
              {popup.isConfirm ? (
                <>
                  <button className="btn btn-light flex-fill rounded-pill fw-bold" onClick={closePopup}>ยกเลิก</button>
                  <button className="btn text-white flex-fill rounded-pill fw-bold" style={{ backgroundColor: mutRed }} onClick={() => { closePopup(); popup.onConfirm(); }}>ยืนยัน</button>
                </>
              ) : (
                <button className="btn text-white w-100 rounded-pill fw-bold" style={{ backgroundColor: mutRed }} onClick={closePopup}>ตกลง</button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="position-absolute top-0 start-0 w-100 shadow-sm" style={{ height: '280px', backgroundColor: mutRed, zIndex: 0, borderBottomLeftRadius: '32px', borderBottomRightRadius: '32px' }}></div>

      <div className="position-relative" style={{ zIndex: 1 }}>
        <Navbar />
        <div className="container text-center text-white mt-4 mb-5" style={{ maxWidth: '900px' }}>
          <h2 className="fw-bold mb-2">ระบบจัดการเดินรถอัจฉริยะ</h2>
          <p className="opacity-75 small mb-0">ผู้ดูแลระบบ: จัดการรอบรถ เส้นทาง ป้ายจอด และยานพาหนะ</p>
        </div>

        <div className="container" style={{ maxWidth: '900px' }}>
          <div className="bg-white rounded-4 shadow-sm overflow-hidden animate-fade-in mb-4">
            
            <div className="d-flex border-bottom bg-light overflow-auto hide-scrollbar">
              <button onClick={() => setViewMode('list')} className={`flex-fill btn border-0 py-3 fw-bold rounded-0 text-nowrap ${viewMode === 'list' ? 'bg-white' : 'text-secondary'}`} style={{ borderBottom: viewMode === 'list' ? `3px solid ${mutRed}` : '3px solid transparent', color: viewMode === 'list' ? mutRed : '' }}>
                <List size={18} className="me-2 mb-1" /> รายการรอบรถ
              </button>
              <button onClick={() => setViewMode('add')} className={`flex-fill btn border-0 py-3 fw-bold rounded-0 text-nowrap ${viewMode === 'add' ? 'bg-white' : 'text-secondary'}`} style={{ borderBottom: viewMode === 'add' ? `3px solid ${mutRed}` : '3px solid transparent', color: viewMode === 'add' ? mutRed : '' }}>
                <Plus size={18} className="me-2 mb-1" /> สร้างรอบใหม่
              </button>
              <button onClick={() => setViewMode('routes')} className={`flex-fill btn border-0 py-3 fw-bold rounded-0 text-nowrap ${viewMode === 'routes' ? 'bg-white' : 'text-secondary'}`} style={{ borderBottom: viewMode === 'routes' ? `3px solid ${mutRed}` : '3px solid transparent', color: viewMode === 'routes' ? mutRed : '' }}>
                <Map size={18} className="me-2 mb-1" /> จัดการเส้นทาง
              </button>
              <button onClick={() => setViewMode('vehicles')} className={`flex-fill btn border-0 py-3 fw-bold rounded-0 text-nowrap ${viewMode === 'vehicles' ? 'bg-white' : 'text-secondary'}`} style={{ borderBottom: viewMode === 'vehicles' ? `3px solid ${mutRed}` : '3px solid transparent', color: viewMode === 'vehicles' ? mutRed : '' }}>
                <Settings size={18} className="me-2 mb-1" /> จัดการยานพาหนะ
              </button>
            </div>

            <div className="p-4 p-md-5">
              
              {/* TAB: รายการรอบรถ */}
              {viewMode === 'list' && (
                <div className="animate-fade-in">
                  <div className="table-responsive">
                    <table className="table table-hover align-middle">
                      <thead className="table-light text-muted small">
                        <tr>
                          <th>รหัสรอบรถ (ASC)</th>
                          <th>เส้นทาง</th>
                          <th>เวลาออกรถ</th>
                          <th>คนขับ / รถ</th>
                          <th className="text-end">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!Array.isArray(schedules) || schedules.length === 0) ? (
                          <tr><td colSpan="5" className="text-center py-5 text-muted">ไม่พบข้อมูล (กำลังเชื่อมต่อฐานข้อมูล...)</td></tr>
                        ) : (
                          schedules.map(sch => (
                            <tr key={sch.schedule_code}>
                              <td className="fw-bold text-dark">{sch.schedule_code}</td>
                              <td><span className="badge bg-light text-dark border px-2 py-1">{sch.route_name}</span></td>
                              <td className="fw-bold text-primary">{sch.start_time} น.</td>
                              <td className="small text-secondary">{sch.driver_name || 'ไม่ระบุ'} <br/> ({sch.vehicle_code})</td>
                              <td className="text-end">
                                <button className="btn btn-sm btn-outline-danger rounded-circle p-2" onClick={() => handleDeleteSchedule(sch.schedule_code)}>
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: สร้างรอบเดินรถ */}
              {viewMode === 'add' && (
                <form onSubmit={handleCreateSchedule} className="animate-fade-in">
                  <div className="alert alert-info border-0 rounded-4 mb-4 small">
                    <Info size={16} className="me-2"/> รหัสรอบรถ (Schedule Code) จะถูกสร้างให้อัตโนมัติเมื่อกดบันทึก
                  </div>
                  <div className="row g-4 mb-5">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">วันที่เดินทาง (Travel Date)</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0"><Calendar size={18} className="text-secondary"/></span>
                        <input type="date" className="form-control border-start-0 ps-0 fw-bold" value={formData.travel_date} onChange={e => setFormData({...formData, travel_date: e.target.value})} required />
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">เวลาออกเดินทาง (Start Time)</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light border-end-0"><Clock size={18} className="text-secondary"/></span>
                        <input type="time" className="form-control border-start-0 ps-0 fw-bold fs-5 text-primary" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} required />
                      </div>
                    </div>
                    <div className="col-md-12">
                      <label className="form-label small fw-semibold text-muted">เส้นทางเดินรถ (Route)</label>
                      <select className="form-select form-select-lg fw-bold fs-6" value={formData.route_code} onChange={e => setFormData({...formData, route_code: e.target.value})}>
                        {(masterData.routes || []).map(r => <option key={r.route_code} value={r.route_code}>{r.route_code} : {r.route_name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">ยานพาหนะ (Vehicle)</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light"><Bus size={16}/></span>
                        <select className="form-select fw-bold" value={formData.vehicle_code} onChange={e => setFormData({...formData, vehicle_code: e.target.value})}>
                          {(masterData.vehicles || []).map(v => <option key={v.vehicle_code} value={v.vehicle_code}>{v.vehicle_code} (ความจุ {v.capacity} ที่นั่ง)</option>)}
                        </select>
                      </div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">มอบหมายคนขับ (Driver Assignment)</label>
                      <div className="input-group">
                        <span className="input-group-text bg-light"><UserCheck size={16}/></span>
                        <select className="form-select fw-bold" value={formData.driver_code} onChange={e => setFormData({...formData, driver_code: e.target.value})} required>
                          <option value="" disabled>-- เลือกพนักงาน --</option>
                          {(masterData.drivers || []).map(d => <option key={d.driver_code} value={d.driver_code}>{d.driver_name} ({d.driver_code})</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                  <div className="border rounded-4 overflow-hidden mb-5">
                    <div className="bg-light p-3 border-bottom d-flex align-items-center">
                      <MapPin size={20} className="text-secondary me-2" />
                      <h6 className="fw-bold mb-0 text-dark">ภาพรวมเวลาคาดว่าจะถึงป้าย (อิงจากเวลาออกรถ)</h6>
                    </div>
                    <div className="table-responsive">
                      <table className="table table-borderless align-middle mb-0">
                        <thead className="border-bottom small text-muted">
                          <tr><th className="ps-4">ลำดับ</th><th>รหัสจุดจอด</th><th>เวลาเดินทาง (AVG)</th><th className="text-end pe-4">เวลาถึงคาดการณ์</th></tr>
                        </thead>
                        <tbody>
                          {(() => {
                            let cumulativeMins = 0;
                            return (routeDetails || []).map((detail) => {
                              cumulativeMins += detail.avg_travel_minutes;
                              return (
                                <tr key={detail.stop_order} className="border-bottom">
                                  <td className="ps-4 fw-bold text-secondary">{detail.stop_order}</td>
                                  <td>
                                    <div className="fw-bold text-dark">{detail.stop_code}</div>
                                    <div className="small text-muted">{detail.stop_name}</div>
                                  </td>
                                  <td><span className="badge bg-secondary bg-opacity-10 text-secondary border px-2">+ {detail.avg_travel_minutes} นาที</span></td>
                                  <td className="text-end pe-4 fw-bold text-primary fs-6">{calculatePreviewTime(formData.start_time, cumulativeMins)} น.</td>
                                </tr>
                              );
                            });
                          })()}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <button type="submit" className="btn w-100 py-3 rounded-4 fw-bold text-white shadow-sm fs-6" style={{ backgroundColor: mutRed }}>สร้างรอบเดินรถอัตโนมัติ</button>
                </form>
              )}

              {/* TAB: จัดการเส้นทาง */}
              {viewMode === 'routes' && (
                <div className="animate-fade-in">
                  <div className="row g-3 mb-4">
                    <div className="col-md-4">
                      <label className="form-label small fw-semibold text-muted">เลือกเส้นทาง หรือพิมพ์รหัสใหม่</label>
                      <input type="text" className="form-control fw-bold" placeholder="เช่น RT_03" value={editRouteCode} onChange={e => handleSelectEditRoute(e.target.value)} list="route-list" />
                      <datalist id="route-list">
                        {(masterData.routes || []).map(r => <option key={r.route_code} value={r.route_code}>{r.route_name}</option>)}
                      </datalist>
                    </div>
                    <div className="col-md-8">
                      <label className="form-label small fw-semibold text-muted">ชื่อเส้นทาง (สามารถแก้ไขได้)</label>
                      <input type="text" className="form-control fw-bold text-primary" placeholder="เช่น MUT - แฟชั่นไอส์แลนด์" value={editRouteName} onChange={e => setEditRouteName(e.target.value)} />
                    </div>
                  </div>

                  <div className="border rounded-4 overflow-hidden mb-4">
                    <div className="bg-light p-3 border-bottom d-flex justify-content-between align-items-center">
                      <h6 className="fw-bold mb-0 text-dark">กำหนดป้ายและเวลาเฉลี่ย (AVG_TRAVEL_MINUTES)</h6>
                      <button type="button" className="btn btn-outline-primary btn-sm rounded-pill fw-bold" onClick={() => setEditRouteDetails([...(editRouteDetails || []), { stop_code: stations[0]?.stop_code || '', avg_travel_minutes: 5 }])}>
                        <Plus size={16} className="me-1"/> เพิ่มป้าย
                      </button>
                    </div>
                    <div className="table-responsive">
                      <table className="table align-middle mb-0">
                        <thead className="table-light small text-muted">
                          <tr><th className="ps-4">ลำดับ</th><th>จุดจอด (Stop Code)</th><th>เวลาใช้เดินทาง (นาที)</th><th className="text-end pe-4">ลบ</th></tr>
                        </thead>
                        <tbody>
                          {(editRouteDetails || []).map((stop, idx) => (
                            <tr key={idx}>
                              <td className="ps-4 fw-bold">{idx + 1}</td>
                              <td>
                                <select className="form-select form-select-sm fw-bold" value={stop.stop_code} onChange={e => {
                                  const newDetails = [...editRouteDetails];
                                  newDetails[idx].stop_code = e.target.value;
                                  setEditRouteDetails(newDetails);
                                }}>
                                  {(stations || []).map(st => <option key={st.stop_code} value={st.stop_code}>{st.stop_name} ({st.stop_code})</option>)}
                                </select>
                              </td>
                              <td>
                                <input type="number" min="0" className="form-control form-control-sm fw-bold text-center" style={{ width: '80px' }} value={stop.avg_travel_minutes} onChange={e => {
                                  const newDetails = [...editRouteDetails];
                                  newDetails[idx].avg_travel_minutes = parseInt(e.target.value) || 0;
                                  setEditRouteDetails(newDetails);
                                }} />
                              </td>
                              <td className="text-end pe-4">
                                <button className="btn btn-sm btn-light text-danger rounded-circle" onClick={() => setEditRouteDetails(editRouteDetails.filter((_, i) => i !== idx))}><Trash2 size={16}/></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                  <button onClick={handleSaveRoute} className="btn w-100 py-3 rounded-4 fw-bold text-white shadow-sm" style={{ backgroundColor: mutRed }}>บันทึกและปรับปรุงโครงสร้างเส้นทาง</button>
                </div>
              )}

              {/* TAB: จัดการยานพาหนะ */}
              {viewMode === 'vehicles' && (
                <div className="row animate-fade-in">
                  <div className="col-md-5 mb-4">
                    <div className="bg-light p-4 rounded-4 border">
                      <h6 className="fw-bold mb-3 border-bottom pb-2">เพิ่มยานพาหนะใหม่</h6>
                      <form onSubmit={handleAddVehicle}>
                        <label className="form-label small fw-semibold">รหัสยานพาหนะ</label>
                        <input type="text" className="form-control mb-3 fw-bold" placeholder="เช่น VHC05" value={newVehicleCode} onChange={e=>setNewVehicleCode(e.target.value)} required />
                        <label className="form-label small fw-semibold">ความจุ (ที่นั่ง)</label>
                        <input type="number" className="form-control mb-4 fw-bold" value={newVehicleCap} onChange={e=>setNewVehicleCap(e.target.value)} required />
                        <button type="submit" className="btn text-white fw-bold w-100 rounded-pill" style={{ backgroundColor: mutRed }}>เพิ่มเข้าสู่ระบบ</button>
                      </form>
                    </div>
                  </div>
                  <div className="col-md-7">
                    <table className="table table-hover align-middle border rounded-4 overflow-hidden">
                      <thead className="table-light text-muted small">
                        <tr><th className="ps-4">รหัสรถ</th><th>ความจุ</th><th className="text-end pe-4">ลบ</th></tr>
                      </thead>
                      <tbody>
                        {(masterData.vehicles || []).map(v => (
                          <tr key={v.vehicle_code}>
                            <td className="ps-4 fw-bold text-dark">{v.vehicle_code}</td>
                            <td><span className="badge bg-secondary bg-opacity-10 text-secondary border">{v.capacity} ที่นั่ง</span></td>
                            <td className="text-end pe-4">
                              <button className="btn btn-sm btn-outline-danger rounded-circle p-1" onClick={() => handleDeleteVehicle(v.vehicle_code)}><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
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

export default ScheduleManager;