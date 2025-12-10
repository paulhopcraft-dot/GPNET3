/**
 * EmailDraftButton - Trigger button for the email draft modal
 */

import { useState } from "react";
import { Button } from "./ui/button";
import { EmailDraftModal } from "./EmailDraftModal";

interface EmailDraftButtonProps {
  caseId: string;
  workerName: string;
}

export function EmailDraftButton({ caseId, workerName }: EmailDraftButtonProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        data-testid="button-draft-email"
      >
        <span className="material-symbols-outlined text-sm mr-1">mail</span>
        Draft Email
      </Button>
      <EmailDraftModal
        open={open}
        onOpenChange={setOpen}
        caseId={caseId}
        workerName={workerName}
      />
    </>
  );
}
