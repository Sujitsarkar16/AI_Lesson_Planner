import React, { useState } from 'react';
import GeneratorLayout from '@/modules/generation/GeneratorLayout';
import { LessonPlan } from '@/shared/types/document';
import TemplateBanner from '@/modules/templates/TemplateBanner';
import DynamicPreview from '@/modules/generation/DynamicPreview';
import { useAuth } from '@/modules/auth/AuthContext';
import { useSelectedTemplate } from '@/modules/templates/useSelectedTemplate';
import { savePlanToLocalStorage } from '@/modules/documents/savedPlansStorage';
import { DocumentService } from '@/modules/documents/documentService';
import { UserProfileService } from '@/modules/user/userProfileService';
import { generateQuestionPaperStream } from '@/modules/generation/geminiService';

interface Props {
  onBack: () => void;
}

const QuestionPaperGenerator: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
  const [qpCode, setQpCode] = useState('19103182');
  const [examName, setExamName] = useState('B A DEGREE (CBCS) EXAMINATION');
  const [semester, setSemester] = useState('First Semester');
  const [courseName, setCourseName] = useState('EDUCATION IN INDIA');
  const [courseCode, setCourseCode] = useState('E1078F29');
  const [time, setTime] = useState('3 Hours');
  const [maxMarks, setMaxMarks] = useState('80');
  const [subject, setSubject] = useState('');
  const [topics, setTopics] = useState('');
  const activeTemplate = useSelectedTemplate('paper');

  const [isLoading, setIsLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setGenerationStatus('queued');
    setGeneratedContent('');
    setIsSaved(false);

    try {
      // Use Gemini API for generation
      const stream = generateQuestionPaperStream({
        subject,
        topics,
        templateContext: activeTemplate?.promptContext,
        parts: 'Part A (Short), Part B (Paragraph), Part C (Essay)',
        onStatus: setGenerationStatus
      });

      for await (const chunk of stream) {
        setGeneratedContent((prev) => prev + chunk);
      }
    } catch (error) {
      console.error(error);
      setGeneratedContent("Error generating paper.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
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
      title="Question Paper Generator"
      icon="description"
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
          {activeTemplate && <TemplateBanner template={activeTemplate} description="Questions will follow this template style." />}
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
