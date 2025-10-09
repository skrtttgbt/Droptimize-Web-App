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
  updateDoc,
  arrayUnion,
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

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; 
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
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
  const radiusKm = (zone.location.radius || 15) / 1000; 
  return distKm <= radiusKm;
}

function getDynamicSpeedLimit(driver, slowdowns) {
  if (!driver.location) return driver.speedLimit || 25;

  const activeZones = slowdowns.filter((zone) =>
    isInSlowdownZone(driver.location, zone)
  );

  if (activeZones.length === 0) {
    return driver.speedLimit || 25;
  }

  return Math.min(...activeZones.map((z) => z.speedLimit));
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

  const [userLocation, setUserLocation] = useState(null);

  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn("Error getting location", err);
        setUserLocation(null);
      }
    );
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchBranchId = async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          setBranchId(userDoc.data().branchId || null);
        }
      } catch (err) {
        console.error("Error fetching branchId:", err);
      }
    };

    fetchBranchId();
  }, [user]);

  // Listen to drivers
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

    const branchRef = doc(db, "branches", branchId);

    const unsub = onSnapshot(branchRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        setSlowdowns(data.slowdowns || []);
      } else {
        setSlowdowns([]);
      }
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

    const speed = driver.speed && driver.speed > 0 ? driver.speed : 45; 

    const destinations = driverParcels
      .filter((p) => p.destination?.latitude && p.destination?.longitude)
      .map((p) => ({
        lat: p.destination.latitude,
        lng: p.destination.longitude,
      }));

    if (destinations.length === 0) return "N/A";


    let fastRoute = [];
    let visited = new Array(destinations.length).fill(false);
    let current = { lat: userLocation.latitude, lng: userLocation.longitude };

    for (let i = 0; i < destinations.length; i++) {
      let nearestIndex = -1;
      let minDist = Infinity;

      for (let j = 0; j < destinations.length; j++) {
        if (visited[j]) continue;
        const dist = haversineDistance(
          current.lat,
          current.lng,
          destinations[j].lat,
          destinations[j].lng
        );
        if (dist < minDist) {
          minDist = dist;
          nearestIndex = j;
        }
      }

      if (nearestIndex !== -1) {
        visited[nearestIndex] = true;
        fastRoute.push(destinations[nearestIndex]);
        current = destinations[nearestIndex];
      }
    }

    let fastDistance = 0;
    let last = { lat: userLocation.latitude, lng: userLocation.longitude };
    for (const dest of fastRoute) {
      fastDistance += haversineDistance(last.lat, last.lng, dest.lat, dest.lng);
      last = dest;
    }

    let slowDistance = 0;
    let lastSlow = { lat: userLocation.latitude, lng: userLocation.longitude };
    for (const dest of destinations) {
      slowDistance += haversineDistance(lastSlow.lat, lastSlow.lng, dest.lat, dest.lng);
      lastSlow = dest;
    }

    const allowanceMinutes = 3;
    const numParcels = destinations.length;

    const fastMinutes = Math.round((fastDistance / speed) * 60) + allowanceMinutes * numParcels;
    const slowMinutes = Math.round((slowDistance / (speed * 0.7)) * 60) + allowanceMinutes * numParcels;

    return `${formatETA(fastMinutes / 60)} - ${formatETA(slowMinutes / 60)}`;
  };

  const handleGiveWarning = async (driver) => {
    if (!user) {
      alert("User not authenticated.");
      return;
    }

    try {
      const driverRef = doc(db, "users", driver.id);

      await updateDoc(driverRef, {
        violations: arrayUnion({
          driverLocation: driver.location || null,
          issuedAt: serverTimestamp(),
          timestamp: new Date().toISOString(),
          message: "Speeding violation",
        }),
      });

      alert(`Warning given to ${driver.fullName || "driver"}`);
    } catch (err) {
      console.error("Failed to give warning:", err);
      alert("Error giving warning. Try again.");
    }
  };

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
              const speedLimit = getDynamicSpeedLimit(driver, slowdowns);
              const isOverspeeding = driver.speed > speedLimit;
              const etaRange = getEtaForDriver(driver, userLocation);

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
                            Speed:{" "}
                            {driver.speed ? `${driver.speed} km/h` : "N/A"}
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
