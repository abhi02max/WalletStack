import { useEffect, useMemo, useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useQueries } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Activity,
  AlertTriangle,
  BarChart3,
  Briefcase,
  Calendar,
  Gauge,
  PieChart,
  RefreshCw,
  Repeat,
  Shield,
  Target,
  TrendingUp,
  Wallet,
} from 'lucide-react'
import { stockApi } from '../services/api'
import { FINANCE_KEYS, formatCurrency, monthKey, readStorage, userStorageKey } from '../utils/financeStorage'
import { buildGoalForecasts, buildMonthlyCashFlow, calculateHealthScore, findRecurringExpenses } from '../utils/wealthAnalytics'

const SIMULATOR_KEY = 'alphalens-simulator-v1'
const emptyBudget = { monthlyBudget: 100000, transactions: [] }
const emptyGoals = { goals: [] }
const emptyPortfolio = { positions: [] }
const emptySimulator = { cash: 100000, holdings: {}, trades: [] }

const formatGroupedMoney = (totals, field) => {
  const values = Object.entries(totals)
    .filter(([, value]) => Number.isFinite(value[field]))
    .map(([currency, value]) => formatCurrency(value[field], currency))
  return values.length ? values.join(' · ') : '—'
}

export default function Analytics() {
  const { user } = useUser()
  const [budget, setBudget] = useState(emptyBudget)
  const [goals, setGoals] = useState(emptyGoals)
  const [portfolio, setPortfolio] = useState(emptyPortfolio)
  const [simulator, setSimulator] = useState(emptySimulator)
  const [stressPercent, setStressPercent] = useState(-10)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (!user?.id) return
    setBudget(readStorage(userStorageKey(FINANCE_KEYS.budget, user.id), emptyBudget))
    setGoals(readStorage(userStorageKey(FINANCE_KEYS.goals, user.id), emptyGoals))
    setPortfolio(readStorage(userStorageKey(FINANCE_KEYS.portfolio, user.id), emptyPortfolio))
    setSimulator(readStorage(`${SIMULATOR_KEY}:${user.id}`, emptySimulator))
  }, [user?.id, refreshKey])

  const manualPositions = (portfolio.positions || []).map(position => ({ ...position, book: 'Tracked' }))
  const simulatedPositions = Object.values(simulator.holdings || {}).map(position => ({ ...position, book: 'Virtual' }))
  const positions = [...manualPositions, ...simulatedPositions]
  const quoteSymbols = [...new Set(positions.map(position => position.symbol).filter(Boolean))]
  const quoteQueries = useQueries({
    queries: quoteSymbols.map(symbol => ({
      queryKey: ['wealth-analytics-quote', symbol],
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

  const positionRows = positions.map(position => {
    const quote = quotes[position.symbol]
    const shares = Number(position.shares || 0)
    const averageCost = Number(position.averageCost || position.avgCost || 0)
    const currentPrice = Number(quote?.price ?? averageCost)
    const currency = position.book === 'Virtual' ? 'V$' : (quote?.currency || position.quoteCurrency || 'USD')
    const marketValue = shares * currentPrice
    const invested = shares * averageCost
    return {
      ...position,
      currency,
      currentPrice,
      marketValue,
      invested,
      pnl: marketValue - invested,
    }
  })

  const positionTotals = useMemo(() => positionRows.reduce((result, row) => {
    const current = result[row.currency] || { marketValue: 0, invested: 0, pnl: 0 }
    result[row.currency] = {
      marketValue: current.marketValue + row.marketValue,
      invested: current.invested + row.invested,
      pnl: current.pnl + row.pnl,
    }
    return result
  }, {}), [positionRows])

  const monthlyCashFlow = useMemo(() => buildMonthlyCashFlow(budget.transactions || []), [budget.transactions])
  const currentMonth = monthlyCashFlow.at(-1) || { income: 0, expenses: 0, net: 0 }
  const monthlyBudget = Math.max(0, Number(budget.monthlyBudget || 0))
  const budgetUsage = monthlyBudget > 0 ? (currentMonth.expenses / monthlyBudget) * 100 : 0
  const savingsRate = currentMonth.income > 0 ? (currentMonth.net / currentMonth.income) * 100 : 0
  const recurringExpenses = useMemo(() => findRecurringExpenses(budget.transactions || []), [budget.transactions])
  const recurringMonthly = recurringExpenses.reduce((sum, item) => sum + item.monthlyAverage, 0)
  const recurringExpenseShare = currentMonth.expenses > 0 ? Math.min(1, recurringMonthly / currentMonth.expenses) : 0
  const goalForecasts = useMemo(() => buildGoalForecasts(goals.goals || []), [goals.goals])
  const goalTarget = goalForecasts.reduce((sum, goal) => sum + goal.target, 0)
  const goalSaved = goalForecasts.reduce((sum, goal) => sum + goal.saved, 0)
  const goalProgress = goalTarget > 0 ? Math.min(100, (goalSaved / goalTarget) * 100) : 0
  const healthScore = calculateHealthScore({
    savingsRate,
    budgetUsage,
    goalProgress,
    recurringExpenseShare,
    hasTransactions: Boolean((budget.transactions || []).length),
  })

  const categoryTotals = Object.entries(
    (budget.transactions || [])
      .filter(transaction => transaction.type === 'expense' && monthKey(transaction.date) === monthKey())
      .reduce((result, transaction) => {
        const category = transaction.category || 'Other'
        result[category] = (result[category] || 0) + Number(transaction.amount || 0)
        return result
      }, {}),
  )
    .map(([category, amount]) => ({ category, amount }))
    .sort((a, b) => b.amount - a.amount)

  const concentrationRows = Object.entries(
    positionRows.reduce((result, row) => {
      const key = `${row.book}:${row.currency}`
      if (!result[key]) result[key] = { book: row.book, currency: row.currency, total: 0, rows: [] }
      result[key].total += row.marketValue
      result[key].rows.push(row)
      return result
    }, {}),
  ).map(([, group]) => {
    const top = [...group.rows].sort((a, b) => b.marketValue - a.marketValue)[0]
    return {
      ...group,
      symbol: top?.symbol,
      weight: group.total > 0 ? (top.marketValue / group.total) * 100 : 0,
    }
  })

  const stressedTotals = Object.fromEntries(
    Object.entries(positionTotals).map(([currency, value]) => [
      currency,
      { impact: value.marketValue * (stressPercent / 100), afterStress: value.marketValue * (1 + stressPercent / 100) },
    ]),
  )
  const maxCashFlow = Math.max(1, ...monthlyCashFlow.flatMap(month => [month.income, month.expenses]))
  const scoreLabel = healthScore >= 75 ? 'Strong' : healthScore >= 50 ? 'Stable' : healthScore > 0 ? 'Needs attention' : 'Awaiting data'
  const quotesRefreshing = quoteQueries.some(query => query.isFetching)

  return (
    <div className="animate-fade-in space-y-6">
      <section className="flex flex-col gap-5 border-b border-slate-200 pb-6 dark:border-[#262626] lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-emerald-600 dark:text-emerald-400"><Activity size={15} /> Wealth intelligence</div>
          <h1 className="text-3xl font-extrabold text-slate-950 dark:text-white sm:text-4xl">Your financial operating picture.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-400">Cash flow, goals, real positions, and simulated exposure translated into one decision dashboard.</p>
        </div>
        <button type="button" onClick={() => setRefreshKey(value => value + 1)} className="btn-secondary self-start">
          <RefreshCw size={16} className={quotesRefreshing ? 'animate-spin' : ''} /> Refresh data
        </button>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricPanel icon={Gauge} label="Financial health" value={healthScore ? `${healthScore}/100` : '—'} note={scoreLabel} tone={healthScore >= 75 ? 'positive' : healthScore > 0 && healthScore < 50 ? 'risk' : 'neutral'} />
        <MetricPanel icon={Wallet} label="Monthly cash flow" value={formatCurrency(currentMonth.net)} note={`${savingsRate.toFixed(0)}% savings rate`} tone={currentMonth.net >= 0 ? 'positive' : 'risk'} />
        <MetricPanel icon={Target} label="Goals funded" value={`${goalProgress.toFixed(0)}%`} note={`${formatCurrency(goalSaved)} of ${formatCurrency(goalTarget)}`} />
        <MetricPanel icon={Briefcase} label="Invested exposure" value={formatGroupedMoney(positionTotals, 'marketValue')} note={`${positionRows.length} positions across ${Object.keys(positionTotals).length || 0} books`} />
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(320px,0.75fr)]">
        <div className="card p-5 sm:p-6">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div><h2 className="font-bold text-slate-950 dark:text-white">Six-month cash-flow tape</h2><p className="mt-1 text-xs text-slate-500">Income and expenses from your transaction ledger.</p></div>
            <BarChart3 size={19} className="text-emerald-500" />
          </div>
          <div className="grid h-56 grid-cols-6 items-end gap-3 border-b border-slate-200 pb-2 dark:border-[#262626]">
            {monthlyCashFlow.map(month => (
              <div key={month.key} className="flex h-full min-w-0 flex-col justify-end">
                <div className="flex flex-1 items-end justify-center gap-1">
                  <div className="w-2.5 rounded-t bg-emerald-500 sm:w-4" style={{ height: `${Math.max(3, (month.income / maxCashFlow) * 100)}%` }} title={`Income ${formatCurrency(month.income)}`} />
                  <div className="w-2.5 rounded-t bg-slate-300 dark:bg-slate-600 sm:w-4" style={{ height: `${Math.max(3, (month.expenses / maxCashFlow) * 100)}%` }} title={`Expenses ${formatCurrency(month.expenses)}`} />
                </div>
                <div className="mt-3 truncate text-center text-[10px] font-bold uppercase text-slate-500">{month.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-5 text-xs font-semibold text-slate-500">
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-emerald-500" /> Income</span>
            <span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-sm bg-slate-300 dark:bg-slate-600" /> Expenses</span>
            <span className="ml-auto">Current net: <strong className={currentMonth.net >= 0 ? 'text-emerald-600' : 'text-red-600'}>{formatCurrency(currentMonth.net)}</strong></span>
          </div>
        </div>

        <div className="card p-5 sm:p-6">
          <div className="mb-6 flex items-start justify-between"><div><h2 className="font-bold text-slate-950 dark:text-white">Category pressure</h2><p className="mt-1 text-xs text-slate-500">Current-month expense concentration.</p></div><PieChart size={19} className="text-emerald-500" /></div>
          {categoryTotals.length ? <div className="space-y-5">{categoryTotals.slice(0, 5).map(item => (
            <div key={item.category}>
              <div className="mb-2 flex items-center justify-between text-sm"><span className="font-semibold text-slate-700 dark:text-slate-300">{item.category}</span><span className="font-mono text-xs text-slate-500">{formatCurrency(item.amount)}</span></div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-[#1f1f1f]"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${Math.min(100, (item.amount / Math.max(currentMonth.expenses, 1)) * 100)}%` }} /></div>
            </div>
          ))}</div> : <EmptyPanel text="Log expenses to reveal category concentration." />}
        </div>
      </section>

      <section className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="card p-5">
          <div className="mb-5 flex items-center gap-2"><Repeat size={18} className="text-emerald-500" /><h2 className="font-bold text-slate-950 dark:text-white">Recurring expense radar</h2></div>
          {recurringExpenses.length ? <div className="divide-y divide-slate-100 dark:divide-[#262626]">{recurringExpenses.slice(0, 5).map(item => (
            <div key={`${item.label}-${item.category}`} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0"><div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{item.label}</div><div className="mt-1 text-xs text-slate-500">{item.category} · {item.occurrences} entries</div></div>
              <div className="shrink-0 text-right"><div className="font-mono text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(item.monthlyAverage)}</div><div className="text-[10px] uppercase text-slate-500">avg / month</div></div>
            </div>
          ))}</div> : <EmptyPanel text="Recurring patterns appear after similar expenses occur across two months." />}
        </div>

        <div className="card p-5">
          <div className="mb-5 flex items-center gap-2"><Calendar size={18} className="text-emerald-500" /><h2 className="font-bold text-slate-950 dark:text-white">Goal funding forecast</h2></div>
          {goalForecasts.length ? <div className="space-y-4">{goalForecasts.slice(0, 4).map(goal => (
            <div key={goal.id} className="rounded-lg border border-slate-100 p-3 dark:border-[#262626]">
              <div className="flex items-start justify-between gap-3"><div className="text-sm font-bold text-slate-900 dark:text-white">{goal.name}</div><span className={`text-xs font-bold ${goal.overdue ? 'text-red-600' : 'text-emerald-600'}`}>{goal.progress.toFixed(0)}%</span></div>
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-[#1f1f1f]"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${goal.progress}%` }} /></div>
              <div className="mt-3 text-xs text-slate-500">{goal.overdue ? 'Deadline passed' : goal.requiredMonthly != null ? `${formatCurrency(goal.requiredMonthly)} required monthly` : `${formatCurrency(goal.remaining)} remaining`}</div>
            </div>
          ))}</div> : <EmptyPanel text="Create a goal to calculate its required monthly funding pace." />}
        </div>

        <div className="card p-5">
          <div className="mb-5 flex items-center gap-2"><Shield size={18} className="text-emerald-500" /><h2 className="font-bold text-slate-950 dark:text-white">Concentration monitor</h2></div>
          {concentrationRows.length ? <div className="space-y-5">{concentrationRows.map(group => (
            <div key={`${group.book}-${group.currency}`}>
              <div className="flex items-center justify-between text-xs font-semibold text-slate-500"><span>{group.book} · {group.currency}</span><span>{group.symbol} {group.weight.toFixed(0)}%</span></div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-[#1f1f1f]"><div className={`h-full rounded-full ${group.weight > 60 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(100, group.weight)}%` }} /></div>
              {group.weight > 60 && <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600 dark:text-amber-400"><AlertTriangle size={12} /> Single-name concentration is elevated.</div>}
            </div>
          ))}</div> : <EmptyPanel text="Tracked or simulated positions will activate concentration monitoring." />}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-[330px_minmax(0,1fr)]">
          <div className="border-b border-slate-100 p-5 dark:border-[#262626] lg:border-b-0 lg:border-r">
            <div className="flex items-center gap-2"><TrendingUp size={18} className="text-emerald-500" /><h2 className="font-bold text-slate-950 dark:text-white">Downside stress lab</h2></div>
            <p className="mt-2 text-xs leading-5 text-slate-500">Apply the same hypothetical price shock to every position. Currency books remain separate.</p>
            <label className="mt-6 block text-xs font-bold uppercase tracking-wide text-slate-500">Market shock <span className="float-right text-red-600">{stressPercent}%</span></label>
            <input className="mt-3 w-full accent-emerald-500" type="range" min="-40" max="0" step="1" value={stressPercent} onChange={event => setStressPercent(Number(event.target.value))} />
            <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate-400"><span>-40%</span><span>0%</span></div>
          </div>
          <div className="grid grid-cols-1 gap-px bg-slate-100 dark:bg-[#262626] sm:grid-cols-2 xl:grid-cols-3">
            {Object.entries(stressedTotals).length ? Object.entries(stressedTotals).map(([currency, result]) => (
              <div key={currency} className="bg-white p-5 dark:bg-[#0a0a0a]">
                <div className="text-xs font-bold uppercase tracking-wide text-slate-500">{currency} book</div>
                <div className="mt-4 font-mono text-2xl font-bold text-slate-950 dark:text-white">{formatCurrency(result.afterStress, currency)}</div>
                <div className="mt-2 text-xs font-semibold text-red-600">{formatCurrency(result.impact, currency)} scenario impact</div>
              </div>
            )) : <div className="bg-white p-8 text-sm text-slate-500 dark:bg-[#0a0a0a] sm:col-span-2 xl:col-span-3">Add positions in Portfolio or Simulator to run a downside scenario.</div>}
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[['Portfolio', '/portfolio', Briefcase], ['Budget', '/budget', Wallet], ['Goals', '/goals', Target], ['AI Insights', '/insights', Activity]].map(([label, path, Icon]) => (
          <Link key={path} to={path} className="card-hover flex items-center justify-between p-4 text-sm font-bold text-slate-800 dark:text-slate-200">{label}<Icon size={17} className="text-emerald-500" /></Link>
        ))}
      </section>
    </div>
  )
}

function MetricPanel({ icon: Icon, label, value, note, tone = 'neutral' }) {
  const toneClass = tone === 'positive' ? 'text-emerald-600 dark:text-emerald-400' : tone === 'risk' ? 'text-red-600 dark:text-red-400' : 'text-slate-950 dark:text-white'
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between"><span className="text-sm font-semibold text-slate-500">{label}</span><span className="rounded-lg bg-emerald-50 p-2 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"><Icon size={17} /></span></div>
      <div className={`mt-5 font-mono text-2xl font-bold ${toneClass}`}>{value}</div>
      <div className="mt-2 text-xs text-slate-500">{note}</div>
    </div>
  )
}

function EmptyPanel({ text }) {
  return <div className="rounded-lg bg-slate-50 p-5 text-sm leading-6 text-slate-500 dark:bg-[#111111]">{text}</div>
}
