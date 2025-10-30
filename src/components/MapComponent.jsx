import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Circle,
  useJsApiLoader,
  TrafficLayer,
  DirectionsRenderer,
} from "@react-google-maps/api";
import { Box, Fab, Tooltip, TextField, MenuItem } from "@mui/material";
import {
  Traffic as TrafficIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
} from "@mui/icons-material";
import deliverLogo from "/src/assets/box.svg";
import {
  doc,
  getDoc,
  onSnapshot,
  collection,
  query,
  where,
  onSnapshot as onCollectionSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "/src/firebaseConfig";

const CATEGORY_COLORS = {
  Church: "#4caf50",
  Crosswalk: "#2196F3",
  Schools: "#ff9800",
  Slowdown: "#9e9e9e",
};

const UPDATE_INTERVAL_MS = 1500;
const MOVING_THRESHOLD_M = 3;

function normalizeDeg(d) {
  return ((d % 360) + 360) % 360;
}
function shortestArcDelta(fromDeg, toDeg) {
  const a = normalizeDeg(fromDeg);
  const b = normalizeDeg(toDeg);
  let diff = b - a;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return diff;
}
function smoothHeading(prevDeg, nextDeg, factor = 0.35) {
  if (!Number.isFinite(prevDeg)) return normalizeDeg(nextDeg);
  const delta = shortestArcDelta(prevDeg, nextDeg);
  return normalizeDeg(prevDeg + delta * factor);
}
function bearingBetween(a, b) {
  const toRad = (deg) => (deg * Math.PI) / 180;
  const toDeg = (rad) => (rad * 180) / Math.PI;
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const lon1 = toRad(a.lng);
  const lon2 = toRad(b.lng);
  const dLon = lon2 - lon1;
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  let deg = toDeg(Math.atan2(y, x));
  if (deg < 0) deg += 360;
  return deg;
}
function haversineMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const la1 = toRad(a.lat);
  const la2 = toRad(b.lat);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  return R * c;
}

