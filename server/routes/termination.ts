import { Router } from "express";
import { terminationService } from "../services/termination";

const router = Router();

function handleError(res: any, err: any) {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Termination process error";
  res.status(status).json({ error: message });
}

router.get("/:workerCaseId", async (req, res) => {
  try {
    const process = await terminationService.getOrCreateProcess(req.params.workerCaseId);
    res.json(process);
  } catch (err) {
    handleError(res, err);
  }
});

router.post("/:workerCaseId/init", async (req, res) => {
  try {
    const { rtWAttemptsSummary, alternativeRolesConsideredSummary, hasSustainableRole, preInjuryRole } = req.body;
    const process = await terminationService.initiate(req.params.workerCaseId, {
      rtWAttemptsSummary,
      alternativeRolesConsideredSummary,
      hasSustainableRole,
      preInjuryRole,
    });
    res.json(process);
  } catch (err) {
    handleError(res, err);
  }
});

router.put("/:workerCaseId/evidence", async (req, res) => {
  try {
    const process = await terminationService.updateEvidence(req.params.workerCaseId, req.body);
    res.json(process);
  } catch (err) {
    handleError(res, err);
  }
});

router.put("/:workerCaseId/agent-meeting", async (req, res) => {
  try {
    const process = await terminationService.updateAgentMeeting(req.params.workerCaseId, req.body);
    res.json(process);
  } catch (err) {
    handleError(res, err);
  }
});

router.put("/:workerCaseId/consultant-confirmation", async (req, res) => {
  try {
    const process = await terminationService.updateConsultantConfirmation(req.params.workerCaseId, req.body);
    res.json(process);
  } catch (err) {
    handleError(res, err);
  }
});

router.put("/:workerCaseId/pre-termination-invite", async (req, res) => {
  try {
    const process = await terminationService.preTerminationInvite(req.params.workerCaseId, req.body);
    res.json(process);
  } catch (err) {
    handleError(res, err);
  }
});

router.put("/:workerCaseId/pre-termination-meeting", async (req, res) => {
  try {
    const process = await terminationService.preTerminationMeeting(req.params.workerCaseId, req.body);
    res.json(process);
  } catch (err) {
    handleError(res, err);
  }
});

router.put("/:workerCaseId/decision", async (req, res) => {
  try {
    const process = await terminationService.decide(req.params.workerCaseId, req.body);
    res.json(process);
  } catch (err) {
    handleError(res, err);
  }
});

export default router;
