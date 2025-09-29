import { useEffect, useState, useRef } from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  DirectionsService,
  DirectionsRenderer,
  InfoWindow,
} from "@react-google-maps/api";
import deliverLogo from "/src/assets/box.svg";
import { CircularProgress } from "@mui/material";
import { collection, onSnapshot, query, where, doc, getDoc } from "firebase/firestore";
import { db } from "/src/firebaseConfig";

export default function MapComponent({ selectedDriver, user }) {
  const [center, setCenter] = useState({ lat: 14.6091, lng: 121.0223 }); // Manila default
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [drivers, setDrivers] = useState([]);
  const [routeResults, setRouteResults] = useState([]);
  const [infoOpen, setInfoOpen] = useState(null);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  // Get user location
  useEffect(() => {
    if (!navigator.geolocation) {
      setLoadingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setLoadingLocation(false);
      },
      () => setLoadingLocation(false)
    );
  }, []);

  // Load drivers
  useEffect(() => {
    if (!user) return;

    let unsub; // Firestore unsubscribe

    const loadDrivers = async () => {
      const userDoc = await getDoc(doc(db, "users", user.uid));
      const branchId = userDoc.exists() ? userDoc.data().branchId : null;
      if (!branchId) return;

      const q = query(
        collection(db, "users"),
        where("role", "==", "driver"),
        where("branchId", "==", branchId)
      );

      unsub = onSnapshot(q, (snapshot) => {
        setDrivers(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })));
      });
    };

    loadDrivers();

    return () => {
      if (unsub) unsub();
    };
  }, [user]);

  // Prepare routes for selected driver
  useEffect(() => {
    if (!selectedDriver?.location || !selectedDriver?.parcels?.length || !mapRef.current) {
      setRouteResults([]);
      return;
    }

    const origin = {
      lat: selectedDriver.location.latitude,
      lng: selectedDriver.location.longitude,
    };
    mapRef.current.panTo(origin);
    mapRef.current.setZoom(12);

    const validParcels = selectedDriver.parcels.filter(
      (p) => p.destination?.latitude && p.destination?.longitude
    );

    setRouteResults(
      validParcels.map((parcel) => ({
        id: parcel.id,
        origin,
        destination: { lat: parcel.destination.latitude, lng: parcel.destination.longitude },
        res: null,
        eta: null,
      }))
    );
  }, [selectedDriver]);

  if (!isLoaded || loadingLocation) {
    return (
      <div style={{ textAlign: "center", marginTop: "2rem" }}>
        <CircularProgress />
      </div>
    );
  }

  return (
    <GoogleMap
      onLoad={(map) => (mapRef.current = map)}
      center={center}
      zoom={12}
      mapContainerStyle={{ width: "100%", height: "90vh" }}
    >
      {/* User marker */}
      <Marker
        position={center}
        icon={{ url: deliverLogo, scaledSize: new window.google.maps.Size(40, 40) }}
        label={{ text: "You", color: "#2196F3", fontWeight: "bold", fontSize: "16px" }}
      />

      {/* All drivers */}
      {drivers.map(
        (driver) =>
          driver.location && (
            <Marker
              key={driver.id}
              position={{ lat: driver.location.latitude, lng: driver.location.longitude }}
              label={{
                text: driver.fullName || "Driver",
                color: selectedDriver?.id === driver.id ? "#000" : "#555",
                fontWeight: "bold",
              }}
            />
          )
      )}

      {/* Selected driver parcels & routes */}
      {routeResults.map((route) => (
        <div key={route.id}>
          <DirectionsService
            options={{
              origin: route.origin,
              destination: route.destination,
              travelMode: "DRIVING",
            }}
            callback={(res) => {
              if (res?.status === "OK") {
                const leg = res.routes[0].legs[0];
                const etaInMin = leg.duration.value / 60;
                setRouteResults((prev) =>
                  prev.map((r) =>
                    r.id === route.id ? { ...r, res, eta: `${Math.round(etaInMin)} min` } : r
                  )
                );
              }
            }}
          />

          {route.res && <DirectionsRenderer directions={route.res} />}

          <Marker
            position={route.destination}
            label={{ text: "Parcel", color: "#fff", fontWeight: "bold" }}
            onClick={() => setInfoOpen(route.id)}
          />
          {infoOpen === route.id && (
            <InfoWindow position={route.destination} onCloseClick={() => setInfoOpen(null)}>
              <div>
                <strong>ETA:</strong> {route.eta || "Calculating..."}
              </div>
            </InfoWindow>
          )}
        </div>
      ))}
    </GoogleMap>
  );
}
