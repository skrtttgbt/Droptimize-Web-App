import { useEffect, useState, useMemo } from "react";
import {
  Box,
  Stack,
  Typography,
  CircularProgress,
  Divider,
} from "@mui/material";
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
import DriverDetailsModal from "../components/Dashboard/DriverDetailsModal.jsx"; // ✅ Import modal

export default function Drivers() {
  const [user, setUser] = useState(null);
  const [branchId, setBranchId] = useState(null);
  const [allDrivers, setAllDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false); // ✅ Added for details
  const [selectedDriver, setSelectedDriver] = useState(null);

  // 🔹 Listen for auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  // 🔹 Fetch branchId of current user
  useEffect(() => {
    if (!user) return;
    const fetchBranchId = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setBranchId(userDoc.data().branchId || null);
        }
      } catch (err) {
        console.error("Error fetching branch ID:", err);
      }
    };
    fetchBranchId();
  }, [user]);

  // 🔹 Listen for drivers in the same branch
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
      (err) => {
        console.error("Error loading drivers:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, [branchId]);

  const getDisplayName = (d) =>
    `${d?.firstName || ""} ${d?.lastName || ""}`.trim() ||
    d?.displayName ||
    "Unnamed Driver";

  // 🔹 Filter drivers
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

  // 🔹 Assign Parcel
  const handleAssignParcelClick = (driver) => {
    setSelectedDriver(driver);
    setAssignModalOpen(true);
  };

  // 🔹 Open Driver Details
  const handleViewDetails = (driver) => {
    setSelectedDriver(driver);
    setDetailsModalOpen(true);
  };

  // 🔹 Give Warning (can be updated later to write to Firestore)
  const handleGiveWarning = (driver) => {
    alert(`⚠️ Warning sent to ${getDisplayName(driver)}.`);
  };

  // 🔹 View Map (you can integrate with your map page)
  const handleViewMap = (driver) => {
    alert(`🗺️ Showing ${getDisplayName(driver)} on the map.`);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        px: { xs: 2, md: 4 },
        py: 3,
        boxSizing: "border-box",
      }}
    >
      {/* Page Title */}
      <Typography
        variant="h4"
        sx={{
          mb: 2,
          color: "#00b2e1",
          fontWeight: "bold",
          fontFamily: "Lexend",
        }}
      >
        Manage Drivers
      </Typography>

      <Stack spacing={3} sx={{ width: "100%" }}>
        {/* Filters */}
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
              (d) => !d.status || (d.status || "").toLowerCase() === "offline"
            ).length,
          }}
        />

        <Divider sx={{ borderColor: "#c4cad0" }} />

        {/* Driver List */}
        {loading ? (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              height: "60vh",
              width: "100%",
            }}
          >
            <CircularProgress color="primary" />
          </Box>
        ) : (
          <Box sx={{ width: "100%", overflow: "hidden" }}>
            <DriverList
              drivers={filteredDrivers}
              onAssignParcel={handleAssignParcelClick}
              onViewDetails={handleViewDetails} // ✅ passes driver to open modal
            />
          </Box>
        )}
      </Stack>

      {/* Assign Parcel Modal */}
      <AssignDriverModal
        open={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        driver={selectedDriver}
      />

      {/* ✅ Driver Details Modal */}
      <DriverDetailsModal
        open={detailsModalOpen}
        driver={selectedDriver}
        onClose={() => setDetailsModalOpen(false)}
        onAssignParcel={(driver) => {
          setDetailsModalOpen(false);
          handleAssignParcelClick(driver);
        }}
        onGiveWarning={handleGiveWarning}
        onViewMap={handleViewMap}
      />
    </Box>
  );
}
