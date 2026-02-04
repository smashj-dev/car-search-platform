import { useState } from 'react';
import { X, ChevronDown, SlidersHorizontal } from 'lucide-react';
import type { FilterOptions } from '@/types';
import { bodyTypes, transmissions, fuelTypes, features } from '@/data/cars';

interface FilterModalProps {
  isOpen: boolean;
  onClose: () => void;
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
}

export default function FilterModal({ isOpen, onClose, filters, onFilterChange }: FilterModalProps) {
  const [expandedSections, setExpandedSections] = useState<string[]>(['price', 'bodyType']);
  const [localFilters, setLocalFilters] = useState<FilterOptions>(filters);

  if (!isOpen) return null;

  const toggleSection = (section: string) => {
    setExpandedSections(prev =>
      prev.includes(section)
        ? prev.filter(s => s !== section)
        : [...prev, section]
    );
  };

  const handleApply = () => {
    onFilterChange(localFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: FilterOptions = {
      make: '',
      model: '',
      year: '',
      minPrice: 0,
      maxPrice: 200000,
      bodyType: [],
      transmission: [],
      fuelType: [],
      features: [],
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  const toggleArrayFilter = (key: keyof FilterOptions, value: string) => {
    setLocalFilters(prev => {
      const current = prev[key] as string[];
      const updated = current.includes(value)
        ? current.filter(v => v !== value)
        : [...current, value];
      return { ...prev, [key]: updated };
    });
  };

  const FilterSection = ({ title, id, children }: { title: string; id: string; children: React.ReactNode }) => (
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => toggleSection(id)}
        className="w-full flex items-center justify-between py-4 text-left"
      >
        <span className="font-medium">{title}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform ${expandedSections.includes(id) ? 'rotate-180' : ''}`} />
      </button>
      {expandedSections.includes(id) && (
        <div className="pb-4 animate-fade-in">{children}</div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white w-full max-w-md h-full overflow-auto animate-slide-up">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <SlidersHorizontal className="w-5 h-5 text-[#ff4600]" />
            <h2 className="text-xl font-bold">Filters</h2>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center hover:bg-gray-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Price Range */}
          <FilterSection title="Price Range" id="price">
            <div className="space-y-4">
              <div className="flex gap-4">
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Min</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={localFilters.minPrice}
                      onChange={(e) => setLocalFilters(prev => ({ ...prev, minPrice: Number(e.target.value) }))}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#ff4600]"
                    />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-500 mb-1 block">Max</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                    <input
                      type="number"
                      value={localFilters.maxPrice}
                      onChange={(e) => setLocalFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
                      className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-[#ff4600]"
                    />
                  </div>
                </div>
              </div>
              <input
                type="range"
                min="0"
                max="200000"
                step="5000"
                value={localFilters.maxPrice}
                onChange={(e) => setLocalFilters(prev => ({ ...prev, maxPrice: Number(e.target.value) }))}
                className="w-full accent-[#ff4600]"
              />
              <div className="flex justify-between text-sm text-gray-500">
                <span>$0</span>
                <span>$200k+</span>
              </div>
            </div>
          </FilterSection>

          {/* Body Type */}
          <FilterSection title="Body Type" id="bodyType">
            <div className="grid grid-cols-2 gap-2">
              {bodyTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => toggleArrayFilter('bodyType', type)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    localFilters.bodyType.includes(type)
                      ? 'bg-[#ff4600] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Transmission */}
          <FilterSection title="Transmission" id="transmission">
            <div className="flex flex-wrap gap-2">
              {transmissions.map((trans) => (
                <button
                  key={trans}
                  onClick={() => toggleArrayFilter('transmission', trans)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    localFilters.transmission.includes(trans)
                      ? 'bg-[#ff4600] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {trans}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Fuel Type */}
          <FilterSection title="Fuel Type" id="fuelType">
            <div className="flex flex-wrap gap-2">
              {fuelTypes.map((fuel) => (
                <button
                  key={fuel}
                  onClick={() => toggleArrayFilter('fuelType', fuel)}
                  className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
                    localFilters.fuelType.includes(fuel)
                      ? 'bg-[#ff4600] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {fuel}
                </button>
              ))}
            </div>
          </FilterSection>

          {/* Features */}
          <FilterSection title="Features" id="features">
            <div className="flex flex-wrap gap-2">
              {features.map((feature) => (
                <button
                  key={feature}
                  onClick={() => toggleArrayFilter('features', feature)}
                  className={`px-3 py-2 rounded-lg text-sm transition-all ${
                    localFilters.features.includes(feature)
                      ? 'bg-[#ff4600] text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {feature}
                </button>
              ))}
            </div>
          </FilterSection>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 px-6 py-4 flex gap-3">
          <button
            onClick={handleClear}
            className="flex-1 py-3 border border-gray-200 rounded-xl font-medium hover:border-[#ff4600] hover:text-[#ff4600] transition-colors"
          >
            Clear All
          </button>
          <button
            onClick={handleApply}
            className="flex-1 py-3 bg-[#ff4600] text-white rounded-xl font-medium hover:bg-black transition-colors"
          >
            Show Results
          </button>
        </div>
      </div>
    </div>
  );
}
