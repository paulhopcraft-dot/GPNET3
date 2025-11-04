const express = require("express");
const router = express.Router();

// simple placeholder route so app boots
router.get("/", (_req, res) => {
  res.json({ ok: true, message: "Compliance route active" });
});

module.exports = router;
