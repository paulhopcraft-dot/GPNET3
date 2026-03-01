
import { parseTranscriptFile } from "./parser";

describe("parseTranscriptFile", () => {
  it("parses markdown transcripts with worker headers and extracts next steps", () => {
    const contents = `
## Worker: Jordan Smith
Date: 2025-02-19

Discussed rehab progress. Next steps: book physio, follow-up email to RTW coordinator.

- Review modified duties plan
`;

    const notes = parseTranscriptFile("transcripts/jordan-smith.md", contents);
    expect(notes).toHaveLength(1);
    const note = notes[0];
    expect(note.workerName).toBe("Jordan Smith");
    expect(note.summary.toLowerCase()).toContain("rehab progress");
    expect(note.nextSteps).toEqual([
      "book physio, follow-up email to RTW coordinator.",
      "Review modified duties plan",
    ]);
    expect(note.updatesCompliance).toBe(false);
    expect(note.updatesRecoveryTimeline).toBe(true);
  });

  it("strips VTT artifacts and captures timestamps + risk flags", () => {
    const contents = `WEBVTT

00:00:01.000 --> 00:00:04.000
Worker: Casey Li
Missed appointment and no contact. Need compliance review.

00:00:05.000 --> 00:00:08.000
Next steps: call worker again.
`;

    const notes = parseTranscriptFile("call_casey.vtt", contents);
    expect(notes).toHaveLength(1);
    const note = notes[0];
    expect(note.workerName).toBe("Casey Li");
    expect(note.riskFlags).toContain("Attendance risk");
    expect(note.updatesCompliance).toBe(true);
    expect(note.nextSteps).toContain("call worker again.");
  });
});
