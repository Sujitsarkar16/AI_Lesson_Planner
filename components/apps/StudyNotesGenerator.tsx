


import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import GeneratorLayout from '../GeneratorLayout';
import { LessonPlan } from '../../types';
import { TEMPLATES } from '../../data/templates';
import DynamicPreview from '../DynamicPreview';
import { getSettings } from '../../settings';

interface Props {
  onBack: () => void;
}

const StudyNotesGenerator: React.FC<Props> = ({ onBack }) => {
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

  const [activeTemplate, setActiveTemplate] = useState<{id: string, title: string, context: string} | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load Settings
    const settings = getSettings();
    if(settings.defaultGrade) setGrade(settings.defaultGrade);
    if(settings.defaultSubject) setSubject(settings.defaultSubject);

    // Load Template
    const templateId = localStorage.getItem('selected_template_study-notes');
    if (templateId) {
      const t = TEMPLATES.find(tp => tp.id === templateId);
      if (t) {
        setActiveTemplate({ id: t.id, title: t.title, context: t.promptContext });
      }
    }
  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setGeneratedContent('');
    setIsSaved(false);

    try {
      if (!process.env.API_KEY) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const prompt = `
GENERATE NOTES REQUEST
----------------------
Subject: ${subject}
Class/Grade: ${grade}
Board/Curriculum: ${board}
Notes Type: ${notesType}
Title: ${title}
Scope: ${scope}
Depth: ${depth}
Style: ${style}
Audience: ${audience}
Include: ${includes.join(', ')}
Tone: ${tone}
Key Concepts to Emphasize: ${keyConcepts}
Additional Instructions: ${customInstructions}
Template Context: ${activeTemplate ? activeTemplate.context : 'Standard structure.'}

OUTPUT REQUIREMENTS (strict)
----------------------------
1. Produce well-structured **Markdown**.
2. Top-level sections (in order) MUST include:
   - Title (H1)
   - Quick Summary (1–3 lines)
   - Learning Objectives (bullet list)
   - Prerequisites (if any)
   - Core Content (divided into clear sub-sections H2/H3)
   - Important Formulas / Definitions / Key Terms (boxed list/table)
   - Worked Examples (if requested/relevant) with step-by-step solutions
   - Diagrams (if requested) — for diagrams, use MermaidJS syntax inside a mermaid code block (\`\`\`mermaid ... \`\`\`).
   - Key Takeaways / Summary
   - Practice Questions (if requested) with answers in a collapsible/separate section
   - Mnemonics / Memory Aids (if requested)
3. Use bullet lists, numbered steps, and tables where helpful.
4. For numeric/math content, show steps clearly.
5. Align language to ${board} ${grade} standards.
6. If "Revision" or "Exam-oriented", include a "Quick Revision Sheet" at the top.
7. Include "How to use these notes" section for ${audience}.
`;

      const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      for await (const chunk of response) {
        setGeneratedContent((prev) => prev + chunk.text);
      }
    } catch (error) {
      console.error(error);
      setGeneratedContent("Error generating notes. Please check your API key and try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
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
    const existing = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    localStorage.setItem('savedPlans', JSON.stringify([newPlan, ...existing]));
    setIsSaved(true);
  };

  return (
    <GeneratorLayout
      title="Study Notes Generator"
      icon="menu_book"
      generatedContent={generatedContent}
      onContentChange={setGeneratedContent}
      isLoading={isLoading}
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
        {activeTemplate && (
          <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
             <span className="material-symbols-outlined text-primary mt-0.5">verified</span>
             <div>
                <p className="text-sm font-bold text-primary">Using Template: {activeTemplate.title}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Notes will follow this style.</p>
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