import { useEffect, useRef, useState } from 'react';
import { categories } from '@/data/cars';
import { ArrowRight } from 'lucide-react';

export default function Categories() {
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
      { threshold: 0.1 }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <section 
      id="categories"
      ref={sectionRef}
      className="py-20 section-padding bg-gray-50"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-1 bg-[#ff4600] rounded-full" />
              <span className="text-sm text-[#ff4600] font-medium uppercase tracking-wider">Explore</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Browse by Category</h2>
            <p className="text-gray-600 mt-2">Find the perfect vehicle type for your lifestyle</p>
          </div>
        </div>

        {/* Categories Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 lg:gap-6">
          {categories.map((category, index) => (
            <a
              key={category.id}
              href="#listings"
              className={`group relative overflow-hidden rounded-2xl aspect-square transition-all duration-700 ${
                isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Background Image */}
              <img
                src={category.image}
                alt={category.name}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
              />
              
              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent transition-all duration-500 group-hover:from-[#ff4600]/90 group-hover:via-[#ff4600]/50" />
              
              {/* Content */}
              <div className="absolute inset-0 flex flex-col justify-end p-4 lg:p-5">
                <h3 className="text-white font-bold text-lg lg:text-xl mb-1 group-hover:translate-y-0 transition-transform">
                  {category.name}
                </h3>
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-sm">{category.count.toLocaleString()} cars</span>
                  <div className="w-8 h-8 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0">
                    <ArrowRight className="w-4 h-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Hover Border */}
              <div className="absolute inset-0 border-2 border-white/0 rounded-2xl transition-all duration-300 group-hover:border-white/30" />
            </a>
          ))}
        </div>
      </div>
    </section>
  );
}
