import {
  Paper,
  Typography,
  Box,
  Avatar,
  Chip,
  Grid,
  Tooltip,
  Button,
  Stack,
} from "@mui/material";
import WarningIcon from "@mui/icons-material/WarningAmber";
import MapIcon from "@mui/icons-material/Map";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

export default function DriverList({
  drivers = [],
  onViewMap,
  onGiveWarning,
  onAssignParcel,
}) {
  // ✅ Status colors
  const statusColors = {
    available: "#29bf12",
    delivering: "#ff9914",
    offline: "#c4cad0",
  };

  // ✅ Group drivers by status
  const groupedDrivers = { Available: [], Delivering: [], Offline: [] };

  drivers.forEach((driver) => {
    const safeStatus = (driver.status || "offline").toLowerCase();
    if (safeStatus === "available") groupedDrivers.Available.push(driver);
    else if (safeStatus === "delivering") groupedDrivers.Delivering.push(driver);
    else groupedDrivers.Offline.push(driver);
  });

  if (drivers.length === 0) {
    return (
      <Typography
        variant="body2"
        color="textSecondary"
        fontSize={16}
        align="center"
        sx={{ mt: 4 }}
      >
        No drivers found.
      </Typography>
    );
  }

  const getDisplayName = (d) =>
    `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Unnamed Driver";

  const renderDriverCard = (driver) => {
    const displayStatus = (driver.status || "offline").toLowerCase();

    return (
      <Grid item xs={12} md={6} lg={4} key={driver.id}>
        <Paper
          elevation={2}
          sx={{
            display: "flex",
            flexDirection: "row",
            alignItems: "center",
            gap: 2,
            p: 2,
            height: "100%",
          }}
        >
          <Avatar
            src={driver.avatar || ""}
            alt={getDisplayName(driver)}
            sx={{ width: 56, height: 56 }}
          />
          <Box flex={1}>
            <Typography variant="subtitle1" fontWeight="bold">
              {getDisplayName(driver)}
            </Typography>
            <Typography variant="body2" color="textSecondary">
              ID: {driver.id}
            </Typography>
            {driver.phoneNumber && (
              <Typography variant="body2" color="textSecondary">
                Contact: {driver.phoneNumber}
              </Typography>
            )}
            {driver.email && (
              <Typography variant="body2" color="textSecondary">
                Email: {driver.email}
              </Typography>
            )}

            {/* ✅ Status + Speed */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                mt: 1,
                flexWrap: "wrap",
              }}
            >
              <Chip
                label={displayStatus}
                size="small"
                sx={{
                  color: "#fff",
                  textTransform: "capitalize",
                  backgroundColor: statusColors[displayStatus] || "#c4cad0",
                }}
              />

              {displayStatus === "delivering" &&
                typeof driver.speed === "number" && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <Typography variant="body2" color="textSecondary">
                      {driver.speed} km/h
                    </Typography>
                    {driver.speedLimit &&
                      driver.speed > driver.speedLimit && (
                        <Tooltip
                          title={`Overspeeding (Limit: ${driver.speedLimit} km/h)`}
                        >
                          <WarningIcon color="error" fontSize="small" />
                        </Tooltip>
                      )}
                  </Box>
                )}
            </Box>

            {/* ✅ Actions */}
            {displayStatus === "delivering" && (
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

            {displayStatus === "available" && (
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
  };

  return (
    <>
      {Object.entries(groupedDrivers).map(([status, list]) =>
        list.length > 0 ? (
          <Box key={status} mb={4}>
            <Typography
              variant="h5"
              gutterBottom
              sx={{ color: "#0064b5", fontWeight: "bold" }}
            >
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
