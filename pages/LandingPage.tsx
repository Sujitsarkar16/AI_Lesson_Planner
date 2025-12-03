import React from 'react';
import { Link } from 'react-router-dom';

const LandingPage: React.FC = () => {
  return (
    <>
      {/* HeroSection */}
      <section className="relative overflow-hidden pt-20 pb-24 lg:pt-32 lg:pb-40 px-4 bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:20px_20px]">
        <div className="max-w-7xl mx-auto text-center relative z-10">
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border-2 border-black bg-brand-pink text-black text-sm font-bold shadow-neo-sm transform -rotate-2">
            ✨ Now with AI Grading!
          </div>
          <h1 className="text-5xl md:text-7xl font-black font-display text-brand-black leading-tight tracking-tight mb-8">
            Lesson Plans in <br className="hidden md:block" />
            <span className="bg-brand-yellow px-2 inline-block transform -rotate-1 border-2 border-black shadow-neo-sm mx-2">60 Seconds</span>
          </h1>
          <p className="text-xl md:text-2xl font-medium text-gray-600 max-w-2xl mx-auto mb-10 leading-relaxed">
            Generate standards-aligned lesson plans, worksheets, and quizzes instantly. 
            Stop working weekends. Start teaching.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth" className="w-full sm:w-auto px-8 py-4 bg-brand-black text-white text-lg font-bold border-2 border-black rounded-xl shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all">
              Start for Free
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto px-8 py-4 bg-white text-black text-lg font-bold border-2 border-black rounded-xl shadow-neo hover:-translate-y-1 hover:shadow-neo-lg transition-all">
              View Pricing
            </Link>
          </div>
        </div>
        
        {/* Abstract Shapes/Decorations */}
        <div className="absolute top-20 left-10 w-16 h-16 bg-brand-blue border-2 border-black rounded-full opacity-50 hidden lg:block animate-bounce" style={{ animationDuration: '3s' }}></div>
        <div className="absolute bottom-20 right-10 w-24 h-24 bg-brand-green border-2 border-black rounded-none transform rotate-12 opacity-50 hidden lg:block"></div>
      </section>

      {/* Social Proof Marquee */}
      <section className="py-6 border-y-2 border-black bg-brand-yellow overflow-hidden whitespace-nowrap">
        <div className="inline-flex gap-12 animate-marquee items-center">
          {[...Array(2)].map((_, i) => (
             <React.Fragment key={i}>
                <span className="text-xl font-bold font-display uppercase tracking-widest">Trusted by 10,000+ Educators</span>
                <span className="text-xl">★</span>
                <span className="text-xl font-bold font-display uppercase tracking-widest">Cambridge International</span>
                <span className="text-xl">★</span>
                <span className="text-xl font-bold font-display uppercase tracking-widest">IB World Schools</span>
                <span className="text-xl">★</span>
                <span className="text-xl font-bold font-display uppercase tracking-widest">Common Core Districts</span>
                <span className="text-xl">★</span>
             </React.Fragment>
          ))}
        </div>
      </section>

      {/* Feature Grid (Bento Style) */}
      <section className="py-24 px-4 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black font-display mb-4">Everything you need to teach better.</h2>
            <p className="text-xl text-gray-600">Powerful tools wrapped in a simple interface.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[300px]">
            {/* Large Card */}
            <div className="md:col-span-2 row-span-1 md:row-span-2 rounded-2xl border-2 border-black bg-white shadow-neo p-8 flex flex-col justify-between overflow-hidden relative group hover:bg-brand-blue/10 transition-colors">
              <div>
                <div className="inline-flex items-center justify-center p-3 rounded-xl border-2 border-black bg-brand-blue shadow-neo-sm mb-6">
                   <span className="material-symbols-outlined text-3xl">bolt</span>
                </div>
                <h3 className="text-3xl font-bold font-display mb-2">Instant Generation</h3>
                <p className="text-lg text-gray-600 max-w-md">Type a topic, pick a grade, and get a full lesson plan in seconds. Standards aligned automatically.</p>
              </div>
              <div className="absolute right-[-40px] bottom-[-40px] w-64 h-64 bg-gray-100 rounded-full border-2 border-black opacity-50 group-hover:scale-110 transition-transform"></div>
              <img src="https://lh3.googleusercontent.com/aida-public/AB6AXuDs9rwITvXzLbuLSlXxtKoXxhhhAks0HaK1_-P6RO1nVNTiUsG-9IOnGDOOxA9uqy3H5eZ3eKJpDwaGyLSQmutwyHOphSJI6sZdHTkv8-HoEZ3p1UjrNTsK6PVjsZ1uSzwx21RSnPW7-BaObTbrbok1zpw_lZJicYfE-qT7j5wzyIO8UFpFp01y0SD7dvJPM_IfNRroVl78U93vJ0MHvjYcPixmAAAu5D6SSuAzc33Z7u-9110WqUWkG4hmqKjAFXAqZkNpMcyg4L4" className="absolute right-4 bottom-4 w-48 rounded-lg border-2 border-black shadow-neo-sm rotate-3 group-hover:rotate-0 transition-transform" alt="Dashboard Preview" />
            </div>

            {/* Tall Card */}
            <div className="md:col-span-1 md:row-span-2 rounded-2xl border-2 border-black bg-brand-pink shadow-neo p-8 flex flex-col items-center text-center relative">
               <div className="w-full flex-1 flex items-center justify-center">
                  <div className="relative">
                    <div className="w-40 h-56 bg-white border-2 border-black rounded-lg shadow-neo absolute top-0 left-0 transform -rotate-6"></div>
                    <div className="w-40 h-56 bg-white border-2 border-black rounded-lg shadow-neo absolute top-0 left-0 transform rotate-6 flex items-center justify-center">
                       <span className="material-symbols-outlined text-6xl">school</span>
                    </div>
                  </div>
               </div>
               <div>
                  <h3 className="text-2xl font-bold font-display mb-2">Differentiation</h3>
                  <p className="text-gray-800 font-medium">Auto-generate variants for struggling students, ELLs, and advanced learners.</p>
               </div>
            </div>

            {/* Standard Card */}
            <div className="rounded-2xl border-2 border-black bg-white shadow-neo p-6 hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-4 mb-4">
                 <div className="p-2 rounded-lg bg-brand-green border-2 border-black">
                    <span className="material-symbols-outlined">print</span>
                 </div>
                 <h3 className="text-xl font-bold font-display">PDF Exports</h3>
              </div>
              <p className="text-gray-600">Clean, professional formats ready for your principal.</p>
            </div>

            {/* Standard Card */}
            <div className="rounded-2xl border-2 border-black bg-white shadow-neo p-6 hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-4 mb-4">
                 <div className="p-2 rounded-lg bg-brand-yellow border-2 border-black">
                    <span className="material-symbols-outlined">calendar_month</span>
                 </div>
                 <h3 className="text-xl font-bold font-display">Smart Calendar</h3>
              </div>
              <p className="text-gray-600">Drag and drop lessons to organize your semester.</p>
            </div>

             {/* Standard Card */}
             <div className="rounded-2xl border-2 border-black bg-white shadow-neo p-6 hover:-translate-y-1 transition-transform">
              <div className="flex items-center gap-4 mb-4">
                 <div className="p-2 rounded-lg bg-brand-black text-white border-2 border-black">
                    <span className="material-symbols-outlined">group_add</span>
                 </div>
                 <h3 className="text-xl font-bold font-display">Collaborate</h3>
              </div>
              <p className="text-gray-600">Work with your team in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-brand-black text-white">
        <div className="max-w-4xl mx-auto text-center border-2 border-white/20 rounded-2xl p-12 bg-white/5 backdrop-blur-sm relative overflow-hidden">
          <div className="absolute top-[-50px] right-[-50px] w-40 h-40 bg-brand-pink rounded-full blur-[100px]"></div>
          <div className="absolute bottom-[-50px] left-[-50px] w-40 h-40 bg-brand-blue rounded-full blur-[100px]"></div>
          
          <h2 className="text-4xl sm:text-5xl font-black font-display mb-6 relative z-10">
            Reclaim your weekends.
          </h2>
          <p className="text-xl text-gray-300 mb-10 relative z-10">
            Join thousands of happy teachers who plan in minutes, not hours.
          </p>
          <Link to="/auth" className="inline-block px-10 py-5 bg-brand-green text-black text-xl font-bold border-2 border-black rounded-xl shadow-[5px_5px_0px_0px_#ffffff] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all relative z-10">
            Get Started for Free
          </Link>
        </div>
      </section>
    </>
  );
};

export default LandingPage;