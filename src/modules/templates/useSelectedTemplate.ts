import { useEffect, useState } from 'react';
import { TEMPLATES } from '@/modules/templates/data/templates';
import { AppType, Template } from '@/shared/types/document';

export type SelectedTemplate = Pick<Template, 'id' | 'title' | 'promptContext'>;

export const useSelectedTemplate = (appType: AppType): SelectedTemplate | null => {
  const [template, setTemplate] = useState<SelectedTemplate | null>(null);

  useEffect(() => {
    const templateId = localStorage.getItem(`selected_template_${appType}`);
    const selected = TEMPLATES.find((item) => item.id === templateId);
    setTemplate(selected ? { id: selected.id, title: selected.title, promptContext: selected.promptContext } : null);
  }, [appType]);

  return template;
};
