/**
 * Gemini Service - Direct API Integration
 * Handles all LLM-based content generation using Google Gemini API
 * Model: Configurable via environment (default: gemini-2.0-flash-exp)
 */

import { apiRequestStream } from '@/shared/api/apiClient';
import { GeneratorConfig, configToPromptInstructions } from '@/modules/generation/generatorConfig';

/**
 * Generation options accepted by the authenticated API. The server applies
 * strict limits before forwarding a request to Gemini.
 */
export interface GenerationOptions {
  temperature?: number;
  maxTokens?: number;
}

const DEFAULT_OPTIONS: GenerationOptions = {
  temperature: 0.7,
  maxTokens: 6000,
};

/**
 * Generate content through the authenticated server so the Gemini credential
 * and quota enforcement never reach the browser.
 */
export async function generateContent(
  prompt: string,
  options: GenerationOptions = {}
): Promise<string> {
  let content = '';
  for await (const chunk of generateContentStream(prompt, options)) content += chunk;
  return content;
}

/**
 * Stream generated content through the authenticated API.
 */
export async function* generateContentStream(
  prompt: string,
  options: GenerationOptions = {}
): AsyncGenerator<string, void, unknown> {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };
  try {
    yield* apiRequestStream('/generate', { prompt, options: mergedOptions });
  } catch (error: any) {
    console.error('Secure generation error:', error);
    throw new Error(error?.message || 'Failed to generate content.');
  }
}

/**
 * Generate lesson plan content with streaming
 */
export async function* generateLessonPlanStream(params: {
  grade: string;
  subject: string;
  topic: string;
  title: string;
  duration: string;
  templateContext?: string;
  difficultyAdjustments?: string[];
  curriculumBoard?: string;
  bloomLevels?: string[];
  emphasis?: string;
  learningObjectives?: string;
  config?: GeneratorConfig;
}): AsyncGenerator<string, void, unknown> {
  const {
    grade, subject, topic, title, duration,
    templateContext, difficultyAdjustments,
    curriculumBoard, bloomLevels, emphasis,
    learningObjectives, config
  } = params;

  let prompt = `Create a comprehensive lesson plan.
Context: Grade: ${grade}, Subject: ${subject}, Topic: ${topic}, Title: ${title}, Duration: ${duration}.

`;

  if (config) {
    prompt += configToPromptInstructions(config);
  }

  if (curriculumBoard) {
    prompt += `CURRICULUM ALIGNMENT: This lesson must align with ${curriculumBoard} standards for Grade ${grade} ${subject}.\n\n`;
  }

  if (learningObjectives) {
    prompt += `LEARNING OBJECTIVES:\n${learningObjectives}\n\n`;
  }

  if (bloomLevels && bloomLevels.length > 0) {
    prompt += `BLOOM'S TAXONOMY REQUIREMENTS:\nTarget cognitive levels: ${bloomLevels.join(', ')}.\nEnsure activities and assessments are designed to develop these specific levels.\n\n`;
  }

  if (emphasis) {
    prompt += `PRIMARY EMPHASIS: ${emphasis} understanding.\nStructure the lesson to prioritize ${emphasis.toLowerCase()} development.\n\n`;
  }

  prompt += `TEMPLATE INSTRUCTIONS: ${templateContext || 'Standard structure required.'}

Structure requirements (Unless overridden by Template):
1. ## Learning Intentions (Must be CLEAR, MEASURABLE, and aligned with ${bloomLevels && bloomLevels.length > 0 ? bloomLevels.join('/') : 'appropriate Bloom\'s'} levels)
2. ## Assumed Knowledge
3. ## Syllabus Outcomes${curriculumBoard ? ` (${curriculumBoard} Standards)` : ''}
4. ## Assessment (Formative & Summative - Must assess the stated Bloom levels)
5. ## Resources
6. ## Activities & Teaching Sequence (Markdown Table with columns: Timing, Teacher Activity, Student Activity, Resources)
   - Each activity must clearly map to a learning intention
   - Activities must target the specified Bloom levels
7. ## Lesson Reflection (Leave blank space for handwritten notes)

${difficultyAdjustments && difficultyAdjustments.length > 0 ? `Include differentiation for: ${difficultyAdjustments.join(', ')}` : ''}

Format: Professional Markdown. Use H2 (##) for section titles.`;

  yield* generateContentStream(prompt, { temperature: 0.7, maxTokens: 6000 });
}

/**
 * Generate syllabus content with streaming
 */
