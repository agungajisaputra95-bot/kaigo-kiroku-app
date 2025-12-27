import React, { useState, useEffect } from 'react';
import { 
  Languages, Send, Copy, Check, AlertTriangle, Clock, MapPin, User, Sparkles, RefreshCw, 
  ArrowLeft, ChevronRight, ClipboardCheck, History, Trash2, CalendarDays, Activity, 
  Stethoscope, ShieldAlert, Info, Lock, Lightbulb, LayoutGrid, FileText, Bookmark, 
  ChevronDown, PlusCircle, Cpu, UserCheck, Zap, Eraser, Save, X, ChevronUp, Eye, 
  ShieldCheck, Scale, RotateCcw
} from 'lucide-react';

// API Key: Biarkan kosong untuk lingkungan Preview. 
// Untuk Vercel, Anda bisa menempelkan kunci Anda di sini: const apiKey = ""; 
const apiKey = "AIzaSyBi8MJfwJWYAlAXFjbRBwfaFpreYH2Q1PI"; 

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
  
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('kaigo_history_v3');
      return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  const initialFormState = {
    staffName: "", 
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: "",
    userName: "",
    category: "転倒 (Tentou)",
    storyIndo: "",
    immediateAction: "" 
  };

  const [formData, setFormData] = useState(initialFormState);

  const sampleCases = [
    {
      type: 'hiyari',
      staffName: "ジョコ (Joko)",
      location: "居室 (Kamar)",
      userName: "T-sama",
      category: "転倒 (Tentou)",
      storyIndo: "Tadi jam 2 siang Tanaka-san mencoba bangun sendiri tanpa panggil staf. Saat mau berdiri, kakinya lemas dan terduduk di lantai samping tempat tidur.",
      immediateAction: "Langsung menolong Tanaka-san kembali ke kasur. Cek tensi dan kesadaran normal. Tidak ada luka. Melapor ke leader."
    },
    {
      type: 'jiko',
      staffName: "ジョコ (Joko)",
      location: "食堂 (Ruang Makan)",
      userName: "S-sama",
      category: "誤嚥 (Goyen)",
      storyIndo: "Saat makan siang, Sato-san tiba-tiba tersedak saat makan agar-agar (jelly). Wajahnya memerah dan kesulitan bernapas selama beberapa detik.",
      immediateAction: "Melakukan tepukan punggung (back slap) sampai makanan keluar. Sato-san batuk dan napas kembali normal. Memberi air minum perlahan."
    }
  ];

  useEffect(() => {
    localStorage.setItem('kaigo_history_v3', JSON.stringify(history));
  }, [history]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  /**
   * Fungsi untuk mereset formulir dan kembali ke halaman awal
   */
  const handleReset = () => {
    setFormData(initialFormState);
    setJpOutput("");
    setIsSaved(false);
    setView('home');
    triggerToast("Formulir telah direset.");
  };

  const fillSampleCase = () => {
    const randomIndex = Math.floor(Math.random() * sampleCases.length);
    const selected = sampleCases[randomIndex];

    setReportType(selected.type);
    setFormData({
      ...formData,
      staffName: selected.staffName,
      location: selected.location,
      userName: selected.userName,
      category: selected.category,
      storyIndo: selected.storyIndo,
      immediateAction: selected.immediateAction,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().slice(0, 5),
    });

    if (view !== 'write') setView('write');
    setJpOutput("");
    setIsSaved(false);
    triggerToast("Kasus contoh dimuat.");
  };

  const fetchWithRetry = async (url, options, retries = 5, backoff = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
  };

  const generateReport = async () => {
    if (!formData.storyIndo || !formData.userName || !formData.staffName) {
      triggerToast("Mohon lengkapi semua data wajib.");
      return;
    }

    setIsLoading(true);
    setJpOutput("");
    setIsSaved(false); 

    const systemPrompt = `Anda adalah sistem pelaporan medis otomatis panti jompo (Kaigo) di Jepang. 
    Tugas: Membuat laporan formal 10 POIN TANPA NOMOR (1, 2, 3) pada isi poinnya.
    
    ATURAN FORMAT:
    1. Gunakan bentuk FUTSUU-KEI. 
    2. Gunakan terminologi medis profesional. 
    3. Akhir kalimat bagian Analisa Penyebab menggunakan 「と思われる」 atau 「と考えられる」.
    4. Baris Jepang lalu di bawahnya baris Indonesia dengan prefix [ID]. 
    5. JANGAN GUNAKAN NOMOR ATAU SIMBOL SEPERTI ①, ②, ③ pada bagian manapun.
    6. Tanpa Markdown.

    STRUKTUR:
    【Judul Laporan】
    [ID] (Judul)
    
    報告者：...
    発生日時：...
    発生場所：...
    対象者：...
    発生分類：...
    発生内容：...
    対応内容：...
    原因分類：...
    原因内容：...
    予防対策：... (Berikan 3 poin tanpa nomor, gunakan baris baru)`;

    const userQuery = `DATA INPUT: Jenis: ${reportType}, Pelapor: ${formData.staffName}, Waktu: ${formData.date} ${formData.time}, Lokasi: ${formData.location}, User: ${formData.userName}, Kronologi: ${formData.storyIndo}, Tindakan: ${formData.immediateAction}`;

    try {
      const data = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: userQuery }] }],
            systemInstruction: { parts: [{ text: systemPrompt }] }
          })
        }
      );

      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "Gagal mendapatkan respon AI.";
      const cleanResult = result.replace(/[*#_]/g, "").replace(/[①②③④⑤⑥⑦⑧⑨⑩]/g, "・").trim();
      setJpOutput(cleanResult);
    } catch (error) {
      setJpOutput(`Error: ${error.message}. Pastikan API Key sudah benar.`);
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
            <span className="font-semibold text-indigo-400 text-sm whitespace-nowrap">{label}：</span>
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

  const saveReportToHistory = () => {
    if (!jpOutput || isSaved) return;
    const newRecord = {
      id: Date.now(),
      dateCreated: formData.date,
      type: reportType,
      user: formData.userName,
      result: jpOutput
    };
    setHistory([newRecord, ...history]);
    setIsSaved(true);
    triggerToast("Laporan disimpan.");
  };

  return (
    <div className="dark min-h-screen bg-[#020617] font-sans text-slate-100 flex flex-col selection:bg-indigo-500/30 overflow-x-hidden transition-all duration-300">
      
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 border border-indigo-400/30 flex items-center gap-2">
          <Check size={18} /> <span className="text-sm font-bold tracking-wide">{toastMsg}</span>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-[#0f172a] text-white p-4 sticky top-0 z-30 border-b border-slate-800 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div onClick={() => setView('home')} className="cursor-pointer flex items-center gap-3 active:scale-95 transition-all text-left">
            <div className="bg-indigo-600 p-2 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Bookmark className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-black text-sm tracking-wider uppercase leading-none text-left text-white">介護記録サポート</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left mt-1">Kaigo Kiroku Support v.1.0</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {/* Tombol Refresh / Buat Lagi - Ditambahkan sesuai permintaan */}
            <button 
              onClick={handleReset}
              className="p-2.5 rounded-xl bg-slate-800/50 text-slate-400 hover:text-white hover:bg-slate-700 transition-all active:scale-90 shadow-lg border border-slate-700/30"
              title="Mulai Dari Awal"
            >
              <RotateCcw size={20} />
            </button>
            <button 
              onClick={() => setView('history')} 
              className={`p-2.5 rounded-xl transition-all relative ${view === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
            >
              <History size={20} />
              {history.length > 0 && view !== 'history' && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-[8px] font-black flex items-center justify-center rounded-full border-2 border-[#0f172a]">
                  {history.length}
                </span>
              )}
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto p-5 pb-24 flex-grow w-full space-y-6 text-left text-slate-100">
        
        {/* HOME VIEW */}
        {view === 'home' && (
          <div className="space-y-10 animate-in fade-in duration-500 pt-6 text-center text-slate-100">
            <div className="bg-[#0f172a] p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden text-center">
              <div className="bg-indigo-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-indigo-500/5">
                <Sparkles className="text-indigo-400" size={48} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter mb-3 uppercase text-center">レポート作成</h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 px-4 text-center">
                Ubah kronologi Bahasa Indonesia menjadi laporan Kaigo standar Jepang secara otomatis.
              </p>
              <button onClick={() => setView('write')} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto">
                <PlusCircle size={22} /> 新規作成 (Buat Laporan)
              </button>
            </div>
          </div>
        )}

        {/* WRITE VIEW */}
        {view === 'write' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300 text-left">
            <button onClick={() => setView('home')} className="flex items-center gap-2 text-slate-500 text-[11px] font-black uppercase tracking-widest hover:text-white transition-colors ml-2 text-left">
              <ArrowLeft size={16} /> Kembali
            </button>

            <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden p-8 space-y-8 text-left">
                <div className="space-y-3 text-left">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1 text-left">Jenis Laporan</label>
                  <div className="relative">
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className={`w-full p-4 appearance-none bg-slate-800 text-white rounded-2xl text-sm border-2 font-bold outline-none transition-all ${reportType === 'jiko' ? 'border-red-500/30 focus:border-red-500' : 'border-amber-500/30 focus:border-amber-500'}`}>
                      <option value="hiyari">ヒヤリハット (Near-Miss)</option>
                      <option value="jiko">事故報告書 (Incident)</option>
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800 text-left">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-4 text-left">
                    <LayoutGrid size={14}/> 基本情報 (Info Dasar)
                  </h3>
                  <input type="text" placeholder="Nama Pelapor" value={formData.staffName} onChange={(e) => setFormData({...formData, staffName: e.target.value})} className="w-full p-4 bg-slate-800 text-white rounded-xl text-sm border border-slate-700 font-bold focus:border-indigo-500 outline-none transition-all" />
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="p-4 bg-slate-800 text-white rounded-xl text-xs border border-slate-700 font-bold focus:border-indigo-500 outline-none transition-all" />
                    <input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="p-4 bg-slate-800 text-white rounded-xl text-xs border border-slate-700 font-bold focus:border-indigo-500 outline-none transition-all" />
                  </div>
                  <input type="text" placeholder="Inisial Nama User (misal: T-sama)" value={formData.userName} onChange={(e) => setFormData({...formData, userName: e.target.value})} className="w-full p-4 bg-slate-800 text-white rounded-xl border border-slate-700 font-bold focus:border-indigo-500 outline-none transition-all" />
                </div>

                <div className="space-y-4 pt-4 border-t border-slate-800 text-left text-slate-100">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 mb-2 text-left">
                    <Activity size={14}/> 状況分析 (Analisa)
                  </h3>
                  
                  <textarea rows="4" placeholder="Kronologi dalam Bahasa Indonesia..." value={formData.storyIndo} onChange={(e) => setFormData({...formData, storyIndo: e.target.value})} className="w-full p-5 bg-slate-800 text-white rounded-2xl text-sm border border-slate-700 outline-none leading-relaxed focus:border-indigo-500 transition-all"></textarea>
                  <textarea rows="3" placeholder="Tindakan yang diambil (Indo)..." value={formData.immediateAction} onChange={(e) => setFormData({...formData, immediateAction: e.target.value})} className="w-full p-5 bg-slate-800 text-white rounded-2xl text-sm border border-slate-700 outline-none leading-relaxed mt-4 focus:border-indigo-500 transition-all"></textarea>
                </div>

                <button onClick={generateReport} disabled={isLoading} className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${isLoading ? 'bg-slate-700 text-slate-500' : 'bg-indigo-600 text-white shadow-indigo-500/20'}`}>
                  {isLoading ? <RefreshCw className="animate-spin" size={22} /> : <Send size={22} />}
                  {isLoading ? "Memproses..." : "Buat Laporan"}
                </button>
            </div>

            {jpOutput && (
              <div className="space-y-5 animate-in slide-in-from-bottom-6 duration-700 pb-12 text-left">
                <div className="flex items-center justify-between px-2 text-left">
                  <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 text-left">
                    <ClipboardCheck size={16} /> Preview Laporan
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={saveReportToHistory} disabled={isSaved} className={`text-xs px-4 py-2 rounded-full font-bold flex items-center gap-2 ${isSaved ? 'bg-emerald-500/20 text-emerald-500' : 'bg-indigo-600 text-white shadow-lg'}`}>
                      {isSaved ? <Check size={14} /> : <Save size={14} />} {isSaved ? "Tersimpan" : "Simpan"}
                    </button>
                    <button onClick={() => copyToClipboard(jpOutput)} className="bg-slate-800 p-2.5 rounded-2xl shadow-lg border border-slate-700 flex items-center gap-2 transition-all hover:bg-slate-700 active:scale-90">
                      {isCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-slate-400" />}
                    </button>
                  </div>
                </div>
                <div className="bg-[#0f172a] p-8 md:p-10 rounded-[3rem] border-2 border-slate-800 shadow-2xl relative transition-all text-left whitespace-pre-wrap antialiased text-slate-100">
                  {renderFormattedResult(jpOutput)}
                </div>
              </div>
            )}
          </div>
        )}

        {/* HISTORY VIEW */}
        {view === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300 text-left text-slate-100">
             <div className="flex items-center justify-between px-1 text-left">
                <button onClick={() => setView('home')} className="bg-slate-800 p-2.5 rounded-2xl text-slate-400 border border-slate-700 active:scale-95 transition-all text-left"><ArrowLeft size={20} /></button>
                <div className="text-center text-left">
                  <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none text-center">Riwayat Laporan</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 text-center">Arsip Lokal Anda</p>
                </div>
                <button onClick={() => {setHistory([]); triggerToast("Riwayat dihapus.");}} className="bg-red-500/10 text-red-500 p-2.5 rounded-2xl active:scale-90"><Eraser size={20} /></button>
             </div>
             
             <div className="space-y-6 text-left">
               {history.length === 0 ? (
                 <div className="text-center py-24 bg-[#0f172a] rounded-[3.5rem] border border-dashed border-slate-800 text-center">
                   <History className="mx-auto text-slate-800 mb-4 text-center" size={64} />
                   <p className="text-slate-600 text-[11px] font-black uppercase tracking-widest text-center">Belum ada riwayat.</p>
                 </div>
               ) : (
                 history.map((item) => (
                   <div key={item.id} className="relative bg-[#0f172a] rounded-[2.5rem] border border-slate-800 shadow-xl overflow-hidden group hover:border-slate-600 transition-all text-left">
                      <div className={`absolute left-0 top-0 bottom-0 w-2 ${item.type === 'jiko' ? 'bg-red-600' : 'bg-amber-500'}`}></div>
                      <div className="p-6 md:p-8 space-y-4 text-left text-slate-100">
                        <div className="flex justify-between items-start text-left">
                          <div className="flex items-center gap-4 text-left">
                             <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.type === 'jiko' ? 'bg-red-600/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {item.type === 'jiko' ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                             </div>
                             <div className="text-left">
                                <span className="font-black text-white text-lg block leading-none mb-1 text-left">{item.user}</span>
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider text-left">{item.dateCreated}</span>
                             </div>
                          </div>
                          <button onClick={() => setHistory(history.filter(i => i.id !== item.id))} className="text-slate-700 hover:text-red-500 transition-colors"><Trash2 size={20}/></button>
                        </div>
                        <div className={`bg-slate-900/40 p-5 rounded-3xl border border-slate-800/50 transition-all cursor-pointer text-left ${expandedId === item.id ? '' : 'max-h-32 overflow-hidden'}`} onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                           <div className="relative text-left">{renderFormattedResult(item.result)}</div>
                        </div>
                        <button onClick={() => copyToClipboard(item.result)} className="w-full py-4 bg-indigo-600/10 text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-md">Salin Laporan</button>
                      </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {/* LEGAL VIEW */}
        {view === 'legal' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500 pb-12 text-left text-slate-100">
            <button onClick={() => setView('home')} className="bg-slate-800 p-2.5 rounded-2xl text-slate-400 border border-slate-700 shadow-lg text-left transition-all active:scale-95 text-left">
              <ArrowLeft size={20} />
            </button>
            
            <div className="space-y-8 text-left">
              <section className="bg-[#0f172a] p-8 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden text-left">
                <div className="flex items-center gap-4 mb-6 text-amber-400 text-left">
                  <div className="bg-amber-400/10 p-4 rounded-2xl ring-1 ring-amber-400/20">
                    <ShieldAlert size={28} />
                  </div>
                  <div className="text-left">
                    <h2 className="font-black text-xl uppercase tracking-tighter text-left text-white">Disclaimer</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1 text-left text-slate-400">Pelepasan Tanggung Jawab</p>
                  </div>
                </div>
                <div className="space-y-4 text-xs text-slate-400 leading-relaxed font-medium text-left">
                  <p>1. Laporan ini disusun secara otomatis oleh AI. Hasil mungkin tidak 100% akurat.</p>
                  <p>2. Pengguna **WAJIB** meninjau kembali laporan sebelum diserahkan secara resmi.</p>
                  <p>3. Aplikasi ini hanyalah alat bantu administrasi.</p>
                </div>
              </section>

              <section className="bg-[#0f172a] p-8 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden text-left">
                <div className="flex items-center gap-4 mb-6 text-indigo-400 text-left text-slate-100">
                  <div className="bg-indigo-400/10 p-4 rounded-2xl ring-1 ring-indigo-400/20">
                    <Lock size={28} />
                  </div>
                  <div className="text-left text-slate-100">
                    <h2 className="font-black text-xl uppercase tracking-tighter text-left text-white text-indigo-400">Privacy Policy</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1 text-left text-slate-400">Kebijakan Privasi</p>
                  </div>
                </div>
                <div className="space-y-4 text-xs text-slate-400 leading-relaxed font-medium text-left">
                  <p>1. **Data Pasien**: Sangat dilarang memasukkan nama lengkap. Gunakan inisial.</p>
                  <p>2. **Penyimpanan**: Laporan disimpan lokal di browser Anda.</p>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      <button 
        onClick={fillSampleCase}
        className="fixed bottom-6 right-6 bg-amber-500 hover:bg-amber-400 text-[#020617] p-5 rounded-[1.8rem] shadow-2xl active:scale-90 transition-all z-50 flex items-center gap-3 group overflow-hidden max-w-[64px] hover:max-w-[220px] ring-4 ring-amber-500/20"
      >
        <Zap size={24} className="shrink-0 fill-current animate-pulse group-hover:animate-none text-slate-900" />
        <span className="font-black text-xs uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 text-slate-900">Contoh Kasus</span>
      </button>

      <footer className="py-12 text-center space-y-6 text-slate-100 text-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <button 
            onClick={() => setView('legal')}
            className="text-[10px] font-black text-slate-600 hover:text-indigo-400 uppercase tracking-[0.3em] transition-all flex items-center gap-2 text-center"
          >
            <ShieldCheck size={14} /> Policy & Disclaimer
          </button>
          
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#0f172a] rounded-full border border-slate-800 shadow-xl shadow-black/50 mx-auto text-center">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none text-center">Created by Aaji.s | v.1.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
