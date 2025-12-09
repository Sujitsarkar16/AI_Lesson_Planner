
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import GeneratorLayout from '../GeneratorLayout';
import { LessonPlan } from '../../types';
import { TEMPLATES } from '../../data/templates';
import DynamicPreview from '../DynamicPreview';
import { getUserApiKey, getUserModel } from '../../utils/apiKeyManager';

interface Props {
  onBack: () => void;
}

const QuestionPaperGenerator: React.FC<Props> = ({ onBack }) => {
  const [qpCode, setQpCode] = useState('19103182');
  const [examName, setExamName] = useState('B A DEGREE (CBCS) EXAMINATION');
  const [semester, setSemester] = useState('First Semester');
  const [courseName, setCourseName] = useState('EDUCATION IN INDIA');
  const [admissionInfo, setAdmissionInfo] = useState('2017 Admission Onwards');
  const [courseCode, setCourseCode] = useState('E1078F29');
  const [time, setTime] = useState('3 Hours');
  const [maxMarks, setMaxMarks] = useState('80');
  const [partA, setPartA] = useState({ enabled: true, count: 10, marks: 2, totalQuestions: 12 });
  const [partB, setPartB] = useState({ enabled: true, count: 6, marks: 5, totalQuestions: 9 });
  const [partC, setPartC] = useState({ enabled: true, count: 2, marks: 15, totalQuestions: 4 });
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState('');
  const [activeTemplate, setActiveTemplate] = useState<{id: string, title: string, context: string} | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    const templateId = localStorage.getItem('selected_template_paper');
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
      const apiKey = getUserApiKey();
      const model = getUserModel();
      if (!apiKey) throw new Error("Please add your Google Gemini API key in Settings");
      const ai = new GoogleGenAI({ apiKey });
      let prompt = `Create a formal Question Paper. Subject: ${subject}. Topics: ${topics}.
      
        TEMPLATE INSTRUCTIONS: ${activeTemplate ? activeTemplate.context : 'Standard structure required.'}
        
        Default Requirements (If not overridden): Generate questions for: ${partA.enabled ? 'Part A (Short)' : ''} ${partB.enabled ? 'Part B (Paragraph)' : ''} ${partC.enabled ? 'Part C (Essay)' : ''}.
        Format: Clean Markdown. Number questions continuously.`;

      const response = await ai.models.generateContentStream({
        model: model,
        contents: prompt,
      });

      for await (const chunk of response) {
        setGeneratedContent((prev) => prev + chunk.text);
      }
    } catch (error) {
      console.error(error);
      setGeneratedContent("Error generating paper.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    const fullContent = `QCode: ${qpCode}
# ${examName}
## ${semester}
### ${courseName}
---
${generatedContent}`;
    const metadata = {
       examName: examName,
       subtitle: semester,
       course: courseName,
       code: qpCode,
       duration: time,
       marks: maxMarks,
       school: "UNIVERSITY EXAMINATION"
    };

    const newPlan: LessonPlan = {
      id: Date.now().toString(),
      title: `QP: ${courseName}`,
      subject: "Question Paper",
      grade: semester,
      dateCreated: new Date().toISOString().split('T')[0],
      content: fullContent,
      duration: time,
      type: 'paper',
      templateId: activeTemplate?.id,
      metadata: metadata
    };
    const existing = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    localStorage.setItem('savedPlans', JSON.stringify([newPlan, ...existing]));
    setIsSaved(true);
  };

  return (
    <GeneratorLayout
      title="Question Paper Generator"
      icon="description"
      generatedContent={generatedContent}
      onContentChange={setGeneratedContent}
      isLoading={isLoading}
      onBack={onBack}
      onSave={handleSave}
      isSaved={isSaved}
      customPreview={
        <DynamicPreview 
          templateId={activeTemplate?.id || null} 
          appType="paper" 
          generatedContent={generatedContent}
          data={{
             examName: examName,
             subtitle: semester,
             course: courseName,
             code: qpCode,
             duration: time,
             marks: maxMarks,
             school: "UNIVERSITY EXAMINATION"
          }}
        />
      }
    >
      <div className="flex flex-col gap-6">
            <form onSubmit={handleGenerate} className="space-y-8">
              {activeTemplate && (
                <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
                   <span className="material-symbols-outlined text-primary mt-0.5">verified</span>
                   <div>
                      <p className="text-sm font-bold text-primary">Using Template: {activeTemplate.title}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Questions will follow this template style.</p>
                   </div>
                </div>
              )}
              <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">Header Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col"><label className="label-sm">QP Code</label><input type="text" value={qpCode} onChange={e => setQpCode(e.target.value)} className="input-field" required /></div>
                  <div className="flex flex-col"><label className="label-sm">Course Code</label><input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} className="input-field" required /></div>
                </div>
                <div className="flex flex-col"><label className="label-sm">Exam Name</label><input type="text" value={examName} onChange={e => setExamName(e.target.value)} className="input-field" required /></div>
                 <div className="flex flex-col"><label className="label-sm">Semester</label><input type="text" value={semester} onChange={e => setSemester(e.target.value)} className="input-field" required /></div>
                <div className="flex flex-col"><label className="label-sm">Course Name</label><input type="text" value={courseName} onChange={e => setCourseName(e.target.value)} className="input-field" required /></div>
              </div>
               <div className="space-y-4">
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">Content</h3>
                 <div className="flex flex-col"><label className="label-sm">Subject</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="input-field" required /></div>
                <div className="flex flex-col"><label className="label-sm">Topics</label><textarea value={topics} onChange={e => setTopics(e.target.value)} className="input-field" rows={2} required /></div>
               </div>
              <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 rounded-lg font-bold disabled:opacity-50 text-white bg-primary hover:bg-primary-dark">{isLoading ? 'Generating...' : 'Generate Paper'}</button>
            </form>
      </div>
      <style>{`.label-sm { @apply text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide; } .input-field { @apply w-full rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm focus:ring-primary focus:border-primary; }`}</style>
    </GeneratorLayout>
  );
};
export default QuestionPaperGenerator;
