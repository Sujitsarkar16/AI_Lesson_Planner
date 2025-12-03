import React, { useState, useEffect } from 'react';
import { GoogleGenAI, Type } from "@google/genai";
import GeneratorLayout from '../GeneratorLayout';
import { LessonPlan } from '../../types';
import ReactFlowRenderer from '../ReactFlowRenderer';
import { getSettings } from '../../settings';

interface Props {
  onBack: () => void;
}

const ConceptMapGenerator: React.FC<Props> = ({ onBack }) => {
  const [topic, setTopic] = useState('');
  const [nodeCount, setNodeCount] = useState('10');

  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [flowData, setFlowData] = useState<{ nodes: any[], edges: any[] } | null>(null);

  useEffect(() => {
    if (generatedContent) {
      try {
        const parsedData = JSON.parse(generatedContent);
        if (parsedData.nodes && parsedData.edges) {
          setFlowData(parsedData);
          setError(null);
        } else {
          setError("Generated JSON is missing 'nodes' or 'edges' keys.");
          setFlowData(null);
        }
      } catch (e) {
        setError("Failed to parse generated JSON content.");
        setFlowData(null);
      }
    } else {
      setFlowData(null);
    }
  }, [generatedContent]);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setGeneratedContent('');
    setIsSaved(false);
    setError(null);
    setFlowData(null);

    try {
      if (!process.env.API_KEY) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

      const prompt = `
        Generate a concept map for the topic: "${topic}".
        The output must be a single, valid JSON object adhering strictly to the provided schema for the React Flow library.

        **JSON Structure Rules (MUST be followed):**
        1. The root object MUST have two keys: "nodes" and "edges". Both are required.
        2. The "nodes" value must be an array of node objects.
        3. Each node object MUST have:
            - "id": A unique string.
            - "position": An object with "x" and "y" number values.
            - "data": An object with a "label" string value.
        4. The "edges" value must be an array of edge objects.
        5. Each edge object MUST have:
            - "id": A unique string.
            - "source": The "id" of the source node.
            - "target": The "id" of the target node.
        6. Arrange node positions logically. Do not overlap nodes.
        7. Generate approximately ${nodeCount} nodes.

        **Output Format Rules:**
        - The response MUST be ONLY the JSON object.
        - DO NOT wrap the JSON in markdown backticks (\`\`\`) or any other text.
      `;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              nodes: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    position: {
                      type: Type.OBJECT,
                      properties: {
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                      },
                      required: ['x', 'y'],
                    },
                    data: {
                      type: Type.OBJECT,
                      properties: {
                        label: { type: Type.STRING },
                      },
                      required: ['label'],
                    },
                    type: { type: Type.STRING },
                  },
                  required: ['id', 'position', 'data'],
                },
              },
              edges: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    id: { type: Type.STRING },
                    source: { type: Type.STRING },
                    target: { type: Type.STRING },
                    animated: { type: Type.BOOLEAN },
                  },
                  required: ['id', 'source', 'target'],
                },
              },
            },
            required: ['nodes', 'edges'],
          },
        },
      });

      let jsonString = response.text.trim();
      // Clean up potential markdown code fences
      jsonString = jsonString.replace(/^```json\s*/, '').replace(/```$/, '');
      setGeneratedContent(jsonString);

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setError(`Error generating concept map: ${errorMessage}`);
      setGeneratedContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    if (!generatedContent) return;
    const settings = getSettings();
    const newPlan: LessonPlan = {
      id: Date.now().toString(),
      title: `Concept Map: ${topic}`,
      subject: settings.defaultSubject || 'General',
      grade: settings.defaultGrade || 'All Levels',
      dateCreated: new Date().toISOString().split('T')[0],
      content: generatedContent,
      type: 'concept-map',
      metadata: { topic }
    };
    const existing = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    localStorage.setItem('savedPlans', JSON.stringify([newPlan, ...existing]));
    setIsSaved(true);
  };
  
  const customPreview = (
    <>
      {error && (
        <div className="p-4 m-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-lg">
          <p className="font-bold mb-2">Preview Error</p>
          <p className="text-sm font-mono">{error}</p>
        </div>
      )}
      {flowData ? (
        <ReactFlowRenderer nodes={flowData.nodes} edges={flowData.edges} />
      ) : !isLoading && !error ? (
         <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500 min-h-[400px]">
          <div className="size-20 rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-slate-300 dark:border-slate-600 flex items-center justify-center mb-4 transform rotate-3">
             <span className="material-symbols-outlined text-4xl opacity-50">account_tree</span>
          </div>
          <p className="text-xl font-bold font-display text-slate-900 dark:text-white">Ready to visualize</p>
          <p className="text-sm max-w-xs text-center mt-2 font-medium">Enter a topic and let AI build a concept map for you.</p>
       </div>
      ) : null}
    </>
  );

  return (
    <GeneratorLayout
      title="Concept Map Generator"
      icon="account_tree"
      generatedContent={generatedContent}
      isLoading={isLoading}
      onBack={onBack}
      onSave={handleSave}
      isSaved={isSaved}
      customPreview={customPreview}
    >
      <form onSubmit={handleGenerate} className="space-y-6">
        <div className="space-y-4">
           <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">Concept Details</h3>
           <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Topic</label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" placeholder="e.g., Photosynthesis, The Cold War" required />
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Approximate Node Count ({nodeCount})</label>
            <input type="range" min="5" max="20" value={nodeCount} onChange={e => setNodeCount(e.target.value)} className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer dark:bg-slate-700" />
          </div>
        </div>
        <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 rounded-lg font-bold disabled:opacity-50 text-white bg-primary hover:bg-primary-dark">
           {isLoading ? 'Generating Map...' : 'Generate Concept Map'}
        </button>
      </form>
    </GeneratorLayout>
  );
};
export default ConceptMapGenerator;