import React, { useState, useMemo } from "react";
import {
  Calendar, CheckCircle, Plus, X, MessageSquare, Layout, Filter, 
  FileText, Save, History, HardHat, AlertTriangle, ArrowRight, Building2, UserCircle
} from "lucide-react";

// ==========================================
// 🎨 單位與專屬顏色設定 (依照您的需求更新)
// ==========================================
const UNITS = ["建築師", "縣府", "代書"];

const UNIT_COLORS: Record<string, { bg: string, text: string, bar: string, border: string }> = {
  "建築師": { bg: "bg-blue-50", text: "text-blue-700", bar: "bg-blue-500", border: "border-blue-200" },
  "縣府": { bg: "bg-red-50", text: "text-red-700", bar: "bg-red-500", border: "border-red-200" },
  "代書": { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", border: "border-emerald-200" }
};

// ==========================================
// 📦 初始模擬資料 (展示用，加入了廠商與聯絡人)
// ==========================================
const INITIAL_PROJECTS = [
  {
    id: "p1",
    name: "基地地質鑽探與測量",
    unit: "建築師",
    vendor: "大華地質探勘公司",
    contact: "陳經理 0912-345678",
    startDate: "2026-01-10",
    endDate: "2026-02-28",
    progress: 100,
    status: "已完工",
    logs: [
      { id: 3, date: "2026-02-28", content: "正式提交地質鑽探報告，結案。", type: "success" },
      { id: 2, date: "2026-02-25", content: "完成所有點位採樣，報告撰寫中。", type: "info" },
      { id: 1, date: "2026-01-10", content: "工程團隊進場，開始第一點位鑽探。", type: "info" }
    ]
  },
  {
    id: "p2",
    name: "建照申請與圖說審查",
    unit: "縣府",
    vendor: "縣府建管科",
    contact: "承辦人 林小姐 (分機 204)",
    startDate: "2026-02-15",
    endDate: "2026-06-15",
    progress: 60,
    status: "進行中",
    logs: [
      { id: 4, date: "2026-05-01", content: "水保計畫補件完成，等待複審。", type: "info" },
      { id: 3, date: "2026-04-12", content: "【工期展延】預計審查時間拉長，申請展延 30 天。", type: "date_change", oldDate: "2026-05-15", newDate: "2026-06-15" },
      { id: 2, date: "2026-04-10", content: "縣府建管科初審退件，要求補齊水保計畫。", type: "warning" },
      { id: 1, date: "2026-02-15", content: "建築師正式掛件遞交建照申請。", type: "info" }
    ]
  },
  {
    id: "p3",
    name: "土地鑑界與過戶處理",
    unit: "代書",
    vendor: "安心地政士事務所",
    contact: "王代書",
    startDate: "2026-05-01",
    endDate: "2026-08-30",
    progress: 15,
    status: "進行中",
    logs: [
      { id: 1, date: "2026-05-01", content: "地政事務所已排定鑑界日期。", type: "info" }
    ]
  }
];

export default function EngineeringApp() {
  const [projects, setProjects] = useState<any[]>(INITIAL_PROJECTS);
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(2026);
  const [filterUnit, setFilterUnit] = useState("all");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  
  // 新增日誌的表單狀態
  const todayStr = new Date().toISOString().split("T")[0];
  const [newLog, setNewLog] = useState({ 
    date: todayStr, 
    content: "", 
    updateProgress: false, 
    newProgress: 0, 
    updateEndDate: false, 
    newEndDate: "" 
  });

  // ==========================================
  // 1️⃣ 過濾與排序邏輯 (依開始時間自動排序)
  // ==========================================
  const sortedAndFilteredProjects = useMemo(() => {
    return projects
      .filter(p => {
        const passYear = p.startDate.startsWith(String(selectedYear)) || p.endDate.startsWith(String(selectedYear));
        const passUnit = filterUnit === "all" || p.unit === filterUnit;
        return passYear && passUnit;
      })
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }, [projects, selectedYear, filterUnit]);

  // ==========================================
  // 2️⃣ 計算甘特圖長條圖的位置與寬度
  // ==========================================
  const getBarStyles = (startDate: string, endDate: string) => {
    if (!startDate || !endDate) return { left: '0%', width: '0%' };
    const yearStart = new Date(`${selectedYear}-01-01`).getTime();
    const yearEnd = new Date(`${selectedYear}-12-31`).getTime();
    const totalYearTime = yearEnd - yearStart;
    
    const start = new Date(startDate).getTime();
    const end = new Date(endDate).getTime();
    
    const validStart = Math.max(yearStart, start);
    const validEnd = Math.min(yearEnd, end);
    
    let left = ((validStart - yearStart) / totalYearTime) * 100;
    let width = ((validEnd - validStart) / totalYearTime) * 100;
    
    if (width < 0.5) width = 0.5; // 至少顯示一點點
    return { left: `${left}%`, width: `${width}%` };
  };

  // 開啟新增專案視窗
  const handleOpenCreate = () => {
    setEditingProject({
      id: "p_" + Date.now(),
      name: "",
      unit: "建築師",
      vendor: "",    // 新增廠商欄位
      contact: "",   // 新增聯絡人欄位
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-03-31`,
      progress: 0,
      status: "規劃中",
      logs: []
    });
    setIsModalOpen(true);
    resetLogForm();
  };

  // 儲存專案 (新增或更新)
  const handleSaveProject = () => {
    if (!editingProject.name) { alert("請輸入工程名稱！"); return; }
    if (!editingProject.startDate || !editingProject.endDate) { alert("請選擇完整的起訖日期！"); return; }
    
    const isExisting = projects.some(p => p.id === editingProject.id);
    if (isExisting) {
      setProjects(projects.map(p => p.id === editingProject.id ? editingProject : p));
    } else {
      // 確保新建專案有一筆初始紀錄
      const newProj = { ...editingProject };
      newProj.logs = [{ id: Date.now(), date: todayStr, content: "工程專案建立並排入年度計畫。", type: "info" }];
      setProjects([...projects, newProj]);
    }
    setIsModalOpen(false);
  };

  const resetLogForm = () => {
    setNewLog({ 
      date: todayStr, 
      content: "", 
      updateProgress: false, 
      newProgress: editingProject?.progress || 0, 
      updateEndDate: false, 
      newEndDate: editingProject?.endDate || "" 
    });
  };

  // ==========================================
  // 3️⃣ 提交進度回報 (核心功能)
  // ==========================================
  const handleAddLog = () => {
    if (!newLog.content.trim()) { alert("請輸入回報內容！"); return; }

    let updatedProject = { ...editingProject };
    let newLogEntries = [...(updatedProject.logs || [])];

    // 處理日期展延 (自動產生系統紀錄)
    if (newLog.updateEndDate && newLog.newEndDate && newLog.newEndDate !== updatedProject.endDate) {
      newLogEntries.unshift({
        id: Date.now() + 1,
        date: newLog.date,
        content: `【工期展延】預計完工日由 ${updatedProject.endDate} 變更為 ${newLog.newEndDate}。`,
        type: "date_change",
        oldDate: updatedProject.endDate,
        newDate: newLog.newEndDate
      });
      updatedProject.endDate = newLog.newEndDate;
    }

    // 處理使用者文字回報
    newLogEntries.unshift({
      id: Date.now(),
      date: newLog.date,
      content: newLog.content,
      type: (newLog.updateProgress && newLog.newProgress === 100) ? "success" : "info"
    });

    // 更新進度
    if (newLog.updateProgress) {
      updatedProject.progress = Number(newLog.newProgress);
      if (updatedProject.progress === 100) updatedProject.status = "已完工";
      else if (updatedProject.progress > 0) updatedProject.status = "進行中";
    }

    // 確保紀錄按照日期由新到舊排序
    updatedProject.logs = newLogEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    setEditingProject(updatedProject);
    
    // 如果是現有專案，立刻同步到主列表 (避免關閉視窗後沒存到)
    if (projects.some(p => p.id === updatedProject.id)) {
       setProjects(projects.map(p => p.id === updatedProject.id ? updatedProject : p));
    }
    resetLogForm();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans pb-12">
      
      {/* ================= Header ================= */}
      <header className="bg-slate-800 shadow-md sticky top-0 z-20 text-white">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <HardHat className="w-7 h-7 text-amber-400" />
            <h1 className="font-black text-xl tracking-wide hidden md:block">工程進度追蹤系統</h1>
            <select 
              className="ml-4 bg-slate-700 border border-slate-600 text-white font-bold rounded-lg focus:ring-amber-500 p-1.5 outline-none cursor-pointer"
              value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}
            >
              {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y} 年度甘特圖</option>)}
            </select>
          </div>
          <button 
            onClick={handleOpenCreate} 
            className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2 shadow-sm transition-colors"
          >
            <Plus className="w-4 h-4" /> 新增工程項目
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        
        {/* ================= 數據看板 ================= */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-slate-500 text-sm font-bold mb-1">年度總專案數</div>
            <div className="text-3xl font-black text-slate-800">{sortedAndFilteredProjects.length}</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-emerald-500 text-sm font-bold mb-1">已完工</div>
            <div className="text-3xl font-black text-emerald-600">{sortedAndFilteredProjects.filter(p => p.progress === 100).length}</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-blue-500 text-sm font-bold mb-1">施工 / 進行中</div>
            <div className="text-3xl font-black text-blue-600">{sortedAndFilteredProjects.filter(p => p.progress > 0 && p.progress < 100).length}</div>
          </div>
          <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-200">
            <div className="text-amber-500 text-sm font-bold mb-1">未開工 (規劃中)</div>
            <div className="text-3xl font-black text-amber-600">{sortedAndFilteredProjects.filter(p => p.progress === 0).length}</div>
          </div>
        </div>

        {/* ================= 單位篩選圖例 ================= */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-3 items-center text-sm">
            <span className="font-bold text-slate-600 flex items-center gap-1"><Filter className="w-4 h-4"/> 分類篩選：</span>
            <button onClick={() => setFilterUnit("all")} className={`px-4 py-1.5 rounded-full font-bold border transition-all ${filterUnit === "all" ? "bg-slate-800 text-white border-slate-800 shadow-md" : "bg-white text-slate-600 hover:bg-slate-100"}`}>全部顯示</button>
            {UNITS.map(unit => (
              <button 
                key={unit} 
                onClick={() => setFilterUnit(unit)}
                className={`px-4 py-1.5 rounded-full font-bold border transition-all flex items-center gap-2
                  ${filterUnit === unit ? 'ring-2 ring-offset-2 ring-slate-400 shadow-md scale-105' : 'opacity-80 hover:opacity-100'}
                  ${UNIT_COLORS[unit]?.bg} ${UNIT_COLORS[unit]?.text} ${UNIT_COLORS[unit]?.border}
                `}
              >
                <span className={`w-2.5 h-2.5 rounded-full ${UNIT_COLORS[unit]?.bar}`}></span> {unit}
              </button>
            ))}
          </div>
        </div>

        {/* ================= 🌟 年度甘特圖 🌟 ================= */}
        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
            <h2 className="text-lg font-black flex items-center gap-2 text-slate-800"><Calendar className="w-5 h-5 text-slate-600" /> {selectedYear} 年度工程進度總覽</h2>
            <span className="text-xs font-bold text-slate-500 bg-white px-3 py-1 border rounded-full shadow-sm">自動依開工日排序</span>
          </div>
          
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              {/* 月份標頭 */}
              <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
                <div className="w-80 flex-shrink-0 p-3 border-r border-slate-200 font-bold text-slate-600 text-sm flex items-center justify-center bg-slate-50">工程項目與廠商資訊</div>
                <div className="flex-1 grid grid-cols-12">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (
                    <div key={m} className="border-r border-slate-100 p-2 text-center text-xs font-bold text-slate-500 bg-slate-50">{m}月</div>
                  ))}
                </div>
              </div>
              
              {/* 專案長條圖區塊 */}
              <div className="relative bg-slate-50/30">
                {/* 垂直格線 */}
                <div className="absolute inset-0 flex ml-80 pointer-events-none">
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (<div key={`bg-${m}`} className="flex-1 border-r border-slate-200/50 block"></div>))}
                </div>
                
                <div className="relative z-10">
                  {sortedAndFilteredProjects.length === 0 && (
                    <div className="py-16 text-center text-slate-400 font-bold">該條件下目前無工程專案</div>
                  )}
                  {sortedAndFilteredProjects.map((p) => {
                    const colorSet = UNIT_COLORS[p.unit] || UNIT_COLORS["建築師"];
                    const styles = getBarStyles(p.startDate, p.endDate);
                    
                    return (
                      <div 
                        key={p.id} 
                        className="flex items-stretch group cursor-pointer border-b border-slate-100 hover:bg-white transition-colors" 
                        onClick={() => { setEditingProject({ ...p }); setIsModalOpen(true); resetLogForm(); }}
                      >
                        {/* 左側資訊區 */}
                        <div className="w-80 flex-shrink-0 p-3 border-r border-slate-200 bg-white group-hover:bg-slate-50 transition-colors flex flex-col justify-center">
                          <div className="font-bold text-sm text-slate-800 truncate mb-1.5" title={p.name}>{p.name}</div>
                          <div className="flex items-center gap-2 text-xs mb-1.5">
                            <span className={`px-1.5 py-0.5 rounded font-bold border ${colorSet.bg} ${colorSet.text} ${colorSet.border}`}>{p.unit}</span>
                            <span className="text-slate-500 font-medium">{p.startDate.substring(5).replace('-','/')} ~ {p.endDate.substring(5).replace('-','/')}</span>
                          </div>
                          {/* 廠商與聯絡人顯示 */}
                          <div className="flex items-center gap-3 text-[11px] text-slate-500 truncate mt-0.5">
                            {p.vendor && <span className="flex items-center gap-1 truncate" title={p.vendor}><Building2 className="w-3 h-3 text-slate-400"/> {p.vendor}</span>}
                            {p.contact && <span className="flex items-center gap-1 truncate" title={p.contact}><UserCircle className="w-3 h-3 text-slate-400"/> {p.contact}</span>}
                          </div>
                        </div>
                        
                        {/* 右側甘特圖區 */}
                        <div className="flex-1 relative py-3">
                          <div 
                            className={`absolute top-1/2 -translate-y-1/2 h-8 rounded-md shadow-sm transition-all flex items-center overflow-hidden border ${colorSet.bar} border-black/10 hover:brightness-110 hover:shadow-md cursor-pointer`} 
                            style={styles}
                          >
                            {/* 進度填色區塊 */}
                            <div className="absolute left-0 top-0 bottom-0 bg-white/25" style={{ width: `${p.progress}%` }}></div>
                            <span className="relative z-10 px-2 text-[11px] font-bold text-white drop-shadow-md whitespace-nowrap">
                              {p.progress}% {p.progress === 100 && '✔'}
                            </span>
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
      {/* 💥 專案管理與進度回報 Modal 💥 */}
      {/* ================================================== */}
      {isModalOpen && editingProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200">
            
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 z-10">
              <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
                <FileText className="w-6 h-6 text-slate-600"/> 
                {editingProject.id.startsWith("p_") ? "新增工程專案" : "工程進度總覽與回報"}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 p-1.5 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col lg:flex-row gap-6">
              
              {/* ---------------- 左側：基本資訊編輯 ---------------- */}
              <div className="flex-1 space-y-5 bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                <h3 className="font-black text-slate-800 border-b-2 border-slate-100 pb-3 flex items-center gap-2"><Layout className="w-5 h-5 text-indigo-500"/> 工程基本設定</h3>
                
                <div>
                  <label className="block text-xs font-bold text-slate-500 mb-1.5">工程/專案名稱 <span className="text-red-500">*</span></label>
                  <input type="text" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all" value={editingProject.name} onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })} placeholder="例如：主體結構工程" />
                </div>
                
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">分類標籤</label>
                    <select className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500 transition-all" value={editingProject.unit} onChange={(e) => setEditingProject({ ...editingProject, unit: e.target.value })}>
                      {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">負責廠商 (選填)</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500" value={editingProject.vendor || ''} onChange={(e) => setEditingProject({ ...editingProject, vendor: e.target.value })} placeholder="如: 聯華營造" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">聯繫人員 (選填)</label>
                    <input type="text" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-sm font-bold text-slate-800 outline-none focus:bg-white focus:border-indigo-500" value={editingProject.contact || ''} onChange={(e) => setEditingProject({ ...editingProject, contact: e.target.value })} placeholder="如: 陳主任 09XX" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">預計開工日 <span className="text-red-500">*</span></label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500" value={editingProject.startDate} onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1.5">預計完工日 <span className="text-red-500">*</span></label>
                    <input type="date" className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium text-slate-800 outline-none focus:bg-white focus:border-indigo-500" value={editingProject.endDate} onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })} />
                  </div>
                </div>

                <div className="pt-2">
                  <label className="flex justify-between items-end mb-2">
                     <span className="text-xs font-bold text-slate-500">目前總體進度</span>
                     <span className="text-lg font-black text-indigo-700">{editingProject.progress}%</span>
                  </label>
                  <div className="w-full bg-slate-100 rounded-full h-4 border border-slate-200 overflow-hidden relative">
                    <div className="bg-indigo-500 h-full transition-all duration-500 ease-out" style={{ width: `${editingProject.progress}%` }}></div>
                  </div>
                </div>

                <button type="button" onClick={handleSaveProject} className="w-full mt-2 bg-slate-800 hover:bg-slate-900 text-white py-3 rounded-lg font-bold flex justify-center items-center gap-2 transition-colors shadow-md">
                  <Save className="w-4 h-4"/> 儲存基本資料
                </button>
              </div>

              {/* ---------------- 右側：進度回報與歷史紀錄 ---------------- */}
              <div className="flex-[1.5] flex flex-col gap-6">
                
                {/* 📝 新增回報區塊 */}
                <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                  <h3 className="font-black text-indigo-900 mb-4 flex items-center gap-2 text-lg"><Edit className="w-5 h-5"/> 隨時更新最新進度</h3>
                  
                  <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                      <input type="date" className="border border-slate-300 bg-slate-50 rounded-lg p-2 text-sm font-bold w-full sm:w-40 outline-none focus:border-indigo-500" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})}/>
                      <span className="text-xs text-slate-500 font-bold bg-slate-100 px-2 py-1 rounded">記錄發生的日期</span>
                    </div>
                    
                    <textarea 
                      rows={3} 
                      className="w-full border border-slate-300 bg-slate-50 rounded-lg p-3 text-sm font-medium outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 resize-none transition-all" 
                      placeholder="請輸入目前的進度狀況、發生的事件或卡關原因..."
                      value={newLog.content}
                      onChange={e => setNewLog({...newLog, content: e.target.value})}
                    ></textarea>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {/* 進度更新 */}
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col gap-3 transition-colors hover:border-indigo-300">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 text-indigo-600 rounded cursor-pointer" checked={newLog.updateProgress} onChange={e => setNewLog({...newLog, updateProgress: e.target.checked})} />
                          <span className="text-sm font-bold text-slate-700">同步更新進度 %</span>
                        </label>
                        {newLog.updateProgress && (
                          <div className="flex items-center gap-3 pt-1">
                            <input type="range" min="0" max="100" className="flex-1 cursor-pointer accent-indigo-600" value={newLog.newProgress} onChange={e => setNewLog({...newLog, newProgress: Number(e.target.value)})} />
                            <span className="font-black text-indigo-700 w-12 text-right bg-white border px-1 py-0.5 rounded">{newLog.newProgress}%</span>
                          </div>
                        )}
                      </div>

                      {/* 工期展延 */}
                      <div className={`p-4 rounded-lg border flex flex-col gap-3 transition-colors ${newLog.updateEndDate ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-slate-200 hover:border-red-300'}`}>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input type="checkbox" className="w-4 h-4 text-red-600 rounded cursor-pointer" checked={newLog.updateEndDate} onChange={e => setNewLog({...newLog, updateEndDate: e.target.checked})} />
                          <span className="text-sm font-bold text-slate-700">變更完工日 (展延)</span>
                        </label>
                        {newLog.updateEndDate && (
                          <div className="flex flex-col gap-1.5 pt-1">
                            <span className="text-xs text-red-600 font-bold flex items-center gap-1"><AlertTriangle className="w-3 h-3"/> 新完工日：</span>
                            <input type="date" className="border border-red-300 bg-white rounded p-1.5 text-sm font-bold text-red-800 outline-none focus:ring-2 focus:ring-red-200" value={newLog.newEndDate} onChange={e => setNewLog({...newLog, newEndDate: e.target.value})} />
                          </div>
                        )}
                      </div>
                    </div>

                    <button onClick={handleAddLog} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-lg text-sm flex justify-center items-center gap-2 transition-all shadow-md hover:shadow-lg">
                      <MessageSquare className="w-4 h-4"/> 送出進度回報
                    </button>
                  </div>
                </div>

                {/* ⏳ 歷史時間軸 */}
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex-1">
                  <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 text-lg border-b-2 border-slate-100 pb-3"><History className="w-5 h-5 text-slate-500"/> 工程歷程時間軸</h3>
                  
                  {(!editingProject.logs || editingProject.logs.length === 0) ? (
                    <div className="text-center text-slate-400 py-10 font-bold bg-slate-50 rounded-lg border border-dashed border-slate-300">尚未有任何進度回報紀錄</div>
                  ) : (
                    <div className="border-l-2 border-slate-200 ml-4 pl-6 space-y-6">
                      {editingProject.logs.map((log: any) => (
                        <div key={log.id} className="relative">
                          {/* 時間軸節點圓圈 */}
                          <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm
                            ${log.type === 'success' ? 'bg-emerald-500' : 
                              log.type === 'warning' ? 'bg-amber-500' : 
                              log.type === 'date_change' ? 'bg-red-500 ring-2 ring-red-200' : 'bg-indigo-500'}
                          `}></div>
                          
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-black text-slate-500 flex items-center gap-2">
                              {log.date} 
                              {log.type === 'date_change' && <span className="bg-red-100 text-red-700 px-1.5 py-0.5 rounded text-[10px]">時程變更</span>}
                              {log.type === 'success' && <span className="bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded text-[10px]">階段完成</span>}
                            </span>
                            
                            <div className={`text-sm font-medium p-3.5 rounded-lg border shadow-sm leading-relaxed
                              ${log.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 
                                log.type === 'warning' ? 'bg-amber-50 text-amber-900 border-amber-200' : 
                                log.type === 'date_change' ? 'bg-red-50 text-red-900 border-red-300 font-bold' : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-white transition-colors'}
                            `}>
                              {log.content}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
