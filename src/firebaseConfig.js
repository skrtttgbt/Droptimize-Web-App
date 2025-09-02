import { initializeApp } from "firebase/app";
import { createUserWithEmailAndPassword, getAuth, sendEmailVerification, updateProfile } from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

// Registrations of User
export const registerUser = async (formData) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      formData.email,
      formData.password
    );
    const user = userCredential.user;
    const fullName = `${formData.firstName} ${formData.lastName}`;
    await sendEmailVerification(userCredential.user);
    await updateProfile(user, { displayName: fullName });
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      createdAt: serverTimestamp(),
    });

    return { success: true, user };
  } catch (error) {
    console.error("Error registering user:", error.message);
    return { success: false, error: error };
  }
};
