'use client';

import { useState } from 'react';

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  return (
    <main className="min-h-screen bg-poker-felt flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-white mb-4">EPIC Poker App</h1>
        <p className="text-xl text-gray-300 mb-8">
          Real-time multiplayer poker platform with provably fair mechanics
        </p>

        {!isLoggedIn ? (
          <div className="space-y-4">
            <button className="bg-poker-gold text-black px-8 py-3 rounded-lg font-bold hover:bg-yellow-400 mr-4">
              Sign Up
            </button>
            <button className="bg-blue-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-blue-700">
              Log In
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-2xl text-poker-gold">Welcome to EPIC Poker!</p>
            <button className="bg-green-600 text-white px-8 py-3 rounded-lg font-bold hover:bg-green-700">
              Create Table
            </button>
          </div>
        )}

        <div className="mt-12 text-gray-400 text-sm">
          <p>Phase 0 - Foundation</p>
          <p>More coming soon...</p>
        </div>
      </div>
    </main>
  );
}
