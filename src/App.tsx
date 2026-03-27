import React, { useState } from 'react';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import ProductsPage from './pages/Products';
import SettingsPage from './pages/Settings';
import CopiesPage from './pages/Copies';
import PublicOffers from './pages/PublicOffers';
import AutomationPage from './pages/Automation';
import LoginPage from './pages/Login';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Menu, Zap } from './components/Icons';

function AppContent() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-yellow-400/20 border-t-yellow-400 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <Routes>
        <Route path="/ofertas" element={<PublicOffers />} />
        <Route path="*" element={<LoginPage />} />
      </Routes>
    );
  }

  return (
    <div className="flex min-h-screen bg-black text-zinc-100 font-sans selection:bg-yellow-400 selection:text-black">
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="lg:hidden flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800 sticky top-0 z-30">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-yellow-400 rounded-lg flex items-center justify-center">
              <Zap className="text-black" size={18} fill="currentColor" />
            </div>
            <h1 className="text-lg font-bold tracking-tighter text-white">AFILIAUTO <span className="text-yellow-400">PRO</span></h1>
          </div>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="p-2 text-zinc-400 hover:text-white"
          >
            <Menu size={24} />
          </button>
        </header>

        <main className="flex-1 p-4 md:p-8 lg:p-12 overflow-y-auto">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/automation" element={<AutomationPage />} />
            <Route path="/copies" element={<CopiesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
            <Route path="/ofertas" element={<PublicOffers />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </BrowserRouter>
  );
}
