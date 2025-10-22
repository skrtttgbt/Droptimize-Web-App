import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  arrayUnion,
  serverTimestamp,
  Timestamp,
} from "firebase/firestore";
import { db } from "/src/firebaseConfig";
import {
  Card,
  CardContent,
  Typography,
  Box,
  Avatar,
  IconButton,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Grid,
  Tooltip,
} from "@mui/material";
import { ExpandMore, MyLocation } from "@mui/icons-material";
import GiveWarningButton from "./GiveWarningButton.jsx";

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatETA(hours) {
  if (!isFinite(hours) || hours <= 0) return "N/A";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function isInSlowdownZone(driverLocation, zone) {
  if (!driverLocation || !zone.location) return false;
  const distKm = haversineDistance(
    driverLocation.latitude,
    driverLocation.longitude,
    zone.location.lat,
    zone.location.lng
  );
  const radiusKm = (zone.radius || 15) / 1000;
  return distKm <= radiusKm;
}

function getDynamicSpeedLimit(driver, slowdowns) {
  if (!driver.location) return driver.speedLimit || 25;
  const activeZones = slowdowns.filter((zone) =>
    isInSlowdownZone(driver.location, zone)
  );
  if (activeZones.length === 0) return driver.speedLimit || 25;
  return Math.min(...activeZones.map((z) => z.speedLimit));
}

export default function DriverListPanel({ user, mapRef, onDriverSelect }) {
  const [drivers, setDrivers] = useState([]);
  const [branchId, setBranchId] = useState(null);
  const [parcels, setParcels] = useState({});
  const [slowdowns, setSlowdowns] = useState([]);
  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        }),
      () => setUserLocation(null)
    );
  }, []);

  useEffect(() => {
    if (!user) return;
    const fetchBranchId = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) setBranchId(userDoc.data().branchId || null);
      } catch (err) {
        console.error("Error fetching branchId:", err);
      }
    };
    fetchBranchId();
  }, [user]);

  useEffect(() => {
    if (!branchId) return;
    const q = query(
      collection(db, "users"),
      where("role", "==", "driver"),
      where("branchId", "==", branchId),
      where("status", "==", "Delivering")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const driverList = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDrivers(driverList);
    });
    return () => unsub();
  }, [branchId]);


  useEffect(() => {
    if (!branchId) return;
    const unsub = onSnapshot(doc(db, "branches", branchId), (snap) => {
      if (snap.exists()) setSlowdowns(snap.data().slowdowns || []);
      else setSlowdowns([]);
    });
    return () => unsub();
  }, [branchId]);

  useEffect(() => {
    if (!branchId) return;
    const q = query(
      collection(db, "parcels"),
      where("status", "==", "Out for Delivery")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const grouped = {};
      snapshot.docs.forEach((doc) => {
        const data = doc.data();
        if (!grouped[data.driverUid]) grouped[data.driverUid] = [];
        grouped[data.driverUid].push({ id: doc.id, ...data });
      });
      setParcels(grouped);
    });
    return () => unsub();
  }, [branchId]);

  const getEtaForDriver = (driver, userLocation) => {
    const driverParcels = parcels[driver.id] || [];
    if (!userLocation || driverParcels.length === 0) return "N/A";
    const speed = driver.speed && driver.speed > 0 ? driver.speed : driver?.avgSpeed || 45;

    const destinations = driverParcels
      .filter((p) => p.destination?.latitude && p.destination?.longitude)
      .map((p) => ({ lat: p.destination.latitude, lng: p.destination.longitude }));

    if (!destinations.length) return "N/A";

    let fastRoute = [];
    let visited = new Array(destinations.length).fill(false);
    let current = { lat: userLocation.latitude, lng: userLocation.longitude };

    for (let i = 0; i < destinations.length; i++) {
      let nearestIndex = -1;
      let minDist = Infinity;
      for (let j = 0; j < destinations.length; j++) {
        if (visited[j]) continue;
        const dist = haversineDistance(current.lat, current.lng, destinations[j].lat, destinations[j].lng);
        if (dist < minDist) { minDist = dist; nearestIndex = j; }
      }
      if (nearestIndex !== -1) {
        visited[nearestIndex] = true;
        fastRoute.push(destinations[nearestIndex]);
        current = destinations[nearestIndex];
      }
    }

    const fastDistance = fastRoute.reduce(
      (acc, dest, idx) => {
        const last = idx === 0 ? { lat: userLocation.latitude, lng: userLocation.longitude } : fastRoute[idx - 1];
        return acc + haversineDistance(last.lat, last.lng, dest.lat, dest.lng);
      }, 0
    );

    const slowDistance = destinations.reduce(
      (acc, dest, idx) => {
        const last = idx === 0 ? { lat: userLocation.latitude, lng: userLocation.longitude } : destinations[idx - 1];
        return acc + haversineDistance(last.lat, last.lng, dest.lat, dest.lng);
      }, 0
    );

    const allowanceMinutes = 3;
    const numParcels = destinations.length;
    const fastMinutes = Math.round((fastDistance / speed) * 60) + allowanceMinutes * numParcels;
    const slowMinutes = Math.round((slowDistance / (speed * 0.7)) * 60) + allowanceMinutes * numParcels;

    return `${formatETA(fastMinutes / 60)} - ${formatETA(slowMinutes / 60)}`;
  };

  const handleGiveWarning = async (driver) => {
    if (!user) return alert("User not authenticated.");

    try {

      const distance = driver.totalDistance || 0;
      const avgSpeed = driver.avgSpeed || driver.speed || 0;
      const topSpeed = driver.topSpeed || driver.speed || 0;
      const time = driver.activeMinutes || 0;

      await updateDoc(doc(db, "users", driver.id), {
        violations: arrayUnion({
          driverLocation: driver.location || null,
          issuedAt: Timestamp.now(),
          message: "Speeding violation",
          distance,
          avgSpeed,
          topSpeed,
          time,
        }),
      });

      alert(`Warning given to ${driver.fullName || "driver"}`);
    } catch (err) {
      console.error("Failed to give warning:", err);
      alert("Error giving warning. Try again.");
    }
  };


  const handleFocusOnMap = (driver) => {
    if (!mapRef || !mapRef.current || !driver.location) return;
    const { latitude, longitude } = driver.location;
    mapRef.current.panTo({ lat: latitude, lng: longitude });
    mapRef.current.setZoom(17);
    onDriverSelect(driver);
  };

  return (
    <Card sx={{ height: "100%", overflowY: "auto", borderRadius: 3, boxShadow: 4 }}>
      <CardContent sx={{ p: 2 }}>
        {drivers.length === 0 && (
          <Typography variant="body1" color="text.secondary" sx={{ textAlign: "center", mt: 2 }}>
            No drivers found
          </Typography>
        )}

        {drivers.map((driver) => {
          const speedLimit = getDynamicSpeedLimit(driver, slowdowns);
          const isOverspeeding = driver.speed > speedLimit;
          const etaRange = getEtaForDriver(driver, userLocation);

          return (
            <Accordion
              key={driver.id}
              sx={{
                mb: 2,
                borderRadius: 2,
                "&:before": { display: "none" },
                bgcolor: isOverspeeding ? "#fff4f4" : "#f9f9f9",
              }}
            >
              <AccordionSummary expandIcon={<ExpandMore />} sx={{ borderRadius: 2 }}>
                <Grid container alignItems="center" justifyContent="space-between">
                  <Grid sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar src={driver.photoURL || ""} alt={driver.fullName || "Driver"} />
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">{driver.fullName || "Unnamed Driver"}</Typography>
                      <Box sx={{ mt: 0.5, display: "flex", flexDirection: "column", gap: 0.25 }}>
                        <Typography variant="body2">Parcels: {parcels[driver.id]?.length || 0}</Typography>
                        <Typography variant="body2" sx={{ color: isOverspeeding ? "#f21b3f" : "#29bf12" }}>
                          Speed: {driver.speed || "N/A"} km/h
                        </Typography>
                        <Typography variant="body2" color="text.secondary">ETA: {etaRange}</Typography>
                      </Box>
                    </Box>
                  </Grid>

                  {isOverspeeding && (
                    <Grid>
                      <Tooltip title="Give Warning">
                        <IconButton onClick={(e) => { e.stopPropagation(); handleGiveWarning(driver); }}>
                          <GiveWarningButton />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  )}
                </Grid>
              </AccordionSummary>
              <AccordionDetails>
                <Grid container alignItems="center" justifyContent="space-between">
                  <Grid>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      <Typography variant="body2">Vehicle: {driver.vehicleType + " | " + driver.model || "N/A"}</Typography>
                      <Typography variant="body2">Plate: {driver.plateNumber || "N/A"}</Typography>
                    </Box>
                  </Grid>

                  {driver.location && (
                    <Grid>
                      <Tooltip title="Focus on Map">
                        <IconButton onClick={() => handleFocusOnMap(driver)}>
                          <MyLocation />
                        </IconButton>
                      </Tooltip>
                    </Grid>
                  )}
                </Grid>
              </AccordionDetails>
            </Accordion>
          );
        })}
      </CardContent>
    </Card>
  );
}
