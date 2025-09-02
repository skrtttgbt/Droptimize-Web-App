import { Outlet } from "react-router-dom";
import NavBar from "/src/components/Dashboard/NavBar";

export default function DashboardLayout() {
  return (
    <div className="dashboard">
      <NavBar />
      <main className="dashboard-main">
        <Outlet /> {/* Nested content goes here */}
      </main>
    </div>
  );
}
