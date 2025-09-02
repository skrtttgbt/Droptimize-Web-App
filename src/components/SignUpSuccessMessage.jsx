import { Box, Paper, Typography, CircularProgress } from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SignUpSuccessMessage({ redirectTo = "/account-setup", delay = 3000 }) {
  const navigate = useNavigate();

  // Redirect after delay
  useEffect(() => {
    const timer = setTimeout(() => navigate(redirectTo), delay);
    return () => clearTimeout(timer);
  }, [redirectTo, delay, navigate]);

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <Paper elevation={3} sx={{ p: 4, textAlign: "center", borderRadius: 2 }}>
        <CheckCircleIcon sx={{ fontSize: 60, color: "#29bf12", mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: "bold", mb: 1 }}>
          Registration Successful!
        </Typography>
        <Typography variant="body1" sx={{ mb: 1 }}>
          A verification email has been sent to your inbox.
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Redirecting to account setup...
        </Typography>
        <Box mt={2}>
          <CircularProgress size={24} color="primary" />
        </Box>
      </Paper>
    </Box>
  );
}
