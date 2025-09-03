import { useState } from "react";
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
} from "@mui/material";
import { CSVLink } from "react-csv";
import Papa from "papaparse";
import { serverTimestamp } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../firebaseConfig";
import { addParcel } from "../../services/firebaseService";

export default function CSVModal({ open, handleClose, onUpload }) {
  const [csvData, setCsvData] = useState([]);
  const [showAll, setShowAll] = useState(false);

  // CSV Template Headers
  const headers = [
    { label: "Reference", key: "reference" },
    { label: "Status", key: "status" },
    { label: "Recipient", key: "recipient" },
    { label: "Address", key: "address" },
  ];

  const templateData = [
    {
      reference: "REF-123456",
      status: "Pending",
      recipient: "Juan Dela Cruz",
      address: "123 Sample St, Manila",
    },
    {
      reference: "REF-789012",
      status: "Out for Delivery",
      recipient: "Maria Santos",
      address: "456 Example Ave, Quezon City",
    },
  ];

const handleSaveToFirebase = async () => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      alert("No user logged in");
      return;
    }

    // Track success and failures
    let successCount = 0;
    let failureCount = 0;

    // Add each row using the new addParcel function
    for (const row of csvData) {
      const parcelData = {
        reference: row.reference || "",
        status: row.status || "Pending",
        recipient: row.recipient || "",
        address: row.address || "",
        dateAdded: serverTimestamp()
      };

      const result = await addParcel(parcelData, user.uid);
      
      if (result.success) {
        successCount++;
      } else {
        failureCount++;
        console.error("Error adding parcel:", result.error);
      }
    }

    if (failureCount > 0) {
      alert(`CSV data upload completed with ${successCount} successes and ${failureCount} failures. Check console for details.`);
    } else {
      alert("CSV data successfully uploaded to Firebase!");
    }
    
    setCsvData([]);
    setShowAll(false);
    
    // Call onUpload callback to refresh the parcels list
    if (onUpload) onUpload();
    
    handleClose();
  } catch (error) {
    console.error("Error uploading CSV:", error);
    alert("Failed to upload data. Check console for details.");
  }
};

  // Handle File Upload
const handleFileUpload = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: (result) => {
      const normalized = result.data.map((row) => ({
        reference: row["Reference"] || row["reference"] || "",
        status: row["Status"] || row["status"] || "Pending",
        recipient: row["Recipient"] || row["recipient"] || "",
        address: row["Address"] || row["address"] || "",
      }));

      console.log("Normalized CSV Data:", normalized);
      setCsvData(normalized);
    },
  });
};


  const visibleRows = showAll ? csvData : csvData.slice(0, 5);

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
          width: 600,
          maxHeight: "80vh",
          overflow: "auto",
          boxShadow: 24,
        }}
      >
        <Typography variant="h6" sx={{ mb: 2, fontWeight: "bold" }}>
          CSV Options
        </Typography>

        <Stack spacing={2}>
          {/* Download CSV Template */}
          <CSVLink
            data={templateData}
            headers={headers}
            filename="parcels_template.csv"
            style={{ textDecoration: "none" }}
          >
            <Button fullWidth variant="contained" color="primary">
              Download CSV Template
            </Button>
          </CSVLink>

          {/* Upload CSV */}
          <Button
            fullWidth
            variant="outlined"
            component="label"
            color="secondary"
          >
            Upload CSV
            <input
              type="file"
              accept=".csv"
              hidden
              onChange={handleFileUpload}
            />
          </Button>

          {/* Preview CSV Data */}
          {csvData.length > 0 && (
            <Paper sx={{ mt: 2 }}>
              <Typography
                variant="subtitle1"
                sx={{ p: 1, fontWeight: "bold", textAlign: "center" }}
              >
                CSV Preview
              </Typography>

              <Table size="small">
                <TableHead>
                  <TableRow>
                    {headers.map((h) => (
                      <TableCell key={h.key}>{h.label}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visibleRows.map((row, index) => (
                    <TableRow key={index}>
                      {headers.map((h) => (
                        <TableCell key={h.key}>{row[h.key]}</TableCell>
                      ))}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                  <Box textAlign="center" sx={{ p: 2 }}>
                    <Button
                      onClick={handleClose}
                      color="primary"
                      variant="outlined"
                      sx={{ mr: 1 }}
                    >
                      Cancel
                    </Button>
                    <CSVLink
                      data={templateData}
                      headers={headers}
                      filename="parcel-template.csv"
                      className="MuiButtonBase-root MuiButton-root MuiButton-text MuiButton-textPrimary"
                      style={{ textDecoration: 'none', margin: '0 10px' }}
                    >
                      Download Template
                    </CSVLink>
                    <Button
                      variant="contained"
                      color="success"
                      onClick={handleSaveToFirebase}
                      disabled={csvData.length === 0}
                    >
                      Save to Database
                    </Button>
                  </Box>

              {csvData.length > 5 && (
                <Box textAlign="center" sx={{ p: 1 }}>
                  <Button
                    size="small"
                    onClick={() => setShowAll(!showAll)}
                    sx={{ textTransform: "none" }}
                  >
                    {showAll
                      ? "Show Less"
                      : `...see more (${csvData.length - 5} more rows)`}
                  </Button>
                </Box>
              )}
            </Paper>
          )}
        </Stack>
      </Box>
    </Modal>
  );
}
