import { useEffect, useState, useRef } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "/src/firebaseConfig";
import { GoogleMap, Marker, useJsApiLoader } from "@react-google-maps/api";
import CircularProgress from "@mui/material/CircularProgress";

export default function MapComponent({ selectedDriver }) {
  const [drivers, setDrivers] = useState([]);
  const mapRef = useRef(null);

  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  // Fetch drivers from Firestore
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

  // Re-center map when driver selected
  useEffect(() => {
    if (selectedDriver?.location && mapRef.current) {
      mapRef.current.panTo({
        lat: selectedDriver.location.latitude,
        lng: selectedDriver.location.longitude,
      });
      mapRef.current.setZoom(14);
    }
  }, [selectedDriver]);

  if (!isLoaded) return <CircularProgress />;

  return (
    <GoogleMap
      onLoad={(map) => (mapRef.current = map)}
      center={{ lat: 14.5995, lng: 120.9842 }}
      zoom={12}
      mapContainerStyle={{ width: "100%", height: "90vh" }}
    >
      {drivers.map((driver) =>
        driver.location ? (
          <Marker
            key={driver.id}
            position={{
              lat: driver.location.latitude,
              lng: driver.location.longitude,
            }}
          />
        ) : null
      )}
    </GoogleMap>
  );
}
