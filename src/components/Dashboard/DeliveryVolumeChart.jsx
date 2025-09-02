import { useState } from "react";
import { Paper, Typography, Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";

export default function DeliveryVolumeChart({ dailyData = [], weeklyData = [] }) {
  const [view, setView] = useState("daily");  // State to manage the view (daily/weekly)

  // Handle view change
  const handleChange = (_, nextView) => {
    if (nextView !== null) {
      setView(nextView);
    }
  };

  // Calculate success rate
  const successRate = (deliveries, failedOrReturned) => {
    if (deliveries === 0) return 0;
    return ((deliveries - failedOrReturned) / deliveries) * 100;
  };

  // Fallback data for daily view
  const fallbackDaily = [
    { date: "2024-06-01", deliveries: 40, successRate: successRate(40, 5).toFixed(2), failedOrReturned: 5 },
    { date: "2024-06-02", deliveries: 30, successRate: successRate(30, 3).toFixed(2), failedOrReturned: 3 },
    { date: "2024-06-03", deliveries: 50, successRate: successRate(50, 6).toFixed(2), failedOrReturned: 6 },
    { date: "2024-06-04", deliveries: 65, successRate: successRate(65, 4).toFixed(2), failedOrReturned: 4 },
    { date: "2024-06-05", deliveries: 45, successRate: successRate(45, 2).toFixed(2), failedOrReturned: 2 },
    { date: "2024-06-06", deliveries: 70, successRate: successRate(70, 5).toFixed(2), failedOrReturned: 5 },
    { date: "2024-06-07", deliveries: 60, successRate: successRate(60, 3).toFixed(2), failedOrReturned: 3 },
  ];

  // Fallback data for weekly view
  const fallbackWeekly = [
    { date: "Week 1", deliveries: 250, successRate: successRate(250, 18).toFixed(2), failedOrReturned: 18 },
    { date: "Week 2", deliveries: 300, successRate: successRate(300, 15).toFixed(2), failedOrReturned: 15 },
    { date: "Week 3", deliveries: 275, successRate: successRate(275, 20).toFixed(2), failedOrReturned: 20 },
    { date: "Week 4", deliveries: 320, successRate: successRate(320, 10).toFixed(2), failedOrReturned: 10 },
  ];

  // Select the appropriate data based on the view
  const selectedData = view === "daily"
      ? dailyData.length
        ? dailyData
        : fallbackDaily
      : weeklyData.length
        ? weeklyData
        : fallbackWeekly;

  // Map the selected data to the chart format
  const xAxis = selectedData.map((point) => point.date);
  const deliveries = selectedData.map((point) => point.deliveries);
  const successRates = selectedData.map((point) => point.successRate);
  const failedOrReturned = selectedData.map((point) => point.failedOrReturned || 0);

  return (
    <Paper elevation={3} sx={{ p: 2, height: "100%", maxHeight: 350, minWidth: 700 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">
          Delivery Volume & Success Rate
        </Typography>
        <ToggleButtonGroup
          value={view}
          exclusive
          onChange={handleChange}
          size="small"
        >
          <ToggleButton value="daily">Daily</ToggleButton>
          <ToggleButton value="weekly">Weekly</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      <Box sx={{ width: "100%", height: 350 }}>
        <LineChart
          xAxis={[{ scaleType: "point", data: xAxis, label: view === "daily" ? "Date" : "Week" }]}
          series={[
            {
              data: deliveries,
              label: "Total Deliveries",
              color: "#1976d2",
              yAxisKey: "left",
            },
            {
              data: successRates,
              label: "Success Rate (%)",
              color: "#29bf12",
              yAxisKey: "right",
            },
            {
              data: failedOrReturned,
              label: "Failed / Returned",
              color: "#f21b3f",
              yAxisKey: "left",
              showMark: true,
            },
          ]}
          yAxis={[
            { id: "left", label: "Deliveries", min: 0 },
            { id: "right", label: "Success Rate (%)", min: 0, max: 100 },
          ]}
          height={280}
        />
      </Box>
    </Paper>
  );
}
