import { useEffect, useState } from "react";
import { Stack, TextField, Button, CircularProgress, Box, Typography } from "@mui/material";
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

      // Listen to User doc
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

        // Also listen to Branch doc if available
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
    if (["companyName", "branchAddress", "operatingArea"].includes(name)) {
      setBranch((prev) => ({ ...prev, [name]: value }));
    } else {
      setProfile((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      // 🔹 Update personal info
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

      // 🔹 Update branch info if admin has branch
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
    <>
      <Typography
        variant="h4"
        sx={{
          margin: "1rem 0",
          fontFamily: "Lexend",
          fontWeight: "bold",
          color: "#00b2e1",
        }}
      >
        Admin Profile
      </Typography>

      <Stack spacing={3} maxWidth="500px" mx="auto" mt={3}>
        <ProfilePhotoSelector
          profile={profile}
          setProfile={setProfile}
          userId={userId}
        />

        {/* Personal fields */}
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

        {/* Branch fields */}
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

        {editing ? (
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={saving}
            sx={{
              width: "200px",
              alignSelf: "flex-start",
              backgroundColor: "#00b2e1",
              "&:hover": { backgroundColor: "#0090b5" },
              fontFamily: "LEMON MILK",
              fontSize: "16px",
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
              width: "200px",
              alignSelf: "flex-start",
              backgroundColor: "#00b2e1",
              "&:hover": { backgroundColor: "#0090b5" },
              fontFamily: "LEMON MILK",
              fontSize: "16px",
              borderRadius: "10px",
              textTransform: "none",
            }}
          >
            Edit Profile
          </Button>
        )}
      </Stack>
    </>
  );
}
