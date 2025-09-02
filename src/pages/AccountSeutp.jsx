import { useEffect, useState } from "react";
import { Stack, Typography, TextField, Select, MenuItem, Box, Divider, InputAdornment, Paper, Button } from "@mui/material";
import { TimePicker } from "@mui/x-date-pickers";
import PersonIcon from "@mui/icons-material/Person";
import BusinessIcon from "@mui/icons-material/Business";
import { useNavigate } from "react-router-dom";
import { auth, db } from "/src/firebaseConfig";
import { doc, setDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import SuccessMessage from "../components/SuccessMessage.jsx";

export default function AccountSetup() {
  useEffect(() => {
    document.title = "Account Setup";
  }, []);

  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    fullName: "",
    role: "admin",
    email: "",
    contactNumber: "",
    countryCode: "+63",
    branchName: "",
    branchAddress: "",
    operatingArea: "",
    openingTime: null,
    closingTime: null,
  });

  const [userId, setUserId] = useState("");
  const [errors, setErrors] = useState({});
  const [isValid, setIsValid] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  // Fetch Firebase user info on mount
  useEffect(() => {
    const fetchUser = async () => {
      try {
        const user = auth.currentUser;
        if (user) {
          setUserId(user.uid);
          setFormData((prev) => ({
            ...prev,
            fullName: user.displayName || "",
            email: user.email || "",
          }));
        }
      } catch (err) {
        console.error("Failed to get Firebase user:", err);
      }
    };
    fetchUser();
  }, []);

  // Validate form
  useEffect(() => {
    const newErrors = {};
    if (!formData.contactNumber?.trim()) {
      newErrors.contactNumber = "Contact number is required";
    } else if (!/^\d{10}$/.test(formData.contactNumber)) {
      newErrors.contactNumber = "Must be 10 digits (e.g. 9123456789)";
    }

    if (!formData.branchName?.trim()) newErrors.branchName = "Branch name is required";
    if (!formData.branchAddress?.trim()) newErrors.branchAddress = "Branch address is required";
    if (!formData.operatingArea?.trim()) newErrors.operatingArea = "Operating area is required";
    if (!formData.openingTime || !formData.closingTime) {
      newErrors.operatingHours = "Both opening and closing times are required";
    }

    setErrors(newErrors);
    setIsValid(Object.keys(newErrors).length === 0);
  }, [formData]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    if (!isValid || !userId) return;

    try {
      const branchRef = await addDoc(collection(db, "branches"), {
        adminId: userId,
        branchName: formData.branchName,
        branchAddress: formData.branchAddress,
        operatingArea: formData.operatingArea,
        openingTime: formData.openingTime?.format("HH:mm") || "",
        closingTime: formData.closingTime?.format("HH:mm") || "",
        createdAt: serverTimestamp(),
      });

      await setDoc(doc(db, "users", userId), {
        fullName: formData.fullName,
        email: formData.email,
        contactNumber: formData.contactNumber,
        role: "admin",
        branchId: branchRef.id,
        createdAt: serverTimestamp(),
      });

      setSubmitted(true);
      setTimeout(() => navigate("/dashboard"), 3000);
    } catch (error) {
      console.error("Error creating Firestore document:", error);
    }
  };

  return (
    <>
      {submitted && <SuccessMessage open />}
      <Box display="flex" justifyContent="center" mt={4}>
        <Paper sx={{ p: 3, width: 400, borderRadius: "1rem", boxShadow: 3 }}>
          <Stack spacing={4}>
            <Typography
              variant="h4"
              align="center"
              sx={{
                fontFamily: "LEMON MILK",
                fontWeight: "bold",
                color: "#00b2e1",
              }}
            >
              Account Setup
            </Typography>

            {/* Basic Info */}
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 2, backgroundColor: "#f9f9f9" }}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <PersonIcon sx={{ color: "#00b2e1", mr: 1 }} />
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: "LEMON MILK",
                    fontWeight: "bold",
                    color: "#00b2e1",
                  }}
                >
                  Basic Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <TextField
                  label="Full Name"
                  value={formData.fullName}
                  disabled
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  label="Email"
                  value={formData.email}
                  disabled
                  fullWidth
                  variant="outlined"
                />
                <TextField
                  name="contactNumber"
                  label="Contact Number"
                  value={formData.contactNumber}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  error={!!errors.contactNumber}
                  helperText={errors.contactNumber}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <Select
                            value={formData.countryCode}
                            onChange={(e) =>
                              setFormData((prev) => ({
                                ...prev,
                                countryCode: e.target.value,
                              }))
                            }
                            variant="standard"
                            disableUnderline
                            sx={{ mr: 1, fontSize: "0.9rem" }}
                          >
                            <MenuItem value="+63">🇵🇭 +63</MenuItem>
                            <MenuItem value="+1">🇺🇸 +1</MenuItem>
                            <MenuItem value="+44">🇬🇧 +44</MenuItem>
                          </Select>
                        </InputAdornment>
                      ),
                    }
                  }}
                />
              </Stack>
            </Paper>

            {/* Branch Info */}
            <Paper
              elevation={0}
              sx={{ p: 3, borderRadius: 2, backgroundColor: "#f9f9f9" }}
            >
              <Box display="flex" alignItems="center" mb={2}>
                <BusinessIcon sx={{ color: "#00b2e1", mr: 1 }} />
                <Typography
                  variant="h6"
                  sx={{
                    fontFamily: "LEMON MILK",
                    fontWeight: "bold",
                    color: "#00b2e1",
                  }}
                >
                  Branch Information
                </Typography>
              </Box>
              <Divider sx={{ mb: 2 }} />
              <Stack spacing={2}>
                <TextField
                  name="branchName"
                  label="Branch Name"
                  value={formData.branchName}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  error={!!errors.branchName}
                  helperText={errors.branchName}
                />
                <TextField
                  name="branchAddress"
                  label="Branch Address"
                  value={formData.branchAddress}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  error={!!errors.branchAddress}
                  helperText={errors.branchAddress}
                />
                <TextField
                  name="operatingArea"
                  label="Operating Area"
                  value={formData.operatingArea}
                  onChange={handleChange}
                  fullWidth
                  variant="outlined"
                  error={!!errors.operatingArea}
                  helperText={errors.operatingArea}
                />
                <Box display="flex" gap={2}>
                  <TimePicker
                    label="Opening Time"
                    value={formData.openingTime || null}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, openingTime: val }))
                    }
                    slotProps={{
                      textField: { variant: "outlined", fullWidth: true },
                    }}
                  />
                  <TimePicker
                    label="Closing Time"
                    value={formData.closingTime || null}
                    onChange={(val) =>
                      setFormData((prev) => ({ ...prev, closingTime: val }))
                    }
                    slotProps={{
                      textField: { variant: "outlined", fullWidth: true },
                    }}
                  />
                </Box>
                {errors.operatingHours && (
                  <Typography variant="caption" color="error">
                    {errors.operatingHours}
                  </Typography>
                )}
              </Stack>
            </Paper>

            <Box mt={2} display="flex" justifyContent="space-between">
              <Button
                onClick={() => navigate("/")}
                sx={{
                  fontFamily: "LEMON MILK",
                  borderRadius: "10px",
                  padding: "10px 20px",
                }}
              >
                Cancel
              </Button>

              <Button
                onClick={handleSubmit}
                disabled={!isValid || submitted}
                sx={{
                  backgroundImage: "linear-gradient(#00b2e1, #0064b5)",
                  color: "white",
                  fontFamily: "LEMON MILK",
                  borderRadius: "10px",
                  padding: "10px 20px",
                }}
              >
                {submitted ? "Saving..." : "Submit"}
              </Button>
            </Box>
          </Stack>
        </Paper>
      </Box>
    </>
  );
}
