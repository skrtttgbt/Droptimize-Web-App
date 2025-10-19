import React from "react";
import { Card, CardContent, Box, Typography } from "@mui/material";

export default function FeatureCard({ title, description, icon }) {
  return (
    <Card
      sx={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#ffffff",
        color: "#000000",
        borderRadius: "8px",
        p: 2,
        m: 2,
        width: 300,
        height: 400,
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        transition: "transform 0.3s ease",
        "&:hover": {
          transform: "translateY(-5px)",
        },
      }}
    >
      <Box
        component="img"
        src={icon}
        alt={`${title} icon`}
        sx={{
          width: 200,
          mb: 2,
        }}
      />

      <CardContent sx={{ textAlign: "center", p: 0 }}>
        <Typography
          variant="h6"
          sx={{
            fontFamily: "Lexend",
            fontWeight: 600,
            mb: 1,
          }}
        >
          {title}
        </Typography>

        <Typography
          variant="body2"
          sx={{
            fontFamily: "Lexend",
            color: "#333",
          }}
        >
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
}
