import { Paper, Typography, List, ListItem, ListItemText } from "@mui/material"

export default function RecentIncidentCard({ incidents = [] }) {
  return (
    <Paper elevation={3} sx={{ p: 2, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Recent Incidents
      </Typography>
      <List>
        {incidents.map((incident, index) => (
          <ListItem key={index}>
            <ListItemText
              primary={`Incident ${index + 1}`}
              secondary={`Date: ${incident.date}, Location: ${incident.location}`}
            />
          </ListItem>
        ))}
      </List>
    </Paper>
  );
}
