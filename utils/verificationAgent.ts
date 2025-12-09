/**
 * LLM Output Verification Agent
 * Uses Gemini 2.5 Flash to verify and fix generated content before display
 */

import { GoogleGenAI } from "@google/genai";
import { validateMermaidSyntax } from './mermaidPrompts';

export interface VerificationResult {
  isValid: boolean;
  correctedContent: string;
  issues: string[];
  fixes: string[];
  originalContent: string;
}

export interface CodeBlockIssue {
  language: string;
  content: string;
  line: number;
  error: string;
}

export interface MermaidIssue {
  content: string;
  line: number;
  errors: string[];
}

/**
 * Extract code blocks from markdown content
 */
const extractCodeBlocks = (content: string): Array<{ language: string; code: string; fullMatch: string; index: number }> => {
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
  const blocks: Array<{ language: string; code: string; fullMatch: string; index: number }> = [];
  let match;
  
  while ((match = codeBlockRegex.exec(content)) !== null) {
    blocks.push({
      language: match[1] || 'text',
      code: match[2].trim(),
      fullMatch: match[0],
      index: match.index
    });
  }
  
  return blocks;
};

/**
 * Extract Mermaid diagrams specifically
 */
const extractMermaidDiagrams = (content: string): MermaidIssue[] => {
  const blocks = extractCodeBlocks(content);
  const mermaidBlocks: MermaidIssue[] = [];
  
  blocks.forEach((block, idx) => {
    if (block.language.toLowerCase() === 'mermaid') {
      const validation = validateMermaidSyntax(block.code);
      if (!validation.valid) {
        mermaidBlocks.push({
          content: block.code,
          line: idx + 1,
          errors: validation.errors
        });
      }
    }
  });
  
  return mermaidBlocks;
};

/**
 * Verify Mermaid syntax and fix if needed
 */
