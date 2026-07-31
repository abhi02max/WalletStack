import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueries, useQuery } from '@tanstack/react-query'
import { stockApi, healthApi, watchlistApi } from '../services/api'
import { useUser, SignUpButton, SignInButton } from '@clerk/clerk-react'
import {
  Search,
  Activity,
  Brain,
  ArrowRight,
  BarChart3,
  Bell,
  ChevronRight,
  LineChart,
  ListFilter,
  Newspaper,
  ShieldCheck,
  Star,
  TrendingDown,
  TrendingUp,
} from 'lucide-react'

const marketTiles = [
  { label: 'NIFTY 50', symbol: '^NSEI' },
  { label: 'SENSEX', symbol: '^BSESN' },
  { label: 'NASDAQ', symbol: '^IXIC' },
  { label: 'BTC/USD', symbol: 'BTC-USD' },
]

const sectorHeat = [
  { label: 'Technology', symbol: 'XLK', size: 'md:col-span-2' },
  { label: 'Financials', symbol: 'XLF', size: '' },
  { label: 'Energy', symbol: 'XLE', size: '' },
  { label: 'Consumer', symbol: 'XLY', size: '' },
  { label: 'Healthcare', symbol: 'XLV', size: '' },
  { label: 'Staples', symbol: 'XLP', size: 'md:col-span-2' },
]

const quickActions = [
  { icon: LineChart, title: 'Advanced charts', text: 'Candles, volume, ranges, and clean crosshair analysis.', path: '/search' },
  { icon: ListFilter, title: 'Market screener', text: 'Explore stocks by symbol, asset type, exchange, and sector.', path: '/search' },
  { icon: Bell, title: 'Watchlists', text: 'Save ideas and return to them quickly from any device.', path: '/watchlist' },
  { icon: Brain, title: 'Desk intelligence', text: 'Catalysts, factor risk, valuation pressure, and market-structure context.', path: '/insights' },
  { icon: Activity, title: 'Wealth analytics', text: 'Cash-flow history, goal forecasts, concentration, and stress testing.', path: '/analytics' },
]

const formatMarketPrice = (quote) => {
  if (quote?.price == null) return '—'
  try {
    return new Intl.NumberFormat(quote.currency === 'INR' ? 'en-IN' : 'en-US', {
      style: quote.currency ? 'currency' : 'decimal',
      currency: quote.currency,
      maximumFractionDigits: 2,
    }).format(quote.price)
  } catch {
    return Number(quote.price).toLocaleString(undefined, { maximumFractionDigits: 2 })
  }
}

