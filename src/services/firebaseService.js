import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  doc,
  setDoc,
  Timestamp,
  deleteDoc,
  getDoc,
  updateDoc,
  increment,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../firebaseConfig";


export const fetchAllParcels = async (uid = null) => {
  try {
    const parcels = [];
    const parcelsRef = collection(db, "parcels");
    const parcelsSnapshot = await getDocs(parcelsRef);

    if (parcelsSnapshot.empty) return parcels;

    for (const parcelDoc of parcelsSnapshot.docs) {
      const parcelId = parcelDoc.id;
      const parcelData = parcelDoc.data();

      if (uid && parcelData.uid !== uid) continue;

      parcels.push({
        id: parcelId, 
        weight:parcelData.weight,
        reference: parcelId || "",
        status: parcelData.status || "Pending",
        recipient: parcelData.recipient || "",
        recipientContact: parcelData.recipientContact || "",
        street: parcelData.street || "",
        barangay: parcelData.barangay || "",
        municipality: parcelData.municipality || "",
        province: parcelData.province || "",
        region: parcelData.region || "",
        dateAdded: parcelData.dateAdded?.toDate() || new Date(),
        userId: parcelData.uid || "",
      });
    }

    return parcels;
  } catch (error) {
    console.error("Error fetching parcels:", error);
    return [];
  }
};

export const fetchParcelStatusData = async (uid = null) => {
  try {
    let delivered = 0;
    let outForDelivery = 0;
    let failedOrReturned = 0;
    let pending = 0;

    const parcelsRef = collection(db, "parcels");
    const parcelsSnapshot = await getDocs(parcelsRef);

    if (parcelsSnapshot.empty) {
      return { delivered: 0, outForDelivery: 0, failedOrReturned: 0, pending: 0, total: 0 };
    }

    for (const parcelDoc of parcelsSnapshot.docs) {
      const parcelData = parcelDoc.data();
      if (uid && parcelData.uid !== uid) continue;

      switch (parcelData.status?.toLowerCase()) {
        case "delivered":
          delivered++;
          break;
        case "out for delivery":
          outForDelivery++;
          break;
        case "failed":
        case "returned":
          failedOrReturned++;
          break;
        case "pending":
        default:
          pending++;
          break;
      }
    }

    return {
      delivered,
      outForDelivery,
      failedOrReturned,
      pending,
      total: delivered + outForDelivery + failedOrReturned + pending,
    };
  } catch (error) {
    console.error("Error fetching parcel status data:", error);
    return { delivered: 0, outForDelivery: 0, failedOrReturned: 0, pending: 0, total: 0 };
  }
};

// ======================== ADD PARCEL ========================
export const addParcel = async (parcelData, uid) => {
  try {
    if (!uid) throw new Error("User ID (uid) is required to add a parcel");

    const now = new Date();
    const parcelId =
      parcelData.id ||
      `PKG${Math.floor(Math.random() * 1_000_000)
        .toString()
        .padStart(6, "0")}`;

    const dataToStore = {
      uid,
      weight: parcelData.weight,
      packageId: parcelId,
      reference: parcelId|| "",
      status: parcelData.status || "Pending",
      recipient: parcelData.recipient || "",
      recipientContact: parcelData.recipientContact || "",
      street: parcelData.street || "",
      barangay: parcelData.barangay || "",
      municipality: parcelData.municipality || "",
      province: parcelData.province || "",
      region: parcelData.region || "",
      dateAdded: parcelData.dateAdded || Timestamp.fromDate(now),
      createdAt: Timestamp.fromDate(now),
      destination: parcelData.destination || "",
    };

    const parcelDocRef = doc(db, "parcels", parcelId);
    await setDoc(parcelDocRef, dataToStore);

    return {
      success: true,
      id: parcelId,
      timestamp: now.getTime(),
      userId: uid,
    };
  } catch (error) {
    console.error("Error adding parcel:", error);
    return { success: false, error: error.message };
  }
};

