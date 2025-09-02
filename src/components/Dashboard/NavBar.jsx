import { useEffect, useState } from "react";
import SidebarFooterAccount from "./SidebarFooterAccount.jsx";
import { Link } from "react-router-dom";
import { collection, doc, getDoc, query, setDoc, where } from "firebase/firestore";
import { db } from "../../firebaseConfig.js";
import QRCode from "react-qr-code";

export default function NavBar() {
  const user = JSON.parse(localStorage.getItem("user"));
  const [branchId, setBranchId] = useState("");
  const [branch, setBranch] = useState(null);

useEffect(() => {
    const fetchBranch = async () => {
      if (user?.uid) {
        try {
          const userRef = doc(db, "users", user.uid);
          const userSnap = await getDoc(userRef);

          if (userSnap.exists()) {
            const userData = userSnap.data();
            if (userData.branchId) {
              setBranchId(userData.branchId);
              setBranch(userData);

              localStorage.setItem(
                "branch",
                JSON.stringify({ id: user.uid, ...userData })
              );
            } else {
              console.warn("User has no branchId field:", user.uid);
            }
          } else {
            console.warn("No such user:", user.uid);
          }
        } catch (error) {
          console.error("Error fetching branch:", error);
        }
      }
    };

    fetchBranch();
  }, [user]);

  return (

    <div className="navbar-container">
        <nav className="navbar">
            <Link to="/"><img src="/logo.svg" alt="Droptimize Logo" className="navbar-logo"/></Link>
            <ul>
              <li><Link to="/dashboard"><img src="/icons/dashboard.svg" alt="Dashboard Icon" className="navbar-icon"/>Dashboard</Link></li>
              <li><Link to="/dashboard/drivers"><img src="/icons/drivers.svg" alt="Drivers Icon" className="navbar-icon"/>Drivers</Link></li>
              <li><Link to="/dashboard/parcels"><img src="/icons/parcels.svg" alt="Parcels Icon" className="navbar-icon"/> Parcels</Link></li>
              <li><Link to="/dashboard/map"><img src="/icons/map.svg" alt="Map Icon" className="navbar-icon"/> Map</Link></li>
              <li>
              {branchId && (
                <QRCode
                  value={branchId}
                  size={120} 
                  style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                />
              )}
            </li>
            </ul>
        </nav>
        <SidebarFooterAccount />
    </div>
  );
}
