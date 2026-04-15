import React, { useState, useMemo } from "react";
import {
  Calendar, CheckCircle, Plus, X, MessageSquare, Layout, Filter, 
  FileText, Save, History, Construction, AlertTriangle, Building2, UserCircle
} from "lucide-react";

// ==========================================
// 🎨 分類與顏色設定 (簡化為建築師、縣府、代書)
// ==========================================
const UNITS = ["建築師", "縣府", "代書"];

const UNIT_COLORS: Record<string, { bg: string, text: string, bar: string, border: string }> = {
  "建築師": { bg: "bg-blue-50", text: "text-blue-700", bar: "bg-blue-500", border: "border-blue-200" },
  "縣府": { bg: "bg-red-50", text: "text-red-700", bar: "bg-red-500", border: "border-red-200" },
  "代書": { bg: "bg-emerald-50", text: "text-emerald-700", bar: "bg-emerald-500", border: "border-emerald-200" }
};

// ==========================================
// 📦 預設模擬資料
// ==========================================
const INITIAL_DATA = [
  {
    id: "p1", name: "地質鑽探報告", unit: "建築師", vendor: "大華探勘", contact: "陳主任", 
    startDate: "2026-01-10", endDate: "2026-02-28", progress: 100, status: "已完工",
    logs: [{ id: 1, date: "2026-02-28", content: "報告正式核定。", type: "success" }]
  },
  {
    id: "p2", name: "建照補件審查", unit: "縣府", vendor: "縣府建管科", contact: "林小姐", 
    startDate: "2026-03-01", endDate: "2026-05-15", progress: 40, status: "進行中",
    logs: [{ id: 1, date: "2026-03-15", content: "補件掛號完成。", type: "info" }]
  }
];

