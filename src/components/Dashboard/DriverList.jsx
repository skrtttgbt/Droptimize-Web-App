import { useState } from "react";
import {
  Paper,
  Typography,
  Box,
  Avatar,
  Chip,
  Grid,
  Button,
  Stack,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import DriverDetailsModal from "./DriverDetailsModal";

export default function DriverList({
  drivers = [],
  onAssignParcel,
  onGiveWarning,
  onViewMap,
}) {
  const [selectedDriver, setSelectedDriver] = useState(null);

  const statusColors = {
    available: "#29bf12",
    delivering: "#ff9914",
    offline: "#c4cad0",
  };

  const groupedDrivers = { Available: [], Delivering: [], Offline: [] };
  drivers.forEach((driver) => {
    const status = (driver?.status || "offline").toLowerCase();
    if (status === "available") groupedDrivers.Available.push(driver);
    else if (status === "delivering") groupedDrivers.Delivering.push(driver);
    else groupedDrivers.Offline.push(driver);
  });

  const getDisplayName = (d) =>
    `${d?.firstName || ""} ${d?.lastName || ""}`.trim() ||
    d?.displayName ||
    d?.fullName ||
    "Unnamed Driver";

  const getAvatarSrc = (driver) =>
    driver?.avatar || driver?.photoURL || driver?.profilePhoto || driver?.image || "";

  const handleCardClick = (driver) => {
    setSelectedDriver(driver);
  };

  const handleAssignClick = (e, driver) => {
    e.stopPropagation();
    onAssignParcel?.(driver);
  };

  const renderDriverCard = (driver) => {
    const displayStatus = (driver?.status || "offline").toLowerCase();
    const avatarSrc = getAvatarSrc(driver);
    const key = driver?.id || driver?.uid || Math.random();

    return (
      <Grid key={key}>
        <Paper
          elevation={3}
          onClick={() => handleCardClick(driver)}
          sx={{
            width: 340,
            height: 160,
            display: "flex",
            alignItems: "center",
            gap: 2,
            p: 2,
            borderRadius: 2,
            cursor: "pointer",
            transition: "background-color 0.15s ease",
            "&:hover": { backgroundColor: "#fafafa" },
            boxSizing: "border-box",
          }}
        >
          <Avatar
            src={avatarSrc}
            alt={getDisplayName(driver)}
            sx={{ width: 56, height: 56, bgcolor: "#c4cad0", flexShrink: 0 }}
            imgProps={{
              onError: (ev) => {
                ev.currentTarget.style.display = "none";
              },
            }}
          >
            {getDisplayName(driver).slice(0, 1)}
          </Avatar>

          <Box
            flex={1}
            minWidth={0}
            display="flex"
            flexDirection="column"
            justifyContent="space-between"
            height="100%"
          >
            <Box>
              <Typography
                variant="h6"
                fontWeight="bold"
                noWrap
                title={getDisplayName(driver)}
              >
                {getDisplayName(driver)}
              </Typography>

              <Typography variant="body2" color="textSecondary" noWrap>
                ID: {driver?.id || driver?.uid || "N/A"}
              </Typography>

              {driver?.phoneNumber && (
                <Typography variant="body2" color="textSecondary" noWrap>
                  Contact: {driver.phoneNumber}
                </Typography>
              )}

              {displayStatus === "delivering" &&
                typeof driver?.speed === "number" && (
                  <Typography
                    variant="body2"
                    color={
                      driver?.speed > (driver?.speedLimit || 25)
                        ? "#f21b3f"
                        : "#29bf12"
                    }
                  >
                    Speed: {driver.speed} km/h
                  </Typography>
                )}
            </Box>

            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                mt: 1,
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

              {displayStatus === "available" && (
                <Button
                  size="small"
                  variant="contained"
                  startIcon={<LocalShippingIcon />}
                  onClick={(e) => handleAssignClick(e, driver)}
                  sx={{
                    textTransform: "none",
                    borderRadius: 1.5,
                    fontWeight: 500,
                  }}
                >
                  Assign
                </Button>
              )}
            </Box>
          </Box>
        </Paper>
      </Grid>
    );
  };

  return (
    <>
      <Box
        sx={{
          width: "100%",
          height: "calc(100vh - 180px)",
          overflowY: "auto",
          pr: 1,
          pb: 2,
        }}
      >
        <Stack spacing={4} sx={{ width: "100%" }}>
          {Object.entries(groupedDrivers).map(([status, list]) =>
            list.length > 0 ? (
              <Box key={status} sx={{ width: "100%" }}>
                <Typography
                  variant="h5"
                  gutterBottom
                  sx={{
                    color: "#00b2e1",
                    fontWeight: "bold",
                    mb: 2,
                    px: 1,
                  }}
                >
                  {status} Drivers
                </Typography>
                <Grid
                  container
                  spacing={2}
                  sx={{
                    display: "flex",
                    flexWrap: "wrap",
                    justifyContent: "flex-start",
                  }}
                >
                  {list.map((driver) => renderDriverCard(driver))}
                </Grid>
              </Box>
            ) : null
          )}
        </Stack>
      </Box>

      {selectedDriver && (
        <DriverDetailsModal
          open={!!selectedDriver}
          driver={selectedDriver}
          onClose={() => setSelectedDriver(null)}
          onAssignParcel={(driver) => {
            setSelectedDriver(null);
            onAssignParcel?.(driver);
          }}
          onGiveWarning={(driver) => {
            setSelectedDriver(null);
            onGiveWarning?.(driver);
          }}
          onViewMap={(driver) => {
            setSelectedDriver(null);
            onViewMap?.(driver);
          }}
        />
      )}
    </>
  );
}
