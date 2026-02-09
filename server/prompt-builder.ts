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
2. After spawning ALL teammates, IMMEDIATELY call TaskList to check their status. Do NOT just say "waiting" — you MUST actually call the TaskList tool.
3. NEVER stop or end your response while ANY task has status other than "completed". If tasks are still "pending" or "in_progress", call TaskList again. Keep calling TaskList in a loop until ALL tasks show "completed".
4. Once ALL tasks show status "completed", collect and present ALL results in a comprehensive summary.
5. IMPORTANT: Every time you check TaskList and tasks are not all completed, you MUST call TaskList again. Never output text saying you will wait — instead, TAKE ACTION by calling TaskList.

TASK MANAGEMENT:
- Before starting work, use TaskCreate to break down the task into trackable sub-tasks.
- Each sub-task should have a clear subject (imperative form) and description.
- Always provide activeForm (present continuous, e.g. "Analyzing components") when creating tasks.
- Update task status with TaskUpdate: set to "in_progress" when starting, "completed" when done.
- Create tasks for each teammate's work AND for your own coordination steps.
- Example workflow:
  1. TaskCreate: "Analyze existing components" (your planning step)
  2. TaskUpdate: mark as in_progress, then completed after analysis
  3. TaskCreate: "Refactor Button component" (teammate's work)
  4. Spawn teammate, TaskUpdate: mark as in_progress
  5. When teammate finishes, TaskUpdate: mark as completed

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
