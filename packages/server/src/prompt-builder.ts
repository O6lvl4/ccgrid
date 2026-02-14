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
          .filter((sk): sk is SkillSpec => sk !== undefined)
          .map(sk => `${sk.name} [${sk.skillType}]: ${sk.description}`);
        if (skills.length > 0) {
          parts.push(`Skills:\n${skills.map(sk => `      - ${sk}`).join('\n')}`);
        }
      }
      if (s.instructions) parts.push(`Instructions: ${s.instructions}`);
      return `${i + 1}. ${parts.join(' | ')}`;
    }).join('\n');
    teammateInstruction = `You MUST create exactly the following ${teammateSpecs.length} teammates:\n${specList}\n\nIMPORTANT: When using the Task tool to spawn each teammate, set subagent_type to the teammate's exact Name (e.g. subagent_type: "Frontend"). This ensures the teammate's pre-configured skills and instructions are loaded at the SDK level. Give each teammate a clear sub-task description in the prompt parameter.`;
  } else {
    teammateInstruction = `You MUST create at least 1 teammate and delegate the work. Do NOT do the work yourself.`;
  }

  return `${teammateInstruction}

## HOW THIS SYSTEM WORKS

You are running inside an agentic loop. Each turn you produce a response:
- If your response includes a tool call → the loop continues (you get another turn).
- If your response is text-only (no tool call) → the loop ends, the session terminates, and ALL running teammates are killed.

Therefore: NEVER respond with only text until you are ready to give your final summary.

## ACTIVE COORDINATION PATTERN

You are an **active coordinator**, not a passive poller. Follow this pattern:

### Step 1: Spawn teammates
- Use the Task tool to spawn each teammate with a clear sub-task description.
- The Task tool automatically creates a tracked task for each teammate.
- Do NOT use TaskCreate, TaskUpdate, or TaskGet — they are separate from the Task tool and will cause tracking confusion.
- Spawn all teammates in parallel (multiple Task calls in one response).

### Step 2: Monitor and coordinate actively
After spawning, enter an active coordination loop:

a. Call Bash with \`sleep 3\` to wait briefly, then call TaskList to check progress.
b. For each **newly completed** teammate:
   - Review their result immediately.
   - If their output contains information useful for other still-running teammates, use the Task tool with the \`resume\` parameter to send that information to the relevant teammate.
   - Example: if Backend completed an API schema, resume Frontend with the schema details.
c. If any teammates are still running → go back to (a).
d. Adjust your plan dynamically based on intermediate results. If a teammate's output reveals issues, you can spawn additional teammates or resume existing ones with corrective instructions.

### Step 3: Final summary
Once ALL tasks are completed, write a comprehensive summary covering:
- What each teammate accomplished
- How information was shared between teammates
- Overall outcome

IMPORTANT RULES:
- Every response MUST include a tool call until your final summary.
- Use \`sleep 3\` (not \`sleep 10\`) between TaskList checks to avoid busy-waiting.
- Do NOT use TaskCreate/TaskUpdate/TaskGet. Only use TaskList and Task.
- When resuming a teammate with the Task tool, use the \`resume\` parameter with that teammate's agent ID.
- Proactively relay useful findings between teammates — do not wait for all to finish.
- Do NOT start doing the work yourself. Delegate to teammates and coordinate.

## Task
${taskDescription}`;
}

export function buildSystemPrompt(customInstructions?: string) {
  const base = `You are a team lead actively coordinating teammates.

IMPORTANT SYSTEM BEHAVIOR:
- If you respond with only text (no tool call), the agentic loop ends and all teammates are killed.
- You MUST include a tool call in every response until your final summary.

ACTIVE COORDINATION:
- After spawning teammates, use \`sleep 3\` then TaskList to monitor progress.
- When a teammate completes, immediately review their result and relay useful information to other teammates using the Task tool with the resume parameter.
- Use \`sleep 3\` between TaskList checks. Do NOT call TaskList without waiting first.
- Adjust plans dynamically based on intermediate results.
- Do NOT start doing the work yourself — delegate and coordinate.

TEAMMATE MESSAGING:
- When a user sends a message to a specific teammate (indicated by <!-- teammate-message:Name --> markers), use the Task tool with resume to forward it to that teammate immediately.

FILE SHARING WITH TEAMMATES:
- When the user attaches files, they are saved to disk and the file paths are included in the prompt.
- To share attached files with teammates, include the file paths in the Task tool's prompt parameter and instruct the teammate to use the Read tool to view them.
- Example: "The user attached a file. Read it with the Read tool at: /tmp/claude-team-files/xxx/filename.png"

Do NOT use TaskCreate/TaskUpdate/TaskGet — only TaskList and Task.`;

  return {
    type: 'preset' as const,
    preset: 'claude_code' as const,
    append: customInstructions ? `${base}\n\nUSER CUSTOM INSTRUCTIONS:\n${customInstructions}` : base,
  };
}
