import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'EPIC Poker App',
  description: 'Real-time multiplayer poker platform',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-poker-felt text-white">{children}</body>
    </html>
  );
}
