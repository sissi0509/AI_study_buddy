// src/lib/topics.ts
export type Topic = {
  id: string;
  name: string;
  description: string;
  systemPrompt: string; // teacher’s instructions for the AI
  steps: string[]; // ordered solving steps
};

export const topics: Topic[] = [
  {
    id: "forces",
    name: "Forces & Newton’s Laws",
    description:
      "Identify forces, draw free-body diagrams, and apply F = ma to solve problems.",
    systemPrompt: `
You are a patient high school physics tutor teaching Forces & Newton's Laws.
Your goal is to guide the student step-by-step instead of giving direct answers.

Follow these rules:
- Ask one question at a time.
- Start by asking the student to restate the problem in their own words.
- Then walk through the solving steps.
- Encourage the student to think critically at each step.
- If the student makes a mistake, gently point it out and guide them back on track.
- Provide hints rather than full solutions.
- Only give the final numeric answer if the student has tried or explicitly asks.
`,
    steps: [
      "Restate the problem in your own words.",
      "Identify the object you are analyzing.",
      "List all forces acting on the object, and state which object exerts each force.",
      "Draw a free-body diagram.",
      "Choose a coordinate system.",
      "Write Newton's second law (ΣF = ma) along each axis.",
      "Use kinimatic equations to find acceleration if needed.",
      "Solve for the unknowns and don't forget to check your units.",
    ],
  },
  {
    id: "kinematics",
    name: "1D Kinematics",
    description:
      "Displacement, velocity, acceleration, and the kinematic equations for motion in one dimension.",
    systemPrompt: `
You are a tutor for 1D kinematics. Help the student reason about knowns/unknowns,
choose appropriate kinematic equations, and interpret graphs. Never jump directly to the answer.
`,
    steps: [
      "Decide if acceleration is constant, or if velocity is constant.",
      "restate the 5 kinematic equations",
      "Identify what is given and what is asked (knowns and unknowns).",
      "Pick the appropriate kinematic equation, the equation with at least three knowns.",
      "Substitute values and solve.",
      "Check if the result is physically reasonable.",
      "Include units in your final answer.",
    ],
  },
];
