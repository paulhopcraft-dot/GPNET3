/**
 * FirstTimeTour — Spec 12.2: First-Time User Experience
 *
 * Shows a guided tour dialog on first login (tracked via localStorage).
 * Tour content is role-specific: case_manager, employer, clinician.
 */

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Progress } from "./ui/progress";
import { Badge } from "./ui/badge";

interface TourStep {
  title: string;
  description: string;
  icon: string;
}

const TOUR_STEPS: Record<string, TourStep[]> = {
  // Case manager tour
  default: [
    {
      title: "Your Case List",
      description:
        "This is your main dashboard. Cases are filtered to your assigned cases by default. Red/amber cases need urgent attention — sort by Risk Level to see the highest priority first.",
      icon: "folder_open",
    },
    {
      title: "Action Queue",
      description:
        "The Action Queue (right panel) shows what needs to happen today. Each action includes a reason — the 'why' — so you know what's required and by when.",
      icon: "task_alt",
    },
    {
      title: "Case Detail",
      description:
        "Click any case to open it. You'll see tabs for Injury, RTW Plan, Timeline, Financial, Risk, Contacts, and Recovery. The Recovery tab shows the expected recovery curve.",
      icon: "person",
    },
    {
      title: "Compliance",
      description:
        "Each case shows a compliance indicator. 'Low' means action is needed — typically a missing certificate, overdue RTW plan, or missed deadline under the WIRC Act.",
      icon: "verified",
    },
    {
      title: "Chat with AI",
      description:
        "Use the 'Ask Alex' chat (floating button) to ask questions about any case. Alex has full access to the case timeline, certificates, and medical notes.",
      icon: "smart_toy",
    },
  ],

  // Employer tour
  employer: [
    {
      title: "Your Dashboard",
      description:
        "Welcome to Preventli. Here you'll see your workers with active injury cases. Decisions that need your attention are highlighted — these require prompt action under the WIRC Act.",
      icon: "dashboard",
    },
    {
      title: "Decisions Needed",
      description:
        "When a RTW plan needs your approval or a worker is ready to return, you'll see it here. Respond promptly — obligations under s93–s97 of the WIRC Act have strict timeframes.",
      icon: "checklist",
    },
    {
      title: "Case Details",
      description:
        "Click a case to see the worker's current status, RTW plan, suitable duties, and your obligations. Clinical and diagnosis details are not shown to protect worker privacy.",
      icon: "work",
    },
    {
      title: "Obligations",
      description:
        "You have Return to Work obligations under the WIRC Act. Preventli tracks these for you and alerts you when action is required. 'Action Required' cases need your response.",
      icon: "gavel",
    },
  ],

  // Clinician/AHR tour
  clinician: [
    {
      title: "Recovery Timelines",
      description:
        "The Recovery tab on each case shows the expected vs actual recovery curve. Blue area = expected, green line = actual capacity. Compliance deadlines (10wk, 13wk, 52wk) are marked.",
      icon: "healing",
    },
    {
      title: "Clinical Override",
      description:
        "If the estimated recovery timeline needs adjustment, use the 'Adjust Timeline' button. Document your clinical reasoning — this is stored as a clinical override in the case record.",
      icon: "tune",
    },
    {
      title: "RTW Planning",
      description:
        "The RTW Plan tab shows the current plan status and milestones. Use the RTW Planner (/rtw-planner) to generate evidence-based plans based on functional capacity.",
      icon: "event_available",
    },
    {
      title: "Milestones",
      description:
        "Clinical milestones (specialist reviews, GP reviews, IME dates) appear in the Recovery chart. Case management milestones (employer contacts) appear in the Timeline tab.",
      icon: "flag",
    },
  ],
};

const STORAGE_KEY = "preventli_tour_seen";

interface FirstTimeTourProps {
  userRole: string;
  userId: string;
}

export function FirstTimeTour({ userRole, userId }: FirstTimeTourProps) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const storageKey = `${STORAGE_KEY}_${userId}`;
  const steps = TOUR_STEPS[userRole] ?? TOUR_STEPS.default;

  useEffect(() => {
    const seen = localStorage.getItem(storageKey);
    if (!seen) {
      // Small delay so the dashboard loads first
      const t = setTimeout(() => setOpen(true), 1500);
      return () => clearTimeout(t);
    }
  }, [storageKey]);

  function dismiss() {
    localStorage.setItem(storageKey, "1");
    setOpen(false);
  }

  function next() {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      dismiss();
    }
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  const currentStep = steps[step];
  const progress = ((step + 1) / steps.length) * 100;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) dismiss(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <span className="material-symbols-outlined text-3xl text-primary">
              {currentStep.icon}
            </span>
            <div>
              <Badge variant="outline" className="text-xs mb-1">
                Step {step + 1} of {steps.length}
              </Badge>
              <DialogTitle className="text-lg leading-tight">{currentStep.title}</DialogTitle>
            </div>
          </div>
          <DialogDescription className="text-sm text-muted-foreground leading-relaxed mt-2">
            {currentStep.description}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          <Progress value={progress} className="h-1.5" />

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={prev}
              disabled={step === 0}
            >
              ← Back
            </Button>

            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={dismiss} className="text-muted-foreground">
                Skip tour
              </Button>
              <Button size="sm" onClick={next}>
                {step < steps.length - 1 ? "Next →" : "Get started →"}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
