/**
 * Mermaid Diagram Generation Utilities
 * Provides prompts and guidelines for generating error-free Mermaid diagrams
 */

export const MERMAID_SYNTAX_RULES = `
**CRITICAL MERMAID SYNTAX RULES (MUST FOLLOW):**

1. **Diagram Type Declaration:**
   - Start with EXACTLY one of: \`graph TD\`, \`graph LR\`, \`flowchart TD\`, or \`flowchart LR\`
   - TD = Top Down (vertical), LR = Left to Right (horizontal)

2. **Node Syntax (STRICT):**
   - Simple text: \`A[Simple Text]\`
   - Round edges: \`B(Round Edges)\`
   - Stadium: \`C([Stadium Shape])\`
   - Subroutine: \`D[[Subroutine]]\`
   - Database: \`E[(Database)]\`
   - Circle: \`F((Circle))\`
   - Diamond: \`G{Decision}\`
   - Hexagon: \`H{{Hexagon}}\`

3. **Label Rules:**
   - Keep labels SHORT (max 20 characters)
   - NO quotes unless absolutely necessary
   - NO special characters: avoid &, <, >, |, quotes
   - Use underscores instead of spaces in node IDs
   - Example: \`node_1[Start Process]\`

4. **Connection Syntax:**
   - Arrow: \`A --> B\`
   - With label: \`A -->|Label Text| B\`
   - Thick arrow: \`A ==> B\`
   - Dotted: \`A -.-> B\`
   - NO other variations!

5. **Common Errors to AVOID:**
   - ❌ \`A-->B\` (missing spaces)
   - ❌ \`A -> B\` (wrong arrow)
   - ❌ \`A[Label with "quotes"]\` (quotes in label)
   - ❌ \`A[Very long label text that goes on and on]\` (too long)
   - ❌ Semicolons at end of lines
   - ❌ Empty lines within the diagram
   - ❌ Node IDs with spaces or special chars

6. **Format Rules:**
   - One statement per line
   - No blank lines between statements
   - No semicolons
   - No comments within diagram
   - Consistent indentation (optional but clean)

**VALID EXAMPLE:**
\`\`\`mermaid
flowchart TD
    A[Start] --> B{Check Input}
    B -->|Valid| C[Process Data]
    B -->|Invalid| D[Show Error]
    C --> E[Save Result]
    D --> A
    E --> F[End]
\`\`\`

**INVALID EXAMPLE (DO NOT USE):**
\`\`\`mermaid
graph TD
    A[Start] -> B{Is this "valid"?};
    B-->|yes|C[This label is way too long and will cause errors]
    B --> |no| D
\`\`\`
`;

export const getMermaidPromptSuffix = (diagramType: 'flowchart' | 'concept' | 'process' = 'flowchart'): string => {
  const baseRules = MERMAID_SYNTAX_RULES;
  
  const specificGuidance = {
    flowchart: `
- Use flowchart TD (top-down) for hierarchical processes
- Maximum 8-12 nodes for clarity
- Use decision diamonds {text} for Yes/No branches
- Label arrows with |text| for clarity
`,
    concept: `
- Use graph LR (left-right) for concept relationships  
- Keep to 6-10 key concepts maximum
- Use simple rectangles [text] for concepts
- Arrows show relationships between concepts
`,
    process: `
- Use flowchart TD for step-by-step processes
- Include Start and End nodes
- Use diamonds for decisions/conditions
- Use rectangles for actions/processes
`
  };

  return `${baseRules}

**For ${diagramType} diagrams specifically:**
${specificGuidance[diagramType]}

**OUTPUT REQUIREMENTS:**
1. Output ONLY the mermaid code block
2. Start with \`\`\`mermaid and end with \`\`\`
3. First line after opening should be the diagram type (e.g., flowchart TD)
4. Test each line mentally: Is the syntax EXACTLY correct?
5. Keep it SIMPLE - fewer nodes with clear connections work better
`;
};

/**
 * Validates basic Mermaid syntax
 */
export const validateMermaidSyntax = (chart: string): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];
  const lines = chart.trim().split('\n');
  
  // Check for diagram type declaration
  const firstLine = lines[0]?.trim().toLowerCase();
  if (!firstLine?.match(/^(graph|flowchart)\s+(td|lr|bt|rl)/)) {
    errors.push('Missing or invalid diagram type declaration (must start with "graph TD/LR" or "flowchart TD/LR")');
  }
  
  // Check for common syntax errors
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || idx === 0) return;
    
    // Check for wrong arrow syntax
    if (trimmed.includes('->') && !trimmed.includes('-->') && !trimmed.includes('.->') && !trimmed.includes('==>')) {
      errors.push(`Line ${idx + 1}: Invalid arrow syntax "->" (should be "-->")`);
    }
    
    // Check for semicolons
    if (trimmed.endsWith(';')) {
      errors.push(`Line ${idx + 1}: Remove semicolon at end of line`);
    }
    
    // Check for missing spaces around arrows
    if (trimmed.match(/\w(-->|==>|\.->\||)\w/)) {
      errors.push(`Line ${idx + 1}: Add spaces around arrows`);
    }
  });
  
  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Generates an improved Mermaid prompt for AI
 */
export const generateMermaidPrompt = (
  topic: string,
  diagramType: 'flowchart' | 'concept' | 'process' = 'flowchart',
  nodeCount: number = 8
): string => {
  return `Create a ${diagramType} diagram for: "${topic}"

${getMermaidPromptSuffix(diagramType)}

**Additional Requirements:**
- Generate approximately ${nodeCount} nodes (±2 is acceptable)
- Ensure all node IDs are unique and simple (use: A, B, C, node1, node2, etc.)
- Each node label should be concise (max 15 characters)
- Create logical connections that tell a clear story
- Double-check syntax before outputting

Remember: SIMPLICITY and CORRECTNESS over complexity. A simple, working diagram is better than a complex broken one.`;
};
