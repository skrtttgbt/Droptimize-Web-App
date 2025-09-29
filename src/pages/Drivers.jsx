import { useEffect, useState, useMemo } from "react";
import { Stack, Typography, CircularProgress } from "@mui/material";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  getDoc,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { auth, db } from "../firebaseConfig";
import DriversHeader from "../components/Dashboard/DriversHeader.jsx";
import DriverList from "../components/Dashboard/DriverList.jsx";
import AssignDriverModal from "./Modals/AssignDriver.jsx";

export default function Drivers() {
  const [user, setUser] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [allDrivers, setAllDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  // ✅ NEW STATE for modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState(null);

  // 1️⃣ Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // 2️⃣ Fetch branchId of current user
  useEffect(() => {
    if (!user) return;
    const fetchBranchId = async () => {
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        setBranchId(userDoc.data().branchId || null);
      }
    };
    fetchBranchId();
  }, [user]);

  // 3️⃣ Listen for drivers within the same branch
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

  const handleAssignParcelClick = (driver) => {
    setSelectedDriver(driver);
    setAssignModalOpen(true);
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
              (d) =>
                !d.status || (d.status || "").toLowerCase() === "offline"
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
            onAssignParcel={handleAssignParcelClick} 
          />
        )}
      </Stack>

      {/* ✅ Assign Parcel Modal */}
      <AssignDriverModal
          open={assignModalOpen}
          onClose={() => setAssignModalOpen(false)}
          driver={selectedDriver} 
        />

    </>
  );
}
