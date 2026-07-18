import React, { useEffect } from 'react';

interface PageMetaProps {
  title: string;
  description: string;
}

const keywordContent = 'curriculamIQ, AI lesson planner, AI lesson plan generator, lesson planning tool for teachers, teacher AI tools, classroom materials generator, lesson plan creator';

const setMeta = (attribute: 'name' | 'property', key: string, content: string) => {
  let element = document.querySelector<HTMLMetaElement>(`meta[${attribute}="${key}"]`);
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.content = content;
};

const PageMeta: React.FC<PageMetaProps> = ({ title, description }) => {
  useEffect(() => {
    const configuredOrigin = import.meta.env.VITE_APP_URL?.replace(/\/$/, '');
    const origin = configuredOrigin || window.location.origin;
    const canonicalUrl = `${origin}${window.location.pathname}`;
    const pageTitle = `${title} | curriculamIQ`;
    document.title = pageTitle;
    setMeta('name', 'description', description);
    setMeta('name', 'keywords', keywordContent);
    setMeta('name', 'robots', 'index, follow, max-image-preview:large');
    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', 'curriculamIQ');
    setMeta('property', 'og:title', pageTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', canonicalUrl);
    setMeta('name', 'twitter:card', 'summary');
    setMeta('name', 'twitter:title', pageTitle);
    setMeta('name', 'twitter:description', description);

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = canonicalUrl;
  }, [description, title]);

  return null;
};

export default PageMeta;