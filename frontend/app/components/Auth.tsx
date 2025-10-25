'use client';

import { usePrivy } from '@privy-io/react-auth';
import { Button } from '@/components/ui/button';

export default function Auth() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return (
      <Button disabled className="min-w-[120px]" aria-live="polite">
        Loading…
      </Button>
    );
  }

  if (!authenticated) {
    return (
      <Button onClick={login} className="min-w-[120px]">
        Log In
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-3">
      {user?.email?.address ? (
        <span className="hidden text-sm text-zinc-500 sm:inline">
          {user.email.address}
        </span>
      ) : null}
      <Button variant="secondary" onClick={logout} className="min-w-[120px]">
        Log Out
      </Button>
    </div>
  );
}
