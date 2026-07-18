import React from 'react';
import { SelectedTemplate } from '@/modules/templates/useSelectedTemplate';

interface TemplateBannerProps {
  template: SelectedTemplate;
  description: string;
}

const TemplateBanner: React.FC<TemplateBannerProps> = ({ template, description }) => (
  <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 flex items-start gap-3">
    <span className="material-symbols-outlined text-primary mt-0.5">verified</span>
    <div>
      <p className="text-sm font-bold text-primary">Using Template: {template.title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
    </div>
  </div>
);

export default TemplateBanner;
