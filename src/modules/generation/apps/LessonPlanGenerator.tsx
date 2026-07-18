
import React, { useState, useEffect } from 'react';
import GeneratorLayout from '@/modules/generation/GeneratorLayout';
import { LessonPlan, LessonPlanMetadata } from '@/shared/types/document';
import TemplateBanner from '@/modules/templates/TemplateBanner';
import DynamicPreview from '@/modules/generation/DynamicPreview';
import { getSettings } from '@/modules/user/settings';
import { InputSanitizer } from '@/shared/security/inputSanitizer';
import { useStreamingVerification } from '@/modules/verification/useVerification';
import { useAuth } from '@/modules/auth/AuthContext';
import { useSelectedTemplate } from '@/modules/templates/useSelectedTemplate';
import { savePlanToLocalStorage } from '@/modules/documents/savedPlansStorage';
import VerificationBadge from '@/modules/verification/VerificationBadge';
import { generateLessonPlanStream } from '@/modules/generation/geminiService';
import { CurriculumService, CurriculumBoard, BloomLevel, EmphasisType, CurriculumStandard } from '@/modules/curriculum/curriculumService';
import { DocumentService } from '@/modules/documents/documentService';
import { UserProfileService } from '@/modules/user/userProfileService';
import {
  GeneratorConfig,
  DEFAULT_GENERATOR_CONFIG,
  LanguageOption,
  ToneStyle,
  TeachingApproach,
  ClassroomSize,
  DeliveryMode,
  getConfigSummary
} from '@/modules/generation/generatorConfig';

interface Props {
  onBack: () => void;
}

