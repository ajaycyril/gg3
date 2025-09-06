-- Sample data for GadgetGuru database
-- Insert sample gadgets
INSERT INTO gadgets (id, name, brand, price, image_url, specs) VALUES 
(gen_random_uuid(), 'iPhone 15 Pro', 'Apple', 999.00, 'https://images.unsplash.com/photo-1592750475338-74b7b21085ab?w=500', 
 '{"display": "6.1 inch", "storage": "128GB", "camera": "48MP", "chip": "A17 Pro"}'),
(gen_random_uuid(), 'Galaxy S24 Ultra', 'Samsung', 1199.00, 'https://images.unsplash.com/photo-1610945265064-0e34e5519bbf?w=500',
 '{"display": "6.8 inch", "storage": "256GB", "camera": "200MP", "ram": "12GB"}'),
(gen_random_uuid(), 'MacBook Pro 14"', 'Apple', 1999.00, 'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=500',
 '{"display": "14.2 inch", "chip": "M3 Pro", "ram": "18GB", "storage": "512GB"}'),
(gen_random_uuid(), 'AirPods Pro 2nd Gen', 'Apple', 249.00, 'https://images.unsplash.com/photo-1606400082777-ef05f3c24cdd?w=500',
 '{"noise_cancellation": true, "battery_life": "6 hours", "spatial_audio": true}'),
(gen_random_uuid(), 'Steam Deck OLED', 'Valve', 549.00, 'https://images.unsplash.com/photo-1593305841991-05c297ba4575?w=500',
 '{"display": "7.4 inch OLED", "storage": "512GB", "battery": "50Wh", "ram": "16GB"}'),
(gen_random_uuid(), 'Nintendo Switch OLED', 'Nintendo', 349.00, 'https://images.unsplash.com/photo-1606144042614-b2417e99c4e3?w=500',
 '{"display": "7 inch OLED", "storage": "64GB", "battery_life": "9 hours", "docked_resolution": "1080p"}'
);

-- Insert sample reviews for the first gadget (iPhone 15 Pro)
WITH iphone_id AS (SELECT id FROM gadgets WHERE name = 'iPhone 15 Pro' LIMIT 1)
INSERT INTO reviews (gadget_id, content, author, source, rating) 
SELECT id, content, author, source, rating FROM iphone_id,
(VALUES 
 ('Amazing camera quality and the titanium build feels premium. Battery life is excellent.', 'TechReviewer123', 'Reddit', 5),
 ('The A17 Pro chip is incredibly fast. Gaming performance is top-notch.', 'GamerGuru', 'YouTube', 5),
 ('Price is steep but the features justify it. Love the Action Button.', 'AppleFan2024', 'Amazon', 4),
 ('Camera improvements over iPhone 14 Pro are noticeable in low light.', 'PhotoPro', 'Reddit', 4)
) AS reviews(content, author, source, rating);

-- Insert sample reviews for Galaxy S24 Ultra
WITH galaxy_id AS (SELECT id FROM gadgets WHERE name = 'Galaxy S24 Ultra' LIMIT 1)
INSERT INTO reviews (gadget_id, content, author, source, rating)
SELECT id, content, author, source, rating FROM galaxy_id,
(VALUES
 ('The S Pen integration is fantastic for productivity. 200MP camera is overkill but impressive.', 'ProductivityPro', 'Reddit', 5),
 ('Display quality is unmatched. The 120Hz feels buttery smooth.', 'DisplayEnthusiast', 'YouTube', 5),
 ('Battery life easily lasts a full day of heavy use. Fast charging is convenient.', 'PowerUser2024', 'Amazon', 4)
) AS reviews(content, author, source, rating);

-- Insert some normalized specs for better search
WITH gadget_specs AS (
  SELECT id, name FROM gadgets WHERE name IN ('iPhone 15 Pro', 'Galaxy S24 Ultra', 'MacBook Pro 14"')
)
INSERT INTO specs_normalized (gadget_id, key, value)
SELECT 
  g.id,
  spec.key,
  spec.value
FROM gadget_specs g
CROSS JOIN (
  VALUES 
    ('processor', 'A17 Pro'),
    ('display_size', '6.1'),
    ('camera_megapixels', '48'),
    ('storage_gb', '128')
) AS spec(key, value)
WHERE g.name = 'iPhone 15 Pro'

UNION ALL

SELECT 
  g.id,
  spec.key,
  spec.value
FROM gadget_specs g
CROSS JOIN (
  VALUES 
    ('processor', 'Snapdragon 8 Gen 3'),
    ('display_size', '6.8'),
    ('camera_megapixels', '200'),
    ('storage_gb', '256'),
    ('ram_gb', '12')
) AS spec(key, value)
WHERE g.name = 'Galaxy S24 Ultra'

UNION ALL

SELECT 
  g.id,
  spec.key,
  spec.value
FROM gadget_specs g
CROSS JOIN (
  VALUES 
    ('processor', 'M3 Pro'),
    ('display_size', '14.2'),
    ('ram_gb', '18'),
    ('storage_gb', '512')
) AS spec(key, value)
WHERE g.name = 'MacBook Pro 14"';

-- Insert some benchmark data
WITH gadget_benchmarks AS (
  SELECT id, name FROM gadgets WHERE name IN ('iPhone 15 Pro', 'Galaxy S24 Ultra', 'MacBook Pro 14"')
)
INSERT INTO benchmarks (gadget_id, context_json, score)
SELECT 
  g.id,
  benchmark.context,
  benchmark.score
FROM gadget_benchmarks g
CROSS JOIN (
  VALUES 
    ('{"test": "Geekbench 6", "category": "single_core"}'::jsonb, 2918),
    ('{"test": "Geekbench 6", "category": "multi_core"}'::jsonb, 7199),
    ('{"test": "3DMark", "category": "graphics"}'::jsonb, 8540)
) AS benchmark(context, score)
WHERE g.name = 'iPhone 15 Pro'

UNION ALL

SELECT 
  g.id,
  benchmark.context,
  benchmark.score
FROM gadget_benchmarks g
CROSS JOIN (
  VALUES 
    ('{"test": "Geekbench 6", "category": "single_core"}'::jsonb, 2234),
    ('{"test": "Geekbench 6", "category": "multi_core"}'::jsonb, 6807),
    ('{"test": "3DMark", "category": "graphics"}'::jsonb, 7890)
) AS benchmark(context, score)
WHERE g.name = 'Galaxy S24 Ultra';

-- Refresh statistics for better query performance
ANALYZE gadgets;
ANALYZE reviews;
ANALYZE specs_normalized;
ANALYZE benchmarks;