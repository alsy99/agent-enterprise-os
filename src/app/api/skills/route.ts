import { NextResponse } from "next/server";
import { listSkillMetadata, loadSkill } from "@/lib/suite/skills";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (id) {
    const skill = loadSkill(id);
    if (!skill) {
      return NextResponse.json({ error: "skill not found" }, { status: 404 });
    }
    return NextResponse.json({ skill });
  }

  // Level 1 only — names + descriptions for discovery
  return NextResponse.json({
    skills: listSkillMetadata(),
    guidelines: {
      agents:
        "https://www.anthropic.com/engineering/building-effective-agents",
      skills:
        "https://platform.claude.com/docs/en/agents-and-tools/agent-skills/overview",
      principles: [
        "Maintain simplicity in agent design",
        "Prioritize transparency by showing planning steps",
        "Craft clear agent-computer interfaces (skills + tools)",
        "Progressive disclosure: metadata always, instructions on trigger",
        "Prefer orchestrator-workers when subtasks depend on the brief",
      ],
    },
  });
}
