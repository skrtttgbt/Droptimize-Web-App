import { Box } from "@mui/material";
import { Outlet } from "react-router-dom";
import NavBar from "/src/components/Dashboard/NavBar";

/**
 * DashboardLayout provides the main structural layout of the admin dashboard.
 * It ensures the NavBar remains persistent while nested pages render inside <Outlet />.
 */
export default function DashboardLayout() {
  return (
    <Box
      sx={{
        display: "flex",
        minHeight: "100vh",
        backgroundColor: "#f9f9f9",
      }}
    >
      {/* Sidebar Navigation */}
      <NavBar />

      {/* Main Content Area */}
      <Box
        component="main"
        sx={{
          flex: 1,
          backgroundColor: "#f9f9f9",
        }}
      >
        <Outlet /> {/* Render nested routes here */}
      </Box>
    </Box>
  );
}
