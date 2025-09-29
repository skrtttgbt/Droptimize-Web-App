import { Button, Stack, Typography, CircularProgress, Box } from "@mui/material";
import { useEffect, useState } from "react";
import ParcelsHeader from "../components/Dashboard/ParcelsHeader.jsx";
import ParcelList from "../components/Dashboard/ParcelList.jsx";
import CSVModal from "./Modals/CSVModal.jsx";
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

  /** ✅ Single function to fetch and compute everything */
  const fetchParcels = async () => {
    setLoading(true);
    try {
      const currentUser = auth.currentUser;
      const uid = currentUser ? currentUser.uid : null;

      const parcelData = await fetchAllParcels(uid);

      // 🔑 Add fullAddress for search/display
      const enriched = parcelData.map((p) => ({
        ...p,
        address: [
          p.street,
          p.barangay,
          p.municipality,
          p.province,
          p.region,
        ]
          .filter(Boolean)
          .join(", "),
      }));

      setParcels(enriched);

      // 🔢 Update counts
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
        else if (status === "failed" || status === "returned") newCounts.failed++;
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

  // 🔍 Search filter
  const filteredBySearch = searchQuery
    ? parcels.filter((parcel) => {
        const query = searchQuery.toLowerCase();

        let formattedDate = "";
        if (parcel.dateAdded) {
          if (parcel.dateAdded instanceof Date) {
            formattedDate = parcel.dateAdded.toLocaleDateString().toLowerCase();
          } else if (typeof parcel.dateAdded.toDate === "function") {
            formattedDate = parcel.dateAdded.toDate().toLocaleDateString().toLowerCase();
          } else {
            formattedDate = new Date(parcel.dateAdded)
              .toLocaleDateString()
              .toLowerCase();
          }
        }

        return (
          (parcel.recipient && parcel.recipient.toLowerCase().includes(query)) ||
          (parcel.id && parcel.id.toLowerCase().includes(query)) ||
          (parcel.reference && parcel.reference.toLowerCase().includes(query)) ||
          (parcel.address && parcel.address.toLowerCase().includes(query)) ||
          formattedDate.includes(query)
        );
      })
    : parcels;

  // ⚡ Status filter
  const filteredByStatus = selectedStatus
    ? filteredBySearch.filter(
        (p) =>
          p.status &&
          p.status.toLowerCase() === selectedStatus.toLowerCase()
      )
    : filteredBySearch;

  // 🔀 Sorting
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
        Parcels
      </Typography>

      <Stack spacing={2}>
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

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            sx={{ bgcolor: "#00b2e1", fontWeight: "bold", width: 200 }}
            onClick={() => setOpenCSVModal(true)}
          >
            Add Parcels
          </Button>
          <Button
            variant="outlined"
            sx={{ fontWeight: "bold", width: 120 }}
            onClick={fetchParcels}
            disabled={loading}
          >
            Refresh
          </Button>
        </Stack>

        <CSVModal
          open={openCSVModal}
          handleClose={() => setOpenCSVModal(false)}
          onUpload={fetchParcels}
        />

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
      </Stack>
    </>
  );
}
