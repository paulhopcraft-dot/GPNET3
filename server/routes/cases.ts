import express, { type Request, type Response } from "express";
const router = express.Router();

// simple test route so the server can start
router.get("/", (_req: Request, res: Response) => {
  res.json([
    {
      id: 1,
      worker_name: "Demo Worker",
      employer: "Demo Employer",
      injury_type: "Shoulder strain",
      compliance_level: "High",
      risk_level: "Low",
      next_step_owner: "Worker",
      expected_recovery_date: "2025-12-10"
    }
  ]);
});

export default router;
