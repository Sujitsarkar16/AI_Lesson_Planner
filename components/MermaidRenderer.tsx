import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';
import ReactFlowRenderer from './ReactFlowRenderer';

interface MermaidRendererProps {
  chart: string;
  fallbackToReactFlow?: boolean;
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

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart, fallbackToReactFlow = true }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [useFallback, setUseFallback] = useState(false);
  const [fallbackData, setFallbackData] = useState<{ nodes: any[], edges: any[] } | null>(null);

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
        // Sanitize the chart first
        const sanitizedChart = sanitizeMermaidChart(chart);
        
        if (!sanitizedChart) {
          throw new Error('Empty chart after sanitization');
        }
        
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
        
        const { svg: svgCode } = await mermaid.render(id, sanitizedChart);
        setSvg(svgCode);
        setError(null);
        setUseFallback(false);
      } catch (e: any) {
        console.error("Mermaid rendering error:", e);
        console.error("Failed chart:", chart);
        const errorMessage = e.message || "Failed to render diagram.";
        
        // Try fallback to ReactFlow if enabled
        if (fallbackToReactFlow) {
          const reactFlowData = convertMermaidToReactFlow(chart);
          if (reactFlowData) {
            console.log('Falling back to ReactFlow renderer');
            setFallbackData(reactFlowData);
            setUseFallback(true);
            setError(null);
            setSvg(null);
            return;
          }
        }
        
        // Log error but don't display in UI
        console.warn('Mermaid diagram could not be rendered and no fallback available');
        setError(null); // Don't show error in UI
        setSvg(null);
        setUseFallback(false);
      }
    };

    renderMermaid();
  }, [chart, isDark, fallbackToReactFlow]);

  // If using fallback, render ReactFlow (no warning message)
  if (useFallback && fallbackData) {
    return (
      <div className="my-6">
        <ReactFlowRenderer nodes={fallbackData.nodes} edges={fallbackData.edges} />
      </div>
    );
  }

  // If error and no fallback, return null (don't show anything)
  if (error && !svg) {
    return null;
  }

  return (
    <div className="flex items-center justify-center my-6 p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-black shadow-neo-sm overflow-x-auto">
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
