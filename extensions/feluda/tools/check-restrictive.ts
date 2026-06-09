import { defineTool } from "@earendil-works/pi-coding-agent";
import { buildRestrictiveArgs, parseLicenseEntries, runFeluda } from "../cli";
import { normalizeError } from "../errors";
import { getInstallInstructions } from "../install-guide";
import { checkRestrictiveSchema } from "../schemas";
import { summarizeRestrictive } from "../summarizer";
import type { ErrorDetails, RestrictiveSummaryDetails } from "../types";

export const checkRestrictiveTool = defineTool({
  name: "check_restrictive",
  label: "Check Restrictive",
  description: "Find dependencies Feluda marks as restrictive.",
  promptSnippet: "Check whether a project has restrictive dependency licenses.",
  promptGuidelines: [
    "Use check_restrictive when the user explicitly asks about restrictive, copyleft, or blocked dependencies.",
  ],
  parameters: checkRestrictiveSchema,
  async execute(_toolCallId, params, signal, onUpdate, ctx) {
    onUpdate?.({ content: [{ type: "text", text: "Running Feluda restrictive-license check..." }], details: {} });

    try {
      const args = buildRestrictiveArgs({
        path: params.path,
        language: params.language,
        noLocal: params.noLocal,
      });
      const { stdout } = await runFeluda(args, signal);
      const restrictiveDependencies = parseLicenseEntries(stdout);
      const detailsBase = {
        projectPath: params.path ?? ctx.cwd,
        language: params.language ?? "auto",
        totalRestrictive: restrictiveDependencies.length,
        restrictiveDependencies,
      } satisfies Omit<RestrictiveSummaryDetails, "summaryMarkdown">;
      const summaryMarkdown = summarizeRestrictive(detailsBase);
      const details: RestrictiveSummaryDetails = { ...detailsBase, summaryMarkdown };

      return {
        content: [{ type: "text", text: summaryMarkdown }],
        details,
      };
    } catch (error) {
      const normalized = normalizeError(error);
      const suffix = normalized.code === "feluda-not-found" ? `\n\n${getInstallInstructions()}` : "";
      const summaryMarkdown = `## Feluda restrictive check failed\n\n${normalized.message}${suffix}`;
      const details: ErrorDetails = { code: normalized.code, summaryMarkdown };
      return {
        content: [{ type: "text", text: summaryMarkdown }],
        details,
        isError: true,
      };
    }
  },
});
