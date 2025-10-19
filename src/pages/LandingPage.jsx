import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Typography, Button, Stack } from "@mui/material";
import LandingPageHeader from "../components/LandingPageHeader.jsx";
import FeatureCard from "../components/FeatureCard.jsx";

export default function LandingPage() {
  const navigate = useNavigate();
  const [activeGroup, setActiveGroup] = useState(null);

  useEffect(() => {
    document.title = "Welcome to Droptimize";
  }, []);

  const showGroup = (group) => setActiveGroup(group);
  const goBack = () => setActiveGroup(null);
  const handleGetStarted = () => navigate("/signup");

  return (
    <Box>
      {/* Header */}
      <LandingPageHeader />

      {/* Main Content */}
      <Box component="main" sx={{ pt: "100px", display: "flex", flexDirection: "column", textAlign: "center" }}>
        {/* Welcome Section */}
        <Box sx={{ display: "flex", justifyContent: "space-evenly", alignItems: "center", flexWrap: "wrap", py: 4, px: 2 }}>
          <Box sx={{ maxWidth: 500 }}>
            <Typography variant="h4" sx={{ fontFamily: "LEMON MILK", fontWeight: 700, color: "#00b2e1", mb: 1 }}>
              Welcome to
            </Typography>
            <Box component="img" src="/logo.svg" alt="Droptimize Logo" sx={{ width: "100%", maxWidth: 400, mb: 2 }} />
            <Typography sx={{ fontFamily: "Lexend", fontSize: "0.95rem", mb: 2, color: "#000" }}>
              Smart Courier Management for Batch Deliveries
            </Typography>
            <Button
              variant="contained"
              onClick={handleGetStarted}
              sx={{
                backgroundImage: "linear-gradient(#00b2e1, #0064b5)",
                fontFamily: "LEMON MILK",
                fontWeight: 700,
                px: 3,
                py: 1.2,
                borderRadius: 1,
                color: "#fff",
                fontSize: "0.85rem",
                "&:hover": { backgroundImage: "linear-gradient(#00b2e1, #00b2e1)" },
              }}
            >
              Get Started
            </Button>
          </Box>

          <Box component="img" src="/hero-image.png" alt="Hero" sx={{ width: "100%", maxWidth: 500 }} />
        </Box>

        {/* Features Section */}
        <Box
          id="features"
          sx={{
            py: 6,
            backgroundImage: "linear-gradient(#00b2e1, #0064b5)",
            color: "#fff",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Typography sx={{ fontFamily: "Lexend", fontWeight: 700, mb: 2, maxWidth: 900, textAlign: "center", fontSize: "0.95rem" }}>
            Droptimize is built to streamline batch delivery operations with intelligent routing, driver monitoring, and performance tracking—all in one platform.
          </Typography>

          <Typography variant="h5" sx={{ fontFamily: "Lexend", fontWeight: 700, mb: 4 }}>
            Features
          </Typography>

          <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={2}>
            {activeGroup === null && (
              <>
                <Box onClick={() => showGroup("admin")} sx={{ cursor: "pointer" }}>
                  <FeatureCard title="For Admins" description="Manage your dropshipping business with ease." icon="/admin-icon.png" />
                </Box>
                <Box onClick={() => showGroup("courier")} sx={{ cursor: "pointer" }}>
                  <FeatureCard title="For Couriers" description="Track your couriers' locations in real-time." icon="/courier-icon.png" />
                </Box>
              </>
            )}

            {activeGroup === "admin" && (
              <>
                <Box sx={{ width: "100%", mb: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={goBack}
                    sx={{
                      color: "#fff",
                      borderColor: "#fff",
                      "&:hover": { backgroundColor: "#fff", color: "#00b2e1" },
                      fontFamily: "Lexend",
                      fontWeight: 700,
                    }}
                  >
                    ← Back
                  </Button>
                </Box>
                <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={2}>
                  <FeatureCard title="Driver Management" description="Add, assign, and supervise couriers performing batch deliveries." icon="/admin_features/driver-management.png" />
                  <FeatureCard title="Workload Estimation" description="Forecast batch load per driver for balanced task assignment." icon="/admin_features/workload-estimation.png" />
                  <FeatureCard title="Courier Location Tracking" description="Monitor courier movement during delivery tasks." icon="/admin_features/courier-location-tracking.png" />
                  <FeatureCard title="Overspeeding Logging" description="View trends and reports of overspeeding behavior per route and driver." icon="/admin_features/overspeeding-logging.png" />
                  <FeatureCard title="Driver Warning" description="Send alerts or disciplinary messages based on violations or performance flags." icon="/admin_features/driver-warning.png" />
                </Stack>
              </>
            )}

            {activeGroup === "courier" && (
              <>
                <Box sx={{ width: "100%", mb: 2 }}>
                  <Button
                    variant="outlined"
                    onClick={goBack}
                    sx={{
                      color: "#fff",
                      borderColor: "#fff",
                      "&:hover": { backgroundColor: "#fff", color: "#00b2e1" },
                      fontFamily: "Lexend",
                      fontWeight: 700,
                    }}
                  >
                    ← Back
                  </Button>
                </Box>
                <Stack direction="row" flexWrap="wrap" justifyContent="center" gap={2}>
                  <FeatureCard title="Delivery Task List" description="Organize multiple deliveries into structured, trackable batches per driver." icon="/courier_features/delivery-task-list.png" />
                  <FeatureCard title="Route Optimization" description="Suggests the most efficient multi-stop routes for grouped deliveries." icon="/courier_features/route-optimization.png" />
                  <FeatureCard title="Speed Monitoring" description="Continuously monitors vehicle speed to promote safe and compliant driving." icon="/courier_features/speed-monitoring.png" />
                  <FeatureCard title="Speed Limit Alerts" description="Sends alerts to drivers who exceed posted speed limits during deliveries." icon="/courier_features/speed-limit-alerts.png" />
                  <FeatureCard title="Driving History" description="Keeps a log of delivery routes and speeds for every batch run, while also tracking overspeeding cases." icon="/courier_features/driving-history.png" />
                </Stack>
              </>
            )}
          </Stack>
        </Box>

        {/* About Section */}
        <Box id="about" sx={{ py: 6, display: "flex", flexDirection: "column", alignItems: "center", bgcolor: "#fff" }}>
          <Typography variant="h5" sx={{ fontFamily: "Lexend", fontWeight: 700, mb: 2 }}>About Us</Typography>
          <Typography sx={{ maxWidth: 900, textAlign: "center", fontSize: "0.95rem", fontFamily: "Lexend", color: "#333" }}>
            Droptimize is a courier management system tailored for services with batch delivery operations. We're redefining how logistics teams handle bulk deliveries—empowering dispatchers with real-time visibility, optimized routing, and behavior-based driver alerts. From speeding analytics to intelligent task assignment, Droptimize gives courier businesses full control and confidence in every delivery run.
          </Typography>
        </Box>

        {/* Contact Section */}
        <Box id="contact" sx={{ py: 6, display: "flex", flexDirection: "column", alignItems: "center", bgcolor: "#f3f4f6" }}>
          <Typography variant="h5" sx={{ fontFamily: "Lexend", fontWeight: 700, mb: 2 }}>Contact Us</Typography>
          <Typography sx={{ textAlign: "center", fontFamily: "Lexend", fontSize: "0.95rem", color: "#333" }}>
            Have questions or need support?{" "}
            <Button href="/contact" variant="text" sx={{ textTransform: "none", fontFamily: "Lexend", fontSize: "0.95rem", color: "#00b2e1" }}>
              Get in touch with us!
            </Button>
          </Typography>
        </Box>
      </Box>

      {/* Footer */}
      <Box component="footer" sx={{ py: 2, textAlign: "center", bgcolor: "#fff" }}>
        <Typography sx={{ fontFamily: "Lexend", fontSize: "0.85rem", color: "#555" }}>
          &copy; {new Date().getFullYear()} Droptimize. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
}
