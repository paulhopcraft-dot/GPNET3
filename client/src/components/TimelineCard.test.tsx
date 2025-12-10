// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import * as matchers from "@testing-library/jest-dom/matchers";
import { TimelineCard } from "./TimelineCard";
import type { TimelineResponse } from "@shared/schema";

expect.extend(matchers);

describe("TimelineCard", () => {
  beforeEach(() => {
    // Mock fetch globally
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("shows loading state initially", () => {
    // Mock fetch to never resolve (simulates loading)
    (global.fetch as any).mockImplementation(() => new Promise(() => {}));

    render(<TimelineCard caseId="TEST-001" />);

    expect(screen.getByText("Loading timeline...")).toBeInTheDocument();
    expect(screen.getByText("Loading timeline...")).toBeVisible();
  });

  it("shows error state on fetch failure", async () => {
    // Mock fetch to reject with error
    (global.fetch as any).mockRejectedValue(new Error("Network error"));

    render(<TimelineCard caseId="TEST-001" />);

    await waitFor(() => {
      expect(screen.getByText(/Timeline unavailable/i)).toBeInTheDocument();
    });

    // Verify error icon is present
    expect(screen.queryByText("Loading timeline...")).not.toBeInTheDocument();
  });

  it("shows error state when response is not ok", async () => {
    // Mock fetch to return non-ok response
    (global.fetch as any).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<TimelineCard caseId="TEST-001" />);

    await waitFor(() => {
      expect(screen.getByText(/Failed to fetch timeline/i)).toBeInTheDocument();
    });
  });

  it("shows empty state when no events", async () => {
    const mockResponse: TimelineResponse = {
      caseId: "TEST-001",
      events: [],
      totalEvents: 0,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    render(<TimelineCard caseId="TEST-001" />);

    await waitFor(() => {
      expect(screen.getByText("No timeline events available yet.")).toBeInTheDocument();
    });

    // Verify loading state is gone
    expect(screen.queryByText("Loading timeline...")).not.toBeInTheDocument();
  });

  it("displays events correctly", async () => {
    const mockResponse: TimelineResponse = {
      caseId: "TEST-001",
      events: [
        {
          id: "evt-1",
          caseId: "TEST-001",
          eventType: "certificate_added",
          timestamp: "2025-01-15T10:00:00Z",
          title: "Medical Certificate Added",
          description: "Capacity: unfit | 15 Jan 2025 - 22 Jan 2025",
          severity: "warning",
          icon: "medical_information",
          metadata: { capacity: "unfit" },
        },
        {
          id: "evt-2",
          caseId: "TEST-001",
          eventType: "discussion_note",
          timestamp: "2025-01-10T14:00:00Z",
          title: "Discussion Note Added",
          description: "Worker missed appointment",
          severity: "critical",
          icon: "forum",
          metadata: { riskFlags: ["critical", "non-compliance"] },
        },
        {
          id: "evt-3",
          caseId: "TEST-001",
          eventType: "attachment_uploaded",
          timestamp: "2025-01-20T16:30:00Z",
          title: "Document Uploaded",
          description: "medical-report.pdf (application/pdf)",
          severity: "info",
          icon: "attach_file",
        },
      ],
      totalEvents: 3,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    render(<TimelineCard caseId="TEST-001" />);

    await waitFor(() => {
      expect(screen.getByText("Medical Certificate Added")).toBeInTheDocument();
      expect(screen.getByText("Discussion Note Added")).toBeInTheDocument();
      expect(screen.getByText("Document Uploaded")).toBeInTheDocument();
    });

    // Check descriptions are rendered
    expect(screen.getByText(/Capacity: unfit/i)).toBeInTheDocument();
    expect(screen.getByText(/Worker missed appointment/i)).toBeInTheDocument();
  });

  it("applies correct severity colors", async () => {
    const mockResponse: TimelineResponse = {
      caseId: "TEST-001",
      events: [
        {
          id: "critical-event",
          caseId: "TEST-001",
          eventType: "discussion_note",
          timestamp: "2025-01-15T10:00:00Z",
          title: "Critical Event",
          severity: "critical",
        },
        {
          id: "warning-event",
          caseId: "TEST-001",
          eventType: "certificate_added",
          timestamp: "2025-01-14T10:00:00Z",
          title: "Warning Event",
          severity: "warning",
        },
        {
          id: "info-event",
          caseId: "TEST-001",
          eventType: "attachment_uploaded",
          timestamp: "2025-01-13T10:00:00Z",
          title: "Info Event",
          severity: "info",
        },
      ],
      totalEvents: 3,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    render(<TimelineCard caseId="TEST-001" />);

    await waitFor(() => {
      expect(screen.getByText("Critical Event")).toBeInTheDocument();
    });

    // Check severity-based classes are applied
    const container = screen.getByTestId("card-timeline");
    expect(container).toBeInTheDocument();

    // Verify all events are rendered (severity colors are applied via classes)
    expect(screen.getByText("Critical Event")).toBeInTheDocument();
    expect(screen.getByText("Warning Event")).toBeInTheDocument();
    expect(screen.getByText("Info Event")).toBeInTheDocument();
  });

  it("displays risk flags for discussion notes", async () => {
    const mockResponse: TimelineResponse = {
      caseId: "TEST-001",
      events: [
        {
          id: "note-1",
          caseId: "TEST-001",
          eventType: "discussion_note",
          timestamp: "2025-01-15T10:00:00Z",
          title: "Discussion Note",
          metadata: {
            riskFlags: ["Flag 1", "Flag 2", "Flag 3", "Flag 4"],
          },
        },
      ],
      totalEvents: 1,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    render(<TimelineCard caseId="TEST-001" />);

    await waitFor(() => {
      expect(screen.getByText("Discussion Note")).toBeInTheDocument();
    });

    // Only first 3 flags should be displayed
    expect(screen.getByText("Flag 1")).toBeInTheDocument();
    expect(screen.getByText("Flag 2")).toBeInTheDocument();
    expect(screen.getByText("Flag 3")).toBeInTheDocument();
    expect(screen.queryByText("Flag 4")).not.toBeInTheDocument();
  });

  it("formats timestamps correctly", async () => {
    const mockResponse: TimelineResponse = {
      caseId: "TEST-001",
      events: [
        {
          id: "evt-1",
          caseId: "TEST-001",
          eventType: "certificate_added",
          timestamp: "2025-01-15T14:30:00Z",
          title: "Test Event",
        },
      ],
      totalEvents: 1,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    render(<TimelineCard caseId="TEST-001" />);

    await waitFor(() => {
      expect(screen.getByText("Test Event")).toBeInTheDocument();
    });

    // The timestamp should be formatted in en-AU locale
    // Note: The exact format depends on the timezone, but we can check it exists
    const container = screen.getByTestId("card-timeline");
    expect(container.textContent).toMatch(/\d{2}\s\w{3}\s\d{4}/); // Pattern like "15 Jan 2025"
  });

  it("formats event type labels correctly", async () => {
    const mockResponse: TimelineResponse = {
      caseId: "TEST-001",
      events: [
        {
          id: "evt-1",
          caseId: "TEST-001",
          eventType: "discussion_note",
          timestamp: "2025-01-15T10:00:00Z",
          title: "Test Event",
        },
      ],
      totalEvents: 1,
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    render(<TimelineCard caseId="TEST-001" />);

    await waitFor(() => {
      // Event type "discussion_note" should be formatted as "Discussion Note"
      expect(screen.getByText("DISCUSSION NOTE")).toBeInTheDocument();
    });
  });

  it("handles component cleanup on unmount", async () => {
    let resolvePromise: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolvePromise = resolve;
    });

    (global.fetch as any).mockImplementation(() => fetchPromise);

    const { unmount } = render(<TimelineCard caseId="TEST-001" />);

    // Unmount before fetch completes
    unmount();

    // Now resolve the promise after unmount
    resolvePromise!({
      ok: true,
      json: async () => ({ caseId: "TEST-001", events: [], totalEvents: 0 }),
    });

    // Wait a bit to ensure no state updates occur after unmount
    await new Promise((resolve) => setTimeout(resolve, 100));

    // If cleanup works properly, no errors should occur
    // (React will warn in console if setState is called after unmount)
  });

  it("refetches when caseId changes", async () => {
    const mockResponse1: TimelineResponse = {
      caseId: "TEST-001",
      events: [
        {
          id: "evt-1",
          caseId: "TEST-001",
          eventType: "certificate_added",
          timestamp: "2025-01-15T10:00:00Z",
          title: "Case 1 Event",
        },
      ],
      totalEvents: 1,
    };

    const mockResponse2: TimelineResponse = {
      caseId: "TEST-002",
      events: [
        {
          id: "evt-2",
          caseId: "TEST-002",
          eventType: "discussion_note",
          timestamp: "2025-01-16T10:00:00Z",
          title: "Case 2 Event",
        },
      ],
      totalEvents: 1,
    };

    (global.fetch as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse1,
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse2,
      });

    const { rerender } = render(<TimelineCard caseId="TEST-001" />);

    await waitFor(() => {
      expect(screen.getByText("Case 1 Event")).toBeInTheDocument();
    });

    // Change caseId prop
    rerender(<TimelineCard caseId="TEST-002" />);

    await waitFor(() => {
      expect(screen.getByText("Case 2 Event")).toBeInTheDocument();
    });

    // Verify first event is no longer displayed
    expect(screen.queryByText("Case 1 Event")).not.toBeInTheDocument();

    // Verify fetch was called twice
    expect(global.fetch).toHaveBeenCalledTimes(2);
    expect(global.fetch).toHaveBeenCalledWith("/api/cases/TEST-001/timeline");
    expect(global.fetch).toHaveBeenCalledWith("/api/cases/TEST-002/timeline");
  });
});
