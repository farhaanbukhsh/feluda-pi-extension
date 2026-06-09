import { defineTool } from "@earendil-works/pi-coding-agent";
import { buildSbomArgs, readSbomDependencyCount, resolveSbomOutput, runFeluda } from "../cli";
import { normalizeError } from "../errors";
import { getInstallInstructions } from "../install-guide";
import { generateSbomSchema } from "../schemas";
import { summarizeSbom } from "../summarizer";
import type { ErrorDetails, SbomSummaryDetails } from "../types";

export const generateSbomTool = defineTool({
  name: "generate_sbom",
  label: "Generate SBOM",
  description: "Generate SPDX or CycloneDX SBOM output with Feluda.",
  promptSnippet: "Generate an SBOM for a project with Feluda.",
  promptGuidelines: [
    "Use generate_sbom when the user explicitly asks for an SBOM, SPDX, or CycloneDX output.",
  ],
  parameters: generateSbomSchema,
  async execute(_toolCallId, params, signal, onUpdate, ctx) {
    onUpdate?.({ content: [{ type: "text", text: `Generating ${params.format} SBOM with Feluda...` }], details: {} });

    try {
      const { outputArg, outputFile } = resolveSbomOutput(
        {
          path: params.path,
          format: params.format,
          output: params.output,
        },
        ctx.cwd,
      );

      const args = buildSbomArgs({
        path: params.path,
        format: params.format,
        output: outputArg,
      });

      await runFeluda(args, signal);
      const dependencyCount = await readSbomDependencyCount(outputFile);
      const detailsBase = {
        projectPath: params.path ?? ctx.cwd,
        language: "auto",
        format: params.format,
        outputFile,
        dependencyCount,
      } satisfies Omit<SbomSummaryDetails, "summaryMarkdown">;
      const summaryMarkdown = summarizeSbom(detailsBase);
      const details: SbomSummaryDetails = { ...detailsBase, summaryMarkdown };

      return {
        content: [{ type: "text", text: summaryMarkdown }],
        details,
      };
    } catch (error) {
      const normalized = normalizeError(error);
      const suffix = normalized.code === "feluda-not-found" ? `\n\n${getInstallInstructions()}` : "";
      const summaryMarkdown = `## Feluda SBOM generation failed\n\n${normalized.message}${suffix}`;
      const details: ErrorDetails = { code: normalized.code, summaryMarkdown };
      return {
        content: [{ type: "text", text: summaryMarkdown }],
        details,
        isError: true,
      };
    }
  },
});
