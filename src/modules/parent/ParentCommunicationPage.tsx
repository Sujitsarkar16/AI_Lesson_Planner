import React, { useState, useEffect } from 'react';
import { useAuth } from '@/modules/auth/AuthContext';
import {
  generateAssessmentAlertEmail,
  generateCustomParentMessage,
  downloadEmailTemplate,
  copyEmailToClipboard
} from '@/modules/parent/parentCommunication';
import { generateParentReportStream } from '@/modules/generation/geminiService';
import { useStreamingVerification } from '@/modules/verification/useVerification';
import { GeneratorConfig, DEFAULT_GENERATOR_CONFIG as DEFAULT_CONFIG } from '@/modules/generation/generatorConfig';

const ParentCommunicationPage: React.FC = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'weekly' | 'assessment' | 'custom'>('weekly');
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
  const [emailPreview, setEmailPreview] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  // AI Generation State
  const {
    processChunk,
    finalizeStream,
    resetStream,
    streamBuffer,
    warnings
  } = useStreamingVerification();

  // Update preview as stream comes in
  useEffect(() => {
    if (streamBuffer) {
      setEmailPreview(streamBuffer);
      setShowPreview(true);
    }
  }, [streamBuffer]);

  // Form states
  const [customSubject, setCustomSubject] = useState('');
  const [customMessage, setCustomMessage] = useState('');

  const mockStudents = [
    { id: '1', name: 'John Doe', parentName: 'Jane Doe', parentEmail: 'jane@example.com', grade: 'Class 10', avgScore: 85, quizzesCompleted: 4, pendingAssignments: 2 },
    { id: '2', name: 'Emily Smith', parentName: 'Robert Smith', parentEmail: 'robert@example.com', grade: 'Class 10', avgScore: 92, quizzesCompleted: 5, pendingAssignments: 0 },
    { id: '3', name: 'Michael Johnson', parentName: 'Sarah Johnson', parentEmail: 'sarah@example.com', grade: 'Class 10', avgScore: 68, quizzesCompleted: 3, pendingAssignments: 3 }
  ];

  const handleGenerateWeeklySummary = async () => {
    const selectedStudent = mockStudents.find(s => s.id === selectedStudents[0]);
    if (!selectedStudent) return;

    resetStream();
    setIsGenerating(true);
    setShowPreview(true);
    setEmailPreview('Generating report...');

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekEnd = new Date();

    try {
      const generator = generateParentReportStream({
        studentName: selectedStudent.name,
        grade: selectedStudent.grade,
        weekStart: weekStart.toLocaleDateString(),
        weekEnd: weekEnd.toLocaleDateString(),
        quizzesCompleted: selectedStudent.quizzesCompleted,
        averageScore: selectedStudent.avgScore,
        pendingAssignments: selectedStudent.pendingAssignments,
        strengths: selectedStudent.avgScore >= 80 ? ['Problem Solving', 'Critical Thinking'] : undefined,
        weaknesses: selectedStudent.avgScore < 70 ? ['Time Management', 'Homework Completion'] : undefined,
        teacherName: user?.name || 'Teacher',
        schoolName: 'curriculamIQ School',
        config: DEFAULT_CONFIG
      });

      for await (const chunk of generator) {
        processChunk(chunk);
      }
      await finalizeStream();

    } catch (error) {
      console.error("Generation failed", error);
      setEmailPreview("Error generating report. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleGenerateCustomMessage = () => {
    // Keep custom message manual for now, or could enhance with AI checking
    const selectedStudent = mockStudents.find(s => s.id === selectedStudents[0]);
    if (!selectedStudent) return;

    const email = generateCustomParentMessage(
      customSubject,
      customMessage,
      {
        parentName: selectedStudent.parentName,
        parentEmail: selectedStudent.parentEmail,
        studentName: selectedStudent.name
      },
      user?.name || 'Teacher',
      'curriculamIQ School'
    );

    setEmailPreview(email);
    setShowPreview(true);
  };

  const handleCopyEmail = async () => {
    const success = await copyEmailToClipboard(emailPreview);
    if (success) {
      alert('Email HTML copied to clipboard!');
    }
  };

  const handleDownloadEmail = () => {
    const filename = `parent-email-${Date.now()}`;
    downloadEmailTemplate(emailPreview, filename);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 py-8 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-black font-display text-slate-900 dark:text-white mb-2">
            Parent Communication
          </h1>
          <p className="text-slate-600 dark:text-slate-400">
            Generate and send AI-powered progress updates to parents
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Email Type Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-black shadow-neo-sm p-6">
              <h2 className="text-lg font-black font-display mb-4">Email Type</h2>

              <div className="space-y-3">
                <button
                  onClick={() => setActiveTab('weekly')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${activeTab === 'weekly'
                      ? 'border-brand-blue bg-brand-blue/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl">calendar_today</span>
                    <div>
                      <div className="font-bold">Weekly Summary (AI)</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        AI-generated progress report
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('assessment')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${activeTab === 'assessment'
                      ? 'border-brand-blue bg-brand-blue/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl">assignment</span>
                    <div>
                      <div className="font-bold">Assessment Alert</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Quiz/test result notification
                      </div>
                    </div>
                  </div>
                </button>

                <button
                  onClick={() => setActiveTab('custom')}
                  className={`w-full text-left p-4 rounded-lg border-2 transition-all ${activeTab === 'custom'
                      ? 'border-brand-blue bg-brand-blue/10'
                      : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-2xl">edit</span>
                    <div>
                      <div className="font-bold">Custom Message</div>
                      <div className="text-xs text-slate-600 dark:text-slate-400">
                        Write your own message
                      </div>
                    </div>
                  </div>
                </button>
              </div>

              {/* Student Selection */}
              <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                <h3 className="font-bold mb-3">Select Students</h3>
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {mockStudents.map(student => (
                    <label
                      key={student.id}
                      className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student.id)}
                        onChange={e => {
                          if (e.target.checked) {
                            setSelectedStudents([...selectedStudents, student.id]);
                          } else {
                            setSelectedStudents(selectedStudents.filter(id => id !== student.id));
                          }
                        }}
                        className="rounded text-brand-blue"
                      />
                      <div className="flex-1">
                        <div className="font-medium text-sm">{student.name}</div>
                        <div className="text-xs text-slate-500">{student.parentEmail}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Email Composer */}
          <div className="lg:col-span-2">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border-2 border-black shadow-neo-sm p-6">
              <h2 className="text-lg font-black font-display mb-4">Compose Email</h2>

              {/* Weekly Summary Form */}
              {activeTab === 'weekly' && (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      <strong>AI Report Generator</strong> will create a personalized summary including:
                    </p>
                    <ul className="text-sm text-blue-700 dark:text-blue-300 mt-2 ml-4 list-disc">
                      <li>Academic performance summary</li>
                      <li>Key strengths identification</li>
                      <li>Targeted areas for improvement</li>
                      <li>Tone-matched parent communication</li>
                    </ul>
                  </div>

                  <button
                    onClick={handleGenerateWeeklySummary}
                    disabled={selectedStudents.length === 0 || isGenerating}
                    className="w-full py-3 bg-brand-blue text-white rounded-lg font-bold hover:bg-brand-blue/80 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-2 border-black shadow-neo flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <span className="material-symbols-outlined text-lg animate-spin">progress_activity</span>
                        Generating...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">auto_awesome</span>
                        Generate AI Report
                      </>
                    )}
                  </button>
                </div>
              )}

              {/* Assessment Alert & Custom Message Forms (Keep existing UI or simplify) */}
              {(activeTab === 'assessment' || activeTab === 'custom') && (
                // ... (Keep existing simple logic for these or leave as is)
                <div className="text-center py-8 text-slate-500 italic">
                  {activeTab === 'assessment' && "Assessment alerts are automatic templates."}
                  {activeTab === 'custom' && (
                    <div className="space-y-4 text-left not-italic">
                      <div>
                        <label className="block text-sm font-bold">Subject</label>
                        <input
                          className="w-full border p-2 rounded"
                          value={customSubject}
                          onChange={e => setCustomSubject(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold">Message</label>
                        <textarea
                          className="w-full border p-2 rounded h-32"
                          value={customMessage}
                          onChange={e => setCustomMessage(e.target.value)}
                        />
                      </div>
                      <button onClick={handleGenerateCustomMessage} className="btn-primary w-full py-2 bg-brand-blue text-white rounded">Generate</button>
                    </div>
                  )}
                </div>
              )}

              {/* Preview Section */}
              {showPreview && emailPreview && (
                <div className="mt-6 pt-6 border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold">Email Preview</h3>
                    <div className="flex gap-2">
                      {warnings.length > 0 && (
                        <div className="text-xs text-yellow-600 bg-yellow-100 px-2 py-1 rounded flex items-center">
                          <span className="material-symbols-outlined text-xs mr-1">warning</span>
                          {warnings.length} issues detected
                        </div>
                      )}
                      <button
                        onClick={handleCopyEmail}
                        className="px-4 py-2 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-bold transition-colors flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">content_copy</span>
                        Copy HTML
                      </button>
                      <button
                        onClick={handleDownloadEmail}
                        className="px-4 py-2 bg-brand-yellow text-black hover:bg-brand-yellow/80 rounded-lg text-sm font-bold transition-colors border-2 border-black flex items-center gap-2"
                      >
                        <span className="material-symbols-outlined text-sm">download</span>
                        Download
                      </button>
                    </div>
                  </div>

                  <div className="border-2 border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden bg-white p-4 prose max-w-none">
                    <pre className="whitespace-pre-wrap break-words font-sans">{emailPreview}</pre>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ParentCommunicationPage;
