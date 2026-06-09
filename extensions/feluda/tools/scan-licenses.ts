import { defineTool } from "@earendil-works/pi-coding-agent";
import { buildScanArgs, parseLicenseEntries, runFeluda } from "../cli";
import { normalizeError } from "../errors";
import { getInstallInstructions } from "../install-guide";
import { scanLicensesSchema } from "../schemas";
import { summarizeScan } from "../summarizer";
import type { ErrorDetails, ScanSummaryDetails } from "../types";

export const scanLicensesTool = defineTool({
  name: "scan_licenses",
  label: "Scan Licenses",
  description: "Run Feluda against a project and summarize dependency licenses.",
  promptSnippet: "Analyze project dependency licenses with Feluda.",
  promptGuidelines: [
    "Use scan_licenses when the user explicitly asks to inspect dependency licenses, project licensing, or OSI status.",
    "If the user does not specify a path, scan the current working directory.",
  ],
  parameters: scanLicensesSchema,
  async execute(_toolCallId, params, signal, onUpdate, ctx) {
    onUpdate?.({ content: [{ type: "text", text: "Running Feluda license scan..." }], details: {} });

    try {
      const args = buildScanArgs({
        path: params.path,
        language: params.language,
        osi: params.osi,
        noLocal: params.noLocal,
      });
      const { stdout } = await runFeluda(args, signal);
      const dependencies = parseLicenseEntries(stdout);
      const projectPath = params.path ?? ctx.cwd;
      const incompatibleCount = dependencies.filter((entry) => entry.compatibility === "Incompatible").length;
      const detailsBase = {
        projectPath,
        language: params.language ?? "auto",
        totalDependencies: dependencies.length,
        restrictiveCount: dependencies.filter((entry) => entry.is_restrictive).length,
        incompatibleCount,
        dependencies,
      } satisfies Omit<ScanSummaryDetails, "summaryMarkdown">;
      const summaryMarkdown = summarizeScan(detailsBase);
      const details: ScanSummaryDetails = { ...detailsBase, summaryMarkdown };

      return {
        content: [{ type: "text", text: summaryMarkdown }],
        details,
      };
    } catch (error) {
      const normalized = normalizeError(error);
      const suffix = normalized.code === "feluda-not-found" ? `\n\n${getInstallInstructions()}` : "";
      const summaryMarkdown = `## Feluda scan failed\n\n${normalized.message}${suffix}`;
      const details: ErrorDetails = { code: normalized.code, summaryMarkdown };
      return {
        content: [{ type: "text", text: summaryMarkdown }],
        details,
        isError: true,
      };
    }
  },
});
