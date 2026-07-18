import React, { useState, useEffect, useMemo } from 'react';
import LessonPlanRenderer from '@/shared/markdown/LessonPlanRenderer';
import { LessonPlan } from '@/shared/types/document';

interface TimingBlock {
  id: string;
  title: string;
  duration: number; // in minutes
  content: string;
  type: 'objective' | 'warm-up' | 'main-activity' | 'check-understanding' | 'exit-ticket' | 'other';
}

interface ClassroomPresenterProps {
  lessonPlan: LessonPlan;
  onClose: () => void;
}

const ClassroomPresenter: React.FC<ClassroomPresenterProps> = ({ lessonPlan, onClose }) => {
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [notes, setNotes] = useState('');

  // Parse lesson plan content into timing blocks
  const timingBlocks = useMemo(() => {
    const blocks: TimingBlock[] = [];
    const content = lessonPlan.content || '';
    
    // Default structure if parsing fails
    const defaultBlocks: TimingBlock[] = [
      { id: 'objectives', title: 'Learning Objectives', duration: 5, content: '', type: 'objective' },
      { id: 'warm-up', title: 'Warm-Up Activity', duration: 10, content: '', type: 'warm-up' },
      { id: 'main', title: 'Main Activity', duration: 30, content: '', type: 'main-activity' },
      { id: 'check', title: 'Checking for Understanding', duration: 10, content: '', type: 'check-understanding' },
      { id: 'exit', title: 'Exit Ticket', duration: 5, content: '', type: 'exit-ticket' }
    ];

    // Try to parse from markdown sections
    const sections = content.split(/^##\s+/m).filter(s => s.trim());
    
    if (sections.length > 0) {
      sections.forEach((section, index) => {
        const lines = section.split('\n');
        const title = lines[0].trim();
        const sectionContent = lines.slice(1).join('\n').trim();
        
        // Determine type based on title keywords
        let type: TimingBlock['type'] = 'other';
        let duration = 15;
        
        const lowerTitle = title.toLowerCase();
        if (lowerTitle.includes('objective') || lowerTitle.includes('intention')) {
          type = 'objective';
          duration = 5;
        } else if (lowerTitle.includes('warm') || lowerTitle.includes('starter')) {
          type = 'warm-up';
          duration = 10;
        } else if (lowerTitle.includes('activit') || lowerTitle.includes('teaching')) {
          type = 'main-activity';
          duration = 30;
        } else if (lowerTitle.includes('check') || lowerTitle.includes('assessment')) {
          type = 'check-understanding';
          duration = 10;
        } else if (lowerTitle.includes('exit') || lowerTitle.includes('closure')) {
          type = 'exit-ticket';
          duration = 5;
        }
        
        blocks.push({
          id: `block-${index}`,
          title,
          duration,
          content: sectionContent,
          type
        });
      });
    } else {
      return defaultBlocks.map(block => ({ ...block, content }));
    }
    
    return blocks.length > 0 ? blocks : defaultBlocks;
  }, [lessonPlan.content]);

  const currentBlock = timingBlocks[currentBlockIndex];
  const totalDuration = timingBlocks.reduce((sum, block) => sum + block.duration, 0);

  // Timer effect
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setElapsedTime(prev => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const getBlockIcon = (type: TimingBlock['type']) => {
    switch (type) {
      case 'objective': return 'flag';
      case 'warm-up': return 'wb_sunny';
      case 'main-activity': return 'school';
      case 'check-understanding': return 'quiz';
      case 'exit-ticket': return 'assignment_turned_in';
      default: return 'article';
    }
  };

  const goToBlock = (index: number) => {
    setCurrentBlockIndex(index);
    setElapsedTime(0);
    setIsTimerRunning(false);
  };

  const nextBlock = () => {
    if (currentBlockIndex < timingBlocks.length - 1) {
      goToBlock(currentBlockIndex + 1);
    }
  };

  const previousBlock = () => {
    if (currentBlockIndex > 0) {
      goToBlock(currentBlockIndex - 1);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900 text-white overflow-hidden flex flex-col">
      {/* Top Bar */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={onClose}
            className="size-10 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div>
            <h1 className="text-xl font-bold font-display">{lessonPlan.title}</h1>
            <p className="text-sm text-slate-400">{lessonPlan.subject} • {lessonPlan.grade}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Timer */}
          <div className="bg-slate-700 rounded-lg px-6 py-3 flex items-center gap-3">
            <span className="material-symbols-outlined text-brand-yellow">timer</span>
            <div>
              <div className="text-2xl font-bold font-mono">{formatTime(elapsedTime)}</div>
              <div className="text-xs text-slate-400">
                Target: {currentBlock.duration} min
              </div>
            </div>
            <button
              onClick={() => setIsTimerRunning(!isTimerRunning)}
              className="ml-2 size-8 rounded bg-brand-pink hover:bg-brand-pink/80 flex items-center justify-center transition-colors border-2 border-black"
            >
              <span className="material-symbols-outlined text-sm">
                {isTimerRunning ? 'pause' : 'play_arrow'}
              </span>
            </button>
          </div>

          <button
            onClick={toggleFullscreen}
            className="size-10 rounded-lg bg-slate-700 hover:bg-slate-600 flex items-center justify-center transition-colors"
          >
            <span className="material-symbols-outlined">
              {isFullscreen ? 'fullscreen_exit' : 'fullscreen'}
            </span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar - Block Navigation */}
        <div className="w-80 bg-slate-800 border-r border-slate-700 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4">
              Lesson Timeline
            </h2>
            <div className="space-y-2">
              {timingBlocks.map((block, index) => (
                <button
                  key={block.id}
                  onClick={() => goToBlock(index)}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    index === currentBlockIndex
                      ? 'bg-brand-blue border-2 border-black shadow-neo-sm'
                      : 'bg-slate-700 hover:bg-slate-600 border-2 border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <span className="material-symbols-outlined text-2xl mt-1">
                      {getBlockIcon(block.type)}
                    </span>
                    <div className="flex-1">
                      <div className="font-bold">{block.title}</div>
                      <div className="text-xs text-slate-300 mt-1">
                        {block.duration} minutes
                      </div>
                      {index < currentBlockIndex && (
                        <div className="text-xs text-brand-green mt-1 flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">check_circle</span>
                          Completed
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Progress Summary */}
            <div className="mt-6 p-4 bg-slate-700 rounded-lg border-2 border-slate-600">
              <div className="text-sm font-bold mb-2">Overall Progress</div>
              <div className="text-xs text-slate-300 mb-2">
                Block {currentBlockIndex + 1} of {timingBlocks.length}
              </div>
              <div className="w-full bg-slate-600 rounded-full h-2">
                <div
                  className="bg-brand-pink h-2 rounded-full transition-all"
                  style={{ width: `${((currentBlockIndex + 1) / timingBlocks.length) * 100}%` }}
                />
              </div>
              <div className="text-xs text-slate-400 mt-2">
                Total Time: {totalDuration} minutes
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Display */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 bg-white text-slate-900">
            {/* Current Block Header */}
            <div className="mb-6 pb-4 border-b-4 border-brand-blue">
              <div className="flex items-center gap-3 mb-2">
                <span className="material-symbols-outlined text-4xl text-brand-blue">
                  {getBlockIcon(currentBlock.type)}
                </span>
                <div>
                  <h2 className="text-3xl font-black font-display">{currentBlock.title}</h2>
                  <p className="text-slate-600">Duration: {currentBlock.duration} minutes</p>
                </div>
              </div>
            </div>

            {/* Block Content */}
            <div className="prose prose-lg max-w-none">
              <LessonPlanRenderer content={currentBlock.content} />
            </div>
          </div>

          {/* Bottom Navigation */}
          <div className="bg-slate-800 border-t border-slate-700 px-8 py-4 flex items-center justify-between">
            <button
              onClick={previousBlock}
              disabled={currentBlockIndex === 0}
              className="px-6 py-3 rounded-lg font-bold bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined">chevron_left</span>
              Previous
            </button>

            <div className="text-center">
              <div className="text-sm text-slate-400">
                Step {currentBlockIndex + 1} of {timingBlocks.length}
              </div>
            </div>

            <button
              onClick={nextBlock}
              disabled={currentBlockIndex === timingBlocks.length - 1}
              className="px-6 py-3 rounded-lg font-bold bg-brand-pink hover:bg-brand-pink/80 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors border-2 border-black shadow-neo-sm"
            >
              Next
              <span className="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
        </div>

        {/* Right Panel - Notes */}
        <div className="w-96 bg-slate-800 border-l border-slate-700 overflow-y-auto">
          <div className="p-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400 mb-4 flex items-center gap-2">
              <span className="material-symbols-outlined">edit_note</span>
              Teaching Notes
            </h2>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Add notes about student engagement, adjustments made, or observations..."
              className="w-full h-96 p-4 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder-slate-500 resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue"
            />
            
            <div className="mt-4 space-y-2">
              <button className="w-full px-4 py-2 bg-brand-yellow text-black rounded-lg font-bold hover:bg-brand-yellow/80 transition-colors border-2 border-black flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">save</span>
                Save Notes
              </button>
              <button className="w-full px-4 py-2 bg-slate-700 rounded-lg font-bold hover:bg-slate-600 transition-colors flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">download</span>
                Export as Slides
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClassroomPresenter;
