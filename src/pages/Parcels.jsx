import {
  Button,
  Stack,
  Typography,
  CircularProgress,
  Box,
  Paper,
} from "@mui/material";
import { useEffect, useState } from "react";
import ParcelsHeader from "../components/Dashboard/ParcelsHeader.jsx";
import ParcelList from "../components/Dashboard/ParcelList.jsx";
import CSVModal from "./Modals/ParcelEntryModal.jsx";
import { fetchAllParcels } from "../services/firebaseService.js";
import { auth } from "../firebaseConfig.js";

export default function Parcels() {
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    delivered: 0,
    outForDelivery: 0,
    failed: 0,
  });

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [openCSVModal, setOpenCSVModal] = useState(false);
  const [parcels, setParcels] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchParcels = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      const uid = currentUser ? currentUser.uid : null;
      const parcelData = await fetchAllParcels(uid);

      const enriched = parcelData.map((p) => ({
        ...p,
        address: [p.street, p.barangay, p.municipality, p.province, p.region]
          .filter(Boolean)
          .join(", "),
      }));

      setParcels(enriched);

      const newCounts = {
        all: enriched.length,
        pending: 0,
        delivered: 0,
        outForDelivery: 0,
        failed: 0,
      };

      enriched.forEach((parcel) => {
        const status = (parcel.status || "pending").toLowerCase();
        if (status === "delivered") newCounts.delivered++;
        else if (status === "out for delivery") newCounts.outForDelivery++;
        else if (status === "failed" || status === "returned")
          newCounts.failed++;
        else newCounts.pending++;
      });

      setCounts(newCounts);
    } catch (error) {
      console.error("❌ Error fetching parcels:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    document.title = "Manage Parcels";
    fetchParcels();
  }, []);

  const filteredBySearch = searchQuery
    ? parcels.filter((parcel) => {
        const query = searchQuery.toLowerCase();
        let formattedDate = "";

        if (parcel.dateAdded) {
          if (parcel.dateAdded instanceof Date) {
            formattedDate = parcel.dateAdded.toLocaleDateString().toLowerCase();
          } else if (typeof parcel.dateAdded.toDate === "function") {
            formattedDate = parcel.dateAdded
              .toDate()
              .toLocaleDateString()
              .toLowerCase();
          } else {
            formattedDate = new Date(parcel.dateAdded)
              .toLocaleDateString()
              .toLowerCase();
          }
        }

        return (
          (parcel.recipient &&
            parcel.recipient.toLowerCase().includes(query)) ||
          (parcel.id && parcel.id.toLowerCase().includes(query)) ||
          (parcel.reference && parcel.reference.toLowerCase().includes(query)) ||
          (parcel.address && parcel.address.toLowerCase().includes(query)) ||
          formattedDate.includes(query)
        );
      })
    : parcels;

  const filteredByStatus = selectedStatus
    ? filteredBySearch.filter(
        (p) =>
          p.status &&
          p.status.toLowerCase() === selectedStatus.toLowerCase()
      )
    : filteredBySearch;

  const sortedParcels = [...filteredByStatus].sort((a, b) => {
    const [key, direction] = (selectedSort || "dateAdded_desc").split("_");
    let aVal = a[key] ?? "";
    let bVal = b[key] ?? "";

    if (key === "dateAdded") {
      aVal = new Date(
        typeof aVal?.toDate === "function" ? aVal.toDate() : aVal
      );
      bVal = new Date(
        typeof bVal?.toDate === "function" ? bVal.toDate() : bVal
      );
    } else {
      if (typeof aVal === "string") aVal = aVal.toLowerCase();
      if (typeof bVal === "string") bVal = bVal.toLowerCase();
    }

    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });

  return (
    <Box 
      sx={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          px: { xs: 2, md: 4 },
          py: 3,
          boxSizing: "border-box",
        }}
        >
      {/* Header title */}
      <Typography
        variant="h4"
        sx={{
          mb: 2,
          color: "#00b2e1",
          fontWeight: "bold",
          fontFamily: "Lexend",
        }}
      >
        Parcels
      </Typography>

      {/* Main content card */}
      <Paper
        elevation={2}
        sx={{
          p: 3,
          borderRadius: 3,
          display: "flex",
          flexDirection: "column",
          gap: 3,
          minHeight: "80vh",
        }}
      >
        <ParcelsHeader
          showSearch
          showSort
          onSearch={setSearchQuery}
          onSortChange={setSelectedSort}
          onStatusSelect={setSelectedStatus}
          sortOptions={[
            { value: "dateAdded_asc", label: "Oldest First" },
            { value: "dateAdded_desc", label: "Newest First" },
          ]}
          counts={counts}
        />

        {/* Buttons */}
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems="flex-start"
        >
          <Button
            variant="contained"
            sx={{
              bgcolor: "#00b2e1",
              color: "#fff",
              fontWeight: "bold",
              px: 3,
              height: 45,
              borderRadius: 2,
              width: { xs: "100%", sm: 170 },
              textTransform: "none",
              boxShadow: "0px 3px 8px rgba(0,0,0,0.15)",
              "&:hover": {
                bgcolor: "#00a2d0",
                boxShadow: "0px 4px 10px rgba(0,0,0,0.2)",
              },
            }}
            onClick={() => setOpenCSVModal(true)}
          >
            + Add Parcels
          </Button>

          <Button
            variant="outlined"
            sx={{
              bgcolor: "#fff",
              color: "#00b2e1",
              fontWeight: "bold",
              px: 3,
              height: 45,
              borderRadius: 2,
              width: { xs: "100%", sm: 140 },
              textTransform: "none",
              border: "2px solid #00b2e1",
              "&:hover": {
                bgcolor: "#00b2e1",
                color: "#fff",
                boxShadow: "0px 4px 10px rgba(0,0,0,0.15)",
              },
            }}
            onClick={fetchParcels}
            disabled={loading}
          >
            {loading ? "Refreshing..." : "Refresh"}
          </Button>
        </Stack>

        {/* CSV modal */}
        <CSVModal
          open={openCSVModal}
          handleClose={() => setOpenCSVModal(false)}
          onUpload={fetchParcels}
        />

        {/* Parcel list */}
        {loading ? (
          <Box textAlign="center" my={4}>
            <CircularProgress />
            <Typography variant="body1" sx={{ mt: 2 }}>
              Loading parcels...
            </Typography>
          </Box>
        ) : sortedParcels.length === 0 ? (
          <Box textAlign="center" my={4}>
            <Typography variant="h6" color="text.secondary">
              No parcels found. Import some parcels to get started.
            </Typography>
          </Box>
        ) : (
          <ParcelList
            parcels={sortedParcels}
            loading={loading}
            onRefresh={fetchParcels}
          />
        )}
      </Paper>
    </Box>
  );
}
