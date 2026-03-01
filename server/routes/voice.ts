import express, { type Request, type Response } from "express";
const router = express.Router();

// simple placeholder so import works
router.get("/", (_req: Request, res: Response) => {
  res.json({ ok: true, route: "voice placeholder" });
});

export default router;
