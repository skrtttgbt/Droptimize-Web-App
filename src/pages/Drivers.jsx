import { useEffect, useState, useMemo } from "react";
import { Stack, Typography, CircularProgress } from "@mui/material";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "/src/firebaseConfig";
import DriversHeader from "../components/Dashboard/DriversHeader.jsx";
import DriverList from "../components/Dashboard/DriverList.jsx";

export default function Drivers() {
  useEffect(() => {
    document.title = "Drivers";
  }, []);

  const [allDrivers, setAllDrivers] = useState([]);
  const [loading, setLoading] = useState(true);

  // UI controls
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  useEffect(() => {
    const q = query(collection(db, "users"), where("role", "==", "driver"));
    const unsub = onSnapshot(
      q,
      (snapshot) => {
        const driverData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
        setAllDrivers(driverData);
        setLoading(false);
      },
      (err) => {
        console.error("Error fetching drivers:", err);
        setLoading(false);
      }
    );

    return () => unsub();
  }, []);

  const counts = useMemo(() => {
    const all = allDrivers.length;
    const available = allDrivers.filter((d) => (d.status || "").toLowerCase() === "available").length;
    const delivering = allDrivers.filter((d) => (d.status || "").toLowerCase() === "delivering").length;
    const offline = allDrivers.filter((d) => (d.status || "").toLowerCase() === "offline").length;
    return { all, available, delivering, offline };
  }, [allDrivers]);

  const getDisplayName = (d) => {
    if (d.name) return d.name;
    const first = d.firstName || "";
    const last = d.lastName || "";
    return `${first} ${last}`.trim() || "Unnamed Driver";
  };

  const filteredDrivers = useMemo(() => {
    let result = allDrivers.slice();

    // search (name or id)
    const q = (searchQuery || "").trim().toLowerCase();
    if (q) {
      result = result.filter((d) => {
        const name = getDisplayName(d).toLowerCase();
        const id = (d.id || "").toLowerCase();
        return name.includes(q) || id.includes(q);
      });
    }

    if (selectedStatus) {
      const target = selectedStatus.toLowerCase();
      result = result.filter((d) => (d.status || "").toLowerCase() === target);
    }

    return result;
  }, [allDrivers, searchQuery, selectedStatus]);

  return (
    <>
      <Typography
        variant="h4"
        sx={{
          margin: "1rem 0",
          fontFamily: "Lexend",
          fontWeight: "bold",
          color: "#00b2e1",
        }}
      >
        Manage Drivers
      </Typography>

      <Stack spacing={2}>
        <DriversHeader
          showSearch
          onSearch={setSearchQuery}
          onStatusSelect={setSelectedStatus}
          counts={counts} 
        />

        {loading ? (
          <CircularProgress sx={{ alignSelf: "center", mt: 4 }} />
        ) : (
          <DriverList
            drivers={filteredDrivers}
            onViewMap={(driver) => console.log("Map:", driver)}
            onGiveWarning={(driver) => console.warn("Warning:", driver)}
            onAssignParcel={(driver) =>
              alert(`Assigning parcel to ${getDisplayName(driver)}`)
            }
          />
        )}
      </Stack>
    </>
  );
}
