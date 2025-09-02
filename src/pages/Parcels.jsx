import { Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";
import ParcelsHeader from "../components/Dashboard/ParcelsHeader.jsx";
import ParcelList from "../components/Dashboard/ParcelList.jsx";

export default function Parcels() {
  useEffect(() => {
    document.title = "Manage Parcels";
  }, []);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSort, setSelectedSort] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");

  const handleSearch = (query) => setSearchQuery(query);
  const handleSort = (sort) => setSelectedSort(sort);
  const handleStatusSelect = (status) => setSelectedStatus(status);

  const parcels = [
    {
      id: "PKG001",
      reference: "REF-982312",
      status: "Pending",
      recipient: "Juan Dela Cruz",
      address: "123 Rizal Ave, Manila",
      dateAdded: "2024-06-01T10:00:00Z"
    },
    {
      id: "PKG002",
      reference: "REF-234812",
      status: "Delivered",
      recipient: "Maria Santos",
      address: "456 Mabini St, Quezon City",
      dateAdded: "2024-06-02T12:30:00Z"
    },
    {
      id: "PKG003",
      reference: "REF-789134",
      status: "Out for Delivery",
      recipient: "Carlos Reyes",
      address: "789 Bonifacio Blvd, Taguig",
      dateAdded: "2024-06-04T09:00:00Z"
    },
    {
      id: "PKG004",
      reference: "REF-005612",
      status: "Failed",
      recipient: "Ana Lopez",
      address: "22 Ayala Ave, Makati",
      dateAdded: "2024-06-03T11:00:00Z"
    },
    {
      id: "PKG005",
      reference: "REF-673419",
      status: "Delivered",
      recipient: "Jose Ramos",
      address: "35 Katipunan Rd, Marikina",
      dateAdded: "2024-06-01T14:00:00Z"
    },
    {
      id: "PKG006",
      reference: "REF-556421",
      status: "Pending",
      recipient: "Liza Garcia",
      address: "88 Taft Ave, Pasay",
      dateAdded: "2024-06-06T15:45:00Z"
    },
    {
      id: "PKG007",
      reference: "REF-902831",
      status: "Out for Delivery",
      recipient: "Nico Cruz",
      address: "12 Ortigas Ext, Pasig",
      dateAdded: "2024-06-05T10:20:00Z"
    },
  ];

  const filteredBySearch = parcels.filter(parcel =>
    parcel.recipient.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parcel.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    parcel.reference.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (parcel.dateAdded && new Date(parcel.dateAdded).toLocaleDateString().includes(searchQuery))
  );

  const filteredByStatus = selectedStatus
    ? filteredBySearch.filter(p => p.status === selectedStatus)
    : filteredBySearch;

  const sortedParcels = [...filteredByStatus].sort((a, b) => {
    const [key, direction] = (selectedSort || "id_asc").split("_");

    let aVal = a[key] ?? "";
    let bVal = b[key] ?? "";

    if (key === "dateAdded") {
      aVal = new Date(aVal);
      bVal = new Date(bVal);
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
          onSearch={handleSearch}
          onSortChange={handleSort}
          onStatusSelect={handleStatusSelect}
          sortOptions={[
            { value: "dateAdded_asc", label: "Oldest First" },
            { value: "dateAdded_desc", label: "Newest First" },
          ]}
        />

        <ParcelList parcels={sortedParcels} />
      </Stack>
    </>
  );
}
