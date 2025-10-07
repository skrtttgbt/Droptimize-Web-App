import { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  DirectionsService,
  DirectionsRenderer,
  InfoWindow,
  TrafficLayer,
} from "@react-google-maps/api";
import deliverLogo from "/src/assets/box.svg";
import { CircularProgress, Button } from "@mui/material";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "/src/firebaseConfig";

export default function MapComponent({ selectedDriver, user }) {
  const [center, setCenter] = useState(null);
  const [defaultCenter, setDefaultCenter] = useState(null);
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [driverPrevLocs, setDriverPrevLocs] = useState({});
  const [routeResults, setRouteResults] = useState([]);
  const [fastestId, setFastestId] = useState(null);
  const [infoOpen, setInfoOpen] = useState(null);
  const [showTraffic, setShowTraffic] = useState(true);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  /** 🧭 Load user location or default center */
  useEffect(() => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const posCenter = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        setCenter(posCenter);
        setDefaultCenter(posCenter);
        setLoadingLocation(false);
      },
      () => {
        const fallback = { lat: 14.6091, lng: 121.0223 }; // Manila fallback
        setCenter(fallback);
        setDefaultCenter(fallback);
        setLoadingLocation(false);
      }
    );
  }, []);

  /** 🚗 Load drivers of same branch */
  useEffect(() => {
    if (!user) return;
    let unsub;

    const loadDrivers = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const branchId = userDoc.exists() ? userDoc.data().branchId : null;
      if (!branchId) return;

      const q = query(
        collection(db, "users"),
        where("role", "==", "driver"),
        where("branchId", "==", branchId)
      );

      unsub = onSnapshot(q, (snap) => {
        const updatedDrivers = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        setDrivers((prev) => {
          const newPrev = { ...driverPrevLocs };
          updatedDrivers.forEach((driver) => {
            const prevLoc = prev[driver.id];
            const currLoc = driver.location;
            if (prevLoc && currLoc) {
              const dx = currLoc.longitude - prevLoc.longitude;
              const dy = currLoc.latitude - prevLoc.latitude;
              driver.heading = (Math.atan2(dx, dy) * 180) / Math.PI + 90;
            }
            newPrev[driver.id] = currLoc;
          });
          setDriverPrevLocs(newPrev);
          return updatedDrivers;
        });
      });
    };

    loadDrivers();
    return () => unsub && unsub();
  }, [user]);

  /** 🗺️ Generate routes for selected driver */
  useEffect(() => {
    if (!selectedDriver?.location || !selectedDriver?.parcels?.length || !mapRef.current) {
      setRouteResults([]);
      setFastestId(null);
      return;
    }

    const origin = {
      lat: selectedDriver.location.latitude,
      lng: selectedDriver.location.longitude,
    };

    const validParcels = selectedDriver.parcels.filter(
      (p) => p.destination?.latitude && p.destination?.longitude
    );
    if (validParcels.length === 0) return;

    mapRef.current.panTo(origin);
    mapRef.current.setZoom(13);

    const routes = validParcels.map((p) => ({
      id: p.id,
      origin,
      destination: {
        lat: p.destination.latitude,
        lng: p.destination.longitude,
      },
      res: null,
      eta: null,
      durationValue: null,
    }));

    setRouteResults(routes);
  }, [selectedDriver]);

 

  if (!isLoaded || loadingLocation || !center) {
    return (
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <CircularProgress />
        <p>Fetching location...</p>
      </div>
    );
  }

  return (
    <div style={{ position: "relative" }}>

      <GoogleMap
        onLoad={(map) => (mapRef.current = map)}
        center={center}
        zoom={12}
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
      >
        {showTraffic && <TrafficLayer autoUpdate />}

        {/* 📍 User marker */}
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

        {/* 🚘 Driver markers */}
        {drivers.map(
          (d) =>
            d.location && (
              <Marker
                key={d.id}
                position={{
                  lat: d.location.latitude,
                  lng: d.location.longitude,
                }}
                icon={{
                  path: window.google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
                  scale: 5,
                  rotation: d.heading || 0,
                  fillColor: selectedDriver?.id === d.id ? "#00b2e1" : "#333",
                  fillOpacity: 1,
                  strokeWeight: 1,
                  strokeColor: "#fff",
                }}
                label={{
                  text: d.fullName || "Driver",
                  color: "red",
                  fontWeight: "bold",
                }}
              />
            )
        )}

        {/* 🚚 Parcel routes */}
        {routeResults.map((route) => (
          <div key={route.id}>
            <DirectionsService
              options={{
                origin: route.origin,
                destination: route.destination,
                travelMode: "DRIVING",
                drivingOptions: {
                  departureTime: new Date(),
                  trafficModel: "bestguess",
                },
              }}
              callback={(res) => {
                if (res?.status === "OK") {
                  const leg = res.routes[0].legs[0];
                  const etaInMin = Math.round(leg.duration_in_traffic.value / 60);

                  setRouteResults((prev) => {
                    const updated = prev.map((r) =>
                      r.id === route.id
                        ? {
                            ...r,
                            res,
                            eta: `${etaInMin} min`,
                            durationValue: leg.duration_in_traffic.value,
                          }
                        : r
                    );

                    // ✅ Prevent reduce crash with empty array
                    const fastest = updated.length
                      ? updated.reduce((a, b) =>
                          !a || (b.durationValue && b.durationValue < a.durationValue)
                            ? b
                            : a
                        )
                      : null;

                    setFastestId(fastest?.id || null);
                    return updated;
                  });
                }
              }}
            />

            {route.res && (
              <DirectionsRenderer
                directions={route.res}
                options={{
                  suppressMarkers: true,
                  polylineOptions: {
                    strokeColor: route.id === fastestId ? "#00b2e1" : "#808080",
                    strokeWeight: route.id === fastestId ? 6 : 3,
                    strokeOpacity: route.id === fastestId ? 1 : 0.6,
                  },
                }}
              />
            )}

            {/* 📦 Parcel destination marker */}
            <Marker
              position={route.destination}
              label={{
                text: "Parcel",
                color: "#fff",
                fontWeight: "bold",
              }}
              onClick={() => setInfoOpen(route.id)}
            />

            {infoOpen === route.id && (
              <InfoWindow
                position={route.destination}
                onCloseClick={() => setInfoOpen(null)}
              >
                <div>
                  <strong>ETA (with traffic):</strong>{" "}
                  {route.eta || "Calculating..."}
                  {route.id === fastestId && (
                    <div style={{ color: "#00b2e1", fontWeight: "bold" }}>
                      🚀 Fastest Route (Traffic Considered)
                    </div>
                  )}
                </div>
              </InfoWindow>
            )}
          </div>
        ))}
      </GoogleMap>
    </div>
  );
}
