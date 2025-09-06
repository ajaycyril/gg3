-- SQL script to initialize the database schema for GadgetGuru

-- Create users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create gadgets table
CREATE TABLE gadgets (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    price DECIMAL(10, 2),
    image_url TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create reviews table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    gadget_id INTEGER REFERENCES gadgets(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create recommendations table
CREATE TABLE recommendations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    gadget_id INTEGER REFERENCES gadgets(id) ON DELETE CASCADE,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create specs_normalized table
CREATE TABLE specs_normalized (
    id SERIAL PRIMARY KEY,
    gadget_id INTEGER REFERENCES gadgets(id) ON DELETE CASCADE,
    spec_name VARCHAR(255) NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create benchmarks table
CREATE TABLE benchmarks (
    id SERIAL PRIMARY KEY,
    gadget_id INTEGER REFERENCES gadgets(id) ON DELETE CASCADE,
    benchmark_name VARCHAR(255) NOT NULL,
    score DECIMAL(10, 2),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create feedback table
CREATE TABLE feedback (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Create embeddings table
CREATE TABLE embeddings (
    id SERIAL PRIMARY KEY,
    gadget_id INTEGER REFERENCES gadgets(id) ON DELETE CASCADE,
    vector FLOAT8[] NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);