export async function* generateSyllabusStream(params: {
  subject: string;
  courseTitle: string;
  courseCode: string;
  instructor?: string;
  instructorName?: string;
  term: string;
  level?: string;
  duration?: string;
  institution?: string;
  description?: string;
  prerequisites?: string;
  objectives?: string;
  topics?: string;
  teachingApproach?: string;
  materials?: string;
  additionalRequests?: string;
  templateContext?: string;
  config?: GeneratorConfig;
}): AsyncGenerator<string, void, unknown> {
  const {
    subject,
    courseTitle,
    courseCode,
    instructor,
    instructorName,
    term,
    level,
    duration,
    institution,
    description,
    prerequisites,
    objectives,
    topics,
    teachingApproach,
    materials,
    additionalRequests,
    templateContext,
    config
  } = params;

  const actualInstructor = instructorName || instructor;

  let prompt = `Create a detailed course syllabus. Course: ${courseTitle} (${courseCode}), Subject: ${subject}, Instructor: ${actualInstructor}, Term: ${term}${level ? `, Level: ${level}` : ''}${duration ? `, Duration: ${duration} weeks` : ''}${institution ? `, Institution: ${institution}` : ''}.

`;

  if (description) {
    prompt += `Course Description: ${description}\n\n`;
  }

  if (prerequisites) {
    prompt += `Prerequisites: ${prerequisites}\n\n`;
  }

  if (objectives) {
    prompt += `Learning Objectives: ${objectives}\n\n`;
  }

  if (topics) {
    prompt += `Topics to Cover: ${topics}\n\n`;
  }

  if (teachingApproach) {
    prompt += `Teaching Approach: ${teachingApproach}\n\n`;
  }

  if (materials) {
    prompt += `Required Materials: ${materials}\n\n`;
  }

  if (additionalRequests) {
    prompt += `Additional Requirements: ${additionalRequests}\n\n`;
  }

  if (config) {
    prompt += configToPromptInstructions(config);
  }

  prompt += `TEMPLATE INSTRUCTIONS: ${templateContext || 'Standard structure required.'}

Required Sections (Unless overridden by Template): 
1. General Information (Course, Instructor, Institution)
2. Course Description & Prerequisites
3. Learning Objectives
4. Course Materials
5. Course Schedule (Markdown Table with Week, Topic, Activities)
6. Grading Policy & Requirements

Format: Professional Markdown. Use H2 (##) for section titles.`;

  yield* generateContentStream(prompt, { temperature: 0.7, maxTokens: 6000 });
}

/**
 * Generate quiz/MCQ content with streaming
 */
export async function* generateQuizStream(params: {
  subject: string;
  topic: string;
  numQuestions: string;
  difficulty: string;
  templateContext?: string;
  config?: GeneratorConfig;
}): AsyncGenerator<string, void, unknown> {
  const { subject, topic, numQuestions, difficulty, templateContext, config } = params;

  let prompt = `Create a Quiz. Subject: ${subject}, Topic: ${topic}, Questions: ${numQuestions}, Difficulty: ${difficulty}.

`;

  if (config) {
    prompt += configToPromptInstructions(config);
  }

  prompt += `TEMPLATE INSTRUCTIONS: ${templateContext || 'Strictly follow the table format below.'}

FORMAT REQUIREMENT:
Create a Markdown Table with exactly 3 columns: "**Q.No**", "**Question & Options**", "**Marks**".

Rules for "Question & Options" column:
1. Write the Question text on the first line.
2. Use the HTML <br> tag to create a line break.
3. List options (1), (2), (3), (4) on subsequent lines, separated by <br> tags.
4. Do NOT use code blocks. Output raw markdown.

Example Row:
| Q.1 | What is 2+2? <br> (1) 3 <br> (2) 4 <br> (3) 5 <br> (4) 6 | (1) |`;

  yield* generateContentStream(prompt, { temperature: 0.6, maxTokens: 3000 });
}

/**
 * Generate study notes with streaming
 */
