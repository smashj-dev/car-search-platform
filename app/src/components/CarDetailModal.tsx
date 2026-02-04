import { X, MapPin, Gauge, Fuel, Settings, Calendar, BadgeCheck, Heart, Share2, Phone, Mail, Sparkles } from 'lucide-react';
import type { Listing } from '../api/client';

interface CarDetailModalProps {
  car: Listing | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CarDetailModal({ car, isOpen, onClose }: CarDetailModalProps) {
  if (!isOpen || !car) return null;

  const carTitle = `${car.year} ${car.make} ${car.model}${car.trim ? ' ' + car.trim : ''}`;
  const imageUrl = car.imageUrl || 'https://via.placeholder.com/800x600?text=No+Image';

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
          <div className="relative aspect-square md:aspect-auto bg-gray-100">
            <img
              src={imageUrl}
              alt={carTitle}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://via.placeholder.com/800x600?text=No+Image';
              }}
            />

            {/* Badges */}
            <div className="absolute top-4 left-4 flex flex-wrap gap-2">
              {car.condition === 'new' && (
                <span className="flex items-center gap-1 px-3 py-1 bg-green-500 text-white text-xs font-medium rounded-full">
                  <Sparkles className="w-3 h-3" />
                  New
                </span>
              )}
              {car.condition === 'certified' && (
                <span className="flex items-center gap-1 px-3 py-1 bg-blue-500 text-white text-xs font-medium rounded-full">
                  <BadgeCheck className="w-3 h-3" />
                  Certified
                </span>
              )}
              <span className="px-3 py-1 bg-[#ff4600] text-white text-xs font-medium rounded-full">
                {car.source}
              </span>
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
              <h2 className="text-2xl lg:text-3xl font-bold mb-2">{carTitle}</h2>
              <div className="flex items-center gap-2 text-gray-500">
                <MapPin className="w-4 h-4" />
                <span className="text-sm capitalize">{car.source}</span>
              </div>
              {car.vin && (
                <div className="mt-2">
                  <span className="text-xs text-gray-400">VIN: {car.vin}</span>
                </div>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3 mb-6">
              {car.price ? (
                <span className="text-3xl lg:text-4xl font-bold text-[#ff4600]">
                  ${car.price.toLocaleString()}
                </span>
              ) : (
                <span className="text-2xl text-gray-500">Contact for Price</span>
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
              {car.miles !== undefined && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Gauge className="w-5 h-5 text-[#ff4600]" />
                  <div>
                    <p className="text-xs text-gray-500">Mileage</p>
                    <p className="font-medium">{car.miles.toLocaleString()} mi</p>
                  </div>
                </div>
              )}
              {car.fuelType && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Fuel className="w-5 h-5 text-[#ff4600]" />
                  <div>
                    <p className="text-xs text-gray-500">Fuel Type</p>
                    <p className="font-medium capitalize">{car.fuelType}</p>
                  </div>
                </div>
              )}
              {car.transmission && (
                <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl">
                  <Settings className="w-5 h-5 text-[#ff4600]" />
                  <div>
                    <p className="text-xs text-gray-500">Transmission</p>
                    <p className="font-medium">{car.transmission}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Additional Details */}
            <div className="mb-6">
              <h3 className="font-semibold mb-3">Vehicle Details</h3>
              <div className="space-y-2 text-sm">
                {car.exteriorColor && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Exterior Color:</span>
                    <span className="font-medium">{car.exteriorColor}</span>
                  </div>
                )}
                {car.interiorColor && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Interior Color:</span>
                    <span className="font-medium">{car.interiorColor}</span>
                  </div>
                )}
                {car.engine && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Engine:</span>
                    <span className="font-medium">{car.engine}</span>
                  </div>
                )}
                {car.drivetrain && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Drivetrain:</span>
                    <span className="font-medium uppercase">{car.drivetrain}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-gray-500">Condition:</span>
                  <span className="font-medium capitalize">{car.condition}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <a
                href={car.sourceUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 py-3.5 bg-[#ff4600] text-white rounded-xl font-medium hover:bg-black transition-colors flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                View on {car.source}
              </a>
              <button className="px-6 py-3.5 border border-gray-200 rounded-xl font-medium hover:border-[#ff4600] hover:text-[#ff4600] transition-colors flex items-center justify-center gap-2">
                <Heart className="w-4 h-4" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
