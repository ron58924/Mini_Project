import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal } from "bootstrap";
import Navbar from "./navbar"; // เช็กชื่อไฟล์ navbar ในเครื่องของคุณ
import "./Customer.css";

// =====================================================
// API URL
// =====================================================
const API_URL = "http://localhost:5000/api/mutcustomer";

function Customer() {
  // =====================================================
  // States
  // =====================================================
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [form, setForm] = useState({
    cusname: "",
    cusaddress: "",
    custel: "",
    cusemail: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  // =====================================================
  // Load Customers Initial
  // =====================================================
  useEffect(() => {
    const getInitialData = async () => {
      try {
        const response = await axios.get(API_URL);
        setCustomers(response.data);
        console.log("GET CUSTOMERS:", response.data);
      } catch (error) {
        console.error("GET ERROR:", error);
        Swal.fire({
          icon: "error",
          title: "Error",
          text: "ไม่สามารถโหลดข้อมูล Customer ได้",
        });
      }
    };

    getInitialData();
  }, []);

  // =====================================================
  // Re-fetch Customers Function
  // =====================================================
  const fetchCustomers = async () => {
    try {
      const response = await axios.get(API_URL);
      setCustomers(response.data);
      console.log("GET CUSTOMERS:", response.data);
    } catch (error) {
      console.error("GET ERROR:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "ไม่สามารถโหลดข้อมูล Customer ได้",
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
      cusname: "",
      cusaddress: "",
      custel: "",
      cusemail: "",
    });
    setEditMode(false);
    setEditId(null);
  };

  // =====================================================
  // Close Bootstrap Modal
  // =====================================================
  const closeModal = () => {
    const modalElement = document.getElementById("customerModal");
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
  // CREATE Customer
  // =====================================================
  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      console.log("Sending CREATE:", form);
      const response = await axios.post(API_URL, form);
      console.log("CREATE RESPONSE:", response.data);

      await fetchCustomers();
      clearForm();
      closeModal();

      const createdId = response.data.cusId ?? response.data.CUSID ?? "";

      await Swal.fire({
        icon: "success",
        title: "Saved!",
        text: `เพิ่ม Customer สำเร็จ\nCustomer ID: ${createdId}`,
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("CREATE ERROR:", error);
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
  const handleEdit = (customer) => {
    const id = customer.cusId ?? customer.CUSID;
    const name = customer.cusname ?? customer.CUSNAME;
    const address = customer.cusaddress ?? customer.CUSADDRESS;
    const tel = customer.custel ?? customer.CUSTEL;
    const email = customer.cusemail ?? customer.CUSEMAIL;

    setEditMode(true);
    setEditId(id);
    setForm({
      cusname: name || "",
      cusaddress: address || "",
      custel: tel || "",
      cusemail: email || "",
    });

    const modalElement = document.getElementById("customerModal");
    if (modalElement) {
      const modal = Modal.getOrCreateInstance(modalElement);
      modal.show();
    }
  };

  // =====================================================
  // UPDATE Customer
  // =====================================================
  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      console.log("Sending UPDATE:", form);
      const response = await axios.put(`${API_URL}/${editId}`, form);
      console.log("UPDATE RESPONSE:", response.data);

      await fetchCustomers();
      clearForm();
      closeModal();

      await Swal.fire({
        icon: "success",
        title: "Updated!",
        text: "แก้ไขข้อมูล Customer เรียบร้อย",
        confirmButtonText: "OK",
      });
    } catch (error) {
      console.error("UPDATE ERROR:", error);
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
  // DELETE Customer
  // =====================================================
  const handleDelete = async (cusId) => {
    const result = await Swal.fire({
      title: "Delete Customer?",
      text: `ต้องการลบ Customer ${cusId} ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6c757d",
      confirmButtonText: "Yes, Delete",
      cancelButtonText: "Cancel",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API_URL}/${cusId}`);
      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "ลบข้อมูลเรียบร้อย",
        timer: 1500,
        showConfirmButton: false,
      });

      await fetchCustomers();

      const remainingItems = filteredCustomers.length - 1;
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
  const filteredCustomers = customers.filter((customer) => {
    const id = customer.cusId ?? customer.CUSID ?? "";
    const name = customer.cusname ?? customer.CUSNAME ?? "";
    const address = customer.cusaddress ?? customer.CUSADDRESS ?? "";
    const tel = customer.custel ?? customer.CUSTEL ?? "";
    const email = customer.cusemail ?? customer.CUSEMAIL ?? "";

    const keyword = search.toLowerCase();
    return (
      String(id).toLowerCase().includes(keyword) ||
      String(name).toLowerCase().includes(keyword) ||
      String(address).toLowerCase().includes(keyword) ||
      String(tel).toLowerCase().includes(keyword) ||
      String(email).toLowerCase().includes(keyword)
    );
  });

  // =====================================================
  // PAGINATION
  // =====================================================
  const totalPages = Math.ceil(filteredCustomers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentCustomers = filteredCustomers.slice(
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
          <h1 className="fw-bold text-dark">Customer Management</h1>
          <button
            type="button"
            className="btn btn-primary shadow-sm"
            data-bs-toggle="modal"
            data-bs-target="#customerModal"
            onClick={handleAdd}
          >
            + Add Customer
          </button>
        </div>

        {/* SEARCH CARD */}
        <div className="card shadow-sm mb-4 border-0">
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <label className="form-label fw-bold">Search Customer</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search ID, name, address, tel or email..."
                  value={search}
                  onChange={handleSearch}
                />
              </div>
              <div className="col-md-6 d-flex align-items-end">
                <div className="text-muted">
                  Found: <strong>{filteredCustomers.length}</strong> customer(s)
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* TABLE CARD */}
        <div className="card shadow-sm border-0">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0 fw-bold">Customer List</h4>
              <span className="badge text-bg-secondary">
                Page {totalPages === 0 ? 0 : currentPage} / {totalPages}
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle mb-0">
                <thead className="table-dark">
                  <tr>
                    <th style={{ width: "50px" }}>#</th>
                    <th>Customer ID</th>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Telephone</th>
                    <th>Email</th>
                    <th className="text-center" style={{ width: "150px" }}>
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentCustomers.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-4 text-muted">
                        No customer data
                      </td>
                    </tr>
                  ) : (
                    currentCustomers.map((customer, index) => {
                      const id = customer.cusId ?? customer.CUSID;
                      const name = customer.cusname ?? customer.CUSNAME;
                      const address =
                        customer.cusaddress ?? customer.CUSADDRESS;
                      const tel = customer.custel ?? customer.CUSTEL;
                      const email = customer.cusemail ?? customer.CUSEMAIL;

                      return (
                        <tr key={id || index}>
                          <td>{startIndex + index + 1}</td>
                          <td>
                            <strong className="text-primary">{id}</strong>
                          </td>
                          <td className="fw-semibold">{name}</td>
                          <td>{address}</td>
                          <td>{tel}</td>
                          <td>{email}</td>
                          <td className="text-center">
                            <button
                              type="button"
                              className="btn btn-warning btn-sm me-2"
                              onClick={() => handleEdit(customer)}
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
              <nav className="mt-4">
                <ul className="pagination justify-content-center mb-0">
                  <li
                    className={`page-item ${
                      currentPage === 1 ? "disabled" : ""
                    }`}
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
          id="customerModal"
          tabIndex="-1"
          aria-labelledby="customerModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title fw-bold" id="customerModalLabel">
                  {editMode ? "Edit Customer" : "Add Customer"}
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  data-bs-dismiss="modal"
                  onClick={clearForm}
                ></button>
              </div>

              <form onSubmit={editMode ? handleUpdate : handleCreate}>
                <div className="modal-body">
                  {editMode && (
                    <div className="mb-3">
                      <label className="form-label fw-bold">Customer ID</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={editId || ""}
                        disabled
                      />
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Customer Name <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      name="cusname"
                      value={form.cusname}
                      onChange={handleChange}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-semibold">Address</label>
                    <textarea
                      className="form-control"
                      name="cusaddress"
                      value={form.cusaddress}
                      onChange={handleChange}
                      placeholder="Enter address"
                      rows="3"
                    ></textarea>
                  </div>

                  <div className="row">
                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">
                        Telephone
                      </label>
                      <input
                        type="tel"
                        className="form-control"
                        name="custel"
                        value={form.custel}
                        onChange={handleChange}
                        placeholder="e.g. 0812345678"
                      />
                    </div>

                    <div className="col-md-6 mb-3">
                      <label className="form-label fw-semibold">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        name="cusemail"
                        value={form.cusemail}
                        onChange={handleChange}
                        placeholder="e.g. customer@email.com"
                      />
                    </div>
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
                    {editMode ? "Update Customer" : "Save Customer"}
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

export default Customer;
