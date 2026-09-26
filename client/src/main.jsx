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
import Booking from "./Booking";

// 1. Import AuthProvider เข้ามา
import { AuthProvider } from "./context/AuthContext";

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
    path: "/permission",
    element: (
      <ProtectedRoute requiredScreenCode="S03">
        <Permission />
      </ProtectedRoute>
    ),
  },
  {
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
    path: "/booking",
    element: (
      <ProtectedRoute requiredScreenCode="S06">
        <Booking />
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
      {/* 2. นำ AuthProvider มาครอบ RouterProvider */}
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </React.StrictMode>
  );
}