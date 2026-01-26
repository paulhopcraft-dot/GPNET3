import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type DemandFrequency = "never" | "occasionally" | "frequently" | "constantly";

interface DemandValues {
  // Physical demands
  bending: DemandFrequency;
  squatting: DemandFrequency;
  kneeling: DemandFrequency;
  twisting: DemandFrequency;
  reachingOverhead: DemandFrequency;
  reachingForward: DemandFrequency;
  lifting: DemandFrequency;
  liftingMaxKg?: number | null;
  carrying: DemandFrequency;
  carryingMaxKg?: number | null;
  standing: DemandFrequency;
  sitting: DemandFrequency;
  walking: DemandFrequency;
  repetitiveMovements: DemandFrequency;

  // Cognitive demands
  concentration: DemandFrequency;
  stressTolerance: DemandFrequency;
  workPace: DemandFrequency;
}

interface DemandMatrixProps {
  value: DemandValues;
  onChange: (value: DemandValues) => void;
  readonly?: boolean;
}

const FREQUENCIES: DemandFrequency[] = ["never", "occasionally", "frequently", "constantly"];

const FREQUENCY_LABELS: Record<DemandFrequency, string> = {
  never: "N",
  occasionally: "O",
  frequently: "F",
  constantly: "C",
};

const FREQUENCY_COLORS: Record<DemandFrequency, string> = {
  never: "bg-gray-100 text-gray-700 hover:bg-gray-200",
  occasionally: "bg-blue-100 text-blue-700 hover:bg-blue-200",
  frequently: "bg-yellow-100 text-yellow-700 hover:bg-yellow-200",
  constantly: "bg-red-100 text-red-700 hover:bg-red-200",
};

interface DemandDefinition {
  key: keyof DemandValues;
  label: string;
  hasWeight?: boolean;
  weightKey?: keyof DemandValues;
}

const PHYSICAL_DEMANDS: DemandDefinition[] = [
  { key: "bending", label: "Bending" },
  { key: "squatting", label: "Squatting" },
  { key: "kneeling", label: "Kneeling" },
  { key: "twisting", label: "Twisting" },
  { key: "reachingOverhead", label: "Reaching Overhead" },
  { key: "reachingForward", label: "Reaching Forward" },
  { key: "lifting", label: "Lifting", hasWeight: true, weightKey: "liftingMaxKg" },
  { key: "carrying", label: "Carrying", hasWeight: true, weightKey: "carryingMaxKg" },
  { key: "standing", label: "Standing" },
  { key: "sitting", label: "Sitting" },
  { key: "walking", label: "Walking" },
  { key: "repetitiveMovements", label: "Repetitive Movements" },
];

const COGNITIVE_DEMANDS: DemandDefinition[] = [
  { key: "concentration", label: "Concentration" },
  { key: "stressTolerance", label: "Stress Tolerance" },
  { key: "workPace", label: "Work Pace" },
];

export function DemandMatrix({ value, onChange, readonly = false }: DemandMatrixProps): JSX.Element {
  const handleFrequencyChange = (key: keyof DemandValues, frequency: DemandFrequency) => {
    const updates: Partial<DemandValues> = { [key]: frequency };

    // Clear weight if frequency is "never"
    if (frequency === "never") {
      if (key === "lifting") {
        updates.liftingMaxKg = null;
      } else if (key === "carrying") {
        updates.carryingMaxKg = null;
      }
    }

    onChange({ ...value, ...updates });
  };

  const handleWeightChange = (key: keyof DemandValues, weight: string) => {
    const numValue = weight === "" ? null : parseInt(weight, 10);
    onChange({ ...value, [key]: numValue });
  };

  const renderDemandRow = (demand: DemandDefinition) => {
    const frequency = value[demand.key] as DemandFrequency;
    const showWeight = demand.hasWeight && frequency !== "never";

    return (
      <div key={demand.key} className="grid grid-cols-[200px_auto_150px] gap-4 items-center py-2 border-b last:border-b-0">
        <Label className="text-sm font-medium">{demand.label}</Label>

        <div className="flex gap-2">
          {FREQUENCIES.map((freq) => (
            <button
              key={freq}
              type="button"
              disabled={readonly}
              onClick={() => handleFrequencyChange(demand.key, freq)}
              className={cn(
                "w-10 h-10 rounded-full text-sm font-medium transition-colors",
                frequency === freq
                  ? FREQUENCY_COLORS[freq]
                  : "bg-gray-50 text-gray-400 hover:bg-gray-100",
                readonly && "cursor-not-allowed opacity-60"
              )}
              title={freq.charAt(0).toUpperCase() + freq.slice(1)}
            >
              {FREQUENCY_LABELS[freq]}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {showWeight && demand.weightKey ? (
            <>
              <Input
                type="number"
                min="0"
                max="200"
                value={value[demand.weightKey] as number || ""}
                onChange={(e) => handleWeightChange(demand.weightKey!, e.target.value)}
                disabled={readonly}
                className="w-20 h-9"
                placeholder="0"
              />
              <span className="text-sm text-muted-foreground">kg</span>
            </>
          ) : (
            <span className="text-sm text-muted-foreground">-</span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="grid grid-cols-[200px_auto_150px] gap-4 pb-2 border-b-2">
        <div className="text-sm font-semibold">Demand</div>
        <div className="text-sm font-semibold">Frequency</div>
        <div className="text-sm font-semibold">Max Weight</div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 text-xs text-muted-foreground bg-muted/30 p-3 rounded-md">
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center font-medium">N</div>
          <span>Never</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center font-medium">O</div>
          <span>Occasionally</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-yellow-100 flex items-center justify-center font-medium">F</div>
          <span>Frequently</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-6 h-6 rounded-full bg-red-100 flex items-center justify-center font-medium">C</div>
          <span>Constantly</span>
        </div>
      </div>

      {/* Physical Demands */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">Physical Demands</h3>
        <div className="space-y-0 border rounded-md p-4">
          {PHYSICAL_DEMANDS.map(renderDemandRow)}
        </div>
      </div>

      {/* Cognitive Demands */}
      <div>
        <h3 className="text-sm font-semibold mb-3 text-primary">Cognitive Demands</h3>
        <div className="space-y-0 border rounded-md p-4">
          {COGNITIVE_DEMANDS.map(renderDemandRow)}
        </div>
      </div>
    </div>
  );
}
