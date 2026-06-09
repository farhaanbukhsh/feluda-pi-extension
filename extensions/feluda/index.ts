import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { checkCompatibilityTool } from "./tools/check-compatibility";
import { checkRestrictiveTool } from "./tools/check-restrictive";
import { generateSbomTool } from "./tools/generate-sbom";
import { scanLicensesTool } from "./tools/scan-licenses";

export default function feludaExtension(pi: ExtensionAPI) {
  pi.registerTool(scanLicensesTool);
  pi.registerTool(checkRestrictiveTool);
  pi.registerTool(checkCompatibilityTool);
  pi.registerTool(generateSbomTool);

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setStatus("feluda", "feluda: tools ready");
  });

  pi.on("session_shutdown", async (_event, ctx) => {
    ctx.ui.setStatus("feluda", undefined);
  });
}
