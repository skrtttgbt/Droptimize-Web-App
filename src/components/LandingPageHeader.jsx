import React, { useEffect, useState, useRef } from "react";
import { AppBar, Toolbar, Box, Button, Typography, Stack, Slide } from "@mui/material";
import { useNavigate } from "react-router-dom";

export default function LandingPageHeader() {
  const [visible, setVisible] = useState(true);
  const [lastScrollY, setLastScrollY] = useState(0);
  const scrollTimeoutRef = useRef(null);
  const navigate = useNavigate();

  // Scroll hide/show
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setVisible(currentScrollY < lastScrollY || currentScrollY < 50);
      setLastScrollY(currentScrollY);

      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => setVisible(true), 150);
    };

    window.addEventListener("scroll", handleScroll);
    return () => {
      window.removeEventListener("scroll", handleScroll);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };
  }, [lastScrollY]);

  return (
    <Slide appear={false} direction="down" in={visible}>
      <AppBar
        position="fixed"
        sx={{
          backgroundColor: "#fff",
          boxShadow: "0 2px 6px rgba(0,0,0,0.1)",
          color: "#000",
          px: { xs: 2, sm: 4 },
        }}
      >
        <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
          {/* Logo */}
          <Box
            sx={{ display: "flex", alignItems: "center", cursor: "pointer" }}
            onClick={() => navigate("/")}
          >
            <Box component="img" src="/logo.svg" alt="Droptimize Logo" sx={{ width: 150 }} />
          </Box>

          {/* Navigation */}
          <Stack direction="row" spacing={2} sx={{ display: { xs: "none", md: "flex" }, alignItems: "center" }}>
            {["Home", "Features", "About", "Contact"].map((item) => (
              <Typography
                key={item}
                sx={{
                  cursor: "pointer",
                  fontWeight: 600,
                  fontFamily: "Lexend, sans-serif",
                  color: "#00b2e1",
                  fontSize: { xs: "0.85rem", md: "1rem" },
                  px: 2,
                  py: 0.5,
                  borderRadius: 1,
                  "&:hover": { color: "#fff", backgroundColor: "#00b2e1" },
                }}
                onClick={() => {
                  if (item === "Home") navigate("/");
                  else {
                    const el = document.getElementById(item.toLowerCase());
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }
                }}
              >
                {item}
              </Typography>
            ))}
          </Stack>

          {/* Static Auth Buttons */}
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Button
              variant="contained"
              onClick={() => navigate("/login")}
              sx={{
                backgroundColor: "#00b2e1",
                fontWeight: 600,
                fontFamily: "Lexend, sans-serif",
                textTransform: "none",
                "&:hover": { backgroundColor: "#0064b5" },
              }}
            >
              Login
            </Button>
            <Button
              variant="contained"
              onClick={() => navigate("/signup")}
              sx={{
                backgroundColor: "#00b2e1",
                fontWeight: 600,
                fontFamily: "Lexend, sans-serif",
                textTransform: "none",
                "&:hover": { backgroundColor: "#0064b5" },
              }}
            >
              Sign Up
            </Button>
          </Stack>
        </Toolbar>
      </AppBar>
    </Slide>
  );
}
