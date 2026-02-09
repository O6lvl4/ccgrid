import type { TeammateSpec, SkillSpec } from '@ccgrid/shared';

export function buildPrompt(teammateSpecs: TeammateSpec[] | undefined, taskDescription: string, skillSpecs?: SkillSpec[]): string {
  const skillMap = new Map((skillSpecs ?? []).map(s => [s.id, s]));

  let teammateInstruction: string;
  if (teammateSpecs && teammateSpecs.length > 0) {
    const specList = teammateSpecs.map((s, i) => {
      const parts = [`Name: "${s.name}"`, `Role: ${s.role}`];
      if (s.skillIds && s.skillIds.length > 0) {
        const skills = s.skillIds
          .map(id => skillMap.get(id))
          .filter((sk): sk is SkillSpec => sk != null)
          .map(sk => `${sk.name} [${sk.skillType}]: ${sk.description}`);
        if (skills.length > 0) {
          parts.push(`Skills:\n${skills.map(sk => `      - ${sk}`).join('\n')}`);
        }
      }
      if (s.instructions) parts.push(`Instructions: ${s.instructions}`);
      return `${i + 1}. ${parts.join(' | ')}`;
    }).join('\n');
    teammateInstruction = `You MUST create exactly the following ${teammateSpecs.length} teammates:\n${specList}\n\nUse these exact names when spawning teammates. Give each teammate instructions matching their role and skills.`;
  } else {
    teammateInstruction = `You MUST create at least 1 teammate and delegate the work. Do NOT do the work yourself.`;
  }

  return `${teammateInstruction}

## HOW THIS SYSTEM WORKS

You are running inside an agentic loop. Each turn you produce a response:
- If your response includes a tool call → the loop continues (you get another turn).
- If your response is text-only (no tool call) → the loop ends, the session terminates, and ALL running teammates are killed.

Therefore: NEVER respond with only text until you are ready to give your final summary.

## SPAWNING AND WAITING FOR TEAMMATES

1. Use the Task tool to spawn each teammate with a clear sub-task description.
   - The Task tool automatically creates a tracked task for each teammate.
   - Do NOT use TaskCreate, TaskUpdate, or TaskGet — they are separate from the Task tool and will cause tracking confusion.

2. After spawning all teammates, enter this polling loop:

   a. Call TaskList to check task statuses.
   b. If ALL tasks show "completed" → proceed to step 3.
   c. If any task is NOT "completed" → call Bash with command \`sleep 10\`, then go back to (a).

3. Once all tasks are completed, write a comprehensive final summary of all results.

IMPORTANT:
- Every response MUST include a tool call until your final summary. Text-only responses kill the session.
- Do NOT use TaskCreate/TaskUpdate/TaskGet. Only use TaskList to check status and Task to spawn teammates.
- Do NOT say "waiting" or "monitoring" without an accompanying tool call.

## Task
${taskDescription}`;
}

export function buildSystemPrompt() {
  return {
    type: 'preset' as const,
    preset: 'claude_code' as const,
    append: `You are a team lead coordinating teammates.

IMPORTANT SYSTEM BEHAVIOR:
- If you respond with only text (no tool call), the agentic loop ends and all teammates are killed.
- You MUST include a tool call in every response until your final summary.

After spawning teammates with the Task tool, poll with this exact pattern:
1. Call TaskList tool to check statuses
2. If not all completed → call Bash tool with "sleep 10" → go to 1
3. If all completed → write final summary

Do NOT use TaskCreate/TaskUpdate/TaskGet — only TaskList and Task.`,
  };
}
