import React, { useState, useEffect } from 'react';

interface Question {
  id: string;
  questionNumber: number;
  question: string;
  options: string[];
  correctAnswer: string;
  marks: number;
}

interface InteractiveQuizProps {
  quizContent: string; // Raw markdown content from quiz document
  quizId: string;
  studentId?: string;
  onSubmit?: (result: QuizResult) => void;
  onExit?: () => void;
}

interface QuizResult {
  score: number;
  maxScore: number;
  percentage: number;
  timeTaken: number;
  answers: Record<string, string>;
  feedback: Record<string, { correct: boolean; correctAnswer: string }>;
}

const InteractiveQuiz: React.FC<InteractiveQuizProps> = ({
  quizContent,
  quizId,
  studentId,
  onSubmit,
  onExit
}) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [result, setResult] = useState<QuizResult | null>(null);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [showExplanation, setShowExplanation] = useState(false);

  useEffect(() => {
    parseQuizContent(quizContent);
    setStartTime(Date.now());
  }, [quizContent]);

  // Timer effect
  useEffect(() => {
    if (!isSubmitted) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [startTime, isSubmitted]);

  const parseQuizContent = (content: string) => {
    const parsed: Question[] = [];
    
    // Parse markdown table format
    const lines = content.split('\n').filter(line => line.trim());
    let inTable = false;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // Detect table row
      if (line.includes('|') && !line.includes('---')) {
        const cells = line.split('|').map(c => c.trim()).filter(c => c);
        
        if (cells.length >= 3 && cells[0].match(/Q\.\d+/)) {
          const questionNumber = parseInt(cells[0].replace(/Q\./, ''));
          const questionAndOptions = cells[1];
          const marksStr = cells[2];
          
          // Parse question and options
          const parts = questionAndOptions.split('<br>').map(p => p.trim()).filter(p => p);
          const question = parts[0];
          const options = parts.slice(1).filter(p => p.match(/^\(\d+\)/));
          
          // Extract correct answer from marks column (if present)
          const correctMatch = marksStr.match(/\((\d+)\)/);
          const correctAnswer = correctMatch ? `(${correctMatch[1]})` : '';
          
          parsed.push({
            id: `q${questionNumber}`,
            questionNumber,
            question,
            options,
            correctAnswer,
            marks: 1
          });
        }
      }
    }
    
    setQuestions(parsed);
  };

  const handleAnswerSelect = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };

  const handleSubmit = () => {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    let score = 0;
    const maxScore = questions.length;
    const feedback: Record<string, { correct: boolean; correctAnswer: string }> = {};
    
    questions.forEach(q => {
      const studentAnswer = answers[q.id];
      const isCorrect = studentAnswer === q.correctAnswer;
      
      if (isCorrect) {
        score += q.marks;
      }
      
      feedback[q.id] = {
        correct: isCorrect,
        correctAnswer: q.correctAnswer
      };
    });
    
    const percentage = Math.round((score / maxScore) * 100);
    
    const quizResult: QuizResult = {
      score,
      maxScore,
      percentage,
      timeTaken,
      answers,
      feedback
    };
    
    setResult(quizResult);
    setIsSubmitted(true);
    
    if (onSubmit) {
      onSubmit(quizResult);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-500';
    if (percentage >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  const getScoreBg = (percentage: number) => {
    if (percentage >= 80) return 'bg-green-100 border-green-500';
    if (percentage >= 60) return 'bg-yellow-100 border-yellow-500';
    return 'bg-red-100 border-red-500';
  };

  if (questions.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-slate-50">
        <div className="text-center">
          <span className="material-symbols-outlined text-6xl text-slate-400 mb-4">quiz</span>
          <p className="text-slate-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  // Results View
  if (isSubmitted && result) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Results Header */}
          <div className={`rounded-3xl border-4 p-8 mb-6 ${getScoreBg(result.percentage)}`}>
            <div className="text-center">
              <div className="size-20 bg-white rounded-2xl border-4 border-black shadow-neo-sm mx-auto mb-4 flex items-center justify-center">
                <span className="material-symbols-outlined text-4xl">
                  {result.percentage >= 80 ? 'emoji_events' : result.percentage >= 60 ? 'thumb_up' : 'lightbulb'}
                </span>
              </div>
              <h1 className="text-3xl font-black font-display mb-2">Quiz Complete!</h1>
              <div className={`text-6xl font-black ${getScoreColor(result.percentage)} mb-2`}>
                {result.percentage}%
              </div>
              <p className="text-lg font-bold mb-4">
                Score: {result.score} / {result.maxScore}
              </p>
              <p className="text-sm text-slate-600">
                Time Taken: {formatTime(result.timeTaken)}
              </p>
            </div>
          </div>

          {/* Feedback Section */}
          <div className="bg-white rounded-2xl border-2 border-black shadow-neo-sm p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-black font-display">Question Review</h2>
              <button
                onClick={() => setShowExplanation(!showExplanation)}
                className="text-sm font-bold text-brand-blue hover:underline flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-lg">
                  {showExplanation ? 'visibility_off' : 'visibility'}
                </span>
                {showExplanation ? 'Hide' : 'Show'} Answers
              </button>
            </div>

            <div className="space-y-4">
              {questions.map((q, index) => {
                const studentAnswer = answers[q.id];
                const feedback = result.feedback[q.id];
                const isCorrect = feedback?.correct;

                return (
                  <div
                    key={q.id}
                    className={`border-2 rounded-xl p-4 ${
                      isCorrect 
                        ? 'border-green-300 bg-green-50' 
                        : 'border-red-300 bg-red-50'
                    }`}
                  >
                    <div className="flex items-start gap-3 mb-3">
                      <div className={`size-8 rounded-lg flex items-center justify-center font-bold ${
                        isCorrect ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                      }`}>
                        <span className="material-symbols-outlined text-lg">
                          {isCorrect ? 'check' : 'close'}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="font-bold text-slate-900">Q{q.questionNumber}. {q.question}</div>
                      </div>
                    </div>

                    {showExplanation && (
                      <div className="ml-11 space-y-2">
                        <div className="text-sm">
                          <span className="font-bold">Your answer:</span>{' '}
                          <span className={isCorrect ? 'text-green-700' : 'text-red-700'}>
                            {studentAnswer || 'Not answered'}
                          </span>
                        </div>
                        {!isCorrect && (
                          <div className="text-sm">
                            <span className="font-bold">Correct answer:</span>{' '}
                            <span className="text-green-700">{feedback.correctAnswer}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            {onExit && (
              <button
                onClick={onExit}
                className="flex-1 px-6 py-3 bg-white hover:bg-slate-50 border-2 border-black rounded-lg font-bold transition-colors shadow-neo"
              >
                Back to Assignments
              </button>
            )}
            <button
              onClick={() => window.print()}
              className="flex-1 px-6 py-3 bg-brand-blue text-white hover:bg-brand-blue/80 border-2 border-black rounded-lg font-bold transition-colors shadow-neo flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined">print</span>
              Print Results
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Quiz Taking View
  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Header */}
      <div className="bg-white border-b-4 border-black shadow-neo">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="size-12 bg-brand-blue rounded-xl border-2 border-black flex items-center justify-center">
                <span className="material-symbols-outlined text-white">quiz</span>
              </div>
              <div>
                <h1 className="text-xl font-black font-display">Online Quiz</h1>
                <p className="text-sm text-slate-600">
                  Question {currentQuestionIndex + 1} of {questions.length}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-slate-100 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="material-symbols-outlined text-brand-pink">timer</span>
                <span className="font-mono font-bold">{formatTime(elapsedTime)}</span>
              </div>
              
              {onExit && (
                <button
                  onClick={onExit}
                  className="size-10 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-colors"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-slate-200 rounded-full h-2">
            <div
              className="bg-brand-blue h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Question Content */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-3xl">
          <div className="bg-white rounded-3xl border-4 border-black shadow-neo-lg p-8">
            {/* Question */}
            <div className="mb-8">
              <div className="inline-block bg-brand-yellow px-4 py-2 rounded-lg border-2 border-black font-bold mb-4">
                Question {currentQuestion.questionNumber}
              </div>
              <h2 className="text-2xl font-bold text-slate-900">
                {currentQuestion.question}
              </h2>
            </div>

            {/* Options */}
            <div className="space-y-3 mb-8">
              {currentQuestion.options.map((option, index) => {
                const optionValue = option.match(/^\((\d+)\)/)?.[0] || '';
                const isSelected = answers[currentQuestion.id] === optionValue;

                return (
                  <button
                    key={index}
                    onClick={() => handleAnswerSelect(currentQuestion.id, optionValue)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all ${
                      isSelected
                        ? 'border-brand-blue bg-brand-blue/10 shadow-neo-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`size-6 rounded-full border-2 flex items-center justify-center ${
                        isSelected
                          ? 'border-brand-blue bg-brand-blue'
                          : 'border-slate-300'
                      }`}>
                        {isSelected && (
                          <span className="material-symbols-outlined text-white text-sm">check</span>
                        )}
                      </div>
                      <span className={`font-medium ${isSelected ? 'text-brand-blue font-bold' : 'text-slate-700'}`}>
                        {option}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Navigation Buttons */}
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentQuestionIndex(prev => Math.max(0, prev - 1))}
                disabled={currentQuestionIndex === 0}
                className="px-6 py-3 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined">chevron_left</span>
                Previous
              </button>

              {currentQuestionIndex < questions.length - 1 ? (
                <button
                  onClick={() => setCurrentQuestionIndex(prev => prev + 1)}
                  className="flex-1 px-6 py-3 bg-brand-blue text-white hover:bg-brand-blue/80 rounded-lg font-bold transition-colors border-2 border-black shadow-neo flex items-center justify-center gap-2"
                >
                  Next
                  <span className="material-symbols-outlined">chevron_right</span>
                </button>
              ) : (
                <button
                  onClick={handleSubmit}
                  disabled={Object.keys(answers).length < questions.length}
                  className="flex-1 px-6 py-3 bg-brand-green text-white hover:bg-brand-green/80 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-bold transition-colors border-2 border-black shadow-neo flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined">check_circle</span>
                  Submit Quiz
                </button>
              )}
            </div>

            {/* Answer Progress */}
            <div className="mt-6 pt-6 border-t border-slate-200">
              <div className="text-sm text-slate-600 mb-2">
                Answered: {Object.keys(answers).length} / {questions.length}
              </div>
              <div className="flex flex-wrap gap-2">
                {questions.map((q, index) => (
                  <button
                    key={q.id}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`size-8 rounded-lg font-bold text-sm transition-all ${
                      index === currentQuestionIndex
                        ? 'bg-brand-blue text-white border-2 border-black'
                        : answers[q.id]
                        ? 'bg-green-100 text-green-700 border border-green-300'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InteractiveQuiz;
