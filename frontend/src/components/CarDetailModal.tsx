import { X, MapPin, Gauge, Fuel, Settings, Calendar, User, Star, BadgeCheck, Heart, Share2, Phone, Mail } from 'lucide-react';
import type { Car } from '@/types';

interface CarDetailModalProps {
  car: Car | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CarDetailModal({ car, isOpen, onClose }: CarDetailModalProps) {
  if (!isOpen || !car) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-auto animate-scale-in">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center hover:bg-white transition-colors shadow-lg"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="grid md:grid-cols-2">
          {/* Image Section */}
          <div className="relative aspect-square md:aspect-auto">
            <img
              src={car.images[0]}
              alt={car.title}
              className="w-full h-full object-cover"
            />
            
            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {car.badges.map((badge) => (
                <span
                  key={badge}
                  className={`px-3 py-1 text-xs font-medium rounded-full text-white ${
                    badge === 'new' ? 'bg-green-500' :
                    badge === 'featured' ? 'bg-[#ff4600]' :
                    badge === 'verified' ? 'bg-blue-500' :
                    'bg-red-500'
                  }`}
                >
                  {badge === 'price-drop' ? 'Price Drop' : badge.charAt(0).toUpperCase() + badge.slice(1)}
                </span>
              ))}
            </div>

            {/* Action Buttons */}
            <div className="absolute bottom-4 right-4 flex gap-2">
              <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                <Heart className="w-5 h-5 text-gray-600" />
              </button>
              <button className="w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center hover:bg-white transition-colors shadow-lg">
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-6 lg:p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <Star className="w-5 h-5 text-yellow-400 fill-current" />
                <span className="font-medium">{car.rating}</span>
                <span className="text-gray-400">({car.reviewCount} reviews)</span>
              </div>
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">{car.title}</h2>
              <div className="flex items-center gap-2 text-gray-500">
                <MapPin className="w-4 h-4" />
                <span className="text-sm">{car.location}</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              <span className="text-3xl lg:text-4xl font-bold text-[#ff4600]">
                ${car.price.toLocaleString()}
              </span>
              {car.originalPrice && (
                <span className="text-lg text-gray-400 line-through">
                  ${car.originalPrice.toLocaleString()}
                </span>
              )}
            </div>

            {/* Specs Grid */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Calendar className="w-5 h-5 text-[#ff4600]" />
                <div>
                  <p className="text-xs text-gray-500">Year</p>
                  <p className="font-medium">{car.year}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Gauge className="w-5 h-5 text-[#ff4600]" />
                <div>
                  <p className="text-xs text-gray-500">Mileage</p>
                  <p className="font-medium">{car.mileage.toLocaleString()} mi</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Fuel className="w-5 h-5 text-[#ff4600]" />
                <div>
                  <p className="text-xs text-gray-500">Fuel Type</p>
                  <p className="font-medium">{car.fuelType}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                <Settings className="w-5 h-5 text-[#ff4600]" />
                <div>
                  <p className="text-xs text-gray-500">Transmission</p>
                  <p className="font-medium">{car.transmission}</p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Features</h3>
              <div className="flex flex-wrap gap-2">
                {car.features.map((feature) => (
                  <span
                    key={feature}
                    className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>

            {/* Seller Info */}
            <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl mb-6">
              <div className="w-12 h-12 bg-[#ff4600]/10 rounded-full flex items-center justify-center">
                <User className="w-6 h-6 text-[#ff4600]" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-medium">{car.seller.name}</h4>
                  {car.seller.verified && (
                    <BadgeCheck className="w-4 h-4 text-blue-500" />
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <Star className="w-3 h-3 text-yellow-400 fill-current" />
                  <span className="text-sm text-gray-500">{car.seller.rating} seller rating</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button className="flex-1 py-3.5 bg-[#ff4600] text-white rounded-xl font-medium hover:bg-black transition-colors flex items-center justify-center gap-2">
                <Phone className="w-4 h-4" />
                Contact Seller
              </button>
              <button className="flex-1 py-3.5 border border-gray-200 rounded-xl font-medium hover:border-[#ff4600] hover:text-[#ff4600] transition-colors flex items-center justify-center gap-2">
                <Mail className="w-4 h-4" />
                Send Message
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
