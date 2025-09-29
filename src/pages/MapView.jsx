import { useEffect, useState, useCallback } from "react";
import { Grid, Typography } from "@mui/material";
import { auth, db } from "/src/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";

import MapComponent from "/src/components/MapComponent.jsx";
import DriverListPanel from "/src/components/DriverListPanel.jsx";

export default function MapView() {
  useEffect(() => {
    document.title = "View Map";
  }, []);

  const [user, setUser] = useState(null);
  const [selectedDriver, setSelectedDriver] = useState(null);

  /** ✅ Track the logged-in user */
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  /** ✅ When a driver is clicked */
  const handleDriverSelect = useCallback(
    (driver) => {
      setSelectedDriver(driver);
    },
    []
  );

  /** ✅ Send a warning to a driver */
  const handleGiveWarning = async (driver) => {
    try {
      const driverRef = doc(db, "users", driver.id);
      await driverRef.update({
        warnings: driver.warnings ? [...driver.warnings, { timestamp: new Date() }] : [{ timestamp: new Date() }],
      });
      alert(`⚠️ Warning issued to ${driver.fullName}`);
    } catch (err) {
      console.error("Failed to give warning:", err);
      alert("Error sending warning. Check console for details.");
    }
  };

  return (
    <>
      <Typography
        variant="h4"
        sx={{ margin: "1rem 0", fontFamily: "Lexend", fontWeight: "bold", color: "#00b2e1" }}
      >
        Map View
      </Typography>
      <Grid container spacing={2}>
        <Grid item xs={9}>
          <MapComponent selectedDriver={selectedDriver} user={user} />
        </Grid>
        <Grid item xs={3}>
          <DriverListPanel
            user={user}
            onDriverSelect={handleDriverSelect}
            onGiveWarning={handleGiveWarning}
          />    
        </Grid>
      </Grid>
    </>
  );
}
