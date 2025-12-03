
import React from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import MermaidRenderer from './MermaidRenderer';

interface LessonPlanRendererProps {
  content: string;
}

const LessonPlanRenderer: React.FC<LessonPlanRendererProps> = ({ content }) => {
  const components: Components = {
    // --- Tables ---
    // Wrap tables in a responsive container to handle overflow on small screens
    table: ({ node, ...props }) => (
      <div className="my-8 w-full overflow-hidden rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900" {...props} />
        </div>
      </div>
    ),
    thead: ({ node, ...props }) => (
      <thead className="bg-gray-50 dark:bg-gray-800" {...props} />
    ),
    tbody: ({ node, ...props }) => (
      <tbody className="divide-y divide-gray-200 dark:divide-gray-700" {...props} />
    ),
    tr: ({ node, ...props }) => (
      <tr className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors duration-150" {...props} />
    ),
    th: ({ node, ...props }) => (
      <th 
        className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-300 uppercase tracking-wider bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700" 
        {...props} 
      />
    ),
    td: ({ node, ...props }) => (
      <td 
        className="px-6 py-4 text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed align-top" 
        {...props} 
      />
    ),

    // --- Lists ---
    ul: ({ node, ...props }) => (
      <ul className="list-disc pl-6 space-y-2 my-6 text-gray-700 dark:text-gray-300" {...props} />
    ),
    ol: ({ node, ...props }) => (
      <ol className="list-decimal pl-6 space-y-2 my-6 text-gray-700 dark:text-gray-300" {...props} />
    ),
    li: ({ node, ...props }) => (
      <li className="leading-7 pl-1" {...props} />
    ),

    // --- Headings ---
    h1: ({ node, ...props }) => (
      <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 dark:text-white mt-10 mb-6 border-b pb-4 border-gray-200 dark:border-gray-700" {...props} />
    ),
    h2: ({ node, ...props }) => (
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mt-10 mb-4 flex items-center gap-2" {...props} />
    ),
    h3: ({ node, ...props }) => (
      <h3 className="text-xl font-bold text-gray-800 dark:text-white mt-8 mb-3" {...props} />
    ),
    h4: ({ node, ...props }) => (
      <h4 className="text-lg font-semibold text-gray-800 dark:text-white mt-6 mb-2" {...props} />
    ),

    // --- Code Blocks ---
    code: ({ node, inline, className, children, ...props }: any) => {
      const match = /language-(\w+)/.exec(className || '');
      
      // Check for mermaid language
      if (match && match[1] === 'mermaid' && !inline) {
        return <MermaidRenderer chart={String(children).replace(/\n$/, '')} />;
      }
      
      return !inline ? (
        <div className="relative group my-6 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm bg-[#0d1117]">
          <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
             <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
               {match ? match[1] : 'code'}
             </span>
             <div className="flex gap-1.5">
               <div className="w-2.5 h-2.5 rounded-full bg-red-400/80"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-yellow-400/80"></div>
               <div className="w-2.5 h-2.5 rounded-full bg-green-400/80"></div>
             </div>
          </div>
          <pre className="p-4 overflow-x-auto text-sm leading-relaxed text-gray-100 font-mono">
            <code className={className} {...props}>
              {children}
            </code>
          </pre>
        </div>
      ) : (
        <code 
          className="bg-gray-100 dark:bg-gray-800 text-primary dark:text-primary-light px-1.5 py-0.5 rounded font-mono text-sm border border-gray-200 dark:border-gray-700/50" 
          {...props}
        >
          {children}
        </code>
      );
    },

    // --- Other Elements ---
    p: ({ node, ...props }) => (
      <p className="my-4 text-base leading-7 text-gray-700 dark:text-gray-300" {...props} />
    ),
    blockquote: ({ node, ...props }) => (
      <blockquote className="border-l-4 border-primary bg-primary/5 dark:bg-primary/10 px-6 py-4 my-8 rounded-r-lg italic text-gray-700 dark:text-gray-300" {...props} />
    ),
    a: ({ node, ...props }) => (
      <a className="text-primary hover:text-primary-dark hover:underline underline-offset-2 font-medium transition-colors" {...props} />
    ),
    hr: ({ node, ...props }) => (
      <hr className="my-10 border-gray-200 dark:border-gray-800" {...props} />
    ),
    img: ({ node, ...props }) => (
      // eslint-disable-next-line jsx-a11y/alt-text
      <img className="rounded-xl shadow-md mx-auto my-8 border border-gray-200 dark:border-gray-700" {...props} />
    ),
  };

  return (
    <div className="w-full max-w-none pb-12">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]} 
        rehypePlugins={[rehypeHighlight, rehypeRaw]}
        components={components}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
};

export default LessonPlanRenderer;