/**
 * Standalone Mermaid Validator
 * Provides pre-rendering validation for Mermaid diagrams
 * Can be used independently or integrated into the rendering pipeline
 */

import mermaid from 'mermaid';

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

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  sanitizedCode?: string;
}

export interface ValidationOptions {
  autoSanitize?: boolean;
  strictMode?: boolean;
}

/**
 * Sanitize Mermaid code for common issues
 */
const sanitizeMermaidCode = (code: string): string => {
  let sanitized = code.trim();
  
  // Remove markdown code block wrapper if present
  sanitized = sanitized.replace(/^```mermaid\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  
  // Remove BOM and special characters
  sanitized = sanitized.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  
  // Remove extra semicolons at line ends
  sanitized = sanitized.replace(/;+$/gm, '');
  
  // Fix common arrow issues
  sanitized = sanitized.replace(/--->/g, '-->');
  
  return sanitized;
};

/**
 * Validate Mermaid syntax using pattern matching (synchronous)
 */
const validatePattern = (code: string, strictMode: boolean = false): { errors: string[]; warnings: string[] } => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const lines = code.split('\n');
  
  // Check for diagram type declaration
  const firstLine = lines[0]?.trim().toLowerCase();
  if (!firstLine?.match(/^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey)\s*/)) {
    errors.push('Missing or invalid diagram type declaration');
  }
  
  // Check each line for common syntax errors
  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (!trimmed || idx === 0) return;
    
    // Check for wrong arrow syntax
    if (trimmed.match(/\w\s*->\s*\w/) && !trimmed.includes('-->')) {
      errors.push(`Line ${idx + 1}: Invalid arrow syntax "->" (should be "-->")`);
    }
    
    // Check for semicolons
    if (trimmed.endsWith(';')) {
      if (strictMode) {
        errors.push(`Line ${idx + 1}: Remove semicolon at end of line`);
      } else {
        warnings.push(`Line ${idx + 1}: Semicolons at line ends are not recommended`);
      }
    }
    
    // Check for missing spaces around arrows
    if (trimmed.match(/\w(-->|==>|\.->)\w/)) {
      errors.push(`Line ${idx + 1}: Missing spaces around arrows`);
    }
    
    // Check for overly long labels
    const labelMatch = trimmed.match(/\[([^\]]+)\]/);
    if (labelMatch && labelMatch[1].length > 100) {
      warnings.push(`Line ${idx + 1}: Label is very long (${labelMatch[1].length} chars)`);
    }
    
    // Check for quotes in labels (can cause issues)
    if (labelMatch && labelMatch[1].includes('"')) {
      warnings.push(`Line ${idx + 1}: Quotes in labels may cause rendering issues`);
    }
  });
  
  return { errors, warnings };
};

/**
 * Validate Mermaid syntax using Mermaid's built-in parser (async, most reliable)
 */
export const validateMermaidDiagram = async (
  code: string,
  options: ValidationOptions = {}
): Promise<ValidationResult> => {
  const { autoSanitize = true, strictMode = false } = options;
  
  try {
    // Sanitize if enabled
    const processedCode = autoSanitize ? sanitizeMermaidCode(code) : code;
    
    if (!processedCode || processedCode.trim().length === 0) {
      return {
        valid: false,
        errors: ['Empty diagram code'],
        warnings: [],
        sanitizedCode: processedCode
      };
    }
    
    // Run pattern validation first for quick checks
    const patternValidation = validatePattern(processedCode, strictMode);
    
    try {
      // Initialize mermaid with minimal config
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'loose'
      });
      
      // Use Mermaid's parse function to validate syntax
      await mermaid.parse(processedCode);
      
      // Parse successful - diagram is valid
      return {
        valid: true,
        errors: [],
        warnings: patternValidation.warnings,
        sanitizedCode: processedCode
      };
    } catch (parseError: any) {
      // Parse failed - extract error details
      const errorMessage = parseError.message || parseError.toString();
      const errors = [`Mermaid parse error: ${errorMessage}`, ...patternValidation.errors];
      
      return {
        valid: false,
        errors,
        warnings: patternValidation.warnings,
        sanitizedCode: processedCode
      };
    }
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Validation error: ${error.message || error}`],
      warnings: [],
      sanitizedCode: code
    };
  }
};

/**
 * Synchronous validation (less reliable, uses pattern matching only)
 * Use this when you need immediate validation without async
 */
export const validateMermaidDiagramSync = (
  code: string,
  options: ValidationOptions = {}
): ValidationResult => {
  const { autoSanitize = true, strictMode = false } = options;
  
  try {
    const processedCode = autoSanitize ? sanitizeMermaidCode(code) : code;
    
    if (!processedCode || processedCode.trim().length === 0) {
      return {
        valid: false,
        errors: ['Empty diagram code'],
        warnings: []
      };
    }
    
    const validation = validatePattern(processedCode, strictMode);
    
    return {
      valid: validation.errors.length === 0,
      errors: validation.errors,
      warnings: validation.warnings,
      sanitizedCode: processedCode
    };
  } catch (error: any) {
    return {
      valid: false,
      errors: [`Validation error: ${error.message || error}`],
      warnings: []
    };
  }
};

