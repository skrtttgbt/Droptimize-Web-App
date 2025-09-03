import { Paper, Typography, List, ListItem, ListItemText, Box, Chip } from "@mui/material";

export default function RecentIncidentCard({ incidents = [] }) {
  return (
    <Paper elevation={3} sx={{ p: 2, height: "100%" }}>
      <Typography variant="h6" gutterBottom>
        Recent Incidents
      </Typography>
      
      {incidents.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 2, color: 'text.secondary' }}>
          <Typography variant="body2">No recent incidents recorded</Typography>
        </Box>
      ) : (
        <List>
          {incidents.map((incident, index) => (
            <ListItem key={incident.id || index} divider={index < incidents.length - 1}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">{incident.driverName}</Typography>
                    <Chip 
                      size="small" 
                      color="error" 
                      label={`${incident.speed} km/h`} 
                      sx={{ height: 20 }}
                    />
                  </Box>
                }
                secondary={
                  <>
                    <Typography variant="body2" component="span">
                      {incident.date}
                    </Typography>
                    <Typography variant="body2" component="span" sx={{ display: 'block' }}>
                      {incident.location}
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
