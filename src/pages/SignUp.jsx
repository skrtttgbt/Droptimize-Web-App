import { useState, useEffect } from "react";
import { Box, Paper, Stack, Typography, TextField, Button, InputAdornment, IconButton, Link } from "@mui/material";
import { Visibility, VisibilityOff } from "@mui/icons-material";
import { auth } from "/src/firebaseConfig";
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from "firebase/auth";
import SignUpSuccessMessage from "/src/components/SignUpSuccessMessage.jsx";
import { registerUser } from "../firebaseConfig";

export default function SignUpForm() {
  useEffect(() => {
    document.title = "Droptimize - Sign Up";
  }, []);

  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [fieldErrors, setFieldErrors] = useState({});
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value.trimStart() }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const { firstName, lastName, email, password, confirmPassword } = formData;
    const errors = {};

    if (!firstName) errors.firstName = "First name is required";
    if (!lastName) errors.lastName = "Last name is required";
    if (!email) errors.email = "Email is required";
    if (!password) errors.password = "Password is required";
    if (!confirmPassword) errors.confirmPassword = "Please confirm your password";
    if (password !== confirmPassword) errors.confirmPassword = "Passwords do not match";

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (email && !emailPattern.test(email)) errors.email = "Invalid email format";

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setError("");
    setLoading(true);


      const result = await registerUser(formData);
      if (result.success) {
        
        setSuccess(true);
      } else {
        if (result.error.code === "auth/email-already-in-use") {
        setFieldErrors({ email: "This email is already registered" });
        } else {
          setError(result.error?.message || "Something went wrong.");
        }
      }
      setLoading(false);
  };

  if (success) {
    return <SignUpSuccessMessage />;
  }

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
            Sign Up
          </Typography>

          {error && (
            <Typography color="error" align="center" sx={{ fontSize: "0.9rem" }}>
              {error}
            </Typography>
          )}

          <TextField
            label="First Name"
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            error={!!fieldErrors.firstName}
            helperText={fieldErrors.firstName}
            fullWidth
            size="small"
          />
          <TextField
            label="Last Name"
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            error={!!fieldErrors.lastName}
            helperText={fieldErrors.lastName}
            fullWidth
            size="small"
          />
          <TextField
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            onChange={handleChange}
            error={!!fieldErrors.email}
            helperText={fieldErrors.email}
            fullWidth
            size="small"
          />
          <TextField
            label="Password"
            name="password"
            type={showPassword ? "text" : "password"}
            value={formData.password}
            onChange={handleChange}
            error={!!fieldErrors.password}
            helperText={fieldErrors.password}
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
              }
            }}
          />
          <TextField
            label="Confirm Password"
            name="confirmPassword"
            type={showConfirm ? "text" : "password"}
            value={formData.confirmPassword}
            onChange={handleChange}
            error={!!fieldErrors.confirmPassword}
            helperText={fieldErrors.confirmPassword}
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
              }
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
            {loading ? "Registering..." : "Register"}
          </Button>

          <Typography variant="body2" align="center">
            Already have an account?{" "}
            <Link
              href="/login"
              underline="hover"
              sx={{ color: "#00b2e1", fontWeight: 600 }}
            >
              Log in
            </Link>
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
