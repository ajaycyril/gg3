# 🚀 GadgetGuru v1 – Project Overview

## 🔹 Objective
GadgetGuru is a GPT + RAG-powered AI gadget recommender that dynamically presents structured and unstructured product intelligence to users through an adaptive interface, pulling from live sources like Amazon, Reddit, YouTube, and benchmark sites.

## 📦 Project Structure
The project is organized into several key directories:

- **apps/**: Contains the frontend and backend applications.
  - **web/**: The Next.js frontend application.
  - **api/**: The backend API application.
  
- **supabase/**: Contains database migrations, seed data, and configuration for Supabase.

- **packages/**: Shared code and types used across the applications.

- **scripts/**: Utility scripts for local setup and other tasks.

## ⚙️ Getting Started

### Prerequisites
- Node.js (version 14 or higher)
- Supabase account
- PostgreSQL database

### Setup Instructions

1. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd gadgetguru
   ```

2. **Install Dependencies**
   For both frontend and backend applications:
   ```bash
   cd apps/web
   npm install
   cd ../api
   npm install
   ```

3. **Set Up Supabase**
   - Create a new Supabase project.
   - Configure your database by running the SQL commands in `supabase/migrations/000001_init.sql` and seed the database using `supabase/seed.sql`.

4. **Environment Variables**
   - Copy the example environment variable files and fill in your Supabase credentials:
   ```bash
   cp apps/web/.env.local.example apps/web/.env.local
   cp apps/api/.env.example apps/api/.env
   ```

5. **Run the Applications**
   - Start the backend API:
   ```bash
   cd apps/api
   npm run dev
   ```
   - Start the frontend application:
   ```bash
   cd ../web
   npm run dev
   ```

6. **Access the Application**
   - Open your browser and navigate to `http://localhost:3000` to view the frontend.

## 📄 Features
- AI-powered gadget recommendations
- User authentication with Supabase
- Real-time data scraping and embedding updates
- Responsive design with TailwindCSS

## 🧪 Testing
- Unit tests are implemented using Vitest.
- E2E tests are set up with Playwright.

## 🔄 Contributing
Contributions are welcome! Please open an issue or submit a pull request for any enhancements or bug fixes.

## 📜 License
This project is licensed under the MIT License. See the LICENSE file for details.