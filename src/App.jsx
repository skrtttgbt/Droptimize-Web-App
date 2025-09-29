import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import LandingPage from "./pages/LandingPage.jsx";
import SignUpForm from "./pages/SignUp.jsx";
import LogInForm from "./pages/LogIn.jsx";
import DashboardLayout from "./pages/layouts/DashboardLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Drivers from "./pages/Drivers.jsx";
import Parcels from "./pages/Parcels.jsx";
import MapView from "./pages/MapView.jsx";
import Profile from "./pages/Profile.jsx";
import AccountSetup from "./pages/AccountSeutp.jsx";
import DriverSimulator from "./components/DriverSimulator.jsx";
export default function App() {
  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Router>
        <Routes>
          <Route path="/simulator" element={<DriverSimulator />} />
          <Route path="/" element={<LandingPage />} />
          <Route path="/signup" element={<SignUpForm />} />
          <Route path="/login" element={<LogInForm />} />
          <Route path="/account-setup" element={<AccountSetup />} />

          {/* Dashboard layout with nested routes */}
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="drivers" element={<Drivers />} />
            <Route path="parcels" element={<Parcels />} />
            <Route path="map" element={<MapView />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Routes>
      </Router>
    </LocalizationProvider>
  );
}
