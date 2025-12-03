/**
 * Export Modal Component
 * Allows users to export documents to PDF or DOCX format
 */

import React, { useState } from 'react';
import { LessonPlan } from '../types';
import { exportToPDF } from '../utils/pdfExport';
import { exportToDOCX } from '../utils/docxExport';

type SubscriptionTier = 'free' | 'pro' | 'school';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  document: LessonPlan;
  userTier?: SubscriptionTier;
}

const ExportModal: React.FC<ExportModalProps> = ({ isOpen, onClose, document, userTier = 'free' }) => {
  const [format, setFormat] = useState<'pdf' | 'docx'>('pdf');
  const [isExporting, setIsExporting] = useState(false);
  const [includeBranding, setIncludeBranding] = useState(true);
  const [customFooter, setCustomFooter] = useState('');

  if (!isOpen) return null;

  const isPro = userTier === 'pro' || userTier === 'school';

  const handleExport = async () => {
    console.log('🚀 Export started', { format, document, isPro });
    setIsExporting(true);

    try {
      const options = {
        includeBranding: includeBranding,
        watermark: !isPro ? 'FREE TIER' : undefined,
        footerText: customFooter || undefined
      };

      console.log('📦 Export options:', options);

      if (format === 'pdf') {
        console.log('📄 Exporting to PDF...');
        const blob = await exportToPDF(document, options, true);
        console.log('✅ PDF export successful', blob);
      } else {
        console.log('📝 Exporting to DOCX...');
        const blob = await exportToDOCX(document, options, true);
        console.log('✅ DOCX export successful', blob);
      }

      // Close modal after successful export
      setTimeout(() => {
        onClose();
        setIsExporting(false);
      }, 500);
    } catch (error) {
      console.error('❌ Export error:', error);
      alert(`Failed to export document: ${error instanceof Error ? error.message : 'Unknown error'}`);
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#1e293b] rounded-2xl border-2 border-black shadow-neo-lg max-w-lg w-full overflow-hidden">
        {/* Header */}
        <div className="bg-brand-blue border-b-2 border-black px-6 py-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black font-display text-white">Export Document</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 transition-colors"
            >
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>
          <p className="text-white/80 text-sm font-medium mt-1">{document.title}</p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Format Selection */}
          <div>
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">
              Export Format
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setFormat('pdf')}
                className={`p-4 rounded-xl border-2 border-black transition-all ${
                  format === 'pdf'
                    ? 'bg-brand-blue text-white shadow-neo'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:shadow-neo-sm'
                }`}
              >
                <span className="material-symbols-outlined text-4xl mb-2">picture_as_pdf</span>
                <div className="font-black text-sm">PDF</div>
                <div className="text-xs opacity-80">Portable Document</div>
              </button>
              
              <button
                onClick={() => setFormat('docx')}
                className={`p-4 rounded-xl border-2 border-black transition-all ${
                  format === 'docx'
                    ? 'bg-brand-blue text-white shadow-neo'
                    : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white hover:shadow-neo-sm'
                } ${!isPro ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={!isPro}
              >
                <span className="material-symbols-outlined text-4xl mb-2">description</span>
                <div className="font-black text-sm">DOCX</div>
                <div className="text-xs opacity-80">
                  {isPro ? 'Microsoft Word' : '🔒 Pro Only'}
                </div>
              </button>
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">
              Export Options
            </label>

            {/* Branding */}
            <label className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border-2 border-black cursor-pointer hover:shadow-neo-sm transition-all">
              <input
                type="checkbox"
                checked={includeBranding}
                onChange={(e) => setIncludeBranding(e.target.checked)}
                className="w-5 h-5 rounded border-2 border-black"
              />
              <div className="flex-1">
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  Include Branding
                </div>
                <div className="text-xs text-slate-600 dark:text-slate-400">
                  Add "Generated by AI Lesson Planner" footer
                </div>
              </div>
            </label>

            {/* Custom Footer (Pro Only) */}
            <div className={`${!isPro ? 'opacity-50' : ''}`}>
              <label className="block text-xs font-bold text-slate-600 dark:text-slate-400 mb-2">
                Custom Footer Text {!isPro && '(Pro Only)'}
              </label>
              <input
                type="text"
                value={customFooter}
                onChange={(e) => setCustomFooter(e.target.value)}
                disabled={!isPro}
                placeholder="e.g., Your School Name"
                className="w-full px-4 py-2 rounded-xl border-2 border-black bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-brand-blue disabled:cursor-not-allowed"
              />
            </div>

            {/* Watermark Notice (Free Tier) */}
            {!isPro && (
              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-400 dark:border-yellow-600 rounded-xl">
                <div className="flex items-start gap-2">
                  <span className="material-symbols-outlined text-yellow-600 dark:text-yellow-500">info</span>
                  <div className="flex-1">
                    <div className="text-xs font-bold text-yellow-800 dark:text-yellow-300">
                      Free Tier Notice
                    </div>
                    <div className="text-xs text-yellow-700 dark:text-yellow-400 mt-1">
                      Exports will include a "FREE TIER" watermark. Upgrade to Pro to remove watermarks and unlock DOCX export.
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t-2 border-black px-6 py-4 bg-slate-50 dark:bg-slate-800/50 flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-black bg-white dark:bg-slate-700 text-slate-900 dark:text-white font-bold shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting || (!isPro && format === 'docx')}
            className="flex-1 px-4 py-3 rounded-xl border-2 border-black bg-brand-blue text-white font-bold shadow-neo hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-neo"
          >
            {isExporting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin material-symbols-outlined">progress_activity</span>
                Exporting...
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <span className="material-symbols-outlined">download</span>
                Export {format.toUpperCase()}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;
