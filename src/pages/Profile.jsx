import { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Divider,
  Paper,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import { auth, db } from "/src/firebaseConfig";
import { onAuthStateChanged } from "firebase/auth";
import { doc, onSnapshot, setDoc } from "firebase/firestore";
import ProfilePhotoSelector from "../components/ProfilePhotoSelector.jsx";

export default function Profile() {
  useEffect(() => {
    document.title = "Profile";
  }, []);

  const [profile, setProfile] = useState({
    fullName: "",
    email: "",
    contactNumber: "",
    branchId: "",
    photoURL: "",
    photoPath: "",
  });

  const [branch, setBranch] = useState({
    branchName: "",
    branchAddress: "",
    operatingArea: "",
  });

  const [userId, setUserId] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        navigate("/login");
        return;
      }

      setUserId(user.uid);

      const userRef = doc(db, "users", user.uid);
      const unsubUser = onSnapshot(userRef, (snap) => {
        const data = snap.exists() ? snap.data() : {};
        setProfile({
          fullName: data.fullName || user.displayName || "",
          email: user.email || "",
          contactNumber: data.contactNumber || "",
          branchId: data.branchId || "",
          photoURL: data.photoURL || "",
          photoPath: data.photoPath || "",
        });

        if (data.branchId) {
          const branchRef = doc(db, "branches", data.branchId);
          onSnapshot(branchRef, (branchSnap) => {
            if (branchSnap.exists()) {
              const b = branchSnap.data();
              setBranch({
                branchName: b.branchName || "",
                branchAddress: b.branchAddress || "",
                operatingArea: b.operatingArea || "",
              });
            }
          });
        }

        setLoading(false);
      });

      return () => unsubUser();
    });

    return () => unsubAuth();
  }, [navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (["branchName", "branchAddress", "operatingArea"].includes(name)) {
      setBranch((prev) => ({ ...prev, [name]: value }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          fullName: profile.fullName,
          contactNumber: profile.contactNumber,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      if (profile.branchId) {
        const branchRef = doc(db, "branches", profile.branchId);
        await setDoc(
          branchRef,
          {
            branchName: branch.branchName,
            branchAddress: branch.branchAddress,
            operatingArea: branch.operatingArea,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      setEditing(false);
    } catch (error) {
      console.error("Error updating profile:", error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography
        variant="h4"
        sx={{
          mb: 3,
          fontFamily: "Lexend",
          fontWeight: "bold",
          color: "#00b2e1",
        }}
      >
        Admin Profile
      </Typography>

      <Paper
        elevation={3}
        sx={{
          p: 3,
          borderRadius: "16px",
          backgroundColor: "#fff",
          maxWidth: 700,
          mx: "auto",
        }}
      >
        <Stack spacing={3} alignItems="center">
          <ProfilePhotoSelector profile={profile} setProfile={setProfile} userId={userId} />

          <Divider sx={{ width: "100%", my: 1 }} />

          {/* Personal Information */}
          <Typography
            variant="h6"
            sx={{
              alignSelf: "flex-start",
              fontFamily: "Lexend",
              fontWeight: 600,
              color: "#333",
            }}
          >
            Personal Information
          </Typography>

          <Stack spacing={2} width="100%">
            <TextField
              label="Full Name"
              name="fullName"
              value={profile.fullName}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={!editing}
            />
            <TextField
              label="Email"
              name="email"
              value={profile.email}
              fullWidth
              size="small"
              disabled
            />
            <TextField
              label="Contact Number"
              name="contactNumber"
              value={profile.contactNumber}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={!editing}
            />
          </Stack>

          <Divider sx={{ width: "100%", my: 1 }} />

          {/* Branch Information */}
          <Typography
            variant="h6"
            sx={{
              alignSelf: "flex-start",
              fontFamily: "Lexend",
              fontWeight: 600,
              color: "#333",
            }}
          >
            Branch Information
          </Typography>

          <Stack spacing={2} width="100%">
            <TextField
              label="Branch Name"
              name="branchName"
              value={branch.branchName}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={!editing}
            />
            <TextField
              label="Branch Address"
              name="branchAddress"
              value={branch.branchAddress}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={!editing}
            />
            <TextField
              label="Operating Area"
              name="operatingArea"
              value={branch.operatingArea}
              onChange={handleChange}
              fullWidth
              size="small"
              disabled={!editing}
            />
          </Stack>

          {/* Buttons */}
          <Box display="flex" justifyContent="flex-end" width="100%" mt={2}>
            {editing ? (
              <Button
                variant="contained"
                onClick={handleSave}
                disabled={saving}
                sx={{
                  width: 150,
                  backgroundColor: "#00b2e1",
                  "&:hover": { backgroundColor: "#00a1d6" },
                  fontFamily: "Lexend",
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderRadius: "10px",
                  textTransform: "none",
                }}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            ) : (
              <Button
                variant="contained"
                onClick={() => setEditing(true)}
                sx={{
                  width: 150,
                  backgroundColor: "#00b2e1",
                  "&:hover": { backgroundColor: "#00a1d6" },
                  fontFamily: "Lexend",
                  fontSize: "1rem",
                  fontWeight: 600,
                  borderRadius: "10px",
                  textTransform: "none",
                }}
              >
                Edit Profile
              </Button>
            )}
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}
