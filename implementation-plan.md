# Feluda Pi Extension — Implementation Plan

## Overview

Step-by-step plan to build a pi extension that exposes Feluda as a skill + 4 tools. Each phase has a clear deliverable, dependencies, and validation checkpoint.

Estimated effort: ~3-5 days for a single developer familiar with pi extensions and TypeScript.

---

## Phase 1: Project Scaffolding (Day 1, ~2 hours)

**Goal**: Bootable extension with basic tool registration that pi can discover.

### Steps

1. **Initialize extension directory**

   ```bash
   mkdir -p ~/.pi/agent/skills/feluda
   cd ~/.pi/agent/skills/feluda
   ```

   Or for project-level testing:

   ```bash
   mkdir -p feluda-pi-extension
   cd feluda-pi-extension
   ```

2. **Create `package.json`**

   ```json
   {
     "name": "feluda",
     "version": "0.1.0",
     "description": "pi extension for Feluda license analysis",
     "main": "src/index.ts",
     "pi.extension": {
       "main": "src/index.ts"
     },
     "pi.skills": ["."],
     "scripts": {
       "test": "vitest run",
       "test:watch": "vitest"
     },
     "devDependencies": {
       "@earendil-works/pi-coding-agent": "*",
       "vitest": "^1.0.0",
       "typescript": "^5.4.0"
     }
   }
   ```

