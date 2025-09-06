-- SQL commands to seed initial data into the Supabase database

-- Insert sample gadgets
INSERT INTO gadgets (name, price, brand, image, link, specs, created_at)
VALUES 
('Gadget A', 199.99, 'Brand X', 'https://example.com/imageA.jpg', 'https://example.com/gadgetA', '{"battery": "3000mAh", "color": "black"}', NOW()),
('Gadget B', 299.99, 'Brand Y', 'https://example.com/imageB.jpg', 'https://example.com/gadgetB', '{"battery": "4000mAh", "color": "white"}', NOW()),
('Gadget C', 399.99, 'Brand Z', 'https://example.com/imageC.jpg', 'https://example.com/gadgetC', '{"battery": "5000mAh", "color": "blue"}', NOW());

-- Insert sample reviews
INSERT INTO reviews (gadget_id, content, rating, created_at)
VALUES 
(1, 'Great performance and battery life!', 5, NOW()),
(1, 'Value for money, but a bit bulky.', 4, NOW()),
(2, 'Excellent features, but overpriced.', 3, NOW()),
(3, 'Best gadget I have ever used!', 5, NOW());

-- Insert sample recommendations
INSERT INTO recommendations (user_id, gadget_id, created_at)
VALUES 
(1, 1, NOW()),
(1, 2, NOW()),
(2, 3, NOW());

-- Insert sample users
INSERT INTO users (email, password_hash, created_at)
VALUES 
('user1@example.com', 'hashed_password_1', NOW()),
('user2@example.com', 'hashed_password_2', NOW());

-- Insert sample feedback
INSERT INTO feedback (user_id, gadget_id, content, created_at)
VALUES 
(1, 1, 'I love this gadget!', NOW()),
(2, 2, 'Not what I expected.', NOW());