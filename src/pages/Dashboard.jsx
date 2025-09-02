import { useEffect } from "react";
import { Grid, Stack, Typography } from "@mui/material";
import ParcelStatusCard from "../components/Dashboard/ParcelStatusCard.jsx";
import DriverStatusCard from "../components/Dashboard/DriverStatusCard.jsx";
import DeliveryVolumeChart from "../components/Dashboard/DeliveryVolumeChart.jsx";
import OverspeedingTrendChart from "../components/Dashboard/OverspeedingTrendChart.jsx";
import RecentIncidentCard from "../components/Dashboard/RecentIncidentCard.jsx";

export default function Dashboard() {
  useEffect(() => {
    document.title = "Dashboard";
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

      <Grid container columns={{ xs: 12, md: 12, lg: 12 }} columnSpacing={2} rowSpacing={2}>
        {/* Sidebar Cards */}
        <Grid gridColumn={{ xs: "span 12", md: "span 6", lg: "span 3" }}>
          <Stack spacing={2}>
            <ParcelStatusCard
              delivered={70}
              outForDelivery={20}
              failedOrReturned={5}
              pending={10}
            />
            <DriverStatusCard
              available={50}
              onTrip={30}
              offline={20}
            />
          </Stack>
        </Grid>

        {/* Charts */}
        <Grid gridColumn={{ xs: "span 12", md: "span 6", lg: "span 9" }}>
          <Stack spacing={2}>
            <RecentIncidentCard incidents={[]} />
            <DeliveryVolumeChart />
            <OverspeedingTrendChart />
          </Stack>
        </Grid>
      </Grid>
    </>
  );
}
