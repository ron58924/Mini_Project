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
import Navbar from "./navbar"; // แก้เป็น navbar (n ตัวเล็ก) ตามชื่อไฟล์จริง

// ลงทะเบียน Chart.js
ChartJS.register(CategoryScale, LinearScale, BarElement, ArcElement, Title, Tooltip, Legend);

function UserBehaviorReport() {
  const [startDate, setStartDate] = useState("2025-04-12");
  const [endDate, setEndDate] = useState("2025-04-15");
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

  // ดึงข้อมูลเมื่อเปิดหน้าครั้งแรก (ย้ายฟังก์ชันมาไว้ข้างในเพื่อแก้ปัญหา ESLint)
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
    <>
      <Navbar />
      <div className="container py-5" style={{ fontFamily: "'Prompt', sans-serif" }}>
        <h2 className="mb-4 fw-bold text-dark">รายงานพฤติกรรมของผู้ใช้</h2>

        {/* ส่วนเลือกวันที่ */}
        <div className="card shadow-sm mb-4 border-0">
          <div className="card-body bg-light rounded d-flex gap-3 align-items-end">
            <div>
              <label className="form-label fw-bold">ตั้งแต่วันที่</label>
              <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="form-label fw-bold">ถึงวันที่</label>
              <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
            </div>
            <button className="btn btn-primary px-4" onClick={handleSearch} disabled={loading}>
              {loading ? "กำลังโหลด..." : "ค้นหา"}
            </button>
          </div>
        </div>

        {reportData.length > 0 && (
          <>
            {/* ตารางข้อมูล */}
            <div className="card shadow-sm border-0 mb-5">
              <div className="card-header bg-secondary text-white text-center py-3">
                <h5 className="mb-0">
                  รายงานพฤติกรรมของผู้ใช้ภายในช่วงวันที่ {formatThaiDate(startDate)} ถึง {formatThaiDate(endDate)}
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-bordered table-hover mb-0 text-center align-middle">
                    <thead className="table-light">
                      <tr>
                        <th className="text-start ps-4">ผู้ใช้</th>
                        <th>การจองทั้งหมด</th>
                        <th>ขึ้นรถจริง</th>
                        <th>ยกเลิก</th>
                        <th>No Show</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((row, idx) => (
                        <tr key={idx}>
                          <td className="text-start ps-4">{row.user_name}</td>
                          <td>{row.total}</td>
                          <td>{row.boarded}</td>
                          <td>{row.canceled}</td>
                          <td>{row.no_show}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="table-light fw-bold">
                      <tr>
                        <td className="text-end pe-4">รวมทั้งหมด</td>
                        <td>{summary.total}</td>
                        <td>{summary.boarded}</td>
                        <td>{summary.canceled}</td>
                        <td>{summary.no_show}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>

            {/* ส่วนกราฟ */}
            <div className="row g-4">
              <div className="col-lg-8">
                <div className="card shadow-sm border-0 h-100">
                  <div className="card-body text-center p-4">
                    <h4 className="fw-bold mb-1">พฤติกรรมผู้ใช้</h4>
                    <h5 className="text-muted mb-4">
                      ({formatThaiDate(startDate)} ถึง {formatThaiDate(endDate)})
                    </h5>
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
                <div className="card shadow-sm border-0 h-100">
                  <div className="card-body text-center p-4">
                    <h4 className="fw-bold mb-1">สัดส่วนรวม ลูกค้าทุกราย</h4>
                    <h5 className="text-muted mb-4">
                      ({formatThaiDate(startDate)} ถึง {formatThaiDate(endDate)})
                    </h5>
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
    </>
  );
}

export default UserBehaviorReport;