import { useState, useEffect } from "react";
import axios from "axios";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Pie } from "react-chartjs-2";
import "bootstrap/dist/css/bootstrap.min.css";
import Navbar from "./Navbar"; 

// ลงทะเบียน Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function UserBehaviorReport() {
  // [แก้ไข] ตั้งค่า Default เป็น 1 ต.ค. 2026 ถึง 31 ต.ค. 2026
  const [startDate, setStartDate] = useState("2026-10-01");
  const [endDate, setEndDate] = useState("2026-10-31");
  const [reportData, setReportData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ฟังก์ชันแปลงวันที่เป็นภาษาไทย
  const formatThaiDate = (dateString) => {
    if (!dateString) return "";
    const months = [
      "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
      "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม"
    ];
    const d = new Date(dateString);
    return `${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear() + 543}`;
  };

  // ฟังก์ชันกดปุ่มค้นหา manual
  const handleSearch = () => {
    fetchReportData();
  };

  // ฟังก์ชันสำหรับดึงข้อมูล
  const fetchReportData = async () => {
    setLoading(true);
    try {
      const response = await axios.get("http://localhost:5000/api/reports/user-behavior", {
        params: { startDate, endDate }
      });
      setReportData(response.data);
    } catch (error) {
      console.error("Error fetching report:", error);
    } finally {
      setLoading(false);
    }
  };

  // ดึงข้อมูลเมื่อเปิดหน้าครั้งแรก
  useEffect(() => {
    fetchReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // คำนวณผลรวมแถวล่างสุด
  const summary = reportData.reduce(
    (acc, row) => {
      acc.total += row.total;
      acc.boarded += row.boarded;
      acc.canceled += row.canceled;
      acc.no_show += row.no_show;
      return acc;
    },
    { total: 0, boarded: 0, canceled: 0, no_show: 0 }
  );

  // ตั้งค่ากราฟแท่ง (Bar Chart)
  const barChartData = {
    labels: reportData.map((d) => d.user_name),
    datasets: [
      {
        label: "การจองทั้งหมด",
        data: reportData.map((d) => d.total),
        backgroundColor: "#3b82f6",
      },
      {
        label: "ขึ้นรถจริง",
        data: reportData.map((d) => d.boarded),
        backgroundColor: "#f97316",
      },
      {
        label: "ยกเลิก",
        data: reportData.map((d) => d.canceled),
        backgroundColor: "#9ca3af",
      },
      {
        label: "No Show",
        data: reportData.map((d) => d.no_show),
        backgroundColor: "#eab308",
      },
    ],
  };

  // ตั้งค่ากราฟวงกลม (Pie Chart)
  const pieChartData = {
    labels: ["ขึ้นรถจริง", "ยกเลิก", "No Show"],
    datasets: [
      {
        data: [summary.boarded, summary.canceled, summary.no_show],
        backgroundColor: ["#f97316", "#9ca3af", "#eab308"],
      },
    ],
  };

  return (
    <div className="bg-light min-vh-100">
      <Navbar />
      <div className="container py-5" style={{ fontFamily: "'Prompt', sans-serif" }}>
        <h2 className="mb-4 fw-bold text-dark">รายงานพฤติกรรมของผู้ใช้</h2>

        {/* [แก้ไข] ส่วนเลือกวันที่ให้ตรงตามรูปแบบในรูปภาพ */}
        <div className="card shadow-sm mb-4 border-0 rounded-3">
          <div className="card-body bg-white rounded-3 d-flex flex-wrap gap-3 align-items-end p-4">
            <div>
              <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '14px' }}>ตั้งแต่วันที่</label>
              <input 
                type="date" 
                className="form-control" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)} 
                style={{ width: '160px' }}
              />
            </div>
            <div>
              <label className="form-label fw-bold text-dark mb-2" style={{ fontSize: '14px' }}>ถึงวันที่</label>
              <input 
                type="date" 
                className="form-control" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)} 
                style={{ width: '160px' }}
              />
            </div>
            <button 
              className="btn btn-primary px-4 fw-bold" 
              onClick={handleSearch} 
              disabled={loading}
              style={{ padding: '0.375rem 1rem' }}
            >
              {loading ? "กำลังโหลด..." : "ค้นหา"}
            </button>
          </div>
        </div>

        {reportData.length > 0 && (
          <>
            {/* ตารางข้อมูล */}
            <div className="card shadow-sm border-0 mb-5 rounded-3 overflow-hidden">
              <div className="card-header bg-secondary text-white text-center py-3 border-0">
                <h5 className="mb-0 fw-bold fs-6">
                  รายงานพฤติกรรมของผู้ใช้ภายในช่วงวันที่ {formatThaiDate(startDate)} ถึง {formatThaiDate(endDate)}
                </h5>
              </div>
              <div className="card-body p-0 bg-white">
                <div className="table-responsive">
                  <table className="table table-hover mb-0 text-center align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="text-start ps-4 py-3 border-bottom">ผู้ใช้</th>
                        <th className="py-3 border-bottom">การจองทั้งหมด</th>
                        <th className="py-3 border-bottom">ขึ้นรถจริง</th>
                        <th className="py-3 border-bottom">ยกเลิก</th>
                        <th className="py-3 border-bottom">No Show</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row, idx) => (
                        <tr key={idx}>
                          <td className="text-start ps-4 py-3">{row.user_name}</td>
                          <td className="py-3">{row.total}</td>
                          <td className="py-3 text-success fw-bold">{row.boarded}</td>
                          <td className="py-3 text-danger">{row.canceled}</td>
                          <td className="py-3 text-warning text-dark">{row.no_show}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td className="text-end pe-4 py-3 border-top">รวมทั้งหมด</td>
                        <td className="py-3 border-top">{summary.total}</td>
                        <td className="py-3 border-top text-success">{summary.boarded}</td>
                        <td className="py-3 border-top text-danger">{summary.canceled}</td>
                        <td className="py-3 border-top text-warning text-dark">{summary.no_show}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* ส่วนกราฟ */}
            <div className="row g-4">
              <div className="col-lg-8">
                <div className="card shadow-sm border-0 h-100 rounded-3">
                  <div className="card-body text-center p-4 bg-white rounded-3">
                    <h5 className="fw-bold mb-1 text-dark">พฤติกรรมผู้ใช้</h5>
                    <h6 className="text-muted mb-4 small">
                      ({formatThaiDate(startDate)} ถึง {formatThaiDate(endDate)})
                    </h6>
                    <div style={{ height: "350px" }}>
                      <Bar 
                        data={barChartData} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          scales: { y: { beginAtZero: true } }
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="col-lg-4">
                <div className="card shadow-sm border-0 h-100 rounded-3">
                  <div className="card-body text-center p-4 bg-white rounded-3">
                    <h5 className="fw-bold mb-1 text-dark">สัดส่วนรวม ลูกค้าทุกราย</h5>
                    <h6 className="text-muted mb-4 small">
                      ({formatThaiDate(startDate)} ถึง {formatThaiDate(endDate)})
                    </h6>
                    <div style={{ height: "300px", display: "flex", justifyContent: "center" }}>
                      <Pie 
                        data={pieChartData} 
                        options={{ 
                          responsive: true, 
                          maintainAspectRatio: false,
                          plugins: { legend: { position: 'bottom' } }
                        }} 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default UserBehaviorReport;