const verifyMermaidSyntax = async (
  mermaidCode: string,
  apiKey: string
): Promise<{ isValid: boolean; fixedCode: string; issues: string[] }> => {
  const validation = validateMermaidSyntax(mermaidCode);
  
  if (validation.valid) {
    return { isValid: true, fixedCode: mermaidCode, issues: [] };
  }
  
  // Use AI to fix the Mermaid syntax
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const fixPrompt = `You are a Mermaid diagram syntax validator and fixer.

**TASK**: Fix the following Mermaid diagram to be syntactically correct.

**ERRORS DETECTED**:
${validation.errors.map((e, i) => `${i + 1}. ${e}`).join('\n')}

**ORIGINAL CODE**:
\`\`\`mermaid
${mermaidCode}
\`\`\`

**CRITICAL RULES**:
1. Start with diagram type: flowchart TD/LR or graph TD/LR
2. Use --> for arrows (with spaces: A --> B)
3. Keep labels under 20 characters
4. No semicolons at line ends
5. No quotes in labels unless absolutely necessary
6. Simple node IDs (A, B, C or node1, node2)

**OUTPUT**: Return ONLY the corrected Mermaid code without \`\`\`mermaid wrapper, no explanations.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: fixPrompt,
    });
    
    const fixedCode = response.text.trim();
    const revalidation = validateMermaidSyntax(fixedCode);
    
    return {
      isValid: revalidation.valid,
      fixedCode: revalidation.valid ? fixedCode : mermaidCode,
      issues: validation.errors
    };
  } catch (error) {
    console.error('Mermaid fix failed:', error);
    return { isValid: false, fixedCode: mermaidCode, issues: validation.errors };
  }
};

/**
 * Verify code block syntax using AI
 */
const verifyCodeBlock = async (
  language: string,
  code: string,
  apiKey: string
): Promise<{ isValid: boolean; fixedCode: string; issues: string[] }> => {
  // Skip verification for non-programming languages
  const verifiableLanguages = ['javascript', 'typescript', 'python', 'java', 'cpp', 'c', 'csharp', 'go', 'rust', 'sql'];
  
  if (!verifiableLanguages.includes(language.toLowerCase())) {
    return { isValid: true, fixedCode: code, issues: [] };
  }
  
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const verifyPrompt = `You are a code syntax validator.

**TASK**: Check if this ${language} code has syntax errors. If errors exist, fix them.

**CODE**:
\`\`\`${language}
${code}
\`\`\`

**OUTPUT FORMAT**:
Return a JSON object:
{
  "isValid": true/false,
  "issues": ["list of issues found"],
  "fixedCode": "corrected code if needed, otherwise original"
}

Return ONLY the JSON, no markdown formatting.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: verifyPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const result = JSON.parse(response.text);
    
    return {
      isValid: result.isValid ?? true,
      fixedCode: result.fixedCode || code,
      issues: result.issues || []
    };
  } catch (error) {
    console.error('Code verification failed:', error);
    return { isValid: true, fixedCode: code, issues: [] };
  }
};

/**
 * Verify complete markdown content
 */
const verifyMarkdownStructure = async (
  content: string,
  apiKey: string
): Promise<{ isValid: boolean; issues: string[] }> => {
  try {
    const ai = new GoogleGenAI({ apiKey });
    
    const verifyPrompt = `You are a markdown validator.

**TASK**: Check if this markdown content has structural issues.

**CHECK FOR**:
- Malformed tables
- Broken links
- Unclosed HTML tags
- Invalid list formatting
- Heading hierarchy issues

**CONTENT** (first 1000 chars):
${content.substring(0, 1000)}...

**OUTPUT FORMAT**:
Return a JSON object:
{
  "isValid": true/false,
  "issues": ["list of issues found"]
}

Return ONLY the JSON, no markdown formatting.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: verifyPrompt,
      config: {
        responseMimeType: "application/json"
      }
    });
    
    const result = JSON.parse(response.text);
    
    return {
      isValid: result.isValid ?? true,
      issues: result.issues || []
    };
  } catch (error) {
    console.error('Markdown verification failed:', error);
    return { isValid: true, issues: [] };
  }
};

/**
 * Main verification agent - processes entire LLM output
 */
export const verifyLLMOutput = async (
  content: string,
  apiKey: string,
  options: {
    verifyMermaid?: boolean;
    verifyCode?: boolean;
    verifyMarkdown?: boolean;
    autoFix?: boolean;
  } = {}
): Promise<VerificationResult> => {
  const {
    verifyMermaid = true,
    verifyCode = true,
    verifyMarkdown = true,
    autoFix = true
  } = options;
  
  const issues: string[] = [];
  const fixes: string[] = [];
  let correctedContent = content;
  
  try {
    // 1. Verify Mermaid diagrams
    if (verifyMermaid) {
      const mermaidIssues = extractMermaidDiagrams(content);
      
      if (mermaidIssues.length > 0) {
        issues.push(`Found ${mermaidIssues.length} Mermaid diagram(s) with issues`);
        
        if (autoFix) {
          for (const issue of mermaidIssues) {
            const verification = await verifyMermaidSyntax(issue.content, apiKey);
            
            if (!verification.isValid && verification.issues.length > 0) {
              issues.push(...verification.issues.map(i => `Mermaid: ${i}`));
            }
            
            if (verification.fixedCode !== issue.content) {
              // Replace in content
              const oldBlock = `\`\`\`mermaid\n${issue.content}\n\`\`\``;
              const newBlock = `\`\`\`mermaid\n${verification.fixedCode}\n\`\`\``;
              correctedContent = correctedContent.replace(oldBlock, newBlock);
              fixes.push(`Fixed Mermaid diagram at line ${issue.line}`);
            }
          }
        }
      }
    }
    
    // 2. Verify code blocks
    if (verifyCode) {
      const codeBlocks = extractCodeBlocks(correctedContent);
      const codeBlocksToVerify = codeBlocks.filter(b => b.language.toLowerCase() !== 'mermaid');
      
      for (const block of codeBlocksToVerify) {
        const verification = await verifyCodeBlock(block.language, block.code, apiKey);
        
        if (!verification.isValid) {
          issues.push(...verification.issues.map(i => `${block.language}: ${i}`));
        }
        
        if (autoFix && verification.fixedCode !== block.code) {
          correctedContent = correctedContent.replace(block.fullMatch, 
            `\`\`\`${block.language}\n${verification.fixedCode}\n\`\`\``
          );
          fixes.push(`Fixed ${block.language} code block`);
        }
      }
    }
    
    // 3. Verify markdown structure
    if (verifyMarkdown) {
      const markdownVerification = await verifyMarkdownStructure(correctedContent, apiKey);
      
      if (!markdownVerification.isValid) {
        issues.push(...markdownVerification.issues.map(i => `Markdown: ${i}`));
      }
    }
    
    return {
      isValid: issues.length === 0,
      correctedContent,
      issues,
      fixes,
      originalContent: content
    };
    
  } catch (error) {
    console.error('Verification agent error:', error);
    return {
      isValid: false,
      correctedContent: content,
      issues: [`Verification failed: ${error}`],
      fixes: [],
      originalContent: content
    };
  }
};

