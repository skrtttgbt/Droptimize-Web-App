import { useEffect, useState } from "react";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { db } from "/src/firebaseConfig";
import { Card, CardContent, Typography, List, ListItemButton, ListItemText, Divider, Box, Avatar, ListItemAvatar } from "@mui/material";
import GiveWarningButton from "./GiveWarningButton.jsx";

export default function DriverListPanel({ onDriverSelect, onGiveWarning }) {
  const [drivers, setDrivers] = useState([]);

  useEffect(() => {
    const q = query(
      collection(db, "users"),
      where("role", "==", "driver"),
      where("status", "==", "Delivering")
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      const sorted = data.sort((a, b) => {
        const aOver = a.speed > (a.speedLimit || 60);
        const bOver = b.speed > (b.speedLimit || 60);
        return bOver - aOver;
      });

      setDrivers(sorted);
    });

    return () => unsub();
  }, []);

  return (
    <Card sx={{ height: "100%", overflowY: "auto" }}>
      <CardContent>
        <Typography variant="h5" gutterBottom sx={{ color: "#00b2e1", fontWeight: "bold", fontFamily: "Lexend" }}>
          Drivers
        </Typography>

        {drivers.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ p: 2, textAlign: "center" }}
          >
            No drivers found
          </Typography>
        ) : (
          <List disablePadding>
            {drivers.map((driver, index) => {
              const speedLimit = driver.speedLimit || 60;
              const isOverspeeding = driver.speed > speedLimit;

              return (
                <Box key={driver.id}>
                  <ListItemButton onClick={() => onDriverSelect(driver)}>
                    <ListItemAvatar>
                      <Avatar
                        src={driver.photoURL || ""}
                        alt={driver.fullName || "Driver"}
                      />
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight="bold">
                          {driver.fullName || "Unnamed Driver"}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="text.secondary">
                            Vehicle: {driver.vehicle || "N/A"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Plate: {driver.plateNumber || "N/A"}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            Parcels left: {driver.parcelsLeft ?? "N/A"}
                          </Typography>
                          <Typography
                            variant="body2"
                            fontWeight="bold"
                            sx={{
                              color: isOverspeeding ? "#f21b3f" : "#29bf12",
                            }}
                          >
                            Speed:{" "}
                            {driver.speed ? `${driver.speed} km/h` : "N/A"}
                          </Typography>
                        </>
                      }
                    />
                    {isOverspeeding && (
                      <GiveWarningButton
                        onClick={(e) => {
                          e.stopPropagation(); // prevent selecting driver
                          onGiveWarning?.(driver);
                        }}
                      />
                    )}
                  </ListItemButton>
                  {index < drivers.length - 1 && <Divider />}
                </Box>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
