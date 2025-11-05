import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Circle,
  useJsApiLoader,
  TrafficLayer,
  DirectionsRenderer,
  Autocomplete as GmapAutocomplete,
} from "@react-google-maps/api";
import { Box, Fab, Tooltip, TextField, MenuItem } from "@mui/material";
import {
  Traffic as TrafficIcon,
  Add as AddIcon,
  Save as SaveIcon,
  Delete as DeleteIcon,
  Close as CloseIcon,
  Search as SearchIcon,
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
  const [userLocation, setUserLocation] = useState(null);
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
  const [driverSpeed, setDriverSpeed] = useState(0);
  const [hasConnection, setHasConnection] = useState(true);
  const [searchText, setSearchText] = useState("");
  const autocompleteRef = useRef(null);

  const prevDriverPosRef = useRef(null);
  const prevSampleTsRef = useRef(null);
  const speedEmaRef = useRef(0);
  const posWindowRef = useRef([]);
  const stopHoldUntilRef = useRef(0);
  const lastLocationUpdateRef = useRef(null);

  const lastPanTsRef = useRef(0);
  const zoomLockedRef = useRef(false);
  const lastHeadingDegRef = useRef(0);
  const lastHeadingUpdateTsRef = useRef(0);
  const lastGeoUpdateTsRef = useRef(0);

  const STATIONARY_WINDOW_MS = 3000;
  const STATIONARY_DIST_M = 6;
  const ZERO_HOLD_MS = 2000;

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
        const userLoc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setUserLocation(userLoc);
        if (!selectedDriver?.id) {
          setCenter(userLoc);
        }
      },
      (err) => console.warn("geolocation watch error:", err),
      opts
    );
    return () => {
      if (watchId != null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isLoaded, selectedDriver?.id]);

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
    setDriverPos(null);
    setDriverHeading(0);
    setDriverSpeed(0);
    setDirections(null);
    setDriverParcels([]);
    setHasConnection(true);
    prevDriverPosRef.current = null;
    prevSampleTsRef.current = null;
    speedEmaRef.current = 0;
    posWindowRef.current = [];
    stopHoldUntilRef.current = 0;
    lastHeadingDegRef.current = 0;
    lastHeadingUpdateTsRef.current = 0;
    zoomLockedRef.current = false;
    lastLocationUpdateRef.current = null;

    if (!selectedDriver?.id) {
      if (userLocation) {
        setCenter(userLocation);
      }
      return;
    }
    const unsub = onSnapshot(
      doc(db, "users", selectedDriver.id),
      (snap) => {
        if (!snap.exists()) return;
        const d = snap.data();

        let loc = null;
        if (d?.loc && typeof d.loc.lat === "number" && typeof d.loc.lng === "number") {
          loc = {
            lat: d.loc.lat,
            lng: d.loc.lng,
            heading: d.loc.heading,
            speed: d.loc.speed,
            ts: typeof d.loc.ts === "number" ? d.loc.ts : null,
          };
        } else if (
          d?.location &&
          typeof d.location.latitude === "number" &&
          typeof d.location.longitude === "number"
        ) {
          loc = {
            lat: d.location.latitude,
            lng: d.location.longitude,
            heading: d.heading,
            speed: d.location.speedKmh ?? d.speed,
            ts: d.location.ts ?? null,
          };
        }

        if (!loc) return;

        setHasConnection(true);
        lastLocationUpdateRef.current = Date.now();

        const current = { lat: loc.lat, lng: loc.lng };
        setDriverPos(current);
        setCenter((c) => c ?? current);

        const nowTs = Date.now();
        let nextHeading = null;
        if (typeof loc.heading === "number" && Number.isFinite(loc.heading)) {
          nextHeading = normalizeDeg(loc.heading);
        } else if (prevDriverPosRef.current) {
          const movedM = haversineMeters(prevDriverPosRef.current, current);
          if (movedM > MOVING_THRESHOLD_M) {
            nextHeading = bearingBetween(prevDriverPosRef.current, current);
          }
        }

        if (nextHeading != null) {
          lastHeadingDegRef.current = nextHeading;
          setDriverHeading(nextHeading);
          lastHeadingUpdateTsRef.current = nowTs;
        } else {
          setDriverHeading(lastHeadingDegRef.current || 0);
        }

        let kmh = Number.isFinite(loc.speed) ? Number(loc.speed) : NaN;

        const sampleTs = typeof loc.ts === "number" ? loc.ts : nowTs;
        posWindowRef.current.push({ ts: sampleTs, ...current });
        const cutoff = sampleTs - STATIONARY_WINDOW_MS;
        posWindowRef.current = posWindowRef.current.filter((p) => p.ts >= cutoff);

        if (prevDriverPosRef.current) {
          const distM = haversineMeters(prevDriverPosRef.current, current);
          if (distM < 3) {
            kmh = 0;
          }
        }

        if (!Number.isFinite(kmh)) {
          if (prevDriverPosRef.current && prevSampleTsRef.current) {
            const distM = haversineMeters(prevDriverPosRef.current, current);
            const dt = Math.max(0.5, (sampleTs - prevSampleTsRef.current) / 1000);
            const mps = distM > 5 && dt > 0.8 ? distM / dt : 0;
            kmh = mps * 3.6;
          } else {
            kmh = 0;
          }
        }

        if (posWindowRef.current.length >= 2) {
          const first = posWindowRef.current[0];
          const last = posWindowRef.current[posWindowRef.current.length - 1];
          const dM = haversineMeters(first, last);
          if (dM < STATIONARY_DIST_M) {
            kmh = 0;
            speedEmaRef.current = 0;
          }
        }

        if (kmh > 0) {
          const alpha = 0.25;
          const mpsRaw = Math.max(0, kmh / 3.6);
          speedEmaRef.current = alpha * mpsRaw + (1 - alpha) * (speedEmaRef.current || 0);
          kmh = speedEmaRef.current * 3.6;
        } else {
          speedEmaRef.current = 0;
        }

        if (kmh < 3) {
          kmh = 0;
          speedEmaRef.current = 0;
        }

        if (kmh === 0) stopHoldUntilRef.current = sampleTs + ZERO_HOLD_MS;
        if (sampleTs < (stopHoldUntilRef.current || 0)) kmh = 0;

        setDriverSpeed(Math.round(kmh));

        prevDriverPosRef.current = current;
        prevSampleTsRef.current = sampleTs;
      },
      (err) => console.error("onSnapshot(user) error:", err)
    );
    return () => unsub();
  }, [selectedDriver]);

  useEffect(() => {
    if (!selectedDriver || !driverPos) return;

    const checkInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastUpdate = now - (lastLocationUpdateRef.current || now);

      if (timeSinceLastUpdate > 10000) {
        setHasConnection(false);
      }
    }, 2000);

    return () => clearInterval(checkInterval);
  }, [selectedDriver, driverPos]);

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
    setDriverParcels([]);

    if (!selectedDriver) {
      return;
    }
    const uidCandidates = [selectedDriver.id, selectedDriver.uid]
      .map((v) => (typeof v === "string" ? v.trim() : v))
      .filter(Boolean);
    const parcelsRef = collection(db, "parcels");
    const qy =
      uidCandidates.length === 1
        ? query(
            parcelsRef,
            where("driverUid", "==", uidCandidates[0]),
            where("status", "not-in", ["Delivered", "Cancelled"])
          )
        : query(
            parcelsRef,
            where("driverUid", "in", uidCandidates),
            where("status", "not-in", ["Delivered", "Cancelled"])
          );
    const unsub = onCollectionSnapshot(
      qy,
      (snapshot) => {
        const docs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDriverParcels(docs);
      },
      (err) => console.error("onSnapshot(parcels) error:", err)
    );
    return () => unsub();
  }, [selectedDriver?.id, selectedDriver?.uid]);

  useEffect(() => {
    if (!isLoaded || !driverPos || driverParcels.length === 0) {
      setDirections(null);
      return;
    }
    try {
      const origin = driverPos;
      const validParcels = driverParcels
        .filter((p) => {
          if (p.destination && 
              typeof p.destination.latitude === "number" && 
              typeof p.destination.longitude === "number") {
            return true;
          }
          if (!p.destination || 
              p.destination.latitude === null || 
              p.destination.longitude === null) {
            console.warn("Parcel with null destination:", p.id);
            return false;
          }
          return false;
        })
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
    if (!mapRef?.current || !driverPos || !selectedDriver?.id) return;
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
  }, [driverPos, mapRef, selectedDriver?.id]);

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

  const safePanZoom = (point) => {
    const map = mapRef?.current;
    if (!map) return;
    if (typeof map.panTo === "function") map.panTo(point);
    if (typeof map.setZoom === "function") map.setZoom(17);
  };

  const handlePlaceChanged = () => {
    const ac = autocompleteRef.current;
    if (!ac) return;
    const place = ac.getPlace?.();
    const loc = place?.geometry?.location;
    if (loc) {
      const point = { lat: loc.lat(), lng: loc.lng() };
      safePanZoom(point);
    }
  };

  const geocodeSearch = (query) => {
    if (!isLoaded || !query?.trim()) return;
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ address: query }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        const loc = results[0].geometry.location;
        const point = { lat: loc.lat(), lng: loc.lng() };
        safePanZoom(point);
      } else {
        console.warn("Geocode failed:", status);
      }
    });
  };

  if (!isLoaded) {
    return <div style={{ textAlign: "center", marginTop: "2rem" }}>Loading map...</div>;
  }

  return (
    <Box sx={{ width: "100%", height: "100%", position: "relative" }}>
      <Box
        sx={{
          position: "absolute",
          top: 16,
          left: "12%",
          display: "flex",
          gap: 1,
          zIndex: 1200,
          width: "min(560px, 90vw)",
          alignItems: "center",
        }}
      >
        <GmapAutocomplete
          onLoad={(ac) => (autocompleteRef.current = ac)}
          onPlaceChanged={handlePlaceChanged}
          options={{
            fields: ["geometry", "name", "formatted_address"],
            componentRestrictions: { country: ["ph"] },
          }}
        >
          <TextField
            fullWidth
            size="small"
            label="Search place"
            placeholder="Search place or address"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") geocodeSearch(searchText);
            }}
            sx={{ bgcolor: "white", borderRadius: 1 }}
          />
        </GmapAutocomplete>

        <Fab size="small" color="primary" onClick={() => geocodeSearch(searchText)}>
          <SearchIcon />
        </Fab>
        {searchText && (
          <Fab size="small" color="default" onClick={() => setSearchText("")}>
            <CloseIcon />
          </Fab>
        )}
      </Box>

      {driverPos ? (
        <Box
          sx={{
            position: "absolute",
            top: 16,
            right: "50%",
            zIndex: 1200,
            bgcolor: "#fff",
            borderRadius: 2,
            px: 2,
            py: 0.75,
            boxShadow: 3,
            fontWeight: 700,
            color: !hasConnection ? "#f21b3f" : (driverSpeed > 0 ? "#29bf12" : "#7f8c8d"),
            fontSize: "1.5rem"
          }}
        >
          {!hasConnection ? "No Connection" : `${driverSpeed} km/h`}
        </Box>
      ) : null}

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
            <TextField select label="Category" value={category} size="small" onChange={(e) => setCategory(e.target.value)}>
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
        
        {!selectedDriver?.id && userLocation && (
          <Marker
            position={userLocation}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: "#4285F4",
              fillOpacity: 1,
              strokeColor: "white",
              strokeWeight: 2,
            }}
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
          .map((parcel, idx) => {
            const hasValidDestination = 
              parcel.destination &&
              typeof parcel.destination.latitude === "number" &&
              typeof parcel.destination.longitude === "number";
            
            if (!hasValidDestination) {
              console.warn("Skipping parcel with null destination:", parcel.id);
              return null;
            }
            
            return (
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
            );
          })
          .filter(Boolean)
        }
      </GoogleMap>
    </Box>
  );
}
