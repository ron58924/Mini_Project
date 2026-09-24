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
    // สมมติว่าหน้า Customer คือหน้าเกี่ยวกับการจอง
    path: "/customer",
    element: (
      <ProtectedRoute requiredScreenCode="S02">
        <Customer />
      </ProtectedRoute>
    ),
  },
  {
    // สมมติว่าหน้า Product คือหน้าเกี่ยวกับเส้นทาง
    path: "/product",
    element: (
      <ProtectedRoute requiredScreenCode="S03">
        <Product />
      </ProtectedRoute>
    ),
  },
  {
    path: "*",
    element: <Navigate to="/login" replace />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);