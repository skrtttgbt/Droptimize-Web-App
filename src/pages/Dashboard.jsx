import { useEffect, useState } from "react";
import { Grid, Stack, Typography, CircularProgress, Box } from "@mui/material";
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
  fetchRecentIncidents 
} from "../services/firebaseService.js";
import { auth } from "../firebaseConfig.js";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [parcelData, setParcelData] = useState({ delivered: 0, outForDelivery: 0, failedOrReturned: 0, pending: 0 });
  const [driverData, setDriverData] = useState({ available: 0, onTrip: 0, offline: 0 });
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
        
        // Get current user's UID
        const currentUser = auth.currentUser;
        const uid = currentUser ? currentUser.uid : null;
        
        // Fetch all data in parallel
        const [parcels, drivers, dailyDeliveries, weeklyDeliveries, dailySpeed, weeklySpeed, recentIncidents] = 
          await Promise.all([
            fetchParcelStatusData(uid),
            fetchDriverStatusData(),
            fetchDeliveryVolumeData('daily'),
            fetchDeliveryVolumeData('weekly'),
            fetchOverspeedingData('daily'),
            fetchOverspeedingData('weekly'),
            fetchRecentIncidents(5)
          ]);
        
        setParcelData(parcels);
        setDriverData(drivers);
        setDailyDeliveryData(dailyDeliveries);
        setWeeklyDeliveryData(weeklyDeliveries);
        setDailySpeedData(dailySpeed);
        setWeeklySpeedData(weeklySpeed);
        setIncidents(recentIncidents);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardData();
  }, []);

  return (
    <>
      <Typography
        variant="h4"
        sx={{
          margin: "1rem 0",
          fontFamily: "Lexend",
          fontWeight: "bold",
          color: "#00b2e1",
        }}
      >
        Dashboard
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '70vh' }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container columns={{ xs: 12, md: 12, lg: 12 }} columnSpacing={2} rowSpacing={2}>
          {/* Sidebar Cards */}
          <Grid gridColumn={{ xs: "span 12", md: "span 6", lg: "span 3" }}>
            <Stack spacing={2}>
              <ParcelStatusCard
                delivered={parcelData.delivered}
                outForDelivery={parcelData.outForDelivery}
                failedOrReturned={parcelData.failedOrReturned}
                pending={parcelData.pending}
              />
              <DriverStatusCard
                available={driverData.available}
                onTrip={driverData.onTrip}
                offline={driverData.offline}
              />
            </Stack>
          </Grid>

          {/* Charts */}
          <Grid gridColumn={{ xs: "span 12", md: "span 6", lg: "span 9" }}>
            <Stack spacing={2}>
              <RecentIncidentCard incidents={incidents} />
              <DeliveryVolumeChart 
                dailyData={dailyDeliveryData} 
                weeklyData={weeklyDeliveryData} 
              />
              <OverspeedingTrendChart 
                dailyData={dailySpeedData} 
                weeklyData={weeklySpeedData} 
              />
            </Stack>
          </Grid>
        </Grid>
      )}
    </>
  );
}
