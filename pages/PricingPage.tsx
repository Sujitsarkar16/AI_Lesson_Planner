import React from 'react';

const PricingPage: React.FC = () => {
  return (
    <div className="flex flex-col gap-12 py-20 px-4 lg:px-10 bg-background-light">
      <div className="flex flex-col items-center gap-4 text-center">
        <h1 className="text-5xl font-black font-display text-brand-black tracking-tight">
          Simple Pricing.
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl">
          Start for free, upgrade when you need superpowers.
        </p>
      </div>

      {/* PricingCards */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 w-full">
        {/* Free */}
        <div className="flex flex-col gap-6 rounded-2xl border-2 border-black bg-white shadow-neo p-8 hover:-translate-y-1 transition-transform relative">
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-bold font-display">Free Tier</h3>
            <p className="flex items-baseline gap-1 text-brand-black">
              <span className="text-5xl font-black tracking-tighter">$0</span>
              <span className="text-lg font-bold text-gray-500">/mo</span>
            </p>
            <p className="text-sm font-bold text-gray-500 mt-2">Perfect for trying it out.</p>
          </div>
          
          <div className="w-full border-t-2 border-dashed border-gray-200"></div>

          <div className="flex flex-col gap-4 flex-1">
             {['5 lesson plans/mo', 'Basic PDF export', '2 free templates', 'Standard support'].map(item => (
                <div key={item} className="flex gap-3 text-gray-700 font-medium">
                  <span className="material-symbols-outlined text-brand-black font-bold">check</span>
                  <span>{item}</span>
                </div>
             ))}
          </div>

          <button className="w-full h-12 bg-white text-black text-base font-bold border-2 border-black rounded-lg hover:bg-gray-50 transition-colors">
            Get Started
          </button>
        </div>

        {/* Pro */}
        <div className="flex flex-col gap-6 rounded-2xl border-2 border-black bg-brand-yellow shadow-neo-lg p-8 transform md:-translate-y-4 relative">
          <div className="absolute top-0 right-0 bg-brand-black text-white text-xs font-bold px-3 py-1 rounded-bl-xl border-l-2 border-b-2 border-black">
             POPULAR
          </div>
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-bold font-display">Pro Teacher</h3>
            <p className="flex items-baseline gap-1 text-brand-black">
              <span className="text-5xl font-black tracking-tighter">$12</span>
              <span className="text-lg font-bold text-gray-800">/mo</span>
            </p>
            <p className="text-sm font-bold text-gray-800 mt-2">Unlimited power.</p>
          </div>

          <div className="w-full border-t-2 border-dashed border-black/20"></div>

          <div className="flex flex-col gap-4 flex-1">
            {['Unlimited lesson plans', 'Standards alignment', 'Worksheet & quiz generator', 'Smart Calendar', 'Export to PDF & Docx'].map(item => (
                <div key={item} className="flex gap-3 text-gray-900 font-bold">
                  <span className="material-symbols-outlined text-black font-bold">check_circle</span>
                  <span>{item}</span>
                </div>
             ))}
          </div>
          
          <button className="w-full h-12 bg-brand-black text-white text-base font-bold border-2 border-black rounded-lg shadow-neo-sm hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px] transition-all">
            Choose Plan
          </button>
        </div>

        {/* Team/School */}
        <div className="flex flex-col gap-6 rounded-2xl border-2 border-black bg-white shadow-neo p-8 hover:-translate-y-1 transition-transform relative">
          <div className="flex flex-col gap-2">
            <h3 className="text-2xl font-bold font-display">Schools</h3>
            <p className="flex items-baseline gap-1 text-brand-black">
              <span className="text-5xl font-black tracking-tighter">$49</span>
              <span className="text-lg font-bold text-gray-500">/mo</span>
            </p>
            <p className="text-sm font-bold text-gray-500 mt-2">For departments & admin.</p>
          </div>

          <div className="w-full border-t-2 border-dashed border-gray-200"></div>

          <div className="flex flex-col gap-4 flex-1">
             {['Shared Library', 'Real-time Collaboration', 'Admin Analytics', 'Dedicated support', 'Onboarding'].map(item => (
                <div key={item} className="flex gap-3 text-gray-700 font-medium">
                  <span className="material-symbols-outlined text-brand-black font-bold">check</span>
                  <span>{item}</span>
                </div>
             ))}
          </div>

          <button className="w-full h-12 bg-white text-black text-base font-bold border-2 border-black rounded-lg hover:bg-gray-50 transition-colors">
            Contact Sales
          </button>
        </div>
      </div>
    </div>
  );
};

export default PricingPage;