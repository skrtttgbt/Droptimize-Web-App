import { Paper, Typography, Box, Avatar, Chip, Grid, Tooltip, Button, Stack } from "@mui/material";
import WarningIcon from "@mui/icons-material/WarningAmber";
import MapIcon from "@mui/icons-material/Map";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { useEffect } from "react";

export default function DriverList({
  drivers = [],
  onViewMap,
  onGiveWarning,
  onAssignParcel,
}) {

  // Status colors for different driver statuses
  const statusColors = {
    Available: "#29bf12",
    Delivering: "#ff9914",
    Offline: "#c4cad0",
  };

  // If no drivers are provided, show a message
  if (drivers.length === 0) {
    return (
      <Typography variant="body2" color="textSecondary" fontSize={16} align="center" sx={{ mt: 4 }}>
        No drivers found.
      </Typography>
    );
  }

  // Group drivers by status
  const groupedDrivers = {
    Available: [],
    Delivering: [],
    Offline: [],
  };

  // Populate the groupedDrivers object based on driver status
  drivers.forEach(driver => {
    if (groupedDrivers[driver.status]) {
      groupedDrivers[driver.status].push(driver);
    }
  });

  // Render each driver card
  const renderDriverCard = (driver) => (
    <Grid size={{ xs: 12, md: 6, lg: 4 }} key={driver.id} sx={{ height: "100%", width: 400 }}>
      <Paper
        elevation={2}
        sx={{
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          gap: 2,
          p: 2,
        }}
      >
        <Avatar src={driver.avatar} alt={driver.name} sx={{ width: 56, height: 56 }} />
        <Box flex={1}>
          <Typography variant="subtitle1" fontWeight="bold">
            {driver.fullName}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            ID: {driver.id}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Contact: {driver.phoneNumber}
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Email: {driver.email}
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mt: 1, flexWrap: "wrap" }}>
            <Chip
              label={driver.status}
              size="small"
              sx={{
                color: "#fff",
                backgroundColor: statusColors[driver.status] || "#c4cad0",
              }}
            />

            { /* Display speed and speed limit if available */ }
            {driver.status === "Delivering" && typeof driver.speed === "number" && (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography variant="body2" color="textSecondary">
                  {driver.speed} km/h
                </Typography>
                {driver.speedLimit && driver.speed > driver.speedLimit && (
                  <Tooltip title={`Overspeeding (Limit: ${driver.speedLimit} km/h)`}>
                    <WarningIcon color="error" fontSize="small" />
                  </Tooltip>
                )}
              </Box>
            )}
          </Box>

          { /* Action buttons based on driver status */ }
          {driver.status === "Delivering" && (
            <Stack direction="row" spacing={1} mt={1}>
              <Button
                size="small"
                startIcon={<MapIcon />}
                onClick={() => onViewMap?.(driver)}
                sx={{ textTransform: "none" }}
              >
                See on Map
              </Button>
              <Button
                size="small"
                color="error"
                variant="outlined"
                startIcon={<ReportProblemIcon />}
                onClick={() => onGiveWarning?.(driver)}
                sx={{ textTransform: "none" }}
              >
                Give Warning
              </Button>
            </Stack>
          )}

          {driver.status === "Available" && (
            <Stack direction="row" spacing={1} mt={1}>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<LocalShippingIcon />}
                onClick={() => onAssignParcel?.(driver)}
                sx={{ textTransform: "none" }}
              >
                Assign Parcels
              </Button>
            </Stack>
          )}
        </Box>
      </Paper>
    </Grid>
  );

  return (
    <>
      {Object.entries(groupedDrivers).map(([status, list]) =>
        list.length > 0 ? (
          <Box key={status} mb={4}>
            <Typography variant="h5" gutterBottom sx={{ color: "#0064b5", fontWeight: "bold" }}>
              {status} Drivers
            </Typography>
            <Grid container spacing={2}>
              {list.map(renderDriverCard)}
            </Grid>
          </Box>
        ) : null
      )}
    </>
  );
}
