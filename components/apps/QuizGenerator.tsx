
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import GeneratorLayout from '../GeneratorLayout';
import { LessonPlan } from '../../types';
import { TEMPLATES } from '../../data/templates';
import DynamicPreview from '../DynamicPreview';
import { getSettings } from '../../settings';
import { getUserApiKey, getUserModel } from '../../utils/apiKeyManager';

interface Props {
  onBack: () => void;
}

const QuizGenerator: React.FC<Props> = ({ onBack }) => {
  const [schoolName, setSchoolName] = useState('NARAYANA GROUP OF SCHOOLS');
  const [examTitle, setExamTitle] = useState('CBSE CLASS X SOCIAL SCIENCE');
  const [chapterName, setChapterName] = useState('Nationalism in Europe MCQ');
  const [subject, setSubject] = useState('Social Science');
  const [className, setClassName] = useState('Class X');
  const [topic, setTopic] = useState('Rise of Nationalism in Europe');
  const [numQuestions, setNumQuestions] = useState('5');
  const [difficulty, setDifficulty] = useState('Medium');
  const [activeTemplate, setActiveTemplate] = useState<{id: string, title: string, context: string} | null>(null);
  
  const [isLoading, setIsLoading] = useState(false);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load Settings
    const settings = getSettings();
    setSchoolName(settings.institution || 'NARAYANA GROUP OF SCHOOLS');
    if(settings.defaultGrade) setClassName(settings.defaultGrade);
    if(settings.defaultSubject) setSubject(settings.defaultSubject);

    // Load Template
    const templateId = localStorage.getItem('selected_template_quiz');
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
      const prompt = `Create a Quiz. Subject: ${subject}, Topic: ${topic}, Questions: ${numQuestions}, Difficulty: ${difficulty}.
        
        TEMPLATE INSTRUCTIONS: ${activeTemplate ? activeTemplate.context : 'Strictly follow the table format below.'}
        
        FORMAT REQUIREMENT:
        Create a Markdown Table with exactly 3 columns: "**Q.No**", "**Question & Options**", "**Marks**".
        
        Rules for "Question & Options" column:
        1. Write the Question text on the first line.
        2. Use the HTML <br> tag to create a line break.
        3. List options (1), (2), (3), (4) on subsequent lines, separated by <br> tags.
        4. Do NOT use code blocks. Output raw markdown.
        
        Example Row:
        | Q.1 | What is 2+2? <br> (1) 3 <br> (2) 4 <br> (3) 5 <br> (4) 6 | (1) |
        `;

      const response = await ai.models.generateContentStream({
        model: model,
        contents: prompt,
      });

      for await (const chunk of response) {
        setGeneratedContent((prev) => prev + chunk.text);
      }
    } catch (error) {
      console.error(error);
      setGeneratedContent("Error generating quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = () => {
    const metadata = {
       title: examTitle,
       subtitle: chapterName,
       school: schoolName,
       grade: className,
       subject: subject,
       topic: topic
    };

    const newPlan: LessonPlan = {
      id: Date.now().toString(),
      title: `Quiz: ${topic}`,
      subject,
      grade: className,
      dateCreated: new Date().toISOString().split('T')[0],
      content: generatedContent,
      duration: `${numQuestions} Questions`,
      type: 'quiz',
      templateId: activeTemplate?.id,
      metadata: metadata
    };
    const existing = JSON.parse(localStorage.getItem('savedPlans') || '[]');
    localStorage.setItem('savedPlans', JSON.stringify([newPlan, ...existing]));
    setIsSaved(true);
  };

  return (
    <GeneratorLayout
      title="MCQ Quiz Generator"
      icon="check_circle"
      generatedContent={generatedContent}
      onContentChange={setGeneratedContent}
      isLoading={isLoading}
      onBack={onBack}
      onSave={handleSave}
      isSaved={isSaved}
      customPreview={
        <DynamicPreview 
          templateId={activeTemplate?.id || null} 
          appType="quiz" 
          generatedContent={generatedContent}
          data={{
             title: examTitle,
             subtitle: chapterName,
             school: schoolName,
             grade: className,
             subject: subject,
             topic: topic
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Questions will follow this style.</p>
             </div>
          </div>
        )}
        <div className="space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">Header Configuration</h3>
            <div className="flex flex-col"><label className="text-sm font-medium text-slate-900 dark:text-white mb-2">School Name</label><input type="text" value={schoolName} onChange={e => setSchoolName(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" /></div>
            <div className="flex flex-col"><label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Exam Title</label><input type="text" value={examTitle} onChange={e => setExamTitle(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" /></div>
            <div className="grid grid-cols-2 gap-4">
                 <div className="flex flex-col"><label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Class</label><input type="text" value={className} onChange={e => setClassName(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" /></div>
                 <div className="flex flex-col"><label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Chapter Name</label><input type="text" value={chapterName} onChange={e => setChapterName(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" /></div>
            </div>
        </div>
        <div className="space-y-4">
           <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">Question Details</h3>
            <div className="flex flex-col"><label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Subject</label><input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" required /></div>
            <div className="flex flex-col"><label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Topic Focus</label><input type="text" value={topic} onChange={e => setTopic(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col"><label className="text-sm font-medium text-slate-900 dark:text-white mb-2"># of Questions</label><input type="number" value={numQuestions} onChange={e => setNumQuestions(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" min="1" max="50" required /></div>
              <div className="flex flex-col"><label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Difficulty</label><select value={difficulty} onChange={e => setDifficulty(e.target.value)} className="form-select rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700"><option>Easy</option><option>Medium</option><option>Hard</option></select></div>
            </div>
        </div>
        <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 rounded-lg font-bold disabled:opacity-50 text-white bg-primary hover:bg-primary-dark">{isLoading ? 'Generating...' : 'Generate Quiz'}</button>
      </form>
    </GeneratorLayout>
  );
};
export default QuizGenerator;
