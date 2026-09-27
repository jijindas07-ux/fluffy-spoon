import './globals.css';
import type { Metadata, Viewport } from 'next';
import { AuthProvider } from '@/lib/auth/AuthContext';

export const metadata: Metadata = {
  title: 'VerveAI - Autonomous Adaptive Professional Interview Engine',
  description: 'Universal AI that analyzes resumes across all industries, extracts quantifiable claims, and conducts multi-turn dynamic professional interviews with evidence-based verification reports.',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#0a0a0f',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div className="bg-ambient-grid" />
        <div className="bg-dot-pattern" />
        <AuthProvider>
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
