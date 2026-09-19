import { Link } from "react-router-dom";

function Navbar() {
  return (
    <nav className="navbar navbar-expand-lg navbar-dark bg-dark mb-4">
      <div className="container">
        <Link className="navbar-brand" to="/">
          My App
        </Link>

        <div className="navbar-nav">
          <Link className="nav-link" to="/">
            Home
          </Link>

          <Link className="nav-link" to="/employee">
            Employee
          </Link>

          <Link className="nav-link" to="/customer">
            Customer
          </Link>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
