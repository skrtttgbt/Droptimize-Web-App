import { useState } from "react";
import { Paper, Typography, Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";

export default function OverspeedingTrendChart({ dailyData = [], weeklyData = [] }) {
  const [view, setView] = useState("daily");

  const handleChange = (_, nextView) => {
    if (nextView !== null) setView(nextView);
  };

  // Example fallback data
  const fallbackDaily = [
    { date: "2024-06-01", incidents: 3, avgSpeed: 62 },
    { date: "2024-06-02", incidents: 5, avgSpeed: 67 },
    { date: "2024-06-03", incidents: 2, avgSpeed: 59 },
    { date: "2024-06-04", incidents: 6, avgSpeed: 72 },
    { date: "2024-06-05", incidents: 4, avgSpeed: 65 },
    { date: "2024-06-06", incidents: 1, avgSpeed: 58 },
    { date: "2024-06-07", incidents: 2, avgSpeed: 61 },
  ];

  const fallbackWeekly = [
    { date: "Week 1", incidents: 18, avgSpeed: 64 },
    { date: "Week 2", incidents: 12, avgSpeed: 60 },
    { date: "Week 3", incidents: 22, avgSpeed: 68 },
    { date: "Week 4", incidents: 15, avgSpeed: 63 },
  ];

  const data =
    view === "daily"
      ? dailyData.length ? dailyData : fallbackDaily
      : weeklyData.length ? weeklyData : fallbackWeekly;

  const xAxis = data.map((point) => point.date);
  const incidents = data.map((point) => point.incidents);
  const avgSpeeds = data.map((point) => point.avgSpeed);

  return (
    <Paper elevation={3} sx={{ p: 2, height: "100%", maxHeight: 350, minWidth: 700 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">
          Average Driver Speed
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

      <Box sx={{ width: "100%", height: 300 }}>
        <LineChart
          xAxis={[{ scaleType: "point", data: xAxis, label: view === "daily" ? "Date" : "Week" }]}
          series={[
            {
              data: avgSpeeds,
              label: "Average Speed (km/h)",
              color: "#0064b5",
              yAxisKey: "right",
              showMark: true,
            },
            {
              data: incidents,
              label: "Overspeeding Incidents",
              color: "#f21b3f",
              yAxisKey: "left",
              showMark: true,
            },
          ]}
          yAxis={[
            { id: "left", label: "Incidents", min: 0 },
            { id: "right", label: "Avg Speed (km/h)", min: 0 },
          ]}
          height={260}
        />
      </Box>
    </Paper>
  );
}
