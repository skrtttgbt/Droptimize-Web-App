import { useEffect, useState, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Paper,
  Drawer,
  IconButton,
  Fab,
  Tooltip,
  Divider,
} from "@mui/material";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import PeopleAltIcon from "@mui/icons-material/PeopleAlt";

import { auth, db } from "/src/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import MapComponent from "/src/components/MapComponent.jsx";
import DriverListPanel from "/src/components/DriverListPanel.jsx";

export default function MapView() {
  const [user, setUser] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const mapRef = useRef(null);

  const getLatLngFromDriver = (d) => {
    if (!d) return null;
    if (d.loc && typeof d.loc.lat === "number" && typeof d.loc.lng === "number") {
      return { lat: d.loc.lat, lng: d.loc.lng };
    }
    if (
      d.location &&
      typeof d.location.latitude === "number" &&
      typeof d.location.longitude === "number"
    ) {
      return { lat: d.location.latitude, lng: d.location.longitude };
    }
    return null;
  };

  useEffect(() => {
    document.title = "Map View";
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    const fetchDriverById = async (driverId) => {
      try {
        const docRef = doc(db, "users", driverId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const driverData = { id: docSnap.id, ...docSnap.data() };
          setSelectedDriver(driverData);

          const p = getLatLngFromDriver(driverData);
          if (mapRef.current && p) {
            mapRef.current.panTo(p);
            mapRef.current.setZoom(17);
          }
        }
      } catch (err) {
        console.error("Error fetching driver:", err);
      }
    };

    const params = new URLSearchParams(window.location.search);
    const driverId = params.get("driverId");
    if (driverId) fetchDriverById(driverId);
  }, []);

  const handleDriverSelect = useCallback((driver) => {
    setSelectedDriver(driver);
    setDrawerOpen(false);

    const p = getLatLngFromDriver(driver);
    if (mapRef.current && p) {
      mapRef.current.panTo(p);
      mapRef.current.setZoom(17);
    }
  }, []);

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        p: 3,
        boxSizing: "border-box",
      }}
    >
      <Typography
        variant="h4"
        sx={{
          mb: 2,
          fontFamily: "Lexend",
          fontWeight: "bold",
          color: "#00b2e1",
        }}
      >
        Map View
      </Typography>

      <Paper
        elevation={3}
        sx={{
          position: "relative",
          width: "100%",
          flexGrow: 1,
          minHeight: 400,
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <MapComponent selectedDriver={selectedDriver} user={user} mapRef={mapRef} />

        <Box sx={{ position: "absolute", top: 16, right: 16 }}>
          <Tooltip title="Drivers">
            <Fab
              size="small"
              onClick={() => setDrawerOpen((prev) => !prev)}
              sx={{
                bgcolor: "#00b2e1",
                "&:hover": { bgcolor: "#0290bf" },
                color: "#fff",
              }}
            >
              <PeopleAltIcon />
            </Fab>
          </Tooltip>
        </Box>
      </Paper>

      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box
          sx={{
            width: 360,
            p: 2,
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <IconButton onClick={() => setDrawerOpen(false)} size="small">
              <ChevronRightIcon />
            </IconButton>
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ color: "#00b2e1", ml: 1, fontFamily: "Lexend" }}
            >
              Drivers
            </Typography>
          </Box>

          <Divider sx={{ mb: 1 }} />

          <Box sx={{ flexGrow: 1, overflowY: "auto" }}>
            <DriverListPanel user={user} onDriverSelect={handleDriverSelect} mapRef={mapRef} />
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
}
