import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "/src/firebaseConfig";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import deliverLogo from "/src/assets/box.svg";
import { CircularProgress } from "@mui/material";

export default function MapComponent({ selectedDriver }) {
  const [drivers, setDrivers] = useState([]);
  const [center, setCenter] = useState({});
  const [loadingLocation, setLoadingLocation] = useState(true);
  const [locationPermission, setLocationPermission] = useState(false);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLoadingLocation(false);
          setLocationPermission(true);
        },
        () => {
          setLoadingLocation(false);
          setLocationPermission(false);
        }
      );
    } else {
      setLoadingLocation(false);
      setLocationPermission(false);
    }
  }, []);

  const requestLocation = () => {
    setLoadingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setLoadingLocation(false);
          setLocationPermission(true);
        },
        () => {
          setLoadingLocation(false);
          setLocationPermission(false);
        }
      );
    } else {
      setLoadingLocation(false);
      setLocationPermission(false);
    }
  };

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "driver"));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setDrivers(data);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (selectedDriver?.location && mapRef.current) {
      mapRef.current.panTo({
        lat: selectedDriver.location.latitude,
        lng: selectedDriver.location.longitude,
      });
      mapRef.current.setZoom(14);
    }
  }, [selectedDriver]);
if (!isLoaded || loadingLocation || !center.lat) {
  return (
    <div style={{ textAlign: "center", marginTop: "2rem" }}>
      <CircularProgress />
      {!locationPermission && (
        <div style={{ marginTop: "1rem" }}>
          <button onClick={requestLocation}>
            Allow Location Access
          </button>
        </div>
      )}
    </div>
  );
}
  // Only do conditional rendering after all hooks
if (!locationPermission) {
  return (
    <div style={{ marginTop: "1rem", color: "red" }}>
      <p>
        Location access is denied. Please enable location permissions in your browser or device settings.
        <br />
        <strong>Android:</strong> Tap the lock icon in the address bar, then set Location to "Allow".
      </p>
      <button onClick={requestLocation}>
        Try Again
      </button>
    </div>
  );
}
  return (
    <GoogleMap
      onLoad={(map) => (mapRef.current = map)}
      center={center}
      zoom={10}
      mapContainerStyle={{ width: "100%", height: "90vh" }}
    >
      <Marker
        key={"center"}
        position={center}
        icon={{
          url: deliverLogo,
          scaledSize: new window.google.maps.Size(40, 40),
          labelOrigin: new window.google.maps.Point(20, 40)
        }}
        label={{
          text: "You are here",
          color: "#2196F3",
          fontWeight: "bold",
          fontSize: "16px"
        }}
      />
      {drivers.map((driver) =>
        driver.location ? (
          <Marker
            key={driver.id}
            position={{
              lat: driver.location.latitude,
              lng: driver.location.longitude,
            }}
            label={{
              text: driver.fullName || "Driver",
              color: "#00060aff",
              fontWeight: "bold",
              fontSize: "16px"
            }}
          />
        ) : null
      )}
    </GoogleMap>
  );
}