// ======================== UPDATE PARCEL ========================
export const updateParcel = async (parcelData, parcelId) => {
  try {
    if (!parcelId) throw new Error("Parcel ID is required to update a parcel");

    const dataToUpdate = {
      reference: parcelId,
      status: parcelData.status,
      recipient: parcelData.recipient,
      contact: parcelData.contact,
      street: parcelData.street,
      region: parcelData.region,
      province: parcelData.province,
      municipality: parcelData.municipality,
      barangay: parcelData.barangay,
      updatedAt: Timestamp.fromDate(new Date()),
    };

    Object.keys(dataToUpdate).forEach(
      (key) => dataToUpdate[key] === undefined && delete dataToUpdate[key]
    );

    const parcelDocRef = doc(db, "parcels", parcelId);
    await setDoc(parcelDocRef, dataToUpdate, { merge: true });
    return { success: true, id: parcelId };
  } catch (err) {
    console.error("Error updating parcel:", err);
    return { success: false, error: err.message };
  }
};

// ======================== DELETE PARCEL ========================
export const deleteParcel = async (parcelId) => {
  try {
    if (!parcelId) throw new Error("Parcel ID is required to delete a parcel");
    await deleteDoc(doc(db, "parcels", parcelId));
    return { success: true };
  } catch (err) {
    console.error("Error deleting parcel:", err);
    return { success: false, error: err.message };
  }
};

// ======================== ASSIGN PARCEL TO DRIVER ========================
export async function assignParcelToDriver(parcelId, driverId) {
  const parcelRef = doc(db, "parcels", parcelId);
  const driverRef = doc(db, "users", driverId);

  await updateDoc(parcelRef, {
    assignedDriverId: driverId,
    status: "assigned",
    updatedAt: serverTimestamp(),
  });

  await updateDoc(driverRef, {
    parcelsLeft: increment(1),
    updatedAt: serverTimestamp(),
  });

  return true;
}

// ======================== GET PARCEL ========================
export const getParcel = async (parcelId) => {
  try {
    if (!parcelId) throw new Error("Parcel ID is required to get a parcel");

    const parcelDocRef = doc(db, `parcels/${parcelId}`);
    const parcelDoc = await getDoc(parcelDocRef);

    if (!parcelDoc.exists()) {
      return { success: false, error: "Parcel not found" };
    }

    const parcelData = parcelDoc.data();
    return {
      success: true,
      data: {
        id: parcelId,
        reference: parcelData.reference || "",
        status: parcelData.status || "Pending",
        recipient: parcelData.recipient || "",
        recipientContact: parcelData.recipientContact || "",
        street: parcelData.street || "",
        barangay: parcelData.barangay || "",
        municipality: parcelData.municipality || "",
        province: parcelData.province || "",
        region: parcelData.region || "",
        dateAdded: parcelData.dateAdded?.toDate() || new Date(),
        userId: parcelData.uid || "",
      },
    };
  } catch (error) {
    console.error("Error getting parcel:", error);
    return { success: false, error: error.message };
  }
};

// ======================== DRIVER STATUS DATA ========================
export const fetchDriverStatusData = async () => {
  try {
    const branch = JSON.parse(localStorage.getItem("branch"));
    if (!branch || !branch.branchId) {
      console.error("Branch data is missing or invalid in localStorage.");
      return { available: 0, onTrip: 0, offline: 0 };
    }
    console.log("Fetched branch from localStorage:", branch);
    const driversRef = collection(db, "users");
    const driverDoc = query(
      driversRef,
      where("role", "==", "driver"),
      where("branchId", "==", branch.branchId)
    );

    const driversSnapshot = await getDocs(driverDoc);

    let available = 0;
    let onTrip = 0;
    let offline = 0;

    driversSnapshot.forEach((doc) => {
      const driver = doc.data();
      switch (driver.status?.toLowerCase()) {
        case "available":
          available++;
          break;
        case "delivering":
          onTrip++;
          break;
        case "offline":
        default:
          offline++;
          break;
      }
    });

    return { available, onTrip, offline };
  } catch (error) {
    console.error("Error fetching driver status data:", error);
    return { available: 0, onTrip: 0, offline: 0 };
  }
};

