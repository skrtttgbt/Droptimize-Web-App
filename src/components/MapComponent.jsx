import React, { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  Circle,
  useJsApiLoader,
  TrafficLayer,
  DirectionsRenderer,
} from "@react-google-maps/api";
import deliverLogo from "/src/assets/box.svg";
import {
  doc,
  getDoc,
  onSnapshot,
  updateDoc,
  collection,
  query,
  where,
  onSnapshot as onCollectionSnapshot,
} from "firebase/firestore";
import { db } from "/src/firebaseConfig";

const CATEGORY_COLORS = {
  Church: "#4caf50",    // green
  Crosswalk: "#2196F3", // blue
  Schools: "#ff9800",   // orange
  Slowdown: "#9e9e9e",  // grey default
};

export default function MapComponent({ user, selectedDriver }) {
  const driverMarkerRef = useRef(null);
  const [center, setCenter] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [showTraffic, setShowTraffic] = useState(true);
  const [slowdownPin, setSlowdownPin] = useState(null);
  const [existingSlowdowns, setExistingSlowdowns] = useState([]);
  const [crosswalkNodes, setCrosswalkNodes] = useState([]);
  const [addingSlowdown, setAddingSlowdown] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [speedLimit, setSpeedLimit] = useState("");
  const [slowdownRadius, setSlowdownRadius] = useState("0");
  const [category, setCategory] = useState("Slowdown");
  const [branchId, setBranchId] = useState(null);
  const mapRef = useRef(null);
  const [directions, setDirections] = useState(null);
  const [driverHeading, setDriverHeading] = useState(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
    libraries: ["places", "geometry"],
  });

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

  useEffect(() => {
    if (!mapRef.current || !isLoaded) return;

    if (driverMarkerRef.current) {
      driverMarkerRef.current.setMap(null);
    }

    driverMarkerRef.current = new window.google.maps.Marker({
      map: mapRef.current,
      icon: {
        path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
        scale: 5,
        fillColor: "#00b2e1",
        fillOpacity: 1,
        strokeWeight: 1,
        rotation: 0,
      },
      title: "Driver Location",
    });

    return () => {
      if (driverMarkerRef.current) {
        driverMarkerRef.current.setMap(null);
        driverMarkerRef.current = null;
      }
    };
  }, [isLoaded, mapRef.current]);

  useEffect(() => {
    if (!driverMarkerRef.current || !selectedDriver?.location || driverHeading === null) return;

    const marker = driverMarkerRef.current;

    const newPos = new window.google.maps.LatLng(
      selectedDriver.location.latitude,
      selectedDriver.location.longitude
    );

    let currentPos = marker.getPosition();
    if (!currentPos) currentPos = newPos;

    const currentRotation = marker.getIcon().rotation || 0;
    const targetRotation = driverHeading;

    const animationDuration = 1000;
    const frameRate = 60;
    const frameCount = (animationDuration / 1000) * frameRate;

    let frame = 0;

    const latStart = currentPos.lat();
    const lngStart = currentPos.lng();
    const latEnd = newPos.lat();
    const lngEnd = newPos.lng();


    function normalizeAngle(angle) {
      while (angle > 180) angle -= 360;
      while (angle < -180) angle += 360;
      return angle;
    }

    let startRotation = normalizeAngle(currentRotation);
    let endRotation = normalizeAngle(targetRotation);
    if (endRotation - startRotation > 180) endRotation -= 360;
    if (endRotation - startRotation < -180) endRotation += 360;

    function animate() {
      frame++;
      const progress = frame / frameCount;

      if (progress >= 1) {
        marker.setPosition(newPos);
        marker.setIcon({
          ...marker.getIcon(),
          rotation: targetRotation,
        });
        return;
      }
      const lat = latStart + (latEnd - latStart) * progress;
      const lng = lngStart + (lngEnd - lngStart) * progress;
      const rotation = startRotation + (endRotation - startRotation) * progress;

      marker.setPosition(new window.google.maps.LatLng(lat, lng));
      marker.setIcon({
        ...marker.getIcon(),
        rotation,
      });

      requestAnimationFrame(animate);
    }

    animate();
  }, [selectedDriver?.location, driverHeading]);

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

  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingLocation(false);
      },
      () => {
        alert("Geolocation failed or permission denied. Using default location.");
        return;
      }
    );
  }, []);

  useEffect(() => {
    if (!center) return;

    const fetchCrosswalks = async () => {
      const dist = 0.05;
      const minLat = center.lat - dist;
      const maxLat = center.lat + dist;
      const minLng = center.lng - dist;
      const maxLng = center.lng + dist;

      const crosswalkQuery = `
          [out:json];
          (
            node["highway"="crossing"](${minLat},${minLng},${maxLat},${maxLng});
          );
          out body;
        `;

      try {
        const resp = await fetch(
          `https://overpass-api.de/api/interpreter?data=${encodeURIComponent(
            crosswalkQuery
          )}`
        );
        const data = await resp.json();
        const nodes = [];
        if (data.elements) {
          data.elements.forEach((el) => {
            if (el.type === "node") {
              nodes.push({ lat: el.lat, lng: el.lon });
            }
          });
        }
        setCrosswalkNodes(nodes);
      } catch (err) {
        console.error("Failed to fetch crosswalks:", err);
      }
    };

    fetchCrosswalks();
  }, [center]);

  const [driverParcels, setDriverParcels] = useState([]);

  useEffect(() => {
    if (!selectedDriver) {
      setDriverParcels([]);
      return;
    }
    const parcelsRef = collection(db, "parcels");
    const q = query(parcelsRef, where("driverUid", "==", selectedDriver.id), where("status", "==", "Out for Delivery"));
    const unsub = onCollectionSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDriverParcels(docs);
    });
    return () => unsub();
  }, [selectedDriver]);

  useEffect(() => {
    if (
      !isLoaded ||
      !selectedDriver ||
      !selectedDriver.location ||
      driverParcels.length === 0
    ) {
      setDirections(null);
      return;
    }


    const origin = {
      lat: selectedDriver.location.latitude,
      lng: selectedDriver.location.longitude,
    };

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
      location: {
        lat: parcel.destination.latitude,
        lng: parcel.destination.longitude,
      },
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
        drivingOptions: {
          departureTime: new Date(),
        },
      },
      (result, status) => {
        if (status === window.google.maps.DirectionsStatus.OK) {
          setDirections(result);
        } else {
          console.error("Directions request failed:", status);
          setDirections(null);
        }
      }
    );
    if (validParcels.length > 0) {
      const nextStop = {
        lat: validParcels[0].destination.latitude,
        lng: validParcels[0].destination.longitude,
      };

      const heading = window.google.maps.geometry.spherical.computeHeading(origin, nextStop);
      setDriverHeading(heading);
    }

  }, [isLoaded, selectedDriver, driverParcels]);

  const getDistance = (lat1, lng1, lat2, lng2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * (Math.PI / 180);
    const dLng = (lng2 - lng1) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
  if (!isLoaded || loadingLocation || !center) {
    return (
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <p>Loading map...</p>
      </div>
    );
  }
  const handleMapClick = (e) => {
    if (!addingSlowdown) return;
    if (slowdownPin) return;
    const newPin = {
      lat: e.latLng.lat(),
      lng: e.latLng.lng(),
    };
    setSlowdownPin(newPin);
  };
  const saveSlowdown = async () => {
    if (!branchId || !slowdownPin || !speedLimit || !slowdownRadius || !category) return;

    const newSlowdown = {
      location: { lat: slowdownPin.lat, lng: slowdownPin.lng },
      speedLimit: parseInt(speedLimit),
      radius: parseInt(slowdownRadius),
      category,
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
      setAddingSlowdown(false);
      setEditMode(false);
      setSlowdownPin(null);
      setSpeedLimit("");
      setSlowdownRadius("0");
      setCategory("Slowdown");
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

      // Reset UI
      setSelectedIndex(null);
      setEditMode(false);
      setSlowdownPin(null);
      setSpeedLimit("");
      setSlowdownRadius("0");
      setCategory("Slowdown");

      alert("Slowdown removed!");
    } catch (err) {
      console.error("Failed to delete slowdown:", err);
      alert("Error deleting slowdown.");
    }
  };

  const handleSlowdownClick = (zone, idx) => {
    setSelectedIndex(idx);
    setEditMode(true);
    setSlowdownPin(zone.location);
    setSpeedLimit(zone.speedLimit?.toString() || "");
    setSlowdownRadius(zone.radius?.toString() || "0");
    setCategory(zone.category || "Slowdown");
    setAddingSlowdown(false);
  };

  const handleCrosswalkClick = (pos) => {
    const foundIndex = existingSlowdowns.findIndex(
      (zone) =>
        zone.location.lat === pos.lat &&
        zone.location.lng === pos.lng &&
        zone.category === "Crosswalk"
    );

    if (foundIndex !== -1) {
      handleSlowdownClick(existingSlowdowns[foundIndex], foundIndex);
    } else {
      setSelectedIndex(null);
      setEditMode(false);
      setAddingSlowdown(true);
      setSlowdownPin(pos);
      setSpeedLimit("25");
      setSlowdownRadius("15");
      setCategory("Crosswalk");
    }
  };

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
          alignItems: "center",
        }}
      >
        <button onClick={() => setShowTraffic((prev) => !prev)}>
          {showTraffic ? "Hide Traffic" : "Show Traffic"}
        </button>

        {!addingSlowdown && !editMode && (
          <button
            onClick={() => {
              setAddingSlowdown(true);
              setSlowdownPin(null);
              setSpeedLimit("");
              setSlowdownRadius("0");
              setCategory("Slowdown");
              setSelectedIndex(null);
            }}
            style={{ backgroundColor: "#2196F3", color: "white" }}
          >
            Add Slowdown
          </button>
        )}

        {(addingSlowdown || editMode) && (
          <>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{
                padding: "4px 8px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                minWidth: "120px",
              }}
            >
              <option value="Slowdown">Slowdown</option>
              <option value="Church">Church</option>
              <option value="Crosswalk">Crosswalk</option>
              <option value="Schools">Schools</option>
            </select>

            <input
              type="number"
              placeholder="Speed Limit (km/h)"
              value={speedLimit}
              onChange={(e) => setSpeedLimit(e.target.value)}
              style={{ width: "140px", padding: "4px 8px" }}
            />

            <input
              type="number"
              placeholder="Radius (meters)"
              value={slowdownRadius}
              onChange={(e) => setSlowdownRadius(e.target.value)}
              min={category === "Crosswalk" ? 5 : 5}
              max={category === "Crosswalk" ? 0 : 1000}
              style={{ width: "110px", padding: "4px 8px" }}
              disabled={false}
            />

            <button
              onClick={saveSlowdown}
              style={{ backgroundColor: "#4caf50", color: "white" }}
            >
              Save
            </button>

            {editMode && (
              <button
                onClick={deleteSlowdown}
                style={{ backgroundColor: "#f44336", color: "white" }}
              >
                Delete
              </button>
            )}

            <button
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
              Cancel
            </button>
          </>
        )}
      </div>

      <GoogleMap
        mapContainerStyle={{ width: "100%", height: "80vh" }}
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
        <Marker
          position={center}
          icon={{
            url: deliverLogo,
            scaledSize: new window.google.maps.Size(40, 40),
          }}
        />
        {/* Existing Slowdowns */}
        {existingSlowdowns.map((zone, idx) => {
          if (editMode && selectedIndex === idx) {
            return null; 
          }
          if (addingSlowdown) {
            return null; 
          }
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
              onClick={() => handleSlowdownClick(zone, idx)}
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
              onClick={() => handleCrosswalkClick(node)}
            />
          );
        })}
        {slowdownPin && (addingSlowdown || editMode) && (
          <>
            <Marker
              position={slowdownPin}
              draggable={true}
              onDragEnd={(e) =>
                setSlowdownPin({ lat: e.latLng.lat(), lng: e.latLng.lng() })
              }
              icon={{
                url: "https://maps.google.com/mapfiles/ms/icons/red-dot.png",
              }}
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
              polylineOptions: {
                strokeColor: "#00b2e1",
                strokeOpacity: 0.8,
                strokeWeight: 5,
              },
            }}
          />

        )}
        {[...driverParcels]
          .filter(p => p.destination && typeof p.destination.latitude === "number" && typeof p.destination.longitude === "number")
          .map(parcel => ({
            ...parcel,
            distance: getDistance(
              selectedDriver?.location?.latitude,
              selectedDriver?.location?.longitude,
              parcel.destination.latitude,
              parcel.destination.longitude
            ),
          }))
          .sort((a, b) => a.distance - b.distance)
          .map((parcel, idx) => {
            const dest = parcel.destination;
            return (
              <Marker
                key={`parcel-marker-${parcel.id || idx}`}
                position={{ lat: dest.latitude, lng: dest.longitude }}
                label={(idx + 1).toString()}
                onClick={() => {
                  window.alert(`Parcel ${idx + 1}\nRecipient: ${parcel.recipientName}\nAddress: ${parcel.address}`);
                }}
              />
            );
          })}
      </GoogleMap>
    </div>
  );
}
