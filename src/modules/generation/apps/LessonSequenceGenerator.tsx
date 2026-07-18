import React, { useState, useEffect } from 'react';
import GeneratorLayout from '@/modules/generation/GeneratorLayout';
import { useAuth } from '@/modules/auth/AuthContext';
import { getSettings } from '@/modules/user/settings';
import { CurriculumService, LessonSequence, CurriculumBoard } from '@/modules/curriculum/curriculumService';
import { DocumentService } from '@/modules/documents/documentService';
import { UserProfileService } from '@/modules/user/userProfileService';
import { generateLessonPlanStream } from '@/modules/generation/geminiService';
import { LessonPlan } from '@/shared/types/document';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  onBack: () => void;
}

const LessonSequenceGenerator: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
  const [userMaps, setUserMaps] = useState<LessonPlan[]>([]);
  const [selectedMapId, setSelectedMapId] = useState('');
  const [mapData, setMapData] = useState<{ nodes: any[], edges: any[] } | null>(null);

  // Sequence settings
  const [sequenceName, setSequenceName] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [board, setBoard] = useState<CurriculumBoard>('CBSE');
  const [duration, setDuration] = useState('60 mins');

  // Generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generatedLessons, setGeneratedLessons] = useState<Array<{ topic: string, content: string }>>([]);
  const [currentLessonIndex, setCurrentLessonIndex] = useState(-1);
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    loadUserMaps();
    const settings = getSettings();
    if (settings.defaultGrade) setGrade(settings.defaultGrade);
    if (settings.defaultSubject) setSubject(settings.defaultSubject);
  }, []);

  useEffect(() => {
    if (selectedMapId) {
      loadMapData(selectedMapId);
    }
  }, [selectedMapId]);

  const loadUserMaps = async () => {
    if (!user) return;

    try {
      const userProfile = await UserProfileService.getUserByAuth0Id(user.sub);
      if (!userProfile) return;

      const documents = await DocumentService.getDocuments(userProfile.id);
      const conceptMaps = documents.filter(doc => doc.type === 'concept-map');
      setUserMaps(conceptMaps);
    } catch (error) {
      console.error('Error loading user maps:', error);
    }
  };

  const loadMapData = async (mapId: string) => {
    const selectedMap = userMaps.find(m => m.metadata?.mapId === mapId);
    if (!selectedMap) return;

    try {
      const data = await CurriculumService.loadConceptMap(mapId);
      if (data) {
        setMapData(data);
        setSequenceName(`${selectedMap.metadata?.topic || 'Untitled'} Learning Sequence`);
      }
    } catch (error) {
      console.error('Error loading map data:', error);
    }
  };

  const generateLessonSequence = async () => {
    if (!mapData || mapData.nodes.length === 0) {
      alert('Please select a concept map first.');
      return;
    }

    setIsGenerating(true);
    setGenerationStatus('queued');
    setGeneratedLessons([]);
    setCurrentLessonIndex(-1);

    try {
      // Topological sort to determine lesson order based on prerequisites
      const lessonOrder = topologicalSort(mapData.nodes, mapData.edges);

      // Generate lessons for each node in order
      for (let i = 0; i < lessonOrder.length; i++) {
        const node = lessonOrder[i];
        setCurrentLessonIndex(i);

        let lessonContent = '';
        const stream = generateLessonPlanStream({
          grade,
          subject,
          topic: node.data.label,
          title: `Lesson ${i + 1}: ${node.data.label}`,
          duration,
          curriculumBoard: board,
          learningObjectives: `Students will understand ${node.data.label} and its relationships in ${subject}.`,
          onStatus: setGenerationStatus
        });

        for await (const chunk of stream) {
          lessonContent += chunk;
        }

        setGeneratedLessons(prev => [...prev, { topic: node.data.label, content: lessonContent }]);
      }
    } catch (error) {
      console.error('Error generating lesson sequence:', error);
      alert('Error generating lesson sequence. Please try again.');
    } finally {
      setIsGenerating(false);
      setCurrentLessonIndex(-1);
    }
  };

  // Simple topological sort for dependency ordering
  const topologicalSort = (nodes: any[], edges: any[]): any[] => {
    const adjList = new Map<string, string[]>();
    const inDegree = new Map<string, number>();

    // Initialize
    nodes.forEach(node => {
      adjList.set(node.id, []);
      inDegree.set(node.id, 0);
    });

    // Build adjacency list and in-degree map
    edges.forEach(edge => {
      adjList.get(edge.source)?.push(edge.target);
      inDegree.set(edge.target, (inDegree.get(edge.target) || 0) + 1);
    });

    // Find nodes with no prerequisites
    const queue: any[] = [];
    nodes.forEach(node => {
      if (inDegree.get(node.id) === 0) {
        queue.push(node);
      }
    });

    const sorted: any[] = [];
    while (queue.length > 0) {
      const node = queue.shift()!;
      sorted.push(node);

      const neighbors = adjList.get(node.id) || [];
      neighbors.forEach(neighborId => {
        const newDegree = (inDegree.get(neighborId) || 1) - 1;
        inDegree.set(neighborId, newDegree);
        if (newDegree === 0) {
          const neighborNode = nodes.find(n => n.id === neighborId);
          if (neighborNode) queue.push(neighborNode);
        }
      });
    }

    // If not all nodes are sorted, there's a cycle - return nodes as-is
    return sorted.length === nodes.length ? sorted : nodes;
  };

  const handleSave = async () => {
    if (!user || generatedLessons.length === 0) return;

    try {
      const userProfile = await UserProfileService.getUserByAuth0Id(user.sub);
      if (!userProfile) return;

      // Save each lesson as a document
      const savedDocumentIds: string[] = [];
      for (let i = 0; i < generatedLessons.length; i++) {
        const lesson = generatedLessons[i];
        const lessonDoc: Omit<LessonPlan, 'id' | 'dateCreated'> = {
          title: `${sequenceName} - Lesson ${i + 1}: ${lesson.topic}`,
          subject,
          grade,
          content: lesson.content,
          duration,
          type: 'lesson-plan',
          metadata: {
            board,
            sequenceName,
            lessonNumber: i + 1,
            totalLessons: generatedLessons.length,
            fromConceptMap: selectedMapId
          }
        };

        const saved = await DocumentService.createDocument(userProfile.id, lessonDoc);
        if (saved) {
          savedDocumentIds.push(saved.id);
        }
      }

      // Create lesson sequence record
      if (savedDocumentIds.length > 0) {
        await CurriculumService.createLessonSequence({
          user_id: userProfile.id,
          map_id: selectedMapId,
          sequence_name: sequenceName,
          subject,
          grade,
          board,
          lesson_order: savedDocumentIds,
          metadata: {
            totalLessons: savedDocumentIds.length,
            createdAt: new Date().toISOString()
          }
        });

        setIsSaved(true);
        alert(`Successfully saved ${savedDocumentIds.length} lessons!`);
      }
    } catch (error) {
      console.error('Error saving lesson sequence:', error);
      alert('Error saving lesson sequence. Please try again.');
    }
  };

  const previewContent = generatedLessons.length > 0 ? (
    <div className="space-y-6 p-6 max-h-full overflow-y-auto">
      <div className="bg-primary/10 border-2 border-primary rounded-lg p-4 mb-6">
        <h3 className="text-lg font-bold text-primary mb-2">{sequenceName}</h3>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          {generatedLessons.length} lessons generated • {subject} • Grade {grade}
        </p>
      </div>

      {generatedLessons.map((lesson, index) => (
        <div key={index} className="bg-white dark:bg-slate-800 rounded-lg border-2 border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="bg-slate-100 dark:bg-slate-900 px-4 py-3 border-b border-slate-200 dark:border-slate-700">
            <h4 className="font-bold text-slate-900 dark:text-white">
              Lesson {index + 1}: {lesson.topic}
            </h4>
          </div>
          <div className="p-4 prose dark:prose-invert max-w-none text-sm">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{`${lesson.content.substring(0, 300)}...`}</ReactMarkdown>
            <button className="text-primary hover:underline text-xs mt-2">View Full Lesson</button>
          </div>
        </div>
      ))}
    </div>
  ) : isGenerating ? (
    <div className="flex flex-col items-center justify-center h-full p-12">
      <span className="material-symbols-outlined animate-spin text-6xl text-primary mb-4">progress_activity</span>
      <p className="text-xl font-bold text-slate-900 dark:text-white mb-2">Generating Lesson Sequence...</p>
      {currentLessonIndex >= 0 && mapData && (
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Creating Lesson {currentLessonIndex + 1} of {mapData.nodes.length}
        </p>
      )}
    </div>
  ) : (
    <div className="flex flex-col items-center justify-center h-full p-12 text-center">
      <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-700 mb-4">auto_stories</span>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Ready to Generate</h3>
      <p className="text-slate-600 dark:text-slate-400 max-w-md">
        Select a concept map and configure your sequence settings, then generate a complete series of lessons.
      </p>
    </div>
  );

  return (
    <GeneratorLayout
      title="Lesson Sequence Generator"
      icon="format_list_numbered"
      generatedContent={''}
      isLoading={isGenerating}
      jobStatus={generationStatus}
      onBack={onBack}
      onSave={handleSave}
      isSaved={isSaved}
      customPreview={previewContent}
    >
      <div className="space-y-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-300 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <span className="material-symbols-outlined text-blue-600 dark:text-blue-400 text-2xl">info</span>
            <div>
              <p className="font-bold text-blue-900 dark:text-blue-100 mb-1">Concept-Driven Planning</p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Select a saved concept map to automatically generate a sequence of lessons based on prerequisite relationships.
              </p>
            </div>
          </div>
        </div>

        {/* Map Selection */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">
            Select Concept Map
          </h3>
          {userMaps.length > 0 ? (
            <select
              value={selectedMapId}
              onChange={e => setSelectedMapId(e.target.value)}
              className="w-full form-select rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              required
            >
              <option value="">-- Choose a concept map --</option>
              {userMaps.map(map => (
                <option key={map.id} value={map.metadata?.mapId || ''}>
                  {map.title} ({map.metadata?.nodeCount || 0} concepts)
                </option>
              ))}
            </select>
          ) : (
            <div className="text-center p-6 bg-slate-100 dark:bg-slate-800 rounded-lg">
              <p className="text-slate-600 dark:text-slate-400">No concept maps found. Create one first!</p>
            </div>
          )}

          {mapData && (
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-300 dark:border-green-700 rounded-lg p-3">
              <p className="text-sm text-green-700 dark:text-green-300">
                ✓ Map loaded: {mapData.nodes.length} concepts, {mapData.edges.length} connections
              </p>
            </div>
          )}
        </div>

        {/* Sequence Settings */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">
            Sequence Settings
          </h3>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Sequence Name</label>
            <input
              type="text"
              value={sequenceName}
              onChange={e => setSequenceName(e.target.value)}
              className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              placeholder="e.g., Introduction to Ecosystems"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Subject</label>
              <input
                type="text"
                value={subject}
                onChange={e => setSubject(e.target.value)}
                className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                required
              />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Grade</label>
              <input
                type="text"
                value={grade}
                onChange={e => setGrade(e.target.value)}
                className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Curriculum Board</label>
              <select
                value={board}
                onChange={e => setBoard(e.target.value as CurriculumBoard)}
                className="form-select rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              >
                <option value="CBSE">CBSE</option>
                <option value="ICSE">ICSE</option>
                <option value="State Board">State Board</option>
                <option value="IB">IB</option>
                <option value="Cambridge">Cambridge</option>
                <option value="Common Core">Common Core</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Duration per Lesson</label>
              <input
                type="text"
                value={duration}
                onChange={e => setDuration(e.target.value)}
                className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"
              />
            </div>
          </div>
        </div>

        <button
          onClick={generateLessonSequence}
          disabled={isGenerating || !selectedMapId || !mapData}
          className="w-full btn-primary py-3 rounded-lg font-bold disabled:opacity-50 text-white bg-primary hover:bg-primary-dark flex items-center justify-center gap-2"
        >
          {isGenerating ? (
            <>
              <span className="material-symbols-outlined animate-spin">progress_activity</span>
              Generating Sequence...
            </>
          ) : (
            <>
              <span className="material-symbols-outlined">auto_awesome</span>
              Generate Lesson Sequence
            </>
          )}
        </button>
      </div>
    </GeneratorLayout>
  );
};

export default LessonSequenceGenerator;
