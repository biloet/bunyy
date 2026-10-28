export const AGENT_TYPES = ["Trading", "Research", "Social", "Gaming", "Assistant", "Creative"] as const;
export type AgentType = (typeof AGENT_TYPES)[number];

/**
 * The agent type is stored as a "[Type] " prefix of the on-chain description,
 * so the contract stays unchanged.
 */
export function encodeAgentDescription(type: AgentType | "", persona: string) {
  return type ? `[${type}] ${persona}`.trim() : persona.trim();
}

export function parseAgentDescription(description: string): { type?: AgentType; persona: string } {
  const m = /^\[(\w+)\]\s*/.exec(description);
  if (m && (AGENT_TYPES as readonly string[]).includes(m[1])) {
    return { type: m[1] as AgentType, persona: description.slice(m[0].length) };
  }
  return { persona: description };
}
