import { describe, expect, it } from "vitest";
import { summarizeCompatibility, summarizeRestrictive, summarizeSbom, summarizeScan } from "../extensions/feluda/summarizer";
import type { FeludaLicenseEntry } from "../extensions/feluda/types";

const entries: FeludaLicenseEntry[] = [
  {
    name: "serde",
    version: "1.0.214",
    license: "MIT",
    is_restrictive: false,
    compatibility: "Compatible",
    osi_status: "Approved",
  },
  {
    name: "fancy-gpl-lib",
    version: "3.1.0",
    license: "GPL-3.0",
    is_restrictive: true,
    compatibility: "Incompatible",
    osi_status: "Approved",
  },
  {
    name: "mystery-lib",
    version: "0.9.0",
    license: null,
    is_restrictive: false,
    compatibility: "Unknown",
    osi_status: "Unknown",
  },
];

describe("feluda summarizer", () => {
  it("summarizes a scan", () => {
    const summary = summarizeScan({
      projectPath: "/repo",
      language: "auto",
      totalDependencies: 3,
      restrictiveCount: 1,
      incompatibleCount: 1,
      dependencies: entries,
    });
    expect(summary).toContain("## Feluda license scan");
    expect(summary).toContain("Restrictive: 1");
    expect(summary).toContain("fancy-gpl-lib");
  });

  it("summarizes restrictive-only results", () => {
    const summary = summarizeRestrictive({
      projectPath: "/repo",
      language: "rust",
      totalRestrictive: 1,
      restrictiveDependencies: [entries[1]!],
    });
    expect(summary).toContain("restrictive-license check");
    expect(summary).toContain("GPL-3.0");
  });

  it("summarizes compatibility results", () => {
    const summary = summarizeCompatibility({
      projectPath: "/repo",
      language: "rust",
      projectLicense: "MIT",
      totalDependencies: 3,
      compatibleCount: 1,
      incompatibleCount: 1,
      unknownCount: 1,
      dependencies: entries,
    });
    expect(summary).toContain("Project license: MIT");
    expect(summary).toContain("Unknown: 1");
  });

  it("summarizes sbom output", () => {
    const summary = summarizeSbom({
      projectPath: "/repo",
      language: "auto",
      format: "spdx",
      outputFile: "sbom.spdx.json",
      dependencyCount: 3,
    });
    expect(summary).toContain("SBOM generation");
    expect(summary).toContain("sbom.spdx.json");
  });
});
