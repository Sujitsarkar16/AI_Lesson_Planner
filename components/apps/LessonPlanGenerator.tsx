
import React, { useState, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";
import GeneratorLayout from '../GeneratorLayout';
import { LessonPlan } from '../../types';
import { TEMPLATES } from '../../data/templates';
import DynamicPreview from '../DynamicPreview';
import { getSettings } from '../../settings';
import { contentGenerationLimiter, imageLimiter } from '../../utils/rateLimiter';
import { InputSanitizer } from '../../utils/inputSanitizer';
import { EncryptedStorage } from '../../utils/encryption';

interface Props {
  onBack: () => void;
}

const LessonPlanGenerator: React.FC<Props> = ({ onBack }) => {
  const [teacherName, setTeacherName] = useState('');
  const [school, setSchool] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [lessonTitle, setLessonTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [grade, setGrade] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState('60 mins');
  const [diffStruggling, setDiffStruggling] = useState(false);
  const [diffAdvanced, setDiffAdvanced] = useState(false);
  const [activeTemplate, setActiveTemplate] = useState<{id: string, title: string, context: string} | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState('');
  const [isSaved, setIsSaved] = useState(false);
  const [rateLimitError, setRateLimitError] = useState<string | null>(null);

  // Image Gen State
  const [generatedImage, setGeneratedImage] = useState<string>('');
  const [isImageLoading, setIsImageLoading] = useState(false);

  useEffect(() => {
    // Load Template
    const templateId = localStorage.getItem('selected_template_lesson-plan');
    if (templateId) {
      const t = TEMPLATES.find(tp => tp.id === templateId);
      if (t) {
        setActiveTemplate({ id: t.id, title: t.title, context: t.promptContext });
      }
    }
    
    // Load Settings
    const settings = getSettings();
    setTeacherName(settings.displayName);
    setSchool(settings.institution);
    if(settings.defaultGrade) setGrade(settings.defaultGrade);
    if(settings.defaultSubject) setSubject(settings.defaultSubject);

  }, []);

  const handleGenerateImage = async () => {
    if (!topic || !subject) {
      alert("Please enter a Subject and Topic first.");
      return;
    }

    // Check rate limit
    if (!imageLimiter.isAllowed()) {
      const resetTime = imageLimiter.getResetTime();
      setRateLimitError(`Image generation limit reached. Try again in ${resetTime} seconds.`);
      setTimeout(() => setRateLimitError(null), 5000);
      return;
    }

    setIsImageLoading(true);
    try {
      if (!process.env.API_KEY) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: `Create an educational illustration or diagram explaining the concept of "${topic}" for a ${grade} ${subject} class. Style: Clear, textbook quality, photorealistic.` }
          ]
        }
      });

      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64EncodeString}`;
          setGeneratedImage(imageUrl);
        }
      }
    } catch (error) {
      console.error("Image generation failed", error);
      alert("Failed to generate image. Please try again.");
    } finally {
      setIsImageLoading(false);
    }
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check rate limit
    if (!contentGenerationLimiter.isAllowed()) {
      const resetTime = contentGenerationLimiter.getResetTime();
      setRateLimitError(`Generation limit reached. Try again in ${resetTime} seconds.`);
      setTimeout(() => setRateLimitError(null), 5000);
      return;
    }

    // Sanitize inputs
    const sanitized = {
      title: InputSanitizer.sanitizeText(lessonTitle, 100),
      teacher: InputSanitizer.sanitizeText(teacherName, 100),
      school: InputSanitizer.sanitizeText(school, 100),
      subject: InputSanitizer.sanitizeText(subject, 100),
      grade: InputSanitizer.sanitizeText(grade, 50),
      topic: InputSanitizer.sanitizeText(topic, 100)
    };

    setIsLoading(true);
    setGeneratedPlan('');
    setIsSaved(false);

    try {
      if (!process.env.API_KEY) throw new Error("API Key missing");
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const diffs = [];
      if (diffStruggling) diffs.push("Struggling Students");
      if (diffAdvanced) diffs.push("Advanced Learners");

      let prompt = `Create a lesson plan content.
        Context: Grade: ${sanitized.grade}, Subject: ${sanitized.subject}, Topic: ${sanitized.topic}, Title: ${sanitized.title}, Duration: ${duration}.
        
        TEMPLATE INSTRUCTIONS: ${activeTemplate ? activeTemplate.context : 'Standard structure required.'}
        
        Structure requirements (Unless overridden by Template):
        1. ## Learning Intentions
        2. ## Assumed Knowledge
        3. ## Syllabus Outcomes
        4. ## Assessment (Formative & Summative)
        5. ## Resources
        6. ## Activities & Teaching Sequence (Markdown Table with columns: Timing, Teacher Activity, Student Activity, Resources)
        7. ## Lesson Reflection (Leave blank space for handwritten notes)
        Format: Clean Markdown. Use H2 (##) for sections.`;

      const response = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      for await (const chunk of response) {
        setGeneratedPlan((prev) => prev + chunk.text);
      }
    } catch (error) {
      console.error(error);
      setGeneratedPlan("Error generating plan.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    // Sanitize data before saving
    const sanitized = {
       title: InputSanitizer.sanitizeText(lessonTitle, 100),
       teacher: InputSanitizer.sanitizeText(teacherName, 100),
       school: InputSanitizer.sanitizeText(school, 100),
       date: InputSanitizer.sanitizeText(date, 50),
       duration: InputSanitizer.sanitizeText(duration, 50),
       grade: InputSanitizer.sanitizeText(grade, 50),
       subject: InputSanitizer.sanitizeText(subject, 100),
       topic: InputSanitizer.sanitizeText(topic, 100),
       content: InputSanitizer.sanitizeMarkdown(generatedPlan)
    };

    const metadata = {
       title: sanitized.title,
       teacher: sanitized.teacher,
       school: sanitized.school,
       date: sanitized.date,
       duration: sanitized.duration,
       grade: sanitized.grade,
       subject: sanitized.subject,
       topic: sanitized.topic
    };

    const newPlan: LessonPlan = {
      id: Date.now().toString(),
      title: sanitized.title || sanitized.topic || "Lesson Plan",
      subject: sanitized.subject,
      grade: sanitized.grade,
      dateCreated: sanitized.date,
      content: sanitized.content,
      duration: sanitized.duration,
      imageUrl: generatedImage,
      type: 'lesson-plan',
      templateId: activeTemplate?.id,
      metadata: metadata
    };

    try {
      // Encrypt sensitive metadata before storing
      await EncryptedStorage.set('plan_' + newPlan.id, metadata);
      
      const existing = JSON.parse(localStorage.getItem('savedPlans') || '[]');
      localStorage.setItem('savedPlans', JSON.stringify([newPlan, ...existing]));
      setIsSaved(true);
    } catch (error) {
      console.error('Failed to save plan:', error);
      alert('Error saving plan. Please try again.');
    }
  };

  return (
    <>
      {rateLimitError && (
        <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/30 border-2 border-red-300 dark:border-red-700 rounded-lg text-red-700 dark:text-red-300 flex items-start gap-3">
          <span className="material-symbols-outlined flex-shrink-0 mt-0.5">warning</span>
          <span className="text-sm font-medium">{rateLimitError}</span>
        </div>
      )}
      <GeneratorLayout
        title="Lesson Plan Generator"
        icon="auto_stories"
        generatedContent={generatedPlan}
        onContentChange={setGeneratedPlan}
        isLoading={isLoading}
        onBack={onBack}
        onSave={handleSave}
        isSaved={isSaved}
      customPreview={
        <DynamicPreview 
          templateId={activeTemplate?.id || null} 
          appType="lesson-plan" 
          generatedContent={generatedPlan}
          imageUrl={generatedImage}
          data={{
             title: lessonTitle,
             teacher: teacherName,
             school: school,
             date: date,
             duration: duration,
             grade: grade,
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
                <p className="text-xs text-slate-500 dark:text-slate-400">Content will be structured according to this template.</p>
             </div>
          </div>
        )}
        <div className="space-y-4">
           <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">Lesson Details</h3>
           <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Lesson Title</label>
            <input type="text" value={lessonTitle} onChange={e => setLessonTitle(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" placeholder="e.g. Intro to Ecosystems" required />
          </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Teacher</label>
                <input type="text" value={teacherName} onChange={e => setTeacherName(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">School</label>
                <input type="text" value={school} onChange={e => setSchool(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" />
              </div>
           </div>
           <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Date</label>
                <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" />
              </div>
              <div className="flex flex-col">
                <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Duration</label>
                <input type="text" value={duration} onChange={e => setDuration(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" />
              </div>
           </div>
        </div>
        <div className="space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b pb-2">Content Config</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Subject</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" required />
            </div>
            <div className="flex flex-col">
              <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Grade</label>
              <input type="text" value={grade} onChange={e => setGrade(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" required />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Topic</label>
            <input type="text" value={topic} onChange={e => setTopic(e.target.value)} className="form-input rounded-lg bg-slate-50 dark:bg-slate-800 border-slate-300 dark:border-slate-700" required />
          </div>
          
          {/* Visual Aids Section */}
          <div className="space-y-2 pt-2">
            <div className="flex items-center justify-between">
               <label className="text-sm font-medium text-slate-900 dark:text-white">Visual Aids</label>
               {generatedImage && <span className="text-xs text-green-500 font-bold flex items-center gap-1"><span className="material-symbols-outlined text-sm">check</span> Image Generated</span>}
            </div>
            <button 
              type="button"
              onClick={handleGenerateImage}
              disabled={isImageLoading || !topic}
              className="w-full py-2 px-4 rounded-lg border-2 border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 text-primary text-sm font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isImageLoading ? (
                <>
                  <span className="material-symbols-outlined animate-spin text-lg">refresh</span>
                  Generating Visual...
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined text-lg">image</span>
                  Generate AI Illustration for Topic
                </>
              )}
            </button>
          </div>

          <div className="space-y-3 pt-2">
            <p className="text-sm font-medium text-slate-900 dark:text-white">Differentiation Needed?</p>
            <div className="flex flex-wrap gap-4">
               <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={diffStruggling} onChange={e => setDiffStruggling(e.target.checked)} className="rounded text-primary" />
                  Struggling Students
               </label>
               <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                  <input type="checkbox" checked={diffAdvanced} onChange={e => setDiffAdvanced(e.target.checked)} className="rounded text-primary" />
                  Advanced Learners
               </label>
            </div>
          </div>
        </div>
        <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 rounded-lg font-bold disabled:opacity-50 text-white bg-primary hover:bg-primary-dark">
           {isLoading ? 'Generating Plan...' : 'Generate Lesson Plan'}
        </button>
      </form>
    </GeneratorLayout>
    </>
  );
};
export default LessonPlanGenerator;
