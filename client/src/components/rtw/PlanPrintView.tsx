/**
 * PlanPrintView
 * Wrapper component for print and PDF export functionality (OUT-09, OUT-10)
 * Uses react-to-print to trigger browser print dialog
 */

import { useRef } from "react";
import { useReactToPrint } from "react-to-print";
import { Button } from "@/components/ui/button";
import { Printer, FileDown } from "lucide-react";

interface PlanPrintViewProps {
  planId: string;
  children: React.ReactNode;
}

export function PlanPrintView({ planId, children }: PlanPrintViewProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: printRef,
    documentTitle: `RTW-Plan-${planId}`,
    pageStyle: `
      @page {
        size: A4 portrait;
        margin: 20mm 15mm;
      }
    `,
  });

  return (
    <div>
      {/* Print controls - hidden in print */}
      <div className="flex items-center gap-2 mb-4 print:hidden">
        <Button onClick={() => handlePrint()} variant="outline" size="sm">
          <Printer className="h-4 w-4 mr-2" />
          Print Plan
        </Button>
        <Button onClick={() => handlePrint()} variant="outline" size="sm">
          <FileDown className="h-4 w-4 mr-2" />
          Export PDF
        </Button>
        <span className="text-xs text-muted-foreground">
          (Select "Save as PDF" in print dialog for PDF export)
        </span>
      </div>

      {/* Printable content */}
      <div ref={printRef}>
        {children}
      </div>
    </div>
  );
}
