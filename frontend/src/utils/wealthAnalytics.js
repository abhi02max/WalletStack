import { monthKey, parseLocalDate } from './financeStorage.js'

export const buildMonthlyCashFlow = (transactions = [], months = 6, now = new Date()) => {
  const buckets = Array.from({ length: months }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - (months - index - 1), 1)
    return {
      key: monthKey(date),
      label: new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(date),
      income: 0,
      expenses: 0,
      net: 0,
    }
  })
  const byMonth = new Map(buckets.map(bucket => [bucket.key, bucket]))

  for (const transaction of transactions) {
    const bucket = byMonth.get(monthKey(transaction.date))
    const amount = Number(transaction.amount || 0)
    if (!bucket || !Number.isFinite(amount) || amount <= 0) continue
    if (transaction.type === 'income') bucket.income += amount
    if (transaction.type === 'expense') bucket.expenses += amount
  }

  return buckets.map(bucket => ({ ...bucket, net: bucket.income - bucket.expenses }))
}

export const findRecurringExpenses = (transactions = []) => {
  const groups = new Map()

  for (const transaction of transactions) {
    if (transaction.type !== 'expense') continue
    const label = String(transaction.note || transaction.category || 'Expense').trim()
    const key = `${label.toLowerCase()}:${transaction.category || 'Other'}`
    const group = groups.get(key) || { label, category: transaction.category || 'Other', amounts: [], months: new Set() }
    group.amounts.push(Number(transaction.amount || 0))
    group.months.add(monthKey(transaction.date))
    groups.set(key, group)
  }

  return [...groups.values()]
    .filter(group => group.months.size >= 2)
    .map(group => ({
      label: group.label,
      category: group.category,
      occurrences: group.amounts.length,
      monthlyAverage: group.amounts.reduce((sum, amount) => sum + amount, 0) / group.amounts.length,
    }))
    .sort((a, b) => b.monthlyAverage - a.monthlyAverage)
}

export const buildGoalForecasts = (goals = [], now = new Date()) => goals.map(goal => {
  const target = Math.max(0, Number(goal.target || 0))
  const saved = Math.max(0, Number(goal.saved || 0))
  const remaining = Math.max(0, target - saved)
  const deadline = goal.deadline ? parseLocalDate(goal.deadline) : null
  const monthDistance = deadline
    ? Math.max(1, (deadline.getFullYear() - now.getFullYear()) * 12 + deadline.getMonth() - now.getMonth())
    : null

  return {
    ...goal,
    target,
    saved,
    remaining,
    progress: target > 0 ? Math.min(100, (saved / target) * 100) : 0,
    monthsRemaining: monthDistance,
    requiredMonthly: monthDistance ? remaining / monthDistance : null,
    overdue: Boolean(deadline && deadline < now && remaining > 0),
  }
})

export const calculateHealthScore = ({
  savingsRate,
  budgetUsage,
  goalProgress,
  recurringExpenseShare,
  hasTransactions,
}) => {
  if (!hasTransactions) return 0

  const savingsScore = Math.max(0, Math.min(30, ((savingsRate || 0) / 30) * 30))
  const budgetScore = budgetUsage <= 80 ? 25 : budgetUsage <= 100 ? 15 : Math.max(0, 15 - (budgetUsage - 100) / 4)
  const goalScore = Math.max(0, Math.min(25, (goalProgress / 100) * 25))
  const recurringScore = Math.max(0, 20 - recurringExpenseShare * 20)

  return Math.round(Math.min(100, savingsScore + budgetScore + goalScore + recurringScore))
}
