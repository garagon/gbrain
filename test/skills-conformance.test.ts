import { describe, test, expect } from "bun:test";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const SKILLS_DIR = join(import.meta.dir, "..", "skills");
const MANIFEST_PATH = join(SKILLS_DIR, "manifest.json");

/** Simple YAML frontmatter parser — extracts fields between --- delimiters */
function parseFrontmatter(content: string): Record<string, unknown> | null {
  const match = content.match(/^---\n([\s\S]*?)\n---/);
  if (!match) return null;
  const yaml = match[1];
  const result: Record<string, string> = {};
  for (const line of yaml.split("\n")) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim();
      const value = line.slice(colonIdx + 1).trim();
      if (key && !key.startsWith(" ") && !key.startsWith("-")) {
        result[key] = value;
      }
    }
  }
  return result;
}

/** Get all skill directories (those containing SKILL.md) */
function getSkillDirs(): string[] {
  const entries = readdirSync(SKILLS_DIR, { withFileTypes: true });
  return entries
    .filter((e) => e.isDirectory())
    .filter((e) => existsSync(join(SKILLS_DIR, e.name, "SKILL.md")))
    .map((e) => e.name)
    .filter((name) => name !== "install"); // deprecated skill
}

describe("skills conformance", () => {
  const skillDirs = getSkillDirs();

  test("manifest.json exists and is valid JSON", () => {
    expect(existsSync(MANIFEST_PATH)).toBe(true);
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    expect(manifest.skills).toBeDefined();
    expect(Array.isArray(manifest.skills)).toBe(true);
  });

  test("manifest lists every skill directory", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    const manifestNames = manifest.skills.map((s: { name: string }) => s.name);
    for (const dir of skillDirs) {
      expect(manifestNames).toContain(dir);
    }
  });

  test("every manifest entry points to an existing SKILL.md", () => {
    const manifest = JSON.parse(readFileSync(MANIFEST_PATH, "utf-8"));
    for (const skill of manifest.skills) {
      const skillPath = join(SKILLS_DIR, skill.path);
      expect(existsSync(skillPath)).toBe(true);
    }
  });

  for (const dir of skillDirs) {
    describe(`skills/${dir}/SKILL.md`, () => {
      const content = readFileSync(join(SKILLS_DIR, dir, "SKILL.md"), "utf-8");

      test("has YAML frontmatter", () => {
        expect(content.startsWith("---\n")).toBe(true);
        const fm = parseFrontmatter(content);
        expect(fm).not.toBeNull();
      });

      test("frontmatter has required fields (name, description)", () => {
        const fm = parseFrontmatter(content);
        expect(fm).not.toBeNull();
        expect(fm!.name).toBeDefined();
        expect(fm!.description).toBeDefined();
      });

      test("has a Contract section", () => {
        expect(content).toContain("## Contract");
      });

      test("has an Anti-Patterns section", () => {
        expect(content).toContain("## Anti-Patterns");
      });

      test("has an Output Format section", () => {
        expect(content).toContain("## Output Format");
      });
    });
  }

  test("no duplicate skill names in frontmatter", () => {
    const names: string[] = [];
    for (const dir of skillDirs) {
      const content = readFileSync(join(SKILLS_DIR, dir, "SKILL.md"), "utf-8");
      const fm = parseFrontmatter(content);
      if (fm?.name) {
        const name = String(fm.name);
        expect(names).not.toContain(name);
        names.push(name);
      }
    }
  });

  // -------------------------------------------------------------------
  // Supply-chain: any executable `github:<owner>/<repo>` install ref in
  // a shipped skill must be pinned to a commit SHA or tag. CLAUDE.md
  // already mandates SHA pinning for GitHub Actions; the same rule
  // applies to skill-driven installs that run on every agent setup.
  //
  // Matches refs of the form `github:owner/repo` inside fenced code
  // blocks (` ```...``` `). Backtick-quoted inline mentions (prose
  // examples explaining the anti-pattern) are ignored.
  // -------------------------------------------------------------------
  test("no unpinned github: install refs in shipped skill code blocks", () => {
    // Block extractor: fenced code regions only. Inline backtick prose
    // that mentions an unpinned ref for documentation purposes does not
    // get installed by any agent.
    const blockRe = /```[^\n]*\n([\s\S]*?)```/g;

    // An unpinned ref is `github:owner/repo` where the repo identifier
    // is NOT followed by `#<ref>` or `@<ref>`. The identifier ends at
    // the first character outside `[A-Za-z0-9_.-]`; the lookahead then
    // checks the terminator is neither `#` nor `@`. Anchoring the end
    // of the identifier this way avoids a backtracking false positive
    // where the engine would otherwise match `github:owner/rep` from
    // `github:owner/repo#sha` by dropping the last char.
    const unpinnedRef = /\bgithub:[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+?(?=[^A-Za-z0-9_.-]|$)(?![#@])/g;

    const offenders: string[] = [];
    for (const dir of skillDirs) {
      const path = join(SKILLS_DIR, dir, "SKILL.md");
      const content = readFileSync(path, "utf-8");
      let match;
      while ((match = blockRe.exec(content)) !== null) {
        const block = match[1];
        const bad = block.match(unpinnedRef);
        if (bad) {
          offenders.push(`${dir}/SKILL.md: ${bad.join(", ")}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