export default function EngineeringApp() {
  const [projects, setProjects] = useState<any[]>(INITIAL_DATA);
  const [selectedYear, setSelectedYear] = useState(2026);
  const [filterUnit, setFilterUnit] = useState("all");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  
  const todayStr = new Date().toISOString().split("T")[0];
  const [newLog, setNewLog] = useState({ date: todayStr, content: "", updateProgress: false, newProgress: 0, updateEndDate: false, newEndDate: "" });

  // 1️⃣ 排序與過濾
  const filteredList = useMemo(() => {
    return projects
      .filter(p => (p.startDate?.startsWith(String(selectedYear)) || p.endDate?.startsWith(String(selectedYear))) && (filterUnit === "all" || p.unit === filterUnit))
      .sort((a, b) => new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime());
  }, [projects, selectedYear, filterUnit]);

  // 2️⃣ 甘特圖計算
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

  // 3️⃣ 視窗操作
  const handleOpenEdit = (p: any) => {
    const target = { ...p };
    setEditingProject(target);
    setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: target.progress || 0, updateEndDate: false, newEndDate: target.endDate || "" });
    setIsModalOpen(true);
  };

  const handleOpenCreate = () => {
    const newProj = { id: "p_" + Date.now(), name: "", unit: "建築師", vendor: "", contact: "", startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-03-31`, progress: 0, status: "規劃中", logs: [] };
    setEditingProject(newProj);
    setNewLog({ date: todayStr, content: "", updateProgress: false, newProgress: 0, updateEndDate: false, newEndDate: newProj.endDate });
    setIsModalOpen(true);
  };

  const handleSave = () => {
    if (!editingProject?.name) return alert("請輸入名稱");
    const isExist = projects.some(p => p.id === editingProject.id);
    if (isExist) setProjects(projects.map(p => p.id === editingProject.id ? editingProject : p));
    else setProjects([...projects, { ...editingProject, logs: [{ id: Date.now(), date: todayStr, content: "建立工程專案。", type: "info" }] }]);
    setIsModalOpen(false);
  };

  const handleAddLog = () => {
    if (!newLog.content.trim()) return alert("請輸入內容");
    let updated = { ...editingProject };
    let logs = [...(updated.logs || [])];

    if (newLog.updateEndDate && newLog.newEndDate !== updated.endDate) {
      logs.unshift({ id: Date.now()+1, date: newLog.date, content: `【工期變更】完工日由 ${updated.endDate} 改為 ${newLog.newEndDate}`, type: "date_change" });
      updated.endDate = newLog.newEndDate;
    }
    logs.unshift({ id: Date.now(), date: newLog.date, content: newLog.content, type: (newLog.updateProgress && newLog.newProgress === 100) ? "success" : "info" });
    if (newLog.updateProgress) { updated.progress = Number(newLog.newProgress); updated.status = updated.progress === 100 ? "已完工" : "進行中"; }
    updated.logs = logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setEditingProject(updated);
    setProjects(projects.map(p => p.id === updated.id ? updated : p));
    setNewLog({ ...newLog, content: "", updateProgress: false, updateEndDate: false });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 pb-12">
      <header className="bg-slate-800 shadow-md sticky top-0 z-20 text-white p-4 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Construction className="w-7 h-7 text-amber-400" /><h1 className="font-black text-xl hidden md:block">工程進度系統</h1>
          <select className="bg-slate-700 border-none text-white font-bold rounded p-1" value={selectedYear} onChange={e => setSelectedYear(Number(e.target.value))}>
            {[2025, 2026, 2027].map(y => <option key={y} value={y}>{y} 年度</option>)}
          </select>
        </div>
        <button onClick={handleOpenCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-900 px-4 py-2 rounded-lg text-sm font-black flex items-center gap-2 transition-all shadow-md active:scale-95">+ 新增工程項目</button>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-wrap gap-4 items-center">
          <span className="font-bold text-slate-600 text-sm">分類篩選：</span>
          <button onClick={() => setFilterUnit("all")} className={`px-4 py-1 rounded-full text-xs font-bold border ${filterUnit === 'all' ? 'bg-slate-800 text-white' : 'bg-white'}`}>全部</button>
          {UNITS.map(u => (
            <button key={u} onClick={() => setFilterUnit(u)} className={`px-4 py-1 rounded-full text-xs font-bold border transition-all ${filterUnit === u ? 'ring-2 ring-slate-800 ' + UNIT_COLORS[u].bg + ' ' + UNIT_COLORS[u].text : 'bg-white'}`}>
              {u}
            </button>
          ))}
        </div>

        <section className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="overflow-x-auto">
            <div className="min-w-[1000px]">
              <div className="flex border-b bg-slate-50 font-bold text-xs text-slate-500">
                <div className="w-80 p-3 border-r">工程項目 / 負責廠商</div>
                <div className="flex-1 grid grid-cols-12 text-center">{[1,2,3,4,5,6,7,8,9,10,11,12].map(m => <div key={m} className="p-2 border-r last:border-0">{m}月</div>)}</div>
              </div>
              {filteredList.map(p => {
                const color = UNIT_COLORS[p.unit] || UNIT_COLORS["建築師"];
                return (
                  <div key={p.id} className="flex border-b last:border-0 hover:bg-slate-50 cursor-pointer group" onClick={() => handleOpenEdit(p)}>
                    <div className="w-80 p-3 border-r bg-white flex flex-col justify-center gap-1">
                      <div className="font-bold text-sm text-slate-800">{p.name}</div>
                      <div className="flex items-center gap-2 text-[10px]">
                        <span className={`px-1 rounded font-bold ${color.bg} ${color.text} border ${color.border}`}>{p.unit}</span>
                        <span className="text-slate-400 font-bold">{p.startDate?.substring(5)}~{p.endDate?.substring(5)}</span>
                      </div>
                      {(p.vendor || p.contact) && <div className="text-[10px] text-slate-500 flex gap-2 truncate mt-1">
                        {p.vendor && <span className="flex items-center gap-0.5"><Building2 size={10}/>{p.vendor}</span>}
                        {p.contact && <span className="flex items-center gap-0.5"><UserCircle size={10}/>{p.contact}</span>}
                      </div>}
                    </div>
                    <div className="flex-1 relative py-4">
                      <div className={`absolute top-1/2 -translate-y-1/2 h-7 rounded shadow-sm border border-black/5 flex items-center overflow-hidden transition-all group-hover:brightness-110 ${color.bar}`} style={getBarStyles(p.startDate, p.endDate)}>
                        <div className="absolute left-0 h-full bg-white/30" style={{ width: `${p.progress}%` }}></div>
                        <span className="relative z-10 px-2 text-[10px] font-black text-white drop-shadow-sm">{p.progress}%</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      </main>

      {isModalOpen && editingProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl flex flex-col max-h-[95vh] overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
            <div className="px-6 py-4 border-b bg-slate-50 flex justify-between items-center">
              <h2 className="text-lg font-black text-slate-800 flex items-center gap-2"><FileText className="text-slate-500" /> {editingProject.name || "新增工程"}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-800 bg-white border rounded p-1"><X size={20} /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-slate-100 flex flex-col lg:flex-row gap-6">
              <div className="flex-1 space-y-5 bg-white p-6 rounded-xl border border-slate-200 h-fit">
                <h3 className="font-black text-slate-800 border-b pb-3 flex items-center gap-2"><Layout className="text-indigo-500" size={18}/> 工程基本設定</h3>
                <div><label className="block text-[10px] font-bold text-slate-400 mb-1">工程名稱</label><input className="w-full border rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-slate-50" value={editingProject.name} onChange={e => setEditingProject({...editingProject, name: e.target.value})} placeholder="例如：主體結構" /></div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-bold text-slate-400 mb-1">分類</label><select className="w-full border rounded-lg p-2 font-bold text-slate-800 outline-none focus:border-indigo-500 bg-slate-50" value={editingProject.unit} onChange={e => setEditingProject({...editingProject, unit: e.target.value})}>{UNITS.map(u => <option key={u} value={u}>{u}</option>)}</select></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 mb-1">進度 %</label><div className="font-black text-xl text-indigo-600 p-1">{editingProject.progress}%</div></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-bold text-slate-400 mb-1">負責廠商</label><input className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50" value={editingProject.vendor} onChange={e => setEditingProject({...editingProject, vendor: e.target.value})} placeholder="廠商名稱" /></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 mb-1">聯繫人員</label><input className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50" value={editingProject.contact} onChange={e => setEditingProject({...editingProject, contact: e.target.value})} placeholder="聯絡人與電話" /></div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-[10px] font-bold text-slate-400 mb-1">開工日期</label><input type="date" className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50" value={editingProject.startDate} onChange={e => setEditingProject({...editingProject, startDate: e.target.value})} /></div>
                  <div><label className="block text-[10px] font-bold text-slate-400 mb-1">預計完工</label><input type="date" className="w-full border rounded-lg p-2 text-sm font-bold bg-slate-50" value={editingProject.endDate} onChange={e => setEditingProject({...editingProject, endDate: e.target.value})} /></div>
                </div>
                <button onClick={handleSave} className="w-full bg-slate-800 text-white py-3 rounded-xl font-bold hover:bg-slate-900 shadow-md flex items-center justify-center gap-2"><Save size={18}/> 儲存基本資料</button>
              </div>
              <div className="flex-[1.5] flex flex-col gap-6">
                <div className="bg-white p-6 rounded-xl border border-indigo-100 shadow-md relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500"></div>
                  <h3 className="font-black text-indigo-900 mb-4 flex items-center gap-2 text-lg">隨時更新最新進度</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3"><input type="date" className="border rounded p-2 text-sm font-bold w-40" value={newLog.date} onChange={e => setNewLog({...newLog, date: e.target.value})} /><span className="text-[10px] font-bold text-slate-400">事件日期</span></div>
                    <textarea rows={3} className="w-full border rounded-lg p-3 text-sm font-medium bg-slate-50 outline-none focus:border-indigo-500" placeholder="發生了什麼事？進度到哪了？" value={newLog.content} onChange={e => setNewLog({...newLog, content: e.target.value})} />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-600 mb-2"><input type="checkbox" className="w-4 h-4" checked={newLog.updateProgress} onChange={e => setNewLog({...newLog, updateProgress: e.target.checked})} /> 更新進度 %</label>
                        {newLog.updateProgress && <div className="flex items-center gap-2"><input type="range" className="flex-1" value={newLog.newProgress} onChange={e => setNewLog({...newLog, newProgress: Number(e.target.value)})} /><span className="font-black text-indigo-600 w-8">{newLog.newProgress}%</span></div>}
                      </div>
                      <div className={`p-4 rounded-lg border ${newLog.updateEndDate ? 'bg-red-50 border-red-300' : 'bg-slate-50'}`}>
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-sm text-slate-600 mb-2"><input type="checkbox" className="w-4 h-4" checked={newLog.updateEndDate} onChange={e => setNewLog({...newLog, updateEndDate: e.target.checked})} /> 工期變更 (展延)</label>
                        {newLog.updateEndDate && <input type="date" className="w-full border rounded p-1 font-bold text-red-600" value={newLog.newEndDate} onChange={e => setNewLog({...newLog, newEndDate: e.target.value})} />}
                      </div>
                    </div>
                    <button onClick={handleAddLog} className="w-full bg-indigo-600 text-white font-bold py-3 rounded-xl hover:bg-indigo-700 shadow-md">送出進度回報</button>
                  </div>
                </div>
                <div className="bg-white p-6 rounded-xl border border-slate-200 flex-1">
                  <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2 border-b pb-3 text-lg"><History className="text-slate-400" /> 工程歷程時間軸</h3>
                  <div className="border-l-2 border-slate-100 ml-3 pl-6 space-y-6">
                    {(editingProject.logs || []).map((log: any) => (
                      <div key={log.id} className="relative">
                        <div className={`absolute -left-[31px] top-1 w-4 h-4 rounded-full border-2 border-white shadow-sm ${log.type === 'success' ? 'bg-emerald-500' : log.type === 'date_change' ? 'bg-red-500' : 'bg-indigo-500'}`}></div>
                        <div className="text-[10px] font-black text-slate-400 mb-1">{log.date} {log.type === 'date_change' && <span className="text-red-500 ml-2">● 時程變更</span>}</div>
                        <div className={`text-sm font-medium p-3 rounded-lg border ${log.type === 'date_change' ? 'bg-red-50 border-red-200 text-red-900 font-bold' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>{log.content}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
