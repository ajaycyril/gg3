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

-- Add more laptops to improve ML recommendations
INSERT INTO gadgets (id, name, brand, price, image_url, specs) VALUES 
(gen_random_uuid(), 'ASUS TUF Gaming F15 Laptop', 'ASUS', 999.00, 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=500',
 '{"processor": "Intel i7-12700H", "ram": "16GB", "storage": "512GB SSD", "graphics": "NVIDIA RTX 3050"}'),
(gen_random_uuid(), 'Acer Nitro 5 Gaming Laptop', 'Acer', 899.00, 'https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=500',
 '{"processor": "Intel i5-12500H", "ram": "16GB", "storage": "512GB SSD", "graphics": "NVIDIA RTX 3050 Ti"}'),
(gen_random_uuid(), 'Lenovo IdeaPad 5 Laptop', 'Lenovo', 749.00, 'https://images.unsplash.com/photo-1527430253228-e93688616381?w=500',
 '{"processor": "AMD Ryzen 7 5700U", "ram": "16GB", "storage": "512GB SSD", "graphics": "Integrated Radeon"}'),
(gen_random_uuid(), 'Dell XPS 13 Laptop', 'Dell', 1299.00, 'https://images.unsplash.com/photo-1517331156700-3c241d2b4d83?w=500',
 '{"processor": "Intel i7-1360P", "ram": "16GB", "storage": "512GB SSD", "graphics": "Intel Iris Xe"}');

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

-- =============================================================================
-- GadgetGuru Enterprise Database Seed Data
-- Initialize default tenant and sample categories/attributes for laptop vertical
-- =============================================================================

-- Create default tenant for backward compatibility
INSERT INTO public.tenants (
    id,
    name,
    slug,
    domain,
    plan,
    settings,
    quotas
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'GadgetGuru Default',
    'default',
    'gadgetguru.ai',
    'enterprise',
    '{"theme": "dark", "branding": {"logo_url": "", "primary_color": "#3b82f6"}}',
    '{"requests_per_hour": 10000, "storage_gb": 100, "users": 1000}'
) ON CONFLICT (slug) DO NOTHING;

-- Create sample tenant for testing
INSERT INTO public.tenants (
    id,
    name,
    slug,
    domain,
    plan,
    settings,
    quotas
) VALUES (
    gen_random_uuid(),
    'Demo Electronics Store',
    'demo-store',
    'demo.gadgetguru.ai',
    'professional',
    '{"theme": "light", "branding": {"logo_url": "", "primary_color": "#10b981"}}',
    '{"requests_per_hour": 1000, "storage_gb": 50, "users": 100}'
) ON CONFLICT (slug) DO NOTHING;

-- =============================================================================
-- CATEGORY HIERARCHY FOR CONSUMER ELECTRONICS
-- =============================================================================

-- Root categories
INSERT INTO public.categories (id, tenant_id, name, slug, description, parent_id, hierarchy_path, level, sort_order) VALUES
('cat-laptops', '00000000-0000-0000-0000-000000000001', 'Laptops & Notebooks', 'laptops', 'Portable computing devices', NULL, '{}', 0, 1),
('cat-smartphones', '00000000-0000-0000-0000-000000000001', 'Smartphones', 'smartphones', 'Mobile phones and accessories', NULL, '{}', 0, 2),
('cat-tablets', '00000000-0000-0000-0000-000000000001', 'Tablets', 'tablets', 'Tablet computers and e-readers', NULL, '{}', 0, 3),
('cat-gaming', '00000000-0000-0000-0000-000000000001', 'Gaming', 'gaming', 'Gaming hardware and accessories', NULL, '{}', 0, 4),
('cat-audio', '00000000-0000-0000-0000-000000000001', 'Audio & Headphones', 'audio', 'Sound equipment and accessories', NULL, '{}', 0, 5),
('cat-wearables', '00000000-0000-0000-0000-000000000001', 'Wearables', 'wearables', 'Smart watches and fitness trackers', NULL, '{}', 0, 6)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- Laptop subcategories
INSERT INTO public.categories (id, tenant_id, name, slug, description, parent_id, hierarchy_path, level, sort_order) VALUES
('cat-laptops-gaming', '00000000-0000-0000-0000-000000000001', 'Gaming Laptops', 'gaming-laptops', 'High-performance laptops for gaming', 'cat-laptops', '{cat-laptops}', 1, 1),
('cat-laptops-business', '00000000-0000-0000-0000-000000000001', 'Business Laptops', 'business-laptops', 'Professional and enterprise laptops', 'cat-laptops', '{cat-laptops}', 1, 2),
('cat-laptops-ultrabook', '00000000-0000-0000-0000-000000000001', 'Ultrabooks', 'ultrabooks', 'Thin and light premium laptops', 'cat-laptops', '{cat-laptops}', 1, 3),
('cat-laptops-budget', '00000000-0000-0000-0000-000000000001', 'Budget Laptops', 'budget-laptops', 'Affordable everyday laptops', 'cat-laptops', '{cat-laptops}', 1, 4),
('cat-laptops-workstation', '00000000-0000-0000-0000-000000000001', 'Workstations', 'workstations', 'High-end laptops for creative professionals', 'cat-laptops', '{cat-laptops}', 1, 5)
ON CONFLICT (tenant_id, slug) DO NOTHING;

