import React, { useState, useEffect } from 'react';
import { 
  Languages, 
  Send, 
  Copy, 
  Check, 
  AlertTriangle, 
  Clock, 
  MapPin, 
  User, 
  Sparkles, 
  RefreshCw, 
  ArrowLeft, 
  ChevronRight, 
  ClipboardCheck, 
  History, 
  Trash2, 
  CalendarDays, 
  Activity, 
  Stethoscope, 
  ShieldAlert, 
  Info, 
  Lock, 
  Lightbulb, 
  LayoutGrid,
  FileText,
  Bookmark,
  ChevronDown,
  PlusCircle,
  Cpu,
  UserCheck,
  Zap,
  Eraser,
  Save,
  X,
  ChevronUp,
  Eye,
  ShieldCheck,
  Scale
} from 'lucide-react';

// API Key kosong, lingkungan eksekusi akan mengisi secara otomatis
const process.env.REACT_APP_GEMINI_API_KEY || "";

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
  
  // Fitur Riwayat dengan Local Storage
  const [history, setHistory] = useState(() => {
    try {
      const saved = localStorage.getItem('kaigo_history_v3');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
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

  // Sinkronisasi riwayat ke Local Storage
  useEffect(() => {
    localStorage.setItem('kaigo_history_v3', JSON.stringify(history));
  }, [history]);

  const triggerToast = (msg) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
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

  // Daftar Contoh Kasus (Nama Pelapor: Joko)
  const sampleCases = [
    {
      type: 'hiyari',
      staffName: "ジョコ (Joko)",
      location: "居室 (Kamar)",
      userName: "田中様",
      category: "転倒 (Tentou)",
      storyIndo: "Tadi jam 2 siang Tanaka-san mencoba bangun sendiri tanpa panggil staf. Saat mau berdiri, kakinya lemas dan terduduk di lantai samping tempat tidur.",
      immediateAction: "Langsung menolong Tanaka-san kembali ke kasur. Cek tensi dan kesadaran normal. Tidak ada luka. Melapor ke leader."
    },
    {
      type: 'jiko',
      staffName: "ジョコ (Joko)",
      location: "食堂 (Ruang Makan)",
      userName: "佐藤様",
      category: "誤嚥 (Goyen)",
      storyIndo: "Saat makan siang, Sato-san tiba-tiba tersedak saat makan agar-agar (jelly). Wajahnya memerah dan kesulitan bernapas selama beberapa detik.",
      immediateAction: "Melakukan tepukan punggung (back slap) sampai makanan keluar. Sato-san batuk dan napas kembali normal. Memberi air minum perlahan."
    }
  ];

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
    triggerToast("Kasus contoh (Joko) dimuat.");
  };

  const generateReport = async () => {
    if (!formData.storyIndo || !formData.userName || !formData.staffName) {
      triggerToast("Mohon lengkapi semua data wajib.");
      return;
    }

    setIsLoading(true);
    setJpOutput("");
    setIsSaved(false); 

    const systemPrompt = `Anda adalah sistem pelaporan medis otomatis di Jepang yang memproses data Kaigo.
    Tugas: Membuat laporan formal 10 POIN TANPA VARIASI FORMAT.
    
    ATURAN BAHASA JEPANG (WAJIB):
    1. Gunakan bentuk FUTSUU-KEI (Plain Form / Da-tai).
    2. Gunakan terminologi medis/Kaigo profesional.
    3. KHUSUS PADA BAGIAN "発生内容" (Isi Kejadian) dan "原因内容" (Analisa Penyebab): Gunakanlah akhiran kalimat "～と思われる" atau "～と考える" untuk memberikan kesan analisa yang objektif dan profesional.

    ATURAN STRUKTUR:
    - WAJIB mencantumkan semua 10 poin secara berurutan. Jangan menggabungkan poin.
    - Baris Jepang, lalu di bawahnya baris Indonesia dengan prefix [ID].
    - Tanpa Markdown. Langsung mulai dari Judul: 【${reportType === 'jiko' ? '事故報告書' : 'ヒヤリハット報告書'}】

    FORMAT TEMPLATE 10 POIN (WAJIB):
    【Judul Laporan】
    [ID] (Terjemahan Judul)

    報告者：[Nama Jepang] / [ID] [Nama Indonesia]
    発生日時：[Waktu Jepang] / [ID] [Waktu Indonesia]
    発生場所：[Lokasi Jepang] / [ID] [Lokasi Indonesia]
    対象者：[Nama User 様] / [ID] [Nama User]
    発生分類：[Kategori Jepang] / [ID] [Kategori Indonesia]
    発生内容：[Isi Jepang berdasarkan Kronologi Indo]
    [ID] [Terjemahan Isi Kejadian]
    対応内容：[Isi Jepang berdasarkan Tindakan Indo]
    [ID] [Terjemahan Tindakan]
    原因分類：[Pilih 1 kategori penyebab logis] / [ID] [Terjemahan Kategori]
    原因内容：[Analisa Penyebab dalam Jepang profesional]
    [ID] [Terjemahan Analisa Penyebab]
    予防対策：
    ① [Langkah 1 Jepang]
    [ID] [Langkah 1 Indonesia]
    ② [Langkah 2 Jepang]
    [ID] [Langkah 2 Indonesia]
    ③ [Langkah 3 Jepang]
    [ID] [Langkah 3 Indonesia]`;

    const userQuery = `
    DATA INPUT:
    - Jenis Laporan: ${reportType === 'jiko' ? '事故報告' : 'ヒヤリハット'}
    - Pelapor: ${formData.staffName}
    - Tanggal & Waktu: ${formData.date} ${formData.time}
    - Lokasi: ${formData.location}
    - User: ${formData.userName}
    - Kronologi (Indo): ${formData.storyIndo}
    - Tindakan (Indo): ${formData.immediateAction}`;

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

      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "エラーが発生しました。";
      const cleanResult = result.replace(/[*#_]/g, "").trim();
      setJpOutput(cleanResult);

    } catch (error) {
      setJpOutput(`Gagal menghubungkan ke sistem.\nDetail: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const renderFormattedResult = (text) => {
    return text.split('\n').map((line, index) => {
      const trimmedLine = line.trim();
      if (!trimmedLine) return <div key={index} className="h-2" />;

      if (trimmedLine.startsWith('[ID]')) {
        return (
          <div key={index} className="mb-3 text-left text-slate-500 text-[11px] italic leading-relaxed pl-1">
            {trimmedLine.replace('[ID]', '').trim()}
          </div>
        );
      }

      if (trimmedLine.startsWith('【') && trimmedLine.endsWith('】')) {
        return (
          <div key={index} className="mt-4 mb-2 font-bold text-white text-left text-lg tracking-wide border-b border-slate-800 pb-2">
            {trimmedLine}
          </div>
        );
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

      if (trimmedLine.startsWith('①') || trimmedLine.startsWith('②') || trimmedLine.startsWith('③')) {
        return (
          <div key={index} className="text-left text-slate-200 text-sm font-medium mt-1">
            {trimmedLine}
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
      category: formData.category,
      location: formData.location,
      result: jpOutput
    };

    setHistory([newRecord, ...history]);
    setIsSaved(true);
    triggerToast("Laporan disimpan ke riwayat.");
  };

  return (
    <div className="dark min-h-screen bg-[#020617] font-sans text-slate-100 flex flex-col selection:bg-indigo-500/30 overflow-x-hidden transition-all duration-300">
      
      {showToast && (
        <div className="fixed top-10 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-2xl animate-in slide-in-from-top-4 duration-300 flex items-center gap-2 border border-indigo-400/30">
          <Check size={18} />
          <span className="text-sm font-bold tracking-wide">{toastMsg}</span>
        </div>
      )}

      {/* Navbar */}
      <nav className="bg-[#0f172a] text-white p-4 sticky top-0 z-30 border-b border-slate-800 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div onClick={() => setView('home')} className="cursor-pointer flex items-center gap-3 active:scale-95 transition-all">
            <div className="bg-indigo-600 p-2 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Bookmark className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-black text-sm leading-tight tracking-wider uppercase text-left">介護記録サポート</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left leading-none mt-0.5">Kaigo Kiroku Support v.1.0</p>
            </div>
          </div>
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
      </nav>

      <main className="max-w-md mx-auto p-5 pb-24 flex-grow w-full space-y-6 text-left">
        
        {/* VIEW: HOME */}
        {view === 'home' && (
          <div className="space-y-10 animate-in fade-in duration-500 pt-6 text-center">
            <div className="bg-[#0f172a] p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="bg-indigo-50 dark:bg-indigo-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-indigo-500/5">
                <Sparkles className="text-indigo-400" size={48} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter mb-3 uppercase">レポート作成</h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 px-4">
                Input kronologi kejadian dalam Bahasa Indonesia, sistem akan menyusun laporan Bahasa Jepang standar profesional.
              </p>
              <button onClick={() => {setView('write'); setJpOutput(""); setIsSaved(false);}} className="w-full py-5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3 mx-auto">
                <PlusCircle size={22} /> 新規作成 (Buat Laporan)
              </button>
            </div>

            {history.length > 0 && (
              <div className="text-left space-y-4 pt-6 border-t border-slate-800">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">直近の履歴 (Terakhir)</h3>
                  <button onClick={() => setView('history')} className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">すべて見る</button>
                </div>
                <div onClick={() => setView('history')} className="bg-[#0f172a] p-5 rounded-[2.5rem] border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                      <div className={`w-3.5 h-3.5 rounded-full shadow-lg ${history[0].type === 'jiko' ? 'bg-red-500 shadow-red-500/20' : 'bg-amber-500 shadow-amber-500/20'}`}></div>
                      <div>
                        <p className="text-sm font-black text-white leading-tight">{history[0].user}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">
                          {history[0].type === 'jiko' ? '事故報告' : 'ヒヤリハット'} • {history[0].category}
                        </p>
                      </div>
                    </div>
                    <ChevronRight size={18} className="text-slate-600" />
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'write' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <button onClick={() => setView('home')} className="flex items-center gap-2 text-slate-500 text-[11px] font-black uppercase tracking-widest hover:text-white transition-colors ml-2">
              <ArrowLeft size={16} /> 戻る (Kembali)
            </button>

            <div className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 shadow-2xl overflow-hidden">
              <div className="p-8 space-y-8">
                
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-indigo-400 uppercase tracking-widest ml-1">報告書の種類 (Jenis Laporan)</label>
                  <div className="relative">
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className={`w-full p-4 pl-12 pr-10 appearance-none bg-slate-800 text-white rounded-2xl text-sm border-2 font-bold outline-none transition-all ${reportType === 'jiko' ? 'border-red-500/30 focus:border-red-500' : 'border-amber-500/30 focus:border-amber-500'}`}>
                      <option value="hiyari">ヒヤリハット (Near-Miss)</option>
                      <option value="jiko">事故報告書 (Incident)</option>
                    </select>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      {reportType === 'jiko' ? <ShieldAlert size={18} className="text-red-400" /> : <AlertTriangle size={18} className="text-amber-400" />}
                    </div>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <LayoutGrid size={14}/> 基本情報 (Info Dasar)
                  </h3>
                  
                  <input type="text" placeholder="Nama Anda" value={formData.staffName} onChange={(e) => setFormData({...formData, staffName: e.target.value})} className="w-full p-4 bg-slate-800 text-white rounded-2xl text-sm border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold" />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-slate-800 text-white rounded-2xl text-xs border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold" />
                    <input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full p-4 bg-slate-800 text-white rounded-2xl text-xs border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold" />
                  </div>

                  <input type="text" placeholder="Kamar / Toilet" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full p-4 bg-slate-800 text-white rounded-2xl text-sm border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold" />
                  <input type="text" placeholder="Tanaka-sama" value={formData.userName} onChange={(e) => setFormData({...formData, userName: e.target.value})} className="w-full p-4 bg-slate-800 text-white rounded-2xl text-sm border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold" />
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-100 dark:border-slate-800">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 text-left">
                    <Activity size={14}/> 状況分析 (Analisa)
                  </h3>
                  
                  <textarea rows="4" placeholder="Kronologi dalam Bahasa Indonesia..." value={formData.storyIndo} onChange={(e) => setFormData({...formData, storyIndo: e.target.value})} className="w-full p-5 bg-slate-800 text-white rounded-[1.5rem] text-sm border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold leading-relaxed"></textarea>
                  <textarea rows="3" placeholder="Tindakan yang diambil (Indo)..." value={formData.immediateAction} onChange={(e) => setFormData({...formData, immediateAction: e.target.value})} className="w-full p-5 bg-slate-800 text-white rounded-[1.5rem] text-sm border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold leading-relaxed"></textarea>
                </div>

                <button onClick={generateReport} disabled={isLoading} className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${isLoading ? 'bg-slate-700 text-slate-500 cursor-wait' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                  {isLoading ? <RefreshCw className="animate-spin" size={22} /> : <Send size={22} />}
                  {isLoading ? "翻訳中..." : "レポートを生成 (Buat Laporan)"}
                </button>
              </div>
            </div>

            {/* HASIL OUTPUT */}
            {jpOutput && (
              <div className="space-y-5 animate-in slide-in-from-bottom-6 duration-700 pb-12">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2 text-left">
                    <ClipboardCheck size={16} /> 10項目報告書 (Preview)
                  </h3>
                  <div className="flex gap-2">
                    <button onClick={saveReportToHistory} disabled={isSaved} className={`text-xs px-4 py-2 rounded-full font-bold flex items-center gap-2 ${isSaved ? 'bg-emerald-500/20 text-emerald-500 border border-emerald-500/30' : 'bg-indigo-600 text-white shadow-lg'}`}>
                      {isSaved ? <Check size={14} /> : <Save size={14} />} {isSaved ? "保存済み" : "保存"}
                    </button>
                    <button onClick={() => copyToClipboard(jpOutput)} className="bg-slate-800 p-2.5 rounded-2xl shadow-lg border border-slate-700 flex items-center gap-2 transition-all hover:bg-slate-700 active:scale-90">
                      {isCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-slate-400" />}
                    </button>
                  </div>
                </div>
                <div className="bg-[#0f172a] p-8 md:p-10 rounded-[3rem] border-2 border-slate-800 shadow-2xl relative overflow-hidden transition-all text-left">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none text-white"><FileText size={180} /></div>
                  <div className="relative z-10 antialiased">{renderFormattedResult(jpOutput)}</div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: HISTORY */}
        {view === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300 text-left">
             <div className="flex items-center justify-between px-1 text-left">
                <button onClick={() => setView('home')} className="bg-slate-800 p-2.5 rounded-2xl text-slate-400 border border-slate-700 active:scale-95 transition-all text-left"><ArrowLeft size={20} /></button>
                <div className="text-center">
                  <h2 className="text-xl font-black text-white uppercase tracking-tight leading-none text-center">レポート履歴</h2>
                  <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-1.5 text-center">Daftar Arsip Anda</p>
                </div>
                <button onClick={() => {setHistory([]); triggerToast("Riwayat dibersihkan.");}} className="bg-red-500/10 text-red-500 p-2.5 rounded-2xl hover:bg-red-600 hover:text-white transition-all active:scale-90">
                  <Eraser size={20} />
                </button>
             </div>
             
             <div className="space-y-6 text-left">
               {history.length === 0 ? (
                 <div className="text-center py-24 bg-[#0f172a] rounded-[3.5rem] border-4 border-dashed border-slate-800">
                   <History className="mx-auto text-slate-800 mb-4" size={64} />
                   <p className="text-slate-600 text-[11px] font-black uppercase tracking-widest text-center">Belum ada riwayat laporan.</p>
                 </div>
               ) : (
                 history.map((item) => (
                   <div key={item.id} className="relative bg-[#0f172a] rounded-[2.5rem] border border-slate-800 shadow-xl overflow-hidden transition-all duration-300 group hover:border-slate-600 text-left">
                      <div className={`absolute left-0 top-0 bottom-0 w-2 ${item.type === 'jiko' ? 'bg-red-600' : 'bg-amber-500'}`}></div>
                      <div className="p-6 md:p-8 space-y-4">
                        <div className="flex justify-between items-start">
                          <div className="flex items-center gap-4 text-left">
                             <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${item.type === 'jiko' ? 'bg-red-600/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                {item.type === 'jiko' ? <ShieldAlert size={24} /> : <AlertTriangle size={24} />}
                             </div>
                             <div className="text-left">
                                <span className="font-black text-white text-lg block leading-none mb-1 text-left">{item.user}</span>
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider bg-slate-800 px-2 py-0.5 rounded-md flex items-center gap-1 leading-none text-left">
                                    <CalendarDays size={10}/> {item.dateCreated}
                                  </span>
                                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md leading-none text-left ${item.type === 'jiko' ? 'bg-red-600/10 text-red-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                    {item.type === 'jiko' ? '事故報告書' : 'ヒヤリハット'}
                                  </span>
                                </div>
                             </div>
                          </div>
                          <button onClick={() => setHistory(history.filter(i => i.id !== item.id))} className="text-slate-700 hover:text-red-500 p-2 transition-colors active:scale-90">
                            <Trash2 size={22}/>
                          </button>
                        </div>
                        <div className={`bg-slate-900/40 p-5 rounded-3xl border border-slate-800/50 transition-all duration-500 cursor-pointer ${expandedId === item.id ? '' : 'max-h-32 overflow-hidden'}`} onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                           <div className="relative antialiased text-left">{renderFormattedResult(item.result)}</div>
                        </div>
                        <button onClick={() => copyToClipboard(item.result)} className="w-full py-4 bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white rounded-[1.5rem] text-[10px] font-black uppercase tracking-widest transition-all border border-indigo-500/20 active:scale-95 flex items-center justify-center gap-2 shadow-lg">
                          <Copy size={16} /> コピー (Salin)
                        </button>
                      </div>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {/* VIEW: LEGAL (DISCLAIMER & POLICY) */}
        {view === 'legal' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-500 pb-12 text-left">
            <button onClick={() => setView('home')} className="bg-slate-800 p-2.5 rounded-2xl text-slate-400 border border-slate-700 shadow-lg text-left transition-all active:scale-95">
              <ArrowLeft size={20} />
            </button>
            
            <div className="space-y-8">
              <section className="bg-[#0f172a] p-8 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-4 mb-6 text-amber-400">
                  <div className="bg-amber-400/10 p-4 rounded-2xl ring-1 ring-amber-400/20">
                    <ShieldAlert size={28} />
                  </div>
                  <div>
                    <h2 className="font-black text-xl uppercase tracking-tighter">Disclaimer</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Pelepasan Tanggung Jawab</p>
                  </div>
                </div>
                <div className="space-y-4 text-xs text-slate-400 leading-relaxed font-medium">
                  <p>1. Laporan ini disusun secara otomatis oleh sistem. Hasil terjemahan dan susunan kalimat mungkin tidak 100% akurat.</p>
                  <p>2. Pengguna **WAJIB** meninjau kembali setiap poin laporan sebelum diserahkan secara resmi ke pihak manajemen panti atau institusi terkait.</p>
                  <p>3. Kami tidak bertanggung jawab atas kesalahan tindakan medis atau hukum yang timbul akibat penggunaan langsung hasil laporan tanpa verifikasi profesional.</p>
                </div>
              </section>

              <section className="bg-[#0f172a] p-8 rounded-[3rem] border border-slate-800 shadow-2xl relative overflow-hidden">
                <div className="flex items-center gap-4 mb-6 text-indigo-400">
                  <div className="bg-indigo-400/10 p-4 rounded-2xl ring-1 ring-indigo-400/20">
                    <Lock size={28} />
                  </div>
                  <div>
                    <h2 className="font-black text-xl uppercase tracking-tighter">Privacy Policy</h2>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mt-1">Kebijakan Privasi</p>
                  </div>
                </div>
                <div className="space-y-4 text-xs text-slate-400 leading-relaxed font-medium">
                  <p>1. **Data Pasien**: Sangat dilarang memasukkan nama lengkap lansia. Disarankan menggunakan inisial (contoh: T-sama) demi menjaga privasi dan mematuhi regulasi di Jepang.</p>
                  <p>2. **Penyimpanan**: Seluruh riwayat laporan disimpan secara lokal di browser perangkat Anda melalui *LocalStorage*. Kami tidak menyimpan data laporan Anda di server kami.</p>
                  <p>3. **Pemrosesan Sistem**: Teks input dikirim ke server untuk pemrosesan sementara dan tidak digunakan untuk pelatihan data pihak ketiga oleh pengembang aplikasi ini.</p>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) - Contoh Kasus */}
      <button 
        onClick={fillSampleCase}
        className="fixed bottom-6 right-6 bg-amber-500 hover:bg-amber-400 text-[#020617] p-5 rounded-[1.8rem] shadow-2xl active:scale-90 transition-all z-50 flex items-center gap-3 group overflow-hidden max-w-[64px] hover:max-w-[220px] ring-4 ring-amber-500/20"
      >
        <Zap size={24} className="shrink-0 fill-current animate-pulse group-hover:animate-none" />
        <span className="font-black text-xs uppercase tracking-widest whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300">Contoh Kasus</span>
      </button>

      <footer className="py-12 text-center space-y-6">
        <div className="flex flex-col items-center gap-4">
          <button 
            onClick={() => setView('legal')}
            className="text-[10px] font-black text-slate-600 hover:text-indigo-400 uppercase tracking-[0.3em] transition-all flex items-center gap-2"
          >
            <ShieldCheck size={14} /> Policy & Disclaimer
          </button>
          
          <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#0f172a] rounded-full border border-slate-800 shadow-xl shadow-black/50 mx-auto">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest leading-none text-center">Created by Aaji.s | v.1.0</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