export const fetchDeliveryVolumeData = async (period = "daily", uid) => {
  try {
    const parcelsRef = collection(db, "parcels");
    const q = query(
      parcelsRef,
      where("status", "in", ["Delivered", "Cancelled"]),
      where("uid", "==", uid),
    );

    const parcelsSnapshot = await getDocs(q);
    const deliveryData = {};

    parcelsSnapshot.forEach((docSnap) => {
      const parcel = docSnap.data();

      const ts =
        parcel.DeliveredAt?.toDate?.() ??
        parcel.CancelledAt?.toDate?.() ??
        parcel.createdAt?.toDate?.();

      if (!ts || isNaN(ts.getTime?.())) return;
      const date = new Date(ts);

      const dateKey =
        period === "daily"
          ? date.toISOString().split("T")[0]
          : `Week ${getWeekNumber(date)}`;

      if (!deliveryData[dateKey]) {
        deliveryData[dateKey] = {
          date: dateKey,
          deliveries: 0,
          cancelled: 0,
        };
      }

      if (parcel.status === "Delivered") {
        deliveryData[dateKey].deliveries++;
      } else if (parcel.status === "Cancelled") {
        deliveryData[dateKey].cancelled++;
      }
    });

    const result = Object.values(deliveryData).map((item) => {
      const total = item.deliveries + item.cancelled;
      const successRate = total
        ? ((item.deliveries / total) * 100).toFixed(2)
        : 0;

      return { ...item, total, successRate };
    });

    return result.sort((a, b) =>
      a.date.localeCompare(b.date, undefined, { numeric: true })
    );
  } catch (error) {
    console.error("Error fetching delivery volume data:", error);
    return [];
  }
};

// ======================== OVERSPEEDING DATA ========================
export const fetchOverspeedingData = async (period = "daily") => {
  try {
    const branch = JSON.parse(localStorage.getItem("branch"));
    if (!branch || !branch.branchId) {
      console.error("Branch data is missing or invalid in localStorage.");
      return [];
    }

    const incidentsRef = collection(db, "users");
    const q = query(
      incidentsRef,
      where("branchId", "==", branch.branchId)
    );

    const incidentsSnapshot = await getDocs(q);
    const violationData = {};

    incidentsSnapshot.forEach((doc) => {
      const user = doc.data();
      const violations = user.violations;

      if (!Array.isArray(violations)) return;

      violations.forEach((violation) => {
        const date = new Date(
          violation.issuedAt?.toDate?.() || violation.issuedAt
        );
        if (!date || isNaN(date.getTime())) return;

        const dateKey =
          period === "daily"
            ? date.toISOString().split("T")[0]
            : `Week ${getWeekNumber(date)}`;

        if (!violationData[dateKey]) {
          violationData[dateKey] = {
            date: dateKey,
            count: 0,
            topSpeed: 0,
          };
        }

        violationData[dateKey].count++;

        if (typeof violation.topSpeed === "number") {
          violationData[dateKey].topSpeed = Math.max(
            violationData[dateKey].topSpeed,
            violation.topSpeed
          );
        }
      });
    });

    const result = Object.values(violationData).map((item) => ({
      date: item.date,
      violations: item.count,
      topSpeed: item.topSpeed,
    }));

    return result.sort((a, b) => a.date.localeCompare(b.date));
  } catch (error) {
    console.error("Error fetching violations data:", error);
    return [];
  }
};




// ======================== RECENT INCIDENTS ========================
export const fetchRecentIncidents = async (limitCount = 5) => {
  try {
    const branch = JSON.parse(localStorage.getItem("branch"));

    if (!branch || !branch.branchId) {
      console.error("Branch data is missing or invalid in localStorage.");
      return [];
    }
    const usersRef = collection(db, "users");
    const usersQuery = query(
      usersRef,
      where("role", "==", "driver"),
      where("branchId", "==", branch.branchId)
    );
    const usersSnapshot = await getDocs(usersQuery);
    const violations = [];
    usersSnapshot.forEach((userDoc) => {
      const userData = userDoc.data();
      const driverViolations = userData.violations || [];

      driverViolations.forEach((violation) => {
        violations.push({
          id: `${userDoc.id}_${violation.timestamp || Date.now()}`,
          date: violation.issuedAt
            ? (violation.issuedAt.toDate
                ? violation.issuedAt.toDate().toLocaleString()
                : new Date(violation.issuedAt).toLocaleString())
            : "Unknown",
          location: violation.driverLocation
            ? `${violation.driverLocation.latitude}, ${violation.driverLocation.longitude}`
            : "Unknown location",
          driverName: userData.fullName || "Unknown driver",
          message: violation.message || "No message",
          topSpeed: violation.topSpeed || 0,
          avgSpeed: violation.avgSpeed || 0,
        });
      });
    });
    return violations.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  } catch (error) {
    console.error("Error fetching recent violations:", error);
    return [];
  }
};

// ======================== UTIL: WEEK NUMBER ========================
function getWeekNumber(date) {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date - firstDayOfYear) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}
