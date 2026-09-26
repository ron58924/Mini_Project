import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Home from "./Home";
import Employee from "./Employee";
import Passenger from "./Passenger";
import Login from "./Login";
import Register from "./Register";
import Permission from "./Permission";
import ProtectedRoute from "./ProtectedRoute";
import Report from "./Report"; 
import Driver from "./Driver";


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
      <ProtectedRoute requiredScreenCode="S01">
        <Employee />
      </ProtectedRoute>
    ),
  },

  {
    path: "/passenger",
    element: (
      <ProtectedRoute requiredScreenCode="S02">
        <Passenger />
      </ProtectedRoute>
    ),
  },
  {
    // หน้าจัดการสิทธิ์ (Permission) - ปรับ requiredScreenCode ให้ตรงกับรหัสจริงใน screens table
    path: "/permission",
    element: (
      <ProtectedRoute requiredScreenCode="S03">
        <Permission />
      </ProtectedRoute>
    ),
  },
  {
    // หน้าจัดการสิทธิ์ (Permission) - ปรับ requiredScreenCode ให้ตรงกับรหัสจริงใน screens table
    path: "/report",
    element: (
      <ProtectedRoute requiredScreenCode="S04">
        <Report />
      </ProtectedRoute>
    ),
  },
   {
   
    path: "/driver",
    element: (
      <ProtectedRoute requiredScreenCode="S05">
        <Driver />
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