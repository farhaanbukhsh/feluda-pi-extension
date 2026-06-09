import os from "node:os";

export function getInstallInstructions(): string {
  const platform = os.platform();

  if (platform === "darwin") {
    return [
      "Feluda is not installed.",
      "Recommended install on macOS:",
      "- `brew install feluda`",
      "Fallback:",
      "- `cargo install feluda`",
    ].join("\n");
  }

  if (platform === "linux") {
    return [
      "Feluda is not installed.",
      "Common install options on Linux:",
      "- `cargo install feluda`",
      "- Debian/Ubuntu: install the `.deb` from GitHub releases",
      "- Fedora/RHEL: install the `.rpm` from GitHub releases",
      "- Arch: `paru -S feluda`",
      "- NetBSD: `pkgin install feluda`",
    ].join("\n");
  }

  return [
    "Feluda is not installed.",
    "Universal install option:",
    "- `cargo install feluda`",
    "Or install a platform package from the Feluda GitHub releases page.",
  ].join("\n");
}
