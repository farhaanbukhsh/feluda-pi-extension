import { access } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { FeludaExecutionError, FeludaNetworkError, FeludaNotFoundError, FeludaParseError } from "./errors";
import type { FeludaLanguage, FeludaOsiFilter, FeludaSbomFormat, FeludaLicenseEntry } from "./types";

const execFileAsync = promisify(execFile);

export interface BaseFeludaOptions {
  path?: string;
  language?: FeludaLanguage;
}

export interface ScanCliOptions extends BaseFeludaOptions {
  osi?: FeludaOsiFilter;
  noLocal?: boolean;
}

export interface CompatibilityCliOptions extends BaseFeludaOptions {
  projectLicense: string;
  incompatibleOnly?: boolean;
}

export interface SbomCliOptions extends BaseFeludaOptions {
  format: FeludaSbomFormat;
  output?: string;
}

export async function detectFeludaBinary(envPath = process.env.PATH): Promise<string | null> {
  const pathEntries = (envPath ?? "").split(path.delimiter).filter(Boolean);
  const candidateNames = os.platform() === "win32" ? ["feluda.exe", "feluda"] : ["feluda"];

  const cargoBin = path.join(os.homedir(), ".cargo", "bin");
  const searchPaths = [cargoBin, ...pathEntries];

  for (const dir of searchPaths) {
    for (const candidate of candidateNames) {
      const fullPath = path.join(dir, candidate);
      try {
        await access(fullPath);
        return fullPath;
      } catch {
        // continue
      }
    }
  }

  return null;
}

export function buildScanArgs(options: ScanCliOptions): string[] {
  const args: string[] = [];
  if (options.path) args.push("--path", options.path);
  if (options.language) args.push("--language", options.language);
  if (options.osi) args.push("--osi", options.osi);
  if (options.noLocal) args.push("--no-local");
  args.push("--json");
  return args;
}

export function buildRestrictiveArgs(options: ScanCliOptions): string[] {
  const args = buildScanArgs(options);
  args.splice(args.length - 1, 0, "--restrictive");
  return args;
}

export function buildCompatibilityArgs(options: CompatibilityCliOptions): string[] {
  const args: string[] = [];
  if (options.path) args.push("--path", options.path);
  if (options.language) args.push("--language", options.language);
  args.push("--project-license", options.projectLicense);
  if (options.incompatibleOnly) args.push("--incompatible");
  args.push("--json");
  return args;
}

export function buildSbomArgs(options: SbomCliOptions): string[] {
  const args = ["sbom"];

  if (options.format !== "all") {
    args.push(options.format);
  }

  if (options.path) args.push("--path", options.path);
  if (options.output) args.push("--output", options.output);
  return args;
}

export async function runFeluda(args: string[], signal?: AbortSignal): Promise<{ stdout: string; stderr: string }> {
  const binary = await detectFeludaBinary();
  if (!binary) {
    throw new FeludaNotFoundError();
  }

  try {
    const result = await execFileAsync(binary, args, {
      timeout: 120_000,
      maxBuffer: 10 * 1024 * 1024,
      signal,
    });
    return {
      stdout: result.stdout ?? "",
      stderr: result.stderr ?? "",
    };
  } catch (error) {
    const stderr = typeof error === "object" && error && "stderr" in error ? String((error as { stderr?: string }).stderr ?? "") : "";
    const exitCode = typeof error === "object" && error && "code" in error ? Number((error as { code?: number }).code ?? 0) : undefined;
    const message = stderr || (error instanceof Error ? error.message : String(error));
    const lower = message.toLowerCase();

    if (lower.includes("rate limit") || lower.includes("timed out") || lower.includes("network") || lower.includes("github")) {
      throw new FeludaNetworkError(message);
    }

    throw new FeludaExecutionError(message, stderr, exitCode);
  }
}

export function parseLicenseEntries(stdout: string): FeludaLicenseEntry[] {
  try {
    const parsed = JSON.parse(stdout) as unknown;
    if (!Array.isArray(parsed)) {
      throw new Error("Expected an array of dependency entries");
    }
    return parsed as FeludaLicenseEntry[];
  } catch (error) {
    throw new FeludaParseError(`Failed to parse Feluda JSON output: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function resolveSbomOutput(options: SbomCliOptions, cwd: string): {
  outputArg: string;
  outputFile: string | string[];
} {
  const base = options.output ?? path.join(cwd, "feluda-sbom");

  if (options.format === "all") {
    const prefix = base.endsWith(".json") ? base.replace(/\.json$/i, "") : base;
    return {
      outputArg: prefix,
      outputFile: [`${prefix}.spdx.json`, `${prefix}.cyclonedx.json`],
    };
  }

  const outputFile = base.endsWith(".json") ? base : `${base}.${options.format}.json`;
  return {
    outputArg: outputFile,
    outputFile,
  };
}

export async function readSbomDependencyCount(outputPath: string | string[]): Promise<number> {
  const paths = Array.isArray(outputPath) ? outputPath : [outputPath];
  let total = 0;

  for (const file of paths) {
    const fs = await import("node:fs/promises");
    const content = await fs.readFile(file, "utf8");
    try {
      const parsed = JSON.parse(content) as Record<string, unknown>;
      if (Array.isArray(parsed.packages)) {
        total += parsed.packages.length;
      } else if (Array.isArray(parsed.components)) {
        total += parsed.components.length;
      }
    } catch {
      // non-json or unexpected shape; ignore count contribution
    }
  }

  return total;
}
