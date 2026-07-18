
import React, { useState } from 'react';
import GeneratorLayout from '@/modules/generation/GeneratorLayout';
import { LessonPlan } from '@/shared/types/document';
import TemplateBanner from '@/modules/templates/TemplateBanner';
import DynamicPreview from '@/modules/generation/DynamicPreview';
import { useStreamingVerification } from '@/modules/verification/useVerification';
import { useAuth } from '@/modules/auth/AuthContext';
import { useSelectedTemplate } from '@/modules/templates/useSelectedTemplate';
import { savePlanToLocalStorage } from '@/modules/documents/savedPlansStorage';
import { DocumentService } from '@/modules/documents/documentService';
import { UserProfileService } from '@/modules/user/userProfileService';
import VerificationBadge from '@/modules/verification/VerificationBadge';
import { generateSyllabusStream } from '@/modules/generation/geminiService';

interface Props {
  onBack: () => void;
}

const SyllabusGenerator: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
  // Form State
  const [courseTitle, setCourseTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [subject, setSubject] = useState('');
  const [level, setLevel] = useState('');
  const [term, setTerm] = useState('Fall 2024');
  const [duration, setDuration] = useState('12');
  const [instructorName, setInstructorName] = useState('');
  const [institution, setInstitution] = useState('');

  const [description, setDescription] = useState('');
  const [prerequisites, setPrerequisites] = useState('');
  const [objectives, setObjectives] = useState('');
  const [topics, setTopics] = useState('');

  const [teachingApproach, setTeachingApproach] = useState('');
  const [materials, setMaterials] = useState('');
  const [additionalRequests, setAdditionalRequests] = useState('');

  const activeTemplate = useSelectedTemplate('syllabus');

  const [isLoading, setIsLoading] = useState(false);
  const [generationStatus, setGenerationStatus] = useState<string | null>(null);
  const [generatedContent, setGeneratedContent] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Verification Agent Integration
  const verification = useStreamingVerification({
    enabled: true,
    verifyMermaid: false,
    showWarnings: true
  });

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setGenerationStatus('queued');
    setGeneratedContent('');
    setIsSaved(false);
    verification.resetStream();

    try {
      // Use Gemini API for generation
      const stream = generateSyllabusStream({
        courseTitle,
        courseCode,
        subject,
        level,
        term,
        duration,
        instructorName,
        institution,
        description,
        prerequisites,
        objectives,
        topics,
        teachingApproach,
        materials,
        additionalRequests,
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
      setGeneratedContent("Error generating syllabus.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    const metadata = {
      title: `${courseTitle} Syllabus`,
      subtitle: term,
      instructor: instructorName,
      duration: `${duration} Weeks`,
      course: courseTitle,
      date: term,
      school: institution,
      office: "",
      email: ""
    };

    const newPlan: LessonPlan = {
      id: Date.now().toString(),
      title: `Syllabus: ${courseTitle}`,
      subject: subject || "Syllabus",
      grade: level,
      dateCreated: new Date().toISOString().split('T')[0],
      content: generatedContent,
      duration: `${duration} weeks`,
      type: 'syllabus',
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
      title="Syllabus Generator"
      icon="calendar_month"
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
          appType="syllabus"
          generatedContent={generatedContent}
          data={{
            title: `${courseTitle} Syllabus`,
            subtitle: term,
            instructor: instructorName,
            duration: `${duration} Weeks`,
            course: courseTitle,
            date: term,
            school: institution,
            office: "",
            email: ""
          }}
        />
      }
    >
      <form onSubmit={handleGenerate} className="space-y-6">
        {activeTemplate && <TemplateBanner template={activeTemplate} description="Structure adjusted for this template." />}

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

        {/* 1. Course Identification */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">school</span>
            Course Identification
          </h3>

          <div className="flex flex-col">
            <label className="label-sm">Course Title</label>
            <input type="text" value={courseTitle} onChange={e => setCourseTitle(e.target.value)} className="input-field" placeholder="e.g. Introduction to Computer Science" required />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="label-sm">Course Code <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
              <input type="text" value={courseCode} onChange={e => setCourseCode(e.target.value)} className="input-field" placeholder="e.g. CS101" />
            </div>
            <div className="flex flex-col">
              <label className="label-sm">Subject / Department</label>
              <input type="text" value={subject} onChange={e => setSubject(e.target.value)} className="input-field" placeholder="e.g. Computer Science" required />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="label-sm">Level <span className="text-slate-400 font-normal normal-case">(Grade or UG/PG)</span></label>
              <input type="text" value={level} onChange={e => setLevel(e.target.value)} className="input-field" placeholder="e.g. Undergraduate" />
            </div>
            <div className="flex flex-col">
              <label className="label-sm">Term / Semester</label>
              <input type="text" value={term} onChange={e => setTerm(e.target.value)} className="input-field" placeholder="e.g. Fall 2024" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col">
              <label className="label-sm">Duration <span className="text-slate-400 font-normal normal-case">(weeks)</span></label>
              <input type="number" value={duration} onChange={e => setDuration(e.target.value)} className="input-field" min="1" max="52" required />
            </div>
            <div className="flex flex-col">
              <label className="label-sm">Instructor Name</label>
              <input type="text" value={instructorName} onChange={e => setInstructorName(e.target.value)} className="input-field" placeholder="e.g. Dr. Jane Smith" />
            </div>
          </div>
          <div className="flex flex-col">
            <label className="label-sm">Institution Name</label>
            <input type="text" value={institution} onChange={e => setInstitution(e.target.value)} className="input-field" placeholder="e.g. University of Technology" />
          </div>
        </div>

        {/* 2. Course Details */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">menu_book</span>
            Course Details
          </h3>

          <div className="flex flex-col">
            <label className="label-sm">Course Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="input-field" rows={3} placeholder="Brief overview of the course..." required />
          </div>

          <div className="flex flex-col">
            <label className="label-sm">Prerequisites / Assumed Knowledge</label>
            <textarea value={prerequisites} onChange={e => setPrerequisites(e.target.value)} className="input-field" rows={2} placeholder="What should students already know?" />
          </div>

          <div className="flex flex-col">
            <label className="label-sm">Learning Objectives <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
            <textarea value={objectives} onChange={e => setObjectives(e.target.value)} className="input-field" rows={3} placeholder="By the end of this course, students will be able to..." />
          </div>

          <div className="flex flex-col">
            <label className="label-sm">Weekly Topics OR Unit Topics <span className="text-slate-400 font-normal normal-case">(list)</span></label>
            <textarea value={topics} onChange={e => setTopics(e.target.value)} className="input-field" rows={3} placeholder="List key topics or units to be covered..." required />
          </div>
        </div>

        {/* 3. Delivery & Resources */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-xl border border-slate-200 dark:border-slate-700 space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-200 dark:border-slate-700 pb-2 mb-2 flex items-center gap-2">
            <span className="material-symbols-outlined text-lg">inventory_2</span>
            Delivery & Resources
          </h3>

          <div className="flex flex-col">
            <label className="label-sm">Teaching Approach <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
            <input type="text" value={teachingApproach} onChange={e => setTeachingApproach(e.target.value)} className="input-field" placeholder="e.g. Lecture-based, Project-based learning" />
          </div>

          <div className="flex flex-col">
            <label className="label-sm">Required Materials & Resources</label>
            <textarea value={materials} onChange={e => setMaterials(e.target.value)} className="input-field" rows={2} placeholder="Textbooks, software, equipment..." />
          </div>

          <div className="flex flex-col">
            <label className="label-sm">Additional Requests <span className="text-slate-400 font-normal normal-case">(optional)</span></label>
            <textarea value={additionalRequests} onChange={e => setAdditionalRequests(e.target.value)} className="input-field" rows={2} placeholder="Any specific policies, grading schemes, or custom sections?" />
          </div>
        </div>

        <button type="submit" disabled={isLoading} className="w-full py-3 rounded-lg font-bold disabled:opacity-50 text-white bg-primary hover:bg-primary-dark shadow-neo-sm hover:shadow-none translate-x-0 hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
          {isLoading ? 'Generating Syllabus...' : 'Generate Syllabus'}
        </button>
      </form>
      <style>{`
        .label-sm { @apply text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wide; }
        .input-field { @apply w-full rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-sm p-2.5 focus:ring-2 focus:ring-primary focus:border-transparent transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500; }
      `}</style>
    </GeneratorLayout>
  );
};
export default SyllabusGenerator;
