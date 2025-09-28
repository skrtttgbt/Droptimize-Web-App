import { useEffect, useState, useMemo } from "react";
import {
  Stack,
  Typography,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { auth, db } from "/src/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import DriversHeader from "../components/Dashboard/DriversHeader.jsx";
import DriverList from "../components/Dashboard/DriverList.jsx";

export default function Drivers() {
  const [user, setUser] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [allDrivers, setAllDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // 🚚 Assign Parcel Modal State
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [parcels, setParcels] = useState([]);
  const [parcelLoading, setParcelLoading] = useState(false);

  // 1️⃣ Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // 2️⃣ Fetch branchId of current auth user
  useEffect(() => {
    if (!user) return;
    const fetchBranchId = async () => {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        const data = userDoc.data();
        setBranchId(data.branchId || null);
      }
    };
    fetchBranchId();
  }, [user]);

  // 3️⃣ Listen for drivers with same branch
  useEffect(() => {
    if (!branchId) return;

    const q = query(
      collection(db, "users"),
      where("role", "==", "driver"),
      where("branchId", "==", branchId)
    );

    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const driverData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllDrivers(driverData);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [branchId]);

  const getDisplayName = (d) =>
    `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Unnamed Driver";

  const filteredDrivers = useMemo(() => {
    let result = [...allDrivers];
    const q = searchQuery.trim().toLowerCase();

    if (q) {
      result = result.filter(
        (d) =>
          getDisplayName(d).toLowerCase().includes(q) ||
          (d.id || "").toLowerCase().includes(q)
      );
    }

    if (selectedStatus) {
      result = result.filter(
        (d) => (d.status || "").toLowerCase() === selectedStatus.toLowerCase()
      );
    }

    return result;
  }, [allDrivers, searchQuery, selectedStatus]);

  // 🔑 Open modal and fetch parcels based on preferredRoutes
  const handleAssignParcel = async (driver) => {
    setSelectedDriver(driver);
    setAssignModalOpen(true);
    setParcelLoading(true);

    try {
      const routes = driver.preferredRoutes || [];
      if (routes.length === 0) {
        setParcels([]);
        setParcelLoading(false);
        return;
      }

      // Gather all barangay codes
      const barangayCodes = routes.map((r) => r.barangayCode);

      // Query parcels that match any of the barangay codes
      const parcelsQuery = query(
        collection(db, "parcels"),
        where("barangayCode", "in", barangayCodes)
      );

      const unsubParcels = onSnapshot(parcelsQuery, (snapshot) => {
        const parcelData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setParcels(parcelData);
        setParcelLoading(false);
      });

      return () => unsubParcels();
    } catch (err) {
      console.error("Error fetching parcels:", err);
      setParcelLoading(false);
    }
  };

  return (
    <>
      <Typography
        variant="h4"
        sx={{ margin: "1rem 0", color: "#00b2e1", fontWeight: "bold" }}
      >
        Manage Drivers
      </Typography>

      <Stack spacing={2}>
        <DriversHeader
          showSearch
          onSearch={setSearchQuery}
          onStatusSelect={setSelectedStatus}
          counts={{
            all: allDrivers.length,
            available: allDrivers.filter(
              (d) => (d.status || "").toLowerCase() === "available"
            ).length,
            delivering: allDrivers.filter(
              (d) => (d.status || "").toLowerCase() === "delivering"
            ).length,
            offline: allDrivers.filter(
              (d) => !d.status || d.status.toLowerCase() === "offline"
            ).length,
          }}
        />

        {loading ? (
          <CircularProgress sx={{ alignSelf: "center", mt: 4 }} />
        ) : (
          <DriverList
            drivers={filteredDrivers}
            onViewMap={(driver) =>
              alert(`Viewing map for ${getDisplayName(driver)}`)
            }
            onGiveWarning={(driver) =>
              alert(`Giving warning to ${getDisplayName(driver)}`)
            }
            onAssignParcel={handleAssignParcel}
          />
        )}
      </Stack>

      {/* 📦 Assign Parcel Modal */}
      <Dialog
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Assign Parcel to {selectedDriver && getDisplayName(selectedDriver)}
        </DialogTitle>
        <DialogContent dividers>
          {parcelLoading ? (
            <CircularProgress />
          ) : parcels.length > 0 ? (
            <List>
              {parcels.map((p) => (
                <ListItem key={p.id} button>
                  <ListItemText
                    primary={`Parcel ID: ${p.id}`}
                    secondary={`Barangay: ${p.barangayName || p.barangayCode}`}
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography>No parcels found for preferred routes.</Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAssignModalOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
