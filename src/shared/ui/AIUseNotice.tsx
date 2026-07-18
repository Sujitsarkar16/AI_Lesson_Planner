import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Link } from 'react-router-dom';

interface AIUseNoticeProps { isOpen: boolean; onAccept: () => void; onClose: () => void; }
const AIUseNotice: React.FC<AIUseNoticeProps> = ({ isOpen, onAccept, onClose }) => {
  const [acknowledged, setAcknowledged] = useState(false);
  const accept = () => { localStorage.setItem('ai-use-notice-v1', 'acknowledged'); onAccept(); };
  return <AnimatePresence>{isOpen && <motion.div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} role="dialog" aria-modal="true" aria-labelledby="ai-notice-title">
    <motion.div className="w-full max-w-lg rounded-3xl bg-white p-7 shadow-2xl dark:bg-[#1d1d25]" initial={{ opacity: 0, y: 18, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 12, scale: .98 }}>
      <span className="flex size-11 items-center justify-center rounded-xl bg-brand-yellow text-primary"><span className="material-symbols-outlined">psychology</span></span><h2 id="ai-notice-title" className="mt-5 text-2xl font-extrabold font-display">Use AI thoughtfully</h2>
      <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">AI drafts can be incomplete or inaccurate. Do not submit student identifiers, health information, or other sensitive personal data. Review, adapt, and approve every output before classroom use.</p>
      <label className="mt-5 flex cursor-pointer gap-3 rounded-xl bg-slate-50 p-4 text-sm leading-5 dark:bg-slate-800"><input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-0.5 size-4 accent-primary" /><span>I understand that I remain responsible for reviewing AI-generated content and will avoid sharing sensitive personal data.</span></label>
      <p className="mt-3 text-xs leading-5 text-slate-500">This device-only acknowledgement is a product safeguard, not a durable consent record. See our <Link to="/trust-ai" className="font-bold text-primary underline" onClick={onClose}>AI use guidance</Link>.</p>
      <div className="mt-6 flex justify-end gap-3"><button onClick={onClose} className="material-button material-secondary text-sm">Back</button><button onClick={accept} disabled={!acknowledged} className="material-button material-primary text-sm disabled:cursor-not-allowed disabled:opacity-40">Continue</button></div>
    </motion.div>
  </motion.div>}</AnimatePresence>;
};
export default AIUseNotice;
