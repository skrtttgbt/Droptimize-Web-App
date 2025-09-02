import { useEffect, useState } from "react";
import { Avatar, Divider, Stack, MenuList, MenuItem, ListItemIcon, ListItemText, Button } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import { auth, db } from "/src/firebaseConfig";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

export default function SidebarFooterAccount() {
  const [user, setUser] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // Fetch Firestore user document
          const userDoc = await getDoc(doc(db, "users", firebaseUser.uid));

          if (userDoc.exists()) {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: userDoc.data().fullName || firebaseUser.displayName || firebaseUser.email.split("@")[0],
              photoURL: userDoc.data().photoURL || firebaseUser.photoURL || "",
            });
          } else {
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: firebaseUser.displayName || firebaseUser.email.split("@")[0],
              photoURL: firebaseUser.photoURL || "",
            });
          }
        } catch (err) {
          console.error("Error fetching user document:", err);
        }
      } else {
        setUser(null);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      console.log("User signed out successfully");
      navigate("/");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  return (
    <Stack direction="column" sx={{ p: 2, width: "100%" }}>
      <MenuList>
        {user && (
          <MenuItem
            component={Link}
            to="/dashboard/profile"
            sx={{
              justifyContent: "flex-start",
              columnGap: 2,
              alignItems: "flex-start",
              textDecoration: "none",
            }}
          >
            <ListItemIcon>
              <Avatar
                src={user.photoURL}
                alt={user.displayName}
                sx={{
                  width: 32,
                  height: 32,
                  fontSize: "0.95rem"
                }}
              >
                {user.displayName.charAt(0).toUpperCase()}
              </Avatar>
            </ListItemIcon>

            <ListItemText
              primary={user.displayName}
              secondary={user.email}
              slots={{
                primary: "span",
                secondary: "span",
              }}
              slotProps={{
                primary: {
                  style: {
                    display: "block",
                    fontSize: "14px",
                    fontWeight: 600,
                  },
                },
                secondary: {
                  style: {
                    display: "block",
                    fontSize: "12px",
                    color: "gray",
                  },
                },
              }}
            />
          </MenuItem>
        )}
      </MenuList>

      <Divider sx={{ my: 1 }} />

      <Button
        onClick={handleSignOut}
        variant="text"
        color="error"
        sx={{ alignSelf: "flex-start", ml: 2, fontSize: 13 }}
      >
        Sign Out
      </Button>
    </Stack>
  );
}
