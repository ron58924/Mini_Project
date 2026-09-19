import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal } from "bootstrap";
import "./App.css";
import Navbar from "./Navbar";

const API_URL = "http://localhost:5000/api/mutcus";

function App() {
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [form, setForm] = useState({
    cusName: "",
    cusAddress: "",
    cusTel: "",
    cusEmail: "",
  });

  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchCustomers();
  }, []);

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
      cusName: "",
      cusAddress: "",
      cusTel: "",
      cusEmail: "",
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
      const modal = Modal.getInstance(modalElement);

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

      // Refresh Data
      await fetchCustomers();

      // Clear Form
      clearForm();

      // Close Modal
      closeModal();

      // Success Message
      await Swal.fire({
        icon: "success",
        title: "Saved!",
        text: `เพิ่ม Customer สำเร็จ${
          response.data.cusId ? `\nCustomer ID: ${response.data.cusId}` : ""
        }`,
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
  const handleEdit = (customer) => {
    setEditMode(true);
    setEditId(customer.cusId);

    setForm({
      cusName: customer.cusName || "",
      cusAddress: customer.cusAddress || "",
      cusTel: customer.cusTel || "",
      cusEmail: customer.cusEmail || "",
    });

    // Open Bootstrap Modal
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

      // Refresh Data
      await fetchCustomers();

      // Clear Form
      clearForm();

      // Close Modal
      closeModal();

      // Success
      await Swal.fire({
        icon: "success",
        title: "Updated!",
        text: "แก้ไขข้อมูล Customer เรียบร้อย",
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

    if (!result.isConfirmed) {
      return;
    }

    try {
      await axios.delete(`${API_URL}/${cusId}`);

      await Swal.fire({
        icon: "success",
        title: "Deleted!",
        text: "ลบข้อมูลเรียบร้อย",
        timer: 1500,
        showConfirmButton: false,
      });

      // Refresh Data
      await fetchCustomers();

      // Check pagination after delete
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
    const keyword = search.toLowerCase();

    return (
      String(customer.cusId || "")
        .toLowerCase()
        .includes(keyword) ||
      String(customer.cusName || "")
        .toLowerCase()
        .includes(keyword) ||
      String(customer.cusAddress || "")
        .toLowerCase()
        .includes(keyword) ||
      String(customer.cusTel || "")
        .toLowerCase()
        .includes(keyword) ||
      String(customer.cusEmail || "")
        .toLowerCase()
        .includes(keyword)
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

  // =====================================================
  // Search Change
  // =====================================================
  const handleSearch = (e) => {
    setSearch(e.target.value);

    // Search ใหม่กลับหน้า 1
    setCurrentPage(1);
  };

  // =====================================================
  // Change Page
  // =====================================================
  const changePage = (page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  };

  // =====================================================
  // Render
  // =====================================================
  return (
    <>
      <Navbar />

      <div className="container py-4">
        {/* =================================================
            HEADER
        ================================================= */}

        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="fw-bold">Customer Management</h1>

          <button
            type="button"
            className="btn btn-primary"
            data-bs-toggle="modal"
            data-bs-target="#customerModal"
            onClick={handleAdd}
          >
            + Add Customer
          </button>
        </div>

        {/* =================================================
            SEARCH
        ================================================= */}

        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <div className="row">
              <div className="col-md-6">
                <label className="form-label fw-bold">Search Customer</label>

                <input
                  type="text"
                  className="form-control"
                  placeholder="Search ID, name, address, telephone or email..."
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

        {/* =================================================
            TABLE
        ================================================= */}

        <div className="card shadow-sm">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h4 className="mb-0">Customer List</h4>

              <span className="badge text-bg-secondary">
                Page {totalPages === 0 ? 0 : currentPage}
                {" / "}
                {totalPages}
              </span>
            </div>

            <div className="table-responsive">
              <table className="table table-hover table-bordered align-middle">
                <thead className="table-dark">
                  <tr>
                    <th>#</th>
                    <th>Customer ID</th>
                    <th>Name</th>
                    <th>Address</th>
                    <th>Telephone</th>
                    <th>Email</th>
                    <th className="text-center">Action</th>
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
                    currentCustomers.map((customer, index) => (
                      <tr key={customer.cusId}>
                        <td>{startIndex + index + 1}</td>

                        <td>
                          <strong>{customer.cusId}</strong>
                        </td>
                        <td>{customer.cusname}</td>
                        <td>{customer.cusaddress}</td>
                        <td>{customer.custel}</td>
                        <td>{customer.cusemail}</td>
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
                            onClick={() => handleDelete(customer.cusId)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* =================================================
                PAGINATION
            ================================================= */}

            {totalPages > 0 && (
              <nav>
                <ul className="pagination justify-content-center mb-0">
                  {/* Previous */}
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

                  {/* Page Number */}
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

                  {/* Next */}
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

        {/* =================================================
            ADD / EDIT MODAL
        ================================================= */}

        <div
          className="modal fade"
          id="customerModal"
          tabIndex="-1"
          aria-labelledby="customerModalLabel"
          aria-hidden="true"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              {/* Modal Header */}
              <div className="modal-header">
                <h5 className="modal-title" id="customerModalLabel">
                  {editMode ? "Edit Customer" : "Add Customer"}
                </h5>

                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  onClick={clearForm}
                ></button>
              </div>

              {/* Modal Form */}
              <form onSubmit={editMode ? handleUpdate : handleCreate}>
                <div className="modal-body">
                  {/* =================================
                      Customer ID
                  ================================= */}

                  {editMode && (
                    <div className="mb-3">
                      <label className="form-label fw-bold">Customer ID</label>

                      <input
                        type="text"
                        className="form-control"
                        value={editId}
                        disabled
                      />
                    </div>
                  )}

                  {/* =================================
                      Customer Name
                  ================================= */}

                  <div className="mb-3">
                    <label className="form-label">Customer Name</label>

                    <input
                      type="text"
                      className="form-control"
                      name="cusName"
                      value={form.cusName}
                      onChange={handleChange}
                      placeholder="Enter customer name"
                      required
                    />
                  </div>

                  {/* =================================
                      Address
                  ================================= */}

                  <div className="mb-3">
                    <label className="form-label">Address</label>

                    <textarea
                      className="form-control"
                      name="cusAddress"
                      value={form.cusAddress}
                      onChange={handleChange}
                      placeholder="Enter customer address"
                      rows="3"
                    ></textarea>
                  </div>

                  {/* =================================
                      Telephone
                  ================================= */}

                  <div className="mb-3">
                    <label className="form-label">Telephone</label>

                    <input
                      type="tel"
                      className="form-control"
                      name="cusTel"
                      value={form.cusTel}
                      onChange={handleChange}
                      placeholder="Enter telephone number"
                    />
                  </div>

                  {/* =================================
                      Email
                  ================================= */}

                  <div className="mb-3">
                    <label className="form-label">Email</label>

                    <input
                      type="email"
                      className="form-control"
                      name="cusEmail"
                      value={form.cusEmail}
                      onChange={handleChange}
                      placeholder="Enter customer email"
                      required
                    />
                  </div>
                </div>

                {/* =================================================
                    MODAL FOOTER
                ================================================= */}

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

export default App;
