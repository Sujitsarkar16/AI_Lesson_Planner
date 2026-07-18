import React, { useState, useEffect } from 'react';
import GeneratorLayout from '@/modules/generation/GeneratorLayout';
import { LessonPlan } from '@/shared/types/document';
import { savePlanToLocalStorage } from '@/modules/documents/savedPlansStorage';
import ReactFlowRenderer from '@/shared/markdown/ReactFlowRenderer';
import { useAuth } from '@/modules/auth/AuthContext';
import { getSettings } from '@/modules/user/settings';
import { generateConceptMap } from '@/modules/generation/geminiService';
import { CurriculumService } from '@/modules/curriculum/curriculumService';
import { DocumentService } from '@/modules/documents/documentService';
import { UserProfileService } from '@/modules/user/userProfileService';

interface Props {
  onBack: () => void;
}

const ConceptMapGenerator: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
  const [topic, setTopic] = useState('');
  const [nodeCount, setNodeCount] = useState('10');
  const [mode, setMode] = useState<'generate' | 'edit'>('generate');
  const [mapId, setMapId] = useState<string>('');

  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [flowData, setFlowData] = useState<{ nodes: any[], edges: any[] } | null>(null);
  const [canGenerateLessons, setCanGenerateLessons] = useState(false);

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
      // Use Gemini API for generation
      const jsonData = await generateConceptMap({
        topic
      });

      setGeneratedContent(JSON.stringify(jsonData));

    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      setError(`Error generating concept map: ${errorMessage}`);
      setGeneratedContent('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!generatedContent) return;
    const settings = getSettings();

    // Generate unique map ID if not exists
    const currentMapId = mapId || `map_${Date.now()}`;
    setMapId(currentMapId);

    const newPlan: LessonPlan = {
      id: Date.now().toString(),
      title: `Concept Map: ${topic}`,
      subject: settings.defaultSubject || 'General',
      grade: settings.defaultGrade || 'All Levels',
      dateCreated: new Date().toISOString().split('T')[0],
      content: generatedContent,
      type: 'concept-map',
      metadata: {
        topic,
        mapId: currentMapId,
        nodeCount: flowData?.nodes.length || 0,
        edgeCount: flowData?.edges.length || 0
      }
    };

    try {
      // Save to database if authenticated
      if (user && flowData) {
        const userProfile = await UserProfileService.getOrCreateUser(user.sub, user.email || '', user.name);
        if (userProfile) {
          // Save document
          const savedDoc = await DocumentService.createDocument(userProfile.id, newPlan);

          if (savedDoc) {
            // Save concept map nodes and edges to database
            const nodes = flowData.nodes.map(node => ({
              user_id: userProfile.id,
              map_id: currentMapId,
              node_key: node.id,
              label: node.data.label,
              position_x: node.position.x,
              position_y: node.position.y,
              metadata: node.data
            }));

            const edges = flowData.edges.map(edge => ({
              map_id: currentMapId,
              edge_key: edge.id,
              source_node_key: edge.source,
              target_node_key: edge.target,
              relationship_type: edge.type || 'prerequisite'
            }));

            await CurriculumService.saveConceptMapNodes(nodes);
            await CurriculumService.saveConceptMapEdges(edges);

            setIsSaved(true);
            setCanGenerateLessons(true);
            return;
          }
        }
      }

      // Fallback to localStorage
      savePlanToLocalStorage(newPlan);
      setIsSaved(true);
    } catch (error) {
      console.error('Error saving concept map:', error);
      alert('Error saving concept map. Please try again.');
    }
  };

  const handleEditMode = () => {
    if (flowData) {
      setMode('edit');
    }
  };

  const handleFlowChange = (updatedNodes: any[], updatedEdges: any[]) => {
    setFlowData({ nodes: updatedNodes, edges: updatedEdges });
    setGeneratedContent(JSON.stringify({ nodes: updatedNodes, edges: updatedEdges }));
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
        <div className="relative h-full">
          <ReactFlowRenderer
            nodes={flowData.nodes}
            edges={flowData.edges}
            editable={mode === 'edit'}
            onNodesChange={mode === 'edit' ? (nodes) => handleFlowChange(nodes, flowData.edges) : undefined}
            onEdgesChange={mode === 'edit' ? (edges) => handleFlowChange(flowData.nodes, edges) : undefined}
          />
          {mode === 'generate' && (
            <div className="absolute top-4 right-4 flex gap-2">
              <button
                onClick={handleEditMode}
                className="bg-white dark:bg-slate-800 text-slate-900 dark:text-white px-4 py-2 rounded-lg shadow-lg hover:shadow-xl transition-all flex items-center gap-2 font-medium border border-slate-200 dark:border-slate-700"
              >
                <span className="material-symbols-outlined text-lg">edit</span>
                Edit Map
              </button>
            </div>
          )}
          {mode === 'edit' && (
            <div className="absolute top-4 right-4 bg-primary text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
              <span className="material-symbols-outlined text-lg">edit_note</span>
              Editing Mode - Drag nodes, add/remove connections
            </div>
          )}
        </div>
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

        {canGenerateLessons && mapId && (
          <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-300 dark:border-green-700 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <span className="material-symbols-outlined text-green-600 dark:text-green-400 text-2xl">check_circle</span>
              <div>
                <p className="font-bold text-green-900 dark:text-green-100 mb-1">Map Saved Successfully!</p>
                <p className="text-sm text-green-700 dark:text-green-300 mb-3">
                  You can now use this concept map to generate a lesson sequence.
                </p>
                <p className="text-xs text-green-600 dark:text-green-400">Map ID: {mapId}</p>
              </div>
            </div>
          </div>
        )}

        <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 rounded-lg font-bold disabled:opacity-50 text-white bg-primary hover:bg-primary-dark">
          {isLoading ? 'Generating Map...' : 'Generate Concept Map'}
        </button>
      </form>
    </GeneratorLayout>
  );
};
export default ConceptMapGenerator;