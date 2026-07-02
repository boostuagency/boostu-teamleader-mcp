export function enabledGroups(
  env: string | undefined = process.env.TEAMLEADER_TOOLS
): Set<string> | null {
  if (!env || !env.trim()) return null; // null = all groups enabled
  return new Set(env.split(",").map((s) => s.trim()).filter(Boolean));
}

export function isGroupEnabled(group: string, enabled: Set<string> | null): boolean {
  return enabled === null || enabled.has(group);
}
