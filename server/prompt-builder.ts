import type { TeammateSpec } from '../shared/types.js';

export function buildPrompt(teammateSpecs: TeammateSpec[] | undefined, taskDescription: string): string {
  let teammateInstruction: string;
  if (teammateSpecs && teammateSpecs.length > 0) {
    const specList = teammateSpecs.map((s, i) =>
      `${i + 1}. Name: "${s.name}" | Role: ${s.role}${s.instructions ? ` | Instructions: ${s.instructions}` : ''}`
    ).join('\n');
    teammateInstruction = `You MUST create exactly the following ${teammateSpecs.length} teammates:\n${specList}\n\nUse these exact names when spawning teammates. Give each teammate instructions matching their role.`;
  } else {
    teammateInstruction = `You MUST create at least 1 teammate and delegate the work. Do NOT do the work yourself.`;
  }

  return `${teammateInstruction}

CRITICAL RULES:
1. Use the Task tool to spawn teammates. Each teammate gets a clear, specific sub-task.
2. After spawning teammates, you MUST wait for ALL of them to complete. Use TaskList to check progress.
3. Do NOT finish your response until every teammate's task shows status "completed".
4. Once all tasks are completed, collect and present ALL results in a comprehensive summary.
5. If a teammate is still working, keep checking TaskList every few seconds until done.

## Task
${taskDescription}`;
}

export function buildSystemPrompt() {
  return {
    type: 'preset' as const,
    preset: 'claude_code' as const,
    append: 'You are a team lead. Create teammates and delegate tasks. Use the agent team features to coordinate work efficiently.',
  };
}
