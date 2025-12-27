import React, { useState, useEffect } from 'react';
import { 
  Languages, Send, Copy, Check, AlertTriangle, Clock, MapPin, User, Sparkles, RefreshCw, 
  ArrowLeft, ChevronRight, ClipboardCheck, History, Trash2, CalendarDays, Activity, 
  Stethoscope, ShieldAlert, Info, Lock, Lightbulb, LayoutGrid, FileText, Bookmark, 
  ChevronDown, PlusCircle, Cpu, UserCheck, Zap, Eraser, Save, X, ChevronUp, Eye, 
  ShieldCheck, Scale 
} from 'lucide-react';

/**
 * LOGIKA PENGAMBILAN API KEY UNTUK VERCEL
 * Kode ini dirancang untuk mendeteksi kunci baik di lingkungan Vite maupun Create React App.
 */
const getApiKey = () => {
  // 1. Cek sistem standar (process.env) - Biasanya untuk Create React App / Webpack
  if (typeof process !== 'undefined' && process.env && process.env.REACT_APP_GEMINI_API_KEY) {
    return process.env.REACT_APP_GEMINI_API_KEY;
  }

  // 2. Cek sistem Vite (import.meta.env)
  // Kami menggunakan try-catch untuk menghindari error "import.meta" di lingkungan non-ESM
  try {
    // @ts-ignore
    const env = import.meta.env;
    if (env && env.VITE_GEMINI_API_KEY) return env.VITE_GEMINI_API_KEY;
    if (env && env.REACT_APP_GEMINI_API_KEY) return env.REACT_APP_GEMINI_API_KEY;
  } catch (e) {
    // Abaikan jika tidak didukung
  }

  return "";
};

const API_KEY_VALUE = getApiKey();

