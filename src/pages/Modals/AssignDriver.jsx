import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  doc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebaseConfig";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  CircularProgress,
  List,
  ListItem,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
} from "@mui/material";

// Haversine distance (km)
function haversineDistanceKM(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function AssignDriverModal({ open, onClose, driver }) {
  const [parcels, setParcels] = useState({ unassigned: [], assignedToDriver: [] });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [userLocation, setUserLocation] = useState(null);

  const assumedSpeedKmh = 45;
  const allowanceMinutesPerParcel = 3;
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported");
      setUserLocation(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
      },
      (err) => {
        console.warn("Geolocation error:", err);
        setUserLocation(null);
      }
    );
  }, []);

  useEffect(() => {
    if (!driver) return;

    const parcelsRef = collection(db, "parcels");

    const unsub = onSnapshot(parcelsRef, (snapshot) => {
      const allParcels = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data(),
      }));

      const preferred = (driver.preferredRoutes || []).map((r) => ({
        barangay: (r.barangayName || "").toLowerCase(),
        municipality: (r.municipalityName || "").toLowerCase(),
        province: (r.provinceName || "").toLowerCase(),
        region: (r.regionName || "").toLowerCase(),
      }));

      const unassigned = allParcels.filter((p) => {
        const isUnassigned = !p.driverUid && !p.driverName;
        const matchesRoute = preferred.some(
          (route) =>
            (p.barangay || "").toLowerCase() === route.barangay &&
            (p.municipality || "").toLowerCase() === route.municipality &&
            (p.province || "").toLowerCase() === route.province &&
            (p.region || "").toLowerCase() === route.region
        );
        return isUnassigned && matchesRoute;
      });

      const assignedToDriver = allParcels.filter(
        (p) => p.driverUid === driver.id
      );

      setParcels({ unassigned, assignedToDriver });
      setLoading(false);
    });

    return () => unsub();
  }, [driver]);

  const computeTotalETA = (list) => {
    if (!userLocation || !list || list.length === 0) return "N/A";

    const destinations = list
      .filter(
        (p) =>
          p.destination &&
          p.destination.latitude != null &&
          p.destination.longitude != null
      )
      .map((p) => ({
        lat: p.destination.latitude,
        lng: p.destination.longitude,
      }));

    if (destinations.length === 0) return "N/A";

    // ---------- FASTEST ROUTE (Greedy Nearest Neighbor) ----------
    let fastRoute = [];
    let visited = new Array(destinations.length).fill(false);
    let current = { lat: userLocation.latitude, lng: userLocation.longitude };

    for (let i = 0; i < destinations.length; i++) {
      let nearestIndex = -1;
      let minDist = Infinity;

      for (let j = 0; j < destinations.length; j++) {
        if (visited[j]) continue;

        const dist = haversineDistanceKM(
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

    // Calculate distance for fast route
    let fastDistance = 0;
    let lastFast = { lat: userLocation.latitude, lng: userLocation.longitude };
    for (const point of fastRoute) {
      fastDistance += haversineDistanceKM(
        lastFast.lat,
        lastFast.lng,
        point.lat,
        point.lng
      );
      lastFast = point;
    }

    // ---------- SLOWEST ROUTE (Worst Order — no optimization) ----------
    let slowDistance = 0;
    let lastSlow = { lat: userLocation.latitude, lng: userLocation.longitude };
    for (const point of destinations) {
      slowDistance += haversineDistanceKM(
        lastSlow.lat,
        lastSlow.lng,
        point.lat,
        point.lng
      );
      lastSlow = point;
    }

    // Convert distances to minutes
    const fastMinutes =
      Math.round((fastDistance / assumedSpeedKmh) * 60) +
      allowanceMinutesPerParcel * destinations.length;

    const slowMinutes =
      Math.round((slowDistance / assumedSpeedKmh) * 60) +
      allowanceMinutesPerParcel * destinations.length;

    // Format time
    const formatTime = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return `${formatTime(fastMinutes)} – ${formatTime(slowMinutes)}`;
  };


  const handleAssign = async (parcel) => {
    try {
      await updateDoc(doc(db, "parcels", parcel.id), {
        driverUid: driver.id,
        driverName: driver.fullName,
        assignedAt: serverTimestamp(),
        status: "Out for Delivery",
      });
      //Assignment Success Message Here
      alert(`Parcel ${parcel.reference} assigned to ${driver.fullName}`);
    } catch (error) {
      console.error("Error assigning parcel:", error);
      alert(" Failed to assign parcel. Please try again.");
    }
  };

  const handleUnassign = async (parcel) => {
    try {
      await updateDoc(doc(db, "parcels", parcel.id), {
        driverUid: null,
        driverName: null,
        assignedAt: null,
        status: "Pending",
      });
      //Unassignment Success Message Here
      alert(` Parcel ${parcel.reference} unassigned from ${driver.fullName}`);
    } catch (error) {
      console.error("Error unassigning parcel:", error);
      alert("Failed to unassign parcel. Please try again.");
    }
  };

  const renderList = (list, type) => {
    if (loading) return <CircularProgress />;
    if (!list || list.length === 0)
      return (
        <Typography variant="body2" color="text.secondary">
          {type === "unassigned"
            ? "No unassigned parcels match this driver’s route."
            : "No parcels have been assigned to this driver yet."}
        </Typography>
      );

    return (
      <List>
        {list.map((parcel, idx) => (
          <ListItem
            key={parcel.id}
            secondaryAction={
              type === "unassigned" ? (
                <Button variant="contained" onClick={() => handleAssign(parcel)}>
                  Assign
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  color="error"
                  onClick={() => handleUnassign(parcel)}
                >
                  Unassign
                </Button>
              )
            }
          >
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                width: "100%",
                alignItems: "center",
              }}
            >
              <Typography>
                {parcel.reference} – {parcel.barangay}, {parcel.municipality}
              </Typography>
              {/* Remove this line since computeETAForParcel is not defined */}
              {/* <Typography variant="caption" color="text.secondary">
                ETA: {computeETAForParcel(parcel, idx)}
              </Typography> */}
            </Box>
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        Manage Parcels for {driver?.fullName || "Driver"}

        — Total ETA: {computeTotalETA(parcels.assignedToDriver)}

      </DialogTitle>


      <Tabs value={tab} onChange={(e, v) => setTab(v)} variant="fullWidth">
        <Tab label="Unassigned Parcels" />
        <Tab label="Assigned Parcels" />
      </Tabs>

      <DialogContent>
        <Box sx={{ mt: 2 }}>
          {tab === 0 && renderList(parcels.unassigned, "unassigned")}
          {tab === 1 && renderList(parcels.assignedToDriver, "assigned")}
        </Box>
      </DialogContent>

    </Dialog>
  );
}
