import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Avatar,
  Chip,
  Stack,
  Divider,
  Box,
  Paper,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

const statusColors = {
  delivered: "#29bf12",
  failed: "#f21b3f",
  returned: "#f21b3f",
  "out for delivery": "#ff9914",
  pending: "#c4cad0",
};

export default function ParcelDetailsModal({ open, onClose, parcel }) {
  const formatDate = (date) => {
    try {
      if (!date) return "N/A";
      if (date instanceof Date) return date.toLocaleDateString();
      if (typeof date.toDate === "function") return date.toDate().toLocaleDateString();
      return new Date(date).toLocaleDateString();
    } catch {
      return "Invalid Date";
    }
  };

  if (!parcel) return null;

  const color = statusColors[parcel.status?.toLowerCase()] || "#c4cad0";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle
        sx={{
          fontFamily: "Lexend",
          fontWeight: 600,
          color: "#00b2e1",
        }}
      >
        Parcel Details
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Header Section */}
          <Box display="flex" alignItems="center" gap={1}>
            <Avatar sx={{ bgcolor: color }}>
              <LocalShippingIcon />
            </Avatar>
            <Chip
              label={parcel.status || "Pending"}
              size="small"
              sx={{
                backgroundColor: color,
                color: "#fff",
                fontSize: "0.8rem",
                textTransform: "capitalize",
                fontWeight: 500,
              }}
            />
          </Box>

          <Divider />

          {/* Parcel Information */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Parcel Information
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Parcel ID:</strong> {parcel.id || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Reference No:</strong> {parcel.reference || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Date Added:</strong> {formatDate(parcel.dateAdded)}
              </Typography>
              <Typography variant="body2">
                <strong>Weight:</strong> {(parcel.weight || 0) + " kg"}
              </Typography>
            </Stack>
          </Paper>

          {/* Recipient Details */}
          <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
              Recipient Details
            </Typography>
            <Stack spacing={1}>
              <Typography variant="body2">
                <strong>Name:</strong> {parcel.recipient || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Contact:</strong> {parcel.recipientContact || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Street:</strong> {parcel.street || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Barangay:</strong> {parcel.barangay || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Municipality:</strong> {parcel.municipality || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Province:</strong> {parcel.province || "N/A"}
              </Typography>
              <Typography variant="body2">
                <strong>Region:</strong> {parcel.region || "N/A"}
              </Typography>
            </Stack>
          </Paper>

          {/* Driver Info */}
          {parcel.driverName && (
            <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                Assigned Driver
              </Typography>
              <Typography variant="body2">{parcel.driverName}</Typography>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} variant="contained" sx={{ borderRadius: 2 }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
