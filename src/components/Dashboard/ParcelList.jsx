import { List, ListItem, ListItemText, ListItemAvatar, Avatar, Typography, Chip, Divider, Box } from "@mui/material";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";

const statusColors = {
  Delivered: "#29bf12",
  Failed: "#f21b3f",
  "Out for Delivery": "#ff9914",
  Pending: "#c4cad0",
};

const statusOrder = ["Pending", "Out for Delivery", "Delivered", "Failed"];

export default function ParcelList({ parcels = [] }) {
  // If no parcels are provided, show a message
  if (parcels.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        No parcels found.
      </Typography>
    );
  }

  // Sort parcels by status
  const sortedParcels = [...parcels].sort(
    (a, b) => statusOrder.indexOf(a.status) - statusOrder.indexOf(b.status)
  );

  return (
    <List sx={{ width: "100%", bgcolor: "background.paper" }}>
      {sortedParcels.map((parcel, index) => (
        <Box key={parcel.id}>
          <ListItem alignItems="flex-start" sx={{ py: 2 }}>
            <ListItemAvatar>
              <Avatar sx={{ bgcolor: statusColors[parcel.status] || "#c4cad0" }}>
                <LocalShippingIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Chip
                  label={parcel.status}
                  size="small"
                  sx={{
                    backgroundColor: statusColors[parcel.status] || "#c4cad0",
                    color: "#fff",
                    fontSize: "0.75rem",
                  }}
                />
              }
              secondary={
                <>
                  <Typography variant="body2" color="text.secondary">
                    Parcel ID: {parcel.id}
                  </Typography>
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
                  {parcel.address && (
                    <Typography variant="body2" color="text.secondary">
                      Address: {parcel.address}
                    </Typography>
                  )}
                  {parcel.dateAdded && (
                    <Typography variant="body2" color="text.secondary">
                      Date Added: {new Date(parcel.dateAdded).toLocaleDateString()}
                    </Typography>
                  )}
                </>
              }
            />
          </ListItem>
          {index < sortedParcels.length - 1 && <Divider variant="inset" component="li" />}
        </Box>
      ))}
    </List>
  );
}
