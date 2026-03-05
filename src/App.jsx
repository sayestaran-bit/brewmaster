// /src/App.jsx
import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAppContext } from './context/AppContext';

// Layout & Protect
import AppLayout from './components/layout/AppLayout';
import ProtectedRoute from './components/layout/ProtectedRoute';

// Views
import AuthView from './components/views/AuthView';
import DashboardView from './components/views/DashboardView';
import RecipeListView from './components/views/RecipeListView';
import RecipeDetailView from './components/views/RecipeDetailView';
import InventoryView from './components/views/InventoryView';
import ActiveBatchesView from './components/views/ActiveBatchesView';
import HistoryView from './components/views/HistoryView';
import BrewSessionView from './components/views/BrewSessionView';
import RecipeForm from './components/recipe/RecipeForm';

// --- ESCUDO ANTI-FALLOS (ERROR BOUNDARY) ---
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

function MainApp() {
  const { darkMode } = useAppContext();

  // Handlers Globales que estaban en RecipeForm se pasan a él internamente o via context.
  // En nuestro caso RecipeForm los maneja a través de AppContext, pero para las vistas
  // que editaban pasábamos info via props. Con react-router manejamos el state local allá.

  return (
    <div className={darkMode ? 'dark' : ''}>
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
          <Route path="history" element={<HistoryView />} />
        </Route>

        {/* Ruta de BrewSession (La separamos del Layout normal pues tiene su propio background dark mode y full screen feel) */}
        <Route path="/brew/:id" element={
          <ProtectedRoute>
            <div className={`min-h-screen font-sans selection:bg-amber-200 bg-slate-100 dark:bg-slate-950 p-4 md:p-6 lg:p-10 transition-colors duration-300`}>
              <div className="max-w-6xl mx-auto">
                <BrewSessionView />
              </div>
            </div>
          </ProtectedRoute>
        } />

        {/* 404 - Redirigir al inicio */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
}

// Envolvemos toda la aplicación en el escudo
export default function SafeApp() {
  return (
    <ErrorBoundary>
      <MainApp />
    </ErrorBoundary>
  );
}