# Feluda Pi Extension — Subagent Work Plan

Target model for delegated implementation work: **deepseek-flash-v4-pro**

> Note: this file captures the intended work split. If your runtime exposes a subagent launcher, these are the work packets to hand off directly.

## Subagent A — Package / runtime scaffold

**Model:** deepseek-flash-v4-pro

**Owns**
- `package.json`
- `tsconfig.json`
- `vitest.config.ts`
- package layout under `extensions/` and `skills/`
- extension entrypoint wiring

**Acceptance**
- Pi package manifest is valid
- Extension is discoverable via package install or local path install
- `index.ts` registers all four tools

## Subagent B — CLI wrapper / errors / install guidance

**Model:** deepseek-flash-v4-pro

**Owns**
- `extensions/feluda/cli.ts`
- `extensions/feluda/errors.ts`
- `extensions/feluda/install-guide.ts`
- process execution, PATH discovery, arg building, JSON parsing, file path normalization

**Acceptance**
- Detects missing `feluda`
- Builds correct CLI args for scan/restrictive/compatibility/SBOM
- Emits actionable install/network/rate-limit messages

## Subagent C — Summarization / tool contracts / tests

**Model:** deepseek-flash-v4-pro

**Owns**
- `extensions/feluda/summarizer.ts`
- `extensions/feluda/types.ts`
- `extensions/feluda/schemas.ts`
- test fixtures and unit tests for summaries + tool behavior

**Acceptance**
- Human-readable summaries for scan/restrictive/compatibility/SBOM
- Large dependency lists truncate cleanly
- Tool output shape is stable and test-covered

## Subagent D — Tools + skill

**Model:** deepseek-flash-v4-pro

**Owns**
- `extensions/feluda/tools/*.ts`
- `skills/feluda/SKILL.md`
- prompt snippets / prompt guidelines

**Acceptance**
- Four typed tools usable by pi
- Skill trigger is narrow and explicit
- Skill includes install help, examples, token/rate-limit guidance, and legal disclaimer

## Dependency order

1. A + B can start immediately
2. C starts once B exposes stable result types
3. D starts once A/B/C define the runtime + summary contract
4. Integration testing happens after all four are merged

## Current status

- [x] Work split defined
- [x] Package scaffold started
- [x] Core implementation started
- [ ] Install and run tests
- [ ] Real-Feluda integration validation
- [ ] README / publish polish
