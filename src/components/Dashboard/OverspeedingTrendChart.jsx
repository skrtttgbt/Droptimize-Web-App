import { useState } from "react";
import { Paper, Typography, Box, ToggleButton, ToggleButtonGroup } from "@mui/material";
import { LineChart } from "@mui/x-charts/LineChart";

export default function OverspeedingTrendChart({ dailyData = [], weeklyData = [] }) {
  const [view, setView] = useState("daily");

  const handleChange = (_, nextView) => nextView && setView(nextView);
  const selectedData = view === "daily" ? dailyData : weeklyData;
  const noData = !selectedData || selectedData.length === 0;

  return (
    <Paper elevation={3} sx={{ p: 2, height: 350, minWidth: 700 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
        <Typography variant="h6">Average Driver Speed</Typography>
        <ToggleButtonGroup value={view} exclusive onChange={handleChange} size="small">
          <ToggleButton value="daily">Daily</ToggleButton>
          <ToggleButton value="weekly">Weekly</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {noData ? (
        <Box sx={{ height: 280, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Typography variant="body2" color="text.secondary">No data available</Typography>
        </Box>
      ) : (
        <Box sx={{ width: "100%", height: 280 }}>
          <LineChart
            xAxis={[{ scaleType: "point", data: selectedData.map(p => p.date), label: view === "daily" ? "Date" : "Week" }]}
            series={[
              {
                data: selectedData.map(p => p.topSpeed),
                label: "Top Speed (km/h)",
                color: "#0064b5",
                yAxisKey: "right",
              },
              {
                data: selectedData.map(p => p.violations),
                label: "Overspeeding Violations",
                color: "#f21b3f",
                yAxisKey: "left",
              },
            ]}
            yAxis={[
              { id: "left", label: "Incidents", min: 0 },
              { id: "right", label: "Avg Speed (km/h)", min: 0 },
            ]}
            height={260}
          />
        </Box>
      )}
    </Paper>
  );
}
