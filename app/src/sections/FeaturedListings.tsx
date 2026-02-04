import { useEffect, useRef, useState } from 'react';
import { Heart, MapPin, Gauge, Fuel, Settings, Star, BadgeCheck, Sparkles } from 'lucide-react';
import { searchListings, type Listing } from '../api/client';

interface FeaturedListingsProps {
  onCarClick: (car: Listing) => void;
  searchResults?: Listing[] | null;
}

export default function FeaturedListings({ onCarClick, searchResults }: FeaturedListingsProps) {
  const sectionRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

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

  // Fetch listings from API or use search results
  useEffect(() => {
    async function loadListings() {
      // If we have search results, use those
      if (searchResults !== null && searchResults !== undefined) {
        setListings(searchResults);
        setLoading(false);
        return;
      }

      // Otherwise load default listings
      try {
        setLoading(true);
        const response = await searchListings({
          per_page: 6,
          sort_by: 'price',
          sort_order: 'asc',
        });
        setListings(response.data);
      } catch (error) {
        console.error('Error loading listings:', error);
      } finally {
        setLoading(false);
      }
    }

    loadListings();
  }, [searchResults]);

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

  const getCarTitle = (listing: Listing) => {
    return `${listing.year} ${listing.make} ${listing.model}${listing.trim ? ' ' + listing.trim : ''}`;
  };

  if (loading) {
    return (
      <section className="py-20 section-padding">
        <div className="max-w-7xl mx-auto text-center">
          <p className="text-gray-600">Loading listings...</p>
        </div>
      </section>
    );
  }

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
              <span className="text-sm text-[#ff4600] font-medium uppercase tracking-wider">
                {searchResults !== null ? 'Search Results' : 'Premium Selection'}
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold">
              {searchResults !== null ? `${listings.length} Cars Found` : 'Featured Listings'}
            </h2>
            <p className="text-gray-600 mt-2">
              {searchResults !== null ? 'Matching your search criteria' : 'Latest vehicles from verified sellers'}
            </p>
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
          {listings.map((listing, index) => (
            <div
              key={listing.id}
              onClick={() => onCarClick(listing)}
              className={`group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer card-hover ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-16'
              }`}
              style={{ transitionDelay: `${index * 100}ms` }}
            >
              {/* Image Container */}
              <div className="relative aspect-[4/3] overflow-hidden bg-gray-100">
                <img
                  src={listing.imageUrl || 'https://via.placeholder.com/400x300?text=No+Image'}
                  alt={getCarTitle(listing)}
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = 'https://via.placeholder.com/400x300?text=No+Image';
                  }}
                />

                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                {/* Badges */}
                <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                  {listing.condition === 'certified' && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                      <BadgeCheck className="w-3 h-3" />
                      Certified
                    </span>
                  )}
                  {listing.condition === 'new' && (
                    <span className="flex items-center gap-1 px-2.5 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                      <Sparkles className="w-3 h-3" />
                      New
                    </span>
                  )}
                </div>

                {/* Favorite Button */}
                <button
                  onClick={(e) => toggleFavorite(e, listing.id)}
                  className={`absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center transition-all duration-300 ${
                    favorites.has(listing.id)
                      ? 'bg-[#ff4600] text-white'
                      : 'bg-white/90 text-gray-600 hover:bg-white hover:text-[#ff4600]'
                  }`}
                >
                  <Heart className={`w-4 h-4 ${favorites.has(listing.id) ? 'fill-current' : ''}`} />
                </button>

                {/* Price Tag */}
                {listing.price && (
                  <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between opacity-0 group-hover:opacity-100 transition-all duration-500 translate-y-2 group-hover:translate-y-0">
                    <div className="bg-white/95 backdrop-blur-sm rounded-xl px-3 py-2">
                      <p className="text-lg font-bold text-[#ff4600]">${listing.price.toLocaleString()}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Content */}
              <div className="p-5">
                {/* Title */}
                <div className="flex items-start justify-between gap-2 mb-3">
                  <h3 className="font-semibold text-lg line-clamp-1 group-hover:text-[#ff4600] transition-colors">
                    {getCarTitle(listing)}
                  </h3>
                  <div className="flex items-center gap-1 shrink-0">
                    <Star className="w-4 h-4 text-yellow-400 fill-current" />
                    <span className="text-sm font-medium">4.8</span>
                  </div>
                </div>

                {/* Specs */}
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {listing.miles !== undefined && (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Gauge className="w-4 h-4" />
                      <span className="text-xs">{listing.miles.toLocaleString()} mi</span>
                    </div>
                  )}
                  {listing.fuelType && (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Fuel className="w-4 h-4" />
                      <span className="text-xs capitalize">{listing.fuelType}</span>
                    </div>
                  )}
                  {listing.transmission && (
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Settings className="w-4 h-4" />
                      <span className="text-xs">{listing.transmission}</span>
                    </div>
                  )}
                </div>

                {/* Location & Source */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-1.5 text-gray-500">
                    <MapPin className="w-4 h-4" />
                    <span className="text-xs capitalize">{listing.source}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-gray-600 capitalize">{listing.condition}</span>
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
