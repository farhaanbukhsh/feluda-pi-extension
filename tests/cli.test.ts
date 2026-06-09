import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCompatibilityArgs,
  buildRestrictiveArgs,
  buildScanArgs,
  buildSbomArgs,
  parseLicenseEntries,
  readSbomDependencyCount,
  resolveSbomOutput,
} from "../extensions/feluda/cli";

const fixtures = path.join(process.cwd(), "tests", "fixtures");

describe("feluda cli helpers", () => {
  it("builds scan args", () => {
    expect(
      buildScanArgs({ path: "/repo", language: "rust", osi: "approved", noLocal: true }),
    ).toEqual(["--path", "/repo", "--language", "rust", "--osi", "approved", "--no-local", "--json"]);
  });

  it("builds restrictive args", () => {
    expect(buildRestrictiveArgs({ path: "/repo", language: "node" })).toEqual([
      "--path",
      "/repo",
      "--language",
      "node",
      "--restrictive",
      "--json",
    ]);
  });

  it("builds compatibility args", () => {
    expect(
      buildCompatibilityArgs({ path: "/repo", projectLicense: "MIT", incompatibleOnly: true }),
    ).toEqual(["--path", "/repo", "--project-license", "MIT", "--incompatible", "--json"]);
  });

  it("builds sbom args", () => {
    expect(buildSbomArgs({ path: "/repo", format: "spdx", output: "out.json" })).toEqual([
      "sbom",
      "spdx",
      "--path",
      "/repo",
      "--output",
      "out.json",
    ]);
  });

  it("parses license entries from feluda json", async () => {
    const stdout = await readFile(path.join(fixtures, "basic-scan.json"), "utf8");
    const entries = parseLicenseEntries(stdout);
    expect(entries).toHaveLength(3);
    expect(entries[2]?.name).toBe("fancy-gpl-lib");
  });

  it("parses license entries from mixed spinner + json output", async () => {
    const stdout = await readFile(path.join(fixtures, "basic-scan.json"), "utf8");
    const noisy = `\u001b[2K\r⠋ scanning...\n${stdout}`;
    const entries = parseLicenseEntries(noisy);
    expect(entries).toHaveLength(3);
    expect(entries[0]?.name).toBe("serde");
  });

  it("treats success-without-json restrictive output as empty results", () => {
    const stdout = "\u001b[2K\r⠋ scanning...\n🎉 All dependencies passed the license check! No restrictive or incompatible licenses found.\n";
    const entries = parseLicenseEntries(stdout);
    expect(entries).toEqual([]);
  });

  it("resolves sbom output paths for single format", () => {
    expect(resolveSbomOutput({ format: "spdx", output: "sbom" }, "/tmp")).toEqual({
      outputArg: "sbom.spdx.json",
      outputFile: "sbom.spdx.json",
    });
  });

  it("resolves sbom output prefix for all formats", () => {
    expect(resolveSbomOutput({ format: "all", output: "sbom" }, "/tmp")).toEqual({
      outputArg: "sbom",
      outputFile: ["sbom.spdx.json", "sbom.cyclonedx.json"],
    });
  });

  it("counts dependencies from generated sbom json", async () => {
    const count = await readSbomDependencyCount(path.join(fixtures, "sbom.spdx.json"));
    expect(count).toBe(3);
  });
});
