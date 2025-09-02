import { Button } from "@mui/material";
import ReportProblemIcon from "@mui/icons-material/ReportProblem";

export default function GiveWarningButton({ onClick }) {
  return (
    <Button
      size="small"
      color="error"
      variant="outlined"
      startIcon={<ReportProblemIcon />}
      onClick={onClick}
      sx={{ textTransform: "none" }}
    >
      Give Warning
    </Button>
  );
}