-- =============================================================================
-- ATTRIBUTES FOR LAPTOP CATEGORY
-- =============================================================================

-- Performance attributes
INSERT INTO public.attributes (id, tenant_id, category_id, name, slug, data_type, unit, enum_values, validation_rules, is_required, is_filterable, is_searchable, sort_order) VALUES
('attr-cpu', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Processor', 'processor', 'text', NULL, NULL, '{}', false, true, true, 1),
('attr-cpu-cores', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'CPU Cores', 'cpu_cores', 'number', 'cores', NULL, '{"min": 2, "max": 32}', false, true, false, 2),
('attr-ram', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'RAM Memory', 'ram', 'number', 'GB', NULL, '{"min": 4, "max": 128}', true, true, false, 3),
('attr-storage-size', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Storage Size', 'storage_size', 'number', 'GB', NULL, '{"min": 128, "max": 8192}', true, true, false, 4),
('attr-storage-type', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Storage Type', 'storage_type', 'enum', NULL, '["SSD", "HDD", "Hybrid", "eMMC"]', '{}', false, true, false, 5),
('attr-gpu', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Graphics Card', 'gpu', 'text', NULL, NULL, '{}', false, true, true, 6),
('attr-gpu-memory', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'GPU Memory', 'gpu_memory', 'number', 'GB', NULL, '{"min": 0, "max": 24}', false, true, false, 7)
ON CONFLICT (tenant_id, category_id, slug) DO NOTHING;

-- Display attributes
INSERT INTO public.attributes (id, tenant_id, category_id, name, slug, data_type, unit, enum_values, validation_rules, is_required, is_filterable, is_searchable, sort_order) VALUES
('attr-screen-size', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Screen Size', 'screen_size', 'number', 'inches', NULL, '{"min": 11, "max": 18}', true, true, false, 10),
('attr-resolution', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Resolution', 'resolution', 'enum', NULL, '["1366x768", "1920x1080", "2560x1440", "3840x2160", "2880x1800"]', '{}', false, true, false, 11),
('attr-panel-type', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Panel Type', 'panel_type', 'enum', NULL, '["IPS", "TN", "VA", "OLED", "Mini LED"]', '{}', false, true, false, 12),
('attr-refresh-rate', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Refresh Rate', 'refresh_rate', 'number', 'Hz', NULL, '{"min": 60, "max": 360}', false, true, false, 13),
('attr-touchscreen', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Touchscreen', 'touchscreen', 'boolean', NULL, NULL, '{}', false, true, false, 14)
ON CONFLICT (tenant_id, category_id, slug) DO NOTHING;

-- Physical attributes
INSERT INTO public.attributes (id, tenant_id, category_id, name, slug, data_type, unit, enum_values, validation_rules, is_required, is_filterable, is_searchable, sort_order) VALUES
('attr-weight', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Weight', 'weight', 'range', 'kg', NULL, '{"min": 0.8, "max": 5.0}', false, true, false, 20),
('attr-thickness', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Thickness', 'thickness', 'number', 'mm', NULL, '{"min": 10, "max": 40}', false, true, false, 21),
('attr-battery', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Battery Life', 'battery_life', 'number', 'hours', NULL, '{"min": 3, "max": 24}', false, true, false, 22),
('attr-material', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Build Material', 'build_material', 'enum', NULL, '["Plastic", "Aluminum", "Magnesium", "Carbon Fiber", "Steel"]', '{}', false, true, false, 23)
ON CONFLICT (tenant_id, category_id, slug) DO NOTHING;

-- Connectivity attributes
INSERT INTO public.attributes (id, tenant_id, category_id, name, slug, data_type, unit, enum_values, validation_rules, is_required, is_filterable, is_searchable, sort_order) VALUES
('attr-wifi', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'WiFi Standard', 'wifi', 'enum', NULL, '["WiFi 4", "WiFi 5", "WiFi 6", "WiFi 6E", "WiFi 7"]', '{}', false, true, false, 30),
('attr-bluetooth', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Bluetooth', 'bluetooth', 'enum', NULL, '["4.0", "4.1", "4.2", "5.0", "5.1", "5.2", "5.3"]', '{}', false, true, false, 31),
('attr-usb-ports', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'USB Ports', 'usb_ports', 'number', 'ports', NULL, '{"min": 0, "max": 8}', false, true, false, 32),
('attr-hdmi', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'HDMI Port', 'hdmi', 'boolean', NULL, NULL, '{}', false, true, false, 33),
('attr-ethernet', '00000000-0000-0000-0000-000000000001', 'cat-laptops', 'Ethernet Port', 'ethernet', 'boolean', NULL, NULL, '{}', false, true, false, 34)
ON CONFLICT (tenant_id, category_id, slug) DO NOTHING;

-- =============================================================================
-- SAMPLE SELLERS
-- =============================================================================

INSERT INTO public.sellers (id, tenant_id, name, domain, country_code, currency, affiliate_program) VALUES
('seller-amazon', '00000000-0000-0000-0000-000000000001', 'Amazon', 'amazon.com', 'US', 'USD', 'amazon_associates'),
('seller-bestbuy', '00000000-0000-0000-0000-000000000001', 'Best Buy', 'bestbuy.com', 'US', 'USD', 'best_buy_affiliate'),
('seller-newegg', '00000000-0000-0000-0000-000000000001', 'Newegg', 'newegg.com', 'US', 'USD', 'newegg_affiliate'),
('seller-bhphoto', '00000000-0000-0000-0000-000000000001', 'B&H Photo', 'bhphotovideo.com', 'US', 'USD', 'bh_affiliate'),
('seller-adorama', '00000000-0000-0000-0000-000000000001', 'Adorama', 'adorama.com', 'US', 'USD', 'adorama_affiliate')
ON CONFLICT (tenant_id, domain) DO NOTHING;

-- =============================================================================
-- SAMPLE PRODUCTS & ATTRIBUTES
-- =============================================================================

-- Sample laptop products
INSERT INTO public.products (id, tenant_id, category_id, gtin, mpn, brand, model, year, name, description, status, raw_specs, source_urls, metadata) VALUES
(
    'prod-macbook-air-m2',
    '00000000-0000-0000-0000-000000000001',
    'cat-laptops-ultrabook',
    '194252056721',
    'MLY33LL/A',
    'Apple',
    'MacBook Air',
    2023,
    'Apple MacBook Air 13-inch M2 (2023)',
    'Ultra-thin laptop with Apple M2 chip, featuring exceptional performance and all-day battery life.',
    'active',
    '{"processor": "Apple M2", "cores": 8, "ram": 8, "storage": 256, "display": "13.6-inch Liquid Retina"}',
    '["https://www.apple.com/macbook-air/"]',
    '{"featured": true, "bestseller": true}'
),
(
    'prod-dell-xps-13',
    '00000000-0000-0000-0000-000000000001',
    'cat-laptops-ultrabook',
    '884116420057',
    'XPS9320-7420SLV-PUS',
    'Dell',
    'XPS 13',
    2023,
    'Dell XPS 13 (2023) - Intel i7',
    'Premium ultrabook with stunning InfinityEdge display and exceptional build quality.',
    'active',
    '{"processor": "Intel Core i7-1360P", "cores": 12, "ram": 16, "storage": 512, "display": "13.4-inch FHD+"}',
    '["https://www.dell.com/en-us/shop/dell-laptops/xps-13-laptop/"]',
    '{"premium": true}'
),
(
    'prod-thinkpad-x1',
    '00000000-0000-0000-0000-000000000001',
    'cat-laptops-business',
    '196379456231',
    '21E50024US',
    'Lenovo',
    'ThinkPad X1 Carbon',
    2023,
    'Lenovo ThinkPad X1 Carbon Gen 11',
    'Business ultrabook with military-grade durability and enterprise security features.',
    'active',
    '{"processor": "Intel Core i7-1365U", "cores": 10, "ram": 16, "storage": 1024, "display": "14-inch WUXGA"}',
    '["https://www.lenovo.com/us/en/p/laptops/thinkpad/thinkpadx1/"]',
    '{"business": true, "durable": true}'
)
ON CONFLICT (tenant_id, gtin) DO NOTHING;

-- Sample product attributes for MacBook Air M2
INSERT INTO public.product_attributes (tenant_id, product_id, attribute_id, value_text, value_number, original_value, original_unit) VALUES
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', 'attr-cpu', 'Apple M2', NULL, 'Apple M2 8-core CPU', NULL),
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', 'attr-cpu-cores', NULL, 8, '8', 'cores'),
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', 'attr-ram', NULL, 8, '8', 'GB'),
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', 'attr-storage-size', NULL, 256, '256', 'GB'),
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', 'attr-storage-type', 'SSD', NULL, 'SSD', NULL),
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', 'attr-gpu', 'Apple M2 10-core GPU', NULL, 'Apple M2 10-core GPU', NULL),
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', 'attr-screen-size', NULL, 13.6, '13.6', 'inches'),
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', 'attr-resolution', '2560x1664', NULL, '2560 x 1664', NULL),
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', 'attr-weight', NULL, 1.24, '1.24', 'kg'),
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', 'attr-battery', NULL, 18, '18', 'hours')
ON CONFLICT (tenant_id, product_id, attribute_id) DO NOTHING;

-- Sample offers for MacBook Air M2
INSERT INTO public.offers (tenant_id, product_id, variant_id, seller_id, price, currency, url, availability, condition, metadata) VALUES
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', NULL, 'seller-amazon', 1099.00, 'USD', 'https://amazon.com/dp/B0B3C2R8MP', 'in_stock', 'new', '{"shipping_free": true}'),
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', NULL, 'seller-bestbuy', 1099.00, 'USD', 'https://bestbuy.com/site/apple-macbook-air', 'in_stock', 'new', '{"pickup_available": true}'),
('00000000-0000-0000-0000-000000000001', 'prod-macbook-air-m2', NULL, 'seller-bhphoto', 1099.00, 'USD', 'https://bhphotovideo.com/c/product/macbook-air', 'in_stock', 'new', '{"tax_free_outside_ny": true}')
ON CONFLICT (tenant_id, product_id, variant_id, seller_id, url) DO NOTHING;

-- =============================================================================
-- BENCHMARK TYPES FOR LAPTOP TESTING
-- =============================================================================

INSERT INTO public.benchmark_types (id, tenant_id, name, category, unit, higher_is_better) VALUES
('bench-cinebench-r23', '00000000-0000-0000-0000-000000000001', 'Cinebench R23', 'cpu', 'points', true),
('bench-geekbench-single', '00000000-0000-0000-0000-000000000001', 'Geekbench Single Core', 'cpu', 'points', true),
('bench-geekbench-multi', '00000000-0000-0000-0000-000000000001', 'Geekbench Multi Core', 'cpu', 'points', true),
('bench-3dmark-timespy', '00000000-0000-0000-0000-000000000001', '3DMark Time Spy', 'gpu', 'points', true),
('bench-pcmark-10', '00000000-0000-0000-0000-000000000001', 'PCMark 10', 'overall', 'points', true),
('bench-battery-life', '00000000-0000-0000-0000-000000000001', 'Battery Life (Video Playback)', 'battery', 'hours', true),
('bench-ssd-read', '00000000-0000-0000-0000-000000000001', 'SSD Sequential Read', 'ssd', 'MB/s', true),
('bench-ssd-write', '00000000-0000-0000-0000-000000000001', 'SSD Sequential Write', 'ssd', 'MB/s', true)
ON CONFLICT (tenant_id, name) DO NOTHING;

-- =============================================================================
-- API KEYS FOR DEFAULT TENANT
-- =============================================================================

-- Create a sample API key for testing (hash of 'gg-test-key-12345678901234567890')
INSERT INTO public.tenant_api_keys (
    id,
    tenant_id,
    name,
    key_hash,
    key_prefix,
    scopes,
    quotas
) VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000001',
    'Default API Key',
    'a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3', -- hash of 'hello'
    'gg-test-',
    '["read", "write", "admin"]',
    '{"requests_per_hour": 1000}'
) ON CONFLICT (key_hash) DO NOTHING;

-- Refresh materialized views
REFRESH MATERIALIZED VIEW public.mv_latest_offers;
REFRESH MATERIALIZED VIEW public.mv_category_attributes;
