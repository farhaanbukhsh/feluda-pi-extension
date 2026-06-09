import { defineTool } from "@earendil-works/pi-coding-agent";
import { buildCompatibilityArgs, parseLicenseEntries, runFeluda } from "../cli";
import { normalizeError } from "../errors";
import { getInstallInstructions } from "../install-guide";
import { checkCompatibilitySchema } from "../schemas";
import { summarizeCompatibility } from "../summarizer";
import type { CompatibilitySummaryDetails, ErrorDetails } from "../types";

export const checkCompatibilityTool = defineTool({
  name: "check_compatibility",
  label: "Check Compatibility",
  description: "Compare dependency licenses against a project license using Feluda.",
  promptSnippet: "Check dependency-license compatibility against a project license with Feluda.",
  promptGuidelines: [
    "Use check_compatibility when the user asks whether dependencies are compatible with a named project license.",
    "Always pass the user's projectLicense explicitly if they provide it.",
  ],
  parameters: checkCompatibilitySchema,
  async execute(_toolCallId, params, signal, onUpdate, ctx) {
    onUpdate?.({ content: [{ type: "text", text: `Running Feluda compatibility check for ${params.projectLicense}...` }], details: {} });

    try {
      const args = buildCompatibilityArgs({
        path: params.path,
        language: params.language,
        projectLicense: params.projectLicense,
        incompatibleOnly: params.incompatibleOnly,
      });
      const { stdout } = await runFeluda(args, signal);
      const dependencies = parseLicenseEntries(stdout);
      const compatibleCount = dependencies.filter((entry) => entry.compatibility === "Compatible").length;
      const incompatibleCount = dependencies.filter((entry) => entry.compatibility === "Incompatible").length;
      const unknownCount = dependencies.filter((entry) => entry.compatibility === "Unknown").length;
      const detailsBase = {
        projectPath: params.path ?? ctx.cwd,
        language: params.language ?? "auto",
        projectLicense: params.projectLicense,
        totalDependencies: dependencies.length,
        compatibleCount,
        incompatibleCount,
        unknownCount,
        dependencies,
      } satisfies Omit<CompatibilitySummaryDetails, "summaryMarkdown">;
      const summaryMarkdown = summarizeCompatibility(detailsBase);
      const details: CompatibilitySummaryDetails = { ...detailsBase, summaryMarkdown };

      return {
        content: [{ type: "text", text: summaryMarkdown }],
        details,
      };
    } catch (error) {
      const normalized = normalizeError(error);
      const suffix = normalized.code === "feluda-not-found" ? `\n\n${getInstallInstructions()}` : "";
      const summaryMarkdown = `## Feluda compatibility check failed\n\n${normalized.message}${suffix}`;
      const details: ErrorDetails = { code: normalized.code, summaryMarkdown };
      return {
        content: [{ type: "text", text: summaryMarkdown }],
        details,
        isError: true,
      };
    }
  },
});
