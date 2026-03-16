# Telehealth Booking Integration Guide

## ✅ What's Done

### Frontend
- **Component**: `client/src/components/TelehealthBookingModal.tsx`
- **Integration**: Added to `PageLayout.tsx` - accessible via "Book Telehealth" button in header
- **Form Fields**:
  - Worker Name (required)
  - Worker Email (required)
  - Preferred Date (required, cannot be in the past)
  - Preferred Time (required, defaults to 09:00)
  - Notes (optional, multi-line)
  - Attachments (optional, accepts PDF/JPG/PNG/DOC)

### Form Behavior
- Client-side validation
- File upload support via FormData
- Success confirmation screen after submission
- Posts to: `POST /api/telehealth/booking`

## 🚧 What's Next - Backend Implementation

### 1. API Endpoint
Create: `server/routes/telehealth.ts`

```typescript
import { Router } from "express";
import multer from "multer";
import { db } from "@db";
import { telehealthBookingRequests } from "@db/schema";
import { requireAuth } from "../middleware/auth";
import { sendTelehealthProviderEmails } from "../services/telehealth";

const router = Router();

// Configure file upload
const upload = multer({
  dest: "uploads/telehealth",
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [".pdf", ".jpg", ".jpeg", ".png", ".doc", ".docx"];
    const ext = file.originalname.toLowerCase().match(/\.[^.]+$/)?.[0];
    if (ext && allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type"));
    }
  },
});

router.post(
  "/booking",
  requireAuth,
  upload.array("attachments", 5),
  async (req, res) => {
    try {
      const { workerName, workerEmail, preferredDate, preferredTime, notes } = req.body;
      const files = req.files as Express.Multer.File[];

      // Validate required fields
      if (!workerName || !workerEmail || !preferredDate || !preferredTime) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Create booking request
      const [booking] = await db
        .insert(telehealthBookingRequests)
        .values({
          clientOrgId: req.user.organizationId, // assuming auth middleware provides this
          workerName,
          workerEmail,
          preferredDate: new Date(preferredDate),
          preferredTime,
          notes,
          attachmentPaths: files ? files.map((f) => f.path) : [],
          status: "pending",
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        })
        .returning();

      // Trigger agent to notify providers
      await sendTelehealthProviderEmails(booking);

      res.json({ success: true, bookingId: booking.id });
    } catch (error) {
      console.error("Telehealth booking error:", error);
      res.status(500).json({ error: "Failed to create booking" });
    }
  }
);

export default router;
```

### 2. Database Schema
Already drafted in: `telehealth-booking/telehealth-booking-agent.md`

Key tables:
- `telehealth_providers` - provider directory
- `provider_supplier_relationships` - which providers work with which clients
- `telehealth_booking_requests` - booking requests with status tracking
- `telehealth_provider_responses` - log of provider replies

Run migration to create these tables.

### 3. Email Service
Create: `server/services/telehealth.ts`

Implements the agent logic from `telehealth-booking-agent.md`:
- Get eligible providers for client org
- Send notification emails to all providers
- Set up inbound email handler (webhook or polling)
- Handle "first come first served" logic with transaction safety
- Send confirmation emails
- Handle 24-hour timeout

### 4. Mount Route
In `server/index.ts`:

```typescript
import telehealthRoutes from "./routes/telehealth";
app.use("/api/telehealth", telehealthRoutes);
```

## 📋 Implementation Checklist

Backend:
- [ ] Create database migration for telehealth tables
- [ ] Implement `/api/telehealth/booking` endpoint
- [ ] Set up file upload handling (multer or similar)
- [ ] Create email notification service
- [ ] Set up inbound email webhook/polling
- [ ] Implement provider response handler
- [ ] Add 24-hour timeout scheduler
- [ ] Add provider management UI (admin panel)

Testing:
- [ ] Test form submission
- [ ] Test file uploads
- [ ] Test email sending
- [ ] Test race condition (multiple providers replying simultaneously)
- [ ] Test timeout handling

## 🎨 Design Notes
- Form uses existing shadcn/ui components for consistency
- Matches Preventli's blue color scheme
- Mobile responsive
- Dark mode compatible

## 📧 Email Integration
Refer to `telehealth-booking/telehealth-booking-agent.md` for:
- Email templates (provider request, confirmation, timeout)
- Reply-to addressing scheme (`booking-{uuid}@preventli.com`)
- Inbound parsing logic
- Transaction safety for first-come-first-served

## 🔗 Related Files
- Frontend: `/home/paul_clawdbot/dev/gpnet3/client/src/components/TelehealthBookingModal.tsx`
- Agent Logic: `/home/paul_clawdbot/clawd/telehealth-booking/telehealth-booking-agent.md`
- Standalone Demo: `/home/paul_clawdbot/clawd/telehealth-booking/test-page.html`
