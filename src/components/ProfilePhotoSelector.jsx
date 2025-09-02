import { useState } from "react";
import { Avatar, Button, Stack } from "@mui/material";
import { db, storage } from "/src/firebaseConfig";
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { doc, setDoc } from "firebase/firestore";

export default function ProfilePhotoSelector({ profile, setProfile, userId }) {
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    try {
      setUploading(true);

      // Delete old photo from storage if exists
      if (profile.photoPath) {
        try {
          await deleteObject(ref(storage, profile.photoPath));
        } catch (err) {
          console.warn("Delete previous photo failed:", err?.message);
        }
      }

      // Upload new photo
      const ext = file.name.split(".").pop() || "jpg";
      const path = `users/${userId}/profile-${Date.now()}.${ext}`;
      const storageRef = ref(storage, path);

      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);

      // Update local state (for instant preview)
      setProfile((prev) => ({ ...prev, photoURL: url, photoPath: path }));

      // Persist directly to Firestore (standalone save)
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
    } catch (err) {
      console.error("Upload error:", err?.message || err);
    } finally {
      setUploading(false);
    }
  };

  const previewSrc = profile.photoURL || "/default-avatar.png";

  return (
    <Stack direction="row" spacing={2} alignItems="center">
      <Avatar
        src={previewSrc}
        alt={profile.fullName || "Profile Photo"}
        sx={{
          width: 80,
          height: 80
        }}
      />
      <Button
        variant="outlined"
        component="label"
        disabled={uploading}
        sx={{
          borderColor: "#00b2e1",
          color: "#00b2e1",
          fontFamily: "LEMON MILK",
          fontSize: "14px",
          borderRadius: "10px",
          textTransform: "none",
          "&:hover": {
            borderColor: "#0064b5",
            color: "#0064b5",
            backgroundColor: "rgba(0, 178, 225, 0.04)",
          },
        }}
      >
        {uploading ? "Uploading…" : "Upload Photo"}
        <input type="file" accept="image/*" hidden onChange={handleFileChange} />
      </Button>
    </Stack>
  );
}
