import type { ContentBlockParam } from '@anthropic-ai/sdk/resources/messages/messages';
import type { TeammateSpec, SkillSpec, FileAttachment } from '@ccgrid/shared';

export function buildAgents(
  teammateSpecs: TeammateSpec[] | undefined,
  skillSpecs: SkillSpec[] | undefined,
): Record<string, { description: string; prompt: string; skills?: string[] }> | undefined {
  if (!teammateSpecs || teammateSpecs.length === 0) return undefined;
  const skillMap = new Map((skillSpecs ?? []).map(s => [s.id, s]));
  const agents: Record<string, { description: string; prompt: string; skills?: string[] }> = {};

  const teamMembers = teammateSpecs.map(s => `- ${s.name}: ${s.role}`).join('\n');
  const teamContext = `\n\n## TEAM CONTEXT
You are a member of a team. Other members:
${teamMembers}

The Lead coordinates the team and relays information between members.
- If you discover something that other members need to know, clearly state it in your output.
- The Lead may send you additional context from other members' results during your work.
- Focus on your assigned task, but be aware that your output may inform other members' work.`;

  for (const spec of teammateSpecs) {
    const skillNames = (spec.skillIds ?? [])
      .map(id => skillMap.get(id))
      .filter((s): s is SkillSpec => s != null)
      .map(s => s.name);
    const basePrompt = spec.instructions ?? `You are a ${spec.role}. Complete the assigned task thoroughly.`;
    agents[spec.name] = {
      description: spec.role,
      prompt: basePrompt + teamContext,
      ...(skillNames.length > 0 ? { skills: skillNames } : {}),
    };
  }
  return agents;
}

export function filesToContentBlocks(files: FileAttachment[]): ContentBlockParam[] {
  return files.map(f => {
    if (f.mimeType.startsWith('image/')) {
      return {
        type: 'image' as const,
        source: {
          type: 'base64' as const,
          media_type: f.mimeType as 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp',
          data: f.base64Data,
        },
      };
    }
    if (f.mimeType === 'application/pdf') {
      return {
        type: 'document' as const,
        source: { type: 'base64' as const, media_type: 'application/pdf' as const, data: f.base64Data },
        title: f.name,
      };
    }
    return {
      type: 'document' as const,
      source: { type: 'text' as const, media_type: 'text/plain' as const, data: Buffer.from(f.base64Data, 'base64').toString('utf-8') },
      title: f.name,
    };
  });
}
