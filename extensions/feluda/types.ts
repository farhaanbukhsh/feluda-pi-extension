export const FELUDA_LANGUAGES = [
  "rust",
  "node",
  "go",
  "python",
  "c",
  "cpp",
  "r",
  "dotnet",
] as const;

export const FELUDA_OSI_FILTERS = ["approved", "not-approved", "unknown"] as const;
export const FELUDA_SBOM_FORMATS = ["spdx", "cyclonedx", "all"] as const;

export type FeludaLanguage = (typeof FELUDA_LANGUAGES)[number];
export type FeludaOsiFilter = (typeof FELUDA_OSI_FILTERS)[number];
export type FeludaSbomFormat = (typeof FELUDA_SBOM_FORMATS)[number];

export type FeludaCompatibility = "Compatible" | "Incompatible" | "Unknown";
export type FeludaOsiStatus = "Approved" | "NotApproved" | "Unknown" | "approved" | "not-approved" | "unknown";

export interface FeludaLicenseEntry {
  name: string;
  version: string;
  license: string | null;
  is_restrictive: boolean;
  compatibility: FeludaCompatibility;
  osi_status: FeludaOsiStatus;
}

export interface ScanSummaryDetails {
  projectPath: string;
  language: string;
  totalDependencies: number;
  restrictiveCount: number;
  incompatibleCount: number;
  dependencies: FeludaLicenseEntry[];
  summaryMarkdown: string;
}

export interface RestrictiveSummaryDetails {
  projectPath: string;
  language: string;
  totalRestrictive: number;
  restrictiveDependencies: FeludaLicenseEntry[];
  summaryMarkdown: string;
}

export interface CompatibilitySummaryDetails {
  projectPath: string;
  language: string;
  projectLicense: string;
  totalDependencies: number;
  compatibleCount: number;
  incompatibleCount: number;
  unknownCount: number;
  dependencies: FeludaLicenseEntry[];
  summaryMarkdown: string;
}

export interface SbomSummaryDetails {
  projectPath: string;
  language: string;
  format: FeludaSbomFormat;
  outputFile: string | string[];
  dependencyCount: number;
  summaryMarkdown: string;
}

export interface ErrorDetails {
  code: string;
  summaryMarkdown: string;
}