export async function* generateStudyNotesStream(params: {
  subject: string;
  topic?: string;
  title?: string;
  grade: string;
  board?: string;
  notesType?: string;
  scope?: string;
  depth: string;
  style?: string;
  audience?: string;
  tone?: string;
  includes?: string[];
  keyConcepts?: string;
  customInstructions?: string;
  templateContext?: string;
  config?: GeneratorConfig;
}): AsyncGenerator<string, void, unknown> {
  const {
    subject,
    topic,
    title,
    grade,
    board,
    notesType,
    scope,
    depth,
    style,
    audience,
    tone,
    includes,
    keyConcepts,
    customInstructions,
    templateContext,
    config
  } = params;

  const actualTopic = title || topic || 'General Topic';

  let prompt = `Create comprehensive study notes. Subject: ${subject}, Topic: ${actualTopic}, Grade: ${grade}, Depth: ${depth}${board ? `, Board: ${board}` : ''}${notesType ? `, Type: ${notesType}` : ''}.

`;

  if (scope) {
    prompt += `Scope: ${scope}\n\n`;
  }

  if (style) {
    prompt += `Style: ${style}\n\n`;
  }

  if (audience) {
    prompt += `Target Audience: ${audience}\n\n`;
  }

  if (tone) {
    prompt += `Tone: ${tone}\n\n`;
  }

  if (includes && includes.length > 0) {
    prompt += `Must include: ${includes.join(', ')}\n\n`;
  }

  if (keyConcepts) {
    prompt += `Key Concepts to Focus On: ${keyConcepts}\n\n`;
  }

  if (customInstructions) {
    prompt += `Additional Instructions: ${customInstructions}\n\n`;
  }

  if (config) {
    prompt += configToPromptInstructions(config);
  }

  prompt += `TEMPLATE INSTRUCTIONS: ${templateContext || 'Standard structure required.'}

Required Structure:
1. ## Overview (Brief introduction to the topic)
2. ## Key Concepts (Bullet points with clear definitions)
3. ## Detailed Explanation (In-depth coverage)
4. ## Examples & Applications (Real-world connections)
5. ## Summary Points (Quick revision bullets)
6. ## Practice Questions (Self-assessment)

Format: Professional Markdown. Use H2 (##) for section titles, bullet points, and tables where appropriate.`;

  yield* generateContentStream(prompt, { temperature: 0.7, maxTokens: 5000 });
}

/**
 * Generate question paper with streaming
 */
export async function* generateQuestionPaperStream(params: {
  subject: string;
  examType?: string;
  grade?: string;
  duration?: string;
  maxMarks?: string;
  topics?: string;
  parts?: string;
  templateContext?: string;
  config?: GeneratorConfig;
}): AsyncGenerator<string, void, unknown> {
  const {
    subject,
    examType,
    grade,
    duration,
    maxMarks,
    topics,
    parts,
    templateContext,
    config
  } = params;

  let prompt = `Create an examination question paper. Subject: ${subject}${examType ? `, Exam Type: ${examType}` : ''}${grade ? `, Grade: ${grade}` : ''}${duration ? `, Duration: ${duration}` : ''}${maxMarks ? `, Max Marks: ${maxMarks}` : ''}.

`;

  if (topics) {
    prompt += `Topics to cover: ${topics}\n\n`;
  }

  if (parts) {
    prompt += `Question paper parts/sections: ${parts}\n\n`;
  }

  if (config) {
    prompt += configToPromptInstructions(config);
  }

  prompt += `TEMPLATE INSTRUCTIONS: ${templateContext || 'Standard structure required.'}

Required Structure:
1. ## General Instructions
2. ## Section A: Multiple Choice Questions (1 mark each)
3. ## Section B: Short Answer Questions (2-3 marks each)
4. ## Section C: Long Answer Questions (5-6 marks each)
5. ## Section D: Application/Analysis Questions (Optional - Higher order thinking)

Format: Professional Markdown. Clearly mark sections, question numbers, and marks allocation.`;

  yield* generateContentStream(prompt, { temperature: 0.7, maxTokens: 4000 });
}

/**
 * Generate concept map (returns JSON structure)
 */
export async function generateConceptMap(params: {
  topic: string;
  subject?: string;
  grade?: string;
  board?: string;
}): Promise<{ nodes: any[]; edges: any[] }> {
  const { topic, subject = 'General', grade = 'General', board } = params;

  const prompt = `Generate a concept map for learning. Topic: ${topic}, Subject: ${subject}, Grade: ${grade}${board ? `, Board: ${board}` : ''}.

Create a hierarchical concept map showing:
1. Main topic at the center
2. Major subtopics branching out
3. Prerequisite relationships between concepts
4. Supporting details for each concept

Return ONLY valid JSON in this exact format (no markdown, no code blocks):
{
  "nodes": [
    {"id": "1", "data": {"label": "Main Topic"}, "position": {"x": 400, "y": 50}},
    {"id": "2", "data": {"label": "Subtopic 1"}, "position": {"x": 200, "y": 200}}
  ],
  "edges": [
    {"id": "e1-2", "source": "1", "target": "2", "label": "leads to"}
  ]
}`;

  const result = await generateContent(prompt, { temperature: 0.5, maxTokens: 3000 });

  try {
    // Clean response - remove markdown code blocks if present
    let cleaned = result.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    return JSON.parse(cleaned);
  } catch (error) {
    console.error('Failed to parse concept map JSON:', error);
    throw new Error('Invalid concept map format received from AI');
  }
}

