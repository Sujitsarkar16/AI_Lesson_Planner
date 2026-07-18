import React from 'react';
import { Link } from 'react-router-dom';
import { FAQ, FeatureGrid, FinalCTA, PageHero, ProductMockup, SectionHeading, Steps, type Faq, type Feature } from '@/modules/marketing/MarketingSections';
import PageMeta from '@/modules/marketing/PageMeta';

const features: Feature[] = [
  { icon: 'auto_awesome', title: 'Lesson plans', detail: 'Turn a topic, year group, and learning goal into a clear first draft you can shape.' },
  { icon: 'quiz', title: 'Checks for understanding', detail: 'Create questions and assessment ideas that stay connected to the objective.' },
  { icon: 'tune', title: 'Purposeful adaptation', detail: 'Adjust scaffolding, challenge, and delivery without losing sight of the learning.' },
  { icon: 'description', title: 'Classroom materials', detail: 'Build worksheets and supporting resources in the same focused workspace.' },
  { icon: 'folder_open', title: 'A reusable library', detail: 'Keep useful plans, templates, and materials organised for the next time you teach.' },
  { icon: 'ios_share', title: 'Flexible exports', detail: 'Move from draft to polished PDF or DOCX materials when they are ready to share.' },
];
const steps = [
  { number: '01', title: 'Set the teaching context', detail: 'Add your subject, year group, learning goal, and any constraints that matter.' },
  { number: '02', title: 'Create a useful first draft', detail: 'Generate a structured starting point instead of wrestling with a blank page.' },
  { number: '03', title: 'Review, adapt, and teach', detail: 'Apply your professional judgement, refine the details, and export what you need.' },
];
const faqs: Faq[] = [
  { question: 'Does this AI lesson plan generator replace teacher judgement?', answer: 'No. Every AI lesson plan is a draft. Educators remain responsible for checking accuracy, suitability, accessibility, and alignment before classroom use.' },
  { question: 'Can this AI lesson planning tool adapt a lesson for different learners?', answer: 'Yes. The AI lesson planner helps you vary scaffolding, challenge, activities, and supporting materials while keeping the core learning goal visible.' },
  { question: 'Should I enter student information?', answer: 'Avoid entering student names, identifiers, sensitive personal data, or confidential records. Use general classroom context and review your organisation’s approved AI guidance.' },
  { question: 'Can I try it before choosing a paid plan?', answer: 'Yes. Start with the free workspace to explore the planning flow, then review the pricing page when you need more capacity.' },
];

const LandingPage: React.FC = () => <>
  <PageMeta title="AI planning for thoughtful teachers" description="Create lesson plans, assessments, adaptations, and classroom materials in one calm AI workspace built for educators." />
  <PageHero eyebrow="Thoughtful planning, accelerated" title={<>More time for teaching. <span className="text-primary">Less time planning.</span></>} copy="Create clear lesson plans, assessments, and learning materials with an AI workspace made for educators." primary={{ label: 'Start planning free', to: '/auth' }} secondary={{ label: 'Explore the product', to: '/product' }}><ProductMockup /></PageHero>
  <section className="proof-strip border-y border-slate-200 bg-white px-5 py-5 lg:px-12"><div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-center sm:flex-row sm:text-left"><p className="text-sm font-extrabold text-brand-black">One connected workflow from idea to classroom-ready draft</p><div className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-semibold text-slate-500"><span>Plan</span><span className="text-primary">•</span><span>Adapt</span><span className="text-primary">•</span><span>Assess</span><span className="text-primary">•</span><span>Export</span></div></div></section>
  <section id="features" className="bg-white px-5 py-24 lg:px-12"><div className="mx-auto max-w-6xl"><SectionHeading eyebrow="One calm workspace" title="The tools around your lesson—not in your way." copy="Move from a rough idea to coherent teaching materials without jumping between disconnected tools." /><FeatureGrid features={features} /></div></section>
  <section className="section-tint px-5 py-24 lg:px-12"><div className="mx-auto max-w-6xl"><SectionHeading eyebrow="A simpler planning rhythm" title="Keep your expertise at the centre." copy="AI handles the first-draft momentum. You make the decisions that turn it into a lesson for your classroom." /><Steps items={steps} /></div></section>
  <section className="bg-white px-5 py-24 lg:px-12"><div className="mx-auto grid max-w-6xl items-center gap-14 lg:grid-cols-[.85fr_1.15fr]"><div><SectionHeading eyebrow="Designed for real classrooms" title="Adapt with intent, not with extra admin." copy="Keep the objective in view while you adjust language, scaffolding, challenge, and activities for the learners in front of you." /><ul className="mt-8 space-y-4">{['Preserve the core learning goal', 'Create useful alternatives, not generic rewrites', 'Review every draft before it reaches students'].map((item) => <li key={item} className="flex items-center gap-3 font-bold text-slate-700"><span className="flex size-7 items-center justify-center rounded-full bg-brand-green text-emerald-700"><span className="material-symbols-outlined text-base">check</span></span>{item}</li>)}</ul><Link to="/trust-ai" className="mt-8 inline-flex items-center gap-2 font-extrabold text-primary hover:text-primary-dark">How we think about responsible AI<span className="material-symbols-outlined text-lg">arrow_forward</span></Link></div><ProductMockup /></div></section>
  <section className="section-tint px-5 py-24 lg:px-12"><div className="mx-auto max-w-4xl"><SectionHeading eyebrow="Good questions, clear answers" title="Before you begin." align="center" /><FAQ items={faqs} /></div></section>
  <FinalCTA title="Make room for the work only you can do." copy="Bring your next learning goal. Leave with a clear, editable first draft." action="Create your first lesson" to="/auth" secondary={{ label: 'View pricing', to: '/pricing' }} />
</>;
export default LandingPage;
