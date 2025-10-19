import { useState } from "react";
import { Paper, Typography, Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";

export default function DeliveryVolumeChart({ dailyData = [], weeklyData = [] }) {
  const [view, setView] = useState("daily");

  const handleChange = (_, nextView) => {
    if (nextView) setView(nextView);
  };

  const selectedData = view === "daily" ? dailyData : weeklyData;
  const noData = !selectedData || selectedData.length === 0;

  return (
    <Paper elevation={3} sx={{ p: 2, height: 350, minWidth: 700 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Delivery Volume & Success Rate</Typography>
        <ToggleButtonGroup value={view} exclusive onChange={handleChange} size="small">
          <ToggleButton value="daily">Daily</ToggleButton>
          <ToggleButton value="weekly">Weekly</ToggleButton>
        </ToggleButtonGroup>
      </Box>
      {noData ? (
        <Box sx={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="body2" color="text.secondary">
            No data available
          </Typography>
        </Box>
      ) : (
        <Box sx={{ width: "100%", height: 280 }}>
          <LineChart
            xAxis={[
              {
                scaleType: "point",
                data: selectedData.map((p) => p.date),
                label: view === "daily" ? "Date" : "Week",
              },
            ]}
            series={[
              {
                data: selectedData.map((p) => p.deliveries),
                label: "Total Deliveries",
                color: "#1976d2",
                yAxisKey: "left",
              },
              {
                data: selectedData.map((p) => p.successRate ?? 0),
                label: "Success Rate (%)",
                color: "#29bf12",
                yAxisKey: "right",
              },
              {
                data: selectedData.map((p) => p.failedOrReturned ?? 0),
                label: "Failed / Returned",
                color: "#f21b3f",
                yAxisKey: "left",
              },
            ]}
            yAxis={[
              { id: "left", label: "Deliveries", min: 0 },
              { id: "right", label: "Success Rate (%)", min: 0, max: 100 },
            ]}
            height={280}
          />
        </Box>
      )}
    </Paper>
  );
}
