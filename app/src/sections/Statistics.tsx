import { useEffect, useRef, useState } from 'react';
import { TrendingUp, Users, Star, Shield } from 'lucide-react';

const stats = [
  {
    icon: TrendingUp,
    value: 10000,
    suffix: '+',
    label: 'Cars Listed',
    description: 'Premium vehicles available',
  },
  {
    icon: Users,
    value: 5000,
    suffix: '+',
    label: 'Happy Customers',
    description: 'Satisfied car buyers',
  },
  {
    icon: Star,
    value: 98,
    suffix: '%',
    label: 'Satisfaction Rate',
    description: 'Customer happiness score',
  },
  {
    icon: Shield,
    value: 100,
    suffix: '%',
    label: 'Verified Sellers',
    description: 'Trusted dealerships',
  },
];

function AnimatedCounter({ value, suffix, isVisible }: { value: number; suffix: string; isVisible: boolean }) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!isVisible) return;

    const duration = 2000;
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(Math.floor(current));
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value, isVisible]);

  return (
    <span>
      {count.toLocaleString()}
      {suffix}
    </span>
  );
}

export default function Statistics() {
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
      { threshold: 0.3 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      ref={sectionRef}
      className="py-20 section-padding bg-gradient-to-br from-gray-900 to-black text-white overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div className={`transition-all duration-700 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-10'}`}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-1 bg-[#ff4600] rounded-full" />
              <span className="text-sm text-[#ff4600] font-medium uppercase tracking-wider">Our Impact</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-6">
              Trusted by Thousands of Car Buyers
            </h2>
            <p className="text-gray-400 text-lg mb-8">
              We've helped over 5,000 customers find their perfect vehicle. Our commitment to quality and transparency has made us the most trusted automotive marketplace.
            </p>
            <a href="#listings" className="btn-primary inline-flex items-center gap-2">
              Explore Listings
              <span>→</span>
            </a>
          </div>

          {/* Right Content - Stats Grid */}
          <div className="grid grid-cols-2 gap-6">
            {stats.map((stat, index) => (
              <div
                key={stat.label}
                className={`relative group transition-all duration-700 ${
                  isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'
                }`}
                style={{ transitionDelay: `${index * 150}ms` }}
              >
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:bg-white/10 hover:border-[#ff4600]/50 transition-all duration-500">
                  {/* Icon */}
                  <div className="w-12 h-12 bg-[#ff4600]/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                    <stat.icon className="w-6 h-6 text-[#ff4600]" />
                  </div>

                  {/* Value */}
                  <div className="text-3xl sm:text-4xl font-bold mb-2 text-gradient">
                    <AnimatedCounter value={stat.value} suffix={stat.suffix} isVisible={isVisible} />
                  </div>

                  {/* Label */}
                  <h3 className="font-semibold text-lg mb-1">{stat.label}</h3>
                  <p className="text-gray-400 text-sm">{stat.description}</p>
                </div>

                {/* Glow Effect */}
                <div className="absolute inset-0 bg-[#ff4600]/5 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity -z-10" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
