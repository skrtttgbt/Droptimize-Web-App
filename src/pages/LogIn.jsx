import { useState, useEffect } from "react";
import { Box, Paper, Stack, Typography, TextField, InputAdornment, IconButton, Button, Checkbox, Link } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { auth } from "/src/firebaseConfig";
import { signInWithEmailAndPassword, sendPasswordResetEmail } from "firebase/auth";

export default function LogInForm() {
  useEffect(() => {
    document.title = "Droptimize - Log In";
  }, []);

  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trimStart() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedData = {
      email: formData.email.trim(),
      password: formData.password.trim(),
    };

    const newErrors = {};
    if (!trimmedData.email) newErrors.email = "Email is required";
    if (!trimmedData.password) newErrors.password = "Password is required";

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailPattern.test(trimmedData.email)) {
      newErrors.email = "Invalid email format";
    }

    if (Object.keys(newErrors).length > 0) {
      setFieldErrors(newErrors);
      return;
    }

    setFieldErrors({});
    setError("");
    setLoading(true);

    try {
      await signInWithEmailAndPassword(auth, trimmedData.email, trimmedData.password);
      navigate("/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      const code = err.code || "";
      if (code.includes("user-not-found")) {
        setFieldErrors({ email: "No account found with this email" });
      } else if (code.includes("wrong-password")) {
        setFieldErrors({ password: "Incorrect password" });
      } else {
        setError("Login failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const email = formData.email.trim();
    if (!email) {
      setFieldErrors({ email: "Enter your email to reset password" });
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      alert("Password reset email sent! Please check your inbox.");
    } catch (err) {
      console.error("Password reset error:", err.message);
      setError("Failed to send password reset email.");
    }
  };

  return (
    <Box display="flex" justifyContent="center" alignItems="center" height="100vh">
      <Paper
        component="form"
        onSubmit={handleSubmit}
        sx={{
          p: 4,
          width: 320,
          borderRadius: "1rem",
          boxShadow: 3
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Box
            component="img"
            src="/logo.svg"
            alt="Droptimize Logo"
            sx={{
              maxWidth: 300,
              mb: 2
            }}
          />
          <Typography
            variant="h5"
            align="center"
            sx={{
              fontFamily: "LEMON MILK",
              fontWeight: "bold",
              color: "#00b2e1"
            }}
          >
            Log In
          </Typography>

          {error && (
            <Typography variant="body2" color="error" align="center">
              {error}
            </Typography>
          )}

          <TextField
            label="Email"
            name="email"
            type="email"
            variant="outlined"
            fullWidth
            value={formData.email}
            onChange={handleChange}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email || ""}
            size="small"
            sx={{
              mb: 2
            }}
          />

          <TextField
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            variant="outlined"
            fullWidth
            value={formData.password}
            onChange={handleChange}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password || ""}
            size="small"
            slotProps={{
              input: {
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                      {showPassword ? <VisibilityOff /> : <Visibility />}
                    </IconButton>
                  </InputAdornment>
                ),
              }
            }}
          />

          <Box display="flex" justifyContent="space-between" alignItems="center" width="100%">
            <Box display="flex" alignItems="center">
              <Checkbox
                color="primary"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                sx={{
                  p: 0,
                  mr: 1,
                  font: "inherit"
                }}
                id="rememberMe"
              />
              <Typography variant="body2">Remember me</Typography>
            </Box>

            <Link
              component="button"
              onClick={handleForgotPassword}
              underline="hover"
              sx={{
                fontSize: 14,
                color: "#00b2e1",
                fontWeight: 600,
                cursor: "pointer",
                background: "none",
                border: "none",
                p: 0,
              }}
            >
              Forgot Password?
            </Link>
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            sx={{
              height: "50px",
              borderRadius: "10px",
              backgroundImage: "linear-gradient(#00b2e1, #0064b5)",
              fontFamily: "LEMON MILK",
              fontSize: loading ? "16px" : "18px",
              padding: "1rem 2rem",
              margin: "1rem 0"
            }}
          >
            {loading ? "Logging in..." : "Log In"}
          </Button>

          <Typography variant="body2" align="center">
            Don"t have an account?{" "}
            <Link
              href="/signup"
              underline="hover"
              sx={{
                color: "#00b2e1",
                fontWeight: 600
              }}
            >
              Sign up
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
