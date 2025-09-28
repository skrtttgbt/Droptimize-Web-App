import { useState, useEffect } from "react";
import {
  Modal,
  Box,
  Button,
  Typography,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
} from "@mui/material";
import { CSVLink } from "react-csv";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { addParcel } from "../../services/firebaseService";

export default function CSVModal({ open, handleClose, onUpload }) {
  const [csvData, setCsvData] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [validation, setValidation] = useState([]);
  const [regions, setRegions] = useState([]);
  const [provinces, setProvinces] = useState([]);
  const [municipalities, setMunicipalities] = useState([]);
  const [barangays, setBarangays] = useState([]);
  const [loading, setLoading] = useState(true);

  // ✅ CSV headers/template
  const headers = [
    { label: "Reference", key: "reference" },
    { label: "Status", key: "status" },
    { label: "Recipient", key: "recipient" },
    { label: "Street", key: "street" },
    { label: "Region", key: "regionName" },
    { label: "Province", key: "provinceName" },
    { label: "Municipality/City", key: "municipalityName" },
    { label: "Barangay", key: "barangayName" },
  ];

  const templateData = [
    {
      reference: "REF-001",
      status: "Pending",
      recipient: "Juan Dela Cruz",
      street: "123 Sample St",
      regionName: "Ilocos Region",
      provinceName: "Ilocos Norte",
      municipalityName: "Laoag City",
      barangayName: "Barangay 1",
      region: "",
      province: "",
      municipality: "",
      barangay: "",
    },
  ];

  // ✅ Fetch PSGC data
  useEffect(() => {
    const fetchData = async () => {
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
      } catch (err) {
        console.error("❌ PSGC API error:", err);
        alert("Failed to load PSGC data");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // ✅ Validation
  const validateRow = (row) => {
    const region = regions.find((r) => r.code === row.region);
    if (!region) return false;
    const province = provinces.find(
      (p) => p.code === row.province && p.regionCode === region.code
    );
    if (!province) return false;
    const muni = municipalities.find(
      (m) =>
        m.code === row.municipality &&
        (m.provinceCode === province.code || m.regionCode === region.code)
    );
    if (!muni) return false;
    const brgy = barangays.find(
      (b) =>
        b.code === row.barangay &&
        (b.municipalityCode === muni.code || b.cityCode === muni.code)
    );
    return !!brgy;
  };

  useEffect(() => {
    if (!loading) {
      setValidation(csvData.map(validateRow));
    }
  }, [csvData, loading]);

  // ✅ CSV Upload
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const normalized = result.data.map((row) => ({
          reference: row["Reference"] || "",
          status: row["Status"] || "Pending",
          recipient: row["Recipient"] || "",
          street: row["Street"] || "",
          regionName: row["Region"] || "",
          provinceName: row["Province"] || "",
          municipalityName: row["Municipality"] || "",
          barangayName: row["Barangay"] || "",
          region: "",
          province: "",
          municipality: "",
          barangay: "",
        }));
        setCsvData(normalized);
      },
    });
  };

  // ✅ Field update with cascading resets
  const updateField = (index, key, value, nameKey, label) => {
    setCsvData((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [key]: value,
              ...(nameKey ? { [nameKey]: label } : {}),
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

  // ✅ Save to Firestore
  const handleSave = async () => {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return alert("No user logged in");
    let successCount = 0;
    for (const row of csvData) {
      const result = await addParcel(
        {
          reference: row.reference,
          status: row.status,
          recipient: row.recipient,
          street: row.street,
          region: row.regionName,
          province: row.provinceName,
          municipality: row.municipalityName,
          barangay: row.barangayName,
          dateAdded: serverTimestamp(),
        },
        user.uid
      );
      if (result.success) successCount++;
    }
    alert(`✅ ${successCount} parcels uploaded!`);
    setCsvData([]);
    setShowAll(false);
    handleClose();
    onUpload?.();
  };


  const handleXLSXDownload = async() => {
  const workbook = new ExcelJS.Workbook();
  const wsMain = workbook.addWorksheet("Parcels");

  // Add headers
  wsMain.addRow(["Reference", "Status", "Name", "Address", "Region", "Province", "Municipality", "Barangay"]);
  wsMain.addRow(["REF-001", "Pending", "Juan Dela Cruz", "123 Sample St"]);

  // Add list sheets
  const wsRegions = workbook.addWorksheet("Regions");
  regions.forEach(r => wsRegions.addRow([r.name]));

  const wsProvinces = workbook.addWorksheet("Provinces");
  provinces.forEach(p => wsProvinces.addRow([p.name]));

  const wsMunicipalities = workbook.addWorksheet("Municipalities");
  municipalities.forEach(m => wsMunicipalities.addRow([m.name]));

  const wsBarangays = workbook.addWorksheet("Barangays");
  barangays.forEach(b => wsBarangays.addRow([b.name]));

// Municipality dropdown
wsMain.getCell("G2").dataValidation = {
  type: "list",
  allowBlank: true,
  formulae: [`Municipalities!$A$1:$A$${municipalities.length}`],
  showErrorMessage: true,
  errorTitle: "Invalid Selection",
  error: "Please select a Municipality from the list only.",
  errorStyle: "stop"
};

// Barangay dropdown
wsMain.getCell("H2").dataValidation = {
  type: "list",
  allowBlank: true,
  formulae: [`Barangays!$A$1:$A$${barangays.length}`],
  showErrorMessage: true,
  errorTitle: "Invalid Selection",
  error: "Please select a Barangay from the list only.",
  errorStyle: "stop"
};

  wsMain.getCell("E2").dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [`Regions!$A$1:$A$${regions.length}`],
    showErrorMessage: true,     
    errorTitle: "Invalid Selection",
    error: "Please select a Region from the list only.",
    errorStyle: "stop"          
  };
  wsMain.getCell("F2").dataValidation = {
    type: "list",
    allowBlank: true,
    formulae: [`Provinces!$A$1:$A$${provinces.length}`],
    showErrorMessage: true,
    errorTitle: "Invalid Selection",
    error: "Please select a Province from the list only.",
    errorStyle: "stop"             
  };

  const buffer = await workbook.xlsx.writeBuffer();
  saveAs(new Blob([buffer]), "parcels_template.xlsx");
  };

  const visibleRows = showAll ? csvData : csvData.slice(0, 5);
  const allValid = validation.length > 0 && validation.every(Boolean);

  if (loading) {
    return (
      <Modal open={open} onClose={handleClose}>
        <Box sx={{ p: 4, bgcolor: "white", borderRadius: 2, boxShadow: 24 }}>
          <CircularProgress /> Loading PSGC Data...
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
          width: csvData.length > 0 ? "90%" : 400,
          maxHeight: "85vh",
          overflow: "auto",
          boxShadow: 24,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          CSV / XLSX Upload
        </Typography>

        <Stack spacing={2}>

          <Button fullWidth variant="contained" color="secondary" onClick={handleXLSXDownload}>
            Download XLSX Template
          </Button>

          <Button fullWidth variant="outlined" component="label">
            Upload CSV
            <input type="file" accept=".xlsx" hidden onChange={handleFileUpload} />
          </Button>

          {csvData.length > 0 && (
            <Paper sx={{ mt: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{ p: 1, fontWeight: "bold", textAlign: "center" }}
              >
                Parcel Information Preview & Validation
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    {headers.map((h) => (
                      <TableCell key={h.key}>{h.label}</TableCell>
                    ))}
                    <TableCell>Validation</TableCell>
                  </TableRow>
                </TableHead>

                <TableBody>
                  {visibleRows.map((row, index) => {
                    const valid = validation[index];
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
                      <TableRow key={index}>
                        <TableCell>
                          <TextField
                            size="small"
                            value={row.reference}
                            onChange={(e) =>
                              updateField(index, "reference", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            size="small"
                            value={row.status}
                            onChange={(e) =>
                              updateField(index, "status", e.target.value)
                            }
                          >
                            {["Pending", "In Transit", "Delivered"].map((s) => (
                              <MenuItem key={s} value={s}>{s}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={row.recipient}
                            onChange={(e) =>
                              updateField(index, "recipient", e.target.value)
                            }
                          />
                        </TableCell>
                        <TableCell>
                          <TextField
                            size="small"
                            value={row.street}
                            onChange={(e) =>
                              updateField(index, "street", e.target.value)
                            }
                          />
                        </TableCell>

                        {/* Region */}
                        <TableCell>
                          <Select
                            size="small"
                            value={row.region}
                            onChange={(e) => {
                              const selected = regions.find(r => r.code === e.target.value);
                              updateField(index, "region", selected.code, "regionName", selected.name);
                            }}
                          >
                            {regions.map((r) => (
                              <MenuItem key={r.code} value={r.code}>{r.name}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>

                        {/* Province */}
                        <TableCell>
                          <Select
                            size="small"
                            value={row.province}
                            onChange={(e) => {
                              const selected = provinces.find(p => p.code === e.target.value);
                              updateField(index, "province", selected.code, "provinceName", selected.name);
                            }}
                          >
                            {provinceList.map((p) => (
                              <MenuItem key={p.code} value={p.code}>{p.name}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>

                        {/* Municipality / City */}
                        <TableCell>
                          <Select
                            size="small"
                            value={row.municipality}
                            onChange={(e) => {
                              const selected = municipalities.find(m => m.code === e.target.value);
                              updateField(index, "municipality", selected.code, "municipalityName", selected.name);
                            }}
                          >
                            {muniList.map((m) => (
                              <MenuItem key={m.code} value={m.code}>{m.name}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>

                        {/* Barangay */}
                        <TableCell>
                          <Select
                            size="small"
                            value={row.barangay}
                            onChange={(e) => {
                              const selected = barangays.find(b => b.code === e.target.value);
                              updateField(index, "barangay", selected.code, "barangayName", selected.name);
                            }}
                          >
                            {brgyList.map((b) => (
                              <MenuItem key={b.code} value={b.code}>{b.name}</MenuItem>
                            ))}
                          </Select>
                        </TableCell>

                        <TableCell>
                          {valid ? (
                            <Chip label="Valid" color="success" size="small" />
                          ) : (
                            <Chip label="Invalid" color="error" size="small" />
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>

              {csvData.length > 5 && (
                <Box textAlign="center" sx={{ p: 1 }}>
                  <Button size="small" onClick={() => setShowAll(!showAll)}>
                    {showAll ? "Show Less" : `...see more (${csvData.length - 5} more rows)`}
                  </Button>
                </Box>
              )}

              <Box textAlign="center" sx={{ p: 2 }}>
                <Button onClick={handleClose} variant="outlined" sx={{ mr: 1 }}>
                  Cancel
                </Button>
                <Button
                  variant="contained"
                  color="success"
                  onClick={handleSave}
                  disabled={!allValid}
                >
                  Save to Database
                </Button>
              </Box>
            </Paper>
          )}
        </Stack>
      </Box>
    </Modal>
  );
}
