import { Box, TextField, FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useState } from "react";
import SummaryCard from "./SummaryCard.jsx";

export default function ParcelsHeader({
  showSearch = false,
  showSort = false,
  onSearch,
  onSortChange,
  onStatusSelect,
  sortOptions = [],
  counts = { all: 0, pending: 0, delivered: 0, outForDelivery: 0, failed: 0 }
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState("");

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchQuery(value);
    onSearch?.(value);
  };

  const handleSortChange = (e) => {
    const value = e.target.value;
    setSelectedSort(value);
    onSortChange?.(value);
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
            label="Search (by ID or Ref. No.)"
            size="small"
            value={searchQuery}
            onChange={handleSearchChange}
          />
        )}

        {showSort && (
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel>Sort By</InputLabel>
            <Select
              value={selectedSort}
              label="Sort By"
              onChange={handleSortChange}
            >
              {sortOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        )}
      </Box>

      {/* Summary Cards */}
      <Box
        sx={{
          display: "flex",
          gap: 2,
          flexWrap: "wrap",
          justifyContent: "flex-start",
        }}
      >
        <SummaryCard title="All Parcels" count={counts.all} color="#0064b5" onClick={() => onStatusSelect?.("")} />
        <SummaryCard title="Pending" count={counts.pending} color="#c4cad0" onClick={() => onStatusSelect?.("Pending")} />
        <SummaryCard title="Delivered" count={counts.delivered} color="#29bf12" onClick={() => onStatusSelect?.("Delivered")} />
        <SummaryCard title="Out for Delivery" count={counts.outForDelivery} color="#ff9914" onClick={() => onStatusSelect?.("Out for Delivery")} />
        <SummaryCard title="Failed" count={counts.failed} color="#f21b3f" onClick={() => onStatusSelect?.("Failed")} />
      </Box>
    </Box>
  );
}
