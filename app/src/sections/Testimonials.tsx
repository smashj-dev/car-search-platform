import { useEffect, useRef, useState } from 'react';
import { testimonials } from '@/data/cars';
import { Star, ChevronLeft, ChevronRight, Quote } from 'lucide-react';

export default function Testimonials() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

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

  const nextTestimonial = () => {
    setActiveIndex((prev) => (prev + 1) % testimonials.length);
  };

  const prevTestimonial = () => {
    setActiveIndex((prev) => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <section 
      id="testimonials"
      ref={sectionRef}
      className="py-20 section-padding bg-white overflow-hidden"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className={`text-center max-w-2xl mx-auto mb-16 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="w-12 h-1 bg-[#ff4600] rounded-full" />
            <span className="text-sm text-[#ff4600] font-medium uppercase tracking-wider">Testimonials</span>
            <div className="w-12 h-1 bg-[#ff4600] rounded-full" />
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold mb-4">What Our Customers Say</h2>
          <p className="text-gray-600 text-lg">Real stories from satisfied car buyers who found their perfect match</p>
        </div>

        {/* Testimonials Carousel */}
        <div className={`relative transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`} style={{ transitionDelay: '200ms' }}>
          <div className="relative max-w-4xl mx-auto">
            {/* Quote Icon */}
            <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 bg-[#ff4600] rounded-full flex items-center justify-center shadow-lg shadow-orange-500/30 z-10">
              <Quote className="w-6 h-6 text-white" />
            </div>

            {/* Main Card */}
            <div className="bg-gray-50 rounded-3xl p-8 md:p-12 pt-12 relative overflow-hidden">
              {/* Background Decoration */}
              <div className="absolute top-0 right-0 w-64 h-64 bg-orange-100/50 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
              <div className="absolute bottom-0 left-0 w-48 h-48 bg-orange-100/30 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

              <div className="relative">
                {testimonials.map((testimonial, index) => (
                  <div
                    key={testimonial.id}
                    className={`transition-all duration-500 ${
                      index === activeIndex
                        ? 'opacity-100 translate-x-0'
                        : 'opacity-0 absolute inset-0 translate-x-8'
                    }`}
                  >
                    {/* Stars */}
                    <div className="flex justify-center gap-1 mb-6">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-5 h-5 text-yellow-400 fill-current" />
                      ))}
                    </div>

                    {/* Quote */}
                    <p className="text-center text-lg md:text-xl text-gray-700 leading-relaxed mb-8 max-w-2xl mx-auto">
                      "{testimonial.text}"
                    </p>

                    {/* Author */}
                    <div className="flex flex-col items-center">
                      <img
                        src={testimonial.avatar}
                        alt={testimonial.name}
                        className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-lg mb-3"
                      />
                      <h4 className="font-bold text-lg">{testimonial.name}</h4>
                      <p className="text-gray-500 text-sm">{testimonial.role}</p>
                      <p className="text-gray-400 text-xs">{testimonial.location}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={prevTestimonial}
                className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-[#ff4600] hover:text-[#ff4600] transition-colors shadow-sm"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              {/* Dots */}
              <div className="flex gap-2">
                {testimonials.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveIndex(index)}
                    className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                      index === activeIndex
                        ? 'w-8 bg-[#ff4600]'
                        : 'bg-gray-300 hover:bg-gray-400'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={nextTestimonial}
                className="w-12 h-12 rounded-full bg-white border border-gray-200 flex items-center justify-center hover:border-[#ff4600] hover:text-[#ff4600] transition-colors shadow-sm"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
