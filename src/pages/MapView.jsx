import { useEffect, useState } from "react";
import { Grid, Typography } from "@mui/material";
import MapComponent from "/src/components/MapComponent.jsx";
import DriverListPanel from "/src/components/DriverListPanel.jsx";

export default function MapView() {
  useEffect(() => {
    document.title = "View Map";
  }, []);

  const [selectedDriver, setSelectedDriver] = useState(null);

  const handleDriverSelect = (driver) => {
    setSelectedDriver({
      ...driver,
      clickedAt: Date.now(),
    });
  };

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
        Map View
      </Typography>
      <Grid container spacing={2}>
        <Grid size={9}>
          <MapComponent selectedDriver={selectedDriver} />
        </Grid>
        <Grid size={3}>
          <DriverListPanel onDriverSelect={handleDriverSelect} />
        </Grid>
      </Grid>
    </>
  );
}
