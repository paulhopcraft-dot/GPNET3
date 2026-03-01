# Auto Model Integration Readiness

## Current State
- ✅ Summary service using `claude-3-5-sonnet-20241222`
- ✅ Smart caching with `needsSummaryRefresh()` logic
- ✅ Token overhead analysis completed
- ✅ Backend fully operational

## Integration Points Ready

### 1. Summary Service Hook
**File**: `server/services/summary.ts:270`
```typescript
// Current model assignment
const response = await this.getAnthropic().messages.create({
  model: this.model, // ← Replace with auto model selection
  max_tokens: 4096,
  // ...
});
```

### 2. Model Selection Interface
**Expected signature**:
```typescript
interface AutoModelOptions {
  complexity?: 'low' | 'medium' | 'high';
  priority?: 'cost' | 'quality' | 'speed';
  context?: 'summary' | 'analysis' | 'chat';
}

function autoSelectModel(options: AutoModelOptions): string;
```

### 3. Cost Tracking Hook
**File**: `server/services/summary.ts:340-356`
```typescript
// After generation, log model choice + cost
return {
  summary: result.summary,
  cached: false,
  generatedAt: new Date().toISOString(),
  model: selectedModel, // ← Include auto-selected model
  cost: estimatedCost,   // ← Add cost tracking
};
```

### 4. Configuration Variables
**Expected env vars**:
```bash
# Auto model selection settings
AUTO_MODEL_ENABLED=true
AUTO_MODEL_BUDGET_MONTHLY=100
AUTO_MODEL_PRIORITY=balanced  # cost|quality|speed
```

## Integration Tasks (When Ready)

1. **Import auto model module**
2. **Replace static model assignment**
3. **Add model selection logging**
4. **Update API responses to include model choice**
5. **Add cost tracking and budgeting**

## Test Cases Ready

```typescript
// Complex case → Opus
const complexCase = { ticketCount: 5, riskLevel: 'High' };

// Simple case → Haiku
const simpleCase = { ticketCount: 1, riskLevel: 'Low' };

// Standard case → Sonnet
const standardCase = { ticketCount: 2, riskLevel: 'Medium' };
```

Ready for when you copy it over! 🚀