import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  InputAdornment,
  IconButton,
  Button,
  Checkbox,
  Link,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
} from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { useNavigate } from "react-router-dom";
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import { checkAuth, auth } from "../firebaseConfig";

// Sample loginUser function using Firebase
import { signInWithEmailAndPassword } from "firebase/auth";

async function loginUser(email, password) {
  try {
    await signInWithEmailAndPassword(auth, email, password);
    return { success: true };
  } catch (error) {
    return { success: false, error };
  }
}

export default function LogInForm() {
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  // Forgot Password modal state
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    document.title = "Droptimize - Log In";
    checkAuth().then(({ authenticated }) => {
      if (authenticated) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trimStart() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const trimmedEmail = formData.email.trim().toLowerCase();
    const trimmedPassword = formData.password.trim();

    const newErrors = {};
    if (!trimmedEmail) newErrors.email = "Email is required";
    if (!trimmedPassword) newErrors.password = "Password is required";

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (trimmedEmail && !emailPattern.test(trimmedEmail)) {
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
      const { success, error } = await loginUser(trimmedEmail, trimmedPassword);

      if (success) {
        navigate("/dashboard");
      } else {
        console.log("Login error code:", error.code); // Debug log
        const code = error.code || "";
        if (code.includes("auth/user-not-found")) {
          setFieldErrors({ email: "No account found with this email" });
        } else if (code.includes("auth/wrong-password")) {
          setFieldErrors({ password: "Incorrect password" });
        } else {
          setError("Login failed. Please try again.");
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const openForgotPassword = () => {
    setResetEmail(formData.email.trim().toLowerCase());
    setResetError("");
    setResetSuccess(false);
    setForgotPasswordOpen(true);
  };

  const closeForgotPassword = () => {
    setForgotPasswordOpen(false);
    setResetError("");
    setResetSuccess(false);
  };

const handleResetPassword = async () => {
  if (!resetEmail) {
    setResetError("Please enter your email.");
    return;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailPattern.test(resetEmail.trim())) {
    setResetError("Invalid email format.");
    return;
  }

  setResetError("");
  setResetLoading(true);

  try {
    const email = resetEmail.trim();

    const signInMethods = await fetchSignInMethodsForEmail(auth, email);
    console.log("Forgot password - signInMethods:", signInMethods);

    if (signInMethods.length === 0) {
      setResetError("No account found with this email.");
      setResetLoading(false);
      return;
    }

    await sendPasswordResetEmail(auth, email);
    setResetSuccess(true);
  } catch (err) {
    setResetError(err.message || "Failed to send reset email.");
  } finally {
    setResetLoading(false);
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
          boxShadow: 3,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Box
            component="img"
            src="/logo.svg"
            alt="Droptimize Logo"
            sx={{
              maxWidth: 300,
              mb: 2,
            }}
          />
          <Typography
            variant="h5"
            align="center"
            sx={{
              fontFamily: "LEMON MILK",
              fontWeight: "bold",
              color: "#00b2e1",
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
            sx={{ mb: 2 }}
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
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={() => setShowPassword((prev) => !prev)} edge="end">
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              ),
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
                  font: "inherit",
                }}
                id="rememberMe"
              />
              <Typography variant="body2">Remember me</Typography>
            </Box>

            <Link
              component="button"
              onClick={openForgotPassword}
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
              margin: "1rem 0",
            }}
          >
            {loading ? "Logging in..." : "Log In"}
          </Button>

          <Typography variant="body2" align="center">
            Don&apos;t have an account?{" "}
            <Link
              href="/signup"
              underline="hover"
              sx={{
                color: "#00b2e1",
                fontWeight: 600,
              }}
            >
              Sign up
            </Link>
          </Typography>
        </Stack>

        {/* Forgot Password Modal */}
        <Dialog open={forgotPasswordOpen} onClose={closeForgotPassword}>
          <DialogTitle>Reset Password</DialogTitle>
          <DialogContent>
            {resetSuccess ? (
              <Typography sx={{ mt: 1 }}>
                Password reset email sent! Please check your inbox.
              </Typography>
            ) : (
              <>
                <TextField
                  autoFocus
                  margin="dense"
                  label="Email Address"
                  type="email"
                  fullWidth
                  variant="outlined"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value.trimStart().toLowerCase())}
                  error={!!resetError}
                  helperText={resetError}
                  disabled={resetLoading}
                />
              </>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={closeForgotPassword} disabled={resetLoading}>
              OK
            </Button>
            {!resetSuccess && (
              <Button onClick={handleResetPassword} disabled={resetLoading} variant="contained">
                {resetLoading ? <CircularProgress size={20} /> : "Send Reset Email"}
              </Button>
            )}
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
}