3. **Create `tsconfig.json`**

   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "module": "ESNext",
       "moduleResolution": "bundler",
       "strict": true,
       "esModuleInterop": true,
       "outDir": "dist",
       "rootDir": "src"
     },
     "include": ["src"]
   }
   ```

4. **Create stub `src/index.ts`**

   ```typescript
   import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

   export default function (pi: ExtensionAPI) {
     pi.on("session_start", async (_event, ctx) => {
       console.log("[feluda] Extension loaded");
     });
   }
   ```

5. **Create stub `SKILL.md`** with minimal frontmatter (iterated on later).

6. **Verify**: Add `feluda` to pi's settings, restart pi, confirm extension loads without errors.

**Deliverable**: Skeleton extension that pi discovers and loads.

---

## Phase 2: CLI Wrapper Layer (Day 1, ~3 hours)

**Goal**: Reliable module to detect, invoke, and capture Feluda CLI output.

### Steps

1. **Create `src/cli.ts`**

   ```typescript
   import { execFile } from "node:child_process";
   import { promisify } from "node:util";

   const execFileAsync = promisify(execFile);

   export interface FeludaOptions {
     path?: string;
     language?: string;
     json?: boolean;
     restrictive?: boolean;
     projectLicense?: string;
     incompatible?: boolean;
     osi?: string;
     noLocal?: boolean;
     extraArgs?: string[];
   }

   export async function detectFeluda(): Promise<string | null> {
     // Try `which feluda` or `command -v feluda`
     // Return path or null
   }

   export async function runFeluda(
     options: FeludaOptions,
     subcommand?: string
   ): Promise<{ stdout: string; stderr: string }> {
     const feludaPath = await detectFeluda();
     if (!feludaPath) {
       throw new FeludaNotFoundError();
     }

     const args = buildArgs(options, subcommand);
     try {
       const { stdout, stderr } = await execFileAsync(feludaPath, args, {
         timeout: 120_000, // 2 minutes
         maxBuffer: 10 * 1024 * 1024, // 10MB
       });
       return { stdout, stderr };
     } catch (err) {
       throw mapExecError(err);
     }
   }

   function buildArgs(options: FeludaOptions, subcommand?: string): string[] {
     const args: string[] = [];
     if (subcommand) args.push(subcommand);
     if (options.path) args.push("--path", options.path);
     if (options.language) args.push("--language", options.language);
     if (options.json) args.push("--json");
     if (options.restrictive) args.push("--restrictive");
     if (options.projectLicense) args.push("--project-license", options.projectLicense);
     if (options.incompatible) args.push("--incompatible");
     if (options.osi) args.push("--osi", options.osi);
     if (options.noLocal) args.push("--no-local");
     if (options.extraArgs) args.push(...options.extraArgs);
     return args;
   }
   ```

2. **Create `src/errors.ts`**

   ```typescript
   export class FeludaNotFoundError extends Error {
     constructor() {
       super("Feluda CLI is not installed. Run `cargo install feluda` or `brew install feluda` to install it.");
       this.name = "FeludaNotFoundError";
     }
   }

   export class FeludaNetworkError extends Error { /* ... */ }
   export class FeludaExecutionError extends Error { /* ... */ }
   export class FeludaParseError extends Error { /* ... */ }

   export function mapExecError(err: unknown): Error {
     // Map Node.js child_process errors to Feluda-specific errors
     // ENOENT → FeludaNotFoundError
     // ETIMEDOUT / ENETUNREACH → FeludaNetworkError
     // non-zero exit → FeludaExecutionError with stderr
   }
   ```

3. **Create `src/install-guide.ts`**

   ```typescript
   export function getInstallInstructions(): string {
     // Detect OS and return relevant instructions:
     // macOS: brew install feluda
     // Linux (Debian): sudo dpkg -i feluda_*.deb
     // Linux (RPM): sudo rpm -ivh feluda_*.rpm
     // Any: cargo install feluda (universal)
     // Arch: paru -S feluda
     // NetBSD: pkgin install feluda
   }
   ```

4. **Write tests: `tests/cli.test.ts`**
   - Mock `execFile` to return sample JSON fixtures
   - Test arg construction for each tool scenario
   - Test error mapping for ENOENT, timeout, non-zero exit
   - Test binary detection (stub `which`/`command`)

**Deliverable**: Working CLI wrapper with tests. Can invoke `feluda` process and capture output.

---

## Phase 3: Summarizer (Day 2, ~3 hours)

**Goal**: Transform raw Feluda JSON → human-readable markdown for agent consumption.

### Steps

1. **Create `src/summarizer.ts`**

   ```typescript
   export interface LicenseEntry {
     name: string;
     version: string;
     license: string;
     is_restrictive: boolean;
     compatibility?: string;
     osi_status?: string;
   }

   export function summarizeScan(deps: LicenseEntry[]): string {
     if (deps.length === 0) return "No dependencies detected.";

     const total = deps.length;
     const restrictive = deps.filter(d => d.is_restrictive).length;
     const incompatible = deps.filter(d => d.compatibility === "Incompatible").length;

     let summary = `## License Scan Results\n\n`;
     summary += `**Total dependencies**: ${total}\n`;
     if (restrictive > 0) summary += `**Restrictive licenses**: ${restrictive} ⚠️\n`;
     if (incompatible > 0) summary += `**Incompatible licenses**: ${incompatible} ❌\n`;

     summary += `\n| Package | Version | License | Status |\n`;
     summary += `|---------|---------|---------|--------|\n`;

     for (const dep of deps) {
       const status = dep.is_restrictive ? "⚠️ Restrictive" : "✅ Clear";
       summary += `| ${dep.name} | ${dep.version} | ${dep.license} | ${status} |\n`;
     }

     return summary;
   }

   export function summarizeSBOMMetadata(metadata: {
     format: string;
     dependencyCount: number;
     outputFile: string;
   }): string {
     return `## SBOM Generated\n\n` +
       `**Format**: ${metadata.format}\n` +
       `**Dependencies**: ${metadata.dependencyCount}\n` +
       `**Output file**: \`${metadata.outputFile}\`\n`;
   }
   ```

2. **Handle truncation**: Dependencies list >50 entries → show first 50 + "and N more..."

3. **Write tests: `tests/summarizer.test.ts`**
   - Test basic scan summarization with sample data
   - Test restrictive-only summary (all entries flagged)
   - Test compatibility summary (Compatible/Incompatible/Unknown)
   - Test empty results
   - Test large result truncation

**Deliverable**: Summarizer module with comprehensive tests.

---

## Phase 4: Tool Implementations (Day 2-3, ~5 hours)

**Goal**: Implement the four tools that register with pi and call through the CLI wrapper.

### Steps

#### 4.1 `scan_licenses` Tool

```typescript
// src/tools/scan-licenses.ts
export async function scanLicenses(
  params: { path?: string; language?: string; osi?: string; no_local?: boolean },
  ctx: ToolContext
): Promise<ToolResult> {
  const result = await runFeluda({
    path: params.path,
    language: params.language,
    osi: params.osi,
    noLocal: params.no_local,
    json: true,
  });

  const deps: LicenseEntry[] = JSON.parse(result.stdout);
  const summary = summarizeScan(deps);

  return {
    project_path: params.path || process.cwd(),
    language_detected: params.language || "auto",
    total_dependencies: deps.length,
    restrictive_count: deps.filter(d => d.is_restrictive).length,
    dependencies: deps,
    summary_markdown: summary,
  };
}
```

#### 4.2 `check_restrictive` Tool

Wraps `feluda --restrictive --json` + summarizer.

#### 4.3 `check_compatibility` Tool

Wraps `feluda --project-license <X> --json` + compatibility-specific summarizer. Supports `--incompatible` flag via `incompatible_only` param.

#### 4.4 `generate_sbom` Tool

Wraps `feluda sbom <format> [--output <file>]`. Parses SBOM output metadata + filesystem check for generated file.

### Registration in `src/index.ts`

```typescript
import { scanLicenses } from "./tools/scan-licenses";
import { checkRestrictive } from "./tools/check-restrictive";
import { checkCompatibility } from "./tools/check-compatibility";
import { generateSBOM } from "./tools/generate-sbom";

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "scan_licenses",
    description: "Scan all project dependencies and report their licenses using Feluda...",
    parameters: { /* JSON Schema */ },
    handler: scanLicenses,
  });
  // ... register other three tools
}
```

### Tests: `tests/tools.test.ts`

- Mock `runFeluda` to return test fixtures
- Test each tool with valid params → expected output shape
- Test each tool with missing required params → validation error
- Test tool behavior when Feluda returns empty results
- Test tool behavior when Feluda returns malformed JSON

**Deliverable**: All four tools registered, tested with mocked CLI.

---

## Phase 5: SKILL.md (Day 3, ~3 hours)

**Goal**: Write the progressive-disclosure skill file.

### Content Checklist

- [ ] **Frontmatter**: Name, focused description (narrow trigger — learned from claude-api fix)
- [ ] **Quick start**: 3-line example showing basic scan
- [ ] **Installation**: OS-specific install instructions with fallback to `cargo install`
- [ ] **Tool reference**: One section per tool with:
  - What it does
  - Input parameters
  - Example usage
  - Expected output summary
- [ ] **Supported languages**: Table of 8 supported languages
- [ ] **Configuration**: `.feluda.toml` reference for restrictive/ignore lists
- [ ] **GitHub token**: How to set `GITHUB_TOKEN` for rate limits
- [ ] **Troubleshooting**: Common errors (not installed, network, rate limit)
- [ ] **Legal disclaimer**: Feluda is not legal advice

### Description (from design doc)

```yaml
description: |-
  Analyze project dependency licenses using Feluda — a Rust CLI tool for license auditing, restrictive license detection, compatibility checks, and SBOM generation. 
  Use when the user asks about license compliance, restrictive dependencies, SBOM generation, or auditing project licenses. 
  Supports Rust, Node, Go, Python, Java, C/C++, and R projects. 
  Do not use for general open-source licensing questions or legal advice — this skill teaches Feluda usage only.
