import { Box, TextField } from "@mui/material";
import { useState } from "react";
import SummaryCard from "./SummaryCard.jsx";

export default function DriversHeader({
  showSearch = false,
  onSearch,
  onStatusSelect,
  counts = { all: 0, available: 0, delivering: 0, offline: 0 },
}) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "flex-start",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 2,
          mb: 1,
        }}
      >
        {showSearch && (
          <TextField
            label="Search (by Name or ID)"
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        )}
      </Box>

      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          justifyContent: "flex-start",
        }}
      >
        <SummaryCard
          title="All Drivers"
          count={counts.all}
          color="#0064b5"
          onClick={() => onStatusSelect("")}
        />
        <SummaryCard
          title="Available"
          count={counts.available}
          color="#29bf12"
          onClick={() => onStatusSelect("Available")}
        />
        <SummaryCard
          title="Delivering"
          count={counts.delivering}
          color="#ff9914"
          onClick={() => onStatusSelect("Delivering")}
        />
        <SummaryCard
          title="Offline"
          count={counts.offline}
          color="#c4cad0"
          onClick={() => onStatusSelect("Offline")}
        />
      </Box>
    </Box>
  );
}
