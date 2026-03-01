import express from "express";

const router = express.Router();

// Basic in-memory sample so the dashboard can render something
const sample = [
  { id: "CASE-001", worker: "John Smith", risk: "Medium", nextAction: "Request GP progress update", phase: "Recovery" },
  { id: "CASE-002", worker: "Mary Jones", risk: "High", nextAction: "Arrange case conference within 7 days", phase: "Plateau" }
];

router.get("/", async (_req, res) => {
  res.json(sample);
});

export default router;
