# Certificate Dots Fix Validation

## Changes Made

### 1. Replaced Area Chart Custom Dots with ReferenceDot Components

**Before:**
```typescript
<Area
  dot={(props: any) => {
    const { cx, cy, payload } = props;
    if (payload?.actual === null || payload?.actual === undefined) return null;
    if (!payload?.certificateExists) return null; // ❌ Problem: dots only show with actual data
    return <circle cx={cx} cy={cy} r={5} fill="#10b981" stroke="#059669" strokeWidth={2} />;
  }}
/>
```

**After:**
```typescript
<Area dot={false} />

{/* Independent certificate dots */}
{data.certificateMarkers
  .filter(marker => marker.week >= 0 && marker.week <= (data.weeksElapsed + 2) && marker.capacity >= 0 && marker.capacity <= 100)
  .map((marker, index) => (
    <ReferenceDot
      key={`cert-${marker.certificateId}-${index}`}
      x={marker.week}
      y={marker.capacity}
      r={7}
      fill={marker.color}
      stroke="#ffffff"
      strokeWidth={2}
      style={{ cursor: 'pointer' }}
      onClick={() => setSelectedCertificate(marker)}
    />
  ))
}
```

### 2. Enhanced Debugging and Visual Feedback

- Added console logging for certificate marker rendering
- Enhanced legend to show week information and debug messages
- Clear indication when no certificates are found

## Expected Results

### ✅ Fixed Issues:
1. **Dots always visible**: Certificate dots now show regardless of gaps in actual recovery data
2. **Proper positioning**: Dots positioned exactly at certificate week and capacity percentage  
3. **Reliable clicking**: Each dot has independent click handler
4. **Better debugging**: Clear console output and visual feedback

### 🧪 Test Cases:

1. **Case with certificates**: Should see colored dots on the chart at certificate weeks
2. **Case without certificates**: Should see debug message "No certificates found"
3. **Click functionality**: Clicking dots should open certificate modal
4. **Hover effects**: Cursor should change to pointer over dots

### 🔍 What to Look For:

**In Browser Console:**
```
Rendering certificate marker 1: { week: 2, capacity: 25, certificateId: "abc123", color: "#ef4444" }
Rendering certificate marker 2: { week: 6, capacity: 60, certificateId: "def456", color: "#f59e0b" }
Certificate dot clicked: { week: 2, capacity: 25, ... }
```

**On Chart:**
- Colored dots visible on recovery timeline
- Dots positioned at correct week (X-axis) and capacity (Y-axis)
- Dots clickable and open certificate details modal
- Legend shows certificate count and debug info

## Root Cause Analysis

The original issue was architectural:
- **Dependency coupling**: Certificate dots were tied to Area chart actual data
- **Data gaps**: Missing actual recovery data = missing certificate dots
- **Click handling**: Custom dots in Area charts don't handle events reliably

The fix decouples certificate visualization from recovery curve data, making them independent visual elements that are always present when certificate data exists.