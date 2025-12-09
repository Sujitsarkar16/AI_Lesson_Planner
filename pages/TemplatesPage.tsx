

import React, { useState, useEffect } from 'react';
import { TEMPLATES } from '../data/templates';
import { AppType, Template } from '../types';
import { GoogleGenAI } from "@google/genai";
import { getUserApiKey } from '../utils/apiKeyManager';

const TemplatesPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppType>('lesson-plan');
  const [selectedTemplates, setSelectedTemplates] = useState<Record<AppType, string>>({
    'lesson-plan': '',
    'syllabus': '',
    'paper': '',
    'quiz': '',
    'study-notes': '',
    // FIX: Add missing 'concept-map' to satisfy Record<AppType, string>
    'concept-map': ''
  });
  const [previewImages, setPreviewImages] = useState<Record<string, string>>({});
  const [loadingImage, setLoadingImage] = useState<string | null>(null);

  useEffect(() => {
    // Load saved selections
    const saved: Record<AppType, string> = {
      'lesson-plan': localStorage.getItem('selected_template_lesson-plan') || '',
      'syllabus': localStorage.getItem('selected_template_syllabus') || '',
      'paper': localStorage.getItem('selected_template_paper') || '',
      'quiz': localStorage.getItem('selected_template_quiz') || '',
      'study-notes': localStorage.getItem('selected_template_study-notes') || '',
      // FIX: Add missing 'concept-map' to satisfy Record<AppType, string>
      'concept-map': localStorage.getItem('selected_template_concept-map') || ''
    };
    setSelectedTemplates(saved);
  }, []);

  const handleSelect = (template: Template) => {
    const isSelected = selectedTemplates[activeTab] === template.id;
    const newValue = isSelected ? '' : template.id;
    
    setSelectedTemplates(prev => ({ ...prev, [activeTab]: newValue }));
    localStorage.setItem(`selected_template_${activeTab}`, newValue);
  };

  const generatePreview = async (template: Template) => {
    if (loadingImage) return;
    setLoadingImage(template.id);
    
    try {
      const apiKey = getUserApiKey();
      if (!apiKey) throw new Error("Please add your Google Gemini API key in Settings");
      const ai = new GoogleGenAI({ apiKey });
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
          parts: [
            { text: `Generate a high quality preview image of a document. Description: ${template.previewPrompt}. Make it look like a professional document preview thumbnail.` }
          ]
        },
        config: {
           imageConfig: {
              aspectRatio: "3:4",
              imageSize: "1K"
           }
        }
      });

      // Extract image
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          const imageUrl = `data:image/png;base64,${base64EncodeString}`;
          setPreviewImages(prev => ({ ...prev, [template.id]: imageUrl }));
        }
      }

    } catch (e) {
      console.error("Failed to generate image", e);
      alert("Could not generate preview image. Please try again.");
    } finally {
      setLoadingImage(null);
    }
  };

  const filteredTemplates = TEMPLATES.filter(t => t.appType === activeTab);

  return (
    <div className="flex flex-col gap-8 h-full">
      <div className="flex flex-col gap-2">
        <h1 className="text-4xl font-black font-display text-slate-900 dark:text-white">Templates</h1>
        <p className="text-slate-500 dark:text-slate-400 font-medium text-lg">Select a default template for your AI generations. These settings will persist.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-4 border-b-2 border-black pb-4">
        {[
          { id: 'lesson-plan', label: 'Lesson Plans', icon: 'auto_stories' },
          { id: 'syllabus', label: 'Syllabus', icon: 'calendar_month' },
          { id: 'paper', label: 'Question Papers', icon: 'description' },
          { id: 'quiz', label: 'Quizzes', icon: 'check_circle' },
          { id: 'study-notes', label: 'Study Notes', icon: 'menu_book' },
          // FIX: Add missing Concept Map tab
          { id: 'concept-map', label: 'Concept Maps', icon: 'account_tree' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as AppType)}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-2 rounded-xl transition-all shadow-neo-sm ${
              activeTab === tab.id
                ? 'border-black text-black bg-brand-yellow hover:translate-x-[1px] hover:translate-y-[1px] hover:shadow-none'
                : 'border-slate-300 text-slate-500 bg-white hover:border-black hover:text-black dark:bg-[#1e293b] dark:border-slate-700 dark:text-slate-400'
            }`}
          >
            <span className="material-symbols-outlined text-lg">{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 pb-12">
        {filteredTemplates.map((template) => {
           const isSelected = selectedTemplates[activeTab] === template.id;
           const hasCustomImage = !!previewImages[template.id];

           return (
            <div 
              key={template.id}
              className={`group relative flex flex-col bg-white dark:bg-[#1e293b] rounded-2xl border-2 transition-all duration-200 overflow-hidden shadow-neo hover:shadow-neo-lg hover:-translate-y-1 ${isSelected ? 'border-brand-green ring-4 ring-brand-green/20' : 'border-black'}`}
            >
              {isSelected && (
                <div className="absolute top-3 right-3 z-10 bg-brand-green border-2 border-black text-white text-xs font-bold px-3 py-1 rounded-lg shadow-neo-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-sm">check</span>
                  Selected
                </div>
              )}
              
              {/* Image Preview Area */}
              <div className="aspect-[3/4] bg-slate-100 dark:bg-slate-800 relative group-inner overflow-hidden border-b-2 border-black">
                 {hasCustomImage ? (
                    <img src={previewImages[template.id]} alt={template.title} className="w-full h-full object-cover" />
                 ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-400">
                        <span className="material-symbols-outlined text-6xl mb-4 opacity-20">article</span>
                        <span className="text-xs uppercase tracking-widest opacity-50 font-black border-2 border-slate-300 px-2 py-1 rounded">{template.appType}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); generatePreview(template); }}
                          className="mt-6 px-4 py-2 bg-white dark:bg-slate-700 border-2 border-black rounded-lg shadow-neo-sm text-xs font-bold text-black dark:text-white hover:bg-brand-pink flex items-center gap-1 transition-all transform translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100"
                        >
                           {loadingImage === template.id ? (
                             <span className="animate-spin material-symbols-outlined text-sm">refresh</span>
                           ) : (
                             <span className="material-symbols-outlined text-sm">auto_awesome</span>
                           )}
                           Visualize
                        </button>
                    </div>
                 )}
              </div>

              {/* Content */}
              <div className="p-5 flex flex-col flex-1">
                 <div className="flex flex-wrap gap-2 mb-3">
                    {template.tags.map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded border border-black text-[10px] font-bold uppercase tracking-wider bg-yellow-100 text-black">
                        {tag}
                      </span>
                    ))}
                 </div>
                 <h3 className="font-black font-display text-xl text-slate-900 dark:text-white leading-tight mb-2">{template.title}</h3>
                 <p className="text-sm font-medium text-slate-500 dark:text-slate-400 line-clamp-3 mb-6 flex-1 leading-relaxed">{template.description}</p>
                 
                 <button 
                   onClick={() => handleSelect(template)}
                   className={`w-full py-3 rounded-xl font-bold text-sm border-2 border-black shadow-neo-sm hover:shadow-none hover:translate-x-[1px] hover:translate-y-[1px] transition-all ${
                     isSelected 
                     ? 'bg-slate-100 dark:bg-slate-800 text-slate-500' 
                     : 'bg-brand-black text-white hover:bg-slate-800'
                   }`}
                 >
                   {isSelected ? 'Deselect Template' : 'Use Template'}
                 </button>
              </div>
            </div>
           );
        })}
      </div>
    </div>
  );
};

export default TemplatesPage;