// /src/App.jsx
import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';

// Layout & Protect (always loaded — tiny files, needed for every route)
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// ── Lazy-loaded views ─────────────────────────────────────────────────────────
// Auth is loaded immediately since it's the landing page for unauthenticated users
import AuthView from './components/views/AuthView';

// These are only needed once the user is logged in — split them out
const DashboardView = lazy(() => import('./components/views/DashboardView'));
const RecipeListView = lazy(() => import('./components/views/RecipeListView'));
const RecipeDetailView = lazy(() => import('./components/views/RecipeDetailView'));
const RecipeForm = lazy(() => import('./components/recipe/RecipeForm'));
const InventoryView = lazy(() => import('./components/views/InventoryView'));
const ActiveBatchesView = lazy(() => import('./components/views/ActiveBatchesView'));
const HistoryView = lazy(() => import('./components/views/HistoryView'));
const CostAnalysisView = lazy(() => import('./components/views/CostAnalysisView'));
// BrewSession is the heaviest view — always defer it
const BrewSessionView = lazy(() => import('./components/views/BrewSessionView'));

// ── Shared loading skeleton ───────────────────────────────────────────────────
function PageLoader() {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 animate-pulse">
      <div className="w-16 h-16 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
      <p className="text-slate-500 dark:text-slate-400 font-bold text-sm tracking-widest uppercase">
        Cargando...
      </p>
    </div>
  );
}

// ── Error Boundary ────────────────────────────────────────────────────────────
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error("Detectado por ErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#050608] text-white p-6 md:p-10 flex flex-col items-center justify-center font-sans">
          <div className="bg-red-500/10 border border-red-500 p-8 md:p-12 rounded-3xl max-w-3xl w-full shadow-2xl">
            <h2 className="text-3xl md:text-4xl font-black text-red-500 mb-4 tracking-tighter">¡Escudo Activado!</h2>
            <p className="text-slate-300 text-lg mb-6 leading-relaxed">
              La aplicación bloqueó un fallo crítico proveniente de tu base de datos.<br /><br />
              <strong>Por favor, toma una captura del texto rojo de abajo y envíamela:</strong>
            </p>
            <div className="bg-black/80 p-6 rounded-2xl overflow-auto text-xs font-mono text-red-400 border border-red-900/50 shadow-inner max-h-64">
              {this.state.error && this.state.error.toString()}
              <br /><br />
              {this.state.errorInfo && this.state.errorInfo.componentStack}
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Main App ──────────────────────────────────────────────────────────────────
function MainApp() {
  const { darkMode } = useAppContext();

  return (
    <div className={darkMode ? 'dark' : ''}>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Ruta Pública */}
          <Route path="/auth" element={<AuthView />} />

          {/* Rutas Protegidas en Main Layout */}
          <Route path="/" element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<DashboardView />} />

            <Route path="recipes">
              <Route index element={<RecipeListView />} />
              <Route path="add" element={<RecipeForm />} />
              <Route path=":id" element={<RecipeDetailView />} />
              <Route path=":id/edit" element={<RecipeForm />} />
            </Route>

            <Route path="active" element={<ActiveBatchesView />} />
            <Route path="inventory" element={<InventoryView />} />
            <Route path="costs" element={<CostAnalysisView />} />
            <Route path="history" element={<HistoryView />} />
          </Route>

          {/* BrewSession: pantalla completa separada del layout */}
          <Route path="/brew/:id" element={
            <ProtectedRoute>
              <div className="min-h-screen font-sans selection:bg-amber-200 bg-slate-100 dark:bg-slate-950 p-4 md:p-6 lg:p-10 transition-colors duration-300">
                <div className="max-w-6xl mx-auto">
                  <BrewSessionView />
                </div>
              </div>
            </ProtectedRoute>
          } />

          {/* 404 — Redirigir al inicio */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}

// Envolvemos toda la app en el escudo de errores
export default function SafeApp() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}