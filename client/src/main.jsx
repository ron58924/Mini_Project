import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import Home from "./Home";
import Employee from "./Employee";
import Customer from "./Customer";
import Login from "./Login";
import Product from "./Product";
import ProtectedRoute from "./ProtectedRoute"; // 1. นำเข้า ProtectedRoute

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/employee",
    element: (
      // 2. ครอบด้วย ProtectedRoute และระบุสิทธิ์ตำแหน่งที่ 0 (Employee)
      <ProtectedRoute requiredPermIndex={0}>
        <Employee />
      </ProtectedRoute>
    ),
  },
  {
    path: "/customer",
    element: (
      // 3. ครอบด้วย ProtectedRoute และระบุสิทธิ์ตำแหน่งที่ 1 (Customer)
      <ProtectedRoute requiredPermIndex={1}>
        <Customer />
      </ProtectedRoute>
    ),
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    // 4. (Optional) ดักจับ URL ที่ไม่มีอยู่จริง ให้เด้งไปหน้า /login
    path: "*",
    element: <Navigate to="/login" replace />,
  },
  {
    path: "/product",
    element: (
      <ProtectedRoute requiredPermIndex={2}>
        <Product />
      </ProtectedRoute>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
