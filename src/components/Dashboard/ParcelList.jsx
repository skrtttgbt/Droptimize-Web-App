import {
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  Typography,
  Chip,
  Divider,
  Box,
  Skeleton,
  Stack,
} from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import { useEffect } from "react";

const statusColors = {
  delivered: "#29bf12",
  failed: "#f21b3f",
  returned: "#f21b3f",
  "out for delivery": "#ff9914",
  pending: "#c4cad0",
};

const statusOrder = ["pending", "out for delivery", "delivered", "failed", "returned"];

export default function ParcelList({ parcels = [], loading = false }) {

  useEffect(() => {
    console.log("📦 ParcelList received:", parcels);
  }, [parcels]);


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

  // ⏳ Loading skeleton
  if (loading) {
    return (
      <List sx={{ width: "100%", bgcolor: "background.paper" }}>
        {[1, 2, 3].map((item) => (
          <Box key={item}>
            <ListItem alignItems="flex-start" sx={{ py: 2 }}>
              <ListItemAvatar>
                <Skeleton variant="circular" width={40} height={40} />
              </ListItemAvatar>
              <ListItemText
                primary={<Skeleton variant="text" width={100} />}
                secondary={
                  <Box>
                    <Skeleton variant="text" width="90%" />
                    <Skeleton variant="text" width="80%" />
                    <Skeleton variant="text" width="70%" />
                  </Box>
                }
              />
            </ListItem>
            {item < 3 && <Divider variant="inset" component="li" />}
          </Box>
        ))}
      </List>
    );
  }

  // ❗ Empty state
  if (!parcels.length) {
    return (
      <Typography variant="body2" color="text.secondary">
        No parcels found.
      </Typography>
    );
  }

  // 🔀 Sort by status order then newest date
  const sortedParcels = [...parcels].sort((a, b) => {
    const sOrder =
      statusOrder.indexOf((a.status || "").toLowerCase()) -
      statusOrder.indexOf((b.status || "").toLowerCase());
    if (sOrder !== 0) return sOrder;
    return (b.dateAdded?.seconds || 0) - (a.dateAdded?.seconds || 0);
  });

  return (
    <List sx={{ width: "100%", bgcolor: "background.paper" }}>
      {sortedParcels.map((parcel, index) => {
        const statusKey = parcel.status?.toLowerCase() || "pending";
        const color = statusColors[statusKey] || "#c4cad0";

        const fullAddress = [
          parcel.street,
          parcel.barangay,
          parcel.municipality,
          parcel.province,
          parcel.region,
        ]
          .filter(Boolean)
          .join(", ");

        return (
          <Box key={parcel.id || index}>
            <ListItem alignItems="flex-start" sx={{ py: 2 }}>
              <ListItemAvatar>
                <Avatar sx={{ bgcolor: color }}>
                  <LocalShippingIcon />
                </Avatar>
              </ListItemAvatar>

              <ListItemText
                // ✅ Status + Driver stacked together
                primary={
                  <Stack spacing={0.5}>
                    <Chip
                      label={parcel.status || "Pending"}
                      size="small"
                      sx={{
                        backgroundColor: color,
                        color: "#fff",
                        fontSize: "0.75rem",
                        textTransform: "capitalize",
                        width: "fit-content",
                      }}
                    />
                    {parcel.driverName && (
                      <Typography
                        variant="body2"
                        color="text.secondary"
                        sx={{ fontWeight: 500 }}
                      >
                        Driver: {parcel.driverName}
                      </Typography>
                    )}
                  </Stack>
                }
                secondary={
                  <>
                    {parcel.id && (
                      <Typography variant="body2" color="text.secondary">
                        Parcel ID: {parcel.id}
                      </Typography>
                    )}
                    {parcel.reference && (
                      <Typography variant="body2" color="text.secondary">
                        Reference No: {parcel.reference}
                      </Typography>
                    )}
                    {parcel.recipient && (
                      <Typography variant="body2" color="text.secondary">
                        Recipient: {parcel.recipient}
                      </Typography>
                    )}
                    {fullAddress && (
                      <Typography variant="body2" color="text.secondary">
                        Address: {fullAddress}
                      </Typography>
                    )}
                    {parcel.dateAdded && (
                      <Typography variant="body2" color="text.secondary">
                        Date Added: {formatDate(parcel.dateAdded)}
                      </Typography>
                    )}
                  </>
                }
              />
            </ListItem>
            {index < sortedParcels.length - 1 && (
              <Divider variant="inset" component="li" />
            )}
          </Box>
        );
      })}
    </List>
  );
}
