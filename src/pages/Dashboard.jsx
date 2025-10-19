import { useEffect, useState } from "react";
import { Typography, CircularProgress, Box, Divider } from "@mui/material";
import ParcelStatusCard from "../components/Dashboard/ParcelStatusCard.jsx";
import DriverStatusCard from "../components/Dashboard/DriverStatusCard.jsx";
import DeliveryVolumeChart from "../components/Dashboard/DeliveryVolumeChart.jsx";
import OverspeedingTrendChart from "../components/Dashboard/OverspeedingTrendChart.jsx";
import RecentIncidentCard from "../components/Dashboard/RecentIncidentCard.jsx";
import {
  fetchParcelStatusData,
  fetchDriverStatusData,
  fetchDeliveryVolumeData,
  fetchOverspeedingData,
  fetchRecentIncidents,
} from "../services/firebaseService.js";
import { auth } from "../firebaseConfig.js";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [parcelData, setParcelData] = useState({
    delivered: 0,
    outForDelivery: 0,
    failedOrReturned: 0,
    pending: 0,
  });
  const [driverData, setDriverData] = useState({
    available: 0,
    onTrip: 0,
    offline: 0,
  });
  const [dailyDeliveryData, setDailyDeliveryData] = useState([]);
  const [weeklyDeliveryData, setWeeklyDeliveryData] = useState([]);
  const [dailySpeedData, setDailySpeedData] = useState([]);
  const [weeklySpeedData, setWeeklySpeedData] = useState([]);
  const [incidents, setIncidents] = useState([]);

  useEffect(() => {
    document.title = "Dashboard";

      const fetchDashboardData = async () => {
        try {
          setLoading(true);
        
          auth.onAuthStateChanged(async (user) => {
            if (user) {
              const uid = user.uid; 
              console.log("Current user UID:", uid);
              const [
                parcels,
                drivers,
                dailyDeliveries,
                weeklyDeliveries,
                dailySpeed,
                weeklySpeed,
                recentIncidents,
              ] = await Promise.all([
                fetchParcelStatusData(uid),
                fetchDriverStatusData(),
                fetchDeliveryVolumeData("daily", uid),
                fetchDeliveryVolumeData("weekly", uid),
                fetchOverspeedingData("daily"),
                fetchOverspeedingData("weekly"),
                fetchRecentIncidents(5),
              ]);

              console.log("Fetched data:", { parcels, drivers, dailyDeliveries, weeklyDeliveries, dailySpeed, weeklySpeed, recentIncidents });

              setParcelData(parcels);
              setDriverData(drivers);
              setDailyDeliveryData(dailyDeliveries);
              setWeeklyDeliveryData(weeklyDeliveries);
              setDailySpeedData(dailySpeed);
              setWeeklySpeedData(weeklySpeed);
              setIncidents(recentIncidents);
            } else {
              console.log("No user logged in.");
            }
          });
        } catch (error) {
          console.error("Error fetching dashboard data:", error);
        } finally {
          setLoading(false);
        }
      };

    fetchDashboardData();
  }, []);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minHeight: "100vh",
        px: { xs: 2, md: 4 },
        py: 3,
        boxSizing: "border-box",
      }}
    >
      {/* Header */}
      <Typography
        variant="h4"
        sx={{
          mb: 3,
          fontFamily: "Lexend",
          fontWeight: "bold",
          color: "#00b2e1",
        }}
      >
        Dashboard
      </Typography>

      {loading ? (
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            height: "70vh",
            width: "100%",
          }}
        >
          <CircularProgress color="primary" />
        </Box>
      ) : (
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            gap: 3,
            width: "100%",
          }}
        >
          {/* Status Cards */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
            }}
          >
            <Box sx={{ flex: "1 1 250px", minWidth: 250 }}>
              <ParcelStatusCard
                delivered={parcelData.delivered}
                outForDelivery={parcelData.outForDelivery}
                failedOrReturned={parcelData.failedOrReturned}
                pending={parcelData.pending}
              />
            </Box>

            <Box sx={{ flex: "1 1 250px", minWidth: 250 }}>
              <DriverStatusCard
                drivers={driverData}
              />
            </Box>

            <Box sx={{ flex: "1 1 250px", minWidth: 250 }}>
              <RecentIncidentCard incidents={incidents} />
            </Box>
          </Box>

          <Divider sx={{ borderColor: "#c4cad0", my: 1 }} />

          {/* Charts */}
          <Box
            sx={{
              display: "flex",
              flexWrap: "wrap",
              gap: 3,
              width: "100%",
            }}
          >
            <Box sx={{ flex: "1 1 500px", minWidth: 300, height: { xs: 300, sm: 350, md: 400 } }}>
              <DeliveryVolumeChart
                dailyData={dailyDeliveryData}
                weeklyData={weeklyDeliveryData}
              />
            </Box>

            <Box sx={{ flex: "1 1 500px", minWidth: 300, height: { xs: 300, sm: 350, md: 400 } }}>
              <OverspeedingTrendChart
                dailyData={dailySpeedData}
                weeklyData={weeklySpeedData}
              />
            </Box>
          </Box>
        </Box>
      )}
    </Box>
  );
}
