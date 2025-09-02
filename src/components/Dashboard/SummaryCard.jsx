import { Paper, Typography } from "@mui/material";

export default function SummaryCard({ title, count, color, onClick, selected }) {
  return (
    <Paper
      elevation={selected ? 4 : 2}
      onClick={onClick}
      sx={{
        p: 1,
        width: 100,
        height: 40,
        border: `2px solid ${color}`,
        borderRadius: 2,
        bgcolor: selected ? `${color}10` : "#ffffff",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
        "&:hover": {
          bgcolor: `${color}22`,
        },
      }}
    >
      <Typography variant="caption" sx={{ color, lineHeight: 1 }}>
        {title}
      </Typography>
      <Typography variant="subtitle2" fontWeight="bold" sx={{ color, lineHeight: 1 }}>
        {count}
      </Typography>
    </Paper>
  );
}
