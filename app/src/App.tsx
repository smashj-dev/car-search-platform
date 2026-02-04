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
import type { Listing } from './api/client';

function App() {
  const [isLoginOpen, setIsLoginOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [selectedCar, setSelectedCar] = useState<Listing | null>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const [searchResults, setSearchResults] = useState<Listing[] | null>(null);
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

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
  };

  const handleSearch = (results: Listing[]) => {
    setSearchResults(results);
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
          searchResults={searchResults}
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
