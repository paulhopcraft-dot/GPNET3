import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

// Handle EPIPE errors gracefully on Windows
// This prevents crashes when stdout/stderr pipes are closed unexpectedly
// (e.g., when running in CI or when output is piped to another command)
if (typeof process !== "undefined") {
  const handlePipeError = (err: NodeJS.ErrnoException) => {
    if (err.code === "EPIPE" || err.code === "ERR_STREAM_DESTROYED") {
      // Ignore EPIPE errors - pipe was closed, nothing we can do
      return;
    }
    // Re-throw other errors
    throw err;
  };

  process.stdout?.on?.("error", handlePipeError);
  process.stderr?.on?.("error", handlePipeError);
}
