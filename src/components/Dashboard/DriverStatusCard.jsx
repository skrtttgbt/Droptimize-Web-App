import { Paper, Typography, Box, Divider } from "@mui/material";
import { PieChart } from "@mui/x-charts/PieChart";

export default function DriverStatusCard({ drivers }) {
  // Extract values from the drivers object
  const available = drivers?.available || 0;
  const onTrip = drivers?.onTrip || 0;
  const offline = drivers?.offline || 0;

  const data = [
    { id: "Available", value: available, color: "#29bf12" },
    { id: "Delivering", value: onTrip, color: "#ff9914" },
    { id: "Offline", value: offline, color: "#c4cad0" },
  ];

  const total = available + onTrip + offline;
  const isEmpty = total === 0;

  return (
    <Paper
      elevation={3}
      sx={{
        p: 2,
        height: 350,
        width: 300,
        mx: "auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
    >
      <Typography variant="h6" gutterBottom align="center">
        Driver Status Breakdown
      </Typography>

      {isEmpty ? (
        <Box
          sx={{
            flexGrow: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
          }}
        >
          <Typography variant="body2">No data available</Typography>
        </Box>
      ) : (
        <Box sx={{ width: 300, mx: "auto", textAlign: "center" }}>
          <PieChart
            series={[{ data: data.map(({ id, value }) => ({ id, value })) }]}
            width={200}
            height={200}
            colors={data.map((d) => d.color)}
            valueFormatter={(value) => `${((value / total) * 100).toFixed(0)}%`}
          />

          <Box sx={{ textAlign: "center", mt: 2 }}>
            <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
              Total Drivers: {total}
            </Typography>
            <Divider sx={{ mb: 1 }} />
        <Box
              sx={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                justifyItems: "center",
                rowGap: 0.5,
              }}
            >
            {data.map(({ id, value, color }) => (
              <Box
                  key={id}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.5,
                  }}
                >
                  <Box
                    sx={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      backgroundColor: color,
                    }}
                  />
                  <Typography variant="body2" color="textSecondary">
                    {id}: {value}
                  </Typography>
                </Box>
            ))}
          </Box>
          </Box>
        </Box>
      )}
    </Paper>
  );
}
