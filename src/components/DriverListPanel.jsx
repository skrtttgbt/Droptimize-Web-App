import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "/src/firebaseConfig";
import {
  Card,
  CardContent,
  Typography,
  List,
  ListItemButton,
  ListItemText,
  Divider,
  Box,
  Avatar,
  ListItemAvatar,
  Button,
} from "@mui/material";
import GiveWarningButton from "./GiveWarningButton.jsx";

/** Haversine distance in KM to compute the shortest distance */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatETA(hours) {
  if (!isFinite(hours) || hours <= 0) return "N/A";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

// To check if the driver is within a slowdown zone
function isInSlowdownZone(driverLocation, slowdown) {
  if (!driverLocation || !slowdown.location) return false;
  const distKm = haversineDistance(
    driverLocation.latitude,
    driverLocation.longitude,
    slowdown.location.lat,
    slowdown.location.lng
  );
  // Default radius 15 meters = 0.015 km for slowdown zones that are not defined on the database but defined in the map api 
  const radiusKm = (slowdown.radius || 15) / 1000;
  return distKm <= radiusKm;
}
// Get the current applicable speed limit for a driver based on slowdown zones
function getDynamicSpeedLimit(driver, slowdowns) {
  if (!driver.location) return driver.speedLimit || 25; 
  const zones = slowdowns.filter((zone) =>
    isInSlowdownZone(driver.location, zone)
  );
  if (zones.length === 0) {
    return driver.speedLimit || 25;
  }
  return Math.min(...zones.map((z) => z.speedLimit));
}

export default function DriverListPanel({
  user,
  selectedDriver,
  onDriverSelect,
}) {
  const [drivers, setDrivers] = useState([]);
  const [branchId, setBranchId] = useState(null);
  const [parcels, setParcels] = useState({});
  const [slowdowns, setSlowdowns] = useState([]);

  // Fetch user's branchId
  useEffect(() => {
    if (!user) return;
    const fetchBranch = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) setBranchId(userDoc.data().branchId || null);
    };
    fetchBranch();
  }, [user]);

  // Listen for drivers
  useEffect(() => {
    if (!branchId) return;
    const q = query(
      collection(db, "users"),
      where("role", "==", "driver"),
      where("branchId", "==", branchId),
      where("status", "==", "Delivering")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setDrivers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [branchId]);

  // Listen for parcels
  useEffect(() => {
    if (!branchId) return;
    const q = query(
      collection(db, "parcels"),
      where("status", "in", ["Pending", "Out For Delivery"])
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const grouped = {};
      snapshot.docs.forEach((doc) => {
        const p = doc.data();
        if (!grouped[p.driverUid]) grouped[p.driverUid] = [];
        grouped[p.driverUid].push({ id: doc.id, ...p });
      });
      setParcels(grouped);
    });
    return () => unsub();
  }, [branchId]);

  // Listen for slowdown zones
  useEffect(() => {
    if (!branchId) return;
    const q = query(collection(db, "slowdowns"), where("branchId", "==", branchId));
    const unsub = onSnapshot(q, (snapshot) => {
      setSlowdowns(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [branchId]);

  // Calculate ETA range
  const getEtaForDriver = (driver) => {
    const driverParcels = parcels[driver.id] || [];
    if (
      !driverParcels.length ||
      !driver.location ||
      !driver.speed ||
      driver.speed <= 0
    )
      return "N/A";
    const nextParcel = driverParcels[0];
    const dist = haversineDistance(
      driver.location.latitude,
      driver.location.longitude,
      nextParcel.destination.latitude,
      nextParcel.destination.longitude
    );
    const fastHrs = dist / driver.speed;
    const slowHrs = dist / (driver.speed * 0.7);
    return `${formatETA(fastHrs)} - ${formatETA(slowHrs)}`;
  };



async function handleGiveWarning(driver) {
  if (!user) {
    alert("User not authenticated");
    return;
  }

  try {
    await addDoc(collection(db, "drivers", driver.id, "violations"), {
      issuedBy: user.uid,
      timestamp: serverTimestamp(),
      status: "Pending",
      message: "Speeding violation",
    });
    alert(`Warning given to ${driver.fullName || "driver"}`);
  } catch (error) {
    console.error("Error adding warning:", error);
    alert("Failed to give warning. Please try again.");
  }
}


  return (
    <Card sx={{ height: "100%", overflowY: "auto" }}>
      <CardContent>
        <Typography
          variant="h5"
          gutterBottom
          sx={{
            color: "#00b2e1",
            fontWeight: "bold",
            fontFamily: "Lexend",
          }}
        >
          Drivers
        </Typography>

        {selectedDriver && (
          <Box textAlign="center" sx={{ mb: 2 }}>
            <Button
              variant="contained"
              color="error"
              onClick={() => onDriverSelect(null)}
              sx={{ fontWeight: "bold", borderRadius: 2 }}
            >
              Deselect Driver
            </Button>
          </Box>
        )}

        {drivers.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 2, textAlign: "center" }}
          >
            No drivers found
          </Typography>
        ) : (
          <List disablePadding>
            {drivers.map((driver, index) => {
              const limit = getDynamicSpeedLimit(driver, slowdowns);
              const isOverspeeding = driver.speed > limit;
              const etaRange = getEtaForDriver(driver);
              const isActive = selectedDriver?.id === driver.id;

              return (
                <Box key={driver.id}>
                  <ListItemButton
                    onClick={() =>
                      isActive
                        ? onDriverSelect(null)
                        : onDriverSelect({
                            ...driver,
                            parcels: parcels[driver.id] || [],
                          })
                    }
                    sx={{
                      bgcolor: isActive ? "#e0f7fa" : "transparent",
                      transition: "background 0.3s",
                    }}
                  >
                    <ListItemAvatar>
                      <Avatar
                        src={driver.photoURL || ""}
                        alt={driver.fullName || "Driver"}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight="bold">
                          {driver.fullName || "Unnamed Driver"}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            Vehicle: {driver.vehicle || "N/A"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Plate: {driver.plateNumber || "N/A"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Parcels: {parcels[driver.id]?.length || 0}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{
                              fontWeight: "bold",
                              color: isOverspeeding ? "#f21b3f" : "#29bf12",
                            }}
                          >
                            Speed: {driver.speed ? `${driver.speed} km/h` : "N/A"}
                          </Typography>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: "bold", color: "#00b2e1" }}
                          >
                            ETA to next parcel: {etaRange}
                          </Typography>
                        </>
                      }
                    />

                    {isOverspeeding && (
                      <GiveWarningButton
                        onClick={(e) => {
                          e.stopPropagation();
                          handleGiveWarning(driver);
                        }}
                      />
                    )}
                  </ListItemButton>
                  {index < drivers.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
