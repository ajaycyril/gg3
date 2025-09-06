import React from 'react';

const HomePage = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
            <h1 className="text-4xl font-bold mb-4">Welcome to GadgetGuru</h1>
            <p className="text-lg mb-8">Your AI-powered gadget recommender.</p>
            <input
                type="text"
                placeholder="Search for gadgets..."
                className="p-2 border border-gray-300 rounded-md mb-4"
            />
            <button className="bg-blue-500 text-white p-2 rounded-md">Search</button>
        </div>
    );
};

export default HomePage;