/**
 * Batch validate multiple diagrams
 */
export const validateMultipleDiagrams = async (
  diagrams: { id: string; code: string }[],
  options: ValidationOptions = {}
): Promise<Map<string, ValidationResult>> => {
  const results = new Map<string, ValidationResult>();
  
  await Promise.all(
    diagrams.map(async ({ id, code }) => {
      const result = await validateMermaidDiagram(code, options);
      results.set(id, result);
    })
  );
  
  return results;
};

/**
 * Quick validation check (returns boolean only)
 */
export const isValidMermaidDiagram = async (code: string): Promise<boolean> => {
  const result = await validateMermaidDiagram(code, { autoSanitize: true });
  return result.valid;
};

/**
 * Get failure statistics for monitoring
 */
export const getFailureStatistics = () => {
  return failureLogger.getFailureStats();
};

/**
 * Export failure logs for analysis
 */
export const exportFailureLogs = (): string => {
  return failureLogger.exportFailures();
};

/**
 * Extract validation summary
 */
export const getValidationSummary = (result: ValidationResult): string => {
  if (result.valid) {
    return result.warnings.length > 0
      ? `✅ Valid (${result.warnings.length} warnings)`
      : '✅ Valid';
  }
  
  return `❌ Invalid (${result.errors.length} errors, ${result.warnings.length} warnings)`;
};

/**
 * Auto-repair invalid Mermaid using Gemini AI
 * Implements solution #3: Auto-repair pass before rendering
 */

/**
 * Failed diagram logger for production analysis
 * Implements solution #6: Log & store failed snippets
 */
interface FailedDiagram {
  timestamp: Date;
  code: string;
  errors: string[];
  warnings: string[];
  context?: string;
}

class MermaidFailureLogger {
  private static instance: MermaidFailureLogger;
  private failures: FailedDiagram[] = [];
  private maxLogs = 100; // Keep last 100 failures
  
  private constructor() {}
  
  static getInstance(): MermaidFailureLogger {
    if (!MermaidFailureLogger.instance) {
      MermaidFailureLogger.instance = new MermaidFailureLogger();
    }
    return MermaidFailureLogger.instance;
  }
  
  logFailure(code: string, errors: string[], warnings: string[] = [], context?: string) {
    this.failures.push({
      timestamp: new Date(),
      code,
      errors,
      warnings,
      context
    });
    
    // Keep only recent failures
    if (this.failures.length > this.maxLogs) {
      this.failures = this.failures.slice(-this.maxLogs);
    }
    
    console.warn('📊 Mermaid failure logged:', {
      timestamp: new Date().toISOString(),
      errorCount: errors.length,
      context
    });
  }
  
  getFailures(): FailedDiagram[] {
    return [...this.failures];
  }
  
  getFailureStats() {
    const totalFailures = this.failures.length;
    const errorTypes = new Map<string, number>();
    
    this.failures.forEach(f => {
      f.errors.forEach(err => {
        const errorType = err.split(':')[0];
        errorTypes.set(errorType, (errorTypes.get(errorType) || 0) + 1);
      });
    });
    
    return {
      total: totalFailures,
      errorTypes: Object.fromEntries(errorTypes),
      recentFailures: this.failures.slice(-10)
    };
  }
  
  exportFailures(): string {
    return JSON.stringify(this.failures, null, 2);
  }
  
  clearLogs() {
    this.failures = [];
  }
}

export const failureLogger = MermaidFailureLogger.getInstance();

/**
 * Complete validation and repair pipeline
 * Implements recommended architecture from solution #7
 */
export const validateAndRepairMermaid = async (
  code: string,
  options: ValidationOptions & { logFailures?: boolean } = {}
): Promise<{
  valid: boolean;
  finalCode: string;
  wasRepaired: boolean;
  errors: string[];
  warnings: string[];
}> => {
  const { logFailures = true, ...validationOptions } = options;
  
  // Step 1: Initial validation
  console.log('🔍 Step 1: Validating Mermaid syntax...');
  const initialValidation = await validateMermaidDiagram(code, validationOptions);
  
  if (initialValidation.valid) {
    console.log('✅ Validation passed on first attempt');
    return {
      valid: true,
      finalCode: initialValidation.sanitizedCode || code,
      wasRepaired: false,
      errors: [],
      warnings: initialValidation.warnings
    };
  }
  
  console.warn('❌ Initial validation failed:', initialValidation.errors);
  
  // Log failure if enabled
  if (logFailures) {
    failureLogger.logFailure(code, initialValidation.errors, initialValidation.warnings, 'Initial validation');
  }
  
  // Return failed validation without sending diagram content to a third party.
  console.error('❌ Validation and repair failed');
  return {
    valid: false,
    finalCode: initialValidation.sanitizedCode || code,
    wasRepaired: false,
    errors: initialValidation.errors,
    warnings: initialValidation.warnings
  };
};
