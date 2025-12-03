import React, { useEffect, useRef, useState } from 'react';
import mermaid from 'mermaid';

interface MermaidRendererProps {
  chart: string;
}

const MermaidRenderer: React.FC<MermaidRendererProps> = ({ chart }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

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
        const id = `mermaid-svg-${Math.random().toString(36).substring(2, 9)}`;
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? 'dark' : 'default',
          securityLevel: 'loose',
          fontFamily: 'Lexend, sans-serif'
        });
        
        const { svg: svgCode } = await mermaid.render(id, chart);
        setSvg(svgCode);
        setError(null);
      } catch (e: any) {
        console.error("Mermaid rendering error:", e);
        setError(e.message || "Failed to render diagram.");
        setSvg(null);
      }
    };

    renderMermaid();
  }, [chart, isDark]);

  return (
    <div className="flex items-center justify-center my-6 p-4 bg-white dark:bg-slate-800 rounded-lg border-2 border-black shadow-neo-sm overflow-x-auto">
      {error && (
        <div className="text-red-500 font-mono text-sm p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
          <p className="font-bold mb-2">Mermaid Diagram Error:</p>
          <pre>{error}</pre>
          <p className="mt-4 font-bold">Original Code:</p>
          <pre>{chart}</pre>
        </div>
      )}
      {svg && (
        <div
          ref={containerRef}
          className="mermaid-container"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      )}
    </div>
  );
};

export default MermaidRenderer;
