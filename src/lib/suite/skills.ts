import fs from "fs";
import path from "path";

export type SkillMetadata = {
  id: string;
  name: string;
  description: string;
  dir: string;
  capability: string;
};

export type Skill = SkillMetadata & {
  instructions: string;
  patternHints: string[];
};

const SKILLS_ROOT = path.join(process.cwd(), "skills");

  const CAPABILITY_BY_SKILL: Record<string, string> = {
  "nova-orchestrate": "orchestrate",
  research: "research",
  implement: "build",
  review: "review",
  learn: "learn",
  "security-pass": "security",
  docs: "docs",
};

function parseFrontmatter(raw: string): {
  meta: Record<string, string>;
  body: string;
} {
  if (!raw.startsWith("---")) {
    return { meta: {}, body: raw.trim() };
  }
  const end = raw.indexOf("---", 3);
  if (end === -1) return { meta: {}, body: raw.trim() };
  const yaml = raw.slice(3, end).trim();
  const body = raw.slice(end + 3).trim();
  const meta: Record<string, string> = {};
  let currentKey = "";
  for (const line of yaml.split("\n")) {
    const folded = line.match(/^\s{2,}(.+)$/);
    if (folded && currentKey) {
      meta[currentKey] = `${meta[currentKey]} ${folded[1]}`.trim();
      continue;
    }
    const m = line.match(/^([a-zA-Z0-9_-]+):\s*(.*)$/);
    if (!m) continue;
    currentKey = m[1];
    let value = m[2].trim();
    if (value === ">" || value === "|") value = "";
    meta[currentKey] = value.replace(/^["']|["']$/g, "");
  }
  return { meta, body };
}

/** Level 1 — metadata always available for discovery (progressive disclosure). */
export function listSkillMetadata(): SkillMetadata[] {
  if (!fs.existsSync(SKILLS_ROOT)) return [];
  const dirs = fs
    .readdirSync(SKILLS_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  const skills: SkillMetadata[] = [];
  for (const dirName of dirs) {
    const skillPath = path.join(SKILLS_ROOT, dirName, "SKILL.md");
    if (!fs.existsSync(skillPath)) continue;
    const raw = fs.readFileSync(skillPath, "utf8");
    const { meta } = parseFrontmatter(raw);
    const name = meta.name || dirName;
    if (!meta.description) continue;
    skills.push({
      id: name,
      name,
      description: meta.description.replace(/\s+/g, " ").trim(),
      dir: path.join(SKILLS_ROOT, dirName),
      capability: CAPABILITY_BY_SKILL[name] ?? name.replace(/-/g, "_"),
    });
  }
  return skills.sort((a, b) => a.name.localeCompare(b.name));
}

/** Level 2 — load instructions only when a skill is triggered. */
export function loadSkill(skillId: string): Skill | null {
  const meta = listSkillMetadata().find(
    (s) => s.id === skillId || s.name === skillId,
  );
  if (!meta) return null;
  const raw = fs.readFileSync(path.join(meta.dir, "SKILL.md"), "utf8");
  const { body } = parseFrontmatter(raw);
  const patternHints: string[] = [];
  if (/orchestrator-workers/i.test(body)) patternHints.push("orchestrator-workers");
  if (/evaluator-optimizer/i.test(body)) patternHints.push("evaluator-optimizer");
  if (/prompt chaining|chaining/i.test(body)) patternHints.push("prompt-chaining");
  if (/parallel/i.test(body)) patternHints.push("parallelization");
  if (/routing/i.test(body)) patternHints.push("routing");
  return { ...meta, instructions: body, patternHints };
}

/**
 * Match a brief to skills using description text (Level 1 only).
 * Mirrors Claude’s “description says what + when” discovery.
 */
export function matchSkillsForBrief(brief: string): SkillMetadata[] {
  const text = brief.toLowerCase();
  const all = listSkillMetadata().filter((s) => s.id !== "nova-orchestrate");
  const scored = all
    .map((skill) => {
      const desc = skill.description.toLowerCase();
      let score = 0;
      // Explicit capability tag
      if (text.includes(`[cap:${skill.capability}]`)) score += 10;
      // Name token
      if (text.includes(skill.name.replace(/-/g, " "))) score += 3;
      // Keyword overlap from description "Use when..." clauses
      const when = desc.split(/use when/i)[1] ?? desc;
      for (const token of when.split(/[^a-z0-9]+/).filter((t) => t.length > 3)) {
        if (text.includes(token)) score += 1;
      }
      // Capability word
      if (text.includes(skill.capability)) score += 4;
      return { skill, score };
    })
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score);

  return scored.map((s) => s.skill);
}

export function skillForCapability(capability: string): SkillMetadata | null {
  const all = listSkillMetadata();
  return (
    all.find((s) => s.capability === capability) ??
    all.find((s) => s.name === capability || s.name.includes(capability)) ??
    null
  );
}

/** Default pipeline skills when matching is sparse — still simple & composable. */
export function defaultPipelineSkills(): SkillMetadata[] {
  const byId = Object.fromEntries(listSkillMetadata().map((s) => [s.id, s]));
  return ["research", "implement", "review", "learn"]
    .map((id) => byId[id])
    .filter(Boolean);
}
