import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  InputAdornment,
  IconButton,
  Link,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { verifyPasswordResetCode, confirmPasswordReset } from "firebase/auth";
import { auth } from "/src/firebaseConfig";

export default function ResetPasswordForm() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get("oobCode");

  const [formData, setFormData] = useState({
    newPassword: "",
    confirmNewPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [email, setEmail] = useState("");

  useEffect(() => {
    document.title = "Droptimize - Reset Password";

    if (!oobCode) {
      setError("Invalid or missing password reset code.");
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((email) => {
        setEmail(email);
      })
      .catch(() => {
        setError("The password reset link is invalid or has expired.");
      });
  }, [oobCode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trimStart() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { newPassword, confirmNewPassword } = formData;
    const errors = {};

    if (!newPassword) errors.newPassword = "New password is required";
    if (!confirmNewPassword) errors.confirmNewPassword = "Please confirm your new password";
    if (newPassword !== confirmNewPassword) errors.confirmNewPassword = "Passwords do not match";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError("");
    setLoading(true);

    try {
      await confirmPasswordReset(auth, oobCode, newPassword);
      setSuccess(true);
    } catch (err) {
      console.error(err);
      setError("Failed to reset password. The link may have expired.");
    }

    setLoading(false);
  };
    if (!oobCode) {
    return (
        <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Paper sx={{ p: 4, width: 320, borderRadius: "1rem", boxShadow: 3 }}>
            <Typography
            variant="h6"
            align="center"
            sx={{ fontFamily: "LEMON MILK", fontWeight: "bold", color: "#f44336" }}
            >
            Invalid Reset Link
            </Typography>
            <Typography align="center" sx={{ mt: 2 }}>
            The password reset link is missing or incorrect.
            </Typography>
            <Button
            fullWidth
            variant="contained"
            sx={{ mt: 3, backgroundImage: "linear-gradient(#00b2e1, #0064b5)" }}
            onClick={() => navigate("/login")}
            >
            Go to Login
            </Button>
        </Paper>
        </Box>
    );
    }

  if (success) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
        <Paper sx={{ p: 4, width: 320, borderRadius: "1rem", boxShadow: 3 }}>
          <Typography
            variant="h5"
            align="center"
            sx={{ fontFamily: "LEMON MILK", fontWeight: "bold", color: "#00b2e1" }}
          >
            Password Reset Successful
          </Typography>
          <Typography align="center" sx={{ mt: 2 }}>
            Your password has been updated. You can now{" "}
            <Link href="/login" underline="hover" sx={{ color: "#00b2e1", fontWeight: 600 }}>
              log in
            </Link>
            .
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <Paper component="form" onSubmit={handleSubmit} sx={{ p: 4, width: 320, borderRadius: "1rem", boxShadow: 3 }}>
        <Stack spacing={2} alignItems="center">
          <Box component="img" src="/logo.svg" alt="Droptimize Logo" sx={{ maxWidth: 300, mb: 2 }} />
          <Typography
            variant="h5"
            align="center"
            sx={{ fontFamily: "LEMON MILK", fontWeight: "bold", color: "#00b2e1" }}
          >
            Set New Password
          </Typography>

          {error && (
            <Typography color="error" align="center" sx={{ fontSize: "0.9rem" }}>
              {error}
            </Typography>
          )}

          <TextField
            label="New Password"
            name="newPassword"
            type={showPassword ? "text" : "password"}
            value={formData.newPassword}
            onChange={handleChange}
            error={!!fieldErrors.newPassword}
            helperText={fieldErrors.newPassword}
            fullWidth
            size="small"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((p) => !p)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <TextField
            label="Confirm New Password"
            name="confirmNewPassword"
            type={showConfirm ? "text" : "password"}
            value={formData.confirmNewPassword}
            onChange={handleChange}
            error={!!fieldErrors.confirmNewPassword}
            helperText={fieldErrors.confirmNewPassword}
            fullWidth
            size="small"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowConfirm((p) => !p)} edge="end">
                      {showConfirm ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              },
            }}
          />

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              height: 50,
              borderRadius: "10px",
              backgroundImage: "linear-gradient(#00b2e1, #0064b5)",
              fontFamily: "LEMON MILK",
              fontSize: loading ? "16px" : "18px",
              padding: "1rem 2rem",
              mt: 2,
            }}
          >
            {loading ? "Resetting..." : "Reset Password"}
          </Button>
        </Stack>
      </Paper>
    </Box>
  );
}
