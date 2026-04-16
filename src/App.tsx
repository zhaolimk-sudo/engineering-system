import React, { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import {
  Calendar, CheckCircle, Plus, X, MessageSquare, Layout, Filter, 
  FileText, Save, History, Construction, AlertTriangle, Building2, 
  UserCircle, DollarSign, Receipt, CreditCard, UploadCloud, 
  FileSpreadsheet, Edit, Trash2, ChevronRight, ChevronDown, Layers, Printer
} from "lucide-react";

// ==========================================
// 🔴 Supabase 連線資訊
// ==========================================
const SUPABASE_URL = "https://mksmrupvgkehvfadynee.supabase.co";
const SUPABASE_KEY = "sb_publishable_0WCOlZOefS12mmupLA5YFg_fPv_8Xn8";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================================
// 🎨 分類與顏色設定 
// ==========================================
const UNITS = ["公司", "建築師", "縣府", "代書"];
const UNIT_COLORS: Record<string, { bg: string, text: string, bar: string, border: string }> = {
  "公司": { bg: "bg-cyan-50", text: "text-cyan-700", bar: "bg-cyan-500", border: "border-cyan-200" },
  "建築師": { bg: "bg-blue-50", text: "text-blue-700", bar: "bg-blue-500", border: "border-blue-200" },
  "縣府": { bg: "bg-red-50", text: "text-red-700", bar: "bg-red-500", border: "border-red-200" },
  "代書": { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", border: "border-emerald-200" }
};

// ==========================================
// ⚙️ 自動進度計算核心
// ==========================================
const calculateAutoProgressValue = (start: string, end: string) => {
  if (!start || !end) return 0;
  const today = new Date().getTime();
  const s = new Date(start).getTime();
  const e = new Date(end).getTime();
  if (today < s) return 0;
  if (today > e) return 100;
  const total = e - s;
  const current = today - s;
  return Math.round((current / total) * 100);
};

// ==========================================
// 🔄 資料轉換核心
// ==========================================
const parseEngProject = (dbProj: any) => {
  let payments = [], logs = [], phases = [];
  try { payments = typeof dbProj.breakdown === 'string' ? JSON.parse(dbProj.breakdown) : (dbProj.breakdown || []); } catch(e){}
  try { logs = typeof dbProj.countersign === 'string' ? JSON.parse(dbProj.countersign) : (dbProj.countersign || []); } catch(e){}
  try { phases = typeof dbProj.purpose === 'string' ? JSON.parse(dbProj.purpose) : (dbProj.purpose || []); } catch(e){}
  
  return {
    id: String(dbProj.id),
    name: dbProj.title || "",
    unit: dbProj.creator || "公司",
    vendor: dbProj.highlights || "",
    contact: dbProj.precautions || "",
    startDate: dbProj.startDate || "",
    endDate: dbProj.endDate || "",
    progress: Number(dbProj.content) || 0,
    isManualProgress: dbProj.feedback === "manual", // 使用 feedback 欄位儲存是否為手動調整
    status: dbProj.status || "規劃中",
    phases: Array.isArray(phases) ? phases : [],
    payments: Array.isArray(payments) ? payments : [],
    logs: Array.isArray(logs) ? logs : []
  };
};

const formatEngProjectForDb = (engProj: any) => {
  return {
    id: String(engProj.id),
    title: engProj.name,
    projectType: 'engineering',
    creator: engProj.unit,
    highlights: engProj.vendor,
    precautions: engProj.contact,
    content: String(engProj.progress),
    feedback: engProj.isManualProgress ? "manual" : "auto", 
    startDate: engProj.startDate,
    endDate: engProj.endDate,
    status: engProj.status,
    breakdown: JSON.stringify(engProj.payments || []),
    countersign: JSON.stringify(engProj.logs || []),
    purpose: JSON.stringify(engProj.phases || [])
  };
};

export default function EngineeringApp() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [filterUnit, setFilterUnit] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"progress" | "finance">("progress");

  const todayStr = new Date().toISOString().split("T")[0];
  const [newLog, setNewLog] = useState({ date: todayStr, content: "", updateProgress: false, newProgress: 0, updateEndDate: false, newEndDate: "" });
  const [newPayment, setNewPayment] = useState({ date: todayStr, title: "", amount: "" });

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from("projects").select("*");
      if (data) {
        let engProjects = data.filter((p: any) => p.projectType === 'engineering').map(parseEngProject);
        
        // 🌟 自動進度進展邏輯
        engProjects = engProjects.map(p => {
          if (!p.isManualProgress && p.startDate && p.endDate) {
             const autoProg = calculateAutoProgressValue(p.startDate, p.endDate);
             if (autoProg !== p.progress) {
                return { ...p, progress: autoProg };
             }
          }
          return p;
        });
        setProjects(engProjects);
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const saveProjectToDb = async (proj: any) => {
    const dbPayload = formatEngProjectForDb(proj);
    const { error } = await supabase.from("projects").upsert(dbPayload);
    if (error) { alert(`存檔失敗：${error.message}`); return false; }
    fetchData(); 
    return true;
  };

  const filteredList = useMemo(() => {
    return projects
      .filter(p => (p.startDate?.startsWith(String(selectedYear)) || p.endDate?.startsWith(String(selectedYear))) && (filterUnit === "all" || p.unit === filterUnit))
      .sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());
  }, [projects, selectedYear, filterUnit]);

  const totalPendingPayments = useMemo(() => {
    return filteredList.reduce((total, p) => total + (p.payments?.filter((pay: any) => pay.status === "pending").length || 0), 0);
  }, [filteredList]);

  const getBarStyles = (start: string, end: string) => {
    try {
      const yearStart = new Date(`${selectedYear}-01-01`).getTime();
      const yearEnd = new Date(`${selectedYear}-12-31`).getTime();
      const s = Math.max(yearStart, new Date(start || 0).getTime());
      const e = Math.min(yearEnd, new Date(end || 0).getTime());
      let left = ((s - yearStart) / (yearEnd - yearStart)) * 100;
      let width = ((e - s) / (yearEnd - yearStart)) * 100;
      return { left: `${Math.max(0, left)}%`, width: `${Math.max(1, width)}%` };
    } catch (e) { return { left: '0%', width: '0%' }; }
  };

  const handleExportPrint = () => {
    setTimeout(() => { window.print(); }, 500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans">
      
      {/* 🌟 列印專用樣式 */}
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0.5cm; }
          body { background: white !important; }
          .no-print, header, .dashboard, .filters { display: none !important; }
          .print-area { width: 100% !important; overflow: visible !important; }
          .min-w-[1000px] { min-width: 100% !important; }
          .w-[380px] { width: 250px !important; font-size: 10px !important; }
          .sticky { position: static !important; }
          .rounded-xl { border-radius: 0 !important; border: 1px solid #eee !important; }
          .bar-label { font-size: 8px !important; }
        }
        /* 🌟 表頭固定 CSS */
        .sticky-month-row {
          position: sticky;
          top: 64px; /* 對齊 header 高度 */
          z-index: 30;
          background: #f8fafc;
        }
      `}</style>

      {/* HEADER */}
      <header className="bg-slate-800 shadow-md sticky top-0 z-40 text-white p-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-3">
          <Construction className="w-7 h-7 text-amber-400" />
          <h1 className="font-black text-xl hidden md:block">工程進度系統</h1>
          <select className="bg-slate-700 border-none text-white font-bold rounded p-1.5 outline-none cursor-pointer" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y} 年度</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={handleExportPrint} className="bg-white/10 hover:bg-white/20 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 border border-white/20 transition-all">
            <Printer size={16}/> 匯出報表 (A4橫)
          </button>
          <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2">
            <UploadCloud size={16}/> 匯入
          </button>
          <button onClick={() => { setEditingProject({ id: "eng_" + Date.now(), name: "", unit: "公司", vendor: "", contact: "", startDate: todayStr, endDate: todayStr, progress: 0, status: "規劃中", phases: [], logs: [], payments: [] }); setIsModalOpen(true); }} className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-all">
            <Plus size={16}/> 新增專案
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6 print-area">
        
        {/* DASHBOARD */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 dashboard no-print">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-slate-500 text-xs font-bold mb-1">年度總專案</div>
            <div className="text-3xl font-black">{filteredList.length}</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-blue-500 text-xs font-bold mb-1">施工中</div>
            <div className="text-3xl font-black text-blue-600">{filteredList.filter(p => p.progress > 0 && p.progress < 100).length}</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/30">
            <div className="text-amber-600 text-xs font-bold mb-1 flex items-center gap-1"><Receipt size={14}/> 待核請款</div>
            <div className="text-3xl font-black text-amber-700">{totalPendingPayments} <span className="text-sm">筆</span></div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-emerald-500 text-xs font-bold mb-1">已完工</div>
            <div className="text-3xl font-black text-emerald-600">{filteredList.filter(p => p.progress === 100).length}</div>
          </div>
        </div>

        {/* FILTERS */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center no-print">
          <span className="font-bold text-slate-600 text-sm">分類篩選：</span>
          <button onClick={() => setFilterUnit("all")} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${filterUnit === 'all' ? 'bg-slate-800 text-white' : 'bg-white'}`}>全部</button>
          {UNITS.map(u => (
            <button key={u} onClick={() => setFilterUnit(u)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${filterUnit === u ? 'ring-2 ring-offset-1 ring-slate-400 shadow-sm ' + UNIT_COLORS[u].bg + ' ' + UNIT_COLORS[u].text : 'bg-white text-slate-600'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${UNIT_COLORS[u].bar}`}></span> {u}
            </button>
          ))}
        </div>

        {/* 🌟 甘特圖主體 */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* 🌟 表頭固定月份列 */}
              <div className="flex border-b bg-slate-50 font-bold text-[10px] text-slate-500 sticky-month-row">
                <div className="w-[380px] p-3 border-r flex items-center justify-between">
                   <span>工程項目 / 廠商</span>
                   <span className="text-[9px] text-slate-400">依日期排序</span>
                </div>
                <div className="flex-1 grid grid-cols-12 text-center">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <div key={m} className="p-3 border-r last:border-0">{m}月</div>)}
                </div>
              </div>
              
              <div className="relative bg-slate-50/20">
                <div className="absolute inset-0 flex ml-[380px] pointer-events-none">
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <div key={`bg-${m}`} className="flex-1 border-r border-slate-100"></div>)}
                </div>
                
                <div className="relative z-10">
                  {filteredList.map(p => {
                    const color = UNIT_COLORS[p.unit] || UNIT_COLORS["公司"];
                    const isExpanded = expandedProjects.has(p.id);
                    return (
                      <React.Fragment key={p.id}>
                        <div className="flex border-b border-slate-100 hover:bg-white group transition-colors">
                          <div className="w-[380px] p-3 border-r bg-white flex items-center gap-2 group-hover:bg-slate-50 relative cursor-pointer" onClick={() => (p.phases?.length > 0 ? setExpandedProjects(prev => {const next = new Set(prev); if(next.has(p.id)) next.delete(p.id); else next.add(p.id); return next;}) : handleOpenEdit(p))}>
                            {p.phases?.length > 0 ? (isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>) : <div className="w-3.5"></div>}
                            <div className="flex-1 flex flex-col justify-center min-w-0">
                              <div className="font-bold text-xs text-slate-800 truncate">{p.name}</div>
                              <div className="flex items-center gap-2 text-[9px] mt-0.5">
                                <span className={`px-1 rounded font-bold border ${color.bg} ${color.text} ${color.border}`}>{p.unit}</span>
                                <span className="text-slate-400 font-bold">{p.startDate?.substring(5)} ~ {p.endDate?.substring(5)}</span>
                                {!p.isManualProgress && <span className="text-[8px] bg-indigo-50 text-indigo-500 px-1 rounded border border-indigo-100">自動推算</span>}
                              </div>
                            </div>
                            <button onClick={(e) => { e.stopPropagation(); if(window.confirm('刪除專案？')) supabase.from('projects').delete().eq('id', p.id).then(()=>fetchData()); }} className="no-print opacity-0 group-hover:opacity-100 p-1 hover:text-red-500"><Trash2 size={14}/></button>
                          </div>
                          
                          <div className="flex-1 relative py-4 cursor-pointer" onClick={() => handleOpenEdit(p)}>
                            <div className={`absolute top-1/2 -translate-y-1/2 h-5 rounded shadow-sm flex items-center overflow-hidden transition-all ${color.bar}`} style={getBarStyles(p.startDate, p.endDate)}>
                              <div className="absolute left-0 h-full bg-white/30" style={{ width: `${p.progress}%` }}></div>
                              <span className="relative z-10 px-2 text-[9px] font-black text-white bar-label">{p.progress}%</span>
                            </div>
                          </div>
                        </div>

                        {/* 展開階段 */}
                        {isExpanded && p.phases.map((ph:any) => (
                          <div key={ph.id} className="flex border-b border-slate-50 bg-slate-50/30">
                            <div className="w-[380px] p-2 pl-10 border-r text-[10px] font-medium text-slate-500 truncate">└ {ph.name}</div>
                            <div className="flex-1 relative py-3">
                              <div className={`absolute top-1/2 -translate-y-1/2 h-2 rounded-full opacity-40 ${color.bar}`} style={getBarStyles(ph.startDate, ph.endDate)}></div>
                            </div>
                          </div>
                        ))}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 💥 專案管理視窗 💥 */}
      {isModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="font-black text-slate-800">工程詳情與財務設定</h2>
              <button onClick={() => setIsModalOpen(false)} className="p-1 hover:bg-slate-200 rounded"><X size={20}/></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col lg:flex-row gap-6">
              {/* 左側：設定 */}
              <div className="flex-1 space-y-4 bg-white p-6 rounded-xl shadow-sm h-fit">
                <h3 className="font-black text-sm border-b pb-2 flex items-center gap-2"><Layout size={16}/> 基礎資料</h3>
                <div><label className="text-[10px] font-bold text-slate-400">專案名稱</label><input className="w-full border rounded p-2 text-sm font-bold bg-slate-50" value={editingProject.name} onChange={e=>setEditingProject({...editingProject, name: e.target.value})} /></div>
                <div className="grid grid-cols-2 gap-4">
                   <div><label className="text-[10px] font-bold text-slate-400">開工日期</label><input type="date" className="w-full border rounded p-2 text-sm font-bold bg-slate-50" value={editingProject.startDate} onChange={e=>setEditingProject({...editingProject, startDate: e.target.value})} /></div>
                   <div><label className="text-[10px] font-bold text-slate-400">預計完工</label><input type="date" className="w-full border rounded p-2 text-sm font-bold bg-slate-50" value={editingProject.endDate} onChange={e=>setEditingProject({...editingProject, endDate: e.target.value})} /></div>
                </div>
                
                <div>
                   <label className="flex justify-between items-center mb-1">
                      <span className="text-[10px] font-bold text-slate-400">當前進度</span>
                      <span className="text-xs font-black text-indigo-600">{editingProject.progress}%</span>
                   </label>
                   <input type="range" className="w-full accent-indigo-600" value={editingProject.progress} onChange={e => setEditingProject({...editingProject, progress: Number(e.target.value), isManualProgress: true})} />
                   {editingProject.isManualProgress ? (
                      <button onClick={() => setEditingProject({...editingProject, isManualProgress: false})} className="text-[10px] text-indigo-500 font-bold underline mt-1">恢復系統自動推算</button>
                   ) : (
                      <div className="text-[9px] text-slate-400 mt-1 italic">✨ 目前依日期比例自動計算進度</div>
                   )}
                </div>

                <div className="pt-4 border-t">
                   <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-bold text-slate-600">工程階段</span>
                      <button onClick={() => setEditingProject({...editingProject, phases: [...(editingProject.phases||[]), {id:Date.now(), name:'新階段', startDate:todayStr, endDate:todayStr, progress:0}]})} className="text-[10px] bg-slate-100 px-2 py-1 rounded font-bold">+ 增加階段</button>
                   </div>
                   <div className="space-y-2">
                      {(editingProject.phases||[]).map((ph:any, idx:number) => (
                         <div key={ph.id} className="text-[10px] bg-slate-50 p-2 rounded border flex flex-col gap-1">
                            <input className="font-bold border-none bg-transparent" value={ph.name} onChange={e=>{const n=[...editingProject.phases]; n[idx].name=e.target.value; setEditingProject({...editingProject, phases:n});}} />
                            <div className="flex gap-2">
                               <input type="date" className="bg-transparent border-none" value={ph.startDate} onChange={e=>{const n=[...editingProject.phases]; n[idx].startDate=e.target.value; setEditingProject({...editingProject, phases:n});}} />
                               <span>-</span>
                               <input type="date" className="bg-transparent border-none" value={ph.endDate} onChange={e=>{const n=[...editingProject.phases]; n[idx].endDate=e.target.value; setEditingProject({...editingProject, phases:n});}} />
                            </div>
                         </div>
                      ))}
                   </div>
                </div>

                <button onClick={() => saveProjectToDb(editingProject).then(s=>s&&setIsModalOpen(false))} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold mt-4 shadow-lg hover:bg-slate-900 transition-all flex items-center justify-center gap-2"><Save size={18}/> 儲存專案</button>
              </div>

              {/* 右側：日誌與財務 */}
              <div className="flex-[1.5] flex flex-col gap-4">
                 <div className="flex gap-2 p-1 bg-white rounded-lg border w-fit">
                    <button onClick={()=>setActiveTab('progress')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTab==='progress'?'bg-slate-800 text-white':'text-slate-500'}`}>日誌回報</button>
                    <button onClick={()=>setActiveTab('finance')} className={`px-4 py-1.5 rounded text-xs font-bold transition-all ${activeTab==='finance'?'bg-slate-800 text-white':'text-slate-500'}`}>財務請款</button>
                 </div>
                 
                 {activeTab === 'progress' ? (
                    <div className="bg-white p-6 rounded-xl border flex-1 overflow-y-auto">
                       <h3 className="font-bold text-sm mb-4">施工日誌紀錄</h3>
                       <div className="space-y-4">
                          <textarea className="w-full border rounded p-3 text-sm bg-slate-50 outline-none" rows={3} placeholder="輸入今日進展..." value={newLog.content} onChange={e=>setNewLog({...newLog, content:e.target.value})} />
                          <button onClick={()=>{
                             const updated = {...editingProject};
                             updated.logs = [{id:Date.now(), date:todayStr, content:newLog.content, type:'info'}, ...(updated.logs||[])];
                             setEditingProject(updated);
                             saveProjectToDb(updated);
                             setNewLog({...newLog, content:''});
                          }} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-xs">送出紀錄</button>
                          
                          <div className="border-t pt-4 space-y-4">
                             {(editingProject.logs||[]).map((l:any) => (
                                <div key={l.id} className="border-l-2 border-indigo-200 pl-4 py-1">
                                   <div className="text-[10px] font-bold text-slate-400">{l.date}</div>
                                   <div className="text-sm text-slate-700">{l.content}</div>
                                </div>
                             ))}
                          </div>
                       </div>
                    </div>
                 ) : (
                    <div className="bg-white p-6 rounded-xl border flex-1 overflow-y-auto">
                       <h3 className="font-bold text-sm mb-4">財務請款清單</h3>
                       <div className="grid grid-cols-3 gap-2 mb-4">
                          <input type="date" className="border rounded p-2 text-xs" value={newPayment.date} onChange={e=>setNewPayment({...newPayment, date:e.target.value})} />
                          <input className="border rounded p-2 text-xs" placeholder="款項項目" value={newPayment.title} onChange={e=>setNewPayment({...newPayment, title:e.target.value})} />
                          <input className="border rounded p-2 text-xs" placeholder="金額" value={newPayment.amount} onChange={e=>setNewPayment({...newPayment, amount:e.target.value})} />
                       </div>
                       <button onClick={()=>{
                          const updated = {...editingProject};
                          updated.payments = [{id:Date.now(), ...newPayment, status:'pending'}, ...(updated.payments||[])];
                          setEditingProject(updated);
                          saveProjectToDb(updated);
                          setNewPayment({date:todayStr, title:'', amount:''});
                       }} className="w-full bg-amber-500 text-white font-bold py-2 rounded-lg text-xs mb-6">+ 新增請款單</button>
                       
                       <div className="space-y-2">
                          {(editingProject.payments||[]).map((p:any) => (
                             <div key={p.id} className="flex justify-between items-center p-3 border rounded bg-slate-50">
                                <div><div className="font-bold text-xs">{p.title}</div><div className="text-[10px] text-slate-400">{p.date}</div></div>
                                <div className="flex items-center gap-3">
                                   <span className="font-black text-sm">${p.amount}</span>
                                   {p.status==='pending' ? (
                                      <button onClick={()=>{
                                         const n = {...editingProject};
                                         n.payments = n.payments.map((x:any)=>x.id===p.id?{...x, status:'paid'}:x);
                                         setEditingProject(n); saveProjectToDb(n);
                                      }} className="bg-emerald-500 text-white px-3 py-1 rounded text-[10px] font-bold">核准</button>
                                   ) : <span className="text-emerald-500 font-bold text-[10px]">已支付</span>}
                                   <button onClick={()=>{
                                      const n = {...editingProject};
                                      n.payments = n.payments.filter((x:any)=>x.id!==p.id);
                                      setEditingProject(n); saveProjectToDb(n);
                                   }} className="text-slate-300 hover:text-red-500"><Trash2 size={14}/></button>
                                </div>
                             </div>
                          ))}
                       </div>
                    </div>
                 )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📥 匯入 Excel Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden p-6">
            <h2 className="font-black mb-4">匯入工程資料</h2>
            <input type="file" accept=".xlsx,.xls,.csv" onChange={e=>setImportFile(e.target.files?.[0]||null)} className="mb-4 w-full" />
            <div className="flex justify-end gap-2">
               <button onClick={()=>setIsImportModalOpen(false)} className="px-4 py-2 border rounded">取消</button>
               <button onClick={()=>{
                  if(!importFile) return;
                  const reader = new FileReader();
                  reader.onload = (e) => {
                     const data = new Uint8Array(e.target?.result as any);
                     const workbook = XLSX.read(data, {type:'array'});
                     const txt = XLSX.utils.sheet_to_txt(workbook.Sheets[workbook.SheetNames[0]]);
                     const newProj = { id: "eng_" + Date.now(), name: "匯入專案", unit: "公司", startDate: todayStr, endDate: todayStr, progress: 0, status: "規劃中", logs: [{id:Date.now(), date:todayStr, content:txt, type:'info'}], payments: [] };
                     setEditingProject(newProj);
                     setIsModalOpen(true);
                     setIsImportModalOpen(false);
                  };
                  reader.readAsArrayBuffer(importFile);
               }} className="px-4 py-2 bg-indigo-600 text-white rounded">解析並匯入</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
