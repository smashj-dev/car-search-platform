import { useEffect, useRef, useState } from 'react';
import { Search, BarChart3, MessageCircle, Car } from 'lucide-react';

const steps = [
  {
    icon: Search,
    number: '01',
    title: 'Browse',
    description: 'Explore thousands of verified listings with detailed specs, photos, and seller information.',
    color: 'bg-blue-500',
  },
  {
    icon: BarChart3,
    number: '02',
    title: 'Compare',
    description: 'Analyze prices, features, and reviews side by side to find the perfect match.',
    color: 'bg-purple-500',
  },
  {
    icon: MessageCircle,
    number: '03',
    title: 'Connect',
    description: 'Reach out to verified sellers directly and schedule test drives at your convenience.',
    color: 'bg-[#ff4600]',
  },
  {
    icon: Car,
    number: '04',
    title: 'Drive',
    description: 'Complete the purchase with confidence and drive away in your dream car.',
    color: 'bg-green-500',
  },
];

export default function HowItWorks() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.2 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="py-20 section-padding bg-white"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-1 bg-[#ff4600] rounded-full" />
            <span className="text-sm text-[#ff4600] font-medium uppercase tracking-wider">Simple Process</span>
            <div className="w-12 h-1 bg-[#ff4600] rounded-full" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">How It Works</h2>
          <p className="text-gray-600 text-lg">Four simple steps to your dream car. We make the journey seamless and enjoyable.</p>
        </div>

        {/* Steps Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8">
          {steps.map((step, index) => (
            <div
              key={step.number}
              className={`relative group transition-all duration-700 ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
              }`}
              style={{ transitionDelay: `${index * 150}ms` }}
            >
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-16 left-full w-full h-0.5 bg-gray-100 -z-10">
                  <div 
                    className={`h-full bg-gradient-to-r from-[#ff4600] to-orange-300 transition-all duration-1000 ${
                      isVisible ? 'w-full' : 'w-0'
                    }`}
                    style={{ transitionDelay: `${index * 200 + 500}ms` }}
                  />
                </div>
              )}

              <div className="relative bg-gray-50 rounded-2xl p-6 lg:p-8 hover:bg-white hover:shadow-xl transition-all duration-500 group-hover:-translate-y-2">
                {/* Step Number */}
                <div className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                  <span className="text-sm font-bold text-[#ff4600]">{step.number}</span>
                </div>

                {/* Icon */}
                <div className={`w-16 h-16 ${step.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg shadow-${step.color}/30 group-hover:scale-110 group-hover:rotate-3 transition-all duration-500`}>
                  <step.icon className="w-8 h-8 text-white" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-bold mb-3 group-hover:text-[#ff4600] transition-colors">
                  {step.title}
                </h3>
                <p className="text-gray-600 text-sm leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div className={`mt-16 text-center transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '800ms' }}>
          <a href="#listings" className="btn-primary inline-flex items-center gap-2">
            Start Browsing
            <span>→</span>
          </a>
        </div>
      </div>
    </section>
  );
}
