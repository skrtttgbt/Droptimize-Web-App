import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
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
  Modal,
  TextField,
  Stack,
} from "@mui/material";
import GiveWarningButton from "./GiveWarningButton.jsx";

/** Haversine distance in KM */
function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (x) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function formatETA(hours) {
  if (!isFinite(hours) || hours <= 0) return "N/A";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function DriverListPanel({
  user,
  selectedDriver,
  onDriverSelect,
  onGiveWarning,
}) {
  const [drivers, setDrivers] = useState([]);
  const [branchId, setBranchId] = useState(null);
  const [parcels, setParcels] = useState({});
  const [openModal, setOpenModal] = useState(false);
  const [activeDriver, setActiveDriver] = useState(null);
  const [speedLimitInput, setSpeedLimitInput] = useState("");

  /** Get branchId of logged-in user */
  useEffect(() => {
    if (!user) return;
    const fetchBranch = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) setBranchId(userDoc.data().branchId || null);
    };
    fetchBranch();
  }, [user]);

  /** Listen for drivers in same branch */
  useEffect(() => {
    if (!branchId) return;
    const q = query(
      collection(db, "users"),
      where("role", "==", "driver"),
      where("branchId", "==", branchId)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      setDrivers(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, [branchId]);

  /** Listen for all parcels of this branch */
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

  /** 🧾 Open modal to set slowdown */
  const handleOpenSlowdownModal = (driver) => {
    setActiveDriver(driver);
    setSpeedLimitInput(driver.speedLimit || "");
    setOpenModal(true);
  };

  /** 💾 Save slowdown setting */
  const handleSaveSlowdown = async () => {
    if (!activeDriver || !speedLimitInput) return;
    try {
      const driverRef = doc(db, "users", activeDriver.id);
      await updateDoc(driverRef, { speedLimit: Number(speedLimitInput) });
      setOpenModal(false);
      alert(`✅ Slowdown limit set to ${speedLimitInput} km/h for ${activeDriver.fullName}`);
    } catch (err) {
      console.error("Failed to set slowdown:", err);
      alert("Error setting slowdown. Check console.");
    }
  };

  return (
    <>
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
                const limit = driver.speedLimit || 60;
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
                            <Typography
                              variant="body2"
                              sx={{ color: "#ff9800", fontWeight: "bold" }}
                            >
                              Slowdown limit: {limit} km/h
                            </Typography>
                          </>
                        }
                      />

                      {/* ⚙️ Set Slowdown Button */}
                      <Button
                        variant="outlined"
                        size="small"
                        sx={{ ml: 1 }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenSlowdownModal(driver);
                        }}
                      >
                        Set Slowdown
                      </Button>

                      {/* ⚠️ Give Warning if Overspeed */}
                      {isOverspeeding && (
                        <GiveWarningButton
                          onClick={(e) => {
                            e.stopPropagation();
                            onGiveWarning?.(driver);
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

      {/* 🪟 Slowdown Modal */}
      <Modal open={openModal} onClose={() => setOpenModal(false)}>
        <Box
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            width: 320,
            bgcolor: "background.paper",
            borderRadius: 3,
            boxShadow: 24,
            p: 4,
          }}
        >
          <Typography variant="h6" fontWeight="bold" sx={{ mb: 2 }}>
            Set Slowdown for {activeDriver?.fullName}
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Speed Limit (km/h)"
              type="number"
              value={speedLimitInput}
              onChange={(e) => setSpeedLimitInput(e.target.value)}
              fullWidth
            />
            <Button
              variant="contained"
              sx={{
                backgroundColor: "#00b2e1",
                fontWeight: "bold",
                "&:hover": { backgroundColor: "#0098c9" },
              }}
              onClick={handleSaveSlowdown}
            >
              Save Slowdown
            </Button>
          </Stack>
        </Box>
      </Modal>
    </>
  );
}
