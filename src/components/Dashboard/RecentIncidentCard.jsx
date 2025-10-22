import { useEffect, useState } from "react";
import {
  Paper,
  Typography,
  List,
  ListItem,
  ListItemText,
  Box,
  Chip,
} from "@mui/material";

export default function RecentIncidentCard({ incidents = [] }) {
  const [resolvedIncidents, setResolvedIncidents] = useState([]);

useEffect(() => {
  const fetchLocationNames = async () => {
    const updated = await Promise.all(
      incidents.map(async (incident) => {
        let lat = null;
        let lng = null;

        if (typeof incident.location === "string" && incident.location.includes(",")) {
          const [latStr, lngStr] = incident.location.split(",").map((v) => v.trim());
          lat = parseFloat(latStr);
          lng = parseFloat(lngStr);
        }

        if (!isNaN(lat) && !isNaN(lng)) {
          try {
            console.log(lat, lng);
            const response = await fetch(
              `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${import.meta.env.VITE_GOOGLE_MAPS_API_KEY}`
            );
            const data = await response.json();
            const address = data.results?.[0]?.formatted_address || "Unknown Location";
            return { ...incident, address };
          } catch (error) {
            console.error("Error fetching location:", error);
            return { ...incident, address: "Unknown Location" };
          }
        }

        return { ...incident, address: "Unknown Location" };
      })
    );
    setResolvedIncidents(updated);
  };

  if (incidents.length > 0) fetchLocationNames();
}, [incidents]);


  return (
    <Paper elevation={3} sx={{ p: 2, height: 350, width: 300, mx: "auto" }}>
      <Typography variant="h6" gutterBottom>
        Recent Incidents
      </Typography>

      {resolvedIncidents.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 2, color: "text.secondary" }}>
          <Typography variant="body2">No recent incidents recorded</Typography>
        </Box>
      ) : (
        <List>
          {resolvedIncidents.map((incident, index) => (
            <ListItem key={incident.id || index} divider={index < incidents.length - 1}>
              <ListItemText
                primary={
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography variant="subtitle2">{incident.driverName}</Typography>
                    <Chip
                      size="small"
                      color="error"
                      label={`${incident.topSpeed} km/h`}
                      sx={{ height: 20 }}
                    />
                  </Box>
                }
                secondary={
                  <>
                    <Typography variant="body2" component="span">
                      {incident.date}
                    </Typography>
                    <Typography
                      variant="body2"
                      component="span"
                      sx={{ display: "block" }}
                    >
                      {incident.address}
                    </Typography>
                  </>
                }
              />
            </ListItem>
          ))}
        </List>
      )}
    </Paper>
  );
}
