import React, { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import {
  Calendar, CheckCircle, Plus, X, MessageSquare, Layout, Filter, 
  FileText, Save, History, Construction, AlertTriangle, Building2, 
  UserCircle, DollarSign, Receipt, CreditCard, UploadCloud, FileSpreadsheet, Edit
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
// 🔄 資料轉換核心 (將工程資料偽裝存入飯店的舊資料表)
// ==========================================
const parseEngProject = (dbProj: any) => {
  let payments = [];
  let logs = [];
  try { payments = typeof dbProj.breakdown === 'string' ? JSON.parse(dbProj.breakdown) : (dbProj.breakdown || []); } catch(e){}
  try { logs = typeof dbProj.countersign === 'string' ? JSON.parse(dbProj.countersign) : (dbProj.countersign || []); } catch(e){}
  
  return {
    id: String(dbProj.id),
    name: dbProj.title || "",
    unit: dbProj.creator || "公司",
    vendor: dbProj.highlights || "",
    contact: dbProj.precautions || "",
    startDate: dbProj.startDate || "",
    endDate: dbProj.endDate || "",
    progress: Number(dbProj.content) || 0,
    status: dbProj.status || "規劃中",
    payments: Array.isArray(payments) ? payments : [],
    logs: Array.isArray(logs) ? logs : []
  };
};

const formatEngProjectForDb = (engProj: any) => {
  return {
    id: String(engProj.id),
    title: engProj.name,
    projectType: 'engineering',  // 隔離標籤
    creator: engProj.unit,
    highlights: engProj.vendor,
    precautions: engProj.contact,
    content: String(engProj.progress),
    startDate: engProj.startDate,
    endDate: engProj.endDate,
    status: engProj.status,
    breakdown: JSON.stringify(engProj.payments || []),
    countersign: JSON.stringify(engProj.logs || [])
  };
};

export default function EngineeringApp() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [filterUnit, setFilterUnit] = useState("all");
  
  // 視窗狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  
  // 右側頁籤狀態
  const [activeTab, setActiveTab] = useState<"progress" | "finance">("progress");

  // 表單狀態
  const todayStr = new Date().toISOString().split("T")[0];
  const [newLog, setNewLog] = useState({ date: todayStr, content: "", updateProgress: false, newProgress: 0, updateEndDate: false, newEndDate: "" });
  const [newPayment, setNewPayment] = useState({ title: "", amount: "" });

  // ==========================================
  // 🟢 從資料庫載入與儲存資料
  // ==========================================
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from("projects").select("*");
      if (data) {
        const engProjects = data.filter((p: any) => p.projectType === 'engineering').map(parseEngProject);
        setProjects(engProjects);
      }
    } catch (e) {
      console.error("資料載入失敗:", e);
    }
    setIsLoading(false);
  };

  const saveProjectToDb = async (proj: any) => {
    const dbPayload = formatEngProjectForDb(proj);
    const { error } = await supabase.from("projects").upsert(dbPayload);
    if (error) {
      alert(`連線存檔失敗：${error.message}`);
      return false;
    }
    fetchData(); 
    return true;
  };

  // ==========================================
  // 1️⃣ 排序與甘特圖計算
  // ==========================================
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

  // ==========================================
  // 2️⃣ 專案視窗操作
  // ==========================================
  const handleOpenEdit = (p: any) => {
    const target = { ...p, payments: p.payments || [], logs: p.logs || [] };
    setEditingProject(target);
    setActiveTab("progress");
    setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: target.progress || 0, updateEndDate: false, newEndDate: target.endDate || "" });
    setNewPayment({ title: "", amount: "" });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    const newProj = { 
      id: "eng_" + Date.now(), name: "", unit: "公司", vendor: "", contact: "", 
      startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-03-31`, 
      progress: 0, status: "規劃中", logs: [], payments: [] 
    };
    setEditingProject(newProj);
    setActiveTab("progress");
    setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: 0, updateEndDate: false, newEndDate: newProj.endDate });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingProject?.name) return alert("請輸入工程名稱！");
    if (!editingProject?.startDate || !editingProject?.endDate) return alert("請填寫完整日期！");
    
    let projToSave = { ...editingProject };
    if (projToSave.logs.length === 0) {
      projToSave.logs = [{ id: Date.now(), date: todayStr, content: "建立工程專案。", type: "info" }];
    }
    
    const success = await saveProjectToDb(projToSave);
    if (success) setIsModalOpen(false);
  };

  // ==========================================
  // 3️⃣ Excel 匯入解析
  // ==========================================
  const handleProcessImport = async () => {
    if (!importFile) return alert("請先選擇 Excel 檔案！");
    
    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      const extractedText = XLSX.utils.sheet_to_txt(sheet);

      if (!extractedText.trim()) return alert("檔案內無有效文字內容！");

      // 自動建立新專案並帶入 Excel 內容
      const newProj = { 
        id: "eng_" + Date.now(), 
        name: "【從 Excel 匯入】請修改名稱", 
        unit: "公司", vendor: "", contact: "", 
        startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-03-31`, 
        progress: 0, status: "規劃中", payments: [],
        logs: [{ 
          id: Date.now(), 
          date: todayStr, 
          content: "【系統匯入原始資料】\n" + extractedText, 
          type: "info" 
        }] 
      };
      
      setEditingProject(newProj);
      setActiveTab("progress");
      setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: 0, updateEndDate: false, newEndDate: newProj.endDate });
      
      setIsImportModalOpen(false);
      setImportFile(null);
      setIsModalOpen(true); 
      
    } catch (e) {
      alert("讀取 Excel 失敗，請確認檔案格式 (.xlsx 或 .csv)！");
    }
  };

  // ==========================================
  // 4️⃣ 進度日誌與財務操作
  // ==========================================
  const handleAddLog = async () => {
    if (!newLog.content.trim()) return alert("請輸入日誌內容");
    let updated = { ...editingProject };
    let logs = [...(updated.logs || [])];

    if (newLog.updateEndDate && newLog.newEndDate !== updated.endDate) {
      logs.unshift({ id: Date.now()+1, date: newLog.date, content: `【工期變更】完工日由 ${updated.endDate} 展延為 ${newLog.newEndDate}`, type: "date_change" });
      updated.endDate = newLog.newEndDate;
    }
    logs.unshift({ id: Date.now(), date: newLog.date, content: newLog.content, type: (newLog.updateProgress && newLog.newProgress === 100) ? "success" : "info" });
    
    if (newLog.updateProgress) { 
      updated.progress = Number(newLog.newProgress); 
      updated.status = updated.progress === 100 ? "已完工" : "進行中"; 
    }
    updated.logs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setEditingProject(updated);
    await saveProjectToDb(updated);
    setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: updated.progress, updateEndDate: false, newEndDate: updated.endDate });
  };

  const handleAddPayment = async () => {
    if (!newPayment.title || !newPayment.amount) return alert("請輸入請款項目與金額");
    let updated = { ...editingProject };
    const paymentRecord = { id: Date.now(), date: todayStr, title: newPayment.title, amount: newPayment.amount, status: "pending" };
    updated.payments = [paymentRecord, ...(updated.payments || [])];
    updated.logs = [
      { id: Date.now()+1, date: todayStr, content: `【請款送審】提出請款：${newPayment.title} ($${newPayment.amount})`, type: "payment_req" },
      ...(updated.logs || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setEditingProject(updated);
    await saveProjectToDb(updated);
    setNewPayment({ title: "", amount: "" });
  };

  const handleApprovePayment = async (payId: number) => {
    let updated = { ...editingProject };
    const payIndex = updated.payments.findIndex((p: any) => p.id === payId);
    if (payIndex > -1) {
      updated.payments[payIndex].status = "paid";
      updated.logs = [
        { id: Date.now(), date: todayStr, content: `【付款完成】已支付：${updated.payments[payIndex].title} ($${updated.payments[payIndex].amount})`, type: "payment_done" },
        ...(updated.logs || [])
      ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setEditingProject(updated);
      await saveProjectToDb(updated);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-indigo-600 font-bold">資料庫同步連線中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans">
      {/* ================= HEADER ================= */}
      <header className="bg-slate-800 shadow-md sticky top-0 z-20 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Construction className="w-7 h-7 text-amber-400" />
          <h1 className="font-black text-xl hidden md:block">工程專案系統</h1>
          <select className="bg-slate-700 border-none text-white font-bold rounded p-1.5 outline-none cursor-pointer" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y} 年度</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95">
            <UploadCloud className="w-4 h-4" /> <span className="hidden sm:inline">匯入 Excel</span>
          </button>
          <button onClick={handleOpenCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-all shadow-md active:scale-95">
            <Plus className="w-4 h-4" /> <span className="hidden sm:inline">新增專案</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* ================= 報表區塊 ================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-slate-500 text-sm font-bold mb-1">年度總專案</div>
            <div className="text-3xl font-black text-slate-800">{filteredList.length}</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-blue-500 text-sm font-bold mb-1">施工進行中</div>
            <div className="text-3xl font-black text-blue-600">{filteredList.filter(p => p.progress > 0 && p.progress < 100).length}</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/30">
            <div className="text-amber-600 text-sm font-bold mb-1 flex items-center gap-1"><Receipt size={16}/> 待核請款單</div>
            <div className="text-3xl font-black text-amber-700">{totalPendingPayments} <span className="text-sm font-bold text-amber-600/70">筆</span></div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-emerald-500 text-sm font-bold mb-1">已完工</div>
            <div className="text-3xl font-black text-emerald-600">{filteredList.filter(p => p.progress === 100).length}</div>
          </div>
        </div>

        {/* ================= 分類過濾器 ================= */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
          <span className="font-bold text-slate-600 text-sm flex items-center gap-1"><Filter size={16}/> 分類：</span>
          <button onClick={() => setFilterUnit("all")} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${filterUnit === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 hover:bg-slate-100'}`}>全部</button>
          {UNITS.map(u => (
            <button key={u} onClick={() => setFilterUnit(u)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${filterUnit === u ? 'ring-2 ring-offset-1 ring-slate-400 shadow-sm ' + UNIT_COLORS[u].bg + ' ' + UNIT_COLORS[u].text : 'bg-white text-slate-600'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${UNIT_COLORS[u].bar}`}></span> {u}
            </button>
          ))}
        </div>

        {/* ================= 年度甘特圖 ================= */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-slate-50 font-black text-slate-700 flex items-center gap-2"><Calendar size={20}/> {selectedYear} 年度工程甘特圖</div>
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="flex border-b bg-white font-bold text-xs text-slate-500 sticky top-0 z-10 shadow-sm">
                <div className="w-80 p-3 border-r bg-slate-50">工程項目 / 廠商資訊</div>
                <div className="flex-1 grid grid-cols-12 text-center">{[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <div key={m} className="p-2 border-r bg-slate-50 last:border-0">{m}月</div>)}</div>
              </div>
              <div className="relative bg-slate-50/50">
                <div className="absolute inset-0 flex ml-80 pointer-events-none">{[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <div key={`bg-${m}`} className="flex-1 border-r border-slate-200/50"></div>)}</div>
                
                <div className="relative z-10">
                  {filteredList.length === 0 && <div className="py-16 text-center text-slate-400 font-bold">該條件下目前無工程專案</div>}
                  {filteredList.map(p => {
                    const color = UNIT_COLORS[p.unit] || UNIT_COLORS["公司"];
                    const hasPendingPayment = (p.payments || []).some((pay: any) => pay.status === 'pending');
                    
                    return (
                      <div key={p.id} className="flex border-b border-slate-100 last:border-0 hover:bg-white cursor-pointer group transition-colors" onClick={() => handleOpenEdit(p)}>
                        <div className="w-80 p-3 border-r bg-white flex flex-col justify-center gap-1 group-hover:bg-slate-50 relative">
                          {hasPendingPayment && <span className="absolute top-3 right-3 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span></span>}
                          
                          <div className="font-bold text-sm text-slate-800 pr-4 truncate">{p.name}</div>
                          <div className="flex items-center gap-2 text-[10px]">
                            <span className={`px-1.5 py-0.5 rounded font-bold ${color.bg} ${color.text} border ${color.border}`}>{p.unit}</span>
                            <span className="text-slate-400 font-bold">{p.startDate?.substring(5).replace('-','/')} ~ {p.endDate?.substring(5).replace('-','/')}</span>
                          </div>
                          {(p.vendor || p.contact) && <div className="text-[10px] text-slate-500 flex gap-2 truncate mt-1">
                            {p.vendor && <span className="flex items-center gap-0.5"><Building2 size={10}/>{p.vendor}</span>}
                            {p.contact && <span className="flex items-center gap-0.5"><UserCircle size={10}/>{p.contact}</span>}
                          </div>}
                        </div>
                        <div className="flex-1 relative py-4">
                          <div className={`absolute top-1/2 -translate-y-1/2 h-7 rounded shadow-sm border border-black/10 flex items-center overflow-hidden transition-all group-hover:shadow-md ${color.bar}`} style={getBarStyles(p.startDate, p.endDate)}>
                            <div className="absolute left-0 h-full bg-white/25" style={{ width: `${p.progress}%` }}></div>
                            <span className="relative z-10 px-2 text-[10px] font-black text-white drop-shadow-sm">{p.progress}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ================================================== */}
      {/* 📥 匯入 Excel Modal */}
      {/* ================================================== */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><UploadCloud className="text-indigo-500" /> 匯入 Excel 資料</h2>
              <button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white border rounded p-1"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 font-medium">請上傳 Excel (.xlsx, .csv) 檔案。系統會自動建立一個新專案，並將表格內容匯入至「進度日誌」供您參考設定。</p>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors cursor-pointer relative">
                <input type="file" accept=".xlsx, .xls, .csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
                <FileSpreadsheet className={`w-12 h-12 mx-auto mb-3 ${importFile ? 'text-indigo-500' : 'text-slate-400'}`} />
                <span className="font-bold text-sm text-slate-700">{importFile ? `已選擇：${importFile.name}` : "點擊或拖曳 Excel 檔案至此"}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3">
              <button onClick={() => setIsImportModalOpen(false)} className="px-5 py-2 text-slate-600 bg-white border rounded-lg font-bold text-sm shadow-sm hover:bg-slate-50">取消</button>
              <button onClick={handleProcessImport} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-md flex items-center gap-2">開始解析建立</button>
            </div>
          </div>
        </div>
      )}

      {/* ================================================== */}
      {/* 💥 專案管理 Modal */}
      {/* ================================================== */}
      {isModalOpen && editingProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center shadow-sm z-10">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><FileText className="text-slate-500" /> {String(editingProject.id).startsWith('eng_') ? "新增工程專案" : editingProject.name}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white border rounded p-1"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col lg:flex-row gap-6">
              
              {/* ⬅️ 左側：基本資訊 */}
              <div className="flex-1 space-y-5 bg-white p-6 rounded-xl border border-slate-200 h-fit shadow-sm">
                <h3 className="font-black text-slate-800 border-b pb-3 flex items-center gap-2"><Layout className="text-indigo-500" size={18}/> 工程基本設定</h3>
                <div><label className="block text-xs font-bold text-slate-500 mb-1">工程名稱 <span className="text-red-500">*</span></label><input className="w-full border rounded-lg p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-slate-50" value={editingProject.name} onChange={e => setEditingProject({...editingProject, name: e.target.value})} placeholder="例如：主體結構" /></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1">分類</label><select className="w-full border rounded-lg p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-slate-50" value={editingProject.unit} onChange={e => setEditingProject({...editingProject, unit: e.target.value})}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">總體進度</label>
                    <div className="font-black text-2xl text-indigo-600">{editingProject.progress}<span className="text-sm text-slate-400">%</span></div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1">負責廠商 (選填)</label><input className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500" value={editingProject.vendor} onChange={e => setEditingProject({...editingProject, vendor: e.target.value})} placeholder="廠商名稱" /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1">聯繫人員 (選填)</label><input className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500" value={editingProject.contact} onChange={e => setEditingProject({...editingProject, contact: e.target.value})} placeholder="聯絡人與電話" /></div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-bold text-slate-500 mb-1">預計開工 <span className="text-red-500">*</span></label><input type="date" className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500" value={editingProject.startDate} onChange={e => setEditingProject({...editingProject, startDate: e.target.value})} /></div>
                  <div><label className="block text-xs font-bold text-slate-500 mb-1">預計完工 <span className="text-red-500">*</span></label><input type="date" className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500" value={editingProject.endDate} onChange={e => setEditingProject({...editingProject, endDate: e.target.value})} /></div>
                </div>
                <button onClick={handleSave} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 shadow-md flex items-center justify-center gap-2 transition-colors"><Save size={18}/> 儲存專案設定</button>
              </div>

              {/* ➡️ 右側：雙頁籤功能區 (進度 / 財務) */}
              <div className="flex-[1.5] flex flex-col h-full">
                
                <div className="flex gap-2 mb-4 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm w-fit">
                   <button onClick={() => setActiveTab('progress')} className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'progress' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      <History size={16}/> 施工進度與日誌
                   </button>
                   <button onClick={() => setActiveTab('finance')} className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'finance' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      <DollarSign size={16}/> 財務請款單
                      {editingProject.payments?.some((p:any)=>p.status==='pending') && <span className="w-2 h-2 rounded-full bg-amber-500 ml-1"></span>}
                   </button>
                </div>

                {activeTab === 'progress' && (
                  <div className="flex flex-col gap-6 flex-1">
                    <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden shrink-0">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                      <h3 className="font-black text-indigo-900 mb-3 flex items-center gap-2"><Edit size={18}/> 新增進度日誌</h3>
                      <div className="space-y-3">
                        <div className="flex items-center gap-3"><input type="date" className="border rounded p-1.5 text-sm font-bold outline-none" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} /></div>
                        <textarea rows={2} className="w-full border rounded-lg p-2 text-sm bg-slate-50 outline-none focus:border-indigo-500 resize-none" placeholder="發生了什麼事？進度到哪了？" value={newLog.content} onChange={e => setNewLog({...newLog, content: e.target.value})} />
                        <div className="grid grid-cols-2 gap-3">
                          <div className="bg-slate-50 p-3 rounded-lg border">
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-600 mb-2"><input type="checkbox" className="w-3.5 h-3.5" checked={newLog.updateProgress} onChange={e => setNewLog({...newLog, updateProgress: e.target.checked})} /> 同步更新進度</label>
                            {newLog.updateProgress && <div className="flex items-center gap-2"><input type="range" className="flex-1" value={newLog.newProgress} onChange={e => setNewLog({...newLog, newProgress: Number(e.target.value)})} /><span className="font-black text-indigo-600 w-8 text-right">{newLog.newProgress}%</span></div>}
                          </div>
                          <div className={`p-3 rounded-lg border ${newLog.updateEndDate ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                            <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-600 mb-2"><input type="checkbox" className="w-3.5 h-3.5" checked={newLog.updateEndDate} onChange={e => setNewLog({...newLog, updateEndDate: e.target.checked})} /> 展延完工日</label>
                            {newLog.updateEndDate && <input type="date" className="w-full border rounded p-1 text-sm font-bold text-red-600 outline-none" value={newLog.newEndDate} onChange={e => setNewLog({...newLog, newEndDate: e.target.value})} />}
                          </div>
                        </div>
                        <button onClick={handleAddLog} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 shadow-sm text-sm">送出進度 (寫入資料庫)</button>
                      </div>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 overflow-y-auto">
                      <h3 className="font-black text-slate-800 mb-5 text-sm border-b pb-2">工程歷程紀錄</h3>
                      <div className="border-l-2 border-slate-100 ml-2 pl-5 space-y-5">
                        {(editingProject.logs || []).length === 0 && <div className="text-slate-400 text-xs py-4">尚無紀錄</div>}
                        {(editingProject.logs || []).map((log: any) => (
                          <div key={log.id} className="relative">
                            <div className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm 
                              ${log.type === 'success' ? 'bg-emerald-500' : 
                                log.type === 'date_change' ? 'bg-red-500' : 
                                log.type === 'payment_req' ? 'bg-amber-400' : 
                                log.type === 'payment_done' ? 'bg-green-500' : 'bg-indigo-500'}`}>
                            </div>
                            <div className="text-[10px] font-black text-slate-400 mb-1 flex items-center gap-2">
                              {log.date} 
                              {log.type === 'date_change' && <span className="text-red-500">● 工期展延</span>}
                              {log.type === 'payment_req' && <span className="text-amber-500">● 財務送審</span>}
                              {log.type === 'payment_done' && <span className="text-emerald-500">● 付款結清</span>}
                            </div>
                            <div className={`text-sm p-3 rounded-lg border shadow-sm leading-relaxed whitespace-pre-wrap
                              ${log.type === 'date_change' ? 'bg-red-50 border-red-200 text-red-900 font-bold' : 
                                log.type === 'payment_req' ? 'bg-amber-50 border-amber-200 text-amber-900 font-bold' : 
                                log.type === 'payment_done' ? 'bg-emerald-50 border-emerald-200 text-emerald-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-700'}`
                            }>
                              {log.content}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'finance' && (
                  <div className="flex flex-col gap-6 flex-1">
                    <div className="bg-white p-5 rounded-xl border border-amber-200 shadow-sm relative overflow-hidden shrink-0">
                       <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-500"></div>
                       <h3 className="font-black text-amber-900 mb-3 flex items-center gap-2"><CreditCard size={18}/> 申請工程款 / 墊付款</h3>
                       <div className="flex flex-col sm:flex-row gap-3">
                          <div className="flex-1">
                             <label className="text-[10px] font-bold text-slate-400 mb-1 block">請款名目</label>
                             <input type="text" className="w-full border rounded p-2 text-sm font-bold bg-slate-50 outline-none focus:border-amber-500" value={newPayment.title} onChange={e => setNewPayment({...newPayment, title: e.target.value})} placeholder="如：第一期訂金、材料墊付" />
                          </div>
                          <div className="w-full sm:w-40">
                             <label className="text-[10px] font-bold text-slate-400 mb-1 block">申請金額</label>
                             <div className="relative">
                               <span className="absolute left-2 top-2 font-bold text-slate-400">$</span>
                               <input type="text" className="w-full border rounded p-2 pl-6 text-sm font-bold bg-slate-50 outline-none focus:border-amber-500" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} placeholder="50,000" />
                             </div>
                          </div>
                       </div>
                       <button onClick={handleAddPayment} className="w-full mt-3 bg-amber-500 text-amber-950 font-black py-2.5 rounded-lg hover:bg-amber-600 shadow-sm text-sm flex justify-center items-center gap-2">
                         <Plus size={16}/> 送出請款申請 (寫入資料庫)
                       </button>
                    </div>

                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 overflow-y-auto">
                       <h3 className="font-black text-slate-800 mb-4 text-sm border-b pb-2">本專案請款單列表</h3>
                       {(!editingProject.payments || editingProject.payments.length === 0) ? (
                         <div className="text-center py-10 text-slate-400 font-bold bg-slate-50 rounded-lg border-dashed border">目前尚無請款紀錄</div>
                       ) : (
                         <div className="space-y-3">
                           {editingProject.payments.map((pay: any) => (
                             <div key={pay.id} className={`flex items-center justify-between p-3 rounded-lg border ${pay.status === 'pending' ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                                <div>
                                   <div className="font-bold text-sm text-slate-800">{pay.title}</div>
                                   <div className="text-[10px] text-slate-500 mt-1">申請日: {pay.date}</div>
                                </div>
                                <div className="flex items-center gap-4">
                                   <div className="font-black text-lg text-slate-700">${pay.amount}</div>
                                   {pay.status === 'pending' ? (
                                      <button onClick={() => handleApprovePayment(pay.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded shadow-sm">
                                         核准付款
                                      </button>
                                   ) : (
                                      <span className="bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1">
                                         <CheckCircle size={12}/> 已付清
                                      </span>
                                   )}
                                </div>
                             </div>
                           ))}
                         </div>
                       )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
