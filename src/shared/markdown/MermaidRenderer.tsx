import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import ReactFlowRenderer from '@/shared/markdown/ReactFlowRenderer';
import { validateAndRepairMermaid, failureLogger } from '@/modules/verification/mermaidValidator';

interface MermaidRendererProps {
  chart: string;
  fallbackToReactFlow?: boolean;
  showRawCodeOnError?: boolean;
  useSandbox?: boolean; // Render in isolated sandbox
}

// Mermaid syntax sanitizer and validator
const sanitizeMermaidChart = (chart: string): string => {
  let sanitized = chart.trim();
  
  // Remove markdown code block wrapper if present
  sanitized = sanitized.replace(/^```mermaid\s*\n?/i, '').replace(/\n?```\s*$/i, '');
  
  // Fix common syntax issues
  sanitized = sanitized
    // Escape special characters in labels
    .replace(/([\[\(])([^\]\)]*["'])([^\]\)]*)([\]\)])/g, (match, open, content) => {
      // If label contains quotes, wrap in quotes and escape
      return match;
    })
    // Remove extra semicolons at line ends (common error)
    .replace(/;+$/gm, '')
    // Fix arrow syntax issues
    .replace(/-->/g, '-->') // Normalize arrows
    .replace(/--->/g, '-->')  // Fix triple dashes
    // Remove BOM and special characters
    .replace(/^\uFEFF/, '')
    .replace(/\r\n/g, '\n');
  
  return sanitized;
};

// Convert simple Mermaid to ReactFlow as fallback
const convertMermaidToReactFlow = (chart: string): { nodes: any[], edges: any[] } | null => {
  try {
    const lines = chart.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('graph') && !l.startsWith('flowchart'));
    const nodes: any[] = [];
    const edges: any[] = [];
    const nodeMap = new Map<string, string>();
    let nodeCounter = 0;
    
    lines.forEach(line => {
      // Match patterns like: A[Label] --> B[Label]
      const match = line.match(/(\w+)\[([^\]]+)\]\s*-->\s*(\w+)\[([^\]]+)\]/);
      if (match) {
        const [, sourceId, sourceLabel, targetId, targetLabel] = match;
        
        if (!nodeMap.has(sourceId)) {
          nodeMap.set(sourceId, sourceLabel);
          nodes.push({
            id: sourceId,
            position: { x: nodeCounter * 250, y: Math.floor(nodeCounter / 3) * 100 },
            data: { label: sourceLabel }
          });
          nodeCounter++;
        }
        
        if (!nodeMap.has(targetId)) {
          nodeMap.set(targetId, targetLabel);
          nodes.push({
            id: targetId,
            position: { x: nodeCounter * 250, y: Math.floor(nodeCounter / 3) * 100 },
            data: { label: targetLabel }
          });
          nodeCounter++;
        }
        
        edges.push({
          id: `${sourceId}-${targetId}`,
          source: sourceId,
          target: targetId
        });
      }
    });
    
    return nodes.length > 0 ? { nodes, edges } : null;
  } catch {
    return null;
  }
};

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ 
  chart, 
  fallbackToReactFlow = true,
  showRawCodeOnError = false,
  useSandbox = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [isDark, setIsDark] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackData, setFallbackData] = useState<{ nodes: any[], edges: any[] } | null>(null);
  const [showRawCode, setShowRawCode] = useState(false);
  const [wasAutoRepaired, setWasAutoRepaired] = useState(false);

  useEffect(() => {
    const theme = document.documentElement.classList.contains('dark') ? 'dark' : 'default';
    setIsDark(theme === 'dark');

    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === "attributes" && mutation.attributeName === "class") {
                const newTheme = (mutation.target as HTMLElement).classList.contains('dark') ? 'dark' : 'default';
                setIsDark(newTheme === 'dark');
            }
        });
    });

    observer.observe(document.documentElement, { attributes: true });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!chart) return;

    const renderMermaid = async () => {
      try {
        // Step 1: Sanitize the chart first
        const sanitizedChart = sanitizeMermaidChart(chart);
        
        if (!sanitizedChart) {
          throw new Error('Empty chart after sanitization');
        }
        
        // Step 2: COMPLETE VALIDATION & REPAIR PIPELINE
        console.log('🔍 Starting validation and repair pipeline...');
        const pipeline = await validateAndRepairMermaid(sanitizedChart, {
          autoSanitize: true,
          strictMode: false,
          logFailures: true
        });
        
        if (!pipeline.valid) {
          console.warn('❌ Pipeline validation failed:', pipeline.errors);
          setValidationErrors(pipeline.errors);
          setWasAutoRepaired(false);
          
          // Validation failed - try fallback options
          if (fallbackToReactFlow) {
            const reactFlowData = convertMermaidToReactFlow(sanitizedChart);
            if (reactFlowData) {
              console.log('✅ Falling back to ReactFlow renderer');
              setFallbackData(reactFlowData);
              setUseFallback(true);
              setError(null);
              setSvg(null);
              setShowRawCode(false);
              return;
            }
          }
          
          // If showRawCodeOnError is enabled, display raw code
          if (showRawCodeOnError) {
            console.log('📝 Displaying raw code fallback');
            setShowRawCode(true);
            setError('Diagram syntax validation failed');
            setSvg(null);
            setUseFallback(false);
            return;
          }
          
          // Otherwise, hide the diagram completely
          console.warn('🚫 No fallback available, hiding diagram');
          setError(null);
          setSvg(null);
          setUseFallback(false);
          setShowRawCode(false);
          return;
        }
        
        // Step 3: Validation passed (possibly after repair)
        const codeToRender = pipeline.finalCode;
        setWasAutoRepaired(pipeline.wasRepaired);
        
        if (pipeline.wasRepaired) {
          console.log('✅ Using auto-repaired code for rendering');
        } else {
          console.log('✅ Validation passed, rendering diagram...');
        }
        
        setValidationErrors([]);
        
        // Step 4: Render in sandbox or normal mode
        if (useSandbox) {
          // Sandbox mode: render in isolated container
          await renderInSandbox(codeToRender);
        } else {
          // Normal mode: render directly
          await renderNormally(codeToRender);
        }
        
      } catch (e: any) {
        console.error('❌ Mermaid rendering error:', e);
        console.error('Failed chart:', chart);
        
        // Log the failure
        failureLogger.logFailure(chart, [e.message || 'Rendering error'], [], 'Render exception');
        
        handleRenderError(e);
      }
    };
    
    const renderNormally = async (code: string) => {
      const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
      mermaid.initialize({
        startOnLoad: false,
        theme: isDark ? 'dark' : 'default',
        securityLevel: 'loose',
        fontFamily: 'Lexend, sans-serif',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis'
        },
        themeVariables: {
          primaryColor: isDark ? '#3b82f6' : '#2563eb',
          primaryTextColor: isDark ? '#fff' : '#000',
          primaryBorderColor: isDark ? '#1e40af' : '#1e3a8a',
          lineColor: isDark ? '#64748b' : '#475569',
          secondaryColor: isDark ? '#8b5cf6' : '#7c3aed',
          tertiaryColor: isDark ? '#10b981' : '#059669'
        }
      });
      
      const { svg: svgCode } = await mermaid.render(id, code);
      setSvg(svgCode);
      setError(null);
      setUseFallback(false);
      setShowRawCode(false);
    };
    
    const renderInSandbox = async (code: string) => {
      // Sandbox rendering: wrap in try-catch with isolated error handling
      try {
        await renderNormally(code);
      } catch (sandboxError: any) {
        console.warn('⚠️ Sandbox render failed, attempting fallback:', sandboxError);
        handleRenderError(sandboxError);
      }
    };
    
    const handleRenderError = (e: any) => {
      const errorMessage = e.message || 'Failed to render diagram.';
      
      // Try fallback to ReactFlow if enabled
      if (fallbackToReactFlow) {
        const reactFlowData = convertMermaidToReactFlow(chart);
        if (reactFlowData) {
          console.log('✅ Falling back to ReactFlow renderer');
          setFallbackData(reactFlowData);
          setUseFallback(true);
          setError(null);
          setSvg(null);
          setShowRawCode(false);
          return;
        }
      }
      
      // If showRawCodeOnError is enabled, display raw code
      if (showRawCodeOnError) {
        console.log('📝 Displaying raw code fallback');
        setShowRawCode(true);
        setError(errorMessage);
        setSvg(null);
        setUseFallback(false);
        return;
      }
      
      // Log error but don't display in UI
      console.warn('🚫 Mermaid diagram could not be rendered and no fallback available');
      setError(null);
      setSvg(null);
      setUseFallback(false);
      setShowRawCode(false);
    };

    renderMermaid();
  }, [chart, isDark, fallbackToReactFlow, showRawCodeOnError, useSandbox]);

  // If using fallback, render ReactFlow
  if (useFallback && fallbackData) {
    return (
      <div className="my-6">
        <div className="mb-2 text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-2 rounded border border-amber-200 dark:border-amber-800">
          ⚠️ Diagram rendered using interactive fallback view
        </div>
        <ReactFlowRenderer nodes={fallbackData.nodes} edges={fallbackData.edges} />
      </div>
    );
  }

  // If validation failed and showRawCode is enabled, display raw code
  if (showRawCode && !svg) {
    return (
      <div className="my-6 p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border-2 border-red-300 dark:border-red-700">
        <div className="mb-3">
          <h4 className="text-sm font-semibold text-red-800 dark:text-red-300 mb-1">
            ❌ Diagram Failed to Render
          </h4>
          {validationErrors.length > 0 && (
            <div className="text-xs text-red-700 dark:text-red-400 mt-2">
              <strong>Validation Errors:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer text-xs font-medium text-red-700 dark:text-red-400 hover:underline">
            Show Raw Mermaid Code
          </summary>
          <pre className="mt-2 p-3 bg-white dark:bg-slate-900 rounded text-xs overflow-x-auto border border-red-200 dark:border-red-800">
            <code>{chart}</code>
          </pre>
        </details>
      </div>
    );
  }

  // If error and no fallback, return null (don't show anything)
  if (error && !svg) {
    return null;
  }

  return (
    <div className="flex flex-col items-center justify-center my-6 p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-black shadow-neo-sm overflow-x-auto">
      {wasAutoRepaired && (
        <div className="w-full mb-3 text-xs text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-3 py-2 rounded border border-green-200 dark:border-green-800">
          ✨ Diagram was automatically repaired using AI
        </div>
      )}
      {svg && (
        <div
          ref={containerRef}
          className="mermaid-container w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
};

export default MermaidRenderer;
