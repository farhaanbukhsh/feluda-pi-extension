import { describe, expect, it } from "vitest";
import { FeludaExecutionError, FeludaNotFoundError, normalizeError } from "../extensions/feluda/errors";

describe("feluda errors", () => {
  it("preserves feluda-specific errors", () => {
    const error = new FeludaNotFoundError();
    expect(normalizeError(error)).toBe(error);
  });

  it("wraps generic errors", () => {
    const error = normalizeError(new Error("boom"));
    expect(error.code).toBe("feluda-error");
    expect(error.message).toBe("boom");
  });

  it("stores stderr and exit code for execution errors", () => {
    const error = new FeludaExecutionError("failed", "stderr text", 2);
    expect(error.stderr).toBe("stderr text");
    expect(error.exitCode).toBe(2);
  });
});
