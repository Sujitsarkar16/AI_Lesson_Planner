import { validateMermaidDiagram, validateMermaidDiagramSync } from './mermaidValidator';

export interface VerificationResult {
  isValid: boolean;
  correctedContent: string;
  issues: string[];
  fixes: string[];
  originalContent: string;
}

interface MermaidIssue {
  content: string;
  line: number;
  errors: string[];
}

const extractMermaidDiagrams = (content: string, validate: (code: string) => { valid: boolean; errors: string[] }): MermaidIssue[] => {
  const blocks = /```mermaid\n([\s\S]*?)```/gi;
  const issues: MermaidIssue[] = [];
  let match: RegExpExecArray | null;
  let line = 0;

  while ((match = blocks.exec(content)) !== null) {
    line += 1;
    const diagram = match[1].trim();
    const result = validate(diagram);
    if (!result.valid) issues.push({ content: diagram, line, errors: result.errors });
  }
  return issues;
};

export const verifyLLMOutput = async (
  content: string,
  options: { verifyMermaid?: boolean } = {}
): Promise<VerificationResult> => {
  if (!options.verifyMermaid) return { isValid: true, correctedContent: content, issues: [], fixes: [], originalContent: content };

  try {
    const issues = extractMermaidDiagrams(content, (diagram) => validateMermaidDiagramSync(diagram));
    if (!issues.length) return { isValid: true, correctedContent: content, issues: [], fixes: [], originalContent: content };

    // Mermaid's parser is the authoritative local check; do not make secondary LLM calls per diagram.
    const details = await Promise.all(issues.map(async (issue) => {
      const validation = await validateMermaidDiagram(issue.content);
      return validation.errors.map((error) => `Mermaid diagram ${issue.line}: ${error}`);
    }));
    return {
      isValid: false,
      correctedContent: content,
      issues: [`Found ${issues.length} Mermaid diagram(s) with issues`, ...details.flat()],
      fixes: [],
      originalContent: content
    };
  } catch (error) {
    return { isValid: false, correctedContent: content, issues: [`Verification failed: ${error}`], fixes: [], originalContent: content };
  }
};

export const quickVerifyChunk = (chunk: string): { hasIssues: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  if (chunk.includes('```') && !chunk.match(/```\w*\n/)) warnings.push('Malformed code block fence');
  return { hasIssues: warnings.length > 0, warnings };
};
