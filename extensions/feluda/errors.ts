export class FeludaError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class FeludaNotFoundError extends FeludaError {
  constructor(message = "Feluda CLI was not found in PATH.") {
    super(message, "feluda-not-found");
  }
}

export class FeludaExecutionError extends FeludaError {
  constructor(
    message: string,
    public readonly stderr = "",
    public readonly exitCode?: number | null,
  ) {
    super(message, "feluda-execution-error");
  }
}

export class FeludaNetworkError extends FeludaError {
  constructor(message: string) {
    super(message, "feluda-network-error");
  }
}

export class FeludaParseError extends FeludaError {
  constructor(message: string) {
    super(message, "feluda-parse-error");
  }
}

export function normalizeError(error: unknown): FeludaError {
  if (error instanceof FeludaError) return error;
  if (error instanceof Error) return new FeludaError(error.message, "feluda-error");
  return new FeludaError(String(error), "feluda-error");
}
