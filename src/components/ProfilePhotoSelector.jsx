import { useState } from "react";
import { Avatar, Button, Stack, Box, Typography, CircularProgress } from "@mui/material";
import { db, storage } from "/src/firebaseConfig";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";

export default function ProfilePhotoSelector({ profile, setProfile, userId }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);

    try {
      // Delete old photo (optional)
      if (profile.photoPath) {
        try {
          await deleteObject(ref(storage, profile.photoPath));
        } catch (err) {
          console.warn("No previous photo to delete:", err?.message);
        }
      }

      // Upload new photo
      const ext = file.name.split(".").pop() || "jpg";
      const path = `users/${userId}/profile-${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Update Firestore (merge ensures doc is created if missing)
      const userRef = doc(db, "users", userId);
      await setDoc(
        userRef,
        {
          photoURL: url,
          photoPath: path,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      // Update state for instant UI feedback
      setProfile((prev) => ({
        ...prev,
        photoURL: url,
        photoPath: path,
      }));

      console.log("✅ Profile photo updated successfully.");
    } catch (err) {
      console.error("❌ Upload failed:", err);
      alert("Upload failed — please try again.");
    } finally {
      setUploading(false);
    }
  };

  const previewSrc = profile.photoURL || "/default-avatar.png";

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        p: 2,
      }}
    >
      <Box
        sx={{
          position: "relative",
          width: 120,
          height: 120,
        }}
      >
        <Avatar
          src={previewSrc}
          alt={profile.fullName || "Profile Photo"}
          sx={{
            width: 120,
            height: 120,
            border: "4px solid #c4cad0",
            transition: "0.3s",
            "&:hover": {
              borderColor: "#00b2e1",
              transform: "scale(1.05)",
            },
          }}
        />
        {uploading && (
          <CircularProgress
            size={40}
            sx={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              color: "#00b2e1",
            }}
          />
        )}
      </Box>

      <Button
        variant="contained"
        component="label"
        disabled={uploading}
        sx={{
          backgroundColor: "#00b2e1",
          "&:hover": { backgroundColor: "#00a1d6" },
          fontFamily: "Lexend",
          fontWeight: 600,
          fontSize: "1rem",
          borderRadius: "10px",
          textTransform: "none",
          px: 3,
          py: 1,
        }}
      >
        {uploading ? "Uploading…" : "Change Photo"}
        <input type="file" accept="image/*" hidden onChange={handleFileChange} />
      </Button>

      <Typography
        variant="h5"
        sx={{
          mt: 1,
          fontFamily: "Lexend",
          fontWeight: 700,
          color: "#333",
          textAlign: "center",
        }}
      >
        {profile.fullName || "Admin User"}
      </Typography>
    </Box>
  );
}