const LessonPlanGenerator: React.FC<Props> = ({ onBack }) => {
  const { user } = useAuth();
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
  const activeTemplate = useSelectedTemplate('lesson-plan');

  // Curriculum & Pedagogy Fields
  const [curriculumBoard, setCurriculumBoard] = useState<CurriculumBoard>('CBSE');
  const [selectedStandards, setSelectedStandards] = useState<string[]>([]);
  const [availableStandards, setAvailableStandards] = useState<CurriculumStandard[]>([]);
  const [learningObjectives, setLearningObjectives] = useState<string>('');
  const [targetBloomLevels, setTargetBloomLevels] = useState<BloomLevel[]>([]);
  const [emphasisType, setEmphasisType] = useState<EmphasisType>('Conceptual');
  const [showCurriculumFields, setShowCurriculumFields] = useState(false);

  // Advanced Generator Configuration
  const [showAdvancedConfig, setShowAdvancedConfig] = useState(false);
  const [generatorConfig, setGeneratorConfig] = useState<GeneratorConfig>(DEFAULT_GENERATOR_CONFIG);

  const [isLoading, setIsLoading] = useState(false);
  const [generatedPlan, setGeneratedPlan] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Verification Agent Integration
  const verification = useStreamingVerification({
    enabled: true,
    verifyMermaid: false,
    showWarnings: true
  });

  // Load settings on mount
  useEffect(() => {
    const settings = getSettings();
    setTeacherName(settings.displayName);
    setSchool(settings.institution);
    if (settings.defaultGrade) setGrade(settings.defaultGrade);
    if (settings.defaultSubject) setSubject(settings.defaultSubject);

  }, []);

  // Load curriculum standards when board/grade/subject change
  useEffect(() => {
    if (showCurriculumFields && curriculumBoard && grade && subject) {
      loadStandards();
    }
  }, [curriculumBoard, grade, subject, showCurriculumFields]);

  const loadStandards = async () => {
    const standards = await CurriculumService.getStandards(curriculumBoard, grade, subject);
    setAvailableStandards(standards);
  };

  const toggleStandard = (standardId: string) => {
    setSelectedStandards(prev =>
      prev.includes(standardId)
        ? prev.filter(id => id !== standardId)
        : [...prev, standardId]
    );
  };

  const toggleBloomLevel = (level: BloomLevel) => {
    setTargetBloomLevels(prev =>
      prev.includes(level)
        ? prev.filter(l => l !== level)
        : [...prev, level]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();

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
    verification.resetStream();

    try {
      const diffs = [];
      if (diffStruggling) diffs.push("Struggling Students");
      if (diffAdvanced) diffs.push("Advanced Learners");

      // Use Gemini API for generation with curriculum awareness
      const stream = generateLessonPlanStream({
        grade: sanitized.grade,
        subject: sanitized.subject,
        topic: sanitized.topic,
        title: sanitized.title,
        duration: duration,
        templateContext: activeTemplate?.promptContext,
        difficultyAdjustments: diffs.length > 0 ? diffs : undefined,
        curriculumBoard: showCurriculumFields ? curriculumBoard : undefined,
        bloomLevels: targetBloomLevels.length > 0 ? targetBloomLevels : undefined,
        emphasis: showCurriculumFields ? emphasisType : undefined,
        learningObjectives: learningObjectives || undefined,
        config: showAdvancedConfig
          ? {
              ...generatorConfig,
              classroom: {
                ...generatorConfig.classroom,
                availableTime: Number.parseInt(duration, 10) || 60
              }
            }
          : undefined
      });

      // Process streaming with verification
      for await (const chunk of stream) {
        verification.processChunk(chunk);
        setGeneratedPlan((prev) => prev + chunk);
      }

      // Finalize and verify complete content
      const verificationResult = await verification.finalizeStream();

      if (verificationResult.fixes.length > 0) {
        console.info('✅ Applied automatic fixes:', verificationResult.fixes);
        setGeneratedPlan(verificationResult.correctedContent);
      }

      if (verificationResult.issues.length > 0) {
        console.warn('⚠️ Content issues detected:', verificationResult.issues);
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

    const metadata: LessonPlanMetadata = {
      teacher: sanitized.teacher,
      school: sanitized.school,
      date: sanitized.date,
      duration: sanitized.duration,
      topic: sanitized.topic,
      board: showCurriculumFields ? curriculumBoard : undefined,
      bloomLevels: targetBloomLevels,
      emphasis: showCurriculumFields ? emphasisType : undefined,
      objectives: learningObjectives
    };

    const newPlan: LessonPlan = {
      id: Date.now().toString(),
      title: sanitized.title || sanitized.topic || "Lesson Plan",
      subject: sanitized.subject,
      grade: sanitized.grade,
      dateCreated: sanitized.date,
      content: sanitized.content,
      duration: sanitized.duration,
      type: 'lesson-plan',
      templateId: activeTemplate?.id,
      metadata: metadata
    };

    try {
      // Save to database if user is authenticated
      if (user) {
        const userProfile = await UserProfileService.getOrCreateUser(user.sub, user.email || '', user.name);
        if (userProfile) {
          const savedDoc = await DocumentService.createDocument(userProfile.id, newPlan);
          if (savedDoc) {
            // Save curriculum mappings if standards were selected
            if (showCurriculumFields && selectedStandards.length > 0) {
              await CurriculumService.recordCoverage(userProfile.id, savedDoc.id, selectedStandards);
            }
            setIsSaved(true);
            return;
          }
        }
      }

      // Fallback to localStorage
      savePlanToLocalStorage(newPlan);
      setIsSaved(true);
    } catch (error) {
      console.error('Failed to save plan:', error);
      alert('Error saving plan. Please try again.');
    }
  };

  return (
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
          {activeTemplate && <TemplateBanner template={activeTemplate} description="Content will be structured according to this template." />}

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

          {/* Curriculum & Pedagogy Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Curriculum & Pedagogy (Optional)</h3>
              <button
                type="button"
                onClick={() => setShowCurriculumFields(!showCurriculumFields)}
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-lg">{showCurriculumFields ? 'expand_less' : 'expand_more'}</span>
                {showCurriculumFields ? 'Hide' : 'Show'}
              </button>
            </div>

            {showCurriculumFields && (
              <div className="space-y-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-lg">
                {/* Curriculum Board Selection */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Curriculum Board</label>
                  <select
                    value={curriculumBoard}
                    onChange={e => setCurriculumBoard(e.target.value as CurriculumBoard)}
                    className="form-select rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
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

                {/* Learning Objectives */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Learning Objectives (Optional)</label>
                  <textarea
                    value={learningObjectives}
                    onChange={e => setLearningObjectives(e.target.value)}
                    className="form-textarea rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                    rows={3}
                    placeholder="Enter specific learning objectives for this lesson..."
                  />
                </div>

                {/* Bloom's Taxonomy Levels */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Target Bloom's Taxonomy Levels</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                    {(['Remember', 'Understand', 'Apply', 'Analyze', 'Evaluate', 'Create'] as BloomLevel[]).map(level => (
                      <label key={level} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={targetBloomLevels.includes(level)}
                          onChange={() => toggleBloomLevel(level)}
                          className="rounded text-primary"
                        />
                        {level}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Emphasis Type */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">Primary Emphasis</label>
                  <div className="flex flex-wrap gap-3">
                    {(['Conceptual', 'Procedural', 'Values', 'Mixed'] as EmphasisType[]).map(type => (
                      <label key={type} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                        <input
                          type="radio"
                          name="emphasis"
                          checked={emphasisType === type}
                          onChange={() => setEmphasisType(type)}
                          className="text-primary"
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>

                {/* Curriculum Standards Selection */}
                {availableStandards.length > 0 && (
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Curriculum Standards to Cover ({selectedStandards.length} selected)
                    </label>
                    <div className="max-h-48 overflow-y-auto border border-slate-300 dark:border-slate-700 rounded-lg p-3 space-y-2 bg-white dark:bg-slate-900">
                      {availableStandards.map(standard => (
                        <label key={standard.id} className="flex items-start gap-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded">
                          <input
                            type="checkbox"
                            checked={selectedStandards.includes(standard.id)}
                            onChange={() => toggleStandard(standard.id)}
                            className="rounded text-primary mt-0.5 flex-shrink-0"
                          />
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{standard.standard_code}</span>
                            <span className="text-slate-600 dark:text-slate-400 ml-2">{standard.standard_description}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {availableStandards.length === 0 && grade && subject && (
                  <div className="text-sm text-slate-500 dark:text-slate-400 text-center py-4 bg-slate-100 dark:bg-slate-900 rounded-lg">
                    <span className="material-symbols-outlined text-3xl opacity-50 mb-2">info</span>
                    <p>No curriculum standards available for {curriculumBoard} - Grade {grade} - {subject}</p>
                    <p className="text-xs mt-1">Standards can be added in the dashboard settings.</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Advanced Configuration Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Advanced Configuration (Optional)</h3>
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
              <div className="space-y-4 bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-lg border-2 border-indigo-200 dark:border-indigo-800">
                {/* Language & Tone */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Language
                    </label>
                    <select
                      value={generatorConfig.language?.primaryLanguage || 'English'}
                      onChange={e => setGeneratorConfig((config) => ({
                        ...config,
                        language: { ...config.language, primaryLanguage: e.target.value as LanguageOption }
                      }))}
                      className="form-select rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                    >
                      <option value="English">English</option>
                      <option value="Spanish">Spanish</option>
                      <option value="French">French</option>
                      <option value="German">German</option>
                      <option value="Hindi">Hindi</option>
                      <option value="Mandarin">Mandarin</option>
                      <option value="Arabic">Arabic</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Tone
                    </label>
                    <select
                      value={generatorConfig.language?.tone || 'Professional'}
                      onChange={e => setGeneratorConfig((config) => ({
                        ...config,
                        language: { ...config.language, tone: e.target.value as ToneStyle }
                      }))}
                      className="form-select rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                    >
                      <option value="Formal">Formal</option>
                      <option value="Informal">Informal</option>
                      <option value="Conversational">Conversational</option>
                      <option value="Academic">Academic</option>
                      <option value="Friendly">Friendly</option>
                      <option value="Professional">Professional</option>
                    </select>
                  </div>
                </div>

                {/* Classroom Context */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Classroom Size
                    </label>
                    <select
                      value={generatorConfig.classroom?.size || 'Medium (16-30)'}
                      onChange={e => setGeneratorConfig((config) => ({
                        ...config,
                        classroom: { ...config.classroom, size: e.target.value as ClassroomSize }
                      }))}
                      className="form-select rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                    >
                      <option value="Small (1-15)">Small (1-15)</option>
                      <option value="Medium (16-30)">Medium (16-30)</option>
                      <option value="Large (31-50)">Large (31-50)</option>
                      <option value="Very Large (50+)">Very Large (50+)</option>
                    </select>
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                      Delivery Mode
                    </label>
                    <select
                      value={generatorConfig.classroom?.deliveryMode || 'In-Person'}
                      onChange={e => {
                        const deliveryMode = e.target.value as DeliveryMode;
                        setGeneratorConfig((config) => ({
                          ...config,
                          classroom: { ...config.classroom, deliveryMode, hasInternetAccess: deliveryMode !== 'In-Person' }
                        }));
                      }}
                      className="form-select rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                    >
                      <option value="In-Person">In-Person</option>
                      <option value="Online">Online</option>
                      <option value="Hybrid">Hybrid</option>
                      <option value="Asynchronous">Asynchronous</option>
                    </select>
                  </div>
                </div>

                {/* Teaching Approach */}
                <div className="flex flex-col">
                  <label className="text-sm font-medium text-slate-900 dark:text-white mb-2">
                    Teaching Approach
                  </label>
                  <select
                    value={generatorConfig.teaching?.approach || 'Direct Instruction'}
                    onChange={e => setGeneratorConfig((config) => ({
                      ...config,
                      teaching: { ...config.teaching, approach: e.target.value as TeachingApproach }
                    }))}
                    className="form-select rounded-lg bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-700"
                  >
                    <option value="Direct Instruction">Direct Instruction</option>
                    <option value="Inquiry-Based">Inquiry-Based</option>
                    <option value="Problem-Based Learning">Problem-Based Learning</option>
                    <option value="Project-Based Learning">Project-Based Learning</option>
                    <option value="Flipped Classroom">Flipped Classroom</option>
                    <option value="Socratic Method">Socratic Method</option>
                    <option value="Collaborative Learning">Collaborative Learning</option>
                    <option value="Differentiated Instruction">Differentiated Instruction</option>
                  </select>
                </div>

                {/* Config Summary */}
                <div className="bg-indigo-100 dark:bg-indigo-950 p-3 rounded-lg">
                  <p className="text-xs font-bold text-indigo-900 dark:text-indigo-200 mb-1">Active Configuration:</p>
                  <p className="text-sm text-indigo-700 dark:text-indigo-300">
                    {getConfigSummary(generatorConfig)}
                  </p>
                </div>
              </div>
            )}
          </div>
          <button type="submit" disabled={isLoading} className="w-full btn-primary py-3 rounded-lg font-bold disabled:opacity-50 text-white bg-primary hover:bg-primary-dark flex items-center justify-center gap-2">
            {isLoading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Generating Plan...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">auto_awesome</span>
                Generate Lesson Plan
              </>
            )}
          </button>
        </form>
      </GeneratorLayout>
  );
};
export default LessonPlanGenerator;
