import type {
  CompatibilitySummaryDetails,
  FeludaCompatibility,
  FeludaLicenseEntry,
  RestrictiveSummaryDetails,
  SbomSummaryDetails,
  ScanSummaryDetails,
} from "./types";

const MAX_ROWS = 50;

function normalizeLicense(license: string | null): string {
  return license?.trim() || "No License";
}

function normalizeCompatibility(value: FeludaCompatibility | undefined): string {
  return value ?? "Unknown";
}

function normalizeOsi(value: string | undefined): string {
  return value ?? "unknown";
}

function truncateEntries<T>(items: T[]): { visible: T[]; hiddenCount: number } {
  if (items.length <= MAX_ROWS) return { visible: items, hiddenCount: 0 };
  return { visible: items.slice(0, MAX_ROWS), hiddenCount: items.length - MAX_ROWS };
}

function asTable(entries: FeludaLicenseEntry[], mode: "scan" | "compatibility"): string {
  const { visible, hiddenCount } = truncateEntries(entries);
  const header =
    mode === "compatibility"
      ? "| Package | Version | License | Compatibility | Restrictive | OSI |\n|---|---|---|---|---|---|"
      : "| Package | Version | License | Restrictive | OSI |\n|---|---|---|---|---|";

  const rows = visible.map((entry) => {
    const base = [entry.name, entry.version, normalizeLicense(entry.license)];
    if (mode === "compatibility") {
      return `| ${base.join(" | ")} | ${normalizeCompatibility(entry.compatibility)} | ${entry.is_restrictive ? "yes" : "no"} | ${normalizeOsi(entry.osi_status)} |`;
    }
    return `| ${base.join(" | ")} | ${entry.is_restrictive ? "yes" : "no"} | ${normalizeOsi(entry.osi_status)} |`;
  });

  if (hiddenCount > 0) {
    rows.push(`\n_Showing ${visible.length} of ${entries.length} dependencies; ${hiddenCount} more omitted for brevity._`);
  }

  return [header, ...rows].join("\n");
}

export function summarizeScan(details: Omit<ScanSummaryDetails, "summaryMarkdown">): string {
  const headline = [
    "## Feluda license scan",
    `- Project: \`${details.projectPath}\``,
    `- Language: ${details.language}`,
    `- Dependencies: ${details.totalDependencies}`,
    `- Restrictive: ${details.restrictiveCount}`,
    `- Incompatible: ${details.incompatibleCount}`,
    "",
  ].join("\n");

  if (details.dependencies.length === 0) {
    return `${headline}No dependencies were reported by Feluda.`;
  }

  return `${headline}${asTable(details.dependencies, "scan")}`;
}

export function summarizeRestrictive(details: Omit<RestrictiveSummaryDetails, "summaryMarkdown">): string {
  const headline = [
    "## Feluda restrictive-license check",
    `- Project: \`${details.projectPath}\``,
    `- Language: ${details.language}`,
    `- Restrictive dependencies: ${details.totalRestrictive}`,
    "",
  ].join("\n");

  if (details.restrictiveDependencies.length === 0) {
    return `${headline}Feluda did not report any restrictive dependencies.`;
  }

  return `${headline}${asTable(details.restrictiveDependencies, "scan")}`;
}

export function summarizeCompatibility(details: Omit<CompatibilitySummaryDetails, "summaryMarkdown">): string {
  const headline = [
    "## Feluda compatibility check",
    `- Project: \`${details.projectPath}\``,
    `- Language: ${details.language}`,
    `- Project license: ${details.projectLicense}`,
    `- Compatible: ${details.compatibleCount}`,
    `- Incompatible: ${details.incompatibleCount}`,
    `- Unknown: ${details.unknownCount}`,
    "",
  ].join("\n");

  if (details.dependencies.length === 0) {
    return `${headline}Feluda did not report any dependencies for compatibility analysis.`;
  }

  return `${headline}${asTable(details.dependencies, "compatibility")}`;
}

export function summarizeSbom(details: Omit<SbomSummaryDetails, "summaryMarkdown">): string {
  const output = Array.isArray(details.outputFile) ? details.outputFile.map((f) => `- \`${f}\``).join("\n") : `- \`${details.outputFile}\``;

  return [
    "## Feluda SBOM generation",
    `- Project: \`${details.projectPath}\``,
    `- Language: ${details.language}`,
    `- Format: ${details.format}`,
    `- Packages/components counted: ${details.dependencyCount}`,
    "- Output:",
    output,
  ].join("\n");
}