export default function Home() {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [health, setHealth] = useState(null)
  const navigate = useNavigate()
  const { isSignedIn } = useUser()
  const { data: watchlistSymbols = [], isLoading: loadingWatchlist } = useQuery({
    queryKey: ['watchlist'],
    queryFn: () => watchlistApi.get().then(response => response.data.data || []),
    enabled: isSignedIn,
    retry: 1,
    staleTime: 30000,
  })
  const previewSymbols = watchlistSymbols.slice(0, 4)
  const quoteSymbols = [...new Set([...marketTiles.map(item => item.symbol), ...sectorHeat.map(item => item.symbol), ...previewSymbols])]
  const quoteQueries = useQueries({
    queries: quoteSymbols.map(symbol => ({
      queryKey: ['home-live-quote', symbol],
      queryFn: () => stockApi.getDetails(symbol).then(response => response.data.data),
      staleTime: 15000,
      refetchInterval: 30000,
      refetchOnWindowFocus: true,
    })),
  })
  const quotes = quoteSymbols.reduce((result, symbol, index) => {
    result[symbol] = quoteQueries[index]?.data
    return result
  }, {})
  const sectorRows = sectorHeat.map(sector => ({
    ...sector,
    change: Number(quotes[sector.symbol]?.changePercent || 0),
    loaded: quotes[sector.symbol]?.changePercent != null,
  }))
  const strongestSector = [...sectorRows].filter(sector => sector.loaded).sort((a, b) => b.change - a.change)[0]
  const weakestSector = [...sectorRows].filter(sector => sector.loaded).sort((a, b) => a.change - b.change)[0]

  useEffect(() => {
    healthApi.check().then(r => setHealth(r.data)).catch(() => {})
  }, [])

  useEffect(() => {
    if (query.length < 1) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const res = await stockApi.search(query)
        setSuggestions(res.data.data?.slice(0, 6) || [])
        setShowSuggestions(true)
      } catch {
        setSuggestions([])
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (symbol) => {
    setShowSuggestions(false)
    setQuery('')
    navigate(`/stock/${symbol}`)
  }

  const handleSearch = (e) => {
    e.preventDefault()
    if (query.trim()) {
      setShowSuggestions(false)
      navigate(`/search?q=${encodeURIComponent(query.trim())}`)
    }
  }

  return (
    <div className="animate-fade-in space-y-6">
      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_360px] gap-6">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
          <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400 mb-2">
                  <ShieldCheck size={14} />
                  Market workspace
                </div>
                <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 dark:text-white">
                  Track, study, and shortlist smarter trades.
                </h1>
                <p className="text-sm sm:text-base text-slate-600 dark:text-slate-400 mt-3 max-w-2xl">
                  WalletStack combines market intelligence, portfolio tracking, cash-flow planning, goals, and AI explanations in one calm finance workspace.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Link to="/search" className="btn-secondary">
                  Explore
                  <ArrowRight size={16} />
                </Link>
                {!isSignedIn && (
                  <SignUpButton mode="modal">
                    <button className="btn-primary">Create account</button>
                  </SignUpButton>
                )}
              </div>
            </div>

            <form onSubmit={handleSearch} className="relative mt-6">
              <div className="relative flex items-center rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 focus-within:ring-2 focus-within:ring-emerald-500">
                <Search size={20} className="absolute left-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search stocks, ETFs, indexes..."
                  className="w-full pl-11 pr-28 py-3.5 rounded-lg bg-transparent text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                  onFocus={() => query.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                />
                <button type="submit" className="absolute right-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-950 px-4 py-2 rounded-md text-sm font-semibold transition-colors">
                  Search
                </button>
              </div>

              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-lg shadow-xl border border-slate-200 dark:border-slate-700 z-50 overflow-hidden">
                  {suggestions.map((s) => (
                    <button
                      key={s.symbol}
                      onMouseDown={() => handleSelect(s.symbol)}
                      className="w-full flex items-center gap-4 px-5 py-3 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 text-left"
                    >
                      <div className="w-10 h-10 rounded bg-slate-100 dark:bg-slate-800 flex items-center justify-center font-bold text-sm text-slate-700 dark:text-slate-200">
                        {s.symbol?.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white">{s.symbol}</div>
                        <div className="text-xs text-slate-500 truncate">{s.name}</div>
                      </div>
                      <span className="badge-neutral">{s.type}</span>
                    </button>
                  ))}
                </div>
              )}
            </form>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-100 dark:divide-slate-800">
            {marketTiles.map((item) => {
              const quote = quotes[item.symbol]
              const positive = Number(quote?.changePercent || 0) >= 0
              const TrendIcon = positive ? TrendingUp : TrendingDown
              return (
                <button
                  key={item.symbol}
                  onClick={() => navigate(`/stock/${item.symbol}`)}
                  className="p-5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                >
                  <div className="flex items-center justify-between text-xs text-slate-500 mb-3">
                    <span>{item.label}</span>
                    <TrendIcon size={15} className={positive ? 'text-emerald-500' : 'text-red-500'} />
                  </div>
                  <div className="font-mono text-xl font-bold text-slate-950 dark:text-white">{formatMarketPrice(quote)}</div>
                  <div className={`text-sm font-semibold mt-1 ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {quote?.changePercent == null ? 'Loading live quote' : `${positive ? '+' : ''}${Number(quote.changePercent).toFixed(2)}%`}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <aside className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-950 dark:text-white flex items-center gap-2">
              <Star size={18} className="text-amber-500" />
              Watchlist
            </h2>
            <Link to={isSignedIn ? '/watchlist' : '/search'} className="text-sm font-semibold text-emerald-600 dark:text-emerald-400">
              Open
            </Link>
          </div>
          {loadingWatchlist ? <div className="rounded-lg bg-slate-50 p-6 text-center text-sm text-slate-500 dark:bg-[#111111]">Loading your watchlist...</div> : previewSymbols.length ? <div className="space-y-2">
            {previewSymbols.map((symbol) => {
              const stock = quotes[symbol] || { symbol }
              const positive = Number(stock.changePercent || 0) >= 0
              return (
              <button
                key={symbol}
                onClick={() => navigate(`/stock/${symbol}`)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-left transition-colors"
              >
                <div className="w-9 h-9 rounded-md bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-700 dark:text-slate-200">
                  {symbol.slice(0, 2)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold text-slate-950 dark:text-white">{symbol}</div>
                  <div className="text-xs text-slate-500 truncate">{stock.name || 'Loading company data'}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{formatMarketPrice(stock)}</div>
                  <div className={`text-xs font-semibold ${positive ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
                    {stock.changePercent == null ? '—' : `${positive ? '+' : ''}${Number(stock.changePercent).toFixed(2)}%`}
                  </div>
                </div>
              </button>
            )})}
          </div> : <div className="rounded-lg bg-slate-50 p-6 text-center dark:bg-[#111111]"><p className="text-sm font-semibold text-slate-700 dark:text-slate-300">No stocks saved yet</p><Link to="/search" className="mt-3 inline-flex text-xs font-bold text-emerald-600 dark:text-emerald-400">Build watchlist</Link></div>}
        </aside>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="font-semibold text-slate-950 dark:text-white">Sector heat</h2>
              <p className="text-sm text-slate-500">A fast read on where market strength is flowing.</p>
            </div>
            <BarChart3 size={20} className="text-slate-400" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {sectorRows.map((sector) => {
              const tone = !sector.loaded ? 'bg-slate-400' : sector.change >= 1 ? 'bg-emerald-600' : sector.change >= 0 ? 'bg-emerald-500' : sector.change <= -1 ? 'bg-red-600' : 'bg-red-500'
              return <button key={sector.label} onClick={() => navigate(`/stock/${sector.symbol}`)} className={`${sector.size} ${tone} rounded-lg p-4 text-left text-white min-h-24 flex flex-col justify-between transition-opacity hover:opacity-90`}>
                <span className="text-sm font-semibold">{sector.label}</span>
                <span className="font-mono text-xl font-bold">{sector.loaded ? `${sector.change >= 0 ? '+' : ''}${sector.change.toFixed(2)}%` : 'Loading'}</span>
              </button>
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm p-5">
          <div className="flex items-center gap-2 mb-4">
            <Newspaper size={18} className="text-emerald-500" />
            <h2 className="font-semibold text-slate-950 dark:text-white">Today&apos;s brief</h2>
          </div>
          <div className="space-y-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Market tone</div>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{strongestSector && weakestSector ? `${strongestSector.label} leads at ${strongestSector.change >= 0 ? '+' : ''}${strongestSector.change.toFixed(2)}%, while ${weakestSector.label} is the weakest group at ${weakestSector.change >= 0 ? '+' : ''}${weakestSector.change.toFixed(2)}%.` : 'Live sector leadership is loading from current market quotes.'}</p>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Risk note</div>
              <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">Watch volatility around earnings, rate commentary, and overnight US market moves.</p>
            </div>
            <Link to="/search" className="btn-secondary w-full">
              Find opportunities
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
        {quickActions.map((item) => {
          const Icon = item.icon
          return (
            <Link key={item.title} to={item.path} className="card-hover p-5">
              <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mb-4">
                <Icon size={20} className="text-emerald-600 dark:text-emerald-400" />
              </div>
              <h3 className="font-semibold text-slate-950 dark:text-white mb-1">{item.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400">{item.text}</p>
            </Link>
          )
        })}
      </section>

      {!isSignedIn && (
        <section className="bg-slate-950 border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <h2 className="text-2xl font-bold text-white">Save your research workspace</h2>
            <p className="text-slate-400 mt-2">Create an account to keep watchlists, preferences, and AI insight history synced.</p>
          </div>
          <div className="flex gap-3">
            <SignInButton mode="modal">
              <button className="btn-secondary bg-slate-900 border-slate-700 text-white hover:bg-slate-800">Sign in</button>
            </SignInButton>
            <SignUpButton mode="modal">
              <button className="btn-primary">Get started</button>
            </SignUpButton>
          </div>
        </section>
      )}

      {health && (
        <div className="flex justify-center pb-4">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-md">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            API {health.message}
          </div>
        </div>
      )}
    </div>
  )
}
