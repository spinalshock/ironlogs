import { lazy, Suspense } from 'react'
import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

const Dashboard = lazy(() => import('./pages/Dashboard'))
const Scores = lazy(() => import('./pages/Scores'))
const Progression = lazy(() => import('./pages/Progression'))
const Amrap = lazy(() => import('./pages/Amrap'))
const Tonnage = lazy(() => import('./pages/Tonnage'))
const Bodyweight = lazy(() => import('./pages/Bodyweight'))
const Frequency = lazy(() => import('./pages/Frequency'))
const MuscleMapPage = lazy(() => import('./pages/MuscleMap'))
const Overall = lazy(() => import('./pages/Overall'))
const Journal = lazy(() => import('./pages/Journal'))
const Goals = lazy(() => import('./pages/Goals'))
const Log = lazy(() => import('./pages/Log'))
const Achievements = lazy(() => import('./pages/Achievements'))
const Analytics = lazy(() => import('./pages/Analytics'))
const Compliance = lazy(() => import('./pages/Compliance'))

function PageLoader() {
  return (
    <div style={{ padding: '2rem' }}>
      <div className="skeleton" style={{ width: '180px', height: '1.5rem', marginBottom: '1.5rem' }} />
      <div className="skeleton" style={{ width: '100%', height: '300px', borderRadius: '12px' }} />
    </div>
  )
}

export default function App() {
  return (
    <Layout>
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
    </Layout>
  )
}
