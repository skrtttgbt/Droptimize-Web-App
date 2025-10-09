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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
} from "@mui/material";
import {
  serverTimestamp,
  collection,
  getDocs,
  query,
  orderBy,
  limit,
} from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { addParcel } from "../../services/firebaseService";
import { db } from "../../firebaseConfig";
async function geocodeAddress({
  street,
  barangay,
  municipalityName,
  provinceName,
  regionName,
}) {
  const parts = [street, barangay, municipalityName, provinceName, regionName]
    .filter(Boolean)
    .join(", ");

  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
    parts
  )}`;
  try {
    const res = await fetch(url, { headers: { "User-Agent": "ParcelApp/1.0" } });
    const data = await res.json();
    if (data.length > 0) {
      return {
        latitude: parseFloat(data[0].lat),
        longitude: parseFloat(data[0].lon),
      };
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

  const [baseRefNum, setBaseRefNum] = useState(0);
  const [rows, setRows] = useState([]);


  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const auth = getAuth();
        const user = auth.currentUser;
        
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

        setRows([
          {
            contact: "",
            recipient: "",
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
          },
        ]);
      } catch (err) {
        console.error("❌ PSGC API error:", err);
        alert("Failed to load location data");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

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

  const addRow = () =>
    setRows((prev) => [
      ...prev,
      {
        contact: "",
        recipient: "",
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
      },
    ]);

  const handleSaveAll = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert("No user logged in");

    for (const [i, row] of rows.entries()) {
      if (
        !row.recipient ||
        !row.contact ||
        !row.region ||
        !row.province ||
        !row.municipality ||
        !row.barangay
      ) {
        return alert(`⚠️ Please complete all required fields in row ${i + 1}`);
      }
    }

    for (let i = 0; i < rows.length; i++) {
      const reference = `REF-${String(baseRefNum + i + 1).padStart(6, "0")}`;
      const destination = await geocodeAddress({
        street: rows[i].street,
        barangay: rows[i].barangayName,
        municipalityName: rows[i].municipalityName,
        provinceName: rows[i].provinceName,
        regionName: rows[i].regionName,
      });

      await addParcel(
        {
          status: rows[i].status,
          recipient: rows[i].recipient,
          contact: rows[i].contact,
          street: rows[i].street,
          region: rows[i].regionName,
          province: rows[i].provinceName,
          municipality: rows[i].municipalityName,
          barangay: rows[i].barangayName,
          dateAdded: serverTimestamp(),
          destination: destination || { latitude: null, longitude: null },
        },
        user.uid
      );

      await new Promise((r) => setTimeout(r, 1000));
    }
    // Parcel Success Message Here
    alert("Parcels saved!");
    onSave?.();
    handleClose();
    setRows([
      {
        contact: "",
        recipient: "",
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
      },
    ]);
  };

  if (loading) {
    return (
      <Modal open={open} onClose={handleClose}>
        <Box sx={{ p: 4, bgcolor: "white", borderRadius: 2, boxShadow: 24 }}>
          <CircularProgress /> Loading PSGC data...
        </Box>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={handleClose}>
      <Box
        sx={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          bgcolor: "white",
          p: 4,
          borderRadius: 2,
          width: "95%",
          maxWidth: 1600,
          boxShadow: 24,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          Add Multiple Parcels
        </Typography>

        <TableContainer component={Paper} sx={{ mb: 2 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Status</TableCell>
                <TableCell>Recipient</TableCell>
                <TableCell>Contact</TableCell>
                <TableCell>Street</TableCell>
                <TableCell>Region</TableCell>
                <TableCell>Province</TableCell>
                <TableCell>Municipality</TableCell>
                <TableCell>Barangay</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((row, idx) => {
                const provinceList = provinces.filter(
                  (p) => p.regionCode === row.region
                );
                const muniList = municipalities.filter(
                  (m) =>
                    m.provinceCode === row.province ||
                    (!m.provinceCode && m.regionCode === row.region)
                );
                const brgyList = barangays.filter(
                  (b) =>
                    b.municipalityCode === row.municipality ||
                    b.cityCode === row.municipality
                );

                return (
                  <TableRow key={idx}>
                    

                    {/* Status */}
                    <TableCell>
                      <Select
                        value={row.status}
                        onChange={(e) => updateRow(idx, "status", e.target.value)}
                        size="small"
                      >
                        {["Pending", "Out For Delivery", "Delivered"].map((s) => (
                          <MenuItem key={s} value={s}>
                            {s}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    {/* Recipient */}
                    <TableCell>
                      <TextField
                        value={row.recipient}
                        onChange={(e) =>
                          updateRow(idx, "recipient", e.target.value)
                        }
                        size="small"
                      />
                    </TableCell>

                    {/* Contact */}
                    <TableCell>
                      <TextField
                        value={row.contact}
                        onChange={(e) =>
                          updateRow(idx, "contact", e.target.value)
                        }
                        size="small"
                      />
                    </TableCell>

                    {/* Street */}
                    <TableCell>
                      <TextField
                        value={row.street}
                        onChange={(e) => updateRow(idx, "street", e.target.value)}
                        size="small"
                        placeholder="Optional"
                      />
                    </TableCell>

                    {/* Region */}
                    <TableCell>
                      <Select
                        value={row.region}
                        onChange={(e) => {
                          const sel = regions.find((r) => r.code === e.target.value);
                          updateRow(idx, "region", sel.code, "regionName", sel.name);
                        }}
                        size="small"
                        displayEmpty
                      >
                        <MenuItem value="" disabled>
                          Select
                        </MenuItem>
                        {regions.map((r) => (
                          <MenuItem key={r.code} value={r.code}>
                            {r.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    {/* Province */}
                    <TableCell>
                      <Select
                        value={row.province}
                        onChange={(e) => {
                          const sel = provinces.find((p) => p.code === e.target.value);
                          updateRow(
                            idx,
                            "province",
                            sel.code,
                            "provinceName",
                            sel.name
                          );
                        }}
                        size="small"
                        displayEmpty
                        disabled={!row.region}
                      >
                        <MenuItem value="" disabled>
                          Select
                        </MenuItem>
                        {provinceList.map((p) => (
                          <MenuItem key={p.code} value={p.code}>
                            {p.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    {/* Municipality */}
                    <TableCell>
                      <Select
                        value={row.municipality}
                        onChange={(e) => {
                          const sel = municipalities.find(
                            (m) => m.code === e.target.value
                          );
                          updateRow(
                            idx,
                            "municipality",
                            sel.code,
                            "municipalityName",
                            sel.name
                          );
                        }}
                        size="small"
                        displayEmpty
                        disabled={!row.province && !row.region}
                      >
                        <MenuItem value="" disabled>
                          Select
                        </MenuItem>
                        {muniList.map((m) => (
                          <MenuItem key={m.code} value={m.code}>
                            {m.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>

                    {/* Barangay */}
                    <TableCell>
                      <Select
                        value={row.barangay}
                        onChange={(e) => {
                          const sel = barangays.find(
                            (b) => b.code === e.target.value
                          );
                          updateRow(
                            idx,
                            "barangay",
                            sel.code,
                            "barangayName",
                            sel.name
                          );
                        }}
                        size="small"
                        displayEmpty
                        disabled={!row.municipality}
                      >
                        <MenuItem value="" disabled>
                          Select
                        </MenuItem>
                        {brgyList.map((b) => (
                          <MenuItem key={b.code} value={b.code}>
                            {b.name}
                          </MenuItem>
                        ))}
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Stack direction="row" spacing={2} justifyContent="space-between">
          <Button onClick={addRow} variant="outlined">
            ➕ Add Parcel
          </Button>
          <Stack direction="row" spacing={2}>
            <Button onClick={handleClose} variant="outlined">
              Cancel
            </Button>
            <Button onClick={handleSaveAll} variant="contained" color="success">
              Save All
            </Button>
          </Stack>
        </Stack>
      </Box>
    </Modal>
  );
}
