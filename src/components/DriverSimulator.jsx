import { useState, useEffect } from "react";
import { db } from "../firebaseConfig";
import { doc, updateDoc } from "firebase/firestore";

export default function DriverSimulator() {
  const [speed, setSpeed] = useState(40);
  const [lat, setLat] = useState(15.331934);
  const [lng, setLng] = useState(120.590635);
  const driverId = "lbLTkKU0rQfc7fA3lJnWAPZjCPG3"; // 👈 Firestore doc id of your fake driver

  // Update Firestore every 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      updateDoc(doc(db, "users", driverId), {
        speed,
        location: { latitude: lat, longitude: lng },
        updatedAt: new Date()
      });
      console.log("🚚 Driver updated:", { speed, lat, lng });
    }, 3000);
    return () => clearInterval(interval);
  }, [speed, lat, lng]);

  return (
    <div style={{ padding: 20, fontFamily: "sans-serif" }}>
      <h1>Driver Simulator</h1>

      <label>Speed (km/h): {speed}</label>
      <input type="range" min="0" max="120" value={speed}
             onChange={e => setSpeed(Number(e.target.value))} />
      <br /><br />

      <label>Latitude:</label>
      <input type="number" value={lat} step="0.0001"
             onChange={e => setLat(Number(e.target.value))} />
      <br />

      <label>Longitude:</label>
      <input type="number" value={lng} step="0.0001"
             onChange={e => setLng(Number(e.target.value))} />
      <br /><br />

      <p>Move the sliders/inputs and watch the web panel update in real-time!</p>
    </div>
  );
}
