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
<<<<<<< HEAD
    path: "/register",
    element: <Register />,
  },
  {
    path: "/employee",
    element: (
      <ProtectedRoute requiredPermIndex={0}>
=======
    // สมมติว่าหน้า Employee ของคุณใช้จัดการพนักงาน ซึ่งเทียบเท่ากับ Profile หรือ Dashboard ในตาราง
    // คุณก็เลือกรหัสที่ตรงกันมาใส่ (ตัวอย่างนี้ขอสมมติเป็น S04 - Profile)
    path: "/employee",
    element: (
      <ProtectedRoute requiredScreenCode="S04">
>>>>>>> adf18f6815e3b6cdaa2f92586e302d513cf37ff2
        <Employee />
      </ProtectedRoute>
    ),
  },
  {
    // สมมติว่าหน้า Customer คือหน้าเกี่ยวกับการจอง
    path: "/customer",
    element: (
<<<<<<< HEAD
      <ProtectedRoute requiredPermIndex={1}>
=======
      <ProtectedRoute requiredScreenCode="S02">
>>>>>>> adf18f6815e3b6cdaa2f92586e302d513cf37ff2
        <Customer />
      </ProtectedRoute>
    ),
  },
  {
<<<<<<< HEAD
=======
    // สมมติว่าหน้า Product คือหน้าเกี่ยวกับเส้นทาง
>>>>>>> adf18f6815e3b6cdaa2f92586e302d513cf37ff2
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

<<<<<<< HEAD
const rootElement = document.getElementById("root");

if (rootElement) {
  ReactDOM.createRoot(rootElement).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
}
=======
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
>>>>>>> adf18f6815e3b6cdaa2f92586e302d513cf37ff2
