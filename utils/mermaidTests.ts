/**
 * Test suite for Mermaid rendering improvements
 * Run these tests manually to verify the fixes work
 */

// Test 1: Valid Mermaid Syntax
export const TEST_VALID_MERMAID = `
flowchart TD
    A[Start] --> B{Check}
    B -->|Yes| C[Process]
    B -->|No| D[End]
    C --> D
`;

// Test 2: Common Syntax Errors (Should Auto-Fix)
export const TEST_FIXABLE_ERRORS = `
flowchart TD
    A[Start] -> B{Check};
    B-->|Yes|C[Process]
    B --> |No| D[End];
    C --> D
`;

// Test 3: Complex Diagram (Should Fallback to ReactFlow)
export const TEST_COMPLEX_FALLBACK = `
graph LR
    A[Photosynthesis] --> B[Light Reaction]
    A --> C[Dark Reaction]
    B --> D[ATP]
    B --> E[NADPH]
    C --> F[Glucose]
    D --> C
    E --> C
`;

// Test 4: Invalid Syntax (Should Show Error or Fallback)
export const TEST_INVALID = `
This is not valid mermaid syntax at all!
Random text that should fail.
`;

// Test 5: With Markdown Wrapper (Should Strip)
export const TEST_WITH_WRAPPER = `\`\`\`mermaid
flowchart TD
    A[Start] --> B[End]
\`\`\``;

// Test 6: Dark Mode Test
export const TEST_THEME_SUPPORT = `
flowchart LR
    A[Light] --> B[Dark]
    B --> C[Theme]
    C --> A
`;

/**
 * Manual Test Instructions:
 * 
 * 1. Test Valid Mermaid:
 *    - Copy TEST_VALID_MERMAID
 *    - Paste into Study Notes with diagrams enabled
 *    - Should render perfectly
 * 
 * 2. Test Auto-Fix:
 *    - Copy TEST_FIXABLE_ERRORS
 *    - Should automatically fix and render
 *    - Check console for sanitization logs
 * 
 * 3. Test Fallback:
 *    - Copy TEST_COMPLEX_FALLBACK
 *    - Should show ReactFlow diagram
 *    - Look for "Displaying interactive diagram" message
 * 
 * 4. Test Error Handling:
 *    - Copy TEST_INVALID
 *    - Should show error message
 *    - Error should be informative
 * 
 * 5. Test Wrapper Stripping:
 *    - Copy TEST_WITH_WRAPPER
 *    - Should strip ```mermaid wrapper and render
 * 
 * 6. Test Theme Support:
 *    - Copy TEST_THEME_SUPPORT
 *    - Render in light mode
 *    - Switch to dark mode
 *    - Colors should update
 */

// Validation Tests
import { validateMermaidSyntax, generateMermaidPrompt } from './mermaidPrompts';

export const runValidationTests = () => {
  console.group('🧪 Mermaid Validation Tests');
  
  // Test 1: Valid syntax
  const test1 = validateMermaidSyntax(TEST_VALID_MERMAID);
  console.log('Test 1 - Valid Syntax:', test1.valid ? '✅ PASS' : '❌ FAIL');
  if (!test1.valid) console.error('Errors:', test1.errors);
  
  // Test 2: Should detect errors
  const test2 = validateMermaidSyntax(TEST_FIXABLE_ERRORS);
  console.log('Test 2 - Detects Errors:', !test2.valid ? '✅ PASS' : '❌ FAIL');
  console.log('Found errors:', test2.errors);
  
  // Test 3: Prompt generation
  const prompt = generateMermaidPrompt('Photosynthesis', 'process', 6);
  console.log('Test 3 - Prompt Generation:', prompt.length > 100 ? '✅ PASS' : '❌ FAIL');
  
  console.groupEnd();
};

// Export for use in components
export const MERMAID_TESTS = {
  valid: TEST_VALID_MERMAID,
  fixable: TEST_FIXABLE_ERRORS,
  complex: TEST_COMPLEX_FALLBACK,
  invalid: TEST_INVALID,
  wrapped: TEST_WITH_WRAPPER,
  theme: TEST_THEME_SUPPORT
};
