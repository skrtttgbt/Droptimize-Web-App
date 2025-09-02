import { Box, Paper, Typography, CircularProgress, Fade } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

export default function SuccessMessage({ open = false }) {
  if (!open) return null;

  return (
    <Fade in={open}>
      <Box
        position="fixed"
        top={0}
        left={0}
        width="100vw"
        height="100vh"
        bgcolor="rgba(0,0,0,0.5)"
        display="flex"
        justifyContent="center"
        alignItems="center"
        zIndex={1300}
      >
        <Paper elevation={4} sx={{ p: 4, textAlign: "center", borderRadius: 2, minWidth: 300 }}>
          <CheckCircleIcon sx={{ fontSize: 60, color: "#29bf12", mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
            Success!
          </Typography>
          <Typography variant="body1" sx={{ mb: 3 }}>
            Your account information has been saved.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Redirecting to your dashboard...
          </Typography>
          <Box mt={2}>
            <CircularProgress size={24} color="primary" />
          </Box>
        </Paper>
      </Box>
    </Fade>
  );
}
