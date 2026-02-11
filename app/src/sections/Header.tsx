import { useState } from 'react';
import { Search, Menu, X, Heart, Car } from 'lucide-react';

interface HeaderProps {
  isScrolled: boolean;
  onLoginClick?: () => void; // Optional - auth disabled for now
  onFilterClick: () => void;
}

export default function Header({ isScrolled, onFilterClick }: HeaderProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Home', href: '#' },
    { name: 'Listings', href: '#listings' },
    { name: 'Categories', href: '#categories' },
    { name: 'About', href: '#testimonials' },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        isScrolled
          ? 'glass-effect shadow-lg py-3'
          : 'bg-transparent py-5'
      }`}
    >
      <div className="section-padding">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <a 
            href="#" 
            className="flex items-center gap-2 group transition-transform duration-300 hover:scale-105"
          >
            <div className="w-10 h-10 bg-[#ff4600] rounded-full flex items-center justify-center transition-all duration-300 group-hover:shadow-lg group-hover:shadow-orange-500/30">
              <Car className="w-5 h-5 text-white" />
            </div>
            <span className={`text-xl font-semibold transition-colors duration-300 ${
              isScrolled ? 'text-black' : 'text-black'
            }`}>
              AutoMarket
            </span>
          </a>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-8">
            {navLinks.map((link, index) => (
              <a
                key={link.name}
                href={link.href}
                className={`relative text-sm font-medium transition-colors duration-300 ${
                  isScrolled ? 'text-gray-700 hover:text-[#ff4600]' : 'text-gray-800 hover:text-[#ff4600]'
                }`}
                style={{ animationDelay: `${index * 80}ms` }}
              >
                {link.name}
                <span className="absolute -bottom-1 left-0 w-0 h-0.5 bg-[#ff4600] transition-all duration-300 hover:w-full" />
              </a>
            ))}
          </nav>

          {/* Desktop Actions */}
          <div className="hidden md:flex items-center gap-4">
            <button 
              onClick={onFilterClick}
              className={`p-2.5 rounded-full transition-all duration-300 ${
                isScrolled 
                  ? 'hover:bg-gray-100' 
                  : 'hover:bg-white/50'
              }`}
            >
              <Search className="w-5 h-5 text-gray-700" />
            </button>
            
            <button
              className={`p-2.5 rounded-full transition-all duration-300 ${
                isScrolled
                  ? 'hover:bg-gray-100'
                  : 'hover:bg-white/50'
              }`}
              title="Favorites"
            >
              <Heart className="w-5 h-5 text-gray-700" />
            </button>

            {/* Auth disabled during development - will add Google OAuth later */}
            {/* <button
              onClick={onLoginClick}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#ff4600] text-white rounded-full font-medium transition-all duration-300 hover:bg-black hover:scale-105"
            >
              <User className="w-4 h-4" />
              <span className="text-sm">Sign In</span>
            </button> */}
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-full hover:bg-gray-100 transition-colors"
          >
            {isMobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-100 animate-fade-in">
            <nav className="flex flex-col gap-2 mt-4">
              {navLinks.map((link) => (
                <a
                  key={link.name}
                  href={link.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  {link.name}
                </a>
              ))}
            </nav>
            <div className="mt-4 px-4">
              <button
                onClick={() => {
                  onFilterClick();
                  setIsMobileMenuOpen(false);
                }}
                className="w-full py-3 bg-[#ff4600] text-white rounded-full text-sm font-medium hover:bg-black transition-colors"
              >
                Advanced Search
              </button>
              {/* Auth disabled during development */}
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
