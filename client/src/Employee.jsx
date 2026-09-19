import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal } from "bootstrap";
import Navbar from "./navbar"; // เช็กชื่อไฟล์ในเครื่องด้วยว่าใช้ navbar.jsx หรือ Navbar.jsx
import "./Employee.css";

// =====================================================
// API URL
// =====================================================
const API_URL = "http://localhost:5000/api/mutemp";

function Employee() {
  // =====================================================
  // States
  // =====================================================
  const [employees, setEmployees] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    empname: "",
    empaddress: "",
    empemail: "",
    emppassword: "",
    salary: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // =====================================================
  // Load Employees Initial
  // =====================================================
  useEffect(() => {
    const getInitialData = async () => {
      try {
        const response = await axios.get(API_URL);
        setEmployees(response.data);
        console.log("GET EMPLOYEES:", response.data);
      } catch (error) {
        console.error("GET ERROR:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "ไม่สามารถโหลดข้อมูล Employee ได้",
        });
      }
    };

    getInitialData();
  }, []);

  // =====================================================
  // Re-fetch Employees Function
  // =====================================================
  const fetchEmployees = async () => {
    try {
      const response = await axios.get(API_URL);
      setEmployees(response.data);
      console.log("GET EMPLOYEES:", response.data);
    } catch (error) {
      console.error("GET ERROR:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "ไม่สามารถโหลดข้อมูล Employee ได้",
      });
    }
  };

  // =====================================================
  // Handle Input
  // =====================================================
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  // =====================================================
  // Clear Form
  // =====================================================
  const clearForm = () => {
    setForm({
      empname: "",
      empaddress: "",
      empemail: "",
      emppassword: "",
      salary: "",
    });
    setEditMode(false);
    setEditId(null);
  };

  // =====================================================
  // Close Bootstrap Modal
  // =====================================================
  const closeModal = () => {
    const modalElement = document.getElementById("employeeModal");
    if (modalElement) {
      const modal =
        Modal.getInstance(modalElement) ||
        Modal.getOrCreateInstance(modalElement);
      if (modal) {
        modal.hide();
      }
    }
  };

  // =====================================================
  // CREATE Employee
  // =====================================================
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      console.log("Sending CREATE:", form);
      const response = await axios.post(API_URL, form);
      console.log("CREATE RESPONSE:", response.data);

      await fetchEmployees();
      clearForm();
      closeModal();

      const createdId = response.data.empId ?? response.data.EMPID ?? "";

      await Swal.fire({
        icon: "success",
        title: "Saved!",
        text: `เพิ่ม Employee สำเร็จ\nEmployee ID: ${createdId}`,
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("CREATE ERROR:", error);
      console.error("CREATE RESPONSE:", error.response);
      Swal.fire({
        icon: "error",
        title: "Save Failed",
        text:
          error.response?.data?.message ||
          error.message ||
          "ไม่สามารถเพิ่มข้อมูลได้",
      });
    }
  };

  // =====================================================
  // OPEN ADD MODAL
  // =====================================================
  const handleAdd = () => {
    clearForm();
  };

  // =====================================================
  // OPEN EDIT MODAL
  // =====================================================
  const handleEdit = (employee) => {
    const id = employee.empId ?? employee.EMPID;
    const name = employee.empname ?? employee.EMPNAME;
    const address = employee.empaddress ?? employee.EMPADDRESS;
    const email = employee.empemail ?? employee.EMPEMAIL;
    const salary = employee.salary ?? employee.SALARY;

    setEditMode(true);
    setEditId(id);
    setForm({
      empname: name || "",
      empaddress: address || "",
      empemail: email || "",
      emppassword: "",
      salary: salary ?? "",
    });

    const modalElement = document.getElementById("employeeModal");
    if (modalElement) {
      const modal = Modal.getOrCreateInstance(modalElement);
      modal.show();
    }
  };

  // =====================================================
  // UPDATE Employee
  // =====================================================
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      console.log("Sending UPDATE:", form);
      const response = await axios.put(`${API_URL}/${editId}`, form);
      console.log("UPDATE RESPONSE:", response.data);

      await fetchEmployees();
      clearForm();
      closeModal();

      await Swal.fire({
        icon: "success",
        title: "Updated!",
        text: "แก้ไขข้อมูล Employee เรียบร้อย",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("UPDATE ERROR:", error);
      console.error("UPDATE RESPONSE:", error.response);
      Swal.fire({
        icon: "error",
        title: "Update Failed",
        text:
          error.response?.data?.message ||
          error.message ||
          "ไม่สามารถแก้ไขข้อมูลได้",
      });
    }
  };

  // =====================================================
  // DELETE Employee
  // =====================================================
  const handleDelete = async (empId) => {
    const result = await Swal.fire({
      title: "Delete Employee?",
      text: `ต้องการลบ Employee ${empId} ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API_URL}/${empId}`);
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "ลบข้อมูลเรียบร้อย",
        timer: 1500,
        showConfirmButton: false,
      });

      await fetchEmployees();

      const remainingItems = filteredEmployees.length - 1;
      const newTotalPages = Math.ceil(remainingItems / itemsPerPage);
      if (currentPage > newTotalPages && newTotalPages > 0) {
        setCurrentPage(newTotalPages);
      } else if (newTotalPages === 0) {
        setCurrentPage(1);
      }
    } catch (error) {
      console.error("DELETE ERROR:", error);
      Swal.fire({
        icon: "error",
        title: "Delete Failed",
        text:
          error.response?.data?.message ||
          error.message ||
          "ไม่สามารถลบข้อมูลได้",
      });
    }
  };

  // =====================================================
  // SEARCH
  // =====================================================
  const filteredEmployees = employees.filter((employee) => {
    const id = employee.empId ?? employee.EMPID ?? "";
    const name = employee.empname ?? employee.EMPNAME ?? "";
    const address = employee.empaddress ?? employee.EMPADDRESS ?? "";
    const email = employee.empemail ?? employee.EMPEMAIL ?? "";

    const keyword = search.toLowerCase();
    return (
      String(id).toLowerCase().includes(keyword) ||
      String(name).toLowerCase().includes(keyword) ||
      String(address).toLowerCase().includes(keyword) ||
      String(email).toLowerCase().includes(keyword)
    );
  });

  // =====================================================
  // PAGINATION
  // =====================================================
  const totalPages = Math.ceil(filteredEmployees.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentEmployees = filteredEmployees.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setCurrentPage(1);
  };

  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  return (
    <>
      <Navbar />

      <div className="container py-4">
        {/* HEADER */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="fw-bold">Employee Management</h1>
          <button
            type="button"
            className="btn btn-primary"
            data-bs-toggle="modal"
            data-bs-target="#employeeModal"
            onClick={handleAdd}
          >
            + Add Employee
          </button>
        </div>

        {/* SEARCH CARD */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <label className="form-label fw-bold">Search Employee</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search ID, name, address or email..."
                  value={search}
                  onChange={handleSearch}
                />
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <div className="text-muted">
                  Found: <strong>{filteredEmployees.length}</strong> employee(s)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE CARD */}
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0">Employee List</h4>
              <span className="badge text-bg-secondary">
                Page {totalPages === 0 ? 0 : currentPage} / {totalPages}
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Employee ID</th>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Email</th>
                    <th>Salary</th>
                    <th className="text-center">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEmployees.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        No employee data
                      </td>
                    </tr>
                  ) : (
                    currentEmployees.map((employee, index) => {
                      const id = employee.empId ?? employee.EMPID;
                      const name = employee.empname ?? employee.EMPNAME;
                      const address =
                        employee.empaddress ?? employee.EMPADDRESS;
                      const email = employee.empemail ?? employee.EMPEMAIL;
                      const salary = employee.salary ?? employee.SALARY;

                      return (
                        <tr key={id || index}>
                          <td>{startIndex + index + 1}</td>
                          <td>
                            <strong>{id}</strong>
                          </td>
                          <td>{name}</td>
                          <td>{address}</td>
                          <td>{email}</td>
                          <td>{salary}</td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-warning btn-sm me-2"
                              onClick={() => handleEdit(employee)}
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDelete(id)}
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* PAGINATION */}
            {totalPages > 0 && (
              <nav className="mt-3">
                <ul className="pagination justify-content-center mb-0">
                  <li
                    className={`page-item ${currentPage === 1 ? "disabled" : ""}`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => changePage(currentPage - 1)}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </button>
                  </li>

                  {Array.from({ length: totalPages }, (_, index) => (
                    <li
                      key={index}
                      className={`page-item ${
                        currentPage === index + 1 ? "active" : ""
                      }`}
                    >
                      <button
                        type="button"
                        className="page-link"
                        onClick={() => changePage(index + 1)}
                      >
                        {index + 1}
                      </button>
                    </li>
                  ))}

                  <li
                    className={`page-item ${
                      currentPage === totalPages ? "disabled" : ""
                    }`}
                  >
                    <button
                      type="button"
                      className="page-link"
                      onClick={() => changePage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                    >
                      Next
                    </button>
                  </li>
                </ul>
              </nav>
            )}
          </div>
        </div>

        {/* ADD / EDIT MODAL */}
        <div
          className="modal fade"
          id="employeeModal"
          tabIndex="-1"
          aria-labelledby="employeeModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="employeeModalLabel">
                  {editMode ? "Edit Employee" : "Add Employee"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  onClick={clearForm}
                ></button>
              </div>

              <form onSubmit={editMode ? handleUpdate : handleCreate}>
                <div className="modal-body">
                  {editMode && (
                    <div className="mb-3">
                      <label className="form-label fw-bold">Employee ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editId || ""}
                        disabled
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">Employee Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="empname"
                      value={form.empname}
                      onChange={handleChange}
                      placeholder="Enter employee name"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Address</label>
                    <textarea
                      className="form-control"
                      name="empaddress"
                      value={form.empaddress}
                      onChange={handleChange}
                      placeholder="Enter address"
                      rows="2"
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Email</label>
                    <input
                      type="email"
                      className="form-control"
                      name="empemail"
                      value={form.empemail}
                      onChange={handleChange}
                      placeholder="Enter email"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">
                      {editMode
                        ? "New Password (leave blank to keep current password)"
                        : "Password"}
                    </label>
                    <input
                      type="password"
                      className="form-control"
                      name="emppassword"
                      value={form.emppassword}
                      onChange={handleChange}
                      placeholder={
                        editMode
                          ? "Leave blank to keep current password"
                          : "Enter password"
                      }
                      required={!editMode}
                    />
                    {editMode && (
                      <div className="form-text">
                        Leave blank to keep current password.
                      </div>
                    )}
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Salary</label>
                    <input
                      type="number"
                      className="form-control"
                      name="salary"
                      value={form.salary}
                      onChange={handleChange}
                      placeholder="Enter salary"
                      min="0"
                    />
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    data-bs-dismiss="modal"
                    onClick={clearForm}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {editMode ? "Update Employee" : "Save Employee"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Employee;
