import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
  Navigate,
} from "react-router-dom";
import "bootstrap/dist/js/bootstrap.bundle.min.js";
import Employee from "./Employee";
import Passenger from "./Passenger";
import Login from "./Login";
import Register from "./Register";
import Permission from "./Permission";
import ProtectedRoute from "./ProtectedRoute";
import Report from "./Report"; 
import Driver from "./Driver";
import Booking from "./Booking";
import { AuthProvider } from "./context/AuthContext";
import ScheduleManager from "./ScheduleManager";

// ==========================================
// 1. สร้างฟังก์ชันคำนวณหน้าซ้ายสุดที่ผู้ใช้มีสิทธิ์
// ==========================================
const RootRedirect = () => {
  const user = JSON.parse(localStorage.getItem("user"));
  
  // ถ้ายังไม่ล็อกอิน ให้ไปหน้า login
  if (!user) return <Navigate to="/login" replace />;

  const allowed = user.allowedScreens || [];

  // เช็คเรียงจากซ้ายไปขวา ตาม Navbar (แก้เลข S01-S06 เรียงตามลำดับใหม่)
  if (allowed.includes("S01")) return <Navigate to="/report" replace />;
  if (allowed.includes("S02")) return <Navigate to="/driver" replace />;
  if (allowed.includes("S03")) return <Navigate to="/booking" replace />;
  if (allowed.includes("S04")) return <Navigate to="/employee" replace />;
  if (allowed.includes("S05")) return <Navigate to="/passenger" replace />;
  if (allowed.includes("S06")) return <Navigate to="/permission" replace />;
  if (allowed.includes("S07")) return <Navigate to="/schedule" replace />;
  
  // ถ้าไม่มีสิทธิ์อะไรเลย ให้กลับไปหน้า login
  return <Navigate to="/login" replace />;
};

const router = createBrowserRouter([
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
  // ==========================================
  // 2. ตั้งค่าให้ Path "/" เรียกใช้ RootRedirect
  // ==========================================
  {
    path: "/",
    element: <RootRedirect />,
  },
  {
    path: "/report",
    element: (
      <ProtectedRoute requiredScreenCode="S01">
        <Report />
      </ProtectedRoute>
    ),
  },
  {
    path: "/driver",
    element: (
      <ProtectedRoute requiredScreenCode="S02">
        <Driver />
      </ProtectedRoute>
    ),
  },
  {
    path: "/booking",
    element: (
      <ProtectedRoute requiredScreenCode="S03">
        <Booking />
      </ProtectedRoute>
    ),
  },
  {
    path: "/employee",
    element: (
      <ProtectedRoute requiredScreenCode="S04">
        <Employee />
      </ProtectedRoute>
    ),
  },
  {
    path: "/passenger",
    element: (
      <ProtectedRoute requiredScreenCode="S05">
        <Passenger />
      </ProtectedRoute>
    ),
  },
  {
    path: "/permission",
    element: (
      <ProtectedRoute requiredScreenCode="S06">
        <Permission />
      </ProtectedRoute>
    ),
  },
  {
    path: "/schedule",
    element: (
      <ProtectedRoute requiredScreenCode="S07">
        <ScheduleManager />
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
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </React.StrictMode>
  );
}