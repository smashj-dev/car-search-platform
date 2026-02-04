-- Seed dealers
INSERT INTO dealers (id, name, city, state, zip_code, latitude, longitude, dealer_type, created_at, updated_at) VALUES
('dealer-1', 'AutoNation Toyota', 'Los Angeles', 'CA', '90001', 34.0522, -118.2437, 'franchise', datetime('now'), datetime('now')),
('dealer-2', 'CarMax San Francisco', 'San Francisco', 'CA', '94102', 37.7749, -122.4194, 'independent', datetime('now'), datetime('now')),
('dealer-3', 'Honda of Downtown LA', 'Los Angeles', 'CA', '90012', 34.0522, -118.2437, 'franchise', datetime('now'), datetime('now'));

-- Seed listings
INSERT INTO listings (id, vin, year, make, model, trim, price, miles, condition, exterior_color, interior_color, engine, transmission, drivetrain, fuel_type, source, source_url, image_url, dealer_id, is_active, first_seen_at, last_seen_at, created_at, updated_at) VALUES
('listing-1', '5YJSA1E26HF123456', 2023, 'Tesla', 'Model S', 'Long Range', 74990, 12500, 'used', 'Pearl White', 'Black', 'Electric', 'Automatic', 'awd', 'electric', 'cars.com', 'https://cars.com/listing-1', 'https://images.example.com/tesla-1.jpg', 'dealer-1', 1, datetime('now', '-5 days'), datetime('now'), datetime('now'), datetime('now')),

('listing-2', '1HGCV1F36MA123789', 2022, 'Honda', 'Accord', 'EX-L', 28450, 23000, 'used', 'Modern Steel', 'Black', '1.5L Turbo I-4', 'CVT', 'fwd', 'gas', 'cars.com', 'https://cars.com/listing-2', 'https://images.example.com/honda-1.jpg', 'dealer-3', 1, datetime('now', '-3 days'), datetime('now'), datetime('now'), datetime('now')),

('listing-3', '5YJ3E1EB5MF234567', 2024, 'Tesla', 'Model 3', 'Performance', 52990, 5200, 'used', 'Midnight Silver', 'White', 'Electric', 'Automatic', 'awd', 'electric', 'cars.com', 'https://cars.com/listing-3', 'https://images.example.com/tesla-3.jpg', 'dealer-2', 1, datetime('now', '-1 day'), datetime('now'), datetime('now'), datetime('now')),

('listing-4', '2T3P1RFV8MW123456', 2023, 'Toyota', 'RAV4', 'XLE Premium', 32900, 18500, 'used', 'Blueprint', 'Black', '2.5L I-4', 'Automatic', 'awd', 'gas', 'cars.com', 'https://cars.com/listing-4', 'https://images.example.com/rav4-1.jpg', 'dealer-1', 1, datetime('now', '-2 days'), datetime('now'), datetime('now'), datetime('now')),

('listing-5', '3VW2B7AJ0KM234567', 2022, 'Volkswagen', 'Jetta', 'SEL', 24500, 28000, 'used', 'Pure White', 'Titan Black', '1.4L TSI', 'Automatic', 'fwd', 'gas', 'cars.com', 'https://cars.com/listing-5', 'https://images.example.com/vw-1.jpg', 'dealer-2', 1, datetime('now', '-4 days'), datetime('now'), datetime('now'), datetime('now')),

('listing-6', '1C4RJFBG5NC234567', 2023, 'Jeep', 'Wrangler', 'Rubicon', 48900, 15000, 'used', 'Firecracker Red', 'Black', '2.0L Turbo I-4', 'Automatic', '4wd', 'gas', 'cars.com', 'https://cars.com/listing-6', 'https://images.example.com/jeep-1.jpg', 'dealer-3', 1, datetime('now', '-6 days'), datetime('now'), datetime('now'), datetime('now')),

('listing-7', 'JTMEB3FV7MD123456', 2024, 'Toyota', 'RAV4', 'Hybrid XLE', 35900, 8500, 'used', 'Lunar Rock', 'Black', 'Hybrid 2.5L', 'CVT', 'awd', 'hybrid', 'cars.com', 'https://cars.com/listing-7', 'https://images.example.com/rav4-2.jpg', 'dealer-1', 1, datetime('now', '-1 day'), datetime('now'), datetime('now'), datetime('now')),

('listing-8', '19UUB2F38FA123456', 2023, 'Honda', 'Civic', 'Sport', 26750, 16200, 'used', 'Rallye Red', 'Black', '2.0L I-4', 'CVT', 'fwd', 'gas', 'cars.com', 'https://cars.com/listing-8', 'https://images.example.com/civic-1.jpg', 'dealer-3', 1, datetime('now', '-3 days'), datetime('now'), datetime('now'), datetime('now'));

-- Seed price history
INSERT INTO listing_price_history (id, listing_id, vin, price, miles, source, recorded_at) VALUES
('history-1', 'listing-1', '5YJSA1E26HF123456', 76990, 12000, 'cars.com', datetime('now', '-5 days')),
('history-2', 'listing-1', '5YJSA1E26HF123456', 74990, 12500, 'cars.com', datetime('now')),
('history-3', 'listing-4', '2T3P1RFV8MW123456', 34500, 18000, 'cars.com', datetime('now', '-2 days')),
('history-4', 'listing-4', '2T3P1RFV8MW123456', 32900, 18500, 'cars.com', datetime('now'));
