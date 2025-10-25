'use client';

import { PrivyProvider } from '@privy-io/react-auth';
import { useEffect, useState } from 'react';

export default function Providers({ children }: { children: React.ReactNode }) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    // Check system theme preference
    const checkTheme = () => {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      setIsDarkMode(prefersDark);
    };

    // Initial check
    checkTheme();

    // Listen for changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', checkTheme);

    return () => mediaQuery.removeEventListener('change', checkTheme);
  }, []);

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        // Appearance customization
        appearance: {
          theme: isDarkMode ? 'dark' : 'light',
          accentColor: '#3b82f6', // Blue that matches the project's button colors
        },
        // Login methods
        loginMethods: ['email'],
        // MFA configuration
        mfa: {
          noPromptOnMfaRequired: false,
        }
      }}
    >
      {children}
    </PrivyProvider>
  );
}
