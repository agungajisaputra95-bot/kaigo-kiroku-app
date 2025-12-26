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
  UserCheck
} from 'lucide-react';

const apiKey = ""; 

export default function App() {
  const [view, setView] = useState('home'); 
  const [reportType, setReportType] = useState('auto'); // hiyari | jiko | auto
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [jpOutput, setJpOutput] = useState("");
  const [history, setHistory] = useState([]);

  const [formData, setFormData] = useState({
    staffName: "", 
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().slice(0, 5),
    location: "",
    userName: "",
    category: "転倒 (Tentou)",
    rootCause: "利用者本人 (Lansia)", 
    storyIndo: "",
    immediateAction: "" 
  });

  const fetchWithRetry = async (url, options, retries = 5, backoff = 1000) => {
    try {
      const response = await fetch(url, options);
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (error) {
      if (retries <= 0) throw error;
      await new Promise(resolve => setTimeout(resolve, backoff));
      return fetchWithRetry(url, options, retries - 1, backoff * 2);
    }
  };

  const generateReport = async () => {
    if (!formData.storyIndo || !formData.userName || !formData.staffName) {
      alert("すべての必須項目を入力してください。 Mohon lengkapi Pelapor, Nama User, dan Kronologi.");
      return;
    }

    setIsLoading(true);
    setJpOutput("");

    const systemPrompt = `Anda adalah ahli administrasi perawat (Kaigo) di Jepang. 
    Tugas: Buat laporan formal yang sangat presisi dengan format 10 poin berikut.
    
    ATURAN FORMAT (TEKS MURNI):
    1. Gunakan Bahasa Jepang Bisnis (Keigo).
    2. JANGAN gunakan tanda bintang (*), pagar (#), atau Markdown.
    3. Gunakan istilah teknis: tentou, goyen, dousa, gaishou, dsb.
    4. Pastikan setiap label menggunakan titik dua Jepang "：" setelahnya.

    STRUKTUR OUTPUT WAJIB:
    報告者： (Isi Nama Pelapor)
    発生日時： (Isi Tanggal & Waktu)
    発生場所： (Isi Lokasi)
    対象者： (Isi Nama User 様)
    発生分類： (Isi Kategori Kejadian)
    発生内容： (Kronologi Terjemahan)
    対応内容： (Tindakan Terjemahan)
    原因分類： (Kategori Penyebab)
    原因内容： (Analisa Penyebab)
    予防対策： (Langkah Pencegahan)

    LOGIKA PENENTUAN JUDUL:
    - Judul paling atas harus berisi: 【事故報告書】 atau 【ヒヤリハット報告書】
    - Jika auto: ada luka/cedera = 事故, jika nyaris = ヒヤリ.

    DATA INPUT:
    - Pelapor: ${formData.staffName}
    - Tanggal: ${formData.date}
    - Waktu: ${formData.time}
    - Lokasi: ${formData.location}
    - Nama User: ${formData.userName}
    - Jenis: ${reportType}
    - Cerita Kejadian (Indo): "${formData.storyIndo}"
    - Tindakan (Indo): "${formData.immediateAction}"`;

    try {
      const data = await fetchWithRetry(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: systemPrompt }] }]
          })
        }
      );

      const result = data.candidates?.[0]?.content?.parts?.[0]?.text || "エラーが発生しました。";
      const cleanResult = result.replace(/[*#_]/g, "").trim();
      setJpOutput(cleanResult);

      let finalType = reportType;
      if (reportType === 'auto') {
        finalType = cleanResult.includes("事故報告") ? "jiko" : "hiyari";
      }

      const newRecord = {
        id: Date.now(),
        dateCreated: formData.date,
        type: finalType,
        user: formData.userName,
        category: formData.category,
        result: cleanResult
      };
      setHistory([newRecord, ...history]);
    } catch (error) {
      setJpOutput("AIとの接続に失敗しました。 Gagal menghubungkan ke AI.");
    } finally {
      setIsLoading(false);
    }
  };

  // Helper untuk merender teks dengan label tebal
  const renderFormattedResult = (text) => {
    return text.split('\n').map((line, index) => {
      // Mencari pola "Label："
      if (line.includes('：')) {
        const [label, content] = line.split('：');
        return (
          <div key={index} className="mb-2">
            <span className="font-black text-indigo-400 mr-1">{label}：</span>
            <span className="text-slate-100 font-medium">{content}</span>
          </div>
        );
      }
      // Untuk baris judul atau teks biasa
      return <div key={index} className="mb-2 font-black text-white text-center text-lg tracking-widest">{line}</div>;
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
    setTimeout(() => setIsCopied(false), 2000);
  };

  const deleteHistoryItem = (id) => {
    if(window.confirm("このレポートを削除しますか？ Hapus laporan ini?")) {
      setHistory(history.filter(item => item.id !== id));
    }
  };

  return (
    <div className="dark min-h-screen bg-[#020617] font-sans text-slate-100 flex flex-col">
      
      {/* Navbar */}
      <nav className="bg-[#0f172a] text-white p-4 sticky top-0 z-30 border-b border-slate-800 shadow-2xl">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div onClick={() => setView('home')} className="cursor-pointer flex items-center gap-3 active:scale-95 transition-all">
            <div className="bg-indigo-600 p-2 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Bookmark className="text-white" size={20} />
            </div>
            <div>
              <h1 className="font-black text-sm leading-tight tracking-wider uppercase text-left">介護記録サポート</h1>
              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">Kaigo Kiroku Support</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => setView('history')} className={`p-2.5 rounded-xl transition-all ${view === 'history' ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-800 text-slate-400 hover:text-white'}`}>
              <History size={20} />
            </button>
          </div>
        </div>
      </nav>

      <main className="max-w-md mx-auto p-5 pb-24 flex-grow w-full space-y-6">
        
        {view === 'home' && (
          <div className="space-y-10 animate-in fade-in duration-500 pt-6 text-center">
            <div className="bg-[#0f172a] p-10 rounded-[3.5rem] border border-slate-800 shadow-2xl relative overflow-hidden">
              <div className="bg-indigo-500/10 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 ring-8 ring-indigo-500/5">
                <Sparkles className="text-indigo-400" size={48} />
              </div>
              <h2 className="text-3xl font-black text-white tracking-tighter mb-3">レポート作成</h2>
              <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10 px-4">
                Tulis kronologi dalam Bahasa Indonesia, AI akan menyusun laporan secara rapi dan profesional.
              </p>
              <button onClick={() => {setView('write'); setJpOutput("");}} className="w-full py-5 bg-indigo-600 hover:bg-indigo-50 hover:text-indigo-900 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl active:scale-95 transition-all flex items-center justify-center gap-3">
                <PlusCircle size={22} /> 新規作成 (Buat Laporan)
              </button>
            </div>

            {history.length > 0 && (
              <div className="text-left space-y-4 pt-6 border-t border-slate-800">
                <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] ml-2">最近の履歴</h3>
                <div onClick={() => setView('history')} className="bg-[#0f172a] p-5 rounded-[2rem] border border-slate-800 flex items-center justify-between cursor-pointer hover:border-slate-700 transition-all active:scale-[0.98]">
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full shadow-lg ${history[0].type === 'jiko' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                      <div>
                        <p className="text-sm font-black text-white">{history[0].user}</p>
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{history[0].category}</p>
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
                    <select value={reportType} onChange={(e) => setReportType(e.target.value)} className={`w-full p-4 pl-12 pr-10 appearance-none bg-slate-800 text-white rounded-2xl text-sm border-2 font-bold outline-none transition-all ${reportType === 'jiko' ? 'border-red-500/30 focus:border-red-500' : reportType === 'hiyari' ? 'border-amber-500/30 focus:border-amber-500' : 'border-indigo-500/30 focus:border-indigo-500'}`}>
                      <option value="auto">✨ システムが判断 (Otomatis)</option>
                      <option value="hiyari">ヒヤリハット (Near-Miss)</option>
                      <option value="jiko">事故報告書 (Incident)</option>
                    </select>
                    <div className="absolute left-4 top-1/2 -translate-y-1/2">
                      {reportType === 'jiko' ? <ShieldAlert size={18} className="text-red-400" /> : reportType === 'hiyari' ? <AlertTriangle size={18} className="text-amber-400" /> : <Cpu size={18} className="text-indigo-400" />}
                    </div>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-800">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <LayoutGrid size={14}/> 基本情報 (Info Dasar)
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">報告者 (Nama Pelapor)</label>
                    <div className="relative">
                      <UserCheck size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="text" placeholder="例: アジ" value={formData.staffName} onChange={(e) => setFormData({...formData, staffName: e.target.value})} className="w-full p-4 pl-12 bg-slate-800 text-white rounded-2xl text-sm border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold" />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">発生日 (Tanggal)</label>
                      <input type="date" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value})} className="w-full p-4 bg-slate-800 text-white rounded-2xl text-xs border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">発生時間 (Waktu)</label>
                      <input type="time" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value})} className="w-full p-4 bg-slate-800 text-white rounded-2xl text-xs border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">場所 (Lokasi)</label>
                    <div className="relative">
                      <MapPin size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="text" placeholder="例: 居室 / トイレ" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} className="w-full p-4 pl-12 bg-slate-800 text-white rounded-2xl text-sm border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">対象者 (Nama User)</label>
                    <div className="relative">
                      <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                      <input type="text" placeholder="例: 田中様" value={formData.userName} onChange={(e) => setFormData({...formData, userName: e.target.value})} className="w-full p-4 pl-12 bg-slate-800 text-white rounded-2xl text-sm border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold" />
                    </div>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-800">
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity size={14}/> 状況分析 (Analisa)
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">発生状況 (Kronologi - Indo)</label>
                    <textarea rows="4" placeholder="Ceritakan urutan kejadiannya..." value={formData.storyIndo} onChange={(e) => setFormData({...formData, storyIndo: e.target.value})} className="w-full p-5 bg-slate-800 text-white rounded-[1.5rem] text-sm border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold"></textarea>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-tighter">直後の処置 (Penanganan - Indo)</label>
                    <textarea rows="3" placeholder="Apa tindakan yang diambil?" value={formData.immediateAction} onChange={(e) => setFormData({...formData, immediateAction: e.target.value})} className="w-full p-5 bg-slate-800 text-white rounded-[1.5rem] text-sm border border-slate-700 focus:border-indigo-500 outline-none transition-all font-bold"></textarea>
                  </div>
                </div>

                <button onClick={generateReport} disabled={isLoading} className={`w-full py-5 rounded-[2rem] font-black text-sm uppercase tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl ${isLoading ? 'bg-slate-700 text-slate-500' : 'bg-indigo-600 text-white hover:bg-indigo-500'}`}>
                  {isLoading ? <RefreshCw className="animate-spin" size={22} /> : <Send size={22} />}
                  {isLoading ? "AI分析中..." : "レポートを生成 (Buat Laporan)"}
                </button>
              </div>
            </div>

            {/* HASIL OUTPUT TERSTRUKTUR */}
            {jpOutput && (
              <div className="space-y-5 animate-in slide-in-from-bottom-6 duration-700 pb-12">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <ClipboardCheck size={16} /> 10項目報告書 (Format Kontras)
                  </h3>
                  <button onClick={() => copyToClipboard(jpOutput)} className="bg-slate-800 p-2.5 rounded-2xl shadow-lg border border-slate-700 flex items-center gap-2 transition-all hover:bg-slate-700 active:scale-90">
                    {isCopied ? <Check size={16} className="text-green-400" /> : <Copy size={16} className="text-slate-400" />}
                    <span className="text-[10px] font-black uppercase text-slate-300">{isCopied ? "コピー済み" : "コピー"}</span>
                  </button>
                </div>
                
                <div className="bg-[#0f172a] p-8 md:p-10 rounded-[3rem] border-2 border-slate-800 shadow-2xl relative overflow-hidden transition-all">
                  <div className="absolute top-0 right-0 p-10 opacity-[0.05] pointer-events-none text-white"><FileText size={180} /></div>
                  
                  {/* Container Hasil Terjemahan dengan Pembedaan Font */}
                  <div className="relative z-10 antialiased leading-relaxed text-sm md:text-base">
                    {renderFormattedResult(jpOutput)}
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-800">
                    <p className="text-[10px] text-slate-500 italic">
                      *Label dicetak tebal untuk memudahkan pemetaan data ke formulir kertas.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {view === 'history' && (
          <div className="space-y-8 animate-in slide-in-from-right duration-300">
             <div className="flex items-center justify-between">
                <button onClick={() => setView('home')} className="bg-slate-800 p-2.5 rounded-2xl text-slate-400 border border-slate-700 active:scale-95 transition-all"><ArrowLeft size={20} /></button>
                <h2 className="text-xl font-black text-white uppercase tracking-tight">レポート履歴</h2>
                <span className="text-[10px] font-black bg-indigo-600 text-white px-3 py-1 rounded-full">{history.length}</span>
             </div>
             <div className="space-y-4">
               {history.length === 0 ? (
                 <div className="text-center py-24 bg-[#0f172a] rounded-[3rem] border-4 border-dashed border-slate-800">
                   <History className="mx-auto text-slate-700 mb-4" size={64} />
                   <p className="text-slate-500 text-[11px] font-black uppercase tracking-widest">履歴がありません</p>
                 </div>
               ) : (
                 history.map((item) => (
                   <div key={item.id} className="bg-[#0f172a] rounded-[2.5rem] border border-slate-800 shadow-xl p-6 space-y-4 text-left">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-4">
                           <div className={`w-3.5 h-3.5 rounded-full shadow-lg ${item.type === 'jiko' ? 'bg-red-500' : 'bg-amber-500'}`}></div>
                           <div>
                              <span className="font-black text-white text-lg block leading-none mb-1">{item.user}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1 uppercase tracking-widest"><CalendarDays size={12}/> {item.dateCreated}</span>
                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.type === 'jiko' ? '事故報告書' : 'ヒヤリハット'}</span>
                              </div>
                           </div>
                        </div>
                        <button onClick={() => deleteHistoryItem(item.id)} className="text-slate-600 hover:text-red-500 p-2.5 transition-colors"><Trash2 size={20}/></button>
                      </div>
                      <div className="bg-slate-800/50 p-5 rounded-3xl text-[11px] text-slate-400 font-mono line-clamp-3 italic border border-slate-800">
                        {item.result}
                      </div>
                      <button onClick={() => copyToClipboard(item.result)} className="w-full py-4 text-[10px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 transition-all">コピーする (Salin)</button>
                   </div>
                 ))
               )}
             </div>
          </div>
        )}

        {view === 'legal' && (
          <div className="space-y-6 animate-in slide-in-from-bottom duration-300 pb-12 text-left">
            <button onClick={() => setView('home')} className="bg-slate-800 p-2.5 rounded-2xl text-slate-400 border border-slate-700 shadow-lg"><ArrowLeft size={20} /></button>
            <div className="space-y-6">
              <section className="bg-[#0f172a] p-10 rounded-[3rem] border border-slate-800 shadow-xl">
                <div className="flex items-center gap-4 mb-8 text-indigo-400">
                  <div className="bg-indigo-500/10 p-5 rounded-3xl ring-1 ring-indigo-500/20"><Lock size={32} /></div>
                  <div className="text-left"><h2 className="font-black text-2xl uppercase tracking-tighter">Privacy Policy</h2><p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">プライバシーポリシー / Kebijakan Privasi</p></div>
                </div>
                <div className="space-y-8 text-xs text-slate-400 leading-[2] font-medium">
                  <div><p className="font-black text-indigo-300 border-b border-slate-800 pb-2 uppercase tracking-widest mb-3">日本語</p><ul><li>入力情報はAIによって即座に処理されます。</li><li>氏名欄にはイニシャル等の使用を推奨します。</li></ul></div>
                  <div className="pt-6 border-t border-slate-800"><p className="font-black text-indigo-300 border-b border-slate-800 pb-2 uppercase tracking-widest mb-3">Bahasa Indonesia</p><ul><li>Data diproses secara langsung oleh AI.</li><li>Gunakan inisial nama lansia demi privasi.</li></ul></div>
                </div>
              </section>
            </div>
          </div>
        )}
      </main>

      <footer className="py-12 text-center space-y-6">
        <button onClick={() => setView('legal')} className="text-[10px] font-black text-slate-600 hover:text-indigo-400 uppercase tracking-[0.3em] transition-all">Policy & Disclaimer</button>
        <div className="inline-flex items-center gap-3 px-6 py-3 bg-[#0f172a] rounded-full border border-slate-800 shadow-xl shadow-black/50 mx-auto">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest">Created by aaji.s</p>
        </div>
      </footer>
    </div>
  );
}
