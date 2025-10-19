import {
  Modal,
  Box,
  Paper,
  Typography,
  Grid,
  Stack,
  Avatar,
  Chip,
  Button,
  Divider,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import MapIcon from "@mui/icons-material/Map";

const statusColors = {
  available: "#29bf12",
  delivering: "#ff9914",
  offline: "#c4cad0",
};

export default function DriverDetailsModal({
  driver,
  open,
  onClose,
  onAssignParcel,
  onGiveWarning,
  onViewMap,
}) {
  if (!driver) return null;

  const status = (driver.status || "offline").toLowerCase();

  // Detect proper photo field
  const photo =
    driver.avatar ||
    driver.photoURL ||
    driver.profilePhoto ||
    driver.image ||
    "";

  const getDisplayName = (d) =>
    `${d.firstName || ""} ${d.lastName || ""}`.trim() || "Unnamed Driver";

  return (
    <Modal open={open} onClose={onClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "95%",
          maxWidth: 600,
          maxHeight: "90vh",
          overflowY: "auto",
          bgcolor: "#fff",
          borderRadius: 3,
          boxShadow: 24,
          p: 3,
        }}
      >
        {/* Header */}
        <Typography
          variant="h6"
          fontWeight="bold"
          mb={3}
          sx={{ color: "#00b2e1", fontFamily: "Lexend" }}
        >
          Driver Details
        </Typography>

        <Divider sx={{ mb: 2 }} />

        {/* Content */}
        <Paper variant="outlined" sx={{ p: 3, borderRadius: 2 }}>
          <Grid container spacing={3}>
            {/* Avatar */}
            <Grid
              size={{
                xs: 12,
                sm: 4
              }}>
              <Avatar
                src={photo}
                alt={getDisplayName(driver)}
                sx={{
                  width: 72,
                  height: 72,
                  borderRadius: "50%",
                  mx: "auto",
                  mb: 1,
                }}
              />
              <Chip
                label={status}
                size="small"
                sx={{
                    textTransform: "capitalize",
                    backgroundColor: statusColors[status] || "#c4cad0",
                    color: "#fff",
                    fontWeight: 500,
                }}
                />
            </Grid>

            {/* Info */}
            <Grid
              size={{
                xs: 12,
                sm: 8
              }}>
              <Stack spacing={1}>
                <Typography variant="subtitle1" fontWeight="bold">
                  {getDisplayName(driver)}
                </Typography>

                <Typography variant="body2">
                  <strong>ID:</strong> {driver.id || "N/A"}
                </Typography>

                <Typography variant="body2">
                  <strong>Email:</strong> {driver.email || "N/A"}
                </Typography>

                <Typography variant="body2">
                  <strong>Contact:</strong> {driver.phoneNumber || "N/A"}
                </Typography>

                <Typography variant="body2">
                  <strong>Preferred Route:</strong>{" "}
                  {driver.preferredRoute || "N/A"}
                </Typography>

                {status === "delivering" && driver.speed != null && (
                  <Typography variant="body2">
                    <strong>Current Speed:</strong> {driver.speed} km/h
                  </Typography>
                )}
              </Stack>
            </Grid>
          </Grid>
        </Paper>

        {/* Action Buttons + Close */}
        <Stack
          direction="row"
          spacing={2}
          mt={3}
          justifyContent="flex-end"
          flexWrap="wrap"
        >
          {status === "available" && (
            <Button
              variant="contained"
              startIcon={<LocalShippingIcon />}
              onClick={() => onAssignParcel?.(driver)}
              sx={{
                textTransform: "none",
                borderRadius: 2,
                fontWeight: 500,
                backgroundColor: "#0064b5",
                "&:hover": { backgroundColor: "#00509e" },
              }}
            >
              Assign Parcels
            </Button>
          )}

          {status === "delivering" && (
            <>
              <Button
                variant="contained"
                startIcon={<WarningAmberIcon />}
                onClick={() => onGiveWarning?.(driver)}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 500,
                  backgroundColor: "#f21b3f",
                  "&:hover": { backgroundColor: "#d01735" },
                }}
              >
                Give Warning
              </Button>

              <Button
                variant="contained"
                startIcon={<MapIcon />}
                onClick={() => onViewMap?.(driver)}
                sx={{
                  textTransform: "none",
                  borderRadius: 2,
                  fontWeight: 500,
                  backgroundColor: "#0064b5",
                  "&:hover": { backgroundColor: "#00509e" },
                }}
              >
                See on Map
              </Button>
            </>
          )}

          <Button
            variant="outlined"
            onClick={onClose}
            sx={{
              borderRadius: 2,
              fontWeight: 500,
              textTransform: "none",
              borderColor: "#c4cad0",
              color: "#5a5a5a",
              "&:hover": {
                borderColor: "#a6a6a6",
                backgroundColor: "#f4f4f4",
              },
            }}
          >
            Close
          </Button>
        </Stack>
      </Box>
    </Modal>
  );
}
