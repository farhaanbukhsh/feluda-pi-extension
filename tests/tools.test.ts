import { describe, expect, it, vi, beforeEach } from "vitest";

vi.mock("../extensions/feluda/cli", async () => {
  const actual = await vi.importActual<typeof import("../extensions/feluda/cli")>("../extensions/feluda/cli");
  return {
    ...actual,
    runFeluda: vi.fn(),
    readSbomDependencyCount: vi.fn(),
    detectFeludaBinary: vi.fn(),
  };
});

import * as cli from "../extensions/feluda/cli";
import { checkCompatibilityTool } from "../extensions/feluda/tools/check-compatibility";
import { checkRestrictiveTool } from "../extensions/feluda/tools/check-restrictive";
import { generateSbomTool } from "../extensions/feluda/tools/generate-sbom";
import { scanLicensesTool } from "../extensions/feluda/tools/scan-licenses";
const basicScan = [
  {
    name: "serde",
    version: "1.0.214",
    license: "MIT",
    is_restrictive: false,
    compatibility: "Compatible",
    osi_status: "Approved",
  },
  {
    name: "tokio",
    version: "1.42.0",
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
];

const restrictive = [basicScan[2]!];

const compatibility = [
  basicScan[0]!,
  basicScan[2]!,
  {
    name: "mystery-lib",
    version: "0.9.0",
    license: null,
    is_restrictive: false,
    compatibility: "Unknown",
    osi_status: "Unknown",
  },
];

const ctx = { cwd: "/repo", hasUI: false } as any;

describe("feluda tools", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it("scan_licenses returns structured details", async () => {
    vi.mocked(cli.runFeluda).mockResolvedValue({ stdout: JSON.stringify(basicScan), stderr: "" });
    const result = await scanLicensesTool.execute("t1", { path: "/repo" }, undefined, undefined, ctx);
    expect((result.details as any).totalDependencies).toBe(3);
  });

  it("check_restrictive returns restrictive count", async () => {
    vi.mocked(cli.runFeluda).mockResolvedValue({ stdout: JSON.stringify(restrictive), stderr: "" });
    const result = await checkRestrictiveTool.execute("t2", { path: "/repo" }, undefined, undefined, ctx);
    expect((result.details as any).totalRestrictive).toBe(1);
  });

  it("check_compatibility returns compatibility counts", async () => {
    vi.mocked(cli.runFeluda).mockResolvedValue({ stdout: JSON.stringify(compatibility), stderr: "" });
    const result = await checkCompatibilityTool.execute(
      "t3",
      { path: "/repo", projectLicense: "MIT" },
      undefined,
      undefined,
      ctx,
    );
    expect((result.details as any).incompatibleCount).toBe(1);
  });

  it("generate_sbom returns output metadata", async () => {
    vi.mocked(cli.runFeluda).mockResolvedValue({ stdout: "", stderr: "" });
    vi.mocked(cli.readSbomDependencyCount).mockResolvedValue(3);
    const result = await generateSbomTool.execute(
      "t4",
      { path: "/repo", format: "spdx", output: "sbom" },
      undefined,
      undefined,
      ctx,
    );
    expect((result.details as any).dependencyCount).toBe(3);
    expect((result.details as any).outputFile).toBe("sbom.spdx.json");
  });
});