export default function App() {
  const [view, setView] = useState('home'); 
  const [reportType, setReportType] = useState('hiyari'); // hiyari | jiko
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isSaved, setIsSaved] = useState(false); 
  const [jpOutput, setJpOutput] = useState("");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  const [expandedId, setExpandedId] = useState(null); 
  const [showDebug, setShowDebug] = useState(false);
  
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('kaigo_history_v3');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const [formData, setFormData] = useState({
    staffName: "ジョコ (Joko)", 
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: "",
    userName: "",
    category: "転倒 (Tentou)",
    storyIndo: "",
    immediateAction: "" 
  });

  useEffect(() => {
    localStorage.setItem('kaigo_history_v3', JSON.stringify(history));
  }, [history]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const fetchWithRetry = async (url, options, retries = 3, backoff = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise(res => setTimeout(res, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
  };

  const generateReport = async () => {
    if (!formData.storyIndo || !formData.userName) {
      triggerToast("Mohon isi kronologi dan nama user.");
      return;
    }

    if (!API_KEY_VALUE) {
      setJpOutput("KESALAHAN: API Key tidak terdeteksi.\n\nJika Anda menggunakan Vite, Anda HARUS menamai variabel di Vercel sebagai VITE_GEMINI_API_KEY. Jika menggunakan React biasa, pastikan sudah melakukan REDEPLOY di Vercel.");
      return;
    }

    setIsLoading(true);
    setJpOutput("");
    setIsSaved(false); 

    const systemPrompt = `Anda adalah sistem pelaporan medis otomatis panti jompo (Kaigo) di Jepang. Tugas: Membuat laporan formal 10 POIN. Gunakan Futsuu-kei. Berikan terjemahan Indo dengan prefix [ID]. Tanpa Markdown.`;

    const userQuery = `DATA: Jenis: ${reportType}, Pelapor: ${formData.staffName}, Waktu: ${formData.date} ${formData.time}, Lokasi: ${formData.location}, User: ${formData.userName}, Kronologi: ${formData.storyIndo}, Tindakan: ${formData.immediateAction}`;

    try {
      const data = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${API_KEY_VALUE}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
          })
        }
      );

      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal mendapatkan respon.";
      setJpOutput(result.trim());

    } catch (error) {
      setJpOutput(`Error: ${error.message}\n\nPastikan API Key di Vercel sudah benar.`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedResult = (text) => {
    return text.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div key={index} className="h-2" />;
      if (trimmedLine.startsWith('[ID]')) {
        return <div key={index} className="mb-3 text-left text-slate-500 text-[11px] italic leading-relaxed pl-1">{trimmedLine.replace('[ID]', '').trim()}</div>;
      }
      if (trimmedLine.startsWith('【') && trimmedLine.endsWith('】')) {
        return <div key={index} className="mt-4 mb-2 font-bold text-white text-left text-lg tracking-wide border-b border-slate-800 pb-2">{trimmedLine}</div>;
      }
      if (trimmedLine.includes('：')) {
        const [label, ...rest] = trimmedLine.split('：');
        return (
          <div key={index} className="text-left flex flex-wrap items-baseline gap-1">
            <span className="font-semibold text-indigo-400 text-sm">{label}：</span>
            <span className="text-slate-200 text-sm font-medium">{rest.join('：')}</span>
          </div>
        );
      }
      return <div key={index} className="mb-1 text-left text-slate-300 text-sm leading-relaxed">{trimmedLine}</div>;
    });
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setIsCopied(true);
    triggerToast("Berhasil disalin.");
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="dark min-h-screen bg-[#020617] font-sans text-slate-100 flex flex-col overflow-x-hidden">
      
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 flex items-center gap-2 border border-indigo-400/30">
          <Check size={18} />
          <span className="text-sm font-bold tracking-wide">{toastMsg}</span>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-[#0f172a] p-4 sticky top-0 z-30 border-b border-slate-800 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div onClick={() => setView('home')} className="cursor-pointer flex items-center gap-3">
            <div className="bg-indigo-600 p-2 rounded-2xl"><Bookmark className="text-white" size={20} /></div>
            <div>
              <h1 className="font-black text-sm uppercase">介護記録サポート</h1>
              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-0.5 text-left">v.1.0</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowDebug(!showDebug)} className={`p-2.5 rounded-xl ${showDebug ? 'bg-amber-500 text-black' : 'bg-slate-800 text-slate-500'}`}><Cpu size={18} /></button>
            <button onClick={() => setView('history')} className={`p-2.5 rounded-xl relative ${view === 'history' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'}`}>
              <History size={20} />
              {history.length > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[8px] font-black flex items-center justify-center rounded-full border-2 border-[#0f172a]">{history.length}</span>}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto p-5 pb-24 flex-grow w-full space-y-6 text-left">
        
        {showDebug && (
          <div className="bg-slate-900 p-6 rounded-3xl border border-slate-700 font-mono text-[10px] space-y-2">
            <div className="flex justify-between"><span>Status:</span> <span className={API_KEY_VALUE ? "text-green-400" : "text-red-400"}>{API_KEY_VALUE ? "LOADED" : "NOT FOUND"}</span></div>
            <div className="flex justify-between"><span>Key Pref:</span> <span>{API_KEY_VALUE ? API_KEY_VALUE.substring(0, 6) + "..." : "NONE"}</span></div>
            <p className="text-slate-500 italic mt-2">*Jika NOT FOUND, pastikan sudah REDEPLOY di Vercel setelah isi Env Var.</p>
          </div>
        )}

        {view === 'home' && (
          <div className="space-y-10 animate-in fade-in duration-500 pt-6">
            <div className="bg-[#0f172a] p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl text-center">
              <div className="bg-indigo-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8"><Sparkles className="text-indigo-400" size={48} /></div>
              <h2 className="text-3xl font-black mb-3 uppercase tracking-tighter">レポート作成</h2>
              <p className="text-slate-400 text-sm mb-10 px-4">Ubah kronologi Bahasa Indonesia menjadi laporan Kaigo Jepang profesional.</p>
              <button onClick={() => setView('write')} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3"><PlusCircle size={22} /> 新規作成 (Buat Laporan)</button>
            </div>
          </div>
        )}

        {view === 'write' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <button onClick={() => setView('home')} className="flex items-center gap-2 text-slate-500 text-[11px] font-black uppercase tracking-widest"><ArrowLeft size={16} /> 戻る (Kembali)</button>

            <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 shadow-2xl p-8 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">Jenis Laporan</label>
                <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="w-full p-4 bg-slate-800 text-white rounded-2xl text-sm border-2 border-slate-700 outline-none font-bold">
                  <option value="hiyari">ヒヤリハット (Near-Miss)</option>
                  <option value="jiko">事故報告書 (Incident)</option>
                </select>
              </div>

              <div className="space-y-4 pt-4 border-t border-slate-800">
                <input type="text" placeholder="Nama Anda" value={formData.staffName} onChange={(e) => setFormData({...formData, staffName: e.target.value})} className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 text-sm font-bold" />
                <div className="grid grid-cols-2 gap-4">
                  <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="p-4 bg-slate-800 rounded-xl border border-slate-700 text-xs font-bold" />
                  <input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="p-4 bg-slate-800 rounded-xl border border-slate-700 text-xs font-bold" />
                </div>
                <input type="text" placeholder="Inisial Nama User (misal: T-sama)" value={formData.userName} onChange={(e) => setFormData({...formData, userName: e.target.value})} className="w-full p-4 bg-slate-800 rounded-xl border border-slate-700 text-sm font-bold" />
              </div>

              <textarea rows="4" placeholder="Kronologi dalam Bahasa Indonesia..." value={formData.storyIndo} onChange={(e) => setFormData({...formData, storyIndo: e.target.value})} className="w-full p-5 bg-slate-800 rounded-2xl border border-slate-700 text-sm font-medium" />

              <button onClick={generateReport} disabled={isLoading} className="w-full py-5 bg-indigo-600 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl flex items-center justify-center gap-3 active:scale-95 disabled:bg-slate-800 transition-all">
                {isLoading ? <RefreshCw className="animate-spin" size={22} /> : <Send size={22} />}
                {isLoading ? "翻訳中..." : "Generate Laporan"}
              </button>
            </div>

            {jpOutput && (
              <div className="bg-[#0f172a] p-8 md:p-10 rounded-[3rem] border-2 border-slate-800 shadow-2xl relative overflow-hidden transition-all text-left">
                <div className="flex justify-between items-center mb-6">
                   <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Preview Laporan</h3>
                   <button onClick={() => copyToClipboard(jpOutput)} className="p-2 bg-slate-800 rounded-lg text-slate-400"><Copy size={16} /></button>
                </div>
                <div className="relative z-10 antialiased whitespace-pre-wrap">{renderFormattedResult(jpOutput)}</div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