export default function MapComponent({ user, selectedDriver, mapRef }) {
  const [center, setCenter] = useState({ lat: 14.5995, lng: 120.9842 });
  const [showTraffic, setShowTraffic] = useState(true);
  const [addingSlowdown, setAddingSlowdown] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [slowdownPin, setSlowdownPin] = useState(null);
  const [speedLimit, setSpeedLimit] = useState("");
  const [slowdownRadius, setSlowdownRadius] = useState("0");
  const [category, setCategory] = useState("Slowdown");
  const [branchId, setBranchId] = useState(null);
  const [existingSlowdowns, setExistingSlowdowns] = useState([]);
  const [crosswalkNodes, setCrosswalkNodes] = useState([]);
  const [driverParcels, setDriverParcels] = useState([]);
  const [directions, setDirections] = useState(null);
  const [driverPos, setDriverPos] = useState(null);
  const [driverHeading, setDriverHeading] = useState(0);

  const prevDriverPosRef = useRef(null);
  const lastPanTsRef = useRef(0);
  const zoomLockedRef = useRef(false);
  const lastHeadingDegRef = useRef(0);
  const lastHeadingUpdateTsRef = useRef(0);
  const lastGeoUpdateTsRef = useRef(0);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places", "geometry"],
  });

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
          const data = userDoc.data();
          if (data.branchId) setBranchId(data.branchId);
        }
      } catch (err) {
        console.error("fetchBranch failed:", err);
      }
    })();
  }, [user]);

  useEffect(() => {
    if (!isLoaded) return;
    if (!("geolocation" in navigator)) return;
    const opts = { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 };
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        const now = Date.now();
        if (now - (lastGeoUpdateTsRef.current || 0) < UPDATE_INTERVAL_MS) return;
        lastGeoUpdateTsRef.current = now;
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => console.warn("geolocation watch error:", err),
      opts
    );
    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isLoaded]);

  useEffect(() => {
    if (!branchId) return;
    const branchRef = doc(db, "branches", branchId);
    const unsub = onSnapshot(
      branchRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setExistingSlowdowns(Array.isArray(data.slowdowns) ? data.slowdowns : []);
        } else {
          setExistingSlowdowns([]);
        }
      },
      (err) => console.error("onSnapshot(branch) error:", err)
    );
    return () => unsub();
  }, [branchId]);

  useEffect(() => {
    if (!selectedDriver?.id) {
      setDriverPos(null);
      setDirections(null);
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", selectedDriver.id),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();
        const loc = d?.location;
        if (loc && typeof loc.latitude === "number" && typeof loc.longitude === "number") {
          const current = { lat: loc.latitude, lng: loc.longitude };
          setDriverPos(current);
          setCenter((c) => c ?? current);
          const now = Date.now();
          let nextHeading = null;
          if (typeof d?.heading === "number" && Number.isFinite(d.heading)) {
            nextHeading = normalizeDeg(d.heading);
          } else if (prevDriverPosRef.current) {
            const movedM = haversineMeters(prevDriverPosRef.current, current);
            if (movedM > MOVING_THRESHOLD_M) {
              nextHeading = bearingBetween(prevDriverPosRef.current, current);
            }
          }
          if (nextHeading != null) {
            const timeSince = now - (lastHeadingUpdateTsRef.current || 0);
            if (timeSince >= UPDATE_INTERVAL_MS) {
              const smoothed = smoothHeading(lastHeadingDegRef.current ?? 0, nextHeading, 0.35);
              lastHeadingDegRef.current = smoothed;
              lastHeadingUpdateTsRef.current = now;
              setDriverHeading(smoothed);
            }
          }
          prevDriverPosRef.current = current;
        }
      },
      (err) => console.error("onSnapshot(user) error:", err)
    );
    return () => unsub();
  }, [selectedDriver]);

  useEffect(() => {
    if (!isLoaded || !center) return;
    const dist = 0.05;
    const minLat = center.lat - dist;
    const maxLat = center.lat + dist;
    const minLng = center.lng - dist;
    const maxLng = center.lng + dist;
    const q = `
      [out:json];
      (node["highway"="crossing"](${minLat},${minLng},${maxLat},${maxLng}););
      out body;
    `;
    (async () => {
      try {
        const resp = await fetch(
          `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(q)}`
        );
        const data = await resp.json();
        const nodes = [];
        if (data.elements) {
          data.elements.forEach((el) => {
            if (el.type === "node") nodes.push({ lat: el.lat, lng: el.lon });
          });
        }
        setCrosswalkNodes(nodes);
      } catch (err) {
        console.error("fetchCrosswalks failed:", err);
      }
    })();
  }, [isLoaded, center]);

  useEffect(() => {
    if (!selectedDriver?.id) {
      setDriverParcels([]);
      return;
    }
    const parcelsRef = collection(db, "parcels");
    const qy = query(parcelsRef, where("driverUid", "==", selectedDriver.id));
    const unsub = onCollectionSnapshot(
      qy,
      (snapshot) => {
        const docs = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setDriverParcels(docs);
      },
      (err) => console.error("onSnapshot(parcels) error:", err)
    );
    return () => unsub();
  }, [selectedDriver]);

  useEffect(() => {
    if (!isLoaded || !driverPos || driverParcels.length === 0) {
      setDirections(null);
      return;
    }
    try {
      const origin = driverPos;
      const validParcels = driverParcels
        .filter(
          (p) =>
            p.destination &&
            typeof p.destination.latitude === "number" &&
            typeof p.destination.longitude === "number"
        )
        .map((p) => ({
          ...p,
          distance: getDistance(
            origin.lat,
            origin.lng,
            p.destination.latitude,
            p.destination.longitude
          ),
        }))
        .sort((a, b) => a.distance - b.distance);

      if (validParcels.length === 0) {
        setDirections(null);
        return;
      }

      const waypoints = validParcels.slice(0, -1).map((parcel) => ({
        location: { lat: parcel.destination.latitude, lng: parcel.destination.longitude },
        stopover: true,
      }));

      const destinationParcel = validParcels[validParcels.length - 1];
      const destination = {
        lat: destinationParcel.destination.latitude,
        lng: destinationParcel.destination.longitude,
      };

      const directionsService = new window.google.maps.DirectionsService();
      directionsService.route(
        {
          origin,
          destination,
          waypoints,
          travelMode: window.google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false,
          drivingOptions: { departureTime: new Date() },
        },
        (result, status) => {
          if (status === window.google.maps.DirectionsStatus.OK) {
            setDirections(result);
          } else {
            console.error("DirectionsService.route status:", status);
            setDirections(null);
          }
        }
      );
    } catch (err) {
      console.error("buildDirections failed:", err);
      setDirections(null);
    }
  }, [isLoaded, driverPos, driverParcels]);

  useEffect(() => {
    if (!mapRef?.current || !driverPos) return;
    const now = Date.now();
    if (!zoomLockedRef.current) {
      try {
        mapRef.current.setCenter(driverPos);
        mapRef.current.setZoom(17);
        zoomLockedRef.current = true;
        lastPanTsRef.current = now;
      } catch (err) {
        console.error("initial map center/zoom failed:", err);
      }
      return;
    }
    if (now - lastPanTsRef.current >= UPDATE_INTERVAL_MS) {
      lastPanTsRef.current = now;
      try {
        mapRef.current.panTo(driverPos);
      } catch (err) {
        console.error("map panTo failed:", err);
      }
    }
  }, [driverPos, mapRef]);

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) ** 2 +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const handleMapClick = (e) => {
    if (!addingSlowdown || slowdownPin) return;
    setSlowdownPin({ lat: e.latLng.lat(), lng: e.latLng.lng() });
  };

  if (!isLoaded) {
    return <div style={{ textAlign: "center", marginTop: "2rem" }}>Loading map...</div>;
  }

  return (
    <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          bottom: 16,
          right: 16,
          display: "flex",
          flexDirection: "column",
          gap: 2,
          p: 2,
          bgcolor: "white",
          borderRadius: 2,
          boxShadow: 3,
          zIndex: 1000,
        }}
      >
        <Tooltip title={showTraffic ? "Hide Traffic" : "Show Traffic"}>
          <Fab size="small" color="primary" onClick={() => setShowTraffic((prev) => !prev)}>
            <TrafficIcon />
          </Fab>
        </Tooltip>

        {!addingSlowdown && !editMode && (
          <Tooltip title="Add Slowdown">
            <Fab
              size="small"
              color="success"
              onClick={() => {
                setAddingSlowdown(true);
                setSlowdownPin(null);
                setSpeedLimit("");
                setSlowdownRadius("0");
                setCategory("Slowdown");
                setSelectedIndex(null);
              }}
            >
              <AddIcon />
            </Fab>
          </Tooltip>
        )}

        {(addingSlowdown || editMode) && (
          <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
            <TextField
              select
              label="Category"
              value={category}
              size="small"
              onChange={(e) => setCategory(e.target.value)}
            >
              <MenuItem value="Slowdown">Slowdown</MenuItem>
              <MenuItem value="Church">Church</MenuItem>
              <MenuItem value="Crosswalk">Crosswalk</MenuItem>
              <MenuItem value="Schools">Schools</MenuItem>
            </TextField>

            <TextField
              type="number"
              label="Speed Limit (km/h)"
              size="small"
              value={speedLimit}
              onChange={(e) => setSpeedLimit(e.target.value)}
            />

            <TextField
              type="number"
              label="Radius (m)"
              size="small"
              value={slowdownRadius}
              onChange={(e) => setSlowdownRadius(e.target.value)}
            />

            <Box sx={{ display: "flex", gap: 1, justifyContent: "flex-end" }}>
              <Fab
                size="small"
                color="primary"
                onClick={async () => {
                  if (!slowdownPin) return;
                  try {
                    const branchRef = doc(db, "branches", branchId);
                    const snapshot = await getDoc(branchRef);
                    const currentSlowdowns = snapshot.exists() ? snapshot.data().slowdowns || [] : [];
                    if (editMode && selectedIndex !== null) {
                      currentSlowdowns[selectedIndex] = {
                        location: slowdownPin,
                        speedLimit,
                        radius: parseInt(slowdownRadius),
                        category,
                      };
                    } else {
                      currentSlowdowns.push({
                        location: slowdownPin,
                        speedLimit,
                        radius: parseInt(slowdownRadius),
                        category,
                      });
                    }
                    await updateDoc(branchRef, { slowdowns: currentSlowdowns });
                    setAddingSlowdown(false);
                    setEditMode(false);
                    setSlowdownPin(null);
                    setSpeedLimit("");
                    setSlowdownRadius("0");
                    setCategory("Slowdown");
                    setSelectedIndex(null);
                  } catch (err) {
                    console.error("save slowdown failed:", err);
                  }
                }}
              >
                <SaveIcon />
              </Fab>

              {editMode && (
                <Fab
                  size="small"
                  color="error"
                  onClick={async () => {
                    if (selectedIndex === null) return;
                    try {
                      const branchRef = doc(db, "branches", branchId);
                      const snapshot = await getDoc(branchRef);
                      let currentSlowdowns = snapshot.exists() ? snapshot.data().slowdowns || [] : [];
                      currentSlowdowns.splice(selectedIndex, 1);
                      await updateDoc(branchRef, { slowdowns: currentSlowdowns });
                      setAddingSlowdown(false);
                      setEditMode(false);
                      setSlowdownPin(null);
                      setSpeedLimit("");
                      setSlowdownRadius("0");
                      setCategory("Slowdown");
                      setSelectedIndex(null);
                    } catch (err) {
                      console.error("delete slowdown failed:", err);
                    }
                  }}
                >
                  <DeleteIcon />
                </Fab>
              )}

              <Fab
                size="small"
                color="default"
                onClick={() => {
                  setAddingSlowdown(false);
                  setEditMode(false);
                  setSlowdownPin(null);
                  setSpeedLimit("");
                  setSlowdownRadius("0");
                  setCategory("Slowdown");
                  setSelectedIndex(null);
                }}
              >
                <CloseIcon />
              </Fab>
            </Box>
          </Box>
        )}
      </Box>

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "100%" }}
        center={center}
        zoom={16}
        onClick={handleMapClick}
        onLoad={(map) => (mapRef.current = map)}
        options={{
          streetViewControl: false,
          fullscreenControl: false,
          zoomControl: false,
        }}
      >
        {showTraffic && <TrafficLayer />}

        {driverPos && (
          <Marker
            position={driverPos}
            icon={{
              path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
              scale: 5,
              fillColor: "#00b2e1",
              fillOpacity: 1,
              strokeWeight: 1,
              rotation: driverHeading || 0,
            }}
            zIndex={9999}
          />
        )}

        {!driverPos && (
          <Marker
            position={center}
            icon={{ url: deliverLogo, scaledSize: new window.google.maps.Size(40, 40) }}
          />
        )}

        {existingSlowdowns.map((zone, idx) => {
          if ((editMode && selectedIndex === idx) || addingSlowdown) return null;
          return (
            <Circle
              key={`slowdown-${idx}`}
              center={zone.location}
              radius={zone.radius}
              options={{
                strokeColor: CATEGORY_COLORS[zone.category] || "#9e9e9e",
                fillColor: CATEGORY_COLORS[zone.category] || "#9e9e9e",
                fillOpacity: 0.3,
                strokeWeight: 2,
                clickable: true,
                zIndex: 5,
              }}
              onClick={() => {
                setSelectedIndex(idx);
                setSlowdownPin(zone.location);
                setSpeedLimit(zone.speedLimit);
                setSlowdownRadius(zone.radius);
                setCategory(zone.category);
                setEditMode(true);
              }}
            />
          );
        })}

        {crosswalkNodes.map((node, idx) => {
          const isSaved = existingSlowdowns.some(
            (zone) =>
              zone.category === "Crosswalk" &&
              Math.abs(zone.location.lat - node.lat) < 0.00001 &&
              Math.abs(zone.location.lng - node.lng) < 0.00001
          );
          if (isSaved) return null;
          return (
            <Circle
              key={`crosswalk-${idx}`}
              center={node}
              radius={15}
              options={{
                strokeColor: CATEGORY_COLORS.Crosswalk,
                fillColor: CATEGORY_COLORS.Crosswalk,
                fillOpacity: 0.15,
                strokeWeight: 2,
                clickable: true,
                zIndex: 3,
              }}
              onClick={() => {
                setSlowdownPin(node);
                setCategory("Crosswalk");
                setSpeedLimit("10");
                setSlowdownRadius("15");
                setAddingSlowdown(true);
              }}
            />
          );
        })}

        {slowdownPin && (addingSlowdown || editMode) && (
          <>
            <Marker
              position={slowdownPin}
              draggable
              onDragEnd={(e) => setSlowdownPin({ lat: e.latLng.lat(), lng: e.latLng.lng() })}
              icon={{ url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png" }}
            />
            <Circle
              center={slowdownPin}
              radius={parseInt(slowdownRadius)}
              options={{
                strokeColor: CATEGORY_COLORS[category] || "#9e9e9e",
                fillColor: CATEGORY_COLORS[category] || "#9e9e9e",
                fillOpacity: 0.3,
                strokeWeight: 2,
                clickable: false,
                zIndex: 10,
              }}
            />
          </>
        )}

        {directions && (
          <DirectionsRenderer
            directions={directions}
            options={{
              suppressMarkers: true,
              polylineOptions: { strokeColor: "#00b2e1", strokeOpacity: 0.8, strokeWeight: 5 },
            }}
          />
        )}

        {[...driverParcels]
          .filter(
            (p) =>
              p.destination &&
              typeof p.destination.latitude === "number" &&
              typeof p.destination.longitude === "number"
          )
          .map((parcel, idx) => (
            <Marker
              key={`parcel-marker-${parcel.id || idx}`}
              position={{ lat: parcel.destination.latitude, lng: parcel.destination.longitude }}
              label={(idx + 1).toString()}
              onClick={() =>
                window.alert(
                  `Parcel: ${parcel.packageId}\nRecipient: ${parcel.recipient}\nAddress: ${parcel.street} ${parcel.barangay} ${parcel.municipality} ${parcel.province}`
                )
              }
            />
          ))}
      </GoogleMap>
    </Box>
  );
}
