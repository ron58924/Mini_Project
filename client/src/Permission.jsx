import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import "./Permission.css";
import Navbar from "./Navbar";

// =====================================================
// API URL
// =====================================================
const API_URL = "http://localhost:5000/api";

function Permission() {
  // =====================================================
  // Roles / Screens
  // =====================================================
  const [roles, setRoles] = useState([]);
  const [screens, setScreens] = useState([]);
  const [selectedRole, setSelectedRole] = useState("");

  // =====================================================
  // Permission State (screens merged with the selected role's current access)
  // =====================================================
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // =====================================================
  // Load Roles + Screens
  // =====================================================
  useEffect(() => {
    fetchRoles();
    fetchScreens();
  }, []);

  const fetchRoles = async () => {
    try {
      const response = await axios.get(`${API_URL}/roles`);
      setRoles(response.data);
    } catch (error) {
      console.error("GET ROLES ERROR:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "ไม่สามารถโหลดข้อมูล Role ได้",
      });
    }
  };

  const fetchScreens = async () => {
    try {
      const response = await axios.get(`${API_URL}/screens`);
      setScreens(response.data);
    } catch (error) {
      console.error("GET SCREENS ERROR:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "ไม่สามารถโหลดข้อมูลหน้าจอได้",
      });
    }
  };

  // =====================================================
  // Load Permissions of Selected Role (merged with all screens)
  // =====================================================
  useEffect(() => {
    if (!selectedRole || screens.length === 0) {
      setPermissions([]);
      return;
    }
    fetchRolePermissions(selectedRole);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedRole, screens]);

  const fetchRolePermissions = async (roleCode) => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_URL}/role-permissions/${roleCode}`);
      const allowedMap = {};
      response.data.forEach((p) => {
        allowedMap[p.screen_code] = p.seq_no;
      });

      const merged = screens.map((s) => ({
        screen_code: s.screen_code,
        screen_name: s.screen_name,
        checked: allowedMap[s.screen_code] !== undefined,
        seq_no: allowedMap[s.screen_code] ?? null,
      }));
      setPermissions(sortBySeq(merged));
    } catch (error) {
      console.error("GET ROLE PERMISSIONS ERROR:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "ไม่สามารถโหลดสิทธิ์ของ Role นี้ได้",
      });
    } finally {
      setLoading(false);
    }
  };

  // =====================================================
  // Helpers: sort / renumber seq_no
  // =====================================================
  const sortBySeq = (list) => {
    const checked = [...list]
      .filter((p) => p.checked)
      .sort((a, b) => (a.seq_no ?? 0) - (b.seq_no ?? 0));
    const unchecked = list.filter((p) => !p.checked);
    return [...checked, ...unchecked];
  };

  const renumber = (list) => {
    let seq = 1;
    return list.map((p) =>
      p.checked ? { ...p, seq_no: seq++ } : { ...p, seq_no: null }
    );
  };

  // =====================================================
  // Toggle / Reorder
  // =====================================================
  const toggleScreen = (screenCode) => {
    setPermissions((prev) =>
      renumber(
        prev.map((p) =>
          p.screen_code === screenCode ? { ...p, checked: !p.checked } : p
        )
      )
    );
  };

  const moveUp = (index) => {
    setPermissions((prev) => {
      if (index === 0) return prev;
      const next = [...prev];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return renumber(next);
    });
  };

  const moveDown = (index) => {
    setPermissions((prev) => {
      if (index === prev.length - 1) return prev;
      const next = [...prev];
      [next[index + 1], next[index]] = [next[index], next[index + 1]];
      return renumber(next);
    });
  };

  // =====================================================
  // SAVE Permissions
  // =====================================================
  const handleSave = async () => {
    if (!selectedRole) return;
    setSaving(true);
    try {
      const payload = permissions
        .filter((p) => p.checked)
        .map((p) => ({ screen_code: p.screen_code, seq_no: p.seq_no }));

      await axios.put(`${API_URL}/role-permissions/${selectedRole}`, {
        screens: payload,
      });

      await Swal.fire({
        icon: "success",
        title: "Saved!",
        text: "บันทึกสิทธิ์เรียบร้อยแล้ว",
        timer: 1500,
        showConfirmButton: false,
      });
    } catch (error) {
      console.error("SAVE PERMISSIONS ERROR:", error);
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text:
          error.response?.data?.message ||
          error.message ||
          "ไม่สามารถบันทึกสิทธิ์ได้",
      });
    } finally {
      setSaving(false);
    }
  };

  const checkedCount = permissions.filter((p) => p.checked).length;

  return (
    <>
      <Navbar />
      <div className="permission-page container py-4">
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="fw-bold">Permission Management</h1>
        </div>

        {/* ROLE SELECT */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <label className="form-label fw-bold">Select Role</label>
            <select
              className="form-select"
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
            >
              <option value="">-- Select Role --</option>
              {roles.map((r) => (
                <option key={r.role_code} value={r.role_code}>
                  {r.role_name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* SCREEN ACCESS TABLE */}
        {selectedRole && (
          <div className="card shadow-sm">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center mb-3">
                <h4 className="mb-0">Screen Access</h4>
                <span className="badge text-bg-secondary">
                  {checkedCount} / {permissions.length} screens
                </span>
              </div>

              <div className="table-responsive">
                <table className="table table-hover table-bordered align-middle">
                  <thead className="table-primary">
                    <tr>
                      <th style={{ width: "80px" }}>Access</th>
                      <th>Screen</th>
                      <th style={{ width: "120px" }}>Order</th>
                      <th className="text-center" style={{ width: "120px" }}>
                        Move
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">
                          Loading...
                        </td>
                      </tr>
                    ) : permissions.length === 0 ? (
                      <tr>
                        <td colSpan="4" className="text-center py-4 text-muted">
                          No screen data
                        </td>
                      </tr>
                    ) : (
                      permissions.map((p, index) => (
                        <tr key={p.screen_code}>
                          <td>
                            <div className="form-check">
                              <input
                                type="checkbox"
                                className="form-check-input"
                                checked={p.checked}
                                onChange={() => toggleScreen(p.screen_code)}
                              />
                            </div>
                          </td>
                          <td>{p.screen_name}</td>
                          <td>
                            {p.checked ? (
                              <span className="badge bg-info text-dark">
                                {p.seq_no}
                              </span>
                            ) : (
                              <span className="text-muted">-</span>
                            )}
                          </td>
                          <td className="text-center">
                            {p.checked && (
                              <>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm me-1"
                                  onClick={() => moveUp(index)}
                                  disabled={index === 0}
                                >
                                  ↑
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-secondary btn-sm"
                                  onClick={() => moveDown(index)}
                                  disabled={index === permissions.length - 1}
                                >
                                  ↓
                                </button>
                              </>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="d-flex justify-content-end">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  disabled={saving}
                >
                  {saving ? "Saving..." : "Save Permissions"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default Permission;