


import React from 'react';
import LessonPlanRenderer from './LessonPlanRenderer';
import { AppType } from '../types';
import ReactFlowRenderer from './ReactFlowRenderer';

interface DynamicPreviewProps {
  templateId: string | null;
  appType: AppType;
  generatedContent: string;
  imageUrl?: string; // New Prop for Image
  data: any; // Flexible data object for form fields (School, Teacher, etc.)
}

const DynamicPreview: React.FC<DynamicPreviewProps> = ({ templateId, appType, generatedContent, imageUrl, data }) => {
  
  // --- CONCEPT MAP RENDERER ---
  const renderConceptMap = () => {
    try {
      if (!generatedContent) return <div className="p-4 text-center text-slate-500">No content available for the concept map.</div>;
      const parsedData = JSON.parse(generatedContent);
      if (parsedData.nodes && parsedData.edges) {
        return <ReactFlowRenderer nodes={parsedData.nodes} edges={parsedData.edges} />;
      }
      return <div className="p-4 text-red-500">Invalid concept map data: 'nodes' or 'edges' missing.</div>;
    } catch (e) {
      console.error("Failed to parse concept map JSON:", e);
      return <div className="p-4 text-red-500">Error: Could not parse the generated concept map data.</div>;
    }
  };

  // --- LESSON PLAN TEMPLATES ---

  // 1. PURPLE TABLE (Simple / Small Group)
  const renderPurpleTable = (titleOverride?: string) => (
    <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-[#f3f0fa] p-8 shadow-lg font-sans">
      <div className="flex justify-between items-start mb-4">
        {/* Branding Removed */}
        <div className="flex items-center gap-2">
        </div>
      </div>

      <div className="border-2 border-black bg-white">
        {/* Header */}
        <div className="bg-[#b794f4] border-b-2 border-black p-3 text-center">
           <h1 className="text-xl font-bold text-black uppercase tracking-wide">{data.title || titleOverride || 'Simple lesson plan'}</h1>
        </div>
        
        {/* Metadata Grid */}
        {templateId === 'small-group-purple-lp' ? (
           <>
            <div className="flex border-b-2 border-black">
              <div className="w-1/2 border-r-2 border-black p-2">
                 <span className="block text-xs font-bold mb-1">Date:</span>
                 <span>{data.date}</span>
              </div>
              <div className="w-1/2 p-2">
                 <span className="block text-xs font-bold mb-1">Group name:</span>
                 <span>{data.grade}</span>
              </div>
            </div>
           </>
        ) : (
          <>
            <div className="p-2 border-b-2 border-black">
              <span className="block text-xs font-bold mb-1">Teacher:</span>
              <span>{data.teacher}</span>
            </div>
            <div className="flex border-b-2 border-black">
              <div className="w-1/2 border-r-2 border-black p-2">
                 <span className="block text-xs font-bold mb-1">Date:</span>
                 <span>{data.date}</span>
              </div>
              <div className="w-1/2 p-2">
                 <span className="block text-xs font-bold mb-1">Subject:</span>
                 <span>{data.subject}</span>
              </div>
            </div>
            <div className="flex border-b-2 border-black">
              <div className="w-1/2 border-r-2 border-black p-2">
                 <span className="block text-xs font-bold mb-1">Grade:</span>
                 <span>{data.grade}</span>
              </div>
              <div className="w-1/2 p-2">
                 <span className="block text-xs font-bold mb-1">Class/Topic:</span>
                 <span>{data.topic}</span>
              </div>
            </div>
          </>
        )}

        {/* Content Area */}
        <div className="p-0">
           <style>{`
             .purple-table-content h2 { 
                font-size: 14px; 
                font-weight: bold; 
                border-top: 2px solid black; 
                border-bottom: 2px solid black; 
                margin: 0; 
                padding: 8px; 
                background: #fff;
             }
             .purple-table-content h2:first-child { border-top: none; }
             .purple-table-content p, .purple-table-content ul, .purple-table-content ol { 
                padding: 12px; 
                margin: 0; 
                min-height: 100px;
             }
           `}</style>
           <div className="purple-table-content">
             {imageUrl && (
                <div className="p-4 flex justify-center border-b-2 border-black">
                   <img src={imageUrl} alt="Visual Aid" className="max-h-64 object-contain border border-black shadow-sm" />
                </div>
             )}
             {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : (
                <>
                  <h2>Objectives:</h2><div className="h-24"></div>
                  <h2>Activities:</h2><div className="h-24"></div>
                  <h2>Assessment:</h2><div className="h-24"></div>
                </>
             )}
           </div>
        </div>
      </div>
    </div>
  );

  // 2. DAILY GRID (Complex)
  const renderDailyGrid = () => (
    <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-white p-8 shadow-lg font-sans border border-slate-200">
       <div className="flex justify-center mb-6">
       </div>

       <div className="border-2 border-black">
          <div className="text-center p-2 font-bold text-lg border-b-2 border-black">{data.title || 'Daily Lesson Plan'}</div>
          
          <div className="flex border-b-2 border-black">
             <div className="flex-1 p-2 border-r-2 border-black"><span className="font-bold mr-2">Grade:</span> {data.grade}</div>
             <div className="flex-1 p-2 border-r-2 border-black"><span className="font-bold mr-2">Subject:</span> {data.subject}</div>
             <div className="flex-1 p-2"><span className="font-bold mr-2">Date:</span> {data.date}</div>
          </div>

          <div className="flex border-b-2 border-black">
             <div className="w-1/2 p-2 border-r-2 border-black h-24">
               <div className="font-bold mb-1">Topic:</div>
               <div>{data.topic}</div>
             </div>
             <div className="w-1/2 p-2 h-24">
               <div className="font-bold mb-1">Lesson Focus:</div>
               <div>{data.title}</div>
             </div>
          </div>

          {/* Content Injection */}
          <div className="daily-grid-content">
             <style>{`
                .daily-grid-content h2 { 
                  font-size: 14px; 
                  font-weight: bold; 
                  padding: 4px 8px; 
                  background: #f0f0f0; 
                  border-top: 2px solid black; 
                  border-bottom: 2px solid black;
                  margin: 0;
                }
                .daily-grid-content p, .daily-grid-content ul { padding: 8px; margin: 0; }
                .daily-grid-content table { width: 100%; border-collapse: collapse; }
                .daily-grid-content th, .daily-grid-content td { border: 1px solid black; padding: 4px; }
             `}</style>
             
             {imageUrl && (
                <div className="p-4 flex justify-center border-b-2 border-black bg-gray-50">
                   <img src={imageUrl} alt="Visual Aid" className="max-h-64 object-contain border border-black" />
                </div>
             )}
              {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : <div className="p-10 text-center text-gray-400">Content will populate here...</div>}
          </div>
       </div>
    </div>
  );

  // 3. BI-WEEKLY GRID (Landscape-ish feel)
  const renderBiWeeklyGrid = () => (
     <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-white p-8 shadow-lg font-sans">
       <div className="flex justify-center mb-6">
       </div>

       <div className="border-2 border-black">
          <div className="text-center p-2 font-bold text-lg border-b-2 border-black">{data.title || 'Bi-weekly lesson plan'}</div>
          
          <div className="flex border-b-2 border-black">
             <div className="w-1/2 p-2 border-r-2 border-black"><span className="font-bold mr-2">Teacher:</span> {data.teacher}</div>
             <div className="w-1/2 p-2"><span className="font-bold mr-2">Course:</span> {data.subject}</div>
          </div>
          
           <div className="p-2 border-b-2 border-black">
             <span className="font-bold mr-2">Unit:</span> {data.topic}
          </div>

           <div className="flex border-b-2 border-black">
             <div className="w-1/3 p-2 border-r-2 border-black h-16"><span className="font-bold block">Lesson title:</span> {data.title}</div>
             <div className="w-1/3 p-2 border-r-2 border-black h-16"><span className="font-bold block">Week(s):</span> {data.duration}</div>
             <div className="w-1/3 p-2 h-16"><span className="font-bold block">Dates:</span> {data.date}</div>
          </div>

          <div className="biweekly-content">
             <style>{`
                .biweekly-content { display: flex; flex-wrap: wrap; }
                .biweekly-content h2 { width: 100%; border-bottom: 2px solid black; background: #f9f9f9; padding: 4px; font-size: 14px; font-weight: bold; margin: 0; border-top: 2px solid black; }
                .biweekly-content > div { width: 100%; padding: 8px; }
             `}</style>
             
             {imageUrl && (
                <div className="w-full border-b-2 border-black p-4 flex justify-center bg-gray-50">
                   <img src={imageUrl} alt="Visual Aid" className="max-h-52 object-contain border border-black" />
                </div>
             )}
             {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : <div className="p-10 text-center text-gray-400">Content will populate here...</div>}
          </div>
       </div>
     </div>
  );


  // --- SYLLABUS TEMPLATES ---

  // 1. RED HEADER SYLLABUS
  const renderRedHeaderSyllabus = () => (
    <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-white p-12 shadow-lg font-sans text-slate-900">
       <h1 className="text-3xl font-bold text-[#c00000] mb-1">{data.course || '[Course Name] Syllabus'}</h1>
       <p className="text-lg font-bold text-slate-700 mb-8">{data.date || '[Semester and Year]'}</p>

       <div className="mb-8">
          <h3 className="font-bold text-slate-800 mb-2 border-b border-gray-300 pb-1">Instructor Information</h3>
          <div className="grid grid-cols-3 gap-8">
             <div>
                <p className="font-bold text-[#c00000] text-sm mb-1">Instructor</p>
                <p className="text-sm">{data.instructor || '[Instructor Name]'}</p>
             </div>
             <div>
                <p className="font-bold text-[#c00000] text-sm mb-1">Email</p>
                <p className="text-sm">{data.email || '[Email Address]'}</p>
             </div>
             <div>
                <p className="font-bold text-[#c00000] text-sm mb-1">Office Location & Hours</p>
                <p className="text-sm">{data.office || '[Location, Hours]'}</p>
             </div>
          </div>
       </div>

       <div className="red-syllabus-content">
          <style>{`
            .red-syllabus-content h2 { color: #c00000; font-size: 16px; font-weight: bold; margin-top: 24px; margin-bottom: 8px; }
            .red-syllabus-content p { font-size: 14px; margin-bottom: 12px; line-height: 1.5; }
            .red-syllabus-content table { width: 100%; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
            .red-syllabus-content th { text-align: left; color: #c00000; font-weight: bold; padding: 6px 0; border-bottom: 2px solid #eab308; } /* Yellowish underline in typical word templates or just standard red */
            .red-syllabus-content th { border-bottom: 1px solid #c00000; }
            .red-syllabus-content td { padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
          `}</style>
          {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : (
            <>
               <h2 className="text-[#c00000] font-bold">General Information</h2>
               <p className="italic text-gray-400">Description...</p>
               <h2 className="text-[#c00000] font-bold">Course Materials</h2>
               <p className="italic text-gray-400">Required text...</p>
            </>
          )}
       </div>
    </div>
  );

  // 2. CLOCK HOURS / FORMAL SYLLABUS
  const renderClockHoursSyllabus = () => (
    <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-white p-12 shadow-lg font-serif text-black">
      <div className="text-center mb-8">
         <h2 className="font-bold text-lg">{data.school || 'College Name'}</h2>
         <h1 className="font-bold text-xl mt-1">{data.title || 'Syllabus Name'}</h1>
      </div>

      <div className="grid grid-cols-2 gap-x-12 gap-y-4 text-sm mb-8">
         <div className="flex gap-2">
            <span className="font-bold uppercase min-w-[100px]">COURSE:</span>
            <span>{data.course}</span>
         </div>
         <div className="flex gap-2">
            <span className="font-bold uppercase min-w-[50px]">DATE:</span>
            <span>{data.date}</span>
         </div>
         <div className="flex gap-2 col-span-2">
            <span className="font-bold uppercase min-w-[100px]">INSTRUCTOR:</span>
            <span>{data.instructor}</span>
         </div>
         <div className="flex gap-2 col-span-2">
            <span className="font-bold uppercase min-w-[100px]">DESCRIPTION:</span>
            <span className="italic">See below</span>
         </div>
      </div>

      <div className="clock-hours-content">
         <style>{`
           .clock-hours-content h2 { font-size: 14px; font-weight: bold; text-transform: uppercase; margin-top: 24px; margin-bottom: 4px; }
           .clock-hours-content p { font-size: 13px; margin-bottom: 12px; line-height: 1.4; }
           .clock-hours-content table { width: 100%; border: 1px solid black; border-collapse: collapse; margin-top: 16px; font-size: 12px; }
           .clock-hours-content th { border: 1px solid black; background-color: #e5e7eb; padding: 4px; text-align: center; }
           .clock-hours-content td { border: 1px solid black; padding: 4px; }
         `}</style>
         {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : <div className="h-40 bg-gray-50 border border-dashed border-gray-300"></div>}
      </div>

      <div className="mt-12 text-xs italic text-gray-600 border-t pt-4">
         Services for Students with Disabilities: Students may receive reasonable accommodations if they have a diagnosed disability...
      </div>
    </div>
  );

  // 3. POLICY / COMPLIANCE SYLLABUS
  const renderPolicySyllabus = () => (
    <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-white p-10 shadow-lg font-sans text-slate-900">
       <div className="text-center mb-8">
          <h1 className="text-xl font-bold uppercase mb-2">SYLLABUS TEMPLATE – MINIMUM REQUIRED INFORMATION</h1>
       </div>
       
       <div className="mb-6 text-sm">
          <p className="mb-2"><span className="font-bold underline">BASIC INFORMATION</span></p>
          <p className="font-bold">{data.course || 'Course prefix, catalog number, and title:'}</p>
          <p className="mb-4 text-sm">{data.title}</p>
          
          <p className="font-bold">Term and year:</p>
          <p className="mb-4 text-sm">{data.date}</p>

          <p className="font-bold">Instructor's name:</p>
          <p className="mb-4 text-sm">{data.instructor}</p>
       </div>

       <div className="policy-content">
          <style>{`
             .policy-content h2 { font-size: 14px; font-weight: bold; text-decoration: underline; text-transform: uppercase; margin-top: 24px; margin-bottom: 8px; font-family: sans-serif; }
             .policy-content p { font-size: 13px; margin-bottom: 12px; line-height: 1.5; }
             .policy-content table { width: 100%; border: 1px solid black; border-collapse: collapse; margin-top: 12px; font-size: 13px; }
             .policy-content th { border: 1px solid black; padding: 4px; text-align: center; font-weight: bold; background: #fff; }
             .policy-content td { border: 1px solid black; padding: 4px; }
          `}</style>
          {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : <div className="h-40 bg-gray-50"></div>}
       </div>
    </div>
  );

  // --- STANDARD FALLBACKS ---

  const renderAcademicSerif = () => (
    <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-white text-black font-serif p-12 shadow-lg relative">
      <div className="text-center border-b-2 border-black pb-6 mb-8">
        <h1 className="text-2xl font-bold uppercase tracking-wider mb-2">{data.title || data.examName || 'DOCUMENT TITLE'}</h1>
        <div className="flex justify-center gap-8 text-sm font-semibold">
          {data.subtitle && <span>{data.subtitle}</span>}
          {data.date && <span>{data.date}</span>}
          {data.code && <span>Code: {data.code}</span>}
        </div>
      </div>
      {(appType === 'paper' || appType === 'syllabus') && (
        <div className="grid grid-cols-2 gap-x-12 gap-y-2 mb-8 text-sm border-b border-black pb-6">
           {data.school && <div className="flex justify-between"><span>Institution:</span> <span className="font-bold">{data.school}</span></div>}
           {data.course && <div className="flex justify-between"><span>Course:</span> <span className="font-bold">{data.course}</span></div>}
           {data.duration && <div className="flex justify-between"><span>Duration:</span> <span className="font-bold">{data.duration}</span></div>}
           {data.marks && <div className="flex justify-between"><span>Max Marks:</span> <span className="font-bold">{data.marks}</span></div>}
           {data.instructor && <div className="flex justify-between"><span>Instructor:</span> <span className="font-bold">{data.instructor}</span></div>}
        </div>
      )}
      <div className="text-justify leading-relaxed text-[11pt]">
         {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : <p className="text-center text-gray-400 italic mt-20">Content will appear here...</p>}
      </div>
    </div>
  );

  const renderTwoColumn = () => (
    <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-white text-slate-900 font-sans text-xs p-8 shadow-lg relative">
       <div className="flex justify-between items-center border-b-2 border-slate-800 pb-2 mb-4">
          <div className="font-bold text-lg uppercase">{data.title || 'MOCK EXAM'}</div>
          <div className="flex flex-col text-right text-[10px]">
             <span className="font-bold">{data.school || 'INSTITUTE'}</span>
             <span>Time: {data.duration} | Marks: {data.marks}</span>
          </div>
       </div>
       <div className="column-wrapper">
          <style>{`
            .column-wrapper { column-count: 2; column-gap: 2rem; column-rule: 1px solid #e2e8f0; }
            .column-wrapper h1, .column-wrapper h2 { column-span: all; background: #1e293b; color: white; padding: 4px 8px; font-size: 14px; margin-top: 0; }
            .column-wrapper h3 { font-size: 12px; font-weight: 800; border-bottom: 1px solid #cbd5e1; margin-top: 12px; }
            .column-wrapper p, .column-wrapper li { margin-bottom: 4px; line-height: 1.4; }
          `}</style>
          {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : <p className="text-center text-gray-400 mt-20 col-span-all">Processing...</p>}
       </div>
    </div>
  );

  const renderColorful = () => (
    <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-white shadow-lg relative overflow-hidden">
       <div className="h-4 w-full bg-gradient-to-r from-brand-blue via-brand-pink to-brand-yellow"></div>
       <div className="p-10">
          <div className="flex items-center gap-6 mb-8 bg-slate-50 p-6 rounded-2xl border-2 border-slate-100">
             <div className="size-16 rounded-xl bg-brand-yellow flex items-center justify-center text-3xl shadow-neo-sm border-2 border-black">
                {appType === 'lesson-plan' ? '📖' : appType === 'quiz' ? '✅' : '📝'}
             </div>
             <div>
                <h1 className="text-3xl font-black font-display text-slate-900 uppercase tracking-tight">{data.title || 'Document'}</h1>
                <p className="text-slate-500 font-medium">{data.subject} • {data.grade}</p>
             </div>
          </div>
          <div className="colorful-content">
             <style>{`
                .colorful-content h1 { display: none; }
                .colorful-content h2 { background: #0f172a; color: white; padding: 8px 16px; border-radius: 8px; font-family: 'Space Grotesk', sans-serif; font-size: 16px; margin-top: 24px; box-shadow: 4px 4px 0px 0px rgba(0,0,0,1); }
                .colorful-content h3 { color: #7c3aed; font-weight: 800; font-size: 14px; margin-top: 16px; border-left: 4px solid #7c3aed; padding-left: 8px; }
                .colorful-content table { border-radius: 8px; overflow: hidden; border: 2px solid #e2e8f0; font-size: 13px; }
                .colorful-content th { background: #f1f5f9; color: #475569; text-transform: uppercase; font-size: 11px; letter-spacing: 0.05em; }
             `}</style>
             {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : <div className="h-40 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400">Content loading...</div>}
          </div>
       </div>
    </div>
  );

  const renderDarkGame = () => (
    <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-[#111827] text-white p-10 shadow-lg relative font-sans">
       <div className="text-center mb-10">
          <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 mb-2">{data.title || 'QUIZ TIME'}</h1>
          <div className="inline-block px-4 py-1 rounded-full bg-white/10 text-xs font-mono text-blue-300 border border-white/20">
             {data.subject} | {data.grade}
          </div>
       </div>
       <div className="game-content">
          <style>{`
             .game-content p { font-size: 14px; color: #9ca3af; margin-bottom: 12px; }
             .game-content h2 { color: #60a5fa; font-size: 18px; font-weight: bold; border-bottom: 1px solid #1f2937; padding-bottom: 8px; margin-top: 32px; }
             .game-content li { margin-bottom: 8px; }
             .game-content code { background: #374151; color: #fbbf24; padding: 2px 6px; rounded; }
          `}</style>
          {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : <p className="text-center text-gray-600">Generating questions...</p>}
       </div>
    </div>
  );

  const renderFormalAssessment = () => (
    <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-white text-black font-sans p-12 shadow-lg relative">
      {/* Formal Header Table Style */}
      <div className="border border-black mb-8">
         <div className="flex border-b border-black">
            <div className="w-48 p-2 border-r border-black font-bold bg-gray-50 text-sm">Institution</div>
            <div className="flex-1 p-2 text-sm">{data.school}</div>
         </div>
         <div className="flex border-b border-black">
            <div className="w-48 p-2 border-r border-black font-bold bg-gray-50 text-sm">Assessment</div>
            <div className="flex-1 p-2 text-sm">{data.title}</div>
         </div>
         <div className="flex">
            <div className="w-32 p-2 border-r border-black font-bold bg-gray-50 text-sm">Class</div>
            <div className="w-32 p-2 border-r border-black text-sm">{data.grade}</div>
            <div className="w-32 p-2 border-r border-black font-bold bg-gray-50 text-sm">Subject</div>
            <div className="flex-1 p-2 text-sm">{data.subject}</div>
         </div>
      </div>

      <div className="formal-quiz-content">
        <style>{`
          .formal-quiz-content table { 
             width: 100%; 
             border-collapse: collapse; 
             font-size: 12px;
             border: none;
          }
          .formal-quiz-content th { 
             border-bottom: 2px solid #000; 
             text-align: left; 
             padding: 8px;
             font-weight: bold;
             background: white !important;
             color: black !important;
          }
          .formal-quiz-content td { 
             border-bottom: 1px solid #eee; 
             padding: 12px 8px; 
             vertical-align: top;
          }
          /* Custom formatting for the table coming from markdown */
          .formal-quiz-content tr:nth-child(even) { background-color: #f9fafb; }
        `}</style>
        {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : <div className="h-40 border-2 border-dashed border-gray-200 rounded flex items-center justify-center text-gray-400">Content loading...</div>}
      </div>
    </div>
  );

  const renderStandardLesson = () => (
      <div className="bg-white text-black font-sans text-sm w-full max-w-[210mm] mx-auto min-h-[297mm] shadow-lg flex flex-col relative p-10">
        <div className="flex justify-between items-start mb-6">
           <div>
             <h2 className="text-sm font-bold tracking-widest text-gray-500 uppercase mb-1">WIL002</h2>
             <h1 className="text-3xl font-normal text-black leading-tight">Lesson Plan Template</h1>
           </div>
        </div>
        <div className="border border-black mb-8">
           <div className="flex border-b border-black">
              <div className="w-48 p-2 border-r border-black font-bold bg-gray-50">Teacher</div>
              <div className="flex-1 p-2">{data.teacher}</div>
              <div className="w-24 p-2 border-l border-black font-bold bg-gray-50">School</div>
              <div className="w-48 p-2 border-l border-black">{data.school}</div>
           </div>
           <div className="flex border-b border-black">
              <div className="w-32 p-2 border-r border-black font-bold bg-gray-50">Duration</div>
              <div className="w-32 p-2 border-r border-black">{data.duration}</div>
              <div className="w-16 p-2 font-bold bg-gray-50">Grade</div>
              <div className="flex-1 p-2 border-l border-black">{data.grade}</div>
           </div>
           <div className="flex">
              <div className="w-full">
                 <div className="p-1 text-xs text-gray-500 px-2 pt-2">Lesson Title/Focus</div>
                 <div className="px-2 pb-2 font-medium text-lg">{data.title}</div>
              </div>
           </div>
        </div>
        <div className="lesson-template-content">
            <style>{`
              .lesson-template-content h2 { font-size: 14px !important; background-color: #f3f4f6; border: 1px solid #000; padding: 4px 8px; margin-top: 24px !important; margin-bottom: 8px !important; text-transform: uppercase; color: #000 !important; display: block; font-weight: 700 !important; }
              .lesson-template-content p { margin-bottom: 8px !important; line-height: 1.4 !important; color: #000 !important; font-size: 12px !important; }
              .lesson-template-content table { font-size: 11px !important; border: 1px solid #000 !important; width: 100%; margin-top: 12px !important; border-collapse: collapse !important; }
              .lesson-template-content td, .lesson-template-content th { border: 1px solid #000 !important; padding: 6px !important; color: #000 !important; vertical-align: top; }
              .lesson-template-content th { background-color: #e5e7eb !important; font-weight: 700 !important; }
            `}</style>
            
            {imageUrl && (
              <div className="mb-6 flex justify-center">
                 <img src={imageUrl} alt="Visual Aid" className="max-h-64 object-contain border border-black shadow-sm" />
              </div>
            )}

            {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : <div className="h-20 bg-gray-50 rounded"></div>}
        </div>
      </div>
  );

  // --- STUDY NOTES RENDERER ---
  const renderStudyNotes = () => (
    <div className="w-full max-w-[210mm] mx-auto min-h-[297mm] bg-white text-slate-900 font-sans p-10 shadow-lg relative">
       {/* Header */}
       <div className="flex justify-between items-start border-b-2 border-indigo-500 pb-4 mb-6">
          <div>
            <h2 className="text-sm font-bold text-indigo-500 uppercase tracking-widest mb-1">Study Notes</h2>
            <h1 className="text-3xl font-black font-display text-slate-900">{data.title || 'Topic Notes'}</h1>
          </div>
          <div className="text-right">
             <div className="text-sm font-bold text-slate-500">{data.subject}</div>
             <div className="text-sm text-slate-400">{data.grade}</div>
          </div>
       </div>

       {/* Content */}
       <div className="study-notes-content">
          <style>{`
             .study-notes-content h1 { display: none; } /* Hide duplicate title */
             .study-notes-content h2 { 
                font-size: 18px; 
                font-weight: 800; 
                color: #4f46e5; /* Indigo-600 */
                margin-top: 24px; 
                margin-bottom: 8px;
                border-bottom: 1px solid #e0e7ff;
                padding-bottom: 4px;
             }
             .study-notes-content h3 {
                font-size: 15px;
                font-weight: 700;
                color: #1e1b4b; /* Indigo-950 */
                margin-top: 16px;
             }
             .study-notes-content p { font-size: 13px; line-height: 1.6; color: #374151; margin-bottom: 12px; }
             .study-notes-content ul { list-style-type: disc; padding-left: 20px; font-size: 13px; margin-bottom: 12px; }
             .study-notes-content li { margin-bottom: 4px; color: #374151; }
             .study-notes-content strong { color: #1e1b4b; font-weight: 700; }
             .study-notes-content blockquote {
                border-left: 4px solid #4f46e5;
                background-color: #eef2ff;
                padding: 12px;
                margin: 16px 0;
                font-style: italic;
                font-size: 13px;
                border-radius: 0 8px 8px 0;
             }
             .study-notes-content table {
                width: 100%;
                border-collapse: collapse;
                margin: 16px 0;
                font-size: 13px;
                box-shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
             }
             .study-notes-content th {
                background-color: #4f46e5;
                color: white;
                text-align: left;
                padding: 8px 12px;
                font-weight: 700;
             }
             .study-notes-content td {
                border-bottom: 1px solid #e5e7eb;
                padding: 8px 12px;
                color: #374151;
             }
             .study-notes-content tr:nth-child(even) { background-color: #f9fafb; }
          `}</style>
          {generatedContent ? <LessonPlanRenderer content={generatedContent} /> : (
             <div className="space-y-4">
                <div className="h-6 w-3/4 bg-gray-100 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-50 rounded animate-pulse"></div>
                <div className="h-4 w-full bg-gray-50 rounded animate-pulse"></div>
                <div className="h-32 w-full bg-indigo-50/30 border border-dashed border-indigo-100 rounded flex items-center justify-center text-indigo-300">Notes loading...</div>
             </div>
          )}
       </div>
    </div>
  );


  // --- ROUTING LOGIC ---
  if (appType === 'concept-map') {
    return renderConceptMap();
  }
  
  if (appType === 'lesson-plan') {
     if (templateId === 'simple-purple-lp') return renderPurpleTable();
     if (templateId === 'small-group-purple-lp') return renderPurpleTable('Small group lesson plan');
     if (templateId === 'daily-grid-lp') return renderDailyGrid();
     if (templateId === 'bi-weekly-grid-lp') return renderBiWeeklyGrid();
     return renderStandardLesson();
  }

  // Paper & Syllabus
  if (appType === 'paper' || appType === 'syllabus') {
    if (appType === 'syllabus') {
        if (templateId === 'red-header-syl') return renderRedHeaderSyllabus();
        if (templateId === 'clock-hours-syl') return renderClockHoursSyllabus();
        if (templateId === 'policy-syl') return renderPolicySyllabus();
    }
    if (templateId?.includes('entrance')) return renderTwoColumn();
    return renderAcademicSerif();
  }

  // Quiz
  if (appType === 'quiz') {
    if (templateId?.includes('rapid')) return renderDarkGame();
    // Default to Formal Assessment for table based MCQs
    return renderFormalAssessment();
  }

  // Study Notes
  if (appType === 'study-notes') {
    return renderStudyNotes();
  }

  return renderStandardLesson();
};

export default DynamicPreview;