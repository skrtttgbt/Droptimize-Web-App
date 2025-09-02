import SidebarFooterAccount from "./SidebarFooterAccount.jsx";
import { Link } from "react-router-dom";

export default function NavBar() {
  return (
    <div className="navbar-container">
        <nav className="navbar">
            <Link to="/"><img src="/logo.svg" alt="Droptimize Logo" className="navbar-logo"/></Link>
            <ul>
              <li><Link to="/dashboard"><img src="/icons/dashboard.svg" alt="Dashboard Icon" className="navbar-icon"/>Dashboard</Link></li>
              <li><Link to="/dashboard/drivers"><img src="/icons/drivers.svg" alt="Drivers Icon" className="navbar-icon"/>Drivers</Link></li>
              <li><Link to="/dashboard/parcels"><img src="/icons/parcels.svg" alt="Parcels Icon" className="navbar-icon"/> Parcels</Link></li>
              <li><Link to="/dashboard/map"><img src="/icons/map.svg" alt="Map Icon" className="navbar-icon"/> Map</Link></li>
            </ul>
        </nav>
        <SidebarFooterAccount />
    </div>
  );
}