/**
 * Quick verification for streaming content (lighter checks)
 */
export const quickVerifyChunk = (chunk: string): { hasIssues: boolean; warnings: string[] } => {
  const warnings: string[] = [];
  
  // Check for common markdown issues
  if (chunk.includes('```') && !chunk.match(/```\w*\n/)) {
    warnings.push('Malformed code block fence');
  }
  
  // Check for unclosed brackets
  const openBrackets = (chunk.match(/\[/g) || []).length;
  const closeBrackets = (chunk.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    warnings.push('Unmatched brackets detected');
  }
  
  // Check for unclosed parentheses
  const openParens = (chunk.match(/\(/g) || []).length;
  const closeParens = (chunk.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    warnings.push('Unmatched parentheses detected');
  }
  
  return {
    hasIssues: warnings.length > 0,
    warnings
  };
};

/**
 * Pre-generation prompt enhancement
 */
export const enhancePromptWithVerificationRules = (originalPrompt: string, contentType: 'study-notes' | 'lesson-plan' | 'quiz' | 'paper' = 'study-notes'): string => {
  const verificationRules = `

**CRITICAL OUTPUT VERIFICATION RULES**:
Your output will be automatically verified. Follow these rules EXACTLY to pass validation:

1. **Code Blocks**:
   - Always use proper code fence syntax: \`\`\`language
   - Close all code blocks with \`\`\`
   - Ensure code is syntactically valid
   - Use appropriate language identifiers

2. **Mermaid Diagrams** (if included):
   - Start with diagram type: flowchart TD/LR or graph TD/LR
   - Use --> for arrows with spaces: A --> B
   - Keep labels under 20 characters
   - No semicolons at line ends
   - No special characters in labels
   - Example:
     \`\`\`mermaid
     flowchart TD
         A[Start] --> B[End]
     \`\`\`

3. **Markdown Structure**:
   - Use proper heading hierarchy (H1 > H2 > H3)
   - Close all brackets and parentheses
   - Format tables correctly with aligned columns
   - Use valid list syntax (consistent indentation)

4. **Tables**:
   - Use pipe separators: | Column 1 | Column 2 |
   - Include header separator: |----------|----------|
   - Align columns properly

**VALIDATION CHECK**: Before finalizing, mentally verify:
- [ ] All code blocks are properly formatted
- [ ] All Mermaid diagrams follow syntax rules
- [ ] All brackets/parentheses are closed
- [ ] Tables are properly formatted
- [ ] Headings follow logical hierarchy
`;

  return originalPrompt + verificationRules;
};
