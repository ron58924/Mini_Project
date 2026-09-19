import { useEffect, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal } from "bootstrap";
import Navbar from "./Navbar";

const API_URL = "http://localhost:5000/api/mutproduct";
const IMAGE_URL = "http://localhost:5000/img/";

function Product() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8; // แสดงผลหน้าละ 8 รายการ (จะได้ 2 แถว แถวละ 4 สินค้า)

  const [form, setForm] = useState({
    proName: "",
    detail: "",
    price: "",
  });
  const [file, setFile] = useState(null);
  const [previewImg, setPreviewImg] = useState("");

  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get(API_URL);
      setProducts(response.data);
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "ไม่สามารถโหลดข้อมูลสินค้าได้",
      });
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setPreviewImg(URL.createObjectURL(selectedFile));
    }
  };

  const clearForm = () => {
    setForm({ proName: "", detail: "", price: "" });
    setFile(null);
    setPreviewImg("");
    setEditMode(false);
    setEditId(null);
  };

  const closeModal = () => {
    const modalElement = document.getElementById("productModal");
    if (modalElement) {
      const modal = Modal.getInstance(modalElement);
      if (modal) modal.hide();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData();
      formData.append("proName", form.proName);
      formData.append("detail", form.detail);
      formData.append("price", form.price);
      if (file) {
        formData.append("img", file);
      }

      if (editMode) {
        await axios.put(`${API_URL}/${editId}`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        Swal.fire({
          icon: "success",
          title: "Updated!",
          text: "แก้ไขข้อมูลสินค้าสำเร็จ",
        });
      } else {
        const res = await axios.post(API_URL, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        Swal.fire({
          icon: "success",
          title: "Saved!",
          text: `เพิ่มสินค้าสำเร็จ รหัส: ${res.data.proId}`,
        });
      }

      fetchProducts();
      clearForm();
      closeModal();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.response?.data?.message || "ทำรายการไม่สำเร็จ",
      });
    }
  };

  const handleEdit = (product) => {
    setEditMode(true);
    setEditId(product.proId);
    setForm({
      proName: product.proName || "",
      detail: product.detail || "",
      price: product.price ?? "",
    });
    setPreviewImg(product.img ? `${IMAGE_URL}${product.img}` : "");
    setFile(null);

    const modalElement = document.getElementById("productModal");
    if (modalElement) {
      const modal = Modal.getOrCreateInstance(modalElement);
      modal.show();
    }
  };

  const handleDelete = async (proId) => {
    const result = await Swal.fire({
      title: "Delete Product?",
      text: `ต้องการลบสินค้า ${proId} ใช่หรือไม่?`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      confirmButtonText: "Yes, Delete",
    });

    if (!result.isConfirmed) return;

    try {
      await axios.delete(`${API_URL}/${proId}`);
      Swal.fire({
        icon: "success",
        title: "Deleted!",
        timer: 1500,
        showConfirmButton: false,
      });
      fetchProducts();
    } catch (error) {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "ไม่สามารถลบข้อมูลได้",
      });
    }
  };

  // Filter & Pagination
  const filteredProducts = products.filter(
    (p) =>
      p.proId.toLowerCase().includes(search.toLowerCase()) ||
      p.proName.toLowerCase().includes(search.toLowerCase()),
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentProducts = filteredProducts.slice(
    startIndex,
    startIndex + itemsPerPage,
  );

  return (
    <>
      <Navbar />
      <div className="container py-4">
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h1 className="fw-bold">Product Catalog</h1>
          <button
            className="btn btn-primary"
            data-bs-toggle="modal"
            data-bs-target="#productModal"
            onClick={clearForm}
          >
            + Add Product
          </button>
        </div>

        {/* Search */}
        <div className="card shadow-sm mb-4">
          <div className="card-body">
            <input
              type="text"
              className="form-control"
              placeholder="Search product ID or name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
        </div>

        {/* GRID DISPLAY (4 สินค้า / แถว) */}
        {currentProducts.length === 0 ? (
          <div className="text-center py-5 text-muted">
            <h4>No product data</h4>
          </div>
        ) : (
          <div className="row g-4">
            {currentProducts.map((p) => (
              <div key={p.proId} className="col-12 col-sm-6 col-md-3">
                <div className="card h-100 shadow-sm border-0 position-relative">
                  {/* Badge แสดงรหัสสินค้า */}
                  <span className="position-absolute top-0 start-0 bg-dark text-white px-2 py-1 m-2 rounded small">
                    {p.proId}
                  </span>

                  {/* รูปภาพสินค้า */}
                  <div
                    className="bg-light d-flex align-items-center justify-content-center"
                    style={{ height: "180px", overflow: "hidden" }}
                  >
                    {p.img ? (
                      <img
                        src={`${IMAGE_URL}${p.img}`}
                        alt={p.proName}
                        className="card-img-top h-100 w-100"
                        style={{ objectFit: "cover" }}
                      />
                    ) : (
                      <span className="text-muted">No Image</span>
                    )}
                  </div>

                  {/* รายละเอียดสินค้า */}
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title fw-bold text-truncate">
                      {p.proName}
                    </h5>
                    <p
                      className="card-text text-muted small flex-grow-1"
                      style={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {p.detail || "ไม่มีรายละเอียดเพิ่มเติม"}
                    </p>
                    <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
                      <span className="fs-5 fw-bold text-primary">
                        {Number(p.price).toLocaleString()} ฿
                      </span>
                      <div>
                        <button
                          className="btn btn-outline-warning btn-sm me-1"
                          onClick={() => handleEdit(p)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDelete(p.proId)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <ul className="pagination justify-content-center mt-4">
            <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
              <button
                className="page-link"
                onClick={() => setCurrentPage(currentPage - 1)}
              >
                Previous
              </button>
            </li>
            {Array.from({ length: totalPages }, (_, i) => (
              <li
                key={i}
                className={`page-item ${currentPage === i + 1 ? "active" : ""}`}
              >
                <button
                  className="page-link"
                  onClick={() => setCurrentPage(i + 1)}
                >
                  {i + 1}
                </button>
              </li>
            ))}
            <li
              className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}
            >
              <button
                className="page-link"
                onClick={() => setCurrentPage(currentPage + 1)}
              >
                Next
              </button>
            </li>
          </ul>
        )}

        {/* Modal สำหรับ เพิ่ม/แก้ไข */}
        <div
          className="modal fade"
          id="productModal"
          tabIndex="-1"
          aria-hidden="true"
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editMode ? "Edit Product" : "Add Product"}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  data-bs-dismiss="modal"
                  onClick={clearForm}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  {editMode && (
                    <div className="mb-3">
                      <label className="form-label fw-bold">Product ID</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editId}
                        disabled
                      />
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label">Product Name</label>
                    <input
                      type="text"
                      className="form-control"
                      name="proName"
                      value={form.proName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Detail</label>
                    <textarea
                      className="form-control"
                      name="detail"
                      value={form.detail}
                      onChange={handleChange}
                      rows="3"
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Price</label>
                    <input
                      type="number"
                      className="form-control"
                      name="price"
                      value={form.price}
                      onChange={handleChange}
                      required
                      min="0"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Image</label>
                    <input
                      type="file"
                      className="form-control"
                      accept="image/*"
                      onChange={handleFileChange}
                    />
                    {previewImg && (
                      <div className="mt-2">
                        <img
                          src={previewImg}
                          alt="Preview"
                          style={{ maxHeight: "150px" }}
                          className="img-thumbnail"
                        />
                      </div>
                    )}
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
                    {editMode ? "Update Product" : "Save Product"}
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

export default Product;
