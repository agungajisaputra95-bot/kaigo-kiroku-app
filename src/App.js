import React, { useState } from 'react';
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
  ShieldAlert
} from 'lucide-react';

const apiKey = "AIzaSyB5sb_B_4ojK_kIT5pk7hdMbJpj6kATElc"; 

export default function App() {
  const [view, setView] = useState('home'); // home | write | history
  const [reportType, setReportType] = useState('hiyari');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [jpOutput, setJpOutput] = useState("");
  const [history, setHistory] = useState([]);

  // Form Data Updated with Date
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // Default hari ini
    time: new Date().toTimeString().slice(0, 5),
    location: "",
    userName: "",
    category: "Jatuh (Tentou)",
    rootCause: "Faktor Lansia (Pengguna)", 
    storyIndo: "",
    immediateAction: "" 
  });

  const generateReport = async () => {
    if (!formData.storyIndo || !formData.userName) {
      alert("Mohon lengkapi data utama.");
      return;
    }

    setIsLoading(true);
    setJpOutput("");

    // Prompt updated with Date
    const systemPrompt = `Anda adalah kepala perawat Jepang yang ahli menulis laporan.
    Tugas: Buat laporan Kaigo Kiroku yang SANGAT LENGKAP & FORMAL berdasarkan data ini.
    
    ATURAN FORMAT (TEKS MURNI TANPA MARKDOWN):
    1. Gunakan Bahasa Jepang Formal (Desu/Masu/Keigo).
    2. Pisahkan dengan jelas antara Kronologi, Penyebab, dan Tindakan.
    3. Hapus tanda bintang (*) atau pagar (#).
    
    STRUKTUR LAPORAN YANG DIINGINKAN:
    【Laporan】 (Pilih judul yang tepat: Hiyari/Jiko)
    
    【1. Data Dasar / 基本情報】
    Tanggal Kejadian: (Isi Tanggal)
    Waktu: (Isi Waktu)
    Lokasi: (Isi Lokasi)
    Pengguna: (Isi Nama + Sama)
    
    【2. Kronologi Kejadian / 発生状況】
    (Terjemahkan kronologi dengan detail. Gunakan istilah seperti: dokuho, gaishou nashi, hakken, dsb)
    
    【3. Analisa Penyebab / 原因】
    (Fokus pada faktor: ${formData.rootCause}. Analisa kenapa hal ini terjadi berdasarkan cerita)
    
    【4. Tindakan Saat Itu / 直後の処置】
    (Terjemahkan tindakan langsung yang dilakukan staf saat kejadian)
    
    【5. Rencana Pencegahan / 今後の対策】
    (Berikan saran konkret agar tidak terulang, berdasarkan penyebabnya)

    DATA INPUT:
    - Jenis: ${reportType}
    - Tanggal: ${formData.date}
    - Waktu: ${formData.time}
    - Lokasi: ${formData.location}
    - Pengguna: ${formData.userName}
    - Kategori: ${formData.category}
    - Faktor Penyebab Utama: ${formData.rootCause}
    - Cerita Kejadian: "${formData.storyIndo}"
    - Tindakan Langsung: "${formData.immediateAction}"`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt }] }]
        })
      });

      const data = await response.json();
      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "Terjadi kesalahan.";
      
      const cleanResult = result.replace(/[*#_]/g, "").trim();
      setJpOutput(cleanResult);

      const newRecord = {
        id: Date.now(),
        dateCreated: formData.date, // Use selected date for history
        type: reportType,
        user: formData.userName,
        category: formData.category,
        result: cleanResult
      };
      setHistory([newRecord, ...history]);

    } catch (error) {
      setJpOutput("Gagal menghubungkan ke AI. Cek koneksi internet.");
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    const textArea = document.createElement("textarea");
    textArea.value = text;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const deleteHistoryItem = (id) => {
    if(window.confirm("Hapus laporan ini?")) {
      setHistory(history.filter(item => item.id !== id));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      <nav className="bg-slate-900 text-white p-4 sticky top-0 z-20 shadow-md">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-500 p-1.5 rounded-lg">
              <Languages size={20} />
            </div>
            <h1 className="font-bold text-lg tracking-tight">Kaigo Master AI</h1>
          </div>
          <button 
            onClick={() => setView('history')}
            className={`p-2 rounded-full transition-all ${view === 'history' ? 'bg-indigo-600' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <History size={20} />
          </button>
        </div>
      </nav>

      <main className="max-w-md mx-auto p-4 pb-20">
        
        {/* VIEW: HOME */}
        {view === 'home' && (
          <div className="py-6 space-y-6 animate-in fade-in duration-500">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 text-center">
              <h2 className="text-xl font-bold text-slate-800 mb-2">Pilih Jenis Laporan</h2>
              <p className="text-slate-500 text-sm mb-6">Sesuaikan dengan formulir kertas Anda.</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => {setReportType('hiyari'); setView('write'); setJpOutput("");}}
                  className="bg-amber-50 border-2 border-amber-100 p-4 rounded-2xl hover:bg-amber-100 hover:border-amber-300 transition-all flex flex-col items-center gap-2 group"
                >
                  <AlertTriangle className="text-amber-500 group-hover:scale-110 transition-transform" size={32} />
                  <span className="font-bold text-amber-700">Hiyari Hatto</span>
                </button>
                <button 
                  onClick={() => {setReportType('jiko'); setView('write'); setJpOutput("");}}
                  className="bg-red-50 border-2 border-red-100 p-4 rounded-2xl hover:bg-red-100 hover:border-red-300 transition-all flex flex-col items-center gap-2 group"
                >
                  <ShieldAlert className="text-red-500 group-hover:scale-110 transition-transform" size={32} />
                  <span className="font-bold text-red-700">Jiko Houkoku</span>
                </button>
              </div>
            </div>

            {history.length > 0 && (
               <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                 <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Terakhir Dibuat</h3>
                 <div onClick={() => setView('history')} className="flex items-center justify-between cursor-pointer p-2 hover:bg-slate-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-2 h-8 rounded-full ${history[0].type === 'jiko' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                      <div>
                        <p className="text-sm font-bold text-slate-700">{history[0].user}</p>
                        <p className="text-xs text-slate-400">{history[0].category}</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                 </div>
               </div>
            )}
          </div>
        )}

        {/* VIEW: WRITE */}
        {view === 'write' && (
          <div className="space-y-6 animate-in slide-in-from-right duration-300">
            <button onClick={() => setView('home')} className="flex items-center gap-1 text-slate-500 text-sm font-medium">
              <ArrowLeft size={16} /> Kembali
            </button>

            <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
              <div className={`p-4 text-white flex items-center gap-2 ${reportType === 'jiko' ? 'bg-red-600' : 'bg-amber-500'}`}>
                {reportType === 'jiko' ? <ShieldAlert size={20} /> : <AlertTriangle size={20} />}
                <span className="font-bold text-sm uppercase tracking-wide">
                  Isi Data Laporan
                </span>
              </div>

              <div className="p-5 space-y-5">
                {/* 1. Data Waktu & Tempat (UPDATED LAYOUT) */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex gap-1"><CalendarDays size={12}/> Tanggal</label>
                    <input 
                      type="date" 
                      value={formData.date}
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
                      className="w-full p-2.5 bg-slate-50 rounded-xl text-sm border border-transparent focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase flex gap-1"><Clock size={12}/> Jam</label>
                    <input 
                      type="time" 
                      value={formData.time}
                      onChange={(e) => setFormData({...formData, time: e.target.value})}
                      className="w-full p-2.5 bg-slate-50 rounded-xl text-sm border border-transparent focus:bg-white focus:border-indigo-500 outline-none transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase flex gap-1"><MapPin size={12}/> Lokasi</label>
                  <input 
                    type="text" 
                    placeholder="Kamar / Toilet / Lorong"
                    value={formData.location}
                    onChange={(e) => setFormData({...formData, location: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 rounded-xl text-sm border border-transparent focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* 2. User & Kategori */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase flex gap-1"><User size={12}/> Nama Lansia</label>
                  <input 
                    type="text" 
                    placeholder="Contoh: Tanaka-san"
                    value={formData.userName}
                    onChange={(e) => setFormData({...formData, userName: e.target.value})}
                    className="w-full p-2.5 bg-slate-50 rounded-xl text-sm border border-transparent focus:bg-white focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                {/* 3. Analisa Penyebab */}
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 space-y-3">
                  <h3 className="text-xs font-bold text-indigo-800 flex items-center gap-1">
                    <Activity size={14}/> Analisa Penyebab Utama
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {['Faktor Lansia (Pengguna)', 'Faktor Lingkungan/Alat', 'Faktor Staf/Prosedur'].map((factor) => (
                      <label key={factor} className={`flex items-center gap-2 p-2 rounded-lg border cursor-pointer transition-all ${formData.rootCause === factor ? 'bg-white border-indigo-500 shadow-sm' : 'border-transparent hover:bg-white/50'}`}>
                        <input 
                          type="radio" 
                          name="cause" 
                          checked={formData.rootCause === factor}
                          onChange={() => setFormData({...formData, rootCause: factor})}
                          className="accent-indigo-600"
                        />
                        <span className="text-xs text-slate-700 font-medium">{factor}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 4. Cerita (Kronologi) */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase">Kronologi Kejadian (Indo)</label>
                  <textarea 
                    rows="3"
                    placeholder="Ceritakan urutan kejadiannya..."
                    value={formData.storyIndo}
                    onChange={(e) => setFormData({...formData, storyIndo: e.target.value})}
                    className="w-full p-3 bg-slate-50 rounded-xl text-sm border border-transparent focus:bg-white focus:border-indigo-500 outline-none"
                  ></textarea>
                </div>

                {/* 5. Tindakan Langsung */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase flex gap-1">
                    <Stethoscope size={12}/> Tindakan Saat Itu (Immediate Action)
                  </label>
                  <textarea 
                    rows="2"
                    placeholder="Apa yang langsung dilakukan? (Misal: Cek tensi, lapor leader, kompres es)"
                    value={formData.immediateAction}
                    onChange={(e) => setFormData({...formData, immediateAction: e.target.value})}
                    className="w-full p-3 bg-slate-50 rounded-xl text-sm border border-transparent focus:bg-white focus:border-indigo-500 outline-none"
                  ></textarea>
                </div>

                <button 
                  onClick={generateReport}
                  disabled={isLoading}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${
                    isLoading ? 'bg-slate-300 text-slate-500' : 'bg-slate-900 text-white shadow-xl shadow-slate-200 hover:bg-slate-800'
                  }`}
                >
                  {isLoading ? <RefreshCw className="animate-spin" size={20} /> : <Send size={20} />}
                  {isLoading ? "Sedang Menerjemahkan..." : "Buat Laporan Lengkap"}
                </button>
              </div>
            </div>

            {/* HASIL OUTPUT */}
            {jpOutput && (
              <div className="space-y-4 animate-in slide-in-from-bottom-6 pb-10">
                <div className="flex items-center justify-between px-2">
                  <h3 className="font-bold text-slate-700 text-xs uppercase flex items-center gap-2">
                    <ClipboardCheck className="text-green-600" size={16} /> Hasil Terjemahan
                  </h3>
                  <button 
                    onClick={() => copyToClipboard(jpOutput)}
                    className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded-full font-bold flex items-center gap-1 hover:bg-indigo-200"
                  >
                    {isCopied ? <Check size={14} /> : <Copy size={14} />}
                    {isCopied ? "Disalin" : "Salin"}
                  </button>
                </div>
                
                <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                  <pre className="text-sm text-slate-800 whitespace-pre-wrap font-mono leading-relaxed bg-slate-50 p-4 rounded-xl border border-dashed border-slate-300">
                    {jpOutput}
                  </pre>
                  <div className="mt-3 flex items-start gap-2 text-[10px] text-slate-500 bg-yellow-50 p-2 rounded-lg border border-yellow-100">
                    <Sparkles size={12} className="text-yellow-600 shrink-0 mt-0.5" />
                    <p>Hasil ini sudah memisahkan antara Penyebab, Tindakan Langsung, dan Pencegahan Masa Depan sesuai standar formulir Jepang.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* VIEW: HISTORY */}
        {view === 'history' && (
          <div className="space-y-4 animate-in slide-in-from-right duration-300">
             <div className="flex items-center justify-between">
                <button onClick={() => setView('home')} className="flex items-center gap-1 text-slate-500 text-sm font-medium">
                  <ArrowLeft size={16} /> Kembali
                </button>
                <span className="text-xs font-bold text-slate-400">{history.length} Arsip</span>
             </div>
             
             {history.length === 0 ? (
               <div className="text-center py-10">
                 <p className="text-slate-400 text-sm">Belum ada riwayat.</p>
               </div>
             ) : (
               history.map((item) => (
                 <div key={item.id} className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                         <span className={`w-2 h-2 rounded-full ${item.type === 'jiko' ? 'bg-red-500' : 'bg-amber-500'}`}></span>
                         <div>
                            <span className="font-bold text-slate-700 text-sm block">{item.user}</span>
                            <span className="text-[10px] text-slate-400 flex items-center gap-1"><CalendarDays size={10}/> {item.dateCreated}</span>
                         </div>
                      </div>
                      <button onClick={() => deleteHistoryItem(item.id)} className="text-slate-300 hover:text-red-500"><Trash2 size={16}/></button>
                    </div>
                    <pre className="text-xs text-slate-500 line-clamp-3 bg-slate-50 p-2 rounded">
                      {item.result}
                    </pre>
                    <button onClick={() => copyToClipboard(item.result)} className="w-full py-2 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg">
                      Salin Ulang
                    </button>
                 </div>
               ))
             )}
          </div>
        )}

      </main>
    </div>
  );
}
