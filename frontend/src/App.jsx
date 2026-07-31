import { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth, SignIn, SignUp } from '@clerk/clerk-react'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import api from './services/apiClient'

const Home = lazy(() => import('./pages/Home'))
const StockDetail = lazy(() => import('./pages/StockDetail'))
const Search = lazy(() => import('./pages/Search'))
const Watchlist = lazy(() => import('./pages/Watchlist'))
const Settings = lazy(() => import('./pages/Settings'))
const Simulator = lazy(() => import('./pages/Simulator'))
const Compare = lazy(() => import('./pages/Compare'))
const Portfolio = lazy(() => import('./pages/Portfolio'))
const Budget = lazy(() => import('./pages/Budget'))
const Goals = lazy(() => import('./pages/Goals'))
const Insights = lazy(() => import('./pages/Insights'))
const Analytics = lazy(() => import('./pages/Analytics'))

function PageLoader() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="text-center">
        <div className="w-10 h-10 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-3 animate-pulse">
          <div className="w-5 h-5 rounded bg-emerald-500/70" />
        </div>
        <p className="text-sm font-medium text-slate-500">Loading workspace...</p>
      </div>
    </div>
  )
}

function ProtectedLayout() {
  const { isLoaded, isSignedIn } = useAuth()

  if (!isLoaded) return <PageLoader />
  if (!isSignedIn) return <Navigate to="/login" replace />
  return <Layout />
}

// Global interceptor hook to inject Clerk token into Axios
function TokenSetter() {
  const { getToken } = useAuth()
  
  useEffect(() => {
    const interceptor = api.interceptors.request.use(async (config) => {
      try {
        const token = await getToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
      } catch (err) {
        console.error("Failed to get Clerk token", err)
      }
      return config
    })
    
    return () => api.interceptors.request.eject(interceptor)
  }, [getToken])

  return null
}

function PostHogPageTracker() {
  const location = useLocation()
  
  useEffect(() => {
    if (import.meta.env.VITE_POSTHOG_KEY) {
      import('posthog-js').then(({ default: posthog }) => {
        posthog.capture('$pageview', {
          $current_url: window.location.href,
          path: location.pathname
        })
      })
    }
  }, [location])
  
  return null
}

export default function App() {
  return (
    <ErrorBoundary>
      <TokenSetter />
      <PostHogPageTracker />
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/login/*" element={
            <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
              <SignIn
                routing="path"
                path="/login"
                signUpUrl="/register"
                fallbackRedirectUrl="/"
                signUpFallbackRedirectUrl="/register"
              />
            </div>
          } />
          <Route path="/register/*" element={
            <div className="min-h-screen flex items-center justify-center bg-surface-50 dark:bg-surface-950">
              <SignUp
                routing="path"
                path="/register"
                signInUrl="/login"
                fallbackRedirectUrl="/"
                signInFallbackRedirectUrl="/login"
              />
            </div>
          } />

          <Route element={<ProtectedLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/search" element={<Search />} />
            <Route path="/stock/:symbol" element={<StockDetail />} />
            <Route path="/compare" element={<Compare />} />
            <Route path="/simulator" element={<Simulator />} />
            <Route path="/portfolio" element={<Portfolio />} />
            <Route path="/budget" element={<Budget />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/insights" element={<Insights />} />
            <Route path="/analytics" element={<Analytics />} />

            <Route path="/watchlist" element={<Watchlist />} />
            <Route path="/settings" element={<Settings />} />
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </ErrorBoundary>
  )
}