/**
 * Generate AI Tutor response with streaming
 */
export async function* generateTutorResponseStream(params: {
  studentQuery: string;
  chatHistory: { role: 'user' | 'model'; parts: string }[];
  context: {
    subject: string;
    topic: string;
    grade: string;
    content: string; // The assignment content
  };
}): AsyncGenerator<string, void, unknown> {
  const { studentQuery, chatHistory, context } = params;

  // content might be JSON string, try to parse or just use as is if text
  let contentText = context.content;
  try {
    const jsonContent = JSON.parse(context.content);
    // If it's a quiz, format it nicely contextually
    if (jsonContent.questions) {
      contentText = `Quiz Questions:\n${jsonContent.questions.map((q: any) => `- ${q.question}`).join('\n')}`;
    }
  } catch (e) {
    // Content is likely just text/markdown
  }

  const systemInstruction = `You are an encouraging AI Tutor for a Grade ${context.grade} student.
Your Subject: ${context.subject}
Current Topic: ${context.topic}
Context Material:
${contentText.substring(0, 3000)}... (truncated for context window)

YOUR GOAL: Guide the student to understanding.
RULES:
1. NEVER give the direct answer to a quiz question. Instead, provide hints or explain the underlying concept.
2. Be encouraging and patient. Use emojis sparingly.
3. Keep responses concise (under 3 paragraphs) unless asked for a deep dive.
4. If the student asks about something unrelated, politely steer them back to the topic.
5. Use markdown for formatting (bold concepts, code blocks if coding).

Student Question: ${studentQuery}`;

  // Build history for context (last 6 messages)
  const recentHistory = chatHistory.slice(-6).map(msg =>
    `${msg.role === 'user' ? 'Student' : 'Tutor'}: ${msg.parts}`
  ).join('\n\n');

  const fullPrompt = `${systemInstruction}

Chat History:
${recentHistory}

Student: ${studentQuery}
Tutor:`;

  yield* generateContentStream(fullPrompt, { temperature: 0.7, maxTokens: 1000 });
}

/**
 * Generate parent progress report with streaming
 */
export async function* generateParentReportStream(params: {
  studentName: string;
  grade: string;
  weekStart: string;
  weekEnd: string;
  quizzesCompleted: number;
  averageScore: number;
  pendingAssignments: number;
  strengths?: string[];
  weaknesses?: string[];
  teacherName: string;
  schoolName: string;
  templateContext?: string;
  config?: GeneratorConfig;
}): AsyncGenerator<string, void, unknown> {
  const {
    studentName, grade, weekStart, weekEnd,
    quizzesCompleted, averageScore, pendingAssignments,
    strengths, weaknesses, teacherName, schoolName,
    templateContext, config
  } = params;

  let prompt = `Write a professional weekly progress report email for a parent.
Student: ${studentName} (Grade ${grade})
Period: ${weekStart} to ${weekEnd}
Teacher: ${teacherName}
School: ${schoolName}

Performance Data:
- Quizzes Completed: ${quizzesCompleted}
- Average Score: ${averageScore}%
- Pending Assignments: ${pendingAssignments}
${strengths?.length ? `- Strengths: ${strengths.join(', ')}` : ''}
${weaknesses?.length ? `- Areas for Improvement: ${weaknesses.join(', ')}` : ''}

`;

  if (config) {
    prompt += configToPromptInstructions(config);
  }

  prompt += `TEMPLATE INSTRUCTIONS: ${templateContext || 'Write a warm, professional email.'}

Structure:
1. Subject Line: Weekly Progress Report - ${studentName}
2. Salutation (Dear Parent/Guardian,)
3. Opening (Summary of the week)
4. Key Achievements (Highlight strengths and scores)
5. Areas for Focus (Gentle mention of weaknesses/pending work)
6. Closing (Encouragement and contact info)

Tone: Encouraging, objective, professional.
Format: HTML-ready text (use <p>, <ul>, <li> tags but NO <html>/<body> wrappers).`;

  yield* generateContentStream(prompt, { temperature: 0.7, maxTokens: 2000 });
}
