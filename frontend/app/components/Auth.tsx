'use client';

import { usePrivy } from '@privy-io/react-auth';

export default function Auth() {
  const { ready, authenticated, user, login, logout } = usePrivy();

  if (!ready) {
    return <div>Loading...</div>;
  }

  if (!authenticated) {
    return (
      <div className="p-6 max-w-md mx-auto bg-zinc-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold mb-4 text-white">RedFlag Authentication</h2>
        <p className="mb-4 text-zinc-300">Please login with your email address to access RedFlag.</p>
        <button
          onClick={login}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
        >
          Login with Email
        </button>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-md mx-auto bg-zinc-800 rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-4 text-white">Welcome to RedFlag</h2>
      
      <div className="mb-6">
        <p className="text-zinc-300"><strong className="text-white">Email:</strong> {user?.email?.address || 'Not provided'}</p>
      </div>

      <button
        onClick={logout}
        className="w-full bg-red-600 text-white py-2 px-4 rounded hover:bg-red-700"
      >
        Logout
      </button>
    </div>
  );
}
