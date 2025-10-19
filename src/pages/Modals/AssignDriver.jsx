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
  DialogActions,
  CircularProgress,
  List,
  ListItem,
  Button,
  Tabs,
  Tab,
  Box,
  Typography,
  Divider,
  Stack,
} from "@mui/material";

// Haversine distance (km)
function haversineDistanceKM(lat1, lon1, lat2, lon2) {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export default function AssignDriverModal({ open, onClose, driver }) {
  const [parcels, setParcels] = useState({
    unassigned: [],
    assignedToDriver: [],
  });
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [userLocation, setUserLocation] = useState(null);

  const assumedSpeedKmh = 45;
  const allowanceMinutesPerParcel = 3;

  useEffect(() => {
    if (!navigator.geolocation) {
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
      () => setUserLocation(null)
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

      const unassigned = allParcels
        .filter(
          (p) =>
            p.status !== "Delivered" && // Filter out "Delivered" status
            !p.driverUid &&
            !p.driverName &&
            preferred.some(
              (route) =>
                (p.barangay || "").toLowerCase() === route.barangay &&
                (p.municipality || "").toLowerCase() === route.municipality &&
                (p.province || "").toLowerCase() === route.province &&
                (p.region || "").toLowerCase() === route.region
            )
        );

      const assignedToDriver = allParcels.filter(
        (p) =>
          p.status !== "Delivered" && // Filter out "Delivered" status
          p.driverUid === driver.id
      );

      setParcels({ unassigned, assignedToDriver });
      setLoading(false);
    });

    return () => unsub();
  }, [driver]);

  const computeTotalETA = (list) => {
    if (!userLocation || !list?.length) return "N/A";

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

    if (!destinations.length) return "N/A";

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

    const fastMinutes =
      Math.round((fastDistance / assumedSpeedKmh) * 60) +
      allowanceMinutesPerParcel * destinations.length;

    const formatTime = (mins) => {
      const h = Math.floor(mins / 60);
      const m = mins % 60;
      return h > 0 ? `${h}h ${m}m` : `${m}m`;
    };

    return formatTime(fastMinutes);
  };

  const handleAssign = async (parcel) => {
    try {
      await updateDoc(doc(db, "parcels", parcel.id), {
        driverUid: driver.id,
        driverName: driver.fullName,
        assignedAt: serverTimestamp(),
        status: "Out for Delivery",
      });
    } catch (error) {
      console.error("Error assigning parcel:", error);
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
    } catch (error) {
      console.error("Error unassigning parcel:", error);
    }
  };

  const renderList = (list, type) => {
    if (loading)
      return (
        <Box display="flex" justifyContent="center" py={3}>
          <CircularProgress />
        </Box>
      );

    if (!list?.length)
      return (
        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
          {type === "unassigned"
            ? "No unassigned parcels match this driver’s route."
            : "No parcels have been assigned to this driver yet."}
        </Typography>
      );

    return (
      <List dense disablePadding>
        {list.map((parcel) => (
          <ListItem
            key={parcel.id}
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              px: 2,
              py: 1.5,
              borderBottom: "1px solid #eee",
            }}
          >
            <Box>
              <Typography fontWeight={500}>{parcel.reference}</Typography>
              <Typography variant="body2" color="text.secondary">
                {parcel.barangay}, {parcel.municipality}
              </Typography>
            </Box>
            <Button
              variant={type === "unassigned" ? "contained" : "outlined"}
              color={type === "unassigned" ? "primary" : "error"}
              size="small"
              onClick={() =>
                type === "unassigned"
                  ? handleAssign(parcel)
                  : handleUnassign(parcel)
              }
            >
              {type === "unassigned" ? "Assign" : "Unassign"}
            </Button>
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      sx={{
        "& .MuiDialog-paper": {
          borderRadius: 3,
          p: 1,
        },
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box>
            <Typography variant="h6">
              Manage Parcels — {driver?.fullName || "Driver"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total ETA: {computeTotalETA(parcels.assignedToDriver)}
            </Typography>
          </Box>
        </Stack>
      </DialogTitle>

      <Divider />

      <Tabs
        value={tab}
        onChange={(e, v) => setTab(v)}
        variant="fullWidth"
        textColor="primary"
        indicatorColor="primary"
      >
        <Tab label="Unassigned Parcels" />
        <Tab label="Assigned Parcels" />
      </Tabs>

      <DialogContent dividers sx={{ minHeight: 300, p: 2 }}>
        {tab === 0 && renderList(parcels.unassigned, "unassigned")}
        {tab === 1 && renderList(parcels.assignedToDriver, "assigned")}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="outlined" color="primary">
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
