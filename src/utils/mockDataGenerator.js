import { doc, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { getNextParcelId } from '../services/firebaseService';

// Generate random parcels
export const generateMockParcels = async (count = 50, uid = 'admin') => {
  const statuses = ['delivered', 'out for delivery', 'failed', 'returned', 'pending'];
  
  try {
    for (let i = 0; i < count; i++) {
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      // Get a sequential parcel ID
      const parcelId = await getNextParcelId();
      
      // Use the new path format: parcels/parcelId
      const parcelDocRef = doc(db, `parcels/${parcelId}`);
      
      await setDoc(parcelDocRef, {
        uid: uid,
        reference: `REF-${Math.floor(Math.random() * 1000000)}`,
        status: randomStatus,
        recipient: `Customer ${i + 1}`,
        address: `${i + 1} Sample St, City`,
        dateAdded: Timestamp.fromDate(new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000)),
        createdAt: Timestamp.fromDate(new Date())
      });
    }
    console.log(`Successfully generated ${count} mock parcels`);
    return true;
  } catch (error) {
    console.error('Error generating mock parcels:', error);
    return false;
  }
};

// Generate random drivers
export const generateMockDrivers = async (count = 20) => {
  const statuses = ['available', 'on trip', 'offline'];
  const driversRef = collection(db, 'drivers');
  
  try {
    for (let i = 0; i < count; i++) {
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      
      await addDoc(driversRef, {
        id: `DRV${String(i + 101).padStart(3, '0')}`,
        name: `Driver ${i + 1}`,
        email: `driver${i + 1}@example.com`,
        phoneNumber: `+1${Math.floor(Math.random() * 10000000000).toString().padStart(10, '0')}`,
        status: randomStatus,
        joinDate: Timestamp.fromDate(new Date(Date.now() - Math.floor(Math.random() * 365) * 24 * 60 * 60 * 1000))
      });
    }
    console.log(`Successfully generated ${count} mock drivers`);
    return true;
  } catch (error) {
    console.error('Error generating mock drivers:', error);
    return false;
  }
};

// Generate random deliveries
export const generateMockDeliveries = async (count = 100) => {
  const statuses = ['delivered', 'failed', 'returned'];
  const deliveriesRef = collection(db, 'deliveries');
  
  try {
    for (let i = 0; i < count; i++) {
      const randomStatus = statuses[Math.floor(Math.random() * statuses.length)];
      const randomDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
      
      await addDoc(deliveriesRef, {
        parcelId: `PKG${String(Math.floor(Math.random() * 100) + 1001).padStart(4, '0')}`,
        driverId: `DRV${String(Math.floor(Math.random() * 20) + 101).padStart(3, '0')}`,
        status: randomStatus,
        date: Timestamp.fromDate(randomDate),
        completionTime: randomStatus !== 'failed' ? Math.floor(Math.random() * 120) + 30 : null // minutes
      });
    }
    console.log(`Successfully generated ${count} mock deliveries`);
    return true;
  } catch (error) {
    console.error('Error generating mock deliveries:', error);
    return false;
  }
};

// Generate random speeding incidents
export const generateMockSpeedingIncidents = async (count = 30) => {
  const incidentsRef = collection(db, 'speedingIncidents');
  const locations = [
    'Main Street & 5th Avenue',
    'Highway 101, Mile 45',
    'Central Park West',
    'Downtown District',
    'Riverside Drive',
    'Industrial Zone',
    'School Zone, Elementary School',
    'Shopping Mall Parking',
    'Residential Area, North Side'
  ];
  
  try {
    for (let i = 0; i < count; i++) {
      const randomLocation = locations[Math.floor(Math.random() * locations.length)];
      const randomDate = new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000);
      const driverId = Math.floor(Math.random() * 20) + 101;
      
      await addDoc(incidentsRef, {
        driverId: `DRV${String(driverId).padStart(3, '0')}`,
        driverName: `Driver ${driverId - 100}`,
        speed: Math.floor(Math.random() * 30) + 60, // 60-90 km/h
        speedLimit: Math.floor(Math.random() * 20) + 30, // 30-50 km/h
        location: randomLocation,
        timestamp: Timestamp.fromDate(randomDate)
      });
    }
    console.log(`Successfully generated ${count} mock speeding incidents`);
    return true;
  } catch (error) {
    console.error('Error generating mock speeding incidents:', error);
    return false;
  }
};

// Generate all mock data
export const generateAllMockData = async () => {
  try {
    await generateMockParcels();
    await generateMockDrivers();
    await generateMockDeliveries();
    await generateMockSpeedingIncidents();
    console.log('Successfully generated all mock data');
    return true;
  } catch (error) {
    console.error('Error generating all mock data:', error);
    return false;
  }
};