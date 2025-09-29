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

export default function AssignDriverModal({ open, onClose, driver }) {
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0); // 0 = Unassigned, 1 = Assigned

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

  const handleAssign = async (parcel) => {
    try {
      await updateDoc(doc(db, "parcels", parcel.id), {
        driverUid: driver.id,
        driverName: driver.fullName,
        assignedAt: serverTimestamp(),
        status: "Out for Delivery",
      });
      alert(`✅ Parcel ${parcel.reference} assigned to ${driver.fullName}`);
    } catch (error) {
      console.error("Error assigning parcel:", error);
      alert("❌ Failed to assign parcel. Please try again.");
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
        {list.map((parcel) => (
          <ListItem
            key={parcel.id}
            secondaryAction={
              type === "unassigned" && (
                <Button
                  variant="contained"
                  onClick={() => handleAssign(parcel)}
                >
                  Assign
                </Button>
              )
            }
          >
            {parcel.reference} – {parcel.barangay}, {parcel.municipality}
          </ListItem>
        ))}
      </List>
    );
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        Manage Parcels for {driver?.fullName || "Driver"}
      </DialogTitle>

      {/* ✅ Tabs */}
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
