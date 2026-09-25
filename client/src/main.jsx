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
import Register from "./Register";
import Product from "./Product";
import Permission from "./Permission";
import ProtectedRoute from "./ProtectedRoute";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Home />,
  },
  {
    path: "/login",
    element: <Login />,
  },
 
  {
    path: "/register",
    element: <Register />,
  },
  {
    // สมมติว่าหน้า Employee ของคุณใช้จัดการพนักงาน ซึ่งเทียบเท่ากับ Profile หรือ Dashboard ในตาราง
    // คุณก็เลือกรหัสที่ตรงกันมาใส่ (ตัวอย่างนี้ขอสมมติเป็น S04 - Profile)
    path: "/employee",
    element: (
      <ProtectedRoute requiredScreenCode="S04">
        <Employee />
      </ProtectedRoute>
    ),
  },
  {
    path: "/customer",
    element: (
      <ProtectedRoute requiredScreenCode="S02">
        <Customer />
      </ProtectedRoute>
    ),
  },
  {
    path: "/product",
    element: (
      <ProtectedRoute requiredScreenCode="S03">
        <Product />
      </ProtectedRoute>
    ),
  },
  {
    // หน้าจัดการสิทธิ์ (Permission) - ปรับ requiredScreenCode ให้ตรงกับรหัสจริงใน screens table
    path: "/permission",
    element: (
      <ProtectedRoute requiredScreenCode="S05">
        <Permission />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);

const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}