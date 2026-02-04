import { useEffect, useRef, useState } from 'react';
import { Heart, MapPin, Gauge, Fuel, Settings, Star, BadgeCheck, TrendingDown, Sparkles } from 'lucide-react';
import { cars } from '@/data/cars';
import type { Car } from '@/types';

interface FeaturedListingsProps {
  onCarClick: (car: Car) => void;
}

export default function FeaturedListings({ onCarClick }: FeaturedListingsProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

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

  const toggleFavorite = (e: React.MouseEvent, carId: string) => {
    e.stopPropagation();
    setFavorites(prev => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(carId)) {
        newFavorites.delete(carId);
      } else {
        newFavorites.add(carId);
      }
      return newFavorites;
    });
  };

  const getBadgeIcon = (badge: string) => {
    switch (badge) {
      case 'new':
        return <Sparkles className="w-3 h-3" />;
      case 'verified':
        return <BadgeCheck className="w-3 h-3" />;
      case 'price-drop':
        return <TrendingDown className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const getBadgeText = (badge: string) => {
    switch (badge) {
      case 'new':
        return 'New';
      case 'featured':
        return 'Featured';
      case 'verified':
        return 'Verified';
      case 'price-drop':
        return 'Price Drop';
      default:
        return badge;
    }
  };

  const getBadgeColor = (badge: string) => {
    switch (badge) {
      case 'new':
        return 'bg-green-500';
      case 'featured':
        return 'bg-[#ff4600]';
      case 'verified':
        return 'bg-blue-500';
      case 'price-drop':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  return (
    <section 
      id="listings"
      ref={sectionRef}
      className="py-20 section-padding"
    >
      <div className="max-w-7xl mx-auto">
        {/* Section Header */}
        <div className={`flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-12 transition-all duration-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-1 bg-[#ff4600] rounded-full" />
              <span className="text-sm text-[#ff4600] font-medium uppercase tracking-wider">Premium Selection</span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">Featured Listings</h2>
            <p className="text-gray-600 mt-2">Handpicked premium vehicles from verified sellers</p>
          </div>
          <a 
            href="#" 
            className="text-[#ff4600] font-medium flex items-center gap-2 hover:gap-3 transition-all group"
          >
            View All Cars
            <span className="transition-transform group-hover:translate-x-1">→</span>
          </a>
        </div>

        {/* Car Grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
          {cars.map((car, index) => (
            <div
              key={car.id}
              onClick={() => onCarClick(car)}
              className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer card-hover ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Image Container */}
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={car.images[0]}
                  alt={car.title}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
                
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  {car.badges.map((badge) => (
                    <span
                      key={badge}
                      className={`flex items-center gap-1 px-2.5 py-1 ${getBadgeColor(badge)} text-white text-xs font-medium rounded-full`}
                    >
                      {getBadgeIcon(badge)}
                      {getBadgeText(badge)}
                    </span>
                  ))}
                </div>
                
                {/* Favorite Button */}
                <button
                  onClick={(e) => toggleFavorite(e, car.id)}
                  className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    favorites.has(car.id)
                      ? 'bg-[#ff4600] text-white'
                      : 'bg-white/90 text-gray-600 hover:bg-white hover:text-[#ff4600]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favorites.has(car.id) ? 'fill-current' : ''}`} />
                </button>
                
                {/* Price Tag */}
                <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                  <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2">
                    <p className="text-lg font-bold text-[#ff4600]">${car.price.toLocaleString()}</p>
                    {car.originalPrice && (
                      <p className="text-xs text-gray-400 line-through">${car.originalPrice.toLocaleString()}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Title & Rating */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-[#ff4600] transition-colors">
                    {car.title}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">{car.rating}</span>
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Gauge className="w-4 h-4" />
                    <span className="text-xs">{car.mileage.toLocaleString()} mi</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Fuel className="w-4 h-4" />
                    <span className="text-xs">{car.fuelType}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <Settings className="w-4 h-4" />
                    <span className="text-xs">{car.transmission}</span>
                  </div>
                </div>

                {/* Location & Seller */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs">{car.location}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {car.seller.verified && (
                      <BadgeCheck className="w-4 h-4 text-blue-500" />
                    )}
                    <span className="text-xs text-gray-600">{car.seller.name}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
