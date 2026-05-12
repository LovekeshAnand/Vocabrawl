import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'VocaBrawl | Multiplayer Word Games & Sketch Battles',
  description: 'The ultimate arena for word warriors. Play SketchBrawl, VocaWord, and Word Chain in real-time PvP match-ups. Climb the leaderboard and outsmart your opponents!',
  icons: {
    icon: '/favicon.png',
  },
  openGraph: {
    title: 'VocaBrawl | Multiplayer Word Games & Sketch Battles',
    description: 'Join the arena in VocaBrawl! Compete in SketchBrawl, VocaWord, and Word Chain. Battle friends or strangers in the most addictive word game platform.',
    url: 'https://vocabrawl.com',
    siteName: 'VocaBrawl',
    locale: 'en_US',
    type: 'website',
  },
  twitter: {
    title: 'VocaBrawl | Multiplayer Word Games & Sketch Battles',
    description: 'The ultimate arena for word warriors. Play SketchBrawl, VocaWord, and Word Chain in real-time PvP.',
  }
};

import { CookieConsent } from '../components/ui/CookieConsent';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ minHeight: '100vh' }}>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
