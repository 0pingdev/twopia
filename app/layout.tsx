import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Twopia — A world for two',
  description: 'A private world for two people. Games, stories, and a shared home, made together.',
  openGraph: {
    title: 'Twopia',
    description: 'A world for two. Utopia, Euphoria, Happy Nostalgia ... Twopia',
    type: 'website',
    images: ['/og.png'],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Twopia',
    description: 'A world for two. Utopia, Euphoria, Happy Nostalgia ... Twopia',
  },
  icons: { icon: '/favicon.svg' },
  metadataBase: new URL('https://0pingdev.github.io/twopia'),
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#05060a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
