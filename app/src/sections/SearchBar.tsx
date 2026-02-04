import { useState } from 'react';
import { Search, ChevronDown, SlidersHorizontal } from 'lucide-react';
import { makes, models, years } from '@/data/cars';
import type { FilterOptions } from '@/types';

interface SearchBarProps {
  filters: FilterOptions;
  onFilterChange: (filters: FilterOptions) => void;
  onFilterClick: () => void;
}

export default function SearchBar({ filters, onFilterChange, onFilterClick }: SearchBarProps) {
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const handleMakeChange = (make: string) => {
    onFilterChange({ ...filters, make, model: '' });
    setOpenDropdown(null);
  };

  const handleModelChange = (model: string) => {
    onFilterChange({ ...filters, model });
    setOpenDropdown(null);
  };

  const handleYearChange = (year: string) => {
    onFilterChange({ ...filters, year });
    setOpenDropdown(null);
  };

  const availableModels = filters.make ? models[filters.make] || ['Any Model'] : ['Any Model'];

  return (
    <section className="relative z-20 -mt-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div 
          className="bg-white rounded-2xl shadow-xl p-4 md:p-6 animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          <div className="flex flex-col lg:flex-row gap-4">
            {/* Make Dropdown */}
            <div className="relative flex-1">
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Make</label>
              <button
                onClick={() => setOpenDropdown(openDropdown === 'make' ? null : 'make')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
              >
                <span className={filters.make ? 'text-black' : 'text-gray-400'}>
                  {filters.make || 'Any Make'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openDropdown === 'make' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'make' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-auto z-50 animate-fade-in">
                  {makes.map((make) => (
                    <button
                      key={make}
                      onClick={() => handleMakeChange(make === 'Any Make' ? '' : make)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        filters.make === make || (make === 'Any Make' && !filters.make) ? 'text-[#ff4600] bg-orange-50' : 'text-gray-700'
                      }`}
                    >
                      {make}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-gray-200 self-stretch my-2" />

            {/* Model Dropdown */}
            <div className="relative flex-1">
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Model</label>
              <button
                onClick={() => setOpenDropdown(openDropdown === 'model' ? null : 'model')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
              >
                <span className={filters.model ? 'text-black' : 'text-gray-400'}>
                  {filters.model || 'Any Model'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openDropdown === 'model' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'model' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-auto z-50 animate-fade-in">
                  {availableModels.map((model) => (
                    <button
                      key={model}
                      onClick={() => handleModelChange(model === 'Any Model' ? '' : model)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        filters.model === model || (model === 'Any Model' && !filters.model) ? 'text-[#ff4600] bg-orange-50' : 'text-gray-700'
                      }`}
                    >
                      {model}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-gray-200 self-stretch my-2" />

            {/* Year Dropdown */}
            <div className="relative flex-1">
              <label className="block text-xs text-gray-500 mb-1.5 font-medium">Year</label>
              <button
                onClick={() => setOpenDropdown(openDropdown === 'year' ? null : 'year')}
                className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors text-left"
              >
                <span className={filters.year ? 'text-black' : 'text-gray-400'}>
                  {filters.year || 'Any Year'}
                </span>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${openDropdown === 'year' ? 'rotate-180' : ''}`} />
              </button>
              
              {openDropdown === 'year' && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-xl border border-gray-100 max-h-60 overflow-auto z-50 animate-fade-in">
                  {years.map((year) => (
                    <button
                      key={year}
                      onClick={() => handleYearChange(year === 'Any Year' ? '' : year)}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        filters.year === year || (year === 'Any Year' && !filters.year) ? 'text-[#ff4600] bg-orange-50' : 'text-gray-700'
                      }`}
                    >
                      {year}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="hidden lg:block w-px bg-gray-200 self-stretch my-2" />

            {/* Action Buttons */}
            <div className="flex gap-2">
              <button
                onClick={onFilterClick}
                className="px-4 py-3 border border-gray-200 rounded-xl hover:border-[#ff4600] hover:text-[#ff4600] transition-colors"
              >
                <SlidersHorizontal className="w-5 h-5" />
              </button>
              <button className="flex-1 lg:flex-none btn-primary flex items-center justify-center gap-2">
                <Search className="w-4 h-4" />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
