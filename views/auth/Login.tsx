
import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import Button from '../../components/ui/Button';
import { COLORS, ICONS } from '../../constants';

interface LoginProps {
  onLoginSuccess: () => void;
}

const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      onLoginSuccess();
    } catch (err: any) {
      setError('Credenciais inválidas ou acesso não autorizado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#000000] relative overflow-hidden px-4">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-red-600/10 rounded-full blur-[120px] pointer-events-none"></div>
      
      <div className="w-full max-w-md z-10">
        <div className="bg-[#0a0a0a] border border-white/5 p-10 rounded-[2.5rem] shadow-2xl space-y-10 animate-in fade-in zoom-in-95 duration-700">
          
          <div className="text-center space-y-4">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-red-600/10 mb-2 border border-red-600/20">
               <div className="text-red-600 transform scale-150">
                {ICONS.Albums}
               </div>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter">
              REYEL<span className="text-red-600">PROD</span>
            </h1>
            <p className="text-slate-500 text-sm font-black uppercase tracking-widest">
              Painel Administrativo
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-500 px-4 py-3 rounded-2xl text-xs text-center font-black uppercase tracking-widest animate-shake">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase ml-1 tracking-widest">E-mail de Acesso</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.206" />
                  </svg>
                </span>
                <input
                  type="email"
                  required
                  className="w-full bg-black border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white font-bold placeholder-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600/40 transition-all"
                  placeholder="admin@reyelproducoes.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-600 uppercase ml-1 tracking-widest">Sua Senha</label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </span>
                <input
                  type="password"
                  required
                  className="w-full bg-black border border-white/5 rounded-2xl pl-14 pr-6 py-5 text-white font-bold placeholder-slate-800 focus:outline-none focus:ring-1 focus:ring-red-600/40 transition-all"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            </div>

            <Button 
              type="submit" 
              variant="primary" 
              className="w-full py-5 rounded-2xl text-xs font-black shadow-2xl shadow-red-900/40 uppercase tracking-[0.2em]" 
              isLoading={loading}
            >
              Acessar Painel
            </Button>
          </form>

          <p className="text-center text-slate-700 text-[10px] font-black uppercase tracking-widest">
            &copy; 2025 Reyel Produções. Todos os direitos reservados.
          </p>
        </div>
      </div>
      
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-5px); }
          75% { transform: translateX(5px); }
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default Login;
