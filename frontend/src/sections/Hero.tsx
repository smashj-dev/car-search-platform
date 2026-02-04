import { useEffect, useRef } from 'react';
import { ArrowRight, Shield, Clock, MapPin } from 'lucide-react';

export default function Hero() {
  const heroRef = useRef<HTMLDivElement>(null);
  const carRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      if (!carRef.current) return;
      const scrollY = window.scrollY;
      const parallaxValue = scrollY * 0.3;
      carRef.current.style.transform = `translateY(${-parallaxValue}px)`;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <section 
      ref={heroRef}
      className="relative min-h-screen flex items-center pt-20 overflow-hidden"
    >
      {/* Animated Background */}
      <div className="absolute inset-0 bg-gradient-to-br from-orange-50 via-white to-orange-50">
        {/* Animated blobs */}
        <div className="absolute top-20 left-10 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl animate-pulse-slow" />
        <div className="absolute bottom-20 right-10 w-80 h-80 bg-orange-300/20 rounded-full blur-3xl animate-pulse-slow" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-radial from-orange-100/50 to-transparent rounded-full" />
        
        {/* Grid pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(#000 1px, transparent 1px), linear-gradient(90deg, #000 1px, transparent 1px)`,
            backgroundSize: '50px 50px'
          }}
        />
      </div>

      {/* Floating geometric shapes */}
      <div className="absolute top-32 right-20 w-16 h-16 border-2 border-[#ff4600]/20 rounded-lg rotate-12 animate-float hidden lg:block" />
      <div className="absolute bottom-40 left-20 w-12 h-12 bg-[#ff4600]/10 rounded-full animate-float hidden lg:block" style={{ animationDelay: '1s' }} />
      <div className="absolute top-1/3 right-1/4 w-8 h-8 border border-[#ff4600]/30 rotate-45 animate-float hidden lg:block" style={{ animationDelay: '2s' }} />

      <div className="section-padding relative z-10 w-full">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Content */}
          <div className="space-y-8">
            <div className="space-y-4">
              <div 
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full border border-orange-100 shadow-sm animate-slide-up"
              >
                <span className="w-2 h-2 bg-[#ff4600] rounded-full animate-pulse" />
                <span className="text-sm text-gray-600">Trusted by 10,000+ car buyers</span>
              </div>
              
              <h1 className="text-4xl sm:text-5xl lg:text-6xl xl:text-7xl font-bold leading-tight animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Find Your{' '}
                <span className="text-gradient">Perfect</span>{' '}
                Car
              </h1>
              
              <p 
                className="text-lg text-gray-600 max-w-lg animate-slide-up"
                style={{ animationDelay: '0.2s' }}
              >
                Browse thousands of verified listings from trusted dealers. 
                Compare prices, read reviews, and find your dream car today.
              </p>
            </div>

            {/* CTA Buttons */}
            <div 
              className="flex flex-wrap gap-4 animate-slide-up"
              style={{ animationDelay: '0.3s' }}
            >
              <a 
                href="#listings"
                className="btn-primary flex items-center gap-2 group"
              >
                Browse Cars
                <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
              <a 
                href="#categories"
                className="btn-secondary"
              >
                Explore Categories
              </a>
            </div>

            {/* Trust Badges */}
            <div 
              className="flex flex-wrap gap-6 pt-4 animate-slide-up"
              style={{ animationDelay: '0.4s' }}
            >
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Shield className="w-5 h-5 text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Verified Sellers</p>
                  <p className="text-xs text-gray-500">100% secure</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <Clock className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Fast Process</p>
                  <p className="text-xs text-gray-500">Quick approval</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Nationwide</p>
                  <p className="text-xs text-gray-500">50+ locations</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Content - Car Image */}
          <div className="relative hidden lg:block">
            <div className="relative z-10 animate-slide-up" style={{ animationDelay: '0.3s' }}>
              <img
                ref={carRef}
                src="/images/hero-car.png"
                alt="Luxury Car"
                className="w-full max-w-2xl mx-auto drop-shadow-2xl"
              />
            </div>
            
            {/* Glow effect behind car */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-gradient-radial from-orange-200/40 to-transparent rounded-full blur-3xl -z-0" />
            
            {/* Floating stats card */}
            <div 
              className="absolute bottom-20 -left-8 bg-white rounded-2xl shadow-xl p-4 animate-float hidden xl:block"
              style={{ animationDelay: '0.5s' }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-[#ff4600]/10 rounded-xl flex items-center justify-center">
                  <span className="text-2xl font-bold text-[#ff4600]">10K+</span>
                </div>
                <div>
                  <p className="text-sm font-medium">Cars Listed</p>
                  <p className="text-xs text-gray-500">Updated daily</p>
                </div>
              </div>
            </div>
            
            {/* Floating rating card */}
            <div 
              className="absolute top-20 -right-4 bg-white rounded-2xl shadow-xl p-4 animate-float hidden xl:block"
              style={{ animationDelay: '1s' }}
            >
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <svg key={i} className="w-4 h-4 text-yellow-400 fill-current" viewBox="0 0 20 20">
                      <path d="M10 15l-5.878 3.09 1.123-6.545L.489 6.91l6.572-.955L10 0l2.939 5.955 6.572.955-4.756 4.635 1.123 6.545z" />
                    </svg>
                  ))}
                </div>
                <span className="text-sm font-medium">4.9/5</span>
              </div>
              <p className="text-xs text-gray-500 mt-1">From 2,000+ reviews</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
