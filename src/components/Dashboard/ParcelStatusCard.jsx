import { Paper, Typography, Box, Divider } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";

export default function ParcelStatusCard({ delivered = 0, pending = 0, outForDelivery = 0, failedOrReturned = 0 }) {
  const data = [
    { id: "Delivered", value: delivered, color: "#29bf12" },
    { id: "Out for Delivery", value: outForDelivery, color: "#ff9914" },
    { id: "Failed / Returned", value: failedOrReturned, color: "#f21b3f" },
    { id: "Pending", value: pending, color: "#c4cad0" }
  ];

  const total = delivered + pending + outForDelivery + failedOrReturned;
  if (total === 0) return null;

  return (
    <Paper elevation={3} sx={{ p: 2, height: "100%" }}>
      <Typography variant="h6" gutterBottom align="center">
        Parcel Status Breakdown
      </Typography>

      <Box sx={{ width: 300, height: "100%", mx: "auto" }}>
        <PieChart
          series={[{
            data: data.map(({ id, value }) => ({ id, value }))
          }]}
          width={240}
          height={240}
          colors={data.map(d => d.color)}
          valueFormatter={value => `${((value / total) * 100).toFixed(0)}%`}
        />

        <Box sx={{ textAlign: "center", mt: 2 }}>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            Total Parcels: {total}
          </Typography>
          <Divider sx={{ mb: 1 }} />

          {data.map(({ id, value, color }) => (
            <Box
              key={id}
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 1,
                mb: 0.5
              }}
            >
              <Box
                sx={{
                  width: 10,
                  height: 10,
                  borderRadius: "50%",
                  backgroundColor: color
                }}
              />
              <Typography variant="body2" color="textSecondary">
                {id}: {value}
              </Typography>
            </Box>
          ))}
        </Box>
      </Box>
    </Paper>
  );
}
