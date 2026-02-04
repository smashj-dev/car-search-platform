export interface Car {
  id: string;
  title: string;
  make: string;
  model: string;
  year: number;
  price: number;
  originalPrice?: number;
  mileage: number;
  fuelType: string;
  transmission: string;
  bodyType: string;
  location: string;
  images: string[];
  rating: number;
  reviewCount: number;
  features: string[];
  seller: {
    name: string;
    rating: number;
    verified: boolean;
  };
  badges: ('new' | 'featured' | 'price-drop' | 'verified')[];
}

export interface FilterOptions {
  make: string;
  model: string;
  year: string;
  minPrice: number;
  maxPrice: number;
  bodyType: string[];
  transmission: string[];
  fuelType: string[];
  features: string[];
}

export interface Category {
  id: string;
  name: string;
  image: string;
  count: number;
}

export interface Testimonial {
  id: string;
  name: string;
  role: string;
  location: string;
  avatar: string;
  rating: number;
  text: string;
}
