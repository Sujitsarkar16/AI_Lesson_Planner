


import React, { useState, useEffect } from 'react';
import GeneratorLayout from '@/modules/generation/GeneratorLayout';
import { LessonPlan } from '@/shared/types/document';
import TemplateBanner from '@/modules/templates/TemplateBanner';
import DynamicPreview from '@/modules/generation/DynamicPreview';
import { getSettings } from '@/modules/user/settings';
import { useStreamingVerification } from '@/modules/verification/useVerification';
import { useAuth } from '@/modules/auth/AuthContext';
import { useSelectedTemplate } from '@/modules/templates/useSelectedTemplate';
import { savePlanToLocalStorage } from '@/modules/documents/savedPlansStorage';
import { DocumentService } from '@/modules/documents/documentService';
import { UserProfileService } from '@/modules/user/userProfileService';
import VerificationBadge from '@/modules/verification/VerificationBadge';
import { generateStudyNotesStream } from '@/modules/generation/geminiService';

interface Props {
  onBack: () => void;
}

const StudyNotesGenerator: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
  // Settings & Defaults
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [board, setBoard] = useState('CBSE');
  const [notesType, setNotesType] = useState('Chapter');
  const [title, setTitle] = useState('');
  const [scope, setScope] = useState('Entire Chapter');
  const [depth, setDepth] = useState('Standard');
  const [style, setStyle] = useState('Explanatory');
  const [audience, setAudience] = useState('Students');
  const [tone, setTone] = useState('Exam-focused');

  // Multi-select Includes
  const [includes, setIncludes] = useState<string[]>(['KeyPoints', 'Formulas']);
  const handleIncludeToggle = (value: string) => {
    setIncludes(prev => prev.includes(value) ? prev.filter(i => i !== value) : [...prev, value]);
  };

  const [keyConcepts, setKeyConcepts] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');

  const activeTemplate = useSelectedTemplate('study-notes');
  const [isLoading, setIsLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Verification Agent Integration
  const verification = useStreamingVerification({
    enabled: true,
    verifyMermaid: includes.includes('Diagrams'),
    showWarnings: true
  });

  // Load settings and template on mount
  useEffect(() => {
    // Load Settings
    const settings = getSettings();
    if (settings.defaultGrade) setGrade(settings.defaultGrade);
    if (settings.defaultSubject) setSubject(settings.defaultSubject);
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setGenerationStatus('queued');
    setGeneratedContent('');
    setIsSaved(false);
    verification.resetStream();

    try {
      // Use Gemini API for generation
      const stream = generateStudyNotesStream({
        subject,
        grade,
        board,
        notesType,
        title,
        scope,
        depth,
        style,
        audience,
        includes,
        tone,
        keyConcepts,
        customInstructions,
        templateContext: activeTemplate?.promptContext,
        onStatus: setGenerationStatus
      });

      // Process streaming with verification
      for await (const chunk of stream) {
        verification.processChunk(chunk);
        setGeneratedContent((prev) => prev + chunk);
      }

      // Finalize and verify complete content
      const verificationResult = await verification.finalizeStream();

      if (verificationResult.fixes.length > 0) {
        console.info('✅ Applied automatic fixes:', verificationResult.fixes);
        setGeneratedContent(verificationResult.correctedContent);
      }

      if (verificationResult.issues.length > 0) {
        console.warn('⚠️ Content issues detected:', verificationResult.issues);
      }

    } catch (error) {
      console.error(error);
      setGeneratedContent("Error generating notes. Please check your API key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const metadata = {
      title: title,
      subject: subject,
      grade: grade,
      topic: scope,
      board: board,
      notesType: notesType
    };

    const newPlan: LessonPlan = {
      id: Date.now().toString(),
      title: `Notes: ${title}`,
      subject,
      grade,
      dateCreated: new Date().toISOString().split('T')[0],
      content: generatedContent,
      duration: 'Self-Paced',
      type: 'study-notes',
      templateId: activeTemplate?.id,
      metadata: metadata
    };

    if (user?.sub) {
      const userProfile = await UserProfileService.getOrCreateUser(user.sub, user.email || '', user.name);
      if (userProfile && await DocumentService.createDocument(userProfile.id, newPlan)) {
        setIsSaved(true);
        return;
      }
    }

    savePlanToLocalStorage(newPlan);
    setIsSaved(true);
  };

  return (
    <GeneratorLayout
      title="Study Notes Generator"
      icon="menu_book"
      generatedContent={generatedContent}
      onContentChange={setGeneratedContent}
      isLoading={isLoading}
      jobStatus={generationStatus}
      onBack={onBack}
      onSave={handleSave}
      isSaved={isSaved}
      customPreview={
        <DynamicPreview
          templateId={activeTemplate?.id || null}
          appType="study-notes"
          generatedContent={generatedContent}
          data={{
            title: title,
            subject: subject,
            grade: grade,
            date: new Date().toISOString().split('T')[0],
            topic: scope
          }}
        />
      }
    >
      <form onSubmit={handleGenerate} className="space-y-6">
        {activeTemplate && <TemplateBanner template={activeTemplate} description="Notes will follow this style." />}

        {/* Verification Status Badge */}
        {verification.verificationState.lastVerification && (
          <div className="bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg p-3">
            <VerificationBadge
              verificationState={verification.verificationState}
              showDetails={true}
              compact={false}
            />
          </div>
        )}

        {/* Real-time Warnings */}
        {verification.warnings.length > 0 && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <div className="flex items-start gap-2 text-sm text-yellow-800 dark:text-yellow-200">
              <span className="material-symbols-outlined text-lg">info</span>
              <div>
                <p className="font-bold mb-1">Real-time Warnings:</p>
                <ul className="text-xs space-y-1">
                  {verification.warnings.slice(0, 3).map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Basic Info */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">Context</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col"><label className="label-sm">Subject</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="input-field" required /></div>
            <div className="flex flex-col"><label className="label-sm">Grade/Class</label><input type="text" value={grade} onChange={e => setGrade(e.target.value)} className="input-field" required /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col"><label className="label-sm">Board</label><input type="text" value={board} onChange={e => setBoard(e.target.value)} className="input-field" placeholder="CBSE, IGCSE, etc." /></div>
            <div className="flex flex-col"><label className="label-sm">Notes Type</label>
              <select value={notesType} onChange={e => setNotesType(e.target.value)} className="input-field">
                <option>Topic</option><option>Chapter</option><option>Unit</option><option>Revision</option><option>Exam-oriented</option>
              </select>
            </div>
          </div>
        </div>

        {/* Specifics */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">Content Details</h3>
          <div className="flex flex-col"><label className="label-sm">Title</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} className="input-field" placeholder="e.g. Thermodynamics" required /></div>
          <div className="flex flex-col"><label className="label-sm">Scope</label><input type="text" value={scope} onChange={e => setScope(e.target.value)} className="input-field" placeholder="e.g. Entire Chapter, Sections 1-3" /></div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col"><label className="label-sm">Depth</label>
              <select value={depth} onChange={e => setDepth(e.target.value)} className="input-field">
                <option>Concise</option><option>Standard</option><option>Detailed</option><option>Ultra-detailed</option>
              </select>
            </div>
            <div className="flex flex-col"><label className="label-sm">Style</label>
              <select value={style} onChange={e => setStyle(e.target.value)} className="input-field">
                <option>Explanatory</option><option>Bullet-points</option><option>NCERT-style</option><option>Flowchart</option>
              </select>
            </div>
          </div>
        </div>

        {/* Configuration */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">Configuration</h3>

          <div className="flex flex-col gap-2">
            <label className="label-sm">Include Sections</label>
            <div className="flex flex-wrap gap-2">
              {['Formulas', 'Diagrams', 'Examples', 'KeyPoints', 'Mnemonics', 'PracticeQuestions'].map(opt => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleIncludeToggle(opt)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border-2 transition-all ${includes.includes(opt) ? 'bg-brand-black text-white border-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border-transparent hover:border-slate-300'}`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col"><label className="label-sm">Key Concepts</label><textarea value={keyConcepts} onChange={e => setKeyConcepts(e.target.value)} className="input-field" rows={2} placeholder="Specific concepts to focus on..." /></div>
          <div className="flex flex-col"><label className="label-sm">Additional Instructions</label><textarea value={customInstructions} onChange={e => setCustomInstructions(e.target.value)} className="input-field" rows={2} /></div>
        </div>

        <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 rounded-lg font-bold disabled:opacity-50 text-white bg-primary hover:bg-primary-dark shadow-neo-sm hover:shadow-none translate-x-0 hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
          {isLoading ? 'Generating Notes...' : 'Generate Study Notes'}
        </button>
      </form>
      <style>{`.label-sm { @apply text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide; } .input-field { @apply w-full rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm p-2.5 focus:ring-2 focus:ring-primary focus:border-transparent transition-all; }`}</style>
    </GeneratorLayout>
  );
};
export default StudyNotesGenerator;