```

**Deliverable**: Complete `SKILL.md` ready for public use.

---

## Phase 6: Integration Testing (Day 4, ~4 hours)

**Goal**: End-to-end validation with real Feluda CLI.

### Steps

1. **Install Feluda** on the test machine: `cargo install feluda`

2. **Create test projects** in each supported language:
   - Rust: `cargo new test-rust && cd test-rust && cargo add serde`
   - Node: `npm init -y && npm install lodash`
   - Python: `echo "requests" > requirements.txt`
   - Go: `go mod init test && go get github.com/gorilla/mux`
   - Java: Minimal Maven/Gradle project
   - C/C++: CMake project with dependencies
   - R: R package with dependencies

3. **Run each tool** against each test project and verify:
   - Feluda CLI executes successfully
   - JSON output parses correctly
   - Summarizer produces readable output
   - No crashes or unhandled errors

4. **Test error scenarios**:
   - Feluda not installed → install guidance shown
   - Invalid path → clear error
   - Network disconnected → appropriate error
   - Unsupported language → supported language list shown

5. **Test the full pi experience**:
   - Install extension in pi
   - Ask: "Check the licenses in this project"
   - Ask: "Are there any restrictive licenses here?"
   - Ask: "Is this compatible with MIT license?"
   - Ask: "Generate an SBOM for this project"

**Deliverable**: Integration test results documented; any bugs fixed.

---

## Phase 7: Packaging & Publication (Day 5, ~2 hours)

**Goal**: Make the extension discoverable and installable.

### Steps

1. **Finalize `package.json`** with correct metadata, version, and entry points.

2. **Add README.md** with:
   - What the extension does
   - Prerequisites (Feluda CLI, GitHub token)
   - Installation instructions (extensions registry, manual install)
   - Quick start example
   - Tool reference
   - Troubleshooting

3. **Git repository**: Push to GitHub (e.g., `github.com/anistark/feluda-pi-extension` or your own repo).

4. **Pi extensions registry**: Submit to pi's extensions directory/repository if one exists.

5. **Write release notes** for v0.1.0.

**Deliverable**: Published extension, installable by others.

---

## Dependency Graph

```
Phase 1 ──► Phase 2 ──► Phase 3 ──► Phase 4 ──► Phase 6
 (scaffold)  (CLI)     (summarizer) (tools)    (integration)
                        │                       │
                        └─────── Phase 5 ───────┘
                                (SKILL.md)
                                        │
                                        ▼
                                   Phase 7
                                (packaging)
```

- Phase 3 (summarizer) and Phase 4 (tools) can be parallelized if multiple developers.
- Phase 5 (SKILL.md) depends on Phase 3 (summarizer shapes the output the skill documents).
- Phase 6 (integration) gates all prior phases.

---

## Validation Checklist

Before considering the extension ready for public v0.1.0:

- [ ] All unit tests pass (`vitest run`)
- [ ] Integration tests pass for all 8 supported languages
- [ ] Skill loads correctly in pi (no false triggers observed)
- [ ] Feluda install guidance covers all package managers
- [ ] Error messages are clear and actionable
- [ ] Summarized output is readable and useful
- [ ] README.md is complete and accurate
- [ ] Legal disclaimer is present in skill and README
- [ ] Trigger description does not cause false positives
