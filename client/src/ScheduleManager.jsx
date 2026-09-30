import React, { useState, useEffect } from 'react';
import Navbar from './Navbar';
import './Booking.css';
import { useAuth } from './context/AuthContext';
import { Calendar, Clock, Bus, UserCheck, CheckCircle2, XCircle, AlertCircle, Trash2, List, Plus, Map, Settings, Info, MapPin, Edit } from 'lucide-react';

const ScheduleManager = () => {
  const { user } = useAuth();
  const mutRed = '#c8102e';

  // แท็บเมนู: 'schedules', 'stations', 'routes', 'vehicles'
  const [viewMode, setViewMode] = useState('schedules'); 
  const [schedules, setSchedules] = useState([]);
  
  const [masterData, setMasterData] = useState({ routes: [], drivers: [], vehicles: [], vehicle_types: [] });
  const [stations, setStations] = useState([]);

  // State สำหรับรอบรถ
  const [formData, setFormData] = useState({
    route_code: '', vehicle_code: '', driver_code: '', start_time: '08:00', travel_date: new Date().toISOString().split('T')[0]
  });
  
  // State สำหรับ Edit รอบรถ
  const [editScheduleModal, setEditScheduleModal] = useState({ show: false, schedule_code: '', vehicle_code: '', driver_code: '' });

  // State สำหรับจุดจอด (Stations)
  const [newStation, setNewStation] = useState({ stop_code: '', stop_name: '' });
  const [editStationCode, setEditStationCode] = useState('');
  const [editStationName, setEditStationName] = useState('');

  // State สำหรับจัดการเส้นทาง
  const [isNewRoute, setIsNewRoute] = useState(false);
  const [editRouteCode, setEditRouteCode] = useState('');
  const [editRouteName, setEditRouteName] = useState('');
  const [editRouteDetails, setEditRouteDetails] = useState([]);

  // State สำหรับยานพาหนะ
  const [newVehicle, setNewVehicle] = useState({ vehicle_code: '', type_code: '', license_plate: '', capacity: 15 });

  const [popup, setPopup] = useState({ show: false, title: '', message: '', type: 'info', isConfirm: false, onConfirm: null });

  const showAlert = (title, message, type = 'info') => setPopup({ show: true, title, message, type, isConfirm: false });
  const showConfirm = (title, message, onConfirm) => setPopup({ show: true, title, message, type: 'warning', isConfirm: true, onConfirm });
  const closePopup = () => setPopup({ ...popup, show: false });

  useEffect(() => {
    fetchMasterData();
    fetchSchedules();
    fetchStations();
  }, [viewMode]);

  const fetchMasterData = () => {
    fetch('http://localhost:5000/api/admin/master-data')
      .then(res => res.json())
      .then(data => {
        if (data.routes && data.vehicles && data.drivers) {
          setMasterData(data);
          if (data.routes.length > 0 && !formData.route_code) setFormData(prev => ({ ...prev, route_code: data.routes[0].route_code }));
          if (data.vehicles.length > 0 && !formData.vehicle_code) setFormData(prev => ({ ...prev, vehicle_code: data.vehicles[0].vehicle_code }));
          if (data.vehicle_types && data.vehicle_types.length > 0 && !newVehicle.type_code) setNewVehicle(prev => ({ ...prev, type_code: data.vehicle_types[0].type_code }));
        } else {
          setMasterData({ routes: [], drivers: [], vehicles: [], vehicle_types: [] });
        }
      })
      .catch(() => setMasterData({ routes: [], drivers: [], vehicles: [], vehicle_types: [] }));
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

  const formatThaiDate = (dateString) => {
    if (!dateString) return 'ไม่ระบุวันที่';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
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
        fetchSchedules(); // รีเฟรชตารางด้านล่างทันที
      } else showAlert('ผิดพลาด', result.message, 'danger');
    } catch (err) {
      showAlert('ผิดพลาด', 'ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์', 'danger');
    }
  };

  const handleUpdateSchedule = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`http://localhost:5000/api/admin/schedules/${editScheduleModal.schedule_code}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(editScheduleModal)
      });
      if (res.ok) {
        fetchSchedules();
        setEditScheduleModal({ show: false, schedule_code: '', vehicle_code: '', driver_code: '' });
        showAlert('สำเร็จ', 'แก้ไขรอบรถสำเร็จ', 'success');
      } else showAlert('ผิดพลาด', 'อัปเดตไม่สำเร็จ', 'danger');
    } catch (err) { showAlert('ผิดพลาด', 'เครือข่ายขัดข้อง', 'danger'); }
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

  // --- ฟังก์ชันจัดการจุดจอด (Stations) ---
  const handleAddStation = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:5000/api/admin/stations', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newStation)
      });
      if (res.ok) { fetchStations(); setNewStation({ stop_code: '', stop_name: '' }); showAlert('สำเร็จ', 'เพิ่มจุดจอดสำเร็จ', 'success'); }
      else { const d = await res.json(); showAlert('ผิดพลาด', d.message, 'danger'); }
    } catch (err) { showAlert('ผิดพลาด', 'เครือข่ายขัดข้อง', 'danger'); }
  };

  const handleUpdateStation = async (code) => {
    try {
      const res = await fetch(`http://localhost:5000/api/admin/stations/${code}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ stop_name: editStationName })
      });
      if (res.ok) { fetchStations(); setEditStationCode(''); showAlert('สำเร็จ', 'อัปเดตจุดจอดสำเร็จ', 'success'); }
      else showAlert('ผิดพลาด', 'อัปเดตไม่สำเร็จ', 'danger');
    } catch (err) { showAlert('ผิดพลาด', 'เครือข่ายขัดข้อง', 'danger'); }
  };

  const handleDeleteStation = (code) => {
    showConfirm('ลบจุดจอด', `ลบจุดจอด ${code} ใช่หรือไม่?`, async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/admin/stations/${code}`, { method: 'DELETE' });
        if (res.ok) { fetchStations(); showAlert('สำเร็จ', 'ลบเรียบร้อย', 'success'); }
        else { const d = await res.json(); showAlert('ผิดพลาด', d.message, 'danger'); }
      } catch (err) { showAlert('ผิดพลาด', 'เครือข่ายขัดข้อง', 'danger'); }
    });
  };

  // --- ฟังก์ชันจัดการเส้นทาง ---
  const handleSelectEditRoute = (code) => {
    setEditRouteCode(code);
    const r = masterData.routes.find(x => x.route_code === code);
    setEditRouteName(r ? r.route_name : '');
    if (code) {
      fetch(`http://localhost:5000/api/admin/routes/${code}/details`)
        .then(res => res.json())
        .then(data => setEditRouteDetails(Array.isArray(data) ? data : []))
        .catch(() => setEditRouteDetails([]));
    }
  };

  const handleSaveRoute = async () => {
    if(!editRouteCode || !editRouteName) return showAlert('แจ้งเตือน', 'กรุณากรอกรหัสและชื่อเส้นทาง', 'warning');
    if(editRouteDetails.length === 0) return showAlert('แจ้งเตือน', 'ต้องมีอย่างน้อย 1 ป้ายจอด', 'warning');
    try {
      const res = await fetch(`http://localhost:5000/api/admin/routes/${editRouteCode}/details`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ route_name: editRouteName, details: editRouteDetails })
      });
      const result = await res.json();
      if (res.ok) {
        showAlert('สำเร็จ', result.message, 'success');
        fetchMasterData();
        setIsNewRoute(false);
      } else showAlert('ผิดพลาด', result.message, 'danger');
    } catch (err) { showAlert('ผิดพลาด', 'เครือข่ายขัดข้อง', 'danger'); }
  };

  const handleDeleteRoute = () => {
    showConfirm('ลบเส้นทาง', `คุณต้องการลบเส้นทาง ${editRouteCode} ทิ้งอย่างถาวรใช่หรือไม่?`, async () => {
      try {
        const res = await fetch(`http://localhost:5000/api/admin/routes/${editRouteCode}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok) {
          showAlert('สำเร็จ', result.message, 'success');
          setEditRouteCode('');
          setEditRouteName('');
          setEditRouteDetails([]);
          fetchMasterData();
        } else showAlert('ผิดพลาด', result.message, 'danger');
      } catch (err) { showAlert('ผิดพลาด', 'เครือข่ายขัดข้อง', 'danger'); }
    });
  };

  // --- ฟังก์ชันจัดการยานพาหนะ ---
  const handleAddVehicle = async (e) => {
    e.preventDefault();
    if(!newVehicle.type_code) return showAlert('แจ้งเตือน', 'กรุณาเลือกประเภทรถ', 'warning');
    try {
      const res = await fetch('http://localhost:5000/api/admin/vehicles', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVehicle)
      });
      if (res.ok) { 
        fetchMasterData(); 
        setNewVehicle({ ...newVehicle, vehicle_code: '', license_plate: '' }); 
        showAlert('สำเร็จ', 'เพิ่มรถสำเร็จ', 'success'); 
      } else {
        const errData = await res.json();
        showAlert('ผิดพลาด', errData.message || 'รหัสรถอาจซ้ำกัน', 'danger');
      }
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
      
      {/* Alert Modal */}
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

      {/* Edit Schedule Modal */}
      {editScheduleModal.show && (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center animate-fade-in" style={{ zIndex: 9990, backgroundColor: 'rgba(0,0,0,0.4)' }}>
          <div className="bg-white rounded-4 shadow-lg p-4" style={{ maxWidth: '400px', width: '90%' }}>
            <h5 className="fw-bold mb-3 border-bottom pb-2">แก้ไขรอบรถ : {editScheduleModal.schedule_code}</h5>
            <form onSubmit={handleUpdateSchedule}>
              <div className="mb-3">
                <label className="form-label small fw-semibold">ยานพาหนะ (Vehicle)</label>
                <select className="form-select fw-bold" value={editScheduleModal.vehicle_code} onChange={e => setEditScheduleModal({...editScheduleModal, vehicle_code: e.target.value})} required>
                  {(masterData.vehicles || []).map(v => <option key={v.vehicle_code} value={v.vehicle_code}>{v.vehicle_code} (จุ {v.capacity})</option>)}
                </select>
              </div>
              <div className="mb-4">
                <label className="form-label small fw-semibold">พนักงานขับรถ (Driver)</label>
                <select className="form-select fw-bold" value={editScheduleModal.driver_code} onChange={e => setEditScheduleModal({...editScheduleModal, driver_code: e.target.value})} required>
                  {(masterData.drivers || []).map(d => <option key={d.driver_code} value={d.driver_code}>{d.driver_name}</option>)}
                </select>
              </div>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-light flex-fill rounded-pill fw-bold" onClick={() => setEditScheduleModal({show:false})}>ยกเลิก</button>
                <button type="submit" className="btn text-white flex-fill rounded-pill fw-bold" style={{ backgroundColor: mutRed }}>บันทึกข้อมูล</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="position-absolute top-0 start-0 w-100 shadow-sm" style={{ height: '280px', backgroundColor: mutRed, zIndex: 0, borderBottomLeftRadius: '32px', borderBottomRightRadius: '32px' }}></div>

      <div className="position-relative" style={{ zIndex: 1 }}>
        <Navbar />
        <div className="container text-center text-white mt-4 mb-5" style={{ maxWidth: '900px' }}>
          <h2 className="fw-bold mb-2">ระบบจัดการเดินรถอัจฉริยะ</h2>
          <p className="opacity-75 small mb-0">ผู้ดูแลระบบ: จัดการรอบรถ จุดจอด เส้นทาง และยานพาหนะ</p>
        </div>

        <div className="container" style={{ maxWidth: '900px' }}>
          <div className="bg-white rounded-4 shadow-sm overflow-hidden animate-fade-in mb-4">
            
            <div className="d-flex border-bottom bg-light overflow-auto hide-scrollbar">
              <button onClick={() => setViewMode('schedules')} className={`flex-fill btn border-0 py-3 fw-bold rounded-0 text-nowrap ${viewMode === 'schedules' ? 'bg-white' : 'text-secondary'}`} style={{ borderBottom: viewMode === 'schedules' ? `3px solid ${mutRed}` : '3px solid transparent', color: viewMode === 'schedules' ? mutRed : '' }}>
                <List size={18} className="me-2 mb-1" /> จัดการรอบรถ
              </button>
              <button onClick={() => setViewMode('stations')} className={`flex-fill btn border-0 py-3 fw-bold rounded-0 text-nowrap ${viewMode === 'stations' ? 'bg-white' : 'text-secondary'}`} style={{ borderBottom: viewMode === 'stations' ? `3px solid ${mutRed}` : '3px solid transparent', color: viewMode === 'stations' ? mutRed : '' }}>
                <MapPin size={18} className="me-2 mb-1" /> จัดการจุดจอด
              </button>
              <button onClick={() => setViewMode('routes')} className={`flex-fill btn border-0 py-3 fw-bold rounded-0 text-nowrap ${viewMode === 'routes' ? 'bg-white' : 'text-secondary'}`} style={{ borderBottom: viewMode === 'routes' ? `3px solid ${mutRed}` : '3px solid transparent', color: viewMode === 'routes' ? mutRed : '' }}>
                <Map size={18} className="me-2 mb-1" /> จัดการเส้นทาง
              </button>
              <button onClick={() => setViewMode('vehicles')} className={`flex-fill btn border-0 py-3 fw-bold rounded-0 text-nowrap ${viewMode === 'vehicles' ? 'bg-white' : 'text-secondary'}`} style={{ borderBottom: viewMode === 'vehicles' ? `3px solid ${mutRed}` : '3px solid transparent', color: viewMode === 'vehicles' ? mutRed : '' }}>
                <Settings size={18} className="me-2 mb-1" /> จัดการยานพาหนะ
              </button>
            </div>

            <div className="p-4 p-md-5">
              
              {/* TAB: จัดการรอบรถ (รวมสร้าง + รายการ) */}
              {viewMode === 'schedules' && (
                <div className="animate-fade-in">
                  
                  {/* ฟอร์มสร้างรอบรถ */}
                  <div className="bg-light p-4 rounded-4 border mb-5 shadow-sm">
                    <h5 className="fw-bold mb-3 border-bottom pb-2 text-dark"><Plus size={20} className="me-1 mb-1"/> สร้างรอบเดินรถใหม่</h5>
                    <form onSubmit={handleCreateSchedule}>
                      <div className="row g-3 mb-4">
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold text-muted">วันที่เดินทาง</label>
                          <input type="date" className="form-control fw-bold" value={formData.travel_date} onChange={e => setFormData({...formData, travel_date: e.target.value})} required />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold text-muted">เวลาออกรถ</label>
                          <input type="time" className="form-control fw-bold text-primary" value={formData.start_time} onChange={e => setFormData({...formData, start_time: e.target.value})} required />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold text-muted">เส้นทางเดินรถ</label>
                          <select className="form-select fw-bold" value={formData.route_code} onChange={e => setFormData({...formData, route_code: e.target.value})}>
                            {(masterData.routes || []).map(r => <option key={r.route_code} value={r.route_code}>{r.route_code}</option>)}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold text-muted">ยานพาหนะ</label>
                          <select className="form-select fw-bold" value={formData.vehicle_code} onChange={e => setFormData({...formData, vehicle_code: e.target.value})}>
                            {(masterData.vehicles || []).map(v => <option key={v.vehicle_code} value={v.vehicle_code}>{v.vehicle_code} (จุ {v.capacity})</option>)}
                          </select>
                        </div>
                        <div className="col-md-4">
                          <label className="form-label small fw-semibold text-muted">มอบหมายคนขับ</label>
                          <select className="form-select fw-bold" value={formData.driver_code} onChange={e => setFormData({...formData, driver_code: e.target.value})} required>
                            <option value="" disabled>-- เลือกคนขับ --</option>
                            {(masterData.drivers || []).map(d => <option key={d.driver_code} value={d.driver_code}>{d.driver_name}</option>)}
                          </select>
                        </div>
                        <div className="col-md-4 d-flex align-items-end">
                          <button type="submit" className="btn w-100 py-2 fw-bold text-white shadow-sm" style={{ backgroundColor: mutRed }}>บันทึกสร้างรอบ</button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* ตารางรายการรอบรถ */}
                  <h5 className="fw-bold mb-3 text-dark">รายการรอบรถทั้งหมด</h5>
                  <div className="table-responsive">
                    <table className="table table-hover align-middle border rounded overflow-hidden">
                      <thead className="table-light text-muted small">
                        <tr>
                          <th className="ps-3">รหัสรอบรถ (ASC)</th>
                          <th>วันที่ให้บริการ</th>
                          <th>เส้นทาง</th>
                          <th>เวลาออกรถ</th>
                          <th>คนขับ / รถ</th>
                          <th className="text-end pe-3">จัดการ</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(!Array.isArray(schedules) || schedules.length === 0) ? (
                          <tr><td colSpan="6" className="text-center py-5 text-muted">ไม่พบข้อมูล หรือยังไม่มีการสร้างรอบเดินรถ</td></tr>
                        ) : (
                          schedules.map(sch => (
                            <tr key={sch.schedule_code}>
                              <td className="fw-bold text-dark ps-3">{sch.schedule_code}</td>
                              <td><span className="text-secondary small fw-semibold">{formatThaiDate(sch.travel_date)}</span></td>
                              <td><span className="badge bg-light text-dark border px-2 py-1">{sch.route_name}</span></td>
                              <td className="fw-bold text-primary">{sch.start_time} น.</td>
                              <td className="small text-secondary">{sch.driver_name || 'ไม่ระบุ'} <br/> ({sch.vehicle_code})</td>
                              <td className="text-end pe-3">
                                <button className="btn btn-sm btn-outline-secondary rounded-circle p-2 me-2" onClick={() => setEditScheduleModal({ show: true, schedule_code: sch.schedule_code, vehicle_code: sch.vehicle_code, driver_code: sch.driver_code })}>
                                  <Edit size={16} />
                                </button>
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

              {/* TAB: จัดการจุดจอด (Stations) */}
              {viewMode === 'stations' && (
                <div className="row animate-fade-in">
                  <div className="col-md-5 mb-4">
                    <div className="bg-light p-4 rounded-4 border">
                      <h6 className="fw-bold mb-3 border-bottom pb-2">สร้างจุดจอดใหม่</h6>
                      <form onSubmit={handleAddStation}>
                        <label className="form-label small fw-semibold">รหัสจุดจอด (Stop Code)</label>
                        <input type="text" className="form-control mb-3 fw-bold" placeholder="เช่น ST01" value={newStation.stop_code} onChange={e=>setNewStation({...newStation, stop_code: e.target.value.toUpperCase()})} required />
                        
                        <label className="form-label small fw-semibold">ชื่อจุดจอด (Stop Name)</label>
                        <input type="text" className="form-control mb-4 fw-bold" placeholder="เช่น ตลาดสด" value={newStation.stop_name} onChange={e=>setNewStation({...newStation, stop_name: e.target.value})} required />
                        
                        <button type="submit" className="btn text-white fw-bold w-100 rounded-pill py-2" style={{ backgroundColor: mutRed }}>เพิ่มจุดจอด</button>
                      </form>
                    </div>
                  </div>
                  <div className="col-md-7">
                    <table className="table table-hover align-middle border rounded-4 overflow-hidden">
                      <thead className="table-light text-muted small">
                        <tr><th className="ps-4">รหัสจุดจอด</th><th>ชื่อจุดจอด</th><th className="text-end pe-4">จัดการ</th></tr>
                      </thead>
                      <tbody>
                        {(stations || []).map(st => (
                          <tr key={st.stop_code}>
                            <td className="ps-4 fw-bold text-dark">{st.stop_code}</td>
                            <td>
                              {editStationCode === st.stop_code ? (
                                <input type="text" className="form-control form-control-sm fw-bold" value={editStationName} onChange={(e) => setEditStationName(e.target.value)} />
                              ) : (
                                <span className="small fw-semibold">{st.stop_name}</span>
                              )}
                            </td>
                            <td className="text-end pe-4">
                              {editStationCode === st.stop_code ? (
                                <>
                                  <button className="btn btn-sm btn-success rounded-circle p-2 me-2" onClick={() => handleUpdateStation(st.stop_code)}><CheckCircle2 size={16} /></button>
                                  <button className="btn btn-sm btn-light text-secondary rounded-circle p-2" onClick={() => setEditStationCode('')}><XCircle size={16} /></button>
                                </>
                              ) : (
                                <>
                                  <button className="btn btn-sm btn-outline-secondary rounded-circle p-2 me-2" onClick={() => { setEditStationCode(st.stop_code); setEditStationName(st.stop_name); }}><Edit size={16} /></button>
                                  <button className="btn btn-sm btn-outline-danger rounded-circle p-2" onClick={() => handleDeleteStation(st.stop_code)}><Trash2 size={16} /></button>
                                </>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB: จัดการเส้นทาง */}
              {viewMode === 'routes' && (
                <div className="animate-fade-in">
                  <div className="row g-4 mb-4">
                    <div className="col-md-6">
                      <label className="form-label small fw-semibold text-muted">เลือกเส้นทาง (เพื่อแก้ไข / ลบ)</label>
                      <select className="form-select form-select-lg fw-bold" value={isNewRoute ? 'NEW' : editRouteCode} onChange={(e) => {
                        if (e.target.value === 'NEW') {
                          setIsNewRoute(true);
                          setEditRouteCode('');
                          setEditRouteName('');
                          setEditRouteDetails([]);
                        } else {
                          setIsNewRoute(false);
                          handleSelectEditRoute(e.target.value);
                        }
                      }}>
                        <option value="" disabled>-- เลือกเส้นทาง --</option>
                        <option value="NEW" className="text-primary fw-bold">+ สร้างเส้นทางใหม่</option>
                        {(masterData.routes || []).map(r => <option key={r.route_code} value={r.route_code}>{r.route_name}</option>)}
                      </select>
                    </div>

                    <div className="col-md-6">
                      {isNewRoute ? (
                        <>
                          <label className="form-label small fw-semibold text-muted">รหัสเส้นทางใหม่ (Route Code)</label>
                          <input type="text" className="form-control form-control-lg fw-bold text-primary" placeholder="เช่น RT03" value={editRouteCode} onChange={e => setEditRouteCode(e.target.value.toUpperCase())} />
                        </>
                      ) : (
                        editRouteCode && (
                          <div className="d-flex h-100 align-items-end pb-1">
                            <button className="btn btn-outline-danger w-100 py-2 fw-bold rounded-3" onClick={handleDeleteRoute}>ลบเส้นทางนี้ทิ้ง</button>
                          </div>
                        )
                      )}
                    </div>

                    <div className="col-md-12">
                      <label className="form-label small fw-semibold text-muted">ชื่อเส้นทาง (สามารถแก้ไขได้)</label>
                      <input type="text" className="form-control form-control-lg fw-bold" placeholder="เช่น MUT - แฟชั่นไอส์แลนด์" value={editRouteName} onChange={e => setEditRouteName(e.target.value)} disabled={!isNewRoute && !editRouteCode} />
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
                        <input type="text" className="form-control mb-3 fw-bold" placeholder="เช่น VHC05" value={newVehicle.vehicle_code} onChange={e=>setNewVehicle({...newVehicle, vehicle_code: e.target.value})} required />
                        
                        <label className="form-label small fw-semibold">ประเภทรถ</label>
                        <select className="form-select mb-3 fw-bold" value={newVehicle.type_code} onChange={e=>setNewVehicle({...newVehicle, type_code: e.target.value})} required>
                          {(masterData.vehicle_types || []).map(t => <option key={t.type_code} value={t.type_code}>{t.type_name} ({t.type_code})</option>)}
                        </select>

                        <label className="form-label small fw-semibold">ป้ายทะเบียน</label>
                        <input type="text" className="form-control mb-3 fw-bold" placeholder="เช่น 1กท 1234" value={newVehicle.license_plate} onChange={e=>setNewVehicle({...newVehicle, license_plate: e.target.value})} required />

                        <label className="form-label small fw-semibold">ความจุ (ที่นั่ง)</label>
                        <input type="number" className="form-control mb-4 fw-bold" value={newVehicle.capacity} onChange={e=>setNewVehicle({...newVehicle, capacity: e.target.value})} required />
                        
                        <button type="submit" className="btn text-white fw-bold w-100 rounded-pill py-2" style={{ backgroundColor: mutRed }}>เพิ่มรถเข้าสู่ระบบ</button>
                      </form>
                    </div>
                  </div>
                  <div className="col-md-7">
                    <table className="table table-hover align-middle border rounded-4 overflow-hidden">
                      <thead className="table-light text-muted small">
                        <tr><th className="ps-4">รหัสรถ</th><th>ประเภท</th><th>ทะเบียน</th><th>ความจุ</th><th className="text-end pe-4">ลบ</th></tr>
                      </thead>
                      <tbody>
                        {(masterData.vehicles || []).map(v => (
                          <tr key={v.vehicle_code}>
                            <td className="ps-4 fw-bold text-dark">{v.vehicle_code}</td>
                            <td className="small text-secondary">{v.type_name}</td>
                            <td className="small text-secondary">{v.license_plate}</td>
                            <td><span className="badge bg-secondary bg-opacity-10 text-secondary border px-2">{v.capacity}</span></td>
                            <td className="text-end pe-4">
                              <button className="btn btn-sm btn-outline-danger rounded-circle p-2" onClick={() => handleDeleteVehicle(v.vehicle_code)}><Trash2 size={16} /></button>
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