import React, { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import {
  Calendar, CheckCircle, Plus, X, MessageSquare, Layout, Filter, 
  FileText, Save, History, Construction, AlertTriangle, Building2, 
  UserCircle, DollarSign, Receipt, CreditCard, UploadCloud, 
  FileSpreadsheet, Edit, Trash2, ChevronRight, ChevronDown, Layers, Printer,
  Lock, LogOut, User
} from "lucide-react";

// ==========================================
// 🔴 Supabase 連線資訊
// ==========================================
const SUPABASE_URL = "https://mksmrupvgkehvfadynee.supabase.co";
const SUPABASE_KEY = "sb_publishable_0WCOlZOefS12mmupLA5YFg_fPv_8Xn8";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const UNITS = ["公司", "建築師", "縣府", "代書"];
const UNIT_COLORS: Record<string, { bg: string, text: string, bar: string, border: string }> = {
  "公司": { bg: "bg-cyan-50", text: "text-cyan-700", bar: "bg-cyan-500", border: "border-cyan-200" },
  "建築師": { bg: "bg-blue-50", text: "text-blue-700", bar: "bg-blue-500", border: "border-blue-200" },
  "縣府": { bg: "bg-red-50", text: "text-red-700", bar: "bg-red-500", border: "border-red-200" },
  "代書": { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", border: "border-emerald-200" }
};

// ==========================================
// ⚙️ 輔助功能
// ==========================================
// 自動計算進度
const calculateAutoProgressValue = (start: string, end: string) => {
  if (!start || !end) return 0;
  const today = new Date().setHours(0,0,0,0);
  const s = new Date(start).setHours(0,0,0,0);
  const e = new Date(end).setHours(0,0,0,0);
  if (today < s) return 0;
  if (today >= e) return 100;
  const total = e - s;
  const current = today - s;
  return Math.round((current / total) * 100);
};

const calculateWeightedProjectProgress = (phases: any[], fallbackStart: string, fallbackEnd: string) => {
  if (!phases || phases.length === 0) return { startDate: fallbackStart, endDate: fallbackEnd, progress: calculateAutoProgressValue(fallbackStart, fallbackEnd) };
  
  const validPhases = phases.filter(ph => ph.startDate && ph.endDate);
  if (validPhases.length === 0) return { startDate: fallbackStart, endDate: fallbackEnd, progress: 0 };

  let minStart = validPhases[0].startDate;
  let maxEnd = validPhases[0].endDate;
  let totalDuration = 0;
  let weightedProgressSum = 0;

  validPhases.forEach(ph => {
    if (new Date(ph.startDate) < new Date(minStart)) minStart = ph.startDate;
    if (new Date(ph.endDate) > new Date(maxEnd)) maxEnd = ph.endDate;
    const duration = Math.max(1, new Date(ph.endDate).getTime() - new Date(ph.startDate).getTime());
    const phProg = calculateAutoProgressValue(ph.startDate, ph.endDate);
    totalDuration += duration;
    weightedProgressSum += (phProg * duration);
    ph.progress = phProg; 
  });

  const overallProg = totalDuration > 0 ? Math.round(weightedProgressSum / totalDuration) : 0;
  return { startDate: minStart, endDate: maxEnd, progress: overallProg, updatedPhases: validPhases };
};

// 🌟 金額加上千分位逗號
const formatCurrency = (val: string) => {
  const numStr = val.replace(/\D/g, ''); // 拔除所有非數字字元
  return numStr ? Number(numStr).toLocaleString('en-US') : '';
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
    id: String(dbProj.id), name: dbProj.title || "", unit: dbProj.creator || "公司", vendor: dbProj.highlights || "",
    contact: dbProj.precautions || "", startDate: dbProj.startDate || "", endDate: dbProj.endDate || "",
    progress: Number(dbProj.content) || 0, isManualProgress: dbProj.feedback === "manual", status: dbProj.status || "規劃中",
    phases: Array.isArray(phases) ? phases : [], payments: Array.isArray(payments) ? payments : [], logs: Array.isArray(logs) ? logs : []
  };
};

const formatEngProjectForDb = (engProj: any) => {
  return {
    id: String(engProj.id), title: engProj.name || "", projectType: 'engineering', creator: engProj.unit || "", highlights: engProj.vendor || "",
    precautions: engProj.contact || "", content: String(engProj.progress || 0), feedback: engProj.isManualProgress ? "manual" : "auto", 
    startDate: engProj.startDate || "", endDate: engProj.endDate || "", status: engProj.status || "", breakdown: JSON.stringify(engProj.payments || []),
    countersign: JSON.stringify(engProj.logs || []), purpose: JSON.stringify(engProj.phases || [])
  };
};

export default function EngineeringApp() {
  const [projects, setProjects] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [filterUnit, setFilterUnit] = useState("all");
  
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState<"progress" | "finance">("progress");

  const todayStr = new Date().toISOString().split("T")[0];
  const [newLog, setNewLog] = useState({ date: todayStr, content: "", updateProgress: false, newProgress: 0, updateEndDate: false, newEndDate: "" });
  
  // 🌟 財務請款單狀態：加入 note (備註說明)
  const [newPayment, setNewPayment] = useState({ date: todayStr, title: "", amount: "", note: "" });

  const isAdmin = currentUser !== null && currentUser !== undefined;

  // ==========================================
  // 🟢 資料載入與儲存
  // ==========================================
  useEffect(() => { 
    const savedAccount = localStorage.getItem("mpr_account");
    fetchData(savedAccount); 
  }, []);

  const fetchData = async (savedAccount: string | null = null) => {
    setIsLoading(true);
    try {
      const { data: projData } = await supabase.from("projects").select("*");
      if (projData) {
        let engProjects = projData.filter((p: any) => p.projectType === 'engineering').map(parseEngProject);
        engProjects = engProjects.map(p => {
          if (!p.isManualProgress) {
             const stats = calculateWeightedProjectProgress(p.phases, p.startDate, p.endDate);
             const newStatus = stats.progress === 100 ? "已完工" : stats.progress > 0 ? "進行中" : "規劃中";
             if (stats.progress !== p.progress || stats.startDate !== p.startDate || stats.endDate !== p.endDate) {
                return { ...p, startDate: stats.startDate, endDate: stats.endDate, progress: stats.progress, status: newStatus, phases: stats.updatedPhases || p.phases };
             }
          }
          return p;
        });
        setProjects(engProjects);
      }
      
      const { data: usersData } = await supabase.from("users").select("*");
      if (usersData) {
        setUsers(usersData);
        if (savedAccount) {
          const user = usersData.find(u => u.account === savedAccount);
          if (user) setCurrentUser(user);
        }
      }
    } catch (e) { console.error(e); }
    setIsLoading(false);
  };

  const handleLogin = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const acc = formData.get("account") as string;
    const pwd = formData.get("password") as string;
    const user = users.find(u => u.account === acc && u.password === pwd);
    if (user) {
      setCurrentUser(user);
      localStorage.setItem("mpr_account", acc);
      setIsLoginModalOpen(false);
    } else {
      alert("帳號或密碼錯誤！");
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("mpr_account");
  };

  const saveProjectToDb = async (proj: any) => {
    if (!isAdmin) return false;
    if (!proj.isManualProgress) {
      const stats = calculateWeightedProjectProgress(proj.phases, proj.startDate, proj.endDate);
      proj.startDate = stats.startDate; proj.endDate = stats.endDate; proj.progress = stats.progress; proj.phases = stats.updatedPhases || proj.phases;
    }
    proj.status = proj.progress === 100 ? "已完工" : proj.progress > 0 ? "進行中" : "規劃中";

    const dbPayload = formatEngProjectForDb(proj);
    const { error } = await supabase.from("projects").upsert(dbPayload);
    if (error) { alert(`存檔失敗：${error.message}`); return false; }
    fetchData(currentUser?.account); 
    return true;
  };

  const handleDeleteProject = async (id: string, name: string) => {
    if (!isAdmin) return;
    if (window.confirm(`⚠️ 確定要刪除整個專案「${name}」嗎？\n刪除後資料將無法恢復。`)) {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) alert("刪除失敗：" + error.message);
      else { setIsModalOpen(false); fetchData(currentUser?.account); }
    }
  };

  const cycleUnitCategory = async (projectId: string, currentUnit: string) => {
    if (!isAdmin) return;
    const currentIndex = UNITS.indexOf(currentUnit);
    const nextUnit = UNITS[(currentIndex + 1) % UNITS.length];
    const updatedProjects = projects.map(p => p.id === projectId ? { ...p, unit: nextUnit } : p);
    setProjects(updatedProjects);
    const targetProj = updatedProjects.find(p => p.id === projectId);
    if (targetProj) saveProjectToDb(targetProj);
  };

  const filteredList = useMemo(() => {
    return projects
      .filter(p => (p.startDate?.startsWith(String(selectedYear)) || p.endDate?.startsWith(String(selectedYear))) && (filterUnit === "all" || p.unit === filterUnit))
      .sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());
  }, [projects, selectedYear, filterUnit]);

  const totalPendingPayments = useMemo(() => {
    return filteredList.reduce((total, p) => total + ((p.payments || [])?.filter((pay: any) => pay.status === "pending").length || 0), 0);
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
    if (newSet.has(id)) newSet.delete(id); else newSet.add(id);
    setExpandedProjects(newSet);
  };

  const handleOpenEdit = (p: any) => {
    const target = { ...p, payments: p.payments || [], logs: p.logs || [], phases: p.phases || [] };
    setEditingProject(target);
    setActiveTab("progress");
    setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: target.progress || 0, updateEndDate: false, newEndDate: target.endDate || "" });
    setNewPayment({ date: todayStr, title: "", amount: "", note: "" });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    if (!isAdmin) return;
    const newProj = { id: "eng_" + Date.now(), name: "", unit: "公司", vendor: "", contact: "", startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-03-31`, progress: 0, status: "規劃中", phases: [], logs: [], payments: [] };
    setEditingProject(newProj);
    setActiveTab("progress");
    setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: 0, updateEndDate: false, newEndDate: newProj.endDate });
    setNewPayment({ date: todayStr, title: "", amount: "", note: "" });
    setIsModalOpen(true);
  };

  const handleSave = async () => {
    if (!editingProject?.name) return alert("請輸入工程名稱！");
    let projToSave = { ...editingProject };
    if ((projToSave.logs || []).length === 0) projToSave.logs = [{ id: Date.now(), date: todayStr, content: "建立工程專案。", type: "info" }];
    const success = await saveProjectToDb(projToSave);
    if (success) setIsModalOpen(false);
  };

  const handleAddPhase = () => {
    const newPhases = [...(editingProject.phases || [])];
    newPhases.push({ id: `ph_${Date.now()}`, name: "新階段", startDate: todayStr, endDate: todayStr, progress: 0 });
    setEditingProject({ ...editingProject, phases: newPhases, isManualProgress: false });
  };
  
  const handleRemovePhase = (idx: number) => {
    const newPhases = [...(editingProject.phases || [])];
    newPhases.splice(idx, 1);
    setEditingProject({ ...editingProject, phases: newPhases, isManualProgress: false });
  };

  const handlePhaseChange = (idx: number, field: string, value: any) => {
    if (!isAdmin) return;
    const newPhases = [...(editingProject.phases || [])];
    newPhases[idx][field] = value;
    const stats = calculateWeightedProjectProgress(newPhases, editingProject.startDate, editingProject.endDate);
    setEditingProject({ ...editingProject, phases: newPhases, startDate: stats.startDate, endDate: stats.endDate, progress: stats.progress, isManualProgress: false });
  };

  const handleProcessImport = async () => {
    if (!importFile) return alert("請先選擇 Excel 檔案！");
    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const extractedText = XLSX.utils.sheet_to_txt(workbook.Sheets[workbook.SheetNames[0]]);
      if (!extractedText.trim()) return alert("檔案內無內容！");
      const newProj = { id: "eng_" + Date.now(), name: "【從 Excel 匯入】", unit: "公司", vendor: "", contact: "", startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-03-31`, progress: 0, status: "規劃中", phases: [], payments: [], logs: [{ id: Date.now(), date: todayStr, content: "【系統匯入原始資料】\n" + extractedText, type: "info" }] };
      setEditingProject(newProj);
      setActiveTab("progress");
      setIsImportModalOpen(false);
      setImportFile(null);
      setIsModalOpen(true); 
    } catch (e) { alert("讀取失敗！"); }
  };

  const handleAddLog = async () => {
    if (!isAdmin) return;
    if (!newLog.content.trim()) return alert("請輸入內容");
    let updated = { ...editingProject };
    let logs = [...(updated.logs || [])];
    if (newLog.updateEndDate && newLog.newEndDate !== updated.endDate) {
      logs.unshift({ id: Date.now()+1, date: newLog.date || todayStr, content: `【工期展延】完工日由 ${updated.endDate} 延至 ${newLog.newEndDate}`, type: "date_change" });
      updated.endDate = newLog.newEndDate;
    }
    logs.unshift({ id: Date.now(), date: newLog.date || todayStr, content: newLog.content, type: (newLog.updateProgress && newLog.newProgress === 100) ? "success" : "info" });
    if (newLog.updateProgress) { updated.progress = Number(newLog.newProgress || 0); updated.isManualProgress = true; }
    updated.logs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEditingProject(updated);
    await saveProjectToDb(updated);
    setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: updated.progress, updateEndDate: false, newEndDate: updated.endDate });
  };

  const handleAddPayment = async () => {
    if (!isAdmin) return;
    if (!newPayment.date || !newPayment.title || !newPayment.amount) return alert("請輸入完整請款資訊 (日期、項目、金額)");
    
    let updated = { ...editingProject };
    const paymentRecord = { 
      id: Date.now(), date: newPayment.date, title: newPayment.title, 
      amount: newPayment.amount, note: newPayment.note, status: "pending" 
    };
    updated.payments = [paymentRecord, ...(updated.payments || [])];
    
    const logContent = `【請款送審】提出請款：${newPayment.title} ($${newPayment.amount})${newPayment.note ? `\n說明：${newPayment.note}` : ''}`;
    updated.logs = [{ id: Date.now()+1, date: newPayment.date, content: logContent, type: "payment_req" }, ...(updated.logs || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setEditingProject(updated);
    await saveProjectToDb(updated);
    setNewPayment({ date: todayStr, title: "", amount: "", note: "" });
  };

  const handleApprovePayment = async (payId: number) => {
    if (!isAdmin) return;
    
    // 🌟 跳出視窗讓主管輸入核准備註
    const approveNote = window.prompt("請輸入撥款備註 (選填，例如：匯款帳號、支票號碼、折讓細節)：");
    if (approveNote === null) return; // 點擊取消則不動作

    let updated = { ...editingProject };
    const payIndex = (updated.payments || []).findIndex((p: any) => p.id === payId);
    if (payIndex > -1) {
      updated.payments[payIndex].status = "paid";
      updated.payments[payIndex].approveNote = approveNote; // 存入核准備註

      const logContent = `【付款完成】已支付：${updated.payments[payIndex].title} ($${updated.payments[payIndex].amount})${approveNote ? `\n撥款備註：${approveNote}` : ''}`;
      updated.logs = [{ id: Date.now(), date: todayStr, content: logContent, type: "payment_done" }, ...(updated.logs || [])].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      
      setEditingProject(updated);
      await saveProjectToDb(updated);
    }
  };

  const handleDeletePayment = async (payId: number, payTitle: string) => {
    if (!isAdmin) return;
    if (!window.confirm(`確定要刪除請款單「${payTitle}」嗎？`)) return;
    let updated = { ...editingProject };
    updated.payments = (updated.payments || []).filter((p: any) => p.id !== payId);
    updated.logs = [{ id: Date.now(), date: todayStr, content: `【撤銷請款】刪除錯誤單據：${payTitle}`, type: "date_change" }, ...(updated.logs || [])].sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime());
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
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans print:bg-white print:m-0">
      
      <style>{`
        @media print {
          @page { size: A4 landscape; margin: 0.5cm; }
          body { background-color: white !important; }
          .no-print, header, .dashboard, .filters { display: none !important; }
          .gantt-scroll-container { overflow: visible !important; max-height: none !important; }
          .min-w-[1000px] { min-width: 100% !important; width: 100% !important; }
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          .print-w-project { width: 280px !important; border-right: 1px solid #e2e8f0; position: static !important; }
          .print-text-sm { font-size: 11px !important; }
          .print-text-xs { font-size: 9px !important; }
          .sticky-col { position: static !important; }
        }
        .sticky-month-row { position: sticky; top: 0; z-index: 30; background: #f8fafc; }
        .sticky-col { position: sticky; left: 0; z-index: 20; background: white; }
        .sticky-header-col { position: sticky; left: 0; z-index: 40; background: #f8fafc; }
      `}</style>

      {/* HEADER */}
      <header className="bg-slate-800 shadow-md sticky top-0 z-50 text-white p-3 md:p-4 flex justify-between items-center no-print">
        <div className="flex items-center gap-2 md:gap-3">
          <Construction className="w-6 h-6 md:w-7 md:h-7 text-amber-400" />
          <h1 className="font-black text-lg md:text-xl hidden sm:block">工程進度系統</h1>
          <select className="bg-slate-700 border-none text-white font-bold rounded p-1 md:p-1.5 text-sm md:text-base outline-none cursor-pointer" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y} 年</option>)}
          </select>
        </div>
        
        <div className="flex items-center gap-1.5 md:gap-3">
          <button onClick={() => setTimeout(() => window.print(), 500)} className="bg-white/10 hover:bg-white/20 text-white p-2 md:px-3 md:py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all border border-white/20">
            <Printer size={16}/> <span className="hidden md:inline">匯出報表</span>
          </button>
          
          {!isAdmin ? (
            <button onClick={() => setIsLoginModalOpen(true)} className="bg-indigo-500 hover:bg-indigo-600 text-white p-2 md:px-4 md:py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-all shadow-md">
              <Lock size={16}/> <span className="hidden md:inline">管理員登入</span>
            </button>
          ) : (
            <>
              <button onClick={() => setIsImportModalOpen(true)} className="bg-slate-600 hover:bg-slate-500 text-white p-2 md:px-3 md:py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-md">
                <UploadCloud size={16}/> <span className="hidden md:inline">匯入</span>
              </button>
              <button onClick={handleOpenCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-900 p-2 md:px-4 md:py-2 rounded-lg text-sm font-black flex items-center justify-center gap-2 transition-all shadow-md">
                <Plus size={16}/> <span className="hidden md:inline">新增專案</span>
              </button>
              <div className="hidden sm:block h-6 w-px bg-slate-600 mx-1"></div>
              <div className="hidden sm:flex items-center gap-2 text-sm font-bold text-slate-300">
                 <User size={16}/> <span>{currentUser?.name || '管理員'}</span>
              </div>
              <button onClick={handleLogout} className="text-slate-400 hover:text-red-400 p-2" title="登出"><LogOut size={16}/></button>
            </>
          )}
        </div>
      </header>

      {/* 登入視窗 */}
      {isLoginModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm no-print">
          <form onSubmit={handleLogin} className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="bg-slate-800 p-6 text-center text-white relative">
              <button type="button" onClick={() => setIsLoginModalOpen(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white"><X size={20}/></button>
              <Lock className="w-10 h-10 mx-auto mb-3 text-amber-400" />
              <h2 className="text-xl font-black">管理員權限登入</h2>
              <p className="text-xs text-slate-400 mt-1">使用與飯店簽呈系統相同的帳密</p>
            </div>
            <div className="p-6 space-y-4">
              <div><label className="block text-sm font-bold text-slate-600 mb-1">登入帳號</label><input name="account" type="text" required className="w-full border rounded-lg p-2.5 outline-none focus:border-indigo-500 bg-slate-50" /></div>
              <div><label className="block text-sm font-bold text-slate-600 mb-1">登入密碼</label><input name="password" type="password" required className="w-full border rounded-lg p-2.5 outline-none focus:border-indigo-500 bg-slate-50" /></div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg mt-2 shadow-md">解鎖編輯權限</button>
            </div>
          </form>
        </div>
      )}

      <main className="max-w-7xl mx-auto px-2 sm:px-4 py-6 space-y-4 md:space-y-6 print:py-0 print:space-y-0 print:max-w-none">
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 dashboard no-print">
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200"><div className="text-slate-500 text-[10px] md:text-xs font-bold mb-1">年度總專案</div><div className="text-2xl md:text-3xl font-black">{filteredList.length}</div></div>
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200"><div className="text-blue-500 text-[10px] md:text-xs font-bold mb-1">施工中</div><div className="text-2xl md:text-3xl font-black text-blue-600">{filteredList.filter(p => p.progress > 0 && p.progress < 100).length}</div></div>
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-amber-200 bg-amber-50/30"><div className="text-amber-600 text-[10px] md:text-xs font-bold mb-1 flex items-center gap-1"><Receipt size={14}/> 待核請款</div><div className="text-2xl md:text-3xl font-black text-amber-700">{totalPendingPayments} <span className="text-sm">筆</span></div></div>
          <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-200"><div className="text-emerald-500 text-[10px] md:text-xs font-bold mb-1">已完工</div><div className="text-2xl md:text-3xl font-black text-emerald-600">{filteredList.filter(p => p.progress === 100).length}</div></div>
        </div>

        <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-2 md:gap-4 items-center filters no-print">
          <span className="font-bold text-slate-600 text-xs md:text-sm flex items-center gap-1"><Filter size={14}/> 分類：</span>
          <button onClick={() => setFilterUnit("all")} className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold border transition-colors ${filterUnit === 'all' ? 'bg-slate-800 text-white' : 'bg-white'}`}>全部</button>
          {UNITS.map(u => (
            <button key={u} onClick={() => setFilterUnit(u)} className={`px-3 py-1 md:px-4 md:py-1.5 rounded-full text-[10px] md:text-xs font-bold border transition-all flex items-center gap-1 md:gap-1.5 ${filterUnit === u ? 'ring-2 ring-offset-1 ring-slate-400 shadow-sm ' + UNIT_COLORS[u].bg + ' ' + UNIT_COLORS[u].text : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
              <span className={`w-2 h-2 md:w-2.5 md:h-2.5 rounded-full ${UNIT_COLORS[u].bar}`}></span> {u}
            </button>
          ))}
        </div>

        {/* 甘特圖 */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 print:shadow-none print:border-none print:rounded-none">
          <div className="p-3 md:p-4 border-b bg-slate-50 font-black text-sm md:text-base text-slate-700 flex items-center gap-2 no-print"><Calendar size={18}/> {selectedYear} 年度工程進度</div>
          <div className="gantt-scroll-container overflow-auto max-h-[calc(100vh-250px)] relative">
            <div className="min-w-[800px] md:min-w-[1000px]">
              <div className="flex border-b border-slate-200 font-bold text-xs text-slate-500 sticky-month-row">
                <div className="w-[140px] sm:w-[220px] md:w-[380px] p-2 md:p-3 border-r border-slate-200 flex justify-between items-center print-w-project sticky-header-col shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                  <span className="text-[10px] md:text-xs truncate">工程項目 / 廠商資訊</span><span className="hidden md:inline text-[9px] text-slate-400 no-print">依日期排序</span>
                </div>
                <div className="flex-1 grid grid-cols-12 text-center bg-slate-50/90 backdrop-blur-sm">{[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <div key={m} className="p-2 md:p-3 border-r border-slate-200 last:border-0">{m}月</div>)}</div>
              </div>
              <div className="relative bg-slate-50/20">
                <div className="absolute inset-0 flex ml-[140px] sm:ml-[220px] md:ml-[380px] print:ml-[280px] pointer-events-none z-0">{[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <div key={`bg-${m}`} className="flex-1 border-r border-slate-100"></div>)}</div>
                <div className="relative z-10">
                  {filteredList.length === 0 && <div className="py-16 text-center text-slate-400 font-bold no-print">該條件下目前無工程專案</div>}
                  {filteredList.map(p => {
                    const color = UNIT_COLORS[p.unit] || UNIT_COLORS["公司"];
                    const hasPendingPayment = (p.payments || []).some((pay: any) => pay.status === 'pending');
                    const hasPhases = p.phases && p.phases.length > 0;
                    const isExpanded = expandedProjects.has(p.id);
                    
                    return (
                      <React.Fragment key={p.id}>
                        <div className="flex border-b border-slate-100 hover:bg-slate-50 group transition-colors">
                          <div className="w-[140px] sm:w-[220px] md:w-[380px] p-2 md:p-3 border-r border-slate-200 bg-white flex items-center gap-1 md:gap-2 group-hover:bg-slate-50 relative sticky-col print-w-project shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                            {hasPhases ? <button onClick={() => toggleProjectExpand(p.id)} className="p-0.5 md:p-1 hover:bg-slate-200 rounded text-slate-500 transition-transform no-print z-20 flex-shrink-0">{isExpanded ? <ChevronDown size={14}/> : <ChevronRight size={14}/>}</button> : <div className="w-4 md:w-6 flex-shrink-0 no-print"></div>}
                            <div className="flex-1 flex flex-col justify-center min-w-0 cursor-pointer z-10" onClick={() => handleOpenEdit(p)}>
                              {hasPendingPayment && <span className="absolute top-1 right-1 md:top-3 md:right-3 flex h-2 w-2 no-print"><span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span><span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span></span>}
                              <div className="font-bold text-[10px] md:text-sm print-text-sm text-slate-800 pr-2 md:pr-6 truncate" title={p.name}>{p.name}</div>
                              <div className="flex items-center gap-1 md:gap-2 text-[8px] md:text-[10px] print-text-xs mt-0.5 md:mt-1 truncate">
                                <span onClick={(e) => { e.stopPropagation(); if(isAdmin) cycleUnitCategory(p.id, p.unit); }} className={`px-1 py-0.5 rounded font-bold transition-all ${color.bg} ${color.text} border ${color.border} ${isAdmin ? 'cursor-pointer hover:ring-2 ring-slate-400' : ''}`} title="點擊切換分類">{p.unit}</span>
                                <span className="text-slate-400 font-bold truncate hidden sm:inline">{p.startDate?.substring(5).replace('-','/')} ~ {p.endDate?.substring(5).replace('-','/')}</span>
                                {!p.isManualProgress && (!hasPhases) && <span className="text-[7px] md:text-[8px] bg-indigo-50 text-indigo-400 px-1 rounded border border-indigo-100 no-print whitespace-nowrap hidden lg:inline">自動</span>}
                              </div>
                              {(p.vendor || p.contact) && <div className="text-[8px] md:text-[10px] print-text-xs text-slate-500 flex gap-2 truncate mt-0.5">{p.vendor && <span className="flex items-center gap-0.5 truncate"><Building2 size={10}/>{p.vendor}</span>}</div>}
                            </div>
                            {isAdmin && <button onClick={(e) => { e.stopPropagation(); handleDeleteProject(p.id, p.name); }} className="absolute right-1 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 p-1 md:p-2 transition-all no-print z-20 bg-white/80 rounded"><Trash2 size={14}/></button>}
                          </div>
                          <div className="flex-1 relative py-3 md:py-4 cursor-pointer" onClick={() => handleOpenEdit(p)}>
                            <div className={`absolute top-1/2 -translate-y-1/2 h-5 md:h-6 rounded shadow-sm border border-black/5 flex items-center overflow-hidden transition-all group-hover:brightness-105 ${color.bar}`} style={getBarStyles(p.startDate, p.endDate)}>
                              <div className="absolute left-0 h-full bg-white/30" style={{ width: `${p.progress}%` }}></div>
                              <span className="relative z-10 px-1 md:px-2 text-[8px] md:text-[9px] print-text-xs font-black text-white drop-shadow-sm">{p.progress}%</span>
                            </div>
                          </div>
                        </div>
                        {/* 展開階段 */}
                        {(isExpanded || false) && hasPhases && p.phases.map((ph:any) => (
                           <div key={ph.id} className="flex border-b border-slate-50 bg-slate-50/80 hover:bg-slate-100 transition-colors">
                              <div className="w-[140px] sm:w-[220px] md:w-[380px] print-w-project p-1.5 md:p-2 pl-6 md:pl-10 border-r border-slate-200 flex items-center gap-1 md:gap-2 cursor-pointer sticky-col shadow-[2px_0_5px_-2px_rgba(0,0,0,0.02)]" onClick={() => handleOpenEdit(p)}>
                                <Layers size={10} className="text-slate-400 no-print flex-shrink-0"/>
                                <span className="text-[9px] md:text-xs print-text-xs font-bold text-slate-500 flex-1 truncate">└ {ph.name}</span>
                                <span className="hidden sm:inline text-[8px] md:text-[9px] font-bold text-slate-400 truncate">{ph.startDate?.substring(5).replace('-','/')} ~ {ph.endDate?.substring(5).replace('-','/')}</span>
                              </div>
                              <div className="flex-1 relative py-2 cursor-pointer" onClick={() => handleOpenEdit(p)}>
                                <div className={`absolute top-1/2 -translate-y-1/2 h-2.5 md:h-3.5 rounded opacity-80 flex items-center overflow-hidden ${color.bar}`} style={getBarStyles(ph.startDate, ph.endDate)}>
                                  <div className="absolute left-0 h-full bg-white/40" style={{ width: `${ph.progress}%` }}></div>
                                  <span className="relative z-10 px-1 text-[7px] md:text-[8px] font-bold text-white drop-shadow-sm">{ph.progress}%</span>
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
      {isImportModalOpen && isAdmin && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm no-print">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center"><h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><UploadCloud size={20} className="text-indigo-500"/> 匯入 Excel 資料</h2><button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white border rounded p-1"><X size={20} /></button></div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 font-medium">請上傳 Excel (.xlsx, .csv) 檔案。系統會自動建立新專案，並將表格內容匯入「進度日誌」。</p>
              <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 text-center bg-slate-50 hover:bg-slate-100 transition-colors relative cursor-pointer">
                <input type="file" accept=".xlsx, .xls, .csv" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
                <FileSpreadsheet className={`w-12 h-12 mx-auto mb-3 ${importFile ? 'text-indigo-500' : 'text-slate-400'}`} />
                <span className="font-bold text-sm text-slate-700">{importFile ? importFile.name : "點擊或拖曳 Excel 檔案至此"}</span>
              </div>
            </div>
            <div className="px-6 py-4 border-t bg-slate-50 flex justify-end gap-3"><button onClick={() => setIsImportModalOpen(false)} className="px-5 py-2 font-bold text-sm bg-white border rounded-lg shadow-sm">取消</button><button onClick={handleProcessImport} className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-bold text-sm shadow-md">解析並建立</button></div>
          </div>
        </div>
      )}

      {/* 💥 專案管理 Modal */}
      {isModalOpen && editingProject && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-900/70 backdrop-blur-sm no-print">
          <div className="bg-white rounded-none sm:rounded-2xl shadow-2xl w-full h-full sm:h-auto max-w-6xl flex flex-col sm:max-h-[95vh] overflow-hidden border border-slate-200">
            
            <div className="px-4 sm:px-6 py-3 sm:py-4 border-b bg-slate-50 flex justify-between items-center z-10 shadow-sm flex-shrink-0">
              <h2 className="text-base sm:text-lg font-black text-slate-800 flex items-center gap-2 truncate pr-4">
                 <FileText size={18} className="text-slate-500 flex-shrink-0"/> 
                 <span className="truncate">{String(editingProject.id || '').startsWith('eng_') ? "新增工程專案" : (editingProject.name || '')}</span>
                 {!isAdmin && <span className="text-[10px] sm:text-xs bg-slate-200 text-slate-500 px-2 py-0.5 rounded ml-2 whitespace-nowrap"><Lock size={12} className="inline mr-1"/>唯讀模式</span>}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white border rounded p-1 flex-shrink-0"><X size={20} /></button>
            </div>
            
            {/* 🌟 手機版捲軸重構：外層負責滑動，內層不鎖死高度 */}
            <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-slate-100 flex flex-col lg:flex-row gap-4 sm:gap-6 lg:overflow-hidden">
              
              {/* ⬅️ 左側：基本設定 */}
              <div className="w-full lg:w-5/12 space-y-4 bg-white p-4 sm:p-6 rounded-xl border border-slate-200 h-fit lg:h-full lg:overflow-y-auto shadow-sm flex-shrink-0">
                <h3 className="font-black text-slate-800 border-b pb-3 flex items-center gap-2 text-sm"><Layout size={18} className="text-indigo-500"/> 基本設定</h3>
                
                <div>
                   <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">工程名稱</label>
                   <input className="w-full border rounded-lg p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-slate-50 disabled:bg-transparent disabled:border-slate-100 disabled:text-slate-600" value={editingProject.name ?? ''} disabled={!isAdmin} onChange={e => setEditingProject({...editingProject, name: e.target.value})} />
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div>
                     <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">分類標籤</label>
                     <select className="w-full border rounded-lg p-2.5 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-slate-50 disabled:bg-transparent disabled:border-slate-100 disabled:appearance-none disabled:text-slate-600" disabled={!isAdmin} value={editingProject.unit ?? ''} onChange={e => setEditingProject({...editingProject, unit: e.target.value})}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">總體進度</label>
                    <div className="font-black text-xl sm:text-2xl text-indigo-600 flex items-center gap-2">
                       {editingProject.progress ?? 0}% 
                       {editingProject.isManualProgress && <span className="text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded border border-amber-200">手動</span>}
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">負責廠商</label><input className="w-full border rounded-lg p-2 text-xs sm:text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500 disabled:bg-transparent disabled:border-slate-100 disabled:text-slate-600" disabled={!isAdmin} value={editingProject.vendor ?? ''} onChange={e => setEditingProject({...editingProject, vendor: e.target.value})} placeholder={isAdmin ? "輸入廠商..." : "無"}/></div>
                  <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">聯繫人員</label><input className="w-full border rounded-lg p-2 text-xs sm:text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500 disabled:bg-transparent disabled:border-slate-100 disabled:text-slate-600" disabled={!isAdmin} value={editingProject.contact ?? ''} onChange={e => setEditingProject({...editingProject, contact: e.target.value})} placeholder={isAdmin ? "輸入聯絡人..." : "無"}/></div>
                </div>

                {/* 階段管理 */}
                <div className="mt-4 pt-4 border-t border-slate-100">
                  <div className="flex justify-between items-center mb-3">
                    <label className="block text-[10px] font-black text-slate-400 uppercase flex items-center gap-1"><Layers size={14}/> 工程階段</label>
                    {isAdmin && <button onClick={handleAddPhase} className="text-xs bg-indigo-50 text-indigo-700 font-bold px-2 py-1 rounded hover:bg-indigo-100 flex items-center gap-1"><Plus size={12}/> 新增</button>}
                  </div>
                  
                  {(!editingProject.phases || editingProject.phases.length === 0) ? (
                    <div className="grid grid-cols-2 gap-3 sm:gap-4">
                      <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">預計開工</label><input type="date" className="w-full border rounded-lg p-2 text-xs sm:text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500 disabled:bg-transparent disabled:border-slate-100 disabled:text-slate-600" disabled={!isAdmin} value={editingProject.startDate ?? ''} onChange={e => setEditingProject({...editingProject, startDate: e.target.value})} /></div>
                      <div><label className="block text-[10px] font-black text-slate-400 mb-1 uppercase">預計完工</label><input type="date" className="w-full border rounded-lg p-2 text-xs sm:text-sm font-bold bg-slate-50 outline-none focus:border-indigo-500 disabled:bg-transparent disabled:border-slate-100 disabled:text-slate-600" disabled={!isAdmin} value={editingProject.endDate ?? ''} onChange={e => setEditingProject({...editingProject, endDate: e.target.value})} /></div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {(editingProject.phases || []).map((phase: any, idx: number) => (
                        <div key={phase.id || idx} className={`p-2 rounded-lg border flex flex-wrap sm:flex-nowrap items-center gap-2 ${isAdmin ? 'bg-slate-50 border-slate-200' : 'bg-transparent border-slate-100'}`}>
                          <input className="flex-1 min-w-[80px] w-full sm:w-auto text-xs font-bold p-1.5 border rounded outline-none disabled:bg-transparent disabled:border-none disabled:p-0" disabled={!isAdmin} value={phase.name ?? ''} onChange={(e) => handlePhaseChange(idx, 'name', e.target.value)} placeholder="階段名稱"/>
                          <div className="flex items-center gap-1 w-full sm:w-auto justify-between">
                            <input type="date" className="w-[100px] text-[10px] sm:text-xs font-bold p-1.5 border rounded outline-none disabled:bg-transparent disabled:border-none disabled:p-0 text-slate-600" disabled={!isAdmin} value={phase.startDate ?? ''} onChange={(e) => handlePhaseChange(idx, 'startDate', e.target.value)} />
                            <span className="text-slate-400 text-xs">-</span>
                            <input type="date" className="w-[100px] text-[10px] sm:text-xs font-bold p-1.5 border rounded outline-none disabled:bg-transparent disabled:border-none disabled:p-0 text-slate-600" disabled={!isAdmin} value={phase.endDate ?? ''} onChange={(e) => handlePhaseChange(idx, 'endDate', e.target.value)} />
                          </div>
                          <div className="flex items-center gap-2 w-full sm:w-auto mt-1 sm:mt-0 justify-end">
                            <div className={`w-[60px] flex items-center gap-1 border rounded px-1 ${isAdmin ? 'bg-white' : 'bg-transparent border-none'}`}><input type="number" className="w-full text-xs font-bold p-1 outline-none text-right disabled:bg-transparent" disabled={!isAdmin} value={phase.progress ?? 0} onChange={(e) => handlePhaseChange(idx, 'progress', e.target.value)} /></div>
                            {isAdmin && <button onClick={() => handleRemovePhase(idx)} className="p-1.5 text-slate-400 hover:text-red-500 bg-white rounded border"><Trash2 size={14}/></button>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {isAdmin && (
                  <div className="flex gap-2 sm:gap-3 pt-4 border-t mt-4">
                    <button onClick={handleSave} className="flex-1 bg-slate-800 text-white py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold hover:bg-slate-900 shadow-md flex items-center justify-center gap-2"><Save size={18}/> 儲存更新</button>
                    {!String(editingProject.id || '').startsWith('eng_') && (
                      <button onClick={() => handleDeleteProject(editingProject.id, editingProject.name)} className="bg-red-50 text-red-600 px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl hover:bg-red-100 transition-colors border border-red-100"><Trash2 size={18}/></button>
                    )}
                  </div>
                )}
              </div>

              {/* ➡️ 右側：雙頁籤 */}
              <div className="w-full lg:w-7/12 flex flex-col gap-4 h-auto lg:h-full">
                <div className="flex gap-2 bg-white p-1 sm:p-1.5 rounded-lg border border-slate-200 shadow-sm w-fit flex-shrink-0">
                   <button onClick={() => setActiveTab('progress')} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all ${activeTab === 'progress' ? 'bg-indigo-50 text-indigo-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}><History size={14}/> 進度日誌</button>
                   <button onClick={() => setActiveTab('finance')} className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-md font-bold text-xs sm:text-sm flex items-center gap-1.5 sm:gap-2 transition-all ${activeTab === 'finance' ? 'bg-amber-50 text-amber-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}>
                      <DollarSign size={14}/> 財務請款
                      {(editingProject.payments || []).some((p:any)=>p.status==='pending') && <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-amber-500"></span>}
                   </button>
                </div>

                {activeTab === 'progress' && (
                  <div className="flex flex-col gap-4 sm:gap-6 flex-1 min-h-[400px] lg:min-h-0 lg:overflow-hidden">
                    
                    {isAdmin && (
                      <div className="bg-white p-4 sm:p-5 rounded-xl border border-indigo-100 shadow-sm relative shrink-0">
                        <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-indigo-500"></div>
                        <h3 className="font-black text-indigo-900 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"><Edit size={16}/> 新增施工進度</h3>
                        <div className="space-y-2 sm:space-y-3">
                          <input type="date" className="border rounded p-1.5 text-xs sm:text-sm font-bold outline-none" value={newLog.date ?? ''} onChange={e => setNewLog({...newLog, date: e.target.value})} />
                          <textarea rows={2} className="w-full border rounded-lg p-2 text-xs sm:text-sm bg-slate-50 outline-none focus:border-indigo-500 resize-none" placeholder="輸入今日施工重點或異常狀況..." value={newLog.content ?? ''} onChange={e => setNewLog({...newLog, content: e.target.value})} />
                          
                          {(!editingProject.phases || editingProject.phases.length === 0) ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                              <div className="bg-slate-50 p-2 sm:p-3 rounded-lg border">
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-[10px] sm:text-xs text-slate-600 mb-1 sm:mb-2"><input type="checkbox" checked={newLog.updateProgress === true} onChange={e => setNewLog({...newLog, updateProgress: e.target.checked})} /> 手動調整進度</label>
                                {newLog.updateProgress && <div className="flex items-center gap-2"><input type="range" className="flex-1" value={newLog.newProgress ?? 0} onChange={e => setNewLog({...newLog, newProgress: Number(e.target.value)})} /><span className="font-black text-indigo-600 w-6 sm:w-8 text-right text-xs sm:text-sm">{newLog.newProgress}%</span></div>}
                              </div>
                              <div className={`p-2 sm:p-3 rounded-lg border ${newLog.updateEndDate ? 'bg-red-50 border-red-200' : 'bg-slate-50'}`}>
                                <label className="flex items-center gap-2 cursor-pointer font-bold text-[10px] sm:text-xs text-slate-600 mb-1 sm:mb-2"><input type="checkbox" checked={newLog.updateEndDate === true} onChange={e => setNewLog({...newLog, updateEndDate: e.target.checked})} /> 完工展延</label>
                                {newLog.updateEndDate && <input type="date" className="w-full border rounded p-1 text-[10px] sm:text-sm font-bold text-red-600 outline-none" value={newLog.newEndDate ?? ''} onChange={e => setNewLog({...newLog, newEndDate: e.target.value})} />}
                              </div>
                            </div>
                          ) : (
                            <div className="text-[9px] sm:text-[10px] text-slate-400 font-bold bg-slate-50 p-2 rounded border">💡 已啟用階段管理，進度與展延請由左側修改。</div>
                          )}
                          <button onClick={handleAddLog} className="w-full bg-indigo-600 text-white font-bold py-2 sm:py-2.5 rounded-lg hover:bg-indigo-700 shadow-sm text-xs sm:text-sm">送出日誌</button>
                        </div>
                      </div>
                    )}

                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex-1 lg:overflow-y-auto">
                      <div className="border-l-2 border-slate-100 ml-1 sm:ml-2 pl-4 sm:pl-5 space-y-4 sm:space-y-5">
                        {(editingProject.logs || []).length === 0 && <div className="text-slate-400 text-xs py-4 text-center font-bold">尚無紀錄</div>}
                        {(editingProject.logs || []).map((log: any) => (
                          <div key={log.id} className="relative">
                            <div className={`absolute -left-[22px] sm:-left-[27px] top-0.5 w-3 sm:w-3.5 h-3 sm:h-3.5 rounded-full border-2 border-white shadow-sm ${log.type === 'success' ? 'bg-emerald-500' : log.type === 'date_change' ? 'bg-red-500' : log.type === 'payment_req' ? 'bg-amber-400' : log.type === 'payment_done' ? 'bg-green-500' : 'bg-indigo-500'}`}></div>
                            <div className="text-[9px] sm:text-[10px] font-black text-slate-400 mb-0.5 sm:mb-1 flex items-center gap-1 sm:gap-2">
                              {log.date} 
                              {log.type === 'date_change' && <span className="text-red-500 font-bold">● 狀態變更</span>}
                              {log.type === 'payment_req' && <span className="text-amber-500 font-bold">● 財務送審</span>}
                              {log.type === 'payment_done' && <span className="text-emerald-500 font-bold">● 付款結清</span>}
                            </div>
                            <div className={`text-xs sm:text-sm p-2 sm:p-3 rounded-lg border whitespace-pre-wrap ${log.type === 'date_change' ? 'bg-red-50 border-red-200 font-bold text-red-900' : 'bg-slate-50 border-slate-100'}`}>{log.content}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'finance' && (
                  <div className="flex flex-col gap-4 sm:gap-6 flex-1 min-h-[400px] lg:min-h-0 lg:overflow-hidden">
                    
                    {isAdmin && (
                      <div className="bg-white p-4 sm:p-5 rounded-xl border border-amber-200 shadow-sm relative shrink-0">
                         <div className="absolute top-0 left-0 w-1 sm:w-1.5 h-full bg-amber-500"></div>
                         <h3 className="font-black text-amber-900 mb-2 sm:mb-3 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm"><CreditCard size={16}/> 申請工程款</h3>
                         <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                            <div className="w-full sm:w-32"><label className="text-[9px] sm:text-[10px] font-black text-slate-400 mb-0.5 sm:mb-1 block">請款日期</label><input type="date" className="w-full border rounded p-1.5 sm:p-2 text-xs sm:text-sm font-bold bg-slate-50 outline-none focus:border-amber-500" value={newPayment.date ?? ''} onChange={e => setNewPayment({...newPayment, date: e.target.value})} /></div>
                            <div className="flex-1"><label className="text-[9px] sm:text-[10px] font-black text-slate-400 mb-0.5 sm:mb-1 block">請款項目</label><input type="text" className="w-full border rounded p-1.5 sm:p-2 text-xs sm:text-sm font-bold bg-slate-50 outline-none focus:border-amber-500" value={newPayment.title ?? ''} onChange={e => setNewPayment({...newPayment, title: e.target.value})} placeholder="例如：第一期訂金" /></div>
                            <div className="w-full sm:w-32"><label className="text-[9px] sm:text-[10px] font-black text-slate-400 mb-0.5 sm:mb-1 block">申請金額</label>
                              <div className="relative">
                                <span className="absolute left-2 top-[7px] md:top-[9px] font-bold text-slate-400 text-xs md:text-sm">$</span>
                                {/* 🌟 自動千分位格式化 */}
                                <input type="text" className="w-full border rounded p-1.5 sm:p-2 pl-5 sm:pl-6 text-xs sm:text-sm font-bold bg-slate-50 outline-none focus:border-amber-500 text-right" value={newPayment.amount ?? ''} onChange={e => setNewPayment({...newPayment, amount: formatCurrency(e.target.value)})} placeholder="50,000" />
                              </div>
                            </div>
                         </div>
                         <div className="mt-2 sm:mt-3">
                           <label className="text-[9px] sm:text-[10px] font-black text-slate-400 mb-0.5 sm:mb-1 block">請款說明 / 備註 (選填)</label>
                           <input type="text" className="w-full border rounded p-1.5 sm:p-2 text-xs sm:text-sm font-bold bg-slate-50 outline-none focus:border-amber-500" value={newPayment.note ?? ''} onChange={e => setNewPayment({...newPayment, note: e.target.value})} placeholder="例如：匯款帳號、預支說明..." />
                         </div>
                         <button onClick={handleAddPayment} className="w-full mt-3 bg-amber-500 text-amber-950 font-black py-2 sm:py-2.5 rounded-lg hover:bg-amber-600 shadow-sm text-xs sm:text-sm">送出請款</button>
                      </div>
                    )}

                    <div className="bg-white p-4 sm:p-6 rounded-xl border border-slate-200 shadow-sm flex-1 lg:overflow-y-auto">
                       <div className="space-y-3 sm:space-y-4">
                         {(!editingProject.payments || editingProject.payments.length === 0) && <div className="text-center text-slate-400 text-xs py-8 font-bold border border-dashed rounded-lg bg-slate-50">無請款紀錄</div>}
                         {(editingProject.payments || []).map((pay: any) => (
                           <div key={pay.id} className={`flex flex-col p-3 sm:p-4 rounded-xl border ${pay.status === 'pending' ? 'bg-amber-50/30 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
                              <div className="flex items-center justify-between">
                                <div>
                                  <div className="font-bold text-sm sm:text-base text-slate-800">{pay.title}</div>
                                  <div className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5 font-bold">申請日: {pay.date}</div>
                                </div>
                                <div className="flex items-center gap-2 sm:gap-3">
                                   <div className="font-black text-base sm:text-xl text-slate-700">${pay.amount}</div>
                                   {pay.status === 'pending' ? (
                                      isAdmin ? (
                                        <button onClick={() => handleApprovePayment(pay.id)} className="bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-[10px] sm:text-xs px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg shadow-sm">核准</button>
                                      ) : <span className="text-[10px] text-amber-600 font-bold bg-amber-100 px-2 py-1 rounded">待核准</span>
                                   ) : (
                                      <span className="bg-emerald-100 text-emerald-700 font-bold text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 rounded flex items-center gap-1"><CheckCircle size={12}/> 已付</span>
                                   )}
                                   {isAdmin && <button onClick={() => handleDeletePayment(pay.id, pay.title)} className="text-slate-300 hover:text-red-500 p-1 bg-white rounded shadow-sm border border-slate-200"><Trash2 size={14}/></button>}
                                </div>
                              </div>
                              
                              {/* 🌟 備註顯示區塊 */}
                              {(pay.note || pay.approveNote) && (
                                <div className="mt-3 border-t border-slate-200 pt-2 space-y-1.5">
                                  {pay.note && <div className="text-[10px] sm:text-xs text-slate-600 bg-white p-1.5 rounded border border-slate-100"><span className="font-bold text-slate-400">申請說明：</span>{pay.note}</div>}
                                  {pay.approveNote && <div className="text-[10px] sm:text-xs text-emerald-700 bg-emerald-50/50 p-1.5 rounded border border-emerald-100"><span className="font-bold text-emerald-500">撥款備註：</span>{pay.approveNote}</div>}
                                </div>
                              )}
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
