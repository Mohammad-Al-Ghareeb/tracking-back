const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();

router.get("/", async (req, res) => {
  const dbState = mongoose.connection.readyState;
  const health = {
    ok: true,
    status: "ok",
    timestamp: new Date().toISOString(),
    server: {
      uptime: process.uptime(),
      nodeVersion: process.version,
    },
    database: {
      status: dbState === 1 ? "connected" : "disconnected",
      readyState: dbState,
    },
  };

  if (dbState !== 1) {
    health.ok = false;
    health.status = "database_unavailable";
    return res.status(503).json(health);
  }

  try {
    await mongoose.connection.db.admin().ping();
    return res.status(200).json(health);
  } catch (error) {
    health.ok = false;
    health.status = "database_ping_failed";
    health.database.error = error.message;
    return res.status(503).json(health);
  }
});

module.exports = router;
