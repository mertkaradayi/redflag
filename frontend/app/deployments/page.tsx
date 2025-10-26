import Link from 'next/link';
import { Button } from '@/components/ui/button';
import DeploymentsTable from '../components/DeploymentsTable';

export default function DeploymentsPage() {
  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="flex min-h-screen w-full max-w-7xl flex-col gap-8 px-6 py-16 sm:px-12">
        {/* Header */}
        <header className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-4 mb-2">
              <Link href="/">
                <Button variant="ghost" size="sm" className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                  ← Back to Home
                </Button>
              </Link>
            </div>
            <p className="text-sm uppercase tracking-wide text-zinc-500">RedFlag</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Smart Contract Deployments
            </h1>
          </div>
        </header>

        {/* Description */}
        <section className="max-w-3xl space-y-4">
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            Real-time monitoring of smart contract deployments on Sui testnet. 
            This dashboard shows all detected package deployments with their metadata, 
            deployer information, and transaction details.
          </p>
          <div className="flex flex-wrap gap-4 text-sm text-zinc-500">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span>Very recent (last hour)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span>Recent (last 24h)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
              <span>This week</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full"></div>
              <span>Older</span>
            </div>
          </div>
        </section>

        {/* Deployments Table */}
        <section className="w-full">
          <DeploymentsTable autoRefresh={true} refreshInterval={30000} />
        </section>

        {/* Footer Info */}
        <footer className="text-center text-sm text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <p>
            Data is automatically refreshed every 30 seconds. 
            Deployments are monitored continuously via our background worker.
          </p>
          <p className="mt-2">
            Click on transaction hashes to view them on{' '}
            <a 
              href="https://suiexplorer.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Sui Explorer
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
