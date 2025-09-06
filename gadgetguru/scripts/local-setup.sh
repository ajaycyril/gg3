#!/bin/bash

# This script automates the local setup process for the GadgetGuru project.

# Exit immediately if a command exits with a non-zero status.
set -e

# Step 1: Install dependencies for the frontend and backend
echo "Installing dependencies for the frontend..."
cd apps/web
npm install

echo "Installing dependencies for the backend..."
cd ../api
npm install

# Step 2: Initialize Supabase database
echo "Setting up Supabase database..."
supabase db push

# Step 3: Seed the database with initial data
echo "Seeding the database..."
supabase db seed

# Step 4: Start the development servers
echo "Starting the frontend development server..."
cd ../web
npm run dev &

echo "Starting the backend development server..."
cd ../api
npm run dev &

# Step 5: Display completion message
echo "Local setup completed! Access the frontend at http://localhost:3000 and the backend at http://localhost:4000."