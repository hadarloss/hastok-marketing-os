import { loadAgentRegistry, getTeamTree, getCoreAgents } from "@/lib/agents/registry";

export async function GET() {
  try {
    const [all, marketing, branding, core] = await Promise.all([
      loadAgentRegistry(),
      getTeamTree("marketing"),
      getTeamTree("branding"),
      getCoreAgents(),
    ]);

    return Response.json({
      all,
      teams: { marketing, branding },
      core,
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
