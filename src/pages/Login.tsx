import React, { useState } from 'react';
import { Zap, LogIn, ShieldCheck } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Simple login for demo
    if (email && password) {
      login(email);
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-6 font-sans selection:bg-yellow-400 selection:text-black">
      <div className="max-w-md w-full space-y-12">
        <div className="text-center space-y-6">
          <div className="inline-flex items-center gap-3">
            <div className="w-12 h-12 bg-yellow-400 rounded-2xl flex items-center justify-center shadow-2xl shadow-yellow-400/20">
              <Zap className="text-black" size={24} fill="currentColor" />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-white uppercase italic">
              AFILIAUTO <span className="text-yellow-400">PRO</span>
            </h1>
          </div>
          <p className="text-zinc-500 font-bold uppercase tracking-widest text-xs">Acesso Restrito ao Painel</p>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-10 rounded-[2.5rem] shadow-2xl space-y-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">E-mail de Acesso</label>
              <input 
                type="email" 
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-yellow-400/50 transition-all font-medium"
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest ml-1">Senha</label>
              <input 
                type="password" 
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-4 text-white outline-none focus:border-yellow-400/50 transition-all font-medium"
              />
            </div>

            <button 
              type="submit"
              className="w-full bg-yellow-400 hover:bg-yellow-500 text-black py-5 rounded-2xl font-black flex items-center justify-center gap-3 transition-all uppercase tracking-tighter shadow-xl shadow-yellow-400/10 active:scale-95"
            >
              <LogIn size={20} fill="currentColor" />
              Entrar no Painel
            </button>
          </form>

          <div className="pt-6 border-t border-zinc-900 flex items-center justify-center gap-2 text-zinc-600">
            <ShieldCheck size={16} />
            <span className="text-[10px] font-bold uppercase tracking-widest">Conexão Segura SSL</span>
          </div>
        </div>
        
        <p className="text-center text-zinc-700 text-[10px] font-bold uppercase tracking-widest">
          &copy; 2026 AFILIAUTO PRO - Todos os direitos reservados
        </p>
      </div>
    </div>
  );
};

export default Login;
