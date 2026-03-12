import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import ErrorBoundary from './components/ErrorBoundary'
import BarbellLoader from './components/BarbellLoader'

// Retry failed chunk loads once (handles stale SW cache after deploy)
function lazyRetry(fn: () => Promise<any>) {
  return lazy(() => fn().catch(() => {
    // Force reload to get fresh chunks
    window.location.reload();
    return fn();
  }));
}

const Dashboard = lazyRetry(() => import('./pages/Dashboard'))
const Scores = lazyRetry(() => import('./pages/Scores'))
const Progression = lazyRetry(() => import('./pages/Progression'))
const Amrap = lazyRetry(() => import('./pages/Amrap'))
const Tonnage = lazyRetry(() => import('./pages/Tonnage'))
const Bodyweight = lazyRetry(() => import('./pages/Bodyweight'))
const Frequency = lazyRetry(() => import('./pages/Frequency'))
const MuscleMapPage = lazyRetry(() => import('./pages/MuscleMap'))
const Overall = lazyRetry(() => import('./pages/Overall'))
const Journal = lazyRetry(() => import('./pages/Journal'))
const Goals = lazyRetry(() => import('./pages/Goals'))
const Log = lazyRetry(() => import('./pages/Log'))
const Achievements = lazyRetry(() => import('./pages/Achievements'))
const Analytics = lazyRetry(() => import('./pages/Analytics'))
const Compliance = lazyRetry(() => import('./pages/Compliance'))

function PageLoader() {
  return <BarbellLoader size={56} />
}

export default function App() {
  return (
    <Layout>
      <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/scores" element={<Scores />} />
          <Route path="/progression" element={<Progression />} />
          <Route path="/amrap" element={<Amrap />} />
          <Route path="/tonnage" element={<Tonnage />} />
          <Route path="/bodyweight" element={<Bodyweight />} />
          <Route path="/frequency" element={<Frequency />} />
          <Route path="/muscles" element={<MuscleMapPage />} />
          <Route path="/overall" element={<Overall />} />
          <Route path="/journal" element={<Journal />} />
          <Route path="/goals" element={<Goals />} />
          <Route path="/log" element={<Log />} />
          <Route path="/achievements" element={<Achievements />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/compliance" element={<Compliance />} />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </Layout>
  )
}
