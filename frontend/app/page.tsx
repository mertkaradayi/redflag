import Link from "next/link";
import HealthCheck from "./components/HealthCheck";
import SupabaseCheck from "./components/SupabaseCheck";
import SuiDeploymentsCheck from "./components/SuiDeploymentsCheck";
import LatestDeploymentFetcher from "./components/LatestDeploymentFetcher";
import Auth from "./components/Auth";
import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="flex min-h-screen w-full max-w-5xl flex-col gap-16 px-6 py-16 sm:px-12">
        <header className="flex items-center justify-between">
          <div>
            <p className="text-sm uppercase tracking-wide text-zinc-500">RedFlag</p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Contract Risk Scanner
            </h1>
          </div>
          <Auth />
        </header>

        <section className="max-w-2xl space-y-4">
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            Monitor and analyze smart contracts on Sui in real time. RedFlag highlights potential
            risks early so you can ship safely and stay confident in production.
          </p>
        </section>

        <section className="w-full">
          <div className="mx-auto grid w-full max-w-4xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
            <HealthCheck />
            <SupabaseCheck />
            <SuiDeploymentsCheck />
            <LatestDeploymentFetcher />
          </div>
        </section>

        {/* Deployments Dashboard Link */}
        <section className="w-full">
          <div className="mx-auto max-w-4xl">
            <div className="bg-linear-to-r from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20 rounded-lg p-6 border border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
                    View All Deployments
                  </h3>
                  <p className="text-zinc-600 dark:text-zinc-300">
                    Explore the complete history of smart contract deployments with search, filtering, and real-time updates.
                  </p>
                </div>
                <Link href="/deployments">
                  <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    Open Dashboard
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
