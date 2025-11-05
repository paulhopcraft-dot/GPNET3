import express from "express";
const router = express.Router();

// simple placeholder so import works
router.get("/", (_req, res) => {
  res.json({ ok: true, route: "voice placeholder" });
});

export default router;
