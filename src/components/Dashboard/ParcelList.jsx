import { List, ListItem, ListItemText, ListItemAvatar, Avatar, Typography, Chip, Divider, Box, Skeleton } from "@mui/material";
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
  // If loading, show skeleton
  useEffect(()=>{
    console.log(parcels)
  },[])
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
              <Avatar sx={{ bgcolor: statusColors[parcel.status?.toLowerCase()] || "#c4cad0" }}>
                <LocalShippingIcon />
              </Avatar>
            </ListItemAvatar>
            <ListItemText
              primary={
                <Chip
                  label={parcel.status}
                  size="small"
                  sx={{
                    backgroundColor: statusColors[parcel.status?.toLowerCase()] || "#c4cad0",
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
                      Date Added: {parcel.dateAdded instanceof Date 
                        ? parcel.dateAdded.toLocaleDateString() 
                        : typeof parcel.dateAdded.toDate === 'function'
                          ? parcel.dateAdded.toDate().toLocaleDateString()
                          : new Date(parcel.dateAdded).toLocaleDateString()}
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
