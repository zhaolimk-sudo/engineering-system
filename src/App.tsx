import React, { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import {
  Calendar, CheckCircle, Plus, X, MessageSquare, Layout, Filter, 
  FileText, Save, History, Construction, AlertTriangle, Building2, 
  UserCircle, DollarSign, Receipt, CreditCard, UploadCloud, 
  FileSpreadsheet, Edit, Trash2, ChevronRight, ChevronDown, Layers
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
// 📦 初始模擬資料 (匯入您的 31 項工程清單)
// ==========================================
const RAW_PROJECT_NAMES = [
  "興辦計畫溝通修正", "建築師法規溝通", "室內技師圖面溝通", "設計師補充討論", "機電師準備", 
  "消防技師準備", "樣品屋居室水與電", "樣品屋浴室泥作", "樣品屋前庭走道區", "樣品屋前庭植栽區", 
  "樣品屋後院植栽區", "樣品屋居室大軟裝", "樣品屋居室小軟裝", "樣品屋浴室衛浴設備", "樣品屋浴室水五金", 
  "外圍冷水配管(往Villa)", "外圍冷水配管(往露營區)", "汙水系統", "熱泵系統建置(含地基)", "水池安全維護", 
  "中央水道局部戲水區導入", "中央廣場淨空處理", "中央廣場大門處理", "兆麗館一樓賣場", "兆麗館二樓餐區", 
  "兆麗館三樓餐區", "兆麗館一樓烘焙坊", "兆麗館其他區域", "體驗館整理", "停車場整理", "園區植栽分區整理"
];

const INITIAL_DATA = RAW_PROJECT_NAMES.map((name, index) => {
  const isArchitect = name.includes("建築師") || name.includes("法規") || name.includes("興辦");
  const unit = isArchitect ? "建築師" : "公司";
  // 建立基礎階段範例
  const phases = [
    { id: `ph_${index}_1`, name: "前期規劃", startDate: "2026-01-16", endDate: "2026-02-15", progress: index < 5 ? 100 : 20 },
    { id: `ph_${index}_2`, name: "執行階段", startDate: "2026-02-16", endDate: "2026-04-30", progress: index < 5 ? 50 : 0 }
  ];
  return {
    id: `eng_init_${index}`,
    name,
    unit,
    vendor: "",
    contact: "",
    startDate: "2026-01-16",
    endDate: "2026-04-30",
    progress: index < 5 ? 75 : 10,
    status: index < 5 ? "進行中" : "規劃中",
    phases,
    payments: [],
    logs: [{ id: Date.now() + index, date: "2026-01-15", content: "系統預設載入工程清單。", type: "info" }]
  };
});

// ==========================================
// 🔄 資料轉換核心 (防呆處理)
// ==========================================
const parseEngProject = (dbProj: any) => {
  let payments = [], logs = [], phases = [];
  try { payments = typeof dbProj.breakdown === 'string' ? JSON.parse(dbProj.breakdown) : (dbProj.breakdown || []); } catch(e){}
  try { logs = typeof dbProj.countersign === 'string' ? JSON.parse(dbProj.countersign) : (dbProj.countersign || []); } catch(e){}
  try { phases = typeof dbProj.purpose === 'string' ? JSON.parse(dbProj.purpose) : (dbProj.purpose || []); } catch(e){} // 隱藏寫入 purpose
  
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
    startDate: engProj.startDate,
    endDate: engProj.endDate,
    status: engProj.status,
    breakdown: JSON.stringify(engProj.payments || []),
    countersign: JSON.stringify(engProj.logs || []),
    purpose: JSON.stringify(engProj.phases || []) // 儲存多階段陣列
  };
};

// ==========================================
// 📊 動態計算專案總起訖與進度
// ==========================================
const calculateProjectStats = (phases: any[], fallbackStart: string, fallbackEnd: string, fallbackProg: number) => {
  if (!phases || phases.length === 0) return { startDate: fallbackStart, endDate: fallbackEnd, progress: fallbackProg };
  
  const validPhases = phases.filter(ph => ph.startDate && ph.endDate);
  if (validPhases.length === 0) return { startDate: fallbackStart, endDate: fallbackEnd, progress: fallbackProg };

  let minStart = validPhases[0].startDate;
  let maxEnd = validPhases[0].endDate;
  let totalProg = 0;

  validPhases.forEach(ph => {
    if (new Date(ph.startDate) < new Date(minStart)) minStart = ph.startDate;
    if (new Date(ph.endDate) > new Date(maxEnd)) maxEnd = ph.endDate;
    totalProg += Number(ph.progress) || 0;
  });

  return {
    startDate: minStart,
    endDate: maxEnd,
    progress: Math.round(totalProg / validPhases.length)
  };
};

export default function EngineeringApp() {
  const [projects, setProjects] = useState<any[]>(INITIAL_DATA);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [filterUnit, setFilterUnit] = useState("all");
  
  // 視窗狀態
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  
  // 展開的專案 ID (用於摺疊甘特圖)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());

  // 頁籤狀態
  const [activeTab, setActiveTab] = useState<"progress" | "finance">("progress");

  const todayStr = new Date().toISOString().split("T")[0];
  const [newLog, setNewLog] = useState({ date: todayStr, content: "", updateProgress: false, newProgress: 0, updateEndDate: false, newEndDate: "" });
  const [newPayment, setNewPayment] = useState({ date: todayStr, title: "", amount: "" });

  // ==========================================
  // 🟢 資料庫載入與儲存
  // ==========================================
  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data } = await supabase.from("projects").select("*");
      if (data && data.length > 0) {
        const engProjects = data.filter((p: any) => p.projectType === 'engineering').map(parseEngProject);
        if (engProjects.length > 0) {
          setProjects(engProjects);
        }
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const saveProjectToDb = async (proj: any) => {
    // 儲存前，根據階段重新計算一次總進度
    const stats = calculateProjectStats(proj.phases, proj.startDate, proj.endDate, proj.progress);
    proj.startDate = stats.startDate;
    proj.endDate = stats.endDate;
    proj.progress = stats.progress;
    proj.status = proj.progress === 100 ? "已完工" : proj.progress > 0 ? "進行中" : "規劃中";

    const dbPayload = formatEngProjectForDb(proj);
    const { error } = await supabase.from("projects").upsert(dbPayload);
    if (error) { alert(`存檔失敗：${error.message}`); return false; }
    fetchData(); 
    return true;
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (window.confirm(`⚠️ 確定要刪除整個專案「${name}」嗎？\n刪除後資料將無法恢復。`)) {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) alert("刪除失敗：" + error.message);
      else { setIsModalOpen(false); fetchData(); }
    }
  };

  // ==========================================
  // 🔄 分類切換 (點擊甘特圖左側標籤直接切換)
  // ==========================================
  const cycleUnitCategory = async (projectId: string, currentUnit: string) => {
    const currentIndex = UNITS.indexOf(currentUnit);
    const nextIndex = (currentIndex + 1) % UNITS.length;
    const nextUnit = UNITS[nextIndex];

    const updatedProjects = projects.map(p => p.id === projectId ? { ...p, unit: nextUnit } : p);
    setProjects(updatedProjects);
    
    // 背景儲存
    const targetProj = updatedProjects.find(p => p.id === projectId);
    if (targetProj) saveProjectToDb(targetProj);
  };

  // ==========================================
  // 1️⃣ 排序與甘特圖
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

  const toggleProjectExpand = (id: string) => {
    const newSet = new Set(expandedProjects);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setExpandedProjects(newSet);
  };

  // ==========================================
  // 2️⃣ 專案視窗與階段編輯
  // ==========================================
  const handleOpenEdit = (p: any) => {
    const target = { ...p, payments: p.payments || [], logs: p.logs || [], phases: p.phases || [] };
    setEditingProject(target);
    setActiveTab("progress");
    setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: target.progress || 0, updateEndDate: false, newEndDate: target.endDate || "" });
    setNewPayment({ date: todayStr, title: "", amount: "" });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    const newProj = { 
      id: "eng_" + Date.now(), name: "", unit: "公司", vendor: "", contact: "", 
      startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-03-31`, 
      progress: 0, status: "規劃中", phases: [], logs: [], payments: [] 
    };
    setEditingProject(newProj);
    setActiveTab("progress");
    setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: 0, updateEndDate: false, newEndDate: newProj.endDate });
    setNewPayment({ date: todayStr, title: "", amount: "" });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingProject?.name) return alert("請輸入工程名稱！");
    let projToSave = { ...editingProject };
    if (projToSave.logs.length === 0) projToSave.logs = [{ id: Date.now(), date: todayStr, content: "建立工程專案。", type: "info" }];
    const success = await saveProjectToDb(projToSave);
    if (success) setIsModalOpen(false);
  };

  // --- 階段 (Phases) 操作 ---
  const handleAddPhase = () => {
    const newPhases = [...(editingProject.phases || [])];
    newPhases.push({ id: `ph_${Date.now()}`, name: "新階段", startDate: todayStr, endDate: todayStr, progress: 0 });
    setEditingProject({ ...editingProject, phases: newPhases });
  };
  
  const handleRemovePhase = (idx: number) => {
    const newPhases = [...(editingProject.phases || [])];
    newPhases.splice(idx, 1);
    setEditingProject({ ...editingProject, phases: newPhases });
  };

  const handlePhaseChange = (idx: number, field: string, value: any) => {
    const newPhases = [...(editingProject.phases || [])];
    newPhases[idx][field] = value;
    
    // 即時計算預覽
    const stats = calculateProjectStats(newPhases, editingProject.startDate, editingProject.endDate, editingProject.progress);
    setEditingProject({ 
      ...editingProject, 
      phases: newPhases,
      startDate: stats.startDate,
      endDate: stats.endDate,
      progress: stats.progress
    });
  };

  // ==========================================
  // 3️⃣ Excel 匯入
  // ==========================================
  const handleProcessImport = async () => {
    if (!importFile) return alert("請先選擇 Excel 檔案！");
    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const extractedText = XLSX.utils.sheet_to_txt(workbook.Sheets[workbook.SheetNames[0]]);
      if (!extractedText.trim()) return alert("檔案內無內容！");
      
      const newProj = { 
        id: "eng_" + Date.now(), name: "【從 Excel 匯入】", 
        unit: "公司", vendor: "", contact: "", 
        startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-03-31`, 
        progress: 0, status: "規劃中", phases: [], payments: [],
        logs: [{ id: Date.now(), date: todayStr, content: "【系統匯入原始資料】\n" + extractedText, type: "info" }] 
      };
      setEditingProject(newProj);
      setActiveTab("progress");
      setIsImportModalOpen(false);
      setImportFile(null);
      setIsModalOpen(true); 
    } catch (e) { alert("讀取失敗！"); }
  };

  // ==========================================
  // 4️⃣ 進度日誌與財務操作
  // ==========================================
  const handleAddLog = async () => {
    if (!newLog.content.trim()) return alert("請輸入內容");
    let updated = { ...editingProject };
    let logs = [...(updated.logs || [])];
    if (newLog.updateEndDate && newLog.newEndDate !== updated.endDate) {
      logs.unshift({ id: Date.now()+1, date: newLog.date, content: `【工期展延】完工日由 ${updated.endDate} 延至 ${newLog.newEndDate}`, type: "date_change" });
      updated.endDate = newLog.newEndDate;
    }
    logs.unshift({ id: Date.now(), date: newLog.date, content: newLog.content, type: (newLog.updateProgress && newLog.newProgress === 100) ? "success" : "info" });
    if (newLog.updateProgress) { updated.progress = Number(newLog.newProgress); }
    updated.logs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEditingProject(updated);
    await saveProjectToDb(updated);
    setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: updated.progress, updateEndDate: false, newEndDate: updated.endDate });
  };

  const handleAddPayment = async () => {
    if (!newPayment.date || !newPayment.title || !newPayment.amount) return alert("請輸入完整請款資訊");
    let updated = { ...editingProject };
    const paymentRecord = { id: Date.now(), date: newPayment.date, title: newPayment.title, amount: newPayment.amount, status: "pending" };
    updated.payments = [paymentRecord, ...(updated.payments || [])];
    updated.logs = [
      { id: Date.now()+1, date: newPayment.date, content: `【請款送審】提出請款：${newPayment.title} ($${newPayment.amount})`, type: "payment_req" },
      ...(updated.logs || [])
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEditingProject(updated);
    await saveProjectToDb(updated);
    setNewPayment({ date: todayStr, title: "", amount: "" });
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

  const handleDeletePayment = async (payId: number, payTitle: string) => {
    if (!window.confirm(`確定要刪除請款單「${payTitle}」嗎？`)) return;
    let updated = { ...editingProject };
    updated.payments = updated.payments.filter((p: any) => p.id !== payId);
    updated.logs = [
      { id: Date.now(), date: todayStr, content: `【撤銷請款】刪除錯誤單據：${payTitle}`, type: "date_change" },
      ...(updated.logs || [])
    ].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEditingProject(updated);
    await saveProjectToDb(updated);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-indigo-600 font-bold">資料庫連線中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12 font-sans">
      {/* HEADER */}
      <header className="bg-slate-800 shadow-md sticky top-0 z-20 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Construction className="w-7 h-7 text-amber-400" />
          <h1 className="font-black text-xl hidden md:block">工程專案系統</h1>
          <select className="bg-slate-700 border-none text-white font-bold rounded p-1.5 outline-none cursor-pointer" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y} 年度</option>)}
          </select>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-600 hover:bg-slate-500 text-white px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all shadow-md active:scale-95"><UploadCloud size={16}/> 匯入 Excel</button>
          <button onClick={handleOpenCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-all shadow-md active:scale-95"><Plus size={16}/> 新增專案</button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        {/* 報表 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-slate-500 text-sm font-bold mb-1">年度總專案</div>
            <div className="text-3xl font-black text-slate-800">{filteredList.length}</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-blue-500 text-sm font-bold mb-1">施工中</div>
            <div className="text-3xl font-black text-blue-600">{filteredList.filter(p => p.progress > 0 && p.progress < 100).length}</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/30">
            <div className="text-amber-600 text-sm font-bold mb-1 flex items-center gap-1"><Receipt size={16}/> 待核請款</div>
            <div className="text-3xl font-black text-amber-700">{totalPendingPayments} <span className="text-sm font-bold text-amber-600/70">筆</span></div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-emerald-500 text-sm font-bold mb-1">已完工</div>
            <div className="text-3xl font-black text-emerald-600">{filteredList.filter(p => p.progress === 100).length}</div>
          </div>
        </div>

        {/* 分類篩選器 */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
          <span className="font-bold text-slate-600 text-sm flex items-center gap-1"><Filter size={16}/> 分類：</span>
          <button onClick={() => setFilterUnit("all")} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-colors ${filterUnit === 'all' ? 'bg-slate-800 text-white shadow-md' : 'bg-white text-slate-600'}`}>全部</button>
          {UNITS.map(u => (
            <button key={u} onClick={() => setFilterUnit(u)} className={`px-4 py-1.5 rounded-full text-xs font-bold border transition-all flex items-center gap-1.5 ${filterUnit === u ? 'ring-2 ring-offset-1 ring-slate-400 shadow-sm ' + UNIT_COLORS[u].bg + ' ' + UNIT_COLORS[u].text : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <span className={`w-2.5 h-2.5 rounded-full ${UNIT_COLORS[u].bar}`}></span> {u}
            </button>
          ))}
        </div>

        {/* 🌟 摺疊式甘特圖 */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b bg-slate-50 font-black text-slate-700 flex items-center gap-2"><Calendar size={20}/> {selectedYear} 年度工程進度總覽</div>
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* 表頭 */}
              <div className="flex border-b bg-white font-bold text-xs text-slate-500 sticky top-0 z-10 shadow-sm">
                <div className="w-[380px] p-3 border-r bg-slate-50">工程項目 / 階段 / 廠商資訊</div>
                <div className="flex-1 grid grid-cols-12 text-center">{[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <div key={m} className="p-2 border-r bg-slate-50 last:border-0">{m}月</div>)}</div>
              </div>
              
              <div className="relative bg-slate-50/50">
                {/* 垂直格線 */}
                <div className="absolute inset-0 flex ml-[380px] pointer-events-none">{[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <div key={`bg-${m}`} className="flex-1 border-r border-slate-200/50"></div>)}</div>
                
                <div className="relative z-10">
                  {filteredList.length === 0 && <div className="py-16 text-center text-slate-400 font-bold">該條件下目前無工程專案</div>}
                  {filteredList.map(p => {
                    const color = UNIT_COLORS[p.unit] || UNIT_COLORS["公司"];
                    const hasPendingPayment = (p.payments || []).some((pay: any) => pay.status === 'pending');
                    const hasPhases = p.phases && p.phases.length > 0;
                    const isExpanded = expandedProjects.has(p.id);
                    
                    return (
                      <React.Fragment key={p.id}>
                        {/* 專案主列 */}
                        <div className="flex border-b border-slate-200 last:border-0 hover:bg-white cursor-pointer group transition-colors">
                          <div className="w-[380px] p-3 border-r bg-white flex items-center gap-2 group-hover:bg-slate-50 relative">
                            {/* 摺疊箭頭 */}
                            {hasPhases ? (
                               <button onClick={(e) => { e.stopPropagation(); toggleProjectExpand(p.id); }} className="p-1 hover:bg-slate-200 rounded text-slate-500 transition-transform">
                                 {isExpanded ? <ChevronDown size={18}/> : <ChevronRight size={18}/>}
                               </button>
                            ) : <div className="w-7"></div>}

                            <div className="flex-1 flex flex-col justify-center gap-1" onClick={() => handleOpenEdit(p)}>
                              {hasPendingPayment && <span className="absolute top-3 right-3 flex h-2.5 w-2.5"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-500"></span></span>}
                              
                              <div className="font-bold text-sm text-slate-800 pr-8 truncate flex items-center gap-2">
                                {p.name}
                              </div>
                              
                              <div className="flex items-center gap-2 text-[10px]">
                                {/* 🌟 點擊分類標籤直接切換 */}
                                <span 
                                  onClick={(e) => { e.stopPropagation(); cycleUnitCategory(p.id, p.unit); }}
                                  className={`px-1.5 py-0.5 rounded font-bold cursor-pointer hover:ring-2 ring-slate-400 transition-all ${color.bg} ${color.text} border ${color.border}`}
                                  title="點擊可切換分類"
                                >
                                  {p.unit} ⟳
                                </span>
                                <span className="text-slate-400 font-bold">{p.startDate?.substring(5).replace('-','/')} ~ {p.endDate?.substring(5).replace('-','/')}</span>
                              </div>
                              
                              {(p.vendor || p.contact) && <div className="text-[10px] text-slate-500 flex gap-2 truncate mt-0.5">
                                {p.vendor && <span className="flex items-center gap-0.5"><Building2 size={10}/>{p.vendor}</span>}
                                {p.contact && <span className="flex items-center gap-0.5"><UserCircle size={10}/>{p.contact}</span>}
                              </div>}
                            </div>

                            <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id, p.name); }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-2 transition-all"><Trash2 size={16}/></button>
                          </div>
                          
                          <div className="flex-1 relative py-4" onClick={() => handleOpenEdit(p)}>
                            <div className={`absolute top-1/2 -translate-y-1/2 h-6 rounded shadow-sm border border-black/10 flex items-center overflow-hidden transition-all group-hover:shadow-md ${color.bar}`} style={getBarStyles(p.startDate, p.endDate)}>
                              <div className="absolute left-0 h-full bg-white/25" style={{ width: `${p.progress}%` }}></div>
                              <span className="relative z-10 px-2 text-[10px] font-black text-white drop-shadow-sm">{p.progress}%</span>
                            </div>
                          </div>
                        </div>

                        {/* 🌟 展開的子階段列 */}
                        {isExpanded && hasPhases && p.phases.map((phase: any, phIdx: number) => (
                           <div key={phase.id} className="flex border-b border-slate-100 bg-slate-50/80 hover:bg-slate-100 transition-colors">
                              <div className="w-[380px] p-2 pl-12 border-r flex items-center gap-2">
                                <Layers size={14} className="text-slate-400"/>
                                <span className="text-xs font-bold text-slate-600 flex-1 truncate">{phase.name}</span>
                                <span className="text-[10px] font-bold text-slate-400">{phase.startDate?.substring(5).replace('-','/')} ~ {phase.endDate?.substring(5).replace('-','/')}</span>
                              </div>
                              <div className="flex-1 relative py-2" onClick={() => handleOpenEdit(p)}>
                                <div className={`absolute top-1/2 -translate-y-1/2 h-4 rounded opacity-70 flex items-center overflow-hidden ${color.bar}`} style={getBarStyles(phase.startDate, phase.endDate)}>
                                  <div className="absolute left-0 h-full bg-white/30" style={{ width: `${phase.progress}%` }}></div>
                                  <span className="relative z-10 px-1 text-[9px] font-bold text-white drop-shadow-sm">{phase.progress}%</span>
                                </div>
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

      {/* 📥 匯入 Excel Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center"><h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><UploadCloud size={20} className="text-indigo-500"/> 匯入 Excel 資料</h2><button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white border rounded p-1"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors relative cursor-pointer">
                <input type="file" accept=".xlsx, .xls, .csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
                <FileSpreadsheet className={`w-12 h-12 mx-auto mb-3 ${importFile ? 'text-indigo-500' : 'text-slate-400'}`} />
                <span className="font-bold text-sm text-slate-700">{importFile ? importFile.name : "點擊上傳 Excel 檔案"}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3"><button onClick={() => setIsImportModalOpen(false)} className="px-5 py-2 font-bold text-sm bg-white border rounded-lg">取消</button><button onClick={handleProcessImport} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-md">解析並建立</button></div>
          </div>
        </div>
      )}

      {/* 💥 專案管理 Modal */}
      {isModalOpen && editingProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200">
            
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center shadow-sm z-10">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><FileText size={20} className="text-slate-500"/> {String(editingProject.id).startsWith('eng_') ? "新增工程專案" : "工程詳細資料"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white border rounded p-1"><X size={20} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col lg:flex-row gap-6">
              
              {/* ⬅️ 左側：基本設定與階段管理 */}
              <div className="flex-1 space-y-5 bg-white p-6 rounded-xl border border-slate-200 h-fit shadow-sm">
                <h3 className="font-black text-slate-800 border-b pb-3 flex items-center gap-2 text-sm"><Layout size={18} className="text-indigo-500"/> 基本設定</h3>
                <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">工程名稱 <span className="text-red-500">*</span></label><input className="w-full border rounded-lg p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-slate-50" value={editingProject.name} onChange={e => setEditingProject({...editingProject, name: e.target.value})} /></div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">分類標籤</label><select className="w-full border rounded-lg p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-slate-50" value={editingProject.unit} onChange={e => setEditingProject({...editingProject, unit: e.target.value})}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">總體進度</label>
                    <div className="font-black text-2xl text-indigo-600">{editingProject.progress}%</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">負責廠商 (選填)</label><input className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500" value={editingProject.vendor} onChange={e => setEditingProject({...editingProject, vendor: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">聯繫人員 (選填)</label><input className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500" value={editingProject.contact} onChange={e => setEditingProject({...editingProject, contact: e.target.value})} /></div>
                </div>

                {/* 🌟 階段管理區塊 */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Layers size={14}/> 工程階段管理</label>
                    <button onClick={handleAddPhase} className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1"><Plus size={12}/> 新增階段</button>
                  </div>
                  
                  {(!editingProject.phases || editingProject.phases.length === 0) ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">預計開工 <span className="text-red-500">*</span></label><input type="date" className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500" value={editingProject.startDate} onChange={e => setEditingProject({...editingProject, startDate: e.target.value})} /></div>
                      <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">預計完工 <span className="text-red-500">*</span></label><input type="date" className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500" value={editingProject.endDate} onChange={e => setEditingProject({...editingProject, endDate: e.target.value})} /></div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {editingProject.phases.map((phase: any, idx: number) => (
                        <div key={phase.id} className="bg-slate-50 p-2 rounded-lg border border-slate-200 flex flex-wrap items-center gap-2">
                          <input className="flex-1 min-w-[100px] text-xs font-bold p-1.5 border rounded outline-none" value={phase.name} onChange={(e) => handlePhaseChange(idx, 'name', e.target.value)} placeholder="階段名稱"/>
                          <input type="date" className="w-[100px] text-xs font-bold p-1.5 border rounded outline-none" value={phase.startDate} onChange={(e) => handlePhaseChange(idx, 'startDate', e.target.value)} />
                          <span className="text-slate-400 text-xs">-</span>
                          <input type="date" className="w-[100px] text-xs font-bold p-1.5 border rounded outline-none" value={phase.endDate} onChange={(e) => handlePhaseChange(idx, 'endDate', e.target.value)} />
                          <div className="w-[60px] flex items-center gap-1 bg-white border rounded px-1"><input type="number" className="w-full text-xs font-bold p-1 outline-none text-right" value={phase.progress} onChange={(e) => handlePhaseChange(idx, 'progress', e.target.value)} /><span className="text-[10px] text-slate-400 font-bold">%</span></div>
                          <button onClick={() => handleRemovePhase(idx)} className="p-1.5 text-slate-400 hover:text-red-500 bg-white rounded border"><Trash2 size={14}/></button>
                        </div>
                      ))}
                      <div className="text-[10px] font-bold text-indigo-500 bg-indigo-50 p-2 rounded border border-indigo-100 flex items-center gap-1">
                        <AlertTriangle size={12}/> 當啟用階段管理時，專案的「總起訖日期」與「總進度」將由系統自動計算。
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-4 border-t mt-4">
                  <button onClick={handleSave} className="flex-1 bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 shadow-md flex items-center justify-center gap-2"><Save size={18}/> 儲存專案設定</button>
                  {!String(editingProject.id).startsWith('eng_') && (
                    <button onClick={() => handleDeleteProject(editingProject.id, editingProject.name)} className="bg-red-50 text-red-600 px-4 py-3 rounded-xl hover:bg-red-100 transition-colors border border-red-100"><Trash2 size={20}/></button>
                  )}
                </div>
              </div>

              {/* ➡️ 右側：雙頁籤 */}
              <div className="flex-[1.5] flex flex-col h-full">
                <div className="flex gap-2 mb-4 bg-white p-1.5 rounded-lg border border-slate-200 shadow-sm w-fit">
                   <button onClick={() => setActiveTab('progress')} className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'progress' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><History size={16}/> 進度日誌</button>
                   <button onClick={() => setActiveTab('finance')} className={`px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 transition-all ${activeTab === 'finance' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      <DollarSign size={16}/> 財務請款
                      {editingProject.payments?.some((p:any)=>p.status==='pending') && <span className="w-2 h-2 rounded-full bg-amber-500 ml-1"></span>}
                   </button>
                </div>

                {activeTab === 'progress' && (
                  <div className="flex flex-col gap-6 flex-1">
                    <div className="bg-white p-5 rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden shrink-0">
                      <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                      <h3 className="font-black text-indigo-900 mb-3 flex items-center gap-2 text-sm"><Edit size={18}/> 新增施工進度</h3>
                      <div className="space-y-3">
                        <input type="date" className="border rounded p-1.5 text-sm font-bold outline-none" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} />
                        <textarea rows={2} className="w-full border rounded-lg p-2 text-sm bg-slate-50 outline-none focus:border-indigo-500 resize-none" placeholder="輸入今日施工重點或異常狀況..." value={newLog.content} onChange={e => setNewLog({...newLog, content: e.target.value})} />
                        
                        {/* 若有啟用 phases，提示進度從左側調整，關閉此處的快速調整 */}
                        {(!editingProject.phases || editingProject.phases.length === 0) ? (
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-slate-50 p-3 rounded-lg border">
                              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-600 mb-2"><input type="checkbox" checked={newLog.updateProgress} onChange={e => setNewLog({...newLog, updateProgress: e.target.checked})} /> 同步更新進度</label>
                              {newLog.updateProgress && <div className="flex items-center gap-2"><input type="range" className="flex-1" value={newLog.newProgress} onChange={e => setNewLog({...newLog, newProgress: Number(e.target.value)})} /><span className="font-black text-indigo-600 w-8 text-right">{newLog.newProgress}%</span></div>}
                            </div>
                            <div className={`p-3 rounded-lg border ${newLog.updateEndDate ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                              <label className="flex items-center gap-2 cursor-pointer font-bold text-xs text-slate-600 mb-2"><input type="checkbox" checked={newLog.updateEndDate} onChange={e => setNewLog({...newLog, updateEndDate: e.target.checked})} /> 完工展延</label>
                              {newLog.updateEndDate && <input type="date" className="w-full border rounded p-1 text-sm font-bold text-red-600 outline-none" value={newLog.newEndDate} onChange={e => setNewLog({...newLog, newEndDate: e.target.value})} />}
                            </div>
                          </div>
                        ) : (
                          <div className="text-[10px] text-slate-400 font-bold bg-slate-50 p-2 rounded border">💡 本專案已啟用階段管理，進度與展延請直接由左側「工程階段管理」區塊進行修改。</div>
                        )}
                        <button onClick={handleAddLog} className="w-full bg-indigo-600 text-white font-bold py-2.5 rounded-lg hover:bg-indigo-700 shadow-sm text-sm">送出日誌 (寫入資料庫)</button>
                      </div>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 overflow-y-auto">
                      <div className="border-l-2 border-slate-100 ml-2 pl-5 space-y-5">
                        {(editingProject.logs || []).map((log: any) => (
                          <div key={log.id} className="relative">
                            <div className={`absolute -left-[27px] top-0.5 w-3.5 h-3.5 rounded-full border-2 border-white shadow-sm ${log.type === 'success' ? 'bg-emerald-500' : log.type === 'date_change' ? 'bg-red-500' : log.type === 'payment_req' ? 'bg-amber-400' : log.type === 'payment_done' ? 'bg-green-500' : 'bg-indigo-500'}`}></div>
                            <div className="text-[10px] font-black text-slate-400 mb-1 flex items-center gap-2">
                              {log.date} 
                              {log.type === 'date_change' && <span className="text-red-500 font-bold">● 狀態變更</span>}
                              {log.type === 'payment_req' && <span className="text-amber-500 font-bold">● 財務送審</span>}
                              {log.type === 'payment_done' && <span className="text-emerald-500 font-bold">● 付款結清</span>}
                            </div>
                            <div className={`text-sm p-3 rounded-lg border whitespace-pre-wrap ${log.type === 'date_change' ? 'bg-red-50 border-red-200 font-bold text-red-900' : 'bg-slate-50 border-slate-100'}`}>{log.content}</div>
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
                       <h3 className="font-black text-amber-900 mb-3 flex items-center gap-2 text-sm"><CreditCard size={18}/> 申請工程款</h3>
                       <div className="flex flex-col sm:flex-row gap-3">
                          <div className="w-full sm:w-32"><label className="text-[10px] font-black text-slate-400 mb-1 block">請款日期</label><input type="date" className="w-full border rounded p-2 text-sm font-bold bg-slate-50 outline-none" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})} /></div>
                          <div className="flex-1"><label className="text-[10px] font-black text-slate-400 mb-1 block">請款項目</label><input type="text" className="w-full border rounded p-2 text-sm font-bold bg-slate-50 outline-none" value={newPayment.title} onChange={e => setNewPayment({...newPayment, title: e.target.value})} placeholder="例如：第一期訂金" /></div>
                          <div className="w-full sm:w-32"><label className="text-[10px] font-black text-slate-400 mb-1 block">申請金額</label><input type="text" className="w-full border rounded p-2 text-sm font-bold bg-slate-50 outline-none text-right" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: e.target.value})} placeholder="50,000" /></div>
                       </div>
                       <button onClick={handleAddPayment} className="w-full mt-3 bg-amber-500 text-amber-950 font-black py-2.5 rounded-lg hover:bg-amber-600 shadow-sm text-sm">送出請款</button>
                    </div>
                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1 overflow-y-auto">
                       <div className="space-y-3">
                         {(editingProject.payments || []).length === 0 && <div className="text-center text-slate-400 text-xs py-4 font-bold">目前無請款紀錄</div>}
                         {editingProject.payments.map((pay: any) => (
                           <div key={pay.id} className={`flex items-center justify-between p-3 rounded-lg border ${pay.status === 'pending' ? 'bg-amber-50/50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                              <div>
                                <div className="font-bold text-sm text-slate-800">{pay.title}</div>
                                <div className="text-[10px] text-slate-500">日期: {pay.date}</div>
                              </div>
                              <div className="flex items-center gap-3">
                                 <div className="font-black text-lg text-slate-700">${pay.amount}</div>
                                 {pay.status === 'pending' ? (
                                    <button onClick={() => handleApprovePayment(pay.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs px-3 py-1.5 rounded shadow-sm">核准</button>
                                 ) : (
                                    <span className="bg-emerald-100 text-emerald-700 font-bold text-xs px-3 py-1.5 rounded flex items-center gap-1"><CheckCircle size={12}/> 已付</span>
                                 )}
                                 <button onClick={() => handleDeletePayment(pay.id, pay.title)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={16}/></button>
                              </div>
                           </div>
                         ))}
                       </div>
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
