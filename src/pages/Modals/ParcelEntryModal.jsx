import { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Button,
  Typography,
  Stack,
  TextField,
  Select,
  MenuItem,
  CircularProgress,
  Grid,
  Paper,
  IconButton,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import { serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { addParcel } from "../../services/firebaseService";

async function geocodeAddress({ street, barangay, municipalityName, provinceName, regionName }) {
  const parts = [street, barangay, municipalityName, provinceName, regionName]
    .filter(Boolean)
    .join(", ");
  
  // If no parts to geocode, return null
  if (!parts.trim()) {
    console.warn("No address parts to geocode");
    return null;
  }
  
  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(parts)}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "ParcelApp/1.0" } });
    const data = await res.json();
    if (data.length > 0 && data[0].lat && data[0].lon) {
      const latitude = parseFloat(data[0].lat);
      const longitude = parseFloat(data[0].lon);
      
      // Validate that coordinates are valid numbers
      if (isNaN(latitude) || isNaN(longitude)) {
        console.warn("Invalid coordinates from geocoding");
        return null;
      }
      
      return { latitude, longitude };
    }
  } catch (err) {
    console.error("❌ Geocoding failed:", err);
  }
  return null;
}

export default function ParcelEntryModal({ open, handleClose, onSave }) {
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [rows, setRows] = useState([]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [r, p, m, b] = await Promise.all([
          fetch("https://psgc.gitlab.io/api/regions/").then((res) => res.json()),
          fetch("https://psgc.gitlab.io/api/provinces/").then((res) => res.json()),
          fetch("https://psgc.gitlab.io/api/cities-municipalities/").then((res) => res.json()),
          fetch("https://psgc.gitlab.io/api/barangays/").then((res) => res.json()),
        ]);

        setRegions(r);
        setProvinces(p);
        setMunicipalities(m);
        setBarangays(b);

        setRows([emptyParcel()]);
      } catch (err) {
        console.error("❌ PSGC API error:", err);
        alert("Failed to load location data.");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const emptyParcel = () => ({
    parcelId: Date.now(), 
    recipient: "",
    recipientContact: "",
    street: "",
    status: "Pending",
    region: "",
    regionName: "",
    province: "",
    provinceName: "",
    municipality: "",
    municipalityName: "",
    barangay: "",
    barangayName: "",
    weight: 0
  });

  const updateRow = (index, key, value, labelKey, labelValue) => {
    setRows((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [key]: value,
              ...(labelKey ? { [labelKey]: labelValue } : {}),
              ...(key === "region" && {
                province: "",
                provinceName: "",
                municipality: "",
                municipalityName: "",
                barangay: "",
                barangayName: "",
              }),
              ...(key === "province" && {
                municipality: "",
                municipalityName: "",
                barangay: "",
                barangayName: "",
              }),
              ...(key === "municipality" && {
                barangay: "",
                barangayName: "",
              }),
            }
          : row
      )
    );
  };

  const addRow = () => setRows((prev) => [...prev, emptyParcel()]);

  const removeRow = (index) => {
    setRows((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSaveAll = async () => {
    if (saving) return;
    setSaving(true);

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("No user logged in.");
      setSaving(false);
      return;
    }

    for (const [i, row] of rows.entries()) {
      if (
        !row.recipient ||
        !row.recipientContact ||
        !row.region ||
        !row.province ||
        !row.municipality ||
        !row.barangay
      ) {
        alert(`⚠️ Please complete all required fields in parcel ${i + 1}`);
        setSaving(false);
        return;
      }
    }

    try {
      for (const row of rows) {
        const destination = await geocodeAddress({
          street: row.street,
          barangay: row.barangayName,
          municipalityName: row.municipalityName,
          provinceName: row.provinceName,
          regionName: row.regionName,
        });

        // If geocoding fails, try a fallback approach or skip the parcel
        if (!destination) {
          // Try with just the municipality and province
          const fallbackDestination = await geocodeAddress({
            municipalityName: row.municipalityName,
            provinceName: row.provinceName,
          });
          
          if (!fallbackDestination) {
            // If still no location, show an error and skip this parcel
            console.warn(`Could not geocode address for parcel ${row.recipient}. Skipping.`);
            alert(`⚠️ Could not geocode address for parcel ${row.recipient}. This parcel will be skipped.`);
            return; // Skip this parcel
          }
          
          // Use fallback destination
          await addParcel(
            {
              weight: row.weight,
              status: row.status,
              recipient: row.recipient,
              recipientContact: row.recipientContact,
              street: row.street,
              region: row.regionName,
              province: row.provinceName,
              municipality: row.municipalityName,
              barangay: row.barangayName,
              dateAdded: serverTimestamp(),
              destination: fallbackDestination,
            },
            user.uid
          );
        } else {
          // Use the successfully geocoded destination
          await addParcel(
            {
              weight: row.weight,
              status: row.status,
              recipient: row.recipient,
              recipientContact: row.recipientContact,
              street: row.street,
              region: row.regionName,
              province: row.provinceName,
              municipality: row.municipalityName,
              barangay: row.barangayName,
              dateAdded: serverTimestamp(),
              destination: destination,
            },
            user.uid
          );
        }

        await new Promise((r) => setTimeout(r, 300));
      }

      alert("✅ Parcels saved successfully!");
      onSave?.();
      setRows([emptyParcel()]);
      handleClose();
    } catch (err) {
      console.error("❌ Error saving parcels:", err);
      alert("Failed to save parcels. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleModalClose = () => {
    const hasData = rows.some((r) =>
      Object.values(r).some((v) => v && v.trim && v.trim() !== "")
    );
    if (!hasData) setRows([emptyParcel()]);
    handleClose();
  };

  if (loading) {
    return (
      <Modal open={open} onClose={handleModalClose}>
        <Box sx={{ p: 4, bgcolor: "white", borderRadius: 2, boxShadow: 24 }}>
          <CircularProgress /> Loading PSGC data...
        </Box>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleModalClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "white",
          p: 4,
          borderRadius: 3,
          width: "95%",
          maxWidth: 1200,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: 10,
        }}
      >
        <Typography variant="h6" fontWeight="bold" mb={3}>
          Add Multiple Parcels
        </Typography>

        {rows.map((row, idx) => {
          const provinceList = provinces.filter((p) => p.regionCode === row.region);
          const muniList = municipalities.filter(
            (m) =>
              m.provinceCode === row.province ||
              (!m.provinceCode && m.regionCode === row.region)
          );
          const brgyList = barangays.filter(
            (b) => b.municipalityCode === row.municipality || b.cityCode === row.municipality
          );

          return (
            <Paper key={row.parcelId} sx={{ p: 3, mb: 3, borderRadius: 2, position: "relative" }}>
              <IconButton
                color="error"
                onClick={() => removeRow(idx)}
                disabled={rows.length === 1}
                sx={{ position: "absolute", top: 8, right: 8 }}
              >
                <DeleteIcon />
              </IconButton>
              <Typography variant="subtitle1" fontWeight="bold" mb={2}>
                Parcel {idx + 1}
              </Typography>
              {/* Recipient Info */}
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Recipient Information
              </Typography>
              <Grid container spacing={2} mb={2}>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Recipient Name"
                    value={row.recipient}
                    onChange={(e) => updateRow(idx, "recipient", e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Recipient Contact"
                    value={row.recipientContact}
                    onChange={(e) => updateRow(idx, "recipientContact", e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <TextField
                    label="Parcel Weight (kg)"
                    value={row.weight}
                    onChange={(e) => updateRow(idx, "weight", e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Grid>
              </Grid>
              {/* Destination Info */}
              <Typography variant="subtitle2" color="text.secondary" mb={1}>
                Destination Address
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <TextField
                    label="Street (Optional)"
                    value={row.street}
                    onChange={(e) => updateRow(idx, "street", e.target.value)}
                    size="small"
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={3}>
                  <Select
                    value={row.region}
                    onChange={(e) => {
                      const sel = regions.find((r) => r.code === e.target.value);
                      updateRow(idx, "region", sel.code, "regionName", sel.name);
                    }}
                    size="small"
                    fullWidth
                    displayEmpty
                    renderValue={(selected) =>
                      selected ? regions.find((r) => r.code === selected)?.name : "Select Region"
                    }
                  >
                    <MenuItem value="">Select Region</MenuItem>
                    {regions.map((r) => (
                      <MenuItem key={r.code} value={r.code}>
                        {r.name}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Select
                    value={row.province}
                    onChange={(e) => {
                      const sel = provinces.find((p) => p.code === e.target.value);
                      updateRow(idx, "province", sel.code, "provinceName", sel.name);
                    }}
                    size="small"
                    fullWidth
                    disabled={!row.region}
                    displayEmpty
                    renderValue={(selected) =>
                      selected
                        ? provinces.find((p) => p.code === selected)?.name
                        : "Select Province"
                    }
                  >
                    <MenuItem value="">Select Province</MenuItem>
                    {provinceList.map((p) => (
                      <MenuItem key={p.code} value={p.code}>
                        {p.name}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Select
                    value={row.municipality}
                    onChange={(e) => {
                      const sel = municipalities.find((m) => m.code === e.target.value);
                      updateRow(idx, "municipality", sel.code, "municipalityName", sel.name);
                    }}
                    size="small"
                    fullWidth
                    disabled={!row.province}
                    displayEmpty
                    renderValue={(selected) =>
                      selected
                        ? municipalities.find((m) => m.code === selected)?.name
                        : "Select Municipality"
                    }
                  >
                    <MenuItem value="">Select Municipality</MenuItem>
                    {muniList.map((m) => (
                      <MenuItem key={m.code} value={m.code}>
                        {m.name}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
                <Grid item xs={12} md={3}>
                  <Select
                    value={row.barangay}
                    onChange={(e) => {
                      const sel = barangays.find((b) => b.code === e.target.value);
                      updateRow(idx, "barangay", sel.code, "barangayName", sel.name);
                    }}
                    size="small"
                    fullWidth
                    disabled={!row.municipality}
                    displayEmpty
                    renderValue={(selected) =>
                      selected
                        ? barangays.find((b) => b.code === selected)?.name
                        : "Select Barangay"
                    }
                  >
                    <MenuItem value="">Select Barangay</MenuItem>
                    {brgyList.map((b) => (
                      <MenuItem key={b.code} value={b.code}>
                        {b.name}
                      </MenuItem>
                    ))}
                  </Select>
                </Grid>
              </Grid>
            </Paper>
          );
        })}

        <Stack direction="row" justifyContent="space-between" mt={2}>
          <Button onClick={addRow} variant="outlined" sx={{ borderRadius: 2 }}>
            + Add Another Parcel
          </Button>
          <Stack direction="row" spacing={2}>
            <Button onClick={handleModalClose} variant="outlined" sx={{ borderRadius: 2 }}>
              Cancel
            </Button>
            <Button
              onClick={handleSaveAll}
              variant="contained"
              color="success"
              sx={{ borderRadius: 2 }}
              disabled={saving}
              startIcon={saving ? <CircularProgress size={18} color="inherit" /> : null}
            >
              {saving ? "Saving..." : "Save All"}
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  );
}
