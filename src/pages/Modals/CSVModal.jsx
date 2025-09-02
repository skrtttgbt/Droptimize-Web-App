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
import { addDoc, collection, doc, serverTimestamp, setDoc } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { db } from "../../firebaseConfig";

export default function CSVModal({ open, handleClose, onUpload }) {
  const [csvData, setCsvData] = useState([]);
  const [showAll, setShowAll] = useState(false);

  // CSV Template Headers
  const headers = [
    { label: "ID", key: "id" },
    { label: "Reference", key: "reference" },
    { label: "Status", key: "status" },
    { label: "Recipient", key: "recipient" },
    { label: "Address", key: "address" },
    { label: "Date Added", key: "dateAdded" },
  ];

  const templateData = [
    {
      id: "PKG001",
      reference: "REF-123456",
      status: "Pending",
      recipient: "Juan Dela Cruz",
      address: "123 Sample St, Manila",
      dateAdded: "2024-06-01T10:00:00Z",
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

    // create timestamp collection name
    const timestampId = Date.now().toString();

    // reference: parcels/{user.uid}/{timestampId}
    const rowsRef = collection(db, "parcels", user.uid, timestampId);

    // add each row
    for (const row of csvData) {
      await addDoc(rowsRef, {
        ...row,
        uid: user.uid,
        createdAt: serverTimestamp(),
      });
    }

    alert("CSV data successfully uploaded to Firebase!");
    setCsvData([]);
    setShowAll(false);
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
        id: row["ID"] || row["id"] || "",
        reference: row["Reference"] || row["reference"] || "",
        status: row["Status"] || row["status"] || "",
        recipient: row["Recipient"] || row["recipient"] || "",
        address: row["Address"] || row["address"] || "",
        dateAdded: row["Date Added"] || row["dateAdded"] || "",
      }));

      console.log("Normalized CSV Data:", normalized);
      setCsvData(normalized);
      if (onUpload) onUpload(normalized);
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
