import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Plus, Edit, Trash2, Calendar, Clock, MapPin, Bus, User, Navigation, ListOrdered, X, Settings } from 'lucide-react';
import Navbar from './Navbar';

const API_URL = "http://localhost:5000/api";
const mutRed = '#c8102e';

function Schedules() {
  const [activeTab, setActiveTab] = useState('schedules'); 
  
  const [schedules, setSchedules] = useState([]);
  const [stations, setStations] = useState([]);
  const [masterData, setMasterData] = useState({ routes: [], drivers: [], vehicles: [], vehicle_types: [] });
  const [loading, setLoading] = useState(true);

  // ==========================================
  // STATE: Schedules
  // ==========================================
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ schedule_code: '', route_code: '', vehicle_code: '', driver_code: '', start_time: '', travel_date: '' });
  const [showStopsModal, setShowStopsModal] = useState(false);
  const [tripLogs, setTripLogs] = useState([]);
  const [selectedScheduleName, setSelectedScheduleName] = useState('');

  // ==========================================
  // STATE: Stations
  // ==========================================
  const [showStationModal, setShowStationModal] = useState(false);
  const [isEditingStation, setIsEditingStation] = useState(false);
  const [stationForm, setStationForm] = useState({ stop_code: '', stop_name: '' });

  // ==========================================
  // STATE: Vehicles
  // ==========================================
  const [showVehicleModal, setShowVehicleModal] = useState(false);
  const [isEditingVehicle, setIsEditingVehicle] = useState(false);
  const [vehicleForm, setVehicleForm] = useState({ vehicle_code: '', type_code: '', license_plate: '', capacity: '' });

  // ==========================================
  // STATE: Routes (เส้นทางเดินรถ)
  // ==========================================
  const [showRouteModal, setShowRouteModal] = useState(false);
  const [isEditingRoute, setIsEditingRoute] = useState(false);
  const [routeForm, setRouteForm] = useState({ route_code: '', route_name: '', details: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [masterRes, scheduleRes, stationRes] = await Promise.all([
        axios.get(`${API_URL}/admin/master-data`),
        axios.get(`${API_URL}/admin/schedules`),
        axios.get(`${API_URL}/stations`)
      ]);
      setMasterData(masterRes.data);
      setSchedules(scheduleRes.data);
      setStations(stationRes.data);
    } catch (error) {
      Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลได้', 'error');
    } finally {
      setLoading(false);
    }
  };

  const formatThaiDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short', day: 'numeric' });
  };

  // ==========================================
  // FUNCTIONS: Schedules
  // ==========================================
  const handleInputChange = (e) => { setFormData({ ...formData, [e.target.name]: e.target.value }); };

  const openCreateModal = () => {
    setIsEditing(false);
    setFormData({ schedule_code: '', route_code: '', vehicle_code: '', driver_code: '', start_time: '', travel_date: '' });
    setShowModal(true);
  };

  const openEditModal = (sch) => {
    setIsEditing(true);
    setFormData({
      schedule_code: sch.schedule_code,
      route_code: masterData.routes.find(r => r.route_name === sch.route_name)?.route_code || '',
      vehicle_code: sch.vehicle_code,
      driver_code: sch.driver_code,
      start_time: sch.start_time,
      travel_date: sch.travel_date
    });
    setShowModal(true);
  };

  const viewStops = async (schedule_code, route_name) => {
    try {
      const res = await axios.get(`${API_URL}/driver/trip-logs`, { params: { schedule_code } });
      setTripLogs(res.data);
      setSelectedScheduleName(route_name);
      setShowStopsModal(true);
    } catch (error) { Swal.fire('Error', 'ไม่สามารถโหลดข้อมูลจุดจอดได้', 'error'); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.route_code || !formData.vehicle_code || !formData.driver_code || !formData.start_time || !formData.travel_date) {
      return Swal.fire('แจ้งเตือน', 'กรุณากรอกข้อมูลให้ครบถ้วน', 'warning');
    }
    try {
      if (isEditing) {
        const res = await axios.put(`${API_URL}/admin/schedules/${formData.schedule_code}`, formData);
        Swal.fire('สำเร็จ', res.data.message || 'อัปเดตข้อมูลสำเร็จ', 'success');
      } else {
        await axios.post(`${API_URL}/admin/schedules/create`, formData);
        Swal.fire('สำเร็จ', 'สร้างรอบการเดินรถสำเร็จ', 'success');
      }
      setShowModal(false);
      fetchData();
    } catch (error) { Swal.fire('Error', error.response?.data?.message || 'เกิดข้อผิดพลาด', 'error'); }
  };

  const handleDelete = (code) => {
    Swal.fire({ title: 'ยืนยันการลบ?', text: `ต้องการลบรอบรถ ${code} หรือไม่?`, icon: 'warning', showCancelButton: true, confirmButtonColor: mutRed, confirmButtonText: 'ลบเลย'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_URL}/admin/schedules/${code}`);
          Swal.fire('Deleted!', 'ลบข้อมูลเรียบร้อย', 'success');
          fetchData();
        } catch (error) { Swal.fire('Error', 'ไม่สามารถลบได้', 'error'); }
      }
    });
  };

  // ==========================================
  // FUNCTIONS: Stations
  // ==========================================
  const openCreateStationModal = () => { setIsEditingStation(false); setStationForm({ stop_code: '', stop_name: '' }); setShowStationModal(true); };
  
  const openEditStationModal = (st) => { setIsEditingStation(true); setStationForm({ stop_code: st.stop_code, stop_name: st.stop_name }); setShowStationModal(true); };

  const handleStationSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditingStation) {
        await axios.put(`${API_URL}/admin/stations/${stationForm.stop_code}`, { stop_name: stationForm.stop_name });
        Swal.fire('สำเร็จ', 'แก้ไขจุดจอดเรียบร้อย', 'success');
      } else {
        await axios.post(`${API_URL}/admin/stations`, stationForm);
        Swal.fire('สำเร็จ', 'เพิ่มจุดจอดใหม่เรียบร้อย', 'success');
      }
      setShowStationModal(false);
      fetchData();
    } catch (error) { Swal.fire('Error', error.response?.data?.message || 'เกิดข้อผิดพลาด', 'error'); }
  };

  const handleDeleteStation = (code) => {
    Swal.fire({ title: 'ยืนยันการลบ?', text: `ต้องการลบจุดจอด ${code} หรือไม่?`, icon: 'warning', showCancelButton: true, confirmButtonColor: mutRed, confirmButtonText: 'ลบเลย'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_URL}/admin/stations/${code}`);
          Swal.fire('Deleted!', 'ลบข้อมูลเรียบร้อย', 'success');
          fetchData();
        } catch (error) { Swal.fire('Error', error.response?.data?.message || 'ไม่สามารถลบได้', 'error'); }
      }
    });
  };

  // ==========================================
  // FUNCTIONS: Vehicles
  // ==========================================
  const openCreateVehicleModal = () => { 
    setIsEditingVehicle(false); 
    setVehicleForm({ vehicle_code: '', type_code: '', license_plate: '', capacity: '' }); 
    setShowVehicleModal(true); 
  };

  const openEditVehicleModal = (v) => { 
    setIsEditingVehicle(true); 
    setVehicleForm({ 
      vehicle_code: v.vehicle_code, 
      type_code: v.type_code || '', 
      license_plate: v.license_plate, 
      capacity: v.capacity 
    }); 
    setShowVehicleModal(true); 
  };

  const handleVehicleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditingVehicle) {
        await axios.put(`${API_URL}/admin/vehicles/${vehicleForm.vehicle_code}`, vehicleForm);
        Swal.fire('สำเร็จ', 'แก้ไขยานพาหนะเรียบร้อย', 'success');
      } else {
        await axios.post(`${API_URL}/admin/vehicles`, vehicleForm);
        Swal.fire('สำเร็จ', 'เพิ่มยานพาหนะใหม่เรียบร้อย', 'success');
      }
      setShowVehicleModal(false);
      fetchData();
    } catch (error) { Swal.fire('Error', error.response?.data?.message || 'เกิดข้อผิดพลาด', 'error'); }
  };

  const handleDeleteVehicle = (code) => {
    Swal.fire({ title: 'ยืนยันการลบ?', text: `ต้องการลบรถ ${code} หรือไม่?`, icon: 'warning', showCancelButton: true, confirmButtonColor: mutRed, confirmButtonText: 'ลบเลย'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_URL}/admin/vehicles/${code}`);
          Swal.fire('Deleted!', 'ลบข้อมูลเรียบร้อย', 'success');
          fetchData();
        } catch (error) { Swal.fire('Error', error.response?.data?.message || 'ไม่สามารถลบได้', 'error'); }
      }
    });
  };

  // ==========================================
  // FUNCTIONS: Routes (เส้นทาง)
  // ==========================================
  const openCreateRouteModal = () => {
    setIsEditingRoute(false);
    setRouteForm({ route_code: '', route_name: '', details: [{ stop_code: '', avg_travel_minutes: 0 }] });
    setShowRouteModal(true);
  };

  const openEditRouteModal = async (r) => {
    try {
      const res = await axios.get(`${API_URL}/admin/routes/${r.route_code}/details`);
      setRouteForm({ route_code: r.route_code, route_name: r.route_name, details: res.data });
      setIsEditingRoute(true);
      setShowRouteModal(true);
    } catch (error) {
      Swal.fire('Error', 'ไม่สามารถโหลดรายละเอียดเส้นทางได้', 'error');
    }
  };

  const addRouteDetail = () => {
    setRouteForm({ ...routeForm, details: [...routeForm.details, { stop_code: '', avg_travel_minutes: 0 }] });
  };

  const removeRouteDetail = (index) => {
    const newDetails = [...routeForm.details];
    newDetails.splice(index, 1);
    setRouteForm({ ...routeForm, details: newDetails });
  };

  const handleRouteDetailChange = (index, field, value) => {
    const newDetails = [...routeForm.details];
    newDetails[index][field] = value;
    setRouteForm({ ...routeForm, details: newDetails });
  };

  const handleRouteSubmit = async (e) => {
    e.preventDefault();
    if (routeForm.details.length < 2) return Swal.fire('แจ้งเตือน', 'ต้องมีจุดจอดอย่างน้อย 2 จุดในหนึ่งเส้นทาง', 'warning');
    
    // ตรวจสอบว่าเลือกป้ายครบหรือไม่
    const hasEmptyStops = routeForm.details.some(d => !d.stop_code);
    if (hasEmptyStops) return Swal.fire('แจ้งเตือน', 'กรุณาเลือกป้ายรถเมล์ให้ครบทุกช่อง', 'warning');

    try {
      // API ตัวนี้จะทำหน้าที่ทั้งสร้างใหม่ (INSERT) และอัปเดต (UPDATE) ให้เอง
      await axios.put(`${API_URL}/admin/routes/${routeForm.route_code}/details`, {
        route_name: routeForm.route_name,
        details: routeForm.details
      });
      Swal.fire('สำเร็จ', 'บันทึกข้อมูลเส้นทางเรียบร้อย', 'success');
      setShowRouteModal(false);
      fetchData();
    } catch (error) {
      Swal.fire('Error', error.response?.data?.message || 'เกิดข้อผิดพลาด', 'error');
    }
  };

  const handleDeleteRoute = (code) => {
    Swal.fire({ title: 'ยืนยันการลบ?', text: `ต้องการลบเส้นทาง ${code} หรือไม่?`, icon: 'warning', showCancelButton: true, confirmButtonColor: mutRed, confirmButtonText: 'ลบเลย'
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          await axios.delete(`${API_URL}/admin/routes/${code}`);
          Swal.fire('Deleted!', 'ลบเส้นทางเรียบร้อย', 'success');
          fetchData();
        } catch (error) { Swal.fire('Error', error.response?.data?.message || 'ไม่สามารถลบได้', 'error'); }
      }
    });
  };

  return (
    <div className="bg-light min-vh-100 pb-5">
      <Navbar />
      <div className="container mt-4">
        
        <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center mb-4 gap-3">
          <div>
            <h2 className="fw-bold mb-1" style={{ color: mutRed }}>จัดการระบบเดินรถ (Master Data)</h2>
            <p className="text-muted mb-0">จัดการรอบรถ, เส้นทาง, จุดจอด และยานพาหนะในระบบ</p>
          </div>
          
          <div className="bg-white p-1 rounded-pill shadow-sm border d-flex flex-wrap justify-content-center">
            <button className={`btn rounded-pill px-3 fw-bold ${activeTab === 'schedules' ? 'text-white' : 'text-secondary bg-transparent border-0'}`} style={{ backgroundColor: activeTab === 'schedules' ? mutRed : '' }} onClick={() => setActiveTab('schedules')}><Calendar size={16} className="me-2 mb-1"/>รอบรถ</button>
            <button className={`btn rounded-pill px-3 fw-bold ${activeTab === 'routes' ? 'text-white' : 'text-secondary bg-transparent border-0'}`} style={{ backgroundColor: activeTab === 'routes' ? mutRed : '' }} onClick={() => setActiveTab('routes')}><Navigation size={16} className="me-2 mb-1"/>เส้นทาง</button>
            <button className={`btn rounded-pill px-3 fw-bold ${activeTab === 'stations' ? 'text-white' : 'text-secondary bg-transparent border-0'}`} style={{ backgroundColor: activeTab === 'stations' ? mutRed : '' }} onClick={() => setActiveTab('stations')}><MapPin size={16} className="me-2 mb-1"/>จุดจอด</button>
            <button className={`btn rounded-pill px-3 fw-bold ${activeTab === 'vehicles' ? 'text-white' : 'text-secondary bg-transparent border-0'}`} style={{ backgroundColor: activeTab === 'vehicles' ? mutRed : '' }} onClick={() => setActiveTab('vehicles')}><Bus size={16} className="me-2 mb-1"/>รถ</button>
          </div>
        </div>

        {/* TAB 1: Schedules */}
        {activeTab === 'schedules' && (
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden animate-fade-in">
            <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark">รายการรอบรถทั้งหมด</h5>
              <button className="btn text-white fw-bold px-3 py-2 rounded-pill shadow-sm" style={{ backgroundColor: mutRed, fontSize: '14px' }} onClick={openCreateModal}>
                <Plus size={16} className="me-1" /> เพิ่มรอบรถใหม่
              </button>
            </div>
            <div className="card-body p-0">
              {loading ? <div className="text-center py-5 text-muted">กำลังโหลดข้อมูล...</div> : (
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th className="py-3 px-4 text-secondary">รหัสรอบรถ</th>
                        <th className="py-3 px-3 text-secondary">วันที่ / เวลา</th>
                        <th className="py-3 px-3 text-secondary">เส้นทางเดินรถ</th>
                        <th className="py-3 px-3 text-secondary">คนขับ / ยานพาหนะ</th>
                        <th className="py-3 px-4 text-secondary text-end">จัดการ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {schedules.length === 0 ? (
                        <tr><td colSpan="5" className="text-center py-4 text-muted">ไม่มีข้อมูลรอบรถ</td></tr>
                      ) : (
                        schedules.map((sch) => (
                          <tr key={sch.schedule_code}>
                            <td className="px-4 fw-bold">{sch.schedule_code}</td>
                            <td className="px-3">
                              <div className="fw-bold text-dark"><Calendar size={14} className="me-1 text-muted"/>{formatThaiDate(sch.travel_date)}</div>
                              <div className="text-primary fw-bold"><Clock size={14} className="me-1"/>{sch.start_time} น.</div>
                            </td>
                            <td className="px-3">
                              <span className="badge bg-dark text-white rounded-pill px-3 py-2 fw-normal" style={{ fontSize: '12px' }}><MapPin size={12} className="me-1"/> {sch.route_name}</span>
                              <div className="mt-2">
                                <button onClick={() => viewStops(sch.schedule_code, sch.route_name)} className="btn btn-sm btn-outline-secondary rounded-pill py-0 px-2" style={{ fontSize: '11px' }}><ListOrdered size={12} className="me-1"/> ดูจุดจอด</button>
                              </div>
                            </td>
                            <td className="px-3">
                              <div className="d-flex flex-column">
                                <span className="text-dark fw-semibold"><User size={14} className="me-1 text-muted"/> {sch.driver_name || 'ไม่ระบุ'}</span>
                                <span className="text-muted small"><Bus size={14} className="me-1"/> {sch.vehicle_code || 'ไม่ระบุ'}</span>
                              </div>
                            </td>
                            <td className="px-4 text-end">
                              <button className="btn btn-light text-primary btn-sm rounded-circle me-2 shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => openEditModal(sch)}><Edit size={16} /></button>
                              <button className="btn btn-light text-danger btn-sm rounded-circle shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => handleDelete(sch.schedule_code)}><Trash2 size={16} /></button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: Routes (เส้นทาง) */}
        {activeTab === 'routes' && (
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden animate-fade-in">
            <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark">เส้นทางเดินรถทั้งหมด</h5>
              <button className="btn text-white fw-bold px-3 py-2 rounded-pill shadow-sm" style={{ backgroundColor: mutRed, fontSize: '14px' }} onClick={openCreateRouteModal}>
                <Plus size={16} className="me-1" /> เพิ่มเส้นทางใหม่
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="py-3 px-4 text-secondary" style={{ width: '20%' }}>รหัสเส้นทาง</th>
                      <th className="py-3 px-3 text-secondary">ชื่อเส้นทาง</th>
                      <th className="py-3 px-4 text-secondary text-end" style={{ width: '20%' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masterData.routes.length === 0 ? (
                      <tr><td colSpan="3" className="text-center py-4 text-muted">ไม่มีข้อมูลเส้นทาง</td></tr>
                    ) : (
                      masterData.routes.map((r) => (
                        <tr key={r.route_code}>
                          <td className="px-4 fw-bold text-muted">{r.route_code}</td>
                          <td className="px-3 fw-bold text-dark fs-6"><Navigation size={16} className="text-primary me-2"/>{r.route_name}</td>
                          <td className="px-4 text-end">
                            <button className="btn btn-light text-primary btn-sm rounded-circle me-2 shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => openEditRouteModal(r)}><Edit size={16} /></button>
                            <button className="btn btn-light text-danger btn-sm rounded-circle shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => handleDeleteRoute(r.route_code)}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: Stations */}
        {activeTab === 'stations' && (
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden animate-fade-in">
            <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark">จุดจอดรถทั้งหมด</h5>
              <button className="btn text-white fw-bold px-3 py-2 rounded-pill shadow-sm" style={{ backgroundColor: mutRed, fontSize: '14px' }} onClick={openCreateStationModal}>
                <Plus size={16} className="me-1" /> เพิ่มจุดจอด
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="py-3 px-4 text-secondary" style={{ width: '20%' }}>รหัสจุดจอด</th>
                      <th className="py-3 px-3 text-secondary">ชื่อจุดจอด</th>
                      <th className="py-3 px-4 text-secondary text-end" style={{ width: '20%' }}>จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stations.length === 0 ? (
                      <tr><td colSpan="3" className="text-center py-4 text-muted">ไม่มีข้อมูลจุดจอด</td></tr>
                    ) : (
                      [...stations].sort((a, b) => a.stop_code.localeCompare(b.stop_code, undefined, { numeric: true })).map((st) => (
                        <tr key={st.stop_code}>
                          <td className="px-4 fw-bold text-muted">{st.stop_code}</td>
                          <td className="px-3 fw-bold text-dark fs-6"><MapPin size={16} className="text-danger me-2"/>{st.stop_name}</td>
                          <td className="px-4 text-end">
                            <button className="btn btn-light text-primary btn-sm rounded-circle me-2 shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => openEditStationModal(st)}><Edit size={16} /></button>
                            <button className="btn btn-light text-danger btn-sm rounded-circle shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => handleDeleteStation(st.stop_code)}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: Vehicles */}
        {activeTab === 'vehicles' && (
          <div className="card border-0 shadow-sm rounded-4 overflow-hidden animate-fade-in">
            <div className="card-header bg-white p-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="fw-bold mb-0 text-dark">ยานพาหนะทั้งหมด</h5>
              <button className="btn text-white fw-bold px-3 py-2 rounded-pill shadow-sm" style={{ backgroundColor: mutRed, fontSize: '14px' }} onClick={openCreateVehicleModal}>
                <Plus size={16} className="me-1" /> เพิ่มยานพาหนะ
              </button>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th className="py-3 px-4 text-secondary">รหัสรถ</th>
                      <th className="py-3 px-3 text-secondary">ป้ายทะเบียน</th>
                      <th className="py-3 px-3 text-secondary">ประเภท</th>
                      <th className="py-3 px-3 text-secondary text-center">ความจุ (ที่นั่ง)</th>
                      <th className="py-3 px-4 text-secondary text-end">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody>
                    {masterData.vehicles.length === 0 ? (
                      <tr><td colSpan="5" className="text-center py-4 text-muted">ไม่มีข้อมูลยานพาหนะ</td></tr>
                    ) : (
                      masterData.vehicles.map((v) => (
                        <tr key={v.vehicle_code}>
                          <td className="px-4 fw-bold text-muted">{v.vehicle_code}</td>
                          <td className="px-3 fw-bold text-dark"><div className="badge border border-dark text-dark px-3 py-2 fs-6">{v.license_plate}</div></td>
                          <td className="px-3 fw-semibold text-secondary">{v.type_name || <span className="text-danger small">ยังไม่ระบุประเภท</span>}</td>
                          <td className="px-3 text-center fw-bold text-primary">{v.capacity}</td>
                          <td className="px-4 text-end">
                            <button className="btn btn-light text-primary btn-sm rounded-circle me-2 shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => openEditVehicleModal(v)}><Edit size={16} /></button>
                            <button className="btn btn-light text-danger btn-sm rounded-circle shadow-sm" style={{ width: '35px', height: '35px' }} onClick={() => handleDeleteVehicle(v.vehicle_code)}><Trash2 size={16} /></button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* MODAL: Schedules */}
      {showModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header text-white border-0" style={{ backgroundColor: mutRed }}>
                <h5 className="modal-title fw-bold">{isEditing ? `แก้ไขรอบรถ ${formData.schedule_code}` : 'สร้างรอบรถใหม่'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleSubmit}>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <label className="form-label fw-bold small text-muted"><Calendar size={14} className="me-1"/>วันที่เดินทาง</label>
                      <input type="date" className="form-control rounded-3" name="travel_date" value={formData.travel_date} onChange={handleInputChange} required />
                    </div>
                    <div className="col-md-6 mt-3 mt-md-0">
                      <label className="form-label fw-bold small text-muted"><Clock size={14} className="me-1"/>เวลาออกรถ</label>
                      <input type="time" className="form-control rounded-3" name="start_time" value={formData.start_time} onChange={handleInputChange} required />
                    </div>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted"><MapPin size={14} className="me-1"/>เส้นทางเดินรถ</label>
                    <select className="form-select rounded-3" name="route_code" value={formData.route_code} onChange={handleInputChange} required>
                      <option value="">-- เลือกเส้นทาง --</option>
                      {masterData.routes.map(r => <option key={r.route_code} value={r.route_code}>{r.route_name}</option>)}
                    </select>
                    {isEditing && <small className="text-danger mt-1 d-block">*การเปลี่ยนเส้นทางหรือเวลา จะคำนวณจุดจอดใหม่ทั้งหมด</small>}
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted"><Bus size={14} className="me-1"/>ยานพาหนะ</label>
                    <select className="form-select rounded-3" name="vehicle_code" value={formData.vehicle_code} onChange={handleInputChange} required>
                      <option value="">-- เลือกรถ --</option>
                      {masterData.vehicles.map(v => <option key={v.vehicle_code} value={v.vehicle_code}>{v.vehicle_code} - {v.license_plate} ({v.capacity} ที่นั่ง)</option>)}
                    </select>
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-bold small text-muted"><User size={14} className="me-1"/>คนขับรถ</label>
                    <select className="form-select rounded-3" name="driver_code" value={formData.driver_code} onChange={handleInputChange} required>
                      <option value="">-- เลือกคนขับ --</option>
                      {masterData.drivers.map(d => <option key={d.driver_code} value={d.driver_code}>{d.driver_code} - {d.driver_name}</option>)}
                    </select>
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-light flex-fill rounded-pill fw-bold py-2" onClick={() => setShowModal(false)}>ยกเลิก</button>
                    <button type="submit" className="btn text-white flex-fill rounded-pill fw-bold py-2" style={{ backgroundColor: mutRed }}>{isEditing ? 'บันทึกการแก้ไข' : 'สร้างรอบรถ'}</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: View Stops */}
      {showStopsModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-4">
              <div className="modal-header bg-light border-bottom-0 pb-0">
                <h5 className="modal-title fw-bold text-dark">จุดจอดเรียงตามลำดับ</h5>
                <button type="button" className="btn-close" onClick={() => setShowStopsModal(false)}></button>
              </div>
              <div className="modal-body pt-3 pb-4">
                <p className="badge bg-danger text-white mb-4 text-wrap lh-base" style={{ fontSize: '13px' }}>{selectedScheduleName}</p>
                <div className="position-relative ms-3 border-start border-2 border-danger pb-3">
                  {tripLogs.length === 0 ? (
                    <div className="text-center text-muted small">ไม่มีข้อมูลจุดจอด</div>
                  ) : (
                    tripLogs.map((log, index) => (
                      <div key={log.log_code} className="mb-4 position-relative ps-4">
                        <div className="position-absolute rounded-circle d-flex justify-content-center align-items-center bg-danger text-white fw-bold shadow-sm" style={{ width: '26px', height: '26px', left: '-14px', top: '-2px', fontSize: '12px' }}>{index + 1}</div>
                        <div>
                          <h6 className="fw-bold mb-1 text-dark">{log.stop_name}</h6>
                          <div className="text-muted small d-flex align-items-center"><Clock size={12} className="me-1"/> เวลาคาดการณ์: <span className="fw-bold text-primary ms-1">{log.expected_time} น.</span></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Routes (เส้นทางเดินรถ) */}
      {showRouteModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg modal-dialog-centered modal-dialog-scrollable">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header text-white border-0" style={{ backgroundColor: mutRed }}>
                <h5 className="modal-title fw-bold">{isEditingRoute ? `แก้ไขเส้นทาง ${routeForm.route_code}` : 'สร้างเส้นทางใหม่'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowRouteModal(false)}></button>
              </div>
              <div className="modal-body p-4 bg-light">
                <form onSubmit={handleRouteSubmit}>
                  <div className="bg-white p-3 rounded-4 shadow-sm border mb-4">
                    <div className="row">
                      <div className="col-md-4 mb-3 mb-md-0">
                        <label className="form-label fw-bold small text-muted">รหัสเส้นทาง (เช่น RT01)</label>
                        <input type="text" className="form-control rounded-3 bg-light" value={routeForm.route_code} onChange={(e) => setRouteForm({...routeForm, route_code: e.target.value})} required disabled={isEditingRoute} />
                      </div>
                      <div className="col-md-8">
                        <label className="form-label fw-bold small text-muted">ชื่อเส้นทาง</label>
                        <input type="text" className="form-control rounded-3" value={routeForm.route_name} onChange={(e) => setRouteForm({...routeForm, route_name: e.target.value})} required />
                      </div>
                    </div>
                  </div>

                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="fw-bold text-dark mb-0">ลำดับจุดจอด (จากต้นทางไปปลายทาง)</h6>
                    <button type="button" className="btn btn-sm btn-outline-danger rounded-pill fw-bold" onClick={addRouteDetail}>
                      <Plus size={14} className="me-1 mb-1"/> เพิ่มป้ายใหม่
                    </button>
                  </div>

                  <div className="d-flex flex-column gap-3 mb-4">
                    {routeForm.details.map((detail, index) => (
                      <div key={index} className="bg-white p-3 rounded-4 shadow-sm border position-relative ps-5">
                        <div className="position-absolute rounded-circle d-flex justify-content-center align-items-center bg-danger text-white fw-bold shadow-sm" style={{ width: '26px', height: '26px', left: '12px', top: '16px', fontSize: '12px' }}>{index + 1}</div>
                        <div className="row align-items-end">
                          <div className="col-md-6 mb-2 mb-md-0">
                            <label className="form-label small fw-bold text-muted mb-1">เลือกจุดจอด</label>
                            <select className="form-select rounded-3" value={detail.stop_code} onChange={(e) => handleRouteDetailChange(index, 'stop_code', e.target.value)} required>
                              <option value="">-- เลือกจุดจอด --</option>
                              {stations.map(st => <option key={st.stop_code} value={st.stop_code}>{st.stop_name}</option>)}
                            </select>
                          </div>
                          <div className="col-md-5 mb-2 mb-md-0">
                            <label className="form-label small fw-bold text-muted mb-1">เวลาเดินทางจากป้ายก่อนหน้า (นาที)</label>
                            <input type="number" className="form-control rounded-3" value={detail.avg_travel_minutes} onChange={(e) => handleRouteDetailChange(index, 'avg_travel_minutes', e.target.value)} required min="0" />
                            {index === 0 && <small className="text-muted d-block mt-1" style={{ fontSize: '11px' }}>*จุดเริ่มต้นปกติใส่เป็น 0</small>}
                          </div>
                          <div className="col-md-1 text-end">
                            <button type="button" className="btn btn-light text-danger rounded-circle p-2" onClick={() => removeRouteDetail(index)}><Trash2 size={16} /></button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-light flex-fill rounded-pill fw-bold py-3 border" onClick={() => setShowRouteModal(false)}>ยกเลิก</button>
                    <button type="submit" className="btn text-white flex-fill rounded-pill fw-bold py-3 shadow-sm" style={{ backgroundColor: mutRed }}>บันทึกข้อมูลเส้นทาง</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Stations */}
      {showStationModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header text-white border-0" style={{ backgroundColor: mutRed }}>
                <h5 className="modal-title fw-bold">{isEditingStation ? `แก้ไขจุดจอด ${stationForm.stop_code}` : 'เพิ่มจุดจอดใหม่'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowStationModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleStationSubmit}>
                  {!isEditingStation && (
                    <div className="mb-3">
                      <label className="form-label fw-bold small text-muted">รหัสจุดจอด (เช่น ST01)</label>
                      <input type="text" className="form-control rounded-3" value={stationForm.stop_code} onChange={(e) => setStationForm({...stationForm, stop_code: e.target.value})} required />
                    </div>
                  )}
                  <div className="mb-4">
                    <label className="form-label fw-bold small text-muted">ชื่อจุดจอด (Station Name)</label>
                    <input type="text" className="form-control rounded-3" value={stationForm.stop_name} onChange={(e) => setStationForm({...stationForm, stop_name: e.target.value})} required />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-light flex-fill rounded-pill fw-bold py-2" onClick={() => setShowStationModal(false)}>ยกเลิก</button>
                    <button type="submit" className="btn text-white flex-fill rounded-pill fw-bold py-2" style={{ backgroundColor: mutRed }}>บันทึกข้อมูล</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Vehicles */}
      {showVehicleModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
              <div className="modal-header text-white border-0" style={{ backgroundColor: mutRed }}>
                <h5 className="modal-title fw-bold">{isEditingVehicle ? `แก้ไขยานพาหนะ ${vehicleForm.vehicle_code}` : 'เพิ่มยานพาหนะใหม่'}</h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setShowVehicleModal(false)}></button>
              </div>
              <div className="modal-body p-4">
                <form onSubmit={handleVehicleSubmit}>
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">รหัสยานพาหนะ (เช่น VHC03)</label>
                    <input type="text" className="form-control rounded-3" value={vehicleForm.vehicle_code} onChange={(e) => setVehicleForm({...vehicleForm, vehicle_code: e.target.value})} required disabled={isEditingVehicle} />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">ประเภทยานพาหนะ</label>
                    <select className="form-select rounded-3" value={vehicleForm.type_code} onChange={(e) => setVehicleForm({...vehicleForm, type_code: e.target.value})} required>
                      <option value="">-- เลือกประเภท --</option>
                      {masterData.vehicle_types.map(t => <option key={t.type_code} value={t.type_code}>{t.type_name}</option>)}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold small text-muted">ป้ายทะเบียน</label>
                    <input type="text" className="form-control rounded-3" value={vehicleForm.license_plate} onChange={(e) => setVehicleForm({...vehicleForm, license_plate: e.target.value})} required />
                  </div>
                  <div className="mb-4">
                    <label className="form-label fw-bold small text-muted">ความจุ (จำนวนที่นั่ง)</label>
                    <input type="number" className="form-control rounded-3" value={vehicleForm.capacity} onChange={(e) => setVehicleForm({...vehicleForm, capacity: e.target.value})} required min="1" />
                  </div>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-light flex-fill rounded-pill fw-bold py-2" onClick={() => setShowVehicleModal(false)}>ยกเลิก</button>
                    <button type="submit" className="btn text-white flex-fill rounded-pill fw-bold py-2" style={{ backgroundColor: mutRed }}>บันทึกข้อมูล</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default Schedules;