import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  useJsApiLoader,
  TrafficLayer,
  InfoWindow,
} from "@react-google-maps/api";
import deliverLogo from "/src/assets/box.svg";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
} from "firebase/firestore";
import { db } from "/src/firebaseConfig";

export default function MapComponent({ user }) {
  const [center, setCenter] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [slowdownPins, setSlowdownPins] = useState([]);
  const [crosswalks, setCrosswalks] = useState([]);
  const [crosswalkNodes, setCrosswalkNodes] = useState([]);
  const [showTraffic, setShowTraffic] = useState(true);
  const [addingSlowdown, setAddingSlowdown] = useState(false);
  const [existingSlowdowns, setExistingSlowdowns] = useState([]); // array of slowdowns
  const [slowdownPaths, setSlowdownPaths] = useState([]); // array of routes (roads) as lat/lng arrays
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [speedLimit, setSpeedLimit] = useState("");
  const [branchId, setBranchId] = useState(null);

  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places"],
  });

  // 1. Fetch branchId for the user
  useEffect(() => {
    if (!user) return;
    const fetchBranch = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.branchId) {
          setBranchId(data.branchId);
        }
      }
    };
    fetchBranch();
  }, [user]);

  // 2. Subscribe to branch document slowdowns
  useEffect(() => {
    if (!branchId) return;

    const branchDocRef = doc(db, "branches", branchId);

    const unsub = onSnapshot(branchDocRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        const arr = Array.isArray(data.slowdowns) ? data.slowdowns : [];
        setExistingSlowdowns(arr);
      } else {
        setExistingSlowdowns([]);
      }
    });

    return () => unsub();
  }, [branchId]);

  // 3. Generate route paths (road-following) whenever existingSlowdowns changes
  useEffect(() => {
    const getRoutePolyline = async (start, end) => {
      const directionsService = new window.google.maps.DirectionsService();
      return new Promise((resolve, reject) => {
        directionsService.route(
          {
            origin: start,
            destination: end,
            travelMode: window.google.maps.TravelMode.DRIVING,
          },
          (result, status) => {
            if (status === "OK" && result.routes.length > 0) {
              const path = result.routes[0].overview_path.map((pt) => ({
                lat: pt.lat(),
                lng: pt.lng(),
              }));
              resolve(path);
            } else {
              // fallback: straight line if routing fails
              resolve([start, end]);
            }
          }
        );
      });
    };

    const buildPaths = async () => {
      if (!existingSlowdowns || existingSlowdowns.length === 0) {
        setSlowdownPaths([]);
        return;
      }

      const promises = existingSlowdowns.map((zone) =>
        getRoutePolyline(zone.start, zone.end)
      );
      const results = await Promise.all(promises);
      setSlowdownPaths(results);
    };

    // Only call if Google Maps is loaded
    if (isLoaded) {
      buildPaths();
    }
  }, [existingSlowdowns, isLoaded]);

  // 4. Get user location
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingLocation(false);
      },
      () => {
        // default fallback
        setCenter({ lat: 14.6091, lng: 121.0223 });
        setLoadingLocation(false);
      }
    );
  }, []);

  // 5. Fetch crosswalks via Overpass (this part unchanged)
  useEffect(() => {
    if (!center) return;

    const fetchCrosswalks = async () => {
      const dist = 0.005;
      const minLat = center.lat - dist;
      const maxLat = center.lat + dist;
      const minLng = center.lng - dist;
      const maxLng = center.lng + dist;

      const crosswalkQuery = `
        [out:json];
        (
          way["highway"="crossing"](${minLat},${minLng},${maxLat},${maxLng});
          node["highway"="crossing"](${minLat},${minLng},${maxLat},${maxLng});
        );
        out body;
        >;
        out skel qt;
      `;

      try {
        const resp = await fetch(
          `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
            crosswalkQuery
          )}`
        );
        const data = await resp.json();
        const ways = [];
        const nodes = [];
        if (data.elements) {
          data.elements.forEach((el) => {
            if (el.type === "way" && el.geometry) {
              ways.push(
                el.geometry.map((pt) => ({
                  lat: pt.lat,
                  lng: pt.lon,
                }))
              );
            } else if (el.type === "node") {
              nodes.push({ lat: el.lat, lng: el.lon });
            }
          });
        }
        setCrosswalks(ways);
        setCrosswalkNodes(nodes);
      } catch (err) {
        console.error("Failed to fetch crosswalks:", err);
      }
    };

    fetchCrosswalks();
  }, [center]);

  if (!isLoaded || loadingLocation || !center) {
    return (
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <p>Loading map...</p>
      </div>
    );
  }

  const handleMapClick = (e) => {
    if (editMode && selectedIndex !== null) {
      if (slowdownPins.length < 2) {
        const newPin = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
          label: slowdownPins.length === 0 ? "A" : "B",
        };
        setSlowdownPins((prev) => [...prev, newPin]);
      }
      return;
    }
    if (!addingSlowdown) return;
    if (slowdownPins.length >= 2) return;
    const newPin = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
      label: slowdownPins.length === 0 ? "A" : "B",
    };
    setSlowdownPins((prev) => [...prev, newPin]);
  };

  const saveSlowdown = async () => {
    if (!branchId || slowdownPins.length !== 2) return;

    const newSlowdown = {
      start: { lat: slowdownPins[0].lat, lng: slowdownPins[0].lng },
      end: { lat: slowdownPins[1].lat, lng: slowdownPins[1].lng },
      speedLimit: parseInt(speedLimit),
      createdAt: Date.now(),
    };

    try {
      const branchRef = doc(db, "branches", branchId);
      const branchSnap = await getDoc(branchRef);

      if (!branchSnap.exists()) {
        alert("Branch document not found.");
        return;
      }

      const branchData = branchSnap.data();
      const existing = Array.isArray(branchData.slowdowns)
        ? branchData.slowdowns
        : [];

      let updated;
      if (editMode && selectedIndex !== null && selectedIndex < existing.length) {
        updated = [...existing];
        updated[selectedIndex] = newSlowdown;
      } else {
        updated = [...existing, newSlowdown];
      }

      await updateDoc(branchRef, {
        slowdowns: updated,
      });

      // Reset UI
      setAddingSlowdown(false);
      setEditMode(false);
      setSlowdownPins([]);
      setSpeedLimit("");
      setSelectedIndex(null);
      alert("Slowdown saved!");
    } catch (err) {
      console.error("Failed to save slowdown:", err);
      alert("Error saving slowdown.");
    }
  };

  const deleteSlowdown = async () => {
    if (!branchId || selectedIndex === null) return;

    try {
      const branchRef = doc(db, "branches", branchId);
      const branchSnap = await getDoc(branchRef);
      if (!branchSnap.exists()) {
        alert("Branch document not found.");
        return;
      }
      const branchData = branchSnap.data();
      const existing = Array.isArray(branchData.slowdowns)
        ? branchData.slowdowns
        : [];

      if (selectedIndex < 0 || selectedIndex >= existing.length) {
        alert("Invalid index.");
        return;
      }

      const updated = existing.filter((_, idx) => idx !== selectedIndex);

      await updateDoc(branchRef, {
        slowdowns: updated,
      });

      setSelectedIndex(null);
      alert("Slowdown removed!");
    } catch (err) {
      console.error("Failed to delete slowdown:", err);
      alert("Error deleting slowdown.");
    }
  };

  const getMidpoint = (a, b) => ({
    lat: (a.lat + b.lat) / 2,
    lng: (a.lng + b.lng) / 2,
  });

  return (
    <div style={{ position: "relative" }}>
      {/* Controls UI */}
      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          backgroundColor: "white",
          padding: "6px 10px",
          borderRadius: "8px",
          boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
          userSelect: "none",
          display: "flex",
          gap: "8px",
          flexWrap: "wrap",
        }}
      >
        <button onClick={() => setShowTraffic((prev) => !prev)}>
          {showTraffic ? "Hide Traffic" : "Show Traffic"}
        </button>

        {!addingSlowdown && !editMode && (
          <button
            onClick={() => {
              setAddingSlowdown(true);
              setSlowdownPins([]);
            }}
            style={{ backgroundColor: "#2196F3", color: "white" }}
          >
            Add Slowdown
          </button>
        )}

        {(addingSlowdown || editMode) && (
          <>
            <input
              type="number"
              placeholder="Speed Limit (km/h)"
              value={speedLimit}
              onChange={(e) => setSpeedLimit(e.target.value)}
              style={{
                width: "140px",
                padding: "4px 8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
              }}
            />
            <button
              onClick={() => {
                setAddingSlowdown(false);
                setEditMode(false);
                setSlowdownPins([]);
                setSpeedLimit("");
                setSelectedIndex(null);
              }}
              style={{ backgroundColor: "#f44336", color: "white" }}
            >
              Cancel
            </button>
            <button
              onClick={saveSlowdown}
              disabled={slowdownPins.length !== 2 || !speedLimit}
              style={{
                backgroundColor:
                  slowdownPins.length === 2 && speedLimit
                    ? "#4caf50"
                    : "#9e9e9e",
                color: "white",
                cursor:
                  slowdownPins.length === 2 && speedLimit
                    ? "pointer"
                    : "not-allowed",
              }}
            >
              Save Slowdown
            </button>
          </>
        )}
      </div>

      <GoogleMap
        onLoad={(map) => (mapRef.current = map)}
        center={center}
        zoom={14}
        mapContainerStyle={{
          width: "100%",
          height: "90vh",
          borderRadius: "12px",
        }}
        options={{
          streetViewControl: false,
          fullscreenControl: false,
          mapTypeControl: true,
        }}
        onClick={handleMapClick}
      >
        {showTraffic && <TrafficLayer autoUpdate />}

        <Marker
          position={center}
          icon={{
            url: deliverLogo,
            scaledSize: new window.google.maps.Size(40, 40),
          }}
          label={{
            text: "You",
            color: "#2196F3",
            fontWeight: "bold",
          }}
        />

        {slowdownPins.map((pin) => (
          <Marker
            key={`pin-${pin.label}`}
            position={{ lat: pin.lat, lng: pin.lng }}
            label={{
              text: pin.label,
              color: pin.label === "A" ? "blue" : "red",
              fontWeight: "bold",
            }}
            icon={{
              path: window.google.maps.SymbolPath.CIRCLE,
              scale: 8,
              fillColor: pin.label === "A" ? "blue" : "red",
              fillOpacity: 0.9,
              strokeWeight: 2,
              strokeColor: "#fff",
            }}
          />
        ))}

        {existingSlowdowns.map((zone, idx) => {
          const speed = zone.speedLimit ?? 0;
          let color = "#9e9e9e";
          if (speed <= 20) color = "#e53935";
          else if (speed <= 40) color = "#fb8c00";
          else if (speed <= 60) color = "#fdd835";
          else color = "#43a047";

          const path = slowdownPaths[idx] || [zone.start, zone.end];

          return (
            <React.Fragment key={`slowdown-${idx}`}>
              <Polyline
                path={path}
                options={{
                  strokeColor: color,
                  strokeOpacity: 0.9,
                  strokeWeight: 5,
                }}
                onClick={() => {
                  setSelectedIndex(idx);
                  setSlowdownPins([
                    { ...zone.start, label: "A" },
                    { ...zone.end, label: "B" },
                  ]);
                  setSpeedLimit(zone.speedLimit?.toString() || "");
                  setEditMode(true);
                }}
              />

              <Marker
                position={zone.start}
                label={{ text: "A", color: "blue", fontWeight: "bold" }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "blue",
                  fillOpacity: 0.9,
                  strokeWeight: 2,
                  strokeColor: "#fff",
                }}
              />
              <Marker
                position={zone.end}
                label={{ text: "B", color: "red", fontWeight: "bold" }}
                icon={{
                  path: window.google.maps.SymbolPath.CIRCLE,
                  scale: 8,
                  fillColor: "red",
                  fillOpacity: 0.9,
                  strokeWeight: 2,
                  strokeColor: "#fff",
                }}
              />

              <Marker
                position={getMidpoint(zone.start, zone.end)}
                icon={{ path: window.google.maps.SymbolPath.CIRCLE, scale: 0 }}
                label={{
                  text: `${zone.speedLimit ?? "?"} km/h`,
                  color: "#000",
                  fontWeight: "bold",
                  fontSize: "14px",
                }}
              />
            </React.Fragment>
          );
        })}

        {crosswalks.map((path, idx) => (
          <Polyline
            key={`cw-way-${idx}`}
            path={path}
            options={{
              strokeColor: "#00bcd4",
              strokeOpacity: 1,
              strokeWeight: 5,
            }}
          />
        ))}

        {crosswalkNodes.map((pos, idx) => {
          const isEven = idx % 2 === 0;
          const label = isEven ? "A" : "B";
          const color = isEven ? "blue" : "red";

          return (
            <Marker
              key={`cw-node-${idx}`}
              position={pos}
              label={{
                text: label,
                color,
                fontWeight: "bold",
              }}
              icon={{
                path: window.google.maps.SymbolPath.CIRCLE,
                scale: 8,
                fillColor: color,
                fillOpacity: 0.9,
                strokeWeight: 2,
                strokeColor: "#fff",
              }}
            />
          );
        })}

        {selectedIndex !== null && (
          <InfoWindow
            position={existingSlowdowns[selectedIndex].start}
            onCloseClick={() => {
              setSelectedIndex(null);
              setEditMode(false);
            }}
          >
            <div>
              <h4 style={{ margin: "0 0 4px 0" }}>Slowdown Zone</h4>
              <p style={{ margin: 0 }}>
                Start:{" "}
                {existingSlowdowns[selectedIndex].start.lat.toFixed(5)},{" "}
                {existingSlowdowns[selectedIndex].start.lng.toFixed(5)}
                <br />
                End:{" "}
                {existingSlowdowns[selectedIndex].end.lat.toFixed(5)},{" "}
                {existingSlowdowns[selectedIndex].end.lng.toFixed(5)}
              </p>
              <p
                style={{
                  marginTop: "4px",
                  fontSize: "0.85rem",
                  color: "#666",
                }}
              >
                Speed: {existingSlowdowns[selectedIndex].speedLimit ?? "?"} km/h
                <br />
                Created At:{" "}
                {new Date(
                  existingSlowdowns[selectedIndex].createdAt
                ).toLocaleString()}
              </p>
              <button
                onClick={deleteSlowdown}
                style={{
                  backgroundColor: "#f44336",
                  color: "white",
                  marginTop: "6px",
                  padding: "4px 8px",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                }}
              >
                Delete
              </button>
            </div>
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
