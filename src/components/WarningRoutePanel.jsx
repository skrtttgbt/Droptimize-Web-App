import { Box, Typography, List, ListItem, ListItemText } from "@mui/material";

export default function WarningRoutePanel() {
  const slowZones = [
    { name: "St. Mary's Church", type: "Church", lat: 15.488, lng: 120.597 },
    { name: "Dominican College of Tarlac", type: "School", lat: 15.480, lng: 120.600 },
    { name: "Public Market Pedestrian", type: "Pedestrian", lat: 15.486, lng: 120.603 },
  ];

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h6" sx={{ fontWeight: "bold", color: "#00b2e1" }}>
        Warning Routes
      </Typography>
      <Typography variant="body2" sx={{ mb: 2, color: "gray" }}>
        These are areas where drivers must slow down (near schools, churches, or crossings).
      </Typography>
      <List>
        {slowZones.map((zone, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={zone.name}
              secondary={`Type: ${zone.type}`}
            />
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
