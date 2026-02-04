import { useState, useEffect } from 'react';
import Header from './sections/Header';
import Hero from './sections/Hero';
import SearchBar from './sections/SearchBar';
import FeaturedListings from './sections/FeaturedListings';
import HowItWorks from './sections/HowItWorks';
import Categories from './sections/Categories';
import Testimonials from './sections/Testimonials';
import Statistics from './sections/Statistics';
import Newsletter from './sections/Newsletter';
import Footer from './sections/Footer';
import LoginModal from './components/LoginModal';
import FilterModal from './components/FilterModal';
import CarDetailModal from './components/CarDetailModal';
import type { FilterOptions } from './types';
import { searchListings, type Listing, type SearchResponse } from './api/client';

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Listing | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchResponse, setSearchResponse] = useState<SearchResponse | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    make: '',
    model: '',
    year: '',
    minPrice: 0,
    maxPrice: 200000,
    bodyType: [],
    transmission: [],
    fuelType: [],
    features: [],
  });

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleCarClick = (car: Listing) => {
    setSelectedCar(car);
  };

  const handleFilterChange = async (newFilters: FilterOptions) => {
    setFilters(newFilters);

    // Trigger search with new filters
    try {
      const params: any = {
        per_page: 12,
        sort_by: 'price',
        sort_order: 'asc',
      };

      if (newFilters.make) params.make = newFilters.make;
      if (newFilters.model) params.model = newFilters.model;
      if (newFilters.year) params.year_min = parseInt(newFilters.year);
      if (newFilters.minPrice > 0) params.price_min = newFilters.minPrice;
      if (newFilters.maxPrice < 200000) params.price_max = newFilters.maxPrice;

      // Map frontend filter names to backend params
      if (newFilters.transmission && newFilters.transmission.length > 0) {
        params.transmission = newFilters.transmission[0]; // API accepts single value
      }
      if (newFilters.fuelType && newFilters.fuelType.length > 0) {
        params.fuel_type = newFilters.fuelType[0];
      }

      const response = await searchListings(params);
      setSearchResponse(response);

      // Scroll to results
      setTimeout(() => {
        document.getElementById('listings')?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (error) {
      console.error('Filter search error:', error);
    }
  };

  const handleSearch = (response: SearchResponse) => {
    setSearchResponse(response);
  };

  return (
    <div className="min-h-screen bg-[#f5f5f5]">
      <Header 
        isScrolled={isScrolled} 
        onLoginClick={() => setIsLoginOpen(true)}
        onFilterClick={() => setIsFilterOpen(true)}
      />
      
      <main>
        <Hero />
        <SearchBar
          filters={filters}
          onFilterChange={handleFilterChange}
          onFilterClick={() => setIsFilterOpen(true)}
          onSearch={handleSearch}
        />
        <FeaturedListings
          onCarClick={handleCarClick}
          searchResponse={searchResponse}
        />
        <HowItWorks />
        <Categories />
        <Testimonials />
        <Statistics />
        <Newsletter />
      </main>
      
      <Footer />
      
      <LoginModal isOpen={isLoginOpen} onClose={() => setIsLoginOpen(false)} />
      
      <FilterModal 
        isOpen={isFilterOpen} 
        onClose={() => setIsFilterOpen(false)}
        filters={filters}
        onFilterChange={handleFilterChange}
      />
      
      <CarDetailModal 
        car={selectedCar}
        isOpen={!!selectedCar}
        onClose={() => setSelectedCar(null)}
      />
    </div>
  );
}

export default App;
