'use client';

import { useState } from 'react';
import Image from 'next/image';

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
          <div className="flex flex-col gap-6 items-center justify-center">
            <button 
              onClick={() => window.location.href = '/register'}
              className="relative w-64 h-24 hover:opacity-90 transition-opacity"
            >
              <Image
                src="/enter_lobby_button.png"
                alt="Enter Lobby"
                fill
                className="object-contain"
              />
            </button>
            <button 
              onClick={() => window.location.href = '/login'}
              className="relative w-64 h-24 hover:opacity-90 transition-opacity"
            >
              <Image
                src="/sign_in_button.png"
                alt="Sign In"
                fill
                className="object-contain"
              />
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-2xl text-poker-gold">Welcome to EPIC Poker!</p>
            <button 
              onClick={() => window.location.href = '/tables'}
              className="relative w-64 h-24 hover:opacity-90 transition-opacity"
            >
              <Image
                src="/create_account_button.png"
                alt="Create Table"
                fill
                className="object-contain"
              />
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
