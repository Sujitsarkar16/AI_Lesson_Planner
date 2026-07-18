import React, { useState, useEffect } from 'react';
import GeneratorLayout from '@/modules/generation/GeneratorLayout';
import { LessonPlan, QuizMetadata } from '@/shared/types/document';
import TemplateBanner from '@/modules/templates/TemplateBanner';
import DynamicPreview from '@/modules/generation/DynamicPreview';
import { getSettings } from '@/modules/user/settings';
import { useAuth } from '@/modules/auth/AuthContext';
import { useSelectedTemplate } from '@/modules/templates/useSelectedTemplate';
import { savePlanToLocalStorage } from '@/modules/documents/savedPlansStorage';
import { DocumentService } from '@/modules/documents/documentService';
import { UserProfileService } from '@/modules/user/userProfileService';
import { generateQuizStream } from '@/modules/generation/geminiService';
import { GeneratorConfig, DEFAULT_GENERATOR_CONFIG, LanguageOption, ToneStyle } from '@/modules/generation/generatorConfig';

interface Props {
  onBack: () => void;
}

const QuizGenerator: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
  const [schoolName, setSchoolName] = useState('NARAYANA GROUP OF SCHOOLS');
  const [examTitle, setExamTitle] = useState('CBSE CLASS X SOCIAL SCIENCE');
  const [chapterName, setChapterName] = useState('Nationalism in Europe MCQ');
  const [subject, setSubject] = useState('Social Science');
  const [className, setClassName] = useState('Class X');
  const [topic, setTopic] = useState('Rise of Nationalism in Europe');
  const [numQuestions, setNumQuestions] = useState('5');
  const [difficulty, setDifficulty] = useState('Medium');
  const activeTemplate = useSelectedTemplate('quiz');

  // Advanced Configuration
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [generatorConfig, setGeneratorConfig] = useState<GeneratorConfig>(DEFAULT_GENERATOR_CONFIG);
  const [language, setLanguage] = useState<LanguageOption>('English');
  const [tone, setTone] = useState<ToneStyle>('Professional');

  const [isLoading, setIsLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  useEffect(() => {
    // Load Settings
    const settings = getSettings();
    setSchoolName(settings.institution || 'NARAYANA GROUP OF SCHOOLS');
    if (settings.defaultGrade) setClassName(settings.defaultGrade);
    if (settings.defaultSubject) setSubject(settings.defaultSubject);

  }, []);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setGenerationStatus('queued');
    setGeneratedContent('');
    setIsSaved(false);

    try {
      // Use Gemini API for generation
      const stream = generateQuizStream({
        subject,
        topic,
        numQuestions,
        difficulty,
        templateContext: activeTemplate?.promptContext,
        config: showAdvancedConfig ? generatorConfig : undefined,
        onStatus: setGenerationStatus
      });

      for await (const chunk of stream) {
        setGeneratedContent((prev) => prev + chunk);
      }
    } catch (error) {
      console.error(error);
      setGeneratedContent("Error generating quiz.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const metadata: QuizMetadata = {
      examTitle,
      subtitle: chapterName,
      school: schoolName,
      topic: topic,
      numQuestions: parseInt(numQuestions),
      difficulty: difficulty as 'Easy' | 'Medium' | 'Hard'
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
      title="MCQ Quiz Generator"
      icon="check_circle"
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
        {activeTemplate && <TemplateBanner template={activeTemplate} description="Questions will follow this style." />}
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

        {/* Advanced Configuration Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Advanced Options</h3>
            <button
              type="button"
              onClick={() => setShowAdvancedConfig(!showAdvancedConfig)}
              className="text-sm text-primary hover:underline flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-lg">{showAdvancedConfig ? 'expand_less' : 'expand_more'}</span>
              {showAdvancedConfig ? 'Hide' : 'Show'}
            </button>
          </div>

          {showAdvancedConfig && (
            <div className="space-y-4 bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Language</label>
                  <select
                    value={language}
                    onChange={e => setLanguage(e.target.value as LanguageOption)}
                    className="form-select rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  >
                    <option value="English">English</option>
                    <option value="Spanish">Spanish</option>
                    <option value="Hindi">Hindi</option>
                    <option value="French">French</option>
                    <option value="Mandarin">Mandarin</option>
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Tone</label>
                  <select
                    value={tone}
                    onChange={e => setTone(e.target.value as ToneStyle)}
                    className="form-select rounded-lg bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700"
                  >
                    <option value="Formal">Formal</option>
                    <option value="Academic">Academic</option>
                    <option value="Professional">Professional</option>
                    <option value="Friendly">Friendly</option>
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 rounded-lg font-bold disabled:opacity-50 text-white bg-primary hover:bg-primary-dark">{isLoading ? 'Generating...' : 'Generate Quiz'}</button>
      </form>
    </GeneratorLayout>
  );
};
export default QuizGenerator;
