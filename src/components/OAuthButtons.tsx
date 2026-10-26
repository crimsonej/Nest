// src/components/OAuthButtons.tsx
'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/Button';
import { motion } from 'framer-motion';

// Simple Google “G” logo – keeps the design lightweight
function GoogleIcon() {
  return (
    <svg viewBox="0 0 533.5 544.3" className="h-5 w-5" aria-hidden="true">
      <path fill="#EA4335" d="M533.5 278.4c0-17.2-1.5-33.9-4.4-49.9H272v94.4h146.9c-6.4 34.6-25.5 64-54.4 83.5v68.7h87.8c51.3-47.3 80.2-117.1 80.2-196.7z" />
      <path fill="#4285F4" d="M272 544.3c73.9 0 135.8-24.5 181-66.5l-87.8-68.7c-24.3 16.3-55.5 26-93.2 26-71.6 0-132.2-48.3-153.9-113.5H27.5v71.3c45.5 89.8 138.9 151.4 244.5 151.4z" />
      <path fill="#FBBC05" d="M118.1 322.5c-10.6-31.6-10.6-65.6 0-97.2V154h-90.6C8.3 216.1 0 250.4 0 284.9s8.3 68.8 27.5 130.9l90.6-71.3z" />
      <path fill="#34A853" d="M272 108.5c39.8 0 75.5 13.7 103.6 40.5l77.6-77.6C410.9 27.5 347.9 0 272 0 166.3 0 73 61.6 27.5 151.4l90.6 71.3C139.8 156.8 200.4 108.5 272 108.5z" />
    </svg>
  );
}

export default function OAuthButtons() {
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogle = async () => {
    setLoading(true);
    setError(null);
    try {
      const { error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (oauthError) throw oauthError;
    } catch (e) {
      console.error(e);
      setError('Could not start Google sign‑in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      {error && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-sm text-red-500 text-center"
        >
          {error}
        </motion.p>
      )}

      <Button
        variant="outline"
        onClick={handleGoogle}
        disabled={loading}
        loading={loading}
        className="w-full border-border bg-surface text-text-primary shadow-sm hover:border-border/80 hover:bg-surface-hover"
      >
        <GoogleIcon />
        {loading ? 'Connecting to Google…' : 'Continue with Google'}
      </Button>

      <div className="flex items-center gap-3" aria-hidden="true">
        <span className="h-px flex-1 bg-border/80" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">
          or continue with email
        </span>
        <span className="h-px flex-1 bg-border/80" />
      </div>
    </div>
  );
}
