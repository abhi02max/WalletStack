import { useEffect, useMemo, useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useUser, UserButton, SignInButton, SignUpButton } from '@clerk/clerk-react'
import { useTheme } from '../context/ThemeContext'
import { useAccessibility } from '../context/AccessibilityContext'
import { Accessibility, Activity, BarChart3, BrainCircuit, CircleDollarSign, GitCompare, Goal, Menu, Moon, Search, Star, Sun, WalletCards, X, Home, Briefcase } from 'lucide-react'
import WalletStackMark from './WalletStackMark'

export default function Layout() {
  const { isSignedIn } = useUser()
  const { theme, toggleTheme } = useTheme()
  const { settings, toggleSetting, resetAccessibility } = useAccessibility()
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [headerSearch, setHeaderSearch] = useState('')
  const [accessOpen, setAccessOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [commandInput, setCommandInput] = useState('')

  const navItems = [
    { path: '/', label: 'Home', icon: Home },
    { path: '/search', label: 'Markets', icon: Search },
    { path: '/portfolio', label: 'Portfolio', icon: Briefcase },
    { path: '/analytics', label: 'Analytics', icon: Activity },
    { path: '/budget', label: 'Budget', icon: CircleDollarSign },
    { path: '/goals', label: 'Goals', icon: Goal },
    { path: '/insights', label: 'Insights', icon: BrainCircuit },
  ]
  const commands = useMemo(() => [
    { label: 'Open WalletStack overview', hint: 'Dashboard', path: '/', icon: Home },
    { label: 'Search global markets', hint: 'Stocks, ETFs, crypto', path: '/search', icon: Search },
    { label: 'Open portfolio tracker', hint: 'Positions and allocation', path: '/portfolio', icon: Briefcase },
    { label: 'Open wealth analytics', hint: 'Cash flow, risk, forecasts', path: '/analytics', icon: Activity },
    { label: 'Open budget control', hint: 'Cash flow and expenses', path: '/budget', icon: CircleDollarSign },
    { label: 'Open financial goals', hint: 'Targets and milestones', path: '/goals', icon: Goal },
    { label: 'Open personal insights', hint: 'AI-ready finance brief', path: '/insights', icon: BrainCircuit },
    { label: 'Compare securities', hint: 'Side-by-side research', path: '/compare', icon: GitCompare },
    { label: 'Virtual trading simulator', hint: 'Practice with virtual cash', path: '/simulator', icon: WalletCards },
    { label: 'Open watchlist', hint: 'Saved market ideas', path: '/watchlist', icon: Star },
    { label: 'Open AAPL research', hint: 'Example stock', path: '/stock/AAPL', icon: BarChart3 },
  ], [])
  const visibleCommands = commands.filter(command => (
    command.label.toLowerCase().includes(commandInput.toLowerCase()) ||
    command.hint.toLowerCase().includes(commandInput.toLowerCase())
  ))

  const isActive = (path) => path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)

  const handleHeaderSearch = (event) => {
    event.preventDefault()
    const query = headerSearch.trim()
    if (!query) return
    setHeaderSearch('')
    setMobileMenuOpen(false)
    navigate(`/search?q=${encodeURIComponent(query)}`)
  }

  useEffect(() => {
    const handleKeyDown = (event) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandOpen(true)
      }
      if (event.key === 'Escape') {
        setCommandOpen(false)
        setAccessOpen(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const runCommand = (path) => {
    setCommandOpen(false)
    setCommandInput('')
    navigate(path)
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 dark:bg-slate-950">
      <a href="#main-content" className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[80] focus:bg-white focus:text-slate-900 focus:px-4 focus:py-2 focus:rounded-lg focus:shadow-lg">
        Skip to main content
      </a>
      {/* Enterprise Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-16 flex items-center justify-between">
            {/* Logo */}
            <WalletStackMark />

            {/* Desktop Navigation */}
            <nav className="hidden xl:flex items-center gap-0.5 overflow-x-auto">
              {navItems.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`px-2.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                      active
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={16} />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            <form onSubmit={handleHeaderSearch} className="hidden 2xl:block flex-1 max-w-sm mx-6">
              <div className="relative">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  value={headerSearch}
                  onChange={(event) => setHeaderSearch(event.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-100 dark:bg-slate-800 border border-transparent focus:border-emerald-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none text-sm text-slate-900 dark:text-white placeholder-slate-400"
                  placeholder="Search symbol or company"
                />
              </div>
            </form>

            {/* Right Actions */}
            <div className="flex items-center gap-4">
              <button
                onClick={() => setCommandOpen(true)}
                className="hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs font-semibold text-slate-500 hover:text-slate-900 dark:hover:text-white"
                aria-label="Open command palette"
              >
                <Search size={14} />
                <span>Ctrl K</span>
              </button>

              <button
                onClick={() => setAccessOpen(true)}
                className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                aria-label="Open accessibility controls"
              >
                <Accessibility size={18} />
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="p-2 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                aria-label="Toggle theme"
              >
                {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
              </button>

              {isSignedIn ? (
                <div className="flex items-center">
                  <UserButton afterSignOutUrl="/login" />
                </div>
              ) : (
                <div className="hidden sm:flex items-center gap-2">
                  <SignInButton mode="modal">
                    <button className="text-sm font-medium text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white transition-colors">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton mode="modal">
                    <button className="px-4 py-2 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-colors">
                      Get Started
                    </button>
                  </SignUpButton>
                </div>
              )}

              {/* Mobile Menu Toggle */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-md text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
            <div className="px-4 py-3 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium ${
                      isActive(item.path)
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                )
              })}
              {[{ path: '/compare', label: 'Compare', icon: GitCompare }, { path: '/simulator', label: 'Simulator', icon: WalletCards }, { path: '/watchlist', label: 'Watchlist', icon: Star }].map((item) => {
                const Icon = item.icon
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-md text-base font-medium ${
                      isActive(item.path)
                        ? 'bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-white'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon size={18} />
                    {item.label}
                  </Link>
                )
              })}
              {!isSignedIn && (
                <SignInButton mode="modal">
                  <button 
                    className="w-full mt-4 px-4 py-2 text-center text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Sign In
                  </button>
                </SignInButton>
              )}

              <form onSubmit={handleHeaderSearch} className="pt-3">
                <div className="relative">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    value={headerSearch}
                    onChange={(event) => setHeaderSearch(event.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="Search stocks"
                  />
                </div>
              </form>
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main id="main-content" className="flex-1 max-w-[1480px] mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {commandOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/30 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Command palette">
          <div className="max-w-xl mx-auto mt-20 bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 rounded-2xl shadow-premium overflow-hidden">
            <div className="p-4 border-b border-emerald-100 dark:border-slate-800">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  autoFocus
                  value={commandInput}
                  onChange={(event) => setCommandInput(event.target.value)}
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                  placeholder="Type a command or destination..."
                />
              </div>
            </div>
            <div className="p-2 max-h-80 overflow-auto">
              {visibleCommands.map(command => {
                const Icon = command.icon
                return (
                  <button
                    key={command.path}
                    onClick={() => runCommand(command.path)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl text-left hover:bg-emerald-50 dark:hover:bg-slate-800"
                  >
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                      <Icon size={17} />
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 dark:text-white">{command.label}</div>
                      <div className="text-xs text-slate-500">{command.hint}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {accessOpen && (
        <div className="fixed inset-0 z-[70] bg-slate-950/30 backdrop-blur-sm p-4" role="dialog" aria-modal="true" aria-label="Accessibility controls">
          <div className="max-w-md ml-auto bg-white dark:bg-slate-900 border border-emerald-100 dark:border-slate-800 rounded-2xl shadow-premium p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-lg text-slate-950 dark:text-white">Accessibility</h2>
                <p className="text-sm text-slate-500">Make WalletStack easier to read and navigate.</p>
              </div>
              <button onClick={() => setAccessOpen(false)} className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Close accessibility controls">
                <X size={18} />
              </button>
            </div>
            {[
              ['largeText', 'Larger text', 'Increase text size across the app.'],
              ['highContrast', 'High contrast', 'Strengthen focus and visual contrast.'],
              ['reduceMotion', 'Reduce motion', 'Minimize animations and transitions.'],
              ['showChartTable', 'Chart data table', 'Show chart data in a screen-reader-friendly table.'],
            ].map(([key, label, description]) => (
              <button
                key={key}
                onClick={() => toggleSetting(key)}
                className="w-full flex items-center justify-between gap-4 p-4 rounded-xl border border-emerald-100 dark:border-slate-800 mb-3 text-left hover:bg-emerald-50 dark:hover:bg-slate-800"
              >
                <span>
                  <span className="block font-semibold text-slate-900 dark:text-white">{label}</span>
                  <span className="block text-xs text-slate-500 mt-1">{description}</span>
                </span>
                <span className={`w-11 h-6 rounded-full p-1 transition-colors ${settings[key] ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                  <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${settings[key] ? 'translate-x-5' : ''}`} />
                </span>
              </button>
            ))}
            <button onClick={resetAccessibility} className="btn-secondary w-full">Reset accessibility settings</button>
          </div>
        </div>
      )}

      {/* Enterprise Footer */}
      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">α</span>
            </div>
            <span className="text-sm font-medium text-slate-900 dark:text-white">
              WalletStack
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
            <span>Personal finance intelligence</span>
            <span>•</span>
            <span>© 2026</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
