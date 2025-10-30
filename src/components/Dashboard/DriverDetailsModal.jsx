import { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Box,
  Paper,
  Typography,
  Grid,
  Stack,
  Avatar,
  Chip,
  Button,
  Divider,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import MapIcon from "@mui/icons-material/Map";
import { arrayUnion, doc, Timestamp, updateDoc, onSnapshot } from "firebase/firestore";
import { db } from "../../firebaseConfig";
import { useNavigate } from "react-router-dom";

const statusColors = { available: "#29bf12", delivering: "#ff9914", offline: "#c4cad0" };
const CROSSWALK_RADIUS_KM = 0.015;
const CROSSWALK_LIMIT_KMH = 10;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (deg) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
function isInsideZone(loc, zone) {
  if (!loc || !zone?.location) return false;
  const dKm = haversineKm(loc.latitude, loc.longitude, zone.location.lat, zone.location.lng);
  const radiusKm = (zone.radius || 15) / 1000;
  return dKm <= radiusKm;
}
function getDisplaySpeed(driver) {
  const loc = driver?.location || {};
  if (Number.isFinite(loc.speedKmh)) return Math.round(loc.speedKmh);
  if (Number.isFinite(driver?.speed)) return Math.round(driver.speed);
  if (Number.isFinite(driver?.avgSpeed)) return Math.round(driver.avgSpeed);
  return null;
}

export default function DriverDetailsModal({ driver, open, onClose, onAssignParcel }) {
  const navigate = useNavigate();
  const [slowdowns, setSlowdowns] = useState([]);
  const [inCrosswalk, setInCrosswalk] = useState(false);

  const d = driver ?? {};
  const status = (d.status || "offline").toLowerCase();
  const photo = d.avatar || d.photoURL || d.profilePhoto || d.image || "";
  const displayName =
    `${d.firstName || ""} ${d.lastName || ""}`.trim() || d.fullName || d.displayName || "Unnamed Driver";

  useEffect(() => {
    if (!d.branchId) {
      setSlowdowns([]);
      return;
    }
    const ref = doc(db, "branches", d.branchId);
    const unsub = onSnapshot(ref, (snap) => {
      const data = snap.data();
      setSlowdowns(Array.isArray(data?.slowdowns) ? data.slowdowns : []);
    });
    return () => unsub();
  }, [d.branchId]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loc = d.location;
      if (!loc?.latitude || !loc?.longitude) {
        if (!cancelled) setInCrosswalk(false);
        return;
      }
      const lat = loc.latitude,
        lng = loc.longitude;
      const delta = 0.00045;
      const query = `
        [out:json][timeout:20];
        (node["highway"="crossing"](${lat - delta},${lng - delta},${lat + delta},${lng + delta}););
        out body;
      `;
      try {
        const res = await fetch(
          `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(query)}`
        );
        const data = await res.json();
        let inside = false;
        if (Array.isArray(data?.elements)) {
          for (const el of data.elements) {
            if (el.type !== "node") continue;
            const dKm = haversineKm(lat, lng, el.lat, el.lon);
            if (dKm <= CROSSWALK_RADIUS_KM) {
              inside = true;
              break;
            }
          }
        }
        if (!cancelled) setInCrosswalk(inside);
      } catch {
        if (!cancelled) setInCrosswalk(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [d.location?.latitude, d.location?.longitude]);

  const applicableLimit = useMemo(() => {
    const candidates = [];
    if (inCrosswalk) candidates.push(CROSSWALK_LIMIT_KMH);
    if (Array.isArray(slowdowns) && d.location) {
      slowdowns.forEach((z) => {
        if (z?.category === "Slowdown" && Number.isFinite(z.speedLimit) && isInsideZone(d.location, z)) {
          candidates.push(z.speedLimit);
        }
      });
    }
    return candidates.length ? Math.min(...candidates) : null;
  }, [inCrosswalk, slowdowns, d.location]);

  const displaySpeed = getDisplaySpeed(d);
  const isOverspeeding =
    Number.isFinite(displaySpeed) &&
    applicableLimit != null &&
    applicableLimit > 0 &&
    displaySpeed > applicableLimit;

  const handleGiveWarning = async () => {
    try {
      await updateDoc(doc(db, "users", d.id), {
        violations: arrayUnion({
          driverLocation: d.location || null,
          issuedAt: Timestamp.now(),
          message: "Speeding violation",
          distance: d.totalDistance || 0,
          avgSpeed: d.avgSpeed || d.speed || 0,
          topSpeed: d.topSpeed || d.speed || 0,
          time: d.activeMinutes || 0,
          speedAtIssue: displaySpeed || 0,
          limitAtIssue: applicableLimit ?? null,
          context: { inCrosswalk },
        }),
      });
      alert(`Warning given to ${d.fullName || displayName}`);
    } catch (err) {
      console.error("Failed to give warning:", err);
      alert("Error giving warning. Try again.");
    }
  };

  const handleViewMap = () => {
    navigate(`/dashboard/map?driverId=${d.id}`);
  };

  if (!open) return null;

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "95%",
          maxWidth: 600,
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "#fff",
          borderRadius: 3,
          boxShadow: 24,
          p: 3,
        }}
      >
        <Typography
          variant="h6"
          fontWeight="bold"
          mb={3}
          sx={{ color: "#00b2e1", fontFamily: "Lexend" }}
        >
          Driver Details
        </Typography>

        <Divider sx={{ mb: 2 }} />

        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
              <Avatar src={photo} alt={displayName} sx={{ width: 72, height: 72, mx: "auto", mb: 1 }} />
              <Chip
                label={status}
                size="small"
                sx={{
                  textTransform: "capitalize",
                  backgroundColor: statusColors[status] || "#c4cad0",
                  color: "#fff",
                  fontWeight: 500,
                }}
              />
            </Grid>

            <Grid item xs={12} sm={8}>
              <Stack spacing={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {displayName}
                </Typography>
                <Typography variant="body2">
                  <strong>ID:</strong> {d.id || "N/A"}
                </Typography>
                <Typography variant="body2">
                  <strong>Email:</strong> {d.email || "N/A"}
                </Typography>
                <Typography variant="body2">
                  <strong>Contact:</strong> {d.phoneNumber || "N/A"}
                </Typography>
                <Typography variant="body2">
                  <strong>Speed:</strong>{" "}
                  {Number.isFinite(displaySpeed) ? `${displaySpeed} km/h` : "N/A"}
                  {applicableLimit != null ? ` • Limit ${applicableLimit} km/h` : ""}
                  {inCrosswalk ? " • Crosswalk" : ""}
                </Typography>
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        <Stack direction="row" spacing={2} mt={3} justifyContent="flex-end" flexWrap="wrap">
          {status === "available" && (
            <Button
              variant="contained"
              startIcon={<LocalShippingIcon />}
              onClick={() => onAssignParcel?.(d)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 500,
                backgroundColor: "#0064b5",
                "&:hover": { backgroundColor: "#00509e" },
              }}
            >
              Assign Parcels
            </Button>
          )}

          {isOverspeeding && (
            <Button
              variant="contained"
              startIcon={<WarningAmberIcon />}
              onClick={handleGiveWarning}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 500,
                backgroundColor: "#f21b3f",
                "&:hover": { backgroundColor: "#d01735" },
              }}
            >
              Give Warning
            </Button>
          )}

          {status === "delivering" && (
            <Button
              variant="contained"
              startIcon={<MapIcon />}
              onClick={handleViewMap}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 500,
                backgroundColor: "#0064b5",
                "&:hover": { backgroundColor: "#00509e" },
              }}
            >
              See on Map
            </Button>
          )}

          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              borderRadius: 2,
              fontWeight: 500,
              textTransform: "none",
              borderColor: "#c4cad0",
              color: "#5a5a5a",
              "&:hover": { borderColor: "#a6a6a6", backgroundColor: "#f4f4f4" },
            }}
          >
            Close
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}
