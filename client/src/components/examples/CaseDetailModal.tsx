import { useState } from 'react';
import { CaseDetailModal } from '../case-detail-modal';
import { Button } from '@/components/ui/button';

export default function CaseDetailModalExample() {
  const [open, setOpen] = useState(true);

  return (
    <div className="p-6">
      <Button onClick={() => setOpen(true)}>Open Case Detail</Button>
      <CaseDetailModal open={open} onOpenChange={setOpen} caseId="CS-2024-001" />
    </div>
  );
}
