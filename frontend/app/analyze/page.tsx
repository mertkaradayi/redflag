import Link from 'next/link';
import { Button } from '@/components/ui/button';
import LLMAnalysis from '../components/LLMAnalysis';

export default function AnalyzePage() {
  return (
    <div className="flex min-h-screen justify-center bg-zinc-50 font-sans text-zinc-900 dark:bg-black dark:text-zinc-50">
      <main className="flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-16 sm:px-12">
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
              Contract Security Analysis
            </h1>
          </div>
        </header>

        {/* Description */}
        <section className="max-w-4xl space-y-4">
          <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-300">
            Analyze Sui smart contracts for security risks using our advanced AI-powered analysis engine. 
            Our system uses a 4-Agent + 1-Critic chain architecture to provide comprehensive security assessments.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            <div className="bg-blue-50 dark:bg-blue-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">🤖 AI-Powered</h3>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Advanced AI analysis using Google Gemini with specialized security patterns
              </p>
            </div>
            <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-2">🔍 Comprehensive</h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Detects 12+ security patterns including rug pulls, admin drains, and more
              </p>
            </div>
            <div className="bg-purple-50 dark:bg-purple-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">⚡ Real-time</h3>
              <p className="text-sm text-purple-700 dark:text-purple-300">
                Instant analysis with intelligent caching for optimal performance
              </p>
            </div>
          </div>
        </section>

        {/* LLM Analysis Component */}
        <section className="w-full">
          <LLMAnalysis />
        </section>

        {/* How it Works */}
        <section className="max-w-4xl">
          <h2 className="text-2xl font-semibold mb-6">How It Works</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-blue-600 dark:text-blue-400 font-bold">1</span>
              </div>
              <h3 className="font-semibold mb-2">Triage</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Initial scan to identify potentially risky functions based on names and parameters
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-orange-600 dark:text-orange-400 font-bold">2</span>
              </div>
              <h3 className="font-semibold mb-2">Technical Analysis</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Deep forensic analysis with evidence extraction from disassembled code
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-red-600 dark:text-red-400 font-bold">3</span>
              </div>
              <h3 className="font-semibold mb-2">Risk Scoring</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                Hyper-precise quantitative risk assessment with contextual modifiers
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-green-600 dark:text-green-400 font-bold">4</span>
              </div>
              <h3 className="font-semibold mb-2">Report & Validation</h3>
              <p className="text-sm text-zinc-600 dark:text-zinc-400">
                User-friendly report generation with quality assurance validation
              </p>
            </div>
          </div>
        </section>

        {/* Security Patterns */}
        <section className="max-w-4xl">
          <h2 className="text-2xl font-semibold mb-6">Security Patterns Detected</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold text-red-600">Critical Risks</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Admin Drain / Unrestricted Withdraw
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                  Unrestricted Code Upgrade
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-orange-600">High Risks</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Unlimited Token Minting
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Contract Pausing / Freezing
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Arbitrary Fee Manipulation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-orange-500 rounded-full"></span>
                  Centralized Access Control
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-yellow-600">Medium Risks</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  Oracle Manipulation Risk
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  Timestamp Dependence
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  Reentrancy Potential
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                  Flash Loan Logic Exploit
                </li>
              </ul>
            </div>
            <div className="space-y-3">
              <h3 className="font-semibold text-gray-600">Low Risks</h3>
              <ul className="space-y-2 text-sm">
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                  Integer Overflow/Underflow
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                  Denial of Service Potential
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-2 h-2 bg-gray-500 rounded-full"></span>
                  Missing Event Emissions
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="text-center text-sm text-zinc-500 border-t border-zinc-200 dark:border-zinc-800 pt-8">
          <p>
            Analysis results are cached for performance. 
            Use the cache management endpoints to clear or view statistics.
          </p>
          <p className="mt-2">
            For more information about our analysis methodology, check our{' '}
            <a 
              href="https://github.com/your-repo" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
            >
              documentation
            </a>
          </p>
        </footer>
      </main>
    </div>
  );
}
