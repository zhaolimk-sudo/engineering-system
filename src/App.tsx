import React, { useState, useMemo, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import * as XLSX from "xlsx";
import {
  Calendar, Clock, CheckCircle, AlertCircle, User, Edit, Plus, X,
  MessageSquare, List, Layout, UploadCloud, DownloadCloud, FileText,
  FileSearch, Check, FileDown, CalendarDays, Printer, FileType2, Trash2,
  Lock, UserCircle, Settings, LogOut, ShieldCheck, ArrowRight, PenTool,
  ClipboardList, CheckSquare, PlayCircle, Milestone, Filter, Key,
  Percent
} from "lucide-react";

// ==========================================
// 🔴 Supabase 連線資訊
// ==========================================
const SUPABASE_URL = "https://mksmrupvgkehvfadynee.supabase.co";
const SUPABASE_KEY = "sb_publishable_0WCOlZOefS12mmupLA5YFg_fPv_8Xn8";
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const OFFICIAL_EVENTS = [
  { date: "04-03", name: "日月潭星光螢火季 (起跑)" },
  { date: "09-12", name: "花火音樂嘉年華 (開幕)" },
  { date: "09-20", name: "日月潭國際萬人泳渡" },
  { date: "10-03", name: "環法自行車挑戰賽" },
  { date: "10-10", name: "國慶花火音樂會" },
  { date: "12-31", name: "日月潭跨年晚會煙火秀" },
];

const PUBLIC_HOLIDAYS = [
  { date: "01-01", name: "元旦" }, { date: "02-16", name: "除夕" },
  { date: "02-17", name: "春節 (初一)" }, { date: "02-18", name: "春節 (初二)" },
  { date: "02-19", name: "春節 (初三)" }, { date: "02-20", name: "春節 (初四)" },
  { date: "02-28", name: "和平紀念日" }, { date: "04-04", name: "兒童節" },
  { date: "04-05", name: "清明節" }, { date: "06-19", name: "端午節" },
  { date: "09-25", name: "中秋節" }, { date: "10-10", name: "國慶日" },
];

const PRESET_BREAKDOWN_ITEMS = ["早餐", "午餐", "下午茶", "晚餐", "宵夜", "DIY", "備品"];

const MARKETING_EVENTS = [
  { date: "02-14", name: "西洋情人節" }, { date: "05-10", name: "母親節檔期" },
  { date: "08-08", name: "父親節" }, { date: "10-31", name: "萬聖節" },
  { date: "12-25", name: "聖誕節" },
];

const DEPARTMENTS = ["客務部", "訂房組", "餐飲部", "休閒部", "業務部", "企劃部", "人資", "資訊", "總務", "採購", "財務部"];

const ROLES_INFO: any = {
  guest: { name: "訪客 (僅觀看)", color: "text-gray-500", bg: "bg-gray-100" },
  employee: { name: "部門員工", color: "text-blue-700", bg: "bg-blue-100" },
  gm: { name: "總經理", color: "text-green-700", bg: "bg-green-100" },
  admin: { name: "系統管理員", color: "text-purple-700", bg: "bg-purple-100" },
};

const YEARLY_DATA: any = {
  2026: {
    bigHolidays: ["02-14", "02-15", "02-16", "02-17", "02-18", "02-19", "02-20"],
    holidays: ["01-01", "01-02", "02-27", "02-28", "04-03", "04-04", "04-05", "05-01", "06-19", "06-20", "06-21", "09-25", "09-26", "09-27", "10-09", "10-10"],
    events: {
      "01-01": "元旦", "02-16": "除夕", "02-17": "春節 (初一)", "02-18": "春節 (初二)", "02-19": "春節 (初三)", "02-20": "春節 (初四)",
      "02-28": "和平紀念日", "04-04": "兒童節", "04-05": "清明節", "06-19": "端午節", "09-25": "中秋節", "10-10": "國慶日"
    }
  },
  2027: {
    bigHolidays: [
      "01-01", "01-02", "01-03", 
      "02-04", "02-05", "02-06", "02-07", "02-08", "02-09", "02-10", 
      "02-27", "02-28", "03-01", 
      "04-03", "04-04", "04-05", "04-06", 
      "04-30", "05-01", "05-02", 
      "06-09", "09-15", 
      "10-09", "10-10", "10-11", 
      "10-23", "10-24", "10-25", 
      "12-24", "12-25", "12-26"  
    ],
    holidays: ["09-28"], 
    events: {
      "01-01": "元旦", "02-04": "小年夜", "02-05": "除夕", "02-06": "春節 (初一)", "02-07": "春節 (初二)", "02-08": "春節 (初三)", "02-09": "春節補假", "02-10": "春節補假",
      "02-28": "和平紀念日", "04-04": "兒童節", "04-05": "清明節", "05-01": "勞動節",
      "06-09": "端午節", "09-15": "中秋節", "09-28": "教師節", "10-10": "國慶日",
      "10-25": "光復節", "12-25": "行憲紀念日"
    }
  }
};

const generateCalendar = (year: number, customEvents: any[]) => {
  const data: any = {};
  const yearData = YEARLY_DATA[year] || { bigHolidays: [], holidays: [], events: {} };

  for (let m = 1; m <= 12; m++) {
    const daysInMonth = new Date(year, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const dateObj = new Date(dateStr);
      const day = dateObj.getDay();
      const md = `${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      
      let type = (day === 6 || day === 0) ? "假日" : "平日";
      let events: string[] = [];
      let marketingEvents: string[] = [];
      
      if (yearData.bigHolidays.includes(md)) {
        type = "大假日";
      } else if (yearData.holidays.includes(md)) {
        type = "假日";
      } else if (type === "平日" && year === 2026) {
        const isWinterVacation = (m === 1 && d >= 21) || (m === 2 && d <= 13);
        const isSummerVacation = m === 7 || m === 8;
        if (day === 5 || isWinterVacation || isSummerVacation) {
          type = "旺日";
        }
      }

      if (yearData.events[md]) {
        events.push(`🧨 ${yearData.events[md]}`);
      }

      const officialEvent = OFFICIAL_EVENTS.find((e) => e.date === md);
      if (officialEvent) events.push(`✨ ${officialEvent.name}`);
      const mktEvent = MARKETING_EVENTS.find((e) => e.date === md);
      if (mktEvent) marketingEvents.push(`🎯 ${mktEvent.name}`);

      if (customEvents && customEvents.length > 0) {
        const dbMatch = customEvents.find(e => e.date === dateStr);
        if (dbMatch) {
          if (dbMatch.event_type) type = dbMatch.event_type;
          if (dbMatch.event_name) {
            const icon = dbMatch.is_public_holiday ? '🧨' : '✨';
            const customName = `${icon} ${dbMatch.event_name}`;
            if (!events.includes(customName)) {
              events.push(customName);
            }
          }
        }
      }

      data[dateStr] = { type, events, marketingEvents };
    }
  }
  return data;
};

const CAL_STYLES: any = {
  平日: { bg: "bg-white", border: "border-gray-200", text: "text-gray-800", tag: "bg-gray-100 text-gray-500" },
  旺日: { bg: "bg-blue-50/50", border: "border-blue-200", text: "text-blue-900", tag: "bg-blue-100 text-blue-600" },
  假日: { bg: "bg-pink-50/50", border: "border-pink-200", text: "text-pink-900", tag: "bg-pink-100 text-pink-600" },
  大假日: { bg: "bg-red-50", border: "border-red-300", text: "text-red-900", tag: "bg-red-500 text-white" },
};

const evaluateExpression = (expr: string) => {
  if (!expr) return 0;
  try { return new Function(`return ${String(expr).replace(/\s+/g, "").replace(/[^-()\d/*+.]/g, "")}`)() || 0; } catch (e) { return 0; }
};

const getCurrentTimeString = () => {
  const d = new Date();
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, "0")}/${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

export default function App() {
  const [view, setView] = useState("login");
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [users, setUsers] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [dbEvents, setDbEvents] = useState<any[]>([]); 
  const [isLoading, setIsLoading] = useState(true);

  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any>(null);
  const [modalMode, setModalMode] = useState("view");

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);

  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportConfig, setExportConfig] = useState({ year: currentYear, month: "all" });
  const [isPrintLayoutActive, setIsPrintLayoutActive] = useState(false);
  const [selectedDayInfo, setSelectedDayInfo] = useState<any>(null);

  const [editingUser, setEditingUser] = useState<any>(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isChangePwdModalOpen, setIsChangePwdModalOpen] = useState(false);
  const [pwdForm, setPwdForm] = useState({ old: "", new: "", confirm: "" });

  const currentMonthStr = String(new Date().getMonth() + 1);
  const [dashboardDeptFilter, setDashboardDeptFilter] = useState("all");
  const [dashboardMonthFilter, setDashboardMonthFilter] = useState(currentMonthStr);
  const [ganttDeptFilter, setGanttDeptFilter] = useState("all");
  const [ganttMonthFilter, setGanttMonthFilter] = useState("all");

  const [rememberMe, setRememberMe] = useState(() => localStorage.getItem("mpr_remember") === "true");
  const [savedAccount, setSavedAccount] = useState(() => localStorage.getItem("mpr_account") || "");
  const [savedPassword, setSavedPassword] = useState(() => localStorage.getItem("mpr_password") || "");

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const { data: usersData } = await supabase.from("users").select("*");
      if (usersData && usersData.length === 0) {
        const defaultAdmin = { id: "u1", account: "admin", password: "123", name: "管理員", role: "admin", dept: "系統" };
        await supabase.from("users").upsert(defaultAdmin);
        setUsers([defaultAdmin]);
      } else { 
        setUsers(usersData || []); 
      }

      const { data: projData } = await supabase.from("projects").select("*");
      if (projData) {
        const parsedProjects = projData.map((p: any) => {
          let bd;
          try { bd = typeof p.breakdown === "string" ? JSON.parse(p.breakdown || "[]") : (p.breakdown || []); } 
          catch (e) { bd = []; }
          
          if (!Array.isArray(bd)) {
            bd = [{ id: Date.now() + Math.random(), name: "主專案", price: bd.price || "", ota: "", items: bd.items || [], net: bd.net || "0" }];
          }

          return {
            ...p,
            projectType: p.projectType || 'leisure',
            breakdown: bd,
            countersign: typeof p.countersign === "string" ? JSON.parse(p.countersign || "[]") : (p.countersign || []),
          };
        });
        setProjects(parsedProjects);
      }

      const { data: calData } = await supabase.from("calendar_events").select("*");
      if (calData) {
        setDbEvents(calData);
      }

    } catch (e) { 
      console.error("資料載入發生錯誤:", e); 
    }
    setIsLoading(false);
  };

  const saveProjectToDb = async (proj: any) => {
    const dbProj = { ...proj, breakdown: JSON.stringify(proj.breakdown), countersign: JSON.stringify(proj.countersign), id: String(proj.id) };
    const { error } = await supabase.from("projects").upsert(dbProj);
    if (error) {
      alert(`⚠️ 儲存失敗！\n錯誤原因：${error.message}\n\n請放心，您的資料還在畫面上沒有遺失！`);
      return false;
    } else {
      fetchData();
      return true;
    }
  };

  const handleSaveDayRemark = async (dateStr: string, newRemark: string) => {
    const existing = dbEvents.find(e => e.date === dateStr);
    const payload = existing
      ? { ...existing, description: newRemark } 
      : { date: dateStr, event_name: "特殊備註", event_type: "平日", is_public_holiday: false, description: newRemark }; 

    const { error } = await supabase.from('calendar_events').upsert(payload, { onConflict: 'date' });
    if (error) {
      alert("儲存備註失敗：" + error.message);
    } else {
      alert("備註已成功儲存！");
      fetchData(); 
      setSelectedDayInfo(null);
    }
  };

  const handleSaveUser = async (e: any) => {
    e.preventDefault();
    const userId = editingUser.id || "u_" + Date.now();
    const userToSave = { ...editingUser, id: userId };
    const { error } = await supabase.from("users").upsert(userToSave);
    if (error) alert("儲存帳號失敗！" + error.message);
    else { fetchData(); setIsUserModalOpen(false); }
  };

  const handleDeleteUser = async (id: string) => {
    if (window.confirm("確定要刪除此帳號嗎？")) {
      const { error } = await supabase.from("users").delete().eq("id", id);
      if (!error) fetchData();
    }
  };

  const handleChangePassword = async (e: any) => {
    e.preventDefault();
    if (pwdForm.old !== currentUser.password) { alert("原密碼錯誤！"); return; }
    if (pwdForm.new !== pwdForm.confirm) { alert("新密碼不一致！"); return; }
    const updatedUser = { ...currentUser, password: pwdForm.new };
    await supabase.from("users").upsert(updatedUser);
    setCurrentUser(updatedUser);
    if (localStorage.getItem("mpr_account") === currentUser.account) { localStorage.setItem("mpr_password", pwdForm.new); }
    alert("密碼變更成功！"); setIsChangePwdModalOpen(false); setPwdForm({ old: "", new: "", confirm: "" });
  };

  const handleProcessImport = async () => {
    if (!importFile) {
      alert("請先選擇要匯入的 Excel 檔案。");
      return;
    }
    
    let extractedContent = "";
    try {
      const data = await importFile.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      extractedContent = XLSX.utils.sheet_to_txt(sheet);
    } catch (error) {
      alert("讀取 Excel 失敗，請確認檔案格式是否正確。");
      return;
    }

    if (!extractedContent.trim()) { 
      alert("未偵測到任何內容。"); 
      return; 
    }

    setIsImportModalOpen(false);
    const today = new Date();
    const twYear = today.getFullYear() - 1911;
    const mm = String(today.getMonth() + 1).padStart(2, "0");
    
    setEditingProject({
      id: Date.now(),
      title: "【從 Excel 匯入建立】",
      refNo: `MPR-${twYear}-${mm}-${String(projects.length + 1).padStart(3, "0")}`,
      projectType: "leisure",
      applyDate: today.toISOString().split("T")[0],
      createTime: getCurrentTimeString(),
      purpose: "",
      startDate: `${selectedYear}-01-01`,
      endDate: `${selectedYear}-01-31`,
      content: "【以下為匯入之原始資料，請參考並手動整理至對應欄位】\n\n" + extractedContent,
      precautions: "",
      highlights: "",
      breakdown: [{ id: Date.now(), name: "專案一", price: "", ota: "", items: [], net: "0" }],
      countersign: [],
      status: "countersigning",
      feedback: "",
      creator: `${currentUser?.dept || ""} - ${currentUser?.name || ""}`,
    });
    setModalMode("create");
    setIsModalOpen(true);
    setImportFile(null);
  };

  useEffect(() => {
    if (currentUser) {
      setDashboardDeptFilter(["admin", "gm"].includes(currentUser.role) ? "all" : currentUser.dept || "all");
      setDashboardMonthFilter(currentMonthStr);
    }
  }, [currentUser, currentMonthStr]);

  const yearOptions = useMemo(() => {
    let minYear = currentYear - 1; let maxYear = currentYear + 2;
    projects.forEach((p) => {
      if (!p.startDate || !p.endDate) return;
      const start = parseInt(p.startDate.split("-")[0], 10);
      const end = parseInt(p.endDate.split("-")[0], 10);
      if (!isNaN(start) && start < minYear) minYear = start;
      if (!isNaN(end) && end > maxYear) maxYear = end;
    });
    const options = []; for (let i = minYear; i <= maxYear; i++) options.push(i);
    return options;
  }, [projects, currentYear]);

  const calendarData = useMemo(() => generateCalendar(selectedYear, dbEvents), [selectedYear, dbEvents]);
  const [selectedMonthView, setSelectedMonthView] = useState<number | null>(null);

  const yearProjects = useMemo(() => projects.filter((p) => p.startDate && p.endDate && (p.startDate.startsWith(String(selectedYear)) || p.endDate.startsWith(String(selectedYear)))), [projects, selectedYear]);
  const scheduledProjects = useMemo(() => yearProjects.filter((p) => p.status === "scheduled"), [yearProjects]);
  
  const filteredScheduledProjects = useMemo(() => {
    return scheduledProjects.filter((p) => {
      let passDept = ganttDeptFilter === "all" || (p.creator && p.creator.includes(ganttDeptFilter));
      let passMonth = true;
      if (ganttMonthFilter !== "all" && p.startDate && p.endDate) {
        const filterStart = new Date(selectedYear, parseInt(ganttMonthFilter) - 1, 1);
        const filterEnd = new Date(selectedYear, parseInt(ganttMonthFilter), 0);
        passMonth = new Date(p.startDate) <= filterEnd && new Date(p.endDate) >= filterStart;
      }
      return passDept && passMonth;
    }).sort((a, b) => {
      const isFullYear = (start: string, end: string) => {
        if (!start || !end) return false;
        const d1 = new Date(start).getTime(); const d2 = new Date(end).getTime();
        return Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) >= 360 || (start.endsWith("-01-01") && end.endsWith("-12-31"));
      };
      const fullA = isFullYear(a.startDate, a.endDate); const fullB = isFullYear(b.startDate, b.endDate);
      if (fullA && !fullB) return 1; if (!fullA && fullB) return -1;
      return new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
    });
  }, [scheduledProjects, ganttDeptFilter, ganttMonthFilter, selectedYear]);

  const dashboardActiveProjects = useMemo(() => {
    return scheduledProjects.filter((p) => {
      let passDept = dashboardDeptFilter === "all" || (p.creator && p.creator.includes(dashboardDeptFilter)) || (p.countersign && p.countersign.some((c: any) => c.dept === dashboardDeptFilter));
      let passMonth = true;
      if (dashboardMonthFilter !== "all" && p.startDate && p.endDate) {
        const filterStart = new Date(selectedYear, parseInt(dashboardMonthFilter) - 1, 1);
        const filterEnd = new Date(selectedYear, parseInt(dashboardMonthFilter), 0);
        passMonth = new Date(p.startDate) <= filterEnd && new Date(p.endDate) >= filterStart;
      }
      return passDept && passMonth;
    }).sort((a, b) => {
      const isFullYear = (start: string, end: string) => {
        if (!start || !end) return false;
        const d1 = new Date(start).getTime(); const d2 = new Date(end).getTime();
        return Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24)) >= 360 || (start.endsWith("-01-01") && end.endsWith("-12-31"));
      };
      const fullA = isFullYear(a.startDate, a.endDate); const fullB = isFullYear(b.startDate, b.endDate);
      if (fullA && !fullB) return 1; if (!fullA && fullB) return -1;
      return new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime();
    });
  }, [scheduledProjects, dashboardDeptFilter, dashboardMonthFilter, selectedYear]);

  const myPendingCountersign = useMemo(() => {
    if (!currentUser || ["admin", "gm"].includes(currentUser.role)) return [];
    return yearProjects.filter((p) => p.status === "countersigning" && p.countersign && p.countersign.some((c: any) => c.dept === currentUser.dept && c.status === "pending"));
  }, [yearProjects, currentUser]);
  
  const myOwnProposals = useMemo(() => {
    if (!currentUser || ["admin", "gm"].includes(currentUser.role)) return [];
    return yearProjects.filter((p) => p.creator && p.creator.includes(currentUser.name) && ["countersigning", "revision", "unconfirmed"].includes(p.status));
  }, [yearProjects, currentUser]);
  
  const managerPendingApproval = useMemo(() => {
    if (!currentUser || !["admin", "gm"].includes(currentUser.role)) return [];
    return yearProjects.filter((p) => p.status === "unconfirmed");
  }, [yearProjects, currentUser]);

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
    if (width < 1) width = 1;
    return { left: `${left}%`, width: `${width}%` };
  };

  const handleLoginSubmit = (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const acc = formData.get("account"); const pass = formData.get("password");
    const user = users.find((u) => u.account === acc && u.password === pass);
    if (user) {
      if (rememberMe) { localStorage.setItem("mpr_account", acc as string); localStorage.setItem("mpr_password", pass as string); localStorage.setItem("mpr_remember", "true"); } 
      else { localStorage.removeItem("mpr_account"); localStorage.removeItem("mpr_password"); localStorage.setItem("mpr_remember", "false"); }
      setCurrentUser(user); setView("app");
    } else { 
      alert("登入失敗：帳號或密碼錯誤！(請先確認資料庫有無資料)"); 
    }
  };
  const handleGuestLogin = () => { setCurrentUser({ id: "guest", name: "訪客", role: "guest", dept: "" }); setView("app"); };
  const handleLogout = () => { setCurrentUser(null); setView("login"); };

  const handleOpenCreate = () => {
    if (currentUser?.role === "guest") return;
    const today = new Date(); const twYear = today.getFullYear() - 1911; const mm = String(today.getMonth() + 1).padStart(2, "0");
    setEditingProject({
      id: Date.now(), title: "", refNo: `MPR-${twYear}-${mm}-${String(projects.length + 1).padStart(3, "0")}`, projectType: "leisure", applyDate: today.toISOString().split("T")[0], createTime: getCurrentTimeString(), purpose: "", startDate: `${selectedYear}-01-01`, endDate: `${selectedYear}-01-31`, content: "", precautions: "", highlights: "", 
      breakdown: [{ id: Date.now(), name: "專案一", price: "", ota: "", items: [], net: "0" }], countersign: [], status: "countersigning", feedback: "", creator: `${currentUser.dept} - ${currentUser.name}`,
    });
    setModalMode("create"); setIsModalOpen(true);
  };

  const handleSave = async (e: any) => { 
    e.preventDefault(); 
    let updatedProj = { ...editingProject }; 
    if (modalMode === "create" && updatedProj.countersign.length === 0) updatedProj.status = "revision"; 
    
    const isSuccess = await saveProjectToDb(updatedProj); 
    if (isSuccess) {
      setIsModalOpen(false); 
    }
  };

  const handleToggleDept = (dept: string) => {
    const current = editingProject.countersign || [];
    if (current.some((c: any) => c.dept === dept)) {
      setEditingProject({ ...editingProject, countersign: current.filter((c: any) => c.dept !== dept) });
    } else {
      setEditingProject({ ...editingProject, countersign: [...current, { dept, status: "pending", comment: "", time: "" }] });
    }
  };

  const submitDeptComment = async (deptName: string, comment: string) => {
    const updatedCountersign = editingProject.countersign.map((c: any) => {
      if (c.dept === deptName) return { ...c, status: "approved", comment, time: getCurrentTimeString() };
      return c;
    });
    let nextStatus = editingProject.status;
    if (updatedCountersign.every((c: any) => c.status === "approved")) nextStatus = "revision";
    await saveProjectToDb({ ...editingProject, countersign: updatedCountersign, status: nextStatus });
  };

  const submitRevisionToManager = async () => { 
    const updatedProj = { ...editingProject, status: "unconfirmed" }; 
    const isSuccess = await saveProjectToDb(updatedProj); 
    if (isSuccess) setIsModalOpen(false); 
  };
  const approveByManager = async () => { 
    const updatedProj = { ...editingProject, status: "scheduled", feedback: "" }; 
    const isSuccess = await saveProjectToDb(updatedProj); 
    if (isSuccess) setIsModalOpen(false); 
  };
  const rejectByManager = async () => { 
    const updatedProj = { ...editingProject, status: "revision" }; 
    const isSuccess = await saveProjectToDb(updatedProj); 
    if (isSuccess) setIsModalOpen(false); 
  };

  const updatePackage = (pIdx: number, field: string, value: any) => {
    const newBd = [...editingProject.breakdown];
    newBd[pIdx][field] = value;
    
    if (['price', 'ota', 'items'].includes(field)) {
      const price = parseFloat(String(newBd[pIdx].price).replace(/,/g, "")) || 0;
      const ota = parseFloat(String(newBd[pIdx].ota)) || 0;
      const otaAmount = Math.round(price * (ota / 100)); // 四捨五入
      let totalDeductions = 0;
      (newBd[pIdx].items || []).forEach((item: any) => { 
          totalDeductions += evaluateExpression(item.value); 
      });
      const net = price - otaAmount - totalDeductions;
      newBd[pIdx].net = new Intl.NumberFormat("en-US").format(net);
    }
    setEditingProject({ ...editingProject, breakdown: newBd });
  };

  const handleAddPackage = () => {
    setEditingProject({ ...editingProject, breakdown: [...editingProject.breakdown, { id: Date.now(), name: `專案${editingProject.breakdown.length + 1}`, price: "", ota: "", items: [], net: "0" }] });
  };

  const handleRemovePackage = (idx: number) => {
    const newBd = [...editingProject.breakdown]; newBd.splice(idx, 1);
    setEditingProject({ ...editingProject, breakdown: newBd });
  };

  const handleTogglePreset = (pIdx: number, presetName: string) => {
    let items = [...(editingProject.breakdown[pIdx].items || [])];
    if (items.some((i: any) => i.name === presetName)) items = items.filter((i: any) => i.name !== presetName);
    else items.push({ name: presetName, value: "" });
    updatePackage(pIdx, 'items', items);
  };

  const handleAddPackageItem = (pIdx: number) => {
    let items = [...(editingProject.breakdown[pIdx].items || [])];
    items.push({ name: "新項目", value: "" });
    updatePackage(pIdx, 'items', items);
  };

  const handleRemovePackageItem = (pIdx: number, iIdx: number) => {
    let items = [...(editingProject.breakdown[pIdx].items || [])];
    items.splice(iIdx, 1);
    updatePackage(pIdx, 'items', items);
  };

  const handlePackageItemChange = (pIdx: number, iIdx: number, field: string, value: string) => {
    let items = [...(editingProject.breakdown[pIdx].items || [])];
    items[iIdx] = { ...items[iIdx], [field]: value };
    updatePackage(pIdx, 'items', items);
  };

  const handlePrintSingleProject = () => {
    setTimeout(() => { window.print(); }, 300);
  };

  const handleExportSystemPDF = () => {
    setIsPrintLayoutActive(true); setIsExportModalOpen(false);
    setTimeout(() => { window.print(); setIsPrintLayoutActive(false); }, 800);
  };

  // 📝 Word 匯出：固定 4 欄的完美排版
  const exportSingleProjectToWord = (project: any) => {
    const header = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>簽呈匯出</title><style>body{font-family:"Microsoft JhengHei",Arial,sans-serif;}table{border-collapse:collapse;width:100%;margin-bottom:20px;}th,td{border:1px solid black;padding:8px;text-align:left;vertical-align:top;}.center{text-align:center;}.no-border{border:none;}.no-border td{border:none;padding:4px 0;} .comments { color: black; font-weight: bold; background-color: #f9fafb; padding: 10px; border: 1px solid #ccc; }</style></head><body>`;
    const formatText = (t: string) => String(t || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>");
    
    let breakdownHtml = "";
    (project.breakdown || []).forEach((pkg: any) => {
      const otaVal = pkg.ota ? Math.round((parseFloat(String(pkg.price).replace(/,/g, ""))||0) * (parseFloat(pkg.ota)/100)) : 0;
      
      // 將所有內部項目整理成一行字串 (用 <br/> 換行)
      const itemsStr = (pkg.items || []).length > 0 
        ? (pkg.items || []).map((i: any) => `${formatText(i.name)}: ${formatText(i.value)}`).join("<br/>") 
        : "無內部扣除項目";
      
      // 🌟 固定 4 欄位：售價 / OTA / 內部項目 / 淨價
      breakdownHtml += `<h4 style="margin-bottom:5px; color: #3730a3;">${formatText(pkg.name)}</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;" border="1">
          <tr style="background-color: #f3f4f6;">
            <th class="center" width="20%">售價</th>
            <th class="center" width="20%">OTA 抽成 (${pkg.ota || 0}%)</th>
            <th class="center" width="40%">內部扣除項目</th>
            <th class="center" width="20%">淨價</th>
          </tr>
          <tr>
            <td class="center">${formatText(pkg.price)}</td>
            <td class="center" style="color: red;">${otaVal > 0 ? "- " + otaVal : "0"}</td>
            <td class="center" style="font-size: 0.9em; line-height: 1.5;">${itemsStr}</td>
            <td class="center"><b style="color: #4f46e5; font-size: 1.1em;">${formatText(pkg.net)}</b></td>
          </tr>
        </table>`;
    });

    const commentsHtml = (project.countersign || []).map((c: any) => `<div>[${c.dept}] ${c.status === "approved" ? c.time + " - " + formatText(c.comment || "無意見") : "待確認..."}</div>`).join("");
    const deptName = project.creator?.split('-')[0]?.trim() || "飯店";
    
    const htmlContent = `<h2 class="center">${formatText(deptName)} 簽呈 Official application</h2>
      <table class="no-border"><tr><td class="no-border">Date 日期：${formatText(project.applyDate)}</td></tr><tr><td class="no-border">Ref No 文檔號：${formatText(project.refNo)}</td></tr><tr><td class="no-border">專案類型：${project.projectType === 'room' ? '住房專案' : '休閒 / 餐飲專案'}</td></tr></table>
      <table><tr><th width="15%">主旨</th><td>${formatText(project.title)}</td></tr><tr><th>說明</th><td>${formatText(project.purpose)}</td></tr><tr><th>活動日期</th><td>${formatText(project.startDate)} ～ ${formatText(project.endDate)}</td></tr><tr><th>內容說明</th><td>${formatText(project.content)}</td></tr><tr><th>注意事項</th><td>${formatText(project.precautions)}</td></tr></table>
      <h3>財務內拆表</h3>${breakdownHtml}
      <table><tr><th width="15%">專案亮點</th><td>${formatText(project.highlights)}</td></tr><tr><th>會簽單位</th><td>${formatText((project.countersign || []).map((c: any) => c.dept).join("、 "))}</td></tr></table>
      ${commentsHtml ? `<h3>會簽單位意見備註</h3><div class="comments">${commentsHtml}</div>` : ""}`;
      
    const blob = new Blob(["\ufeff", header + htmlContent + "</body></html>"], { type: "application/msword" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `簽呈_${project.title.replace(/[\\/:*?"<>|]/g, "")}.doc`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url);
  };

  const handleExportListWord = () => {
    let exportList = projects.filter((p) => {
      if (!p.startDate || !p.endDate) return false;
      const startY = parseInt(p.startDate.split("-")[0]); const endY = parseInt(p.endDate.split("-")[0]);
      if (startY > exportConfig.year || endY < exportConfig.year) return false;
      if (exportConfig.month !== "all") {
        const startM = parseInt(p.startDate.split("-")[1]); const endM = parseInt(p.endDate.split("-")[1]); const targetM = parseInt(exportConfig.month);
        return targetM >= startM && targetM <= endM;
      }
      return true;
    });
    const header = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><title>專案清單匯出</title><style>body{font-family:"Microsoft JhengHei",Arial,sans-serif;}table{border-collapse:collapse;width:100%;margin-bottom:20px;}th,td{border:1px solid black;padding:8px;text-align:left;vertical-align:top;}th{background-color:#f2f2f2;}</style></head><body>`;
    const titleText = `${exportConfig.year} 年度 ${exportConfig.month === "all" ? "全年" : exportConfig.month + "月"} 專案清單`;
    let htmlContent = `<h2>${titleText}</h2><table><tr><th>專案名稱</th><th>活動日期</th><th>專案狀態</th><th>提案人</th></tr>`;
    if (exportList.length === 0) htmlContent += `<tr><td colspan="4">該區間尚無任何專案。</td></tr>`;
    else exportList.forEach((p) => { htmlContent += `<tr><td>${p.title}</td><td>${p.startDate} ~ ${p.endDate}</td><td>${p.status}</td><td>${p.creator}</td></tr>`; });
    htmlContent += `</table>`;
    const blob = new Blob(["\ufeff", header + htmlContent + "</body></html>"], { type: "application/msword" });
    const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = `${titleText}.doc`; document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(url); setIsExportModalOpen(false);
  };

  const WorkflowProgressBar = ({ project }: any) => {
    const isCountersignDone = project.status !== "countersigning" && project.status !== "start";
    const isRevisionDone = ["unconfirmed", "scheduled"].includes(project.status);
    const isApproved = project.status === "scheduled";
    const pendingDepts = (project.countersign || []).filter((c: any) => c.status === "pending").map((c: any) => c.dept);
    let countersignDesc = "無須會簽";
    if (project.countersign?.length > 0) {
      if (!isCountersignDone) countersignDesc = pendingDepts.length > 0 ? `待確認: ${pendingDepts.join("、")}` : "會簽完成，待提案人送交";
      else countersignDesc = "會簽已全數完成";
    }
    const steps = [
      { id: "start", label: "提案建立", desc: `${project.creator?.split("-")[0] || project.creator}\n${project.createTime || project.applyDate}`, done: true, active: false },
      { id: "countersigning", label: "會簽單位確認中", desc: countersignDesc, done: isCountersignDone, active: project.status === "countersigning" },
      { id: "revision", label: "版本確認", desc: isRevisionDone ? "已送交" : "提案人修改中", done: isRevisionDone, active: project.status === "revision" },
      { id: "unconfirmed", label: "審核決議中", desc: isApproved ? "已核准" : "等待主管核准", done: isApproved, active: project.status === "unconfirmed" },
      { id: "scheduled", label: "已排程", desc: "正式發佈", done: isApproved, active: isApproved },
    ];
    return (
      <div className="flex items-start justify-between w-full mb-10 mt-2 relative no-print px-4">
        <div className="absolute top-4 left-[10%] w-[80%] h-1.5 bg-gray-200 -z-10 rounded"></div>
        <div className="absolute top-4 left-[10%] h-1.5 bg-indigo-500 -z-10 transition-all duration-500 rounded" style={{ width: `${(steps.filter((s) => s.done).length / (steps.length - 1)) * 80}%` }}></div>
        {steps.map((step, idx) => (
          <div key={step.id} className="flex flex-col items-center flex-1 z-10 relative group">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shadow-md transition-all duration-300 ${step.done ? "bg-indigo-600 text-white" : step.active ? "bg-orange-500 text-white ring-4 ring-orange-100 scale-110" : "bg-gray-100 text-gray-400 border border-gray-300"}`}>
              {step.done ? <Check className="w-5 h-5" /> : idx + 1}
            </div>
            <div className={`mt-3 text-xs font-bold text-center ${step.done || step.active ? "text-gray-800" : "text-gray-400"}`}>{step.label}</div>
            <div className={`text-[10px] mt-1 whitespace-pre-wrap text-center ${step.done || step.active ? "text-indigo-600 font-medium" : "text-gray-400"}`}>{step.desc}</div>
          </div>
        ))}
      </div>
    );
  };

  const MonthCalendarView = ({ month }: any) => {
    const daysInMonth = new Date(selectedYear, month, 0).getDate();
    const firstDay = new Date(selectedYear, month - 1, 1).getDay();
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDay }, (_, i) => i);

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm print:hidden">
        <div className="bg-white rounded-xl shadow-xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh]">
          <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-indigo-50">
            <h2 className="text-xl font-bold text-indigo-900 flex items-center gap-2"><CalendarDays className="w-6 h-6" /> {selectedYear} 年 {month} 月 行事曆與專案排程</h2>
            <button onClick={() => setSelectedMonthView(null)} className="text-gray-500 hover:text-gray-800"><X className="w-6 h-6" /></button>
          </div>
          <div className="p-6 overflow-y-auto bg-gray-50 flex-1">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {["日", "一", "二", "三", "四", "五", "六"].map((d) => (<div key={d} className="text-center font-bold text-sm text-gray-500">{d}</div>))}
            </div>
            <div className="grid grid-cols-7 gap-2">
              {blanks.map((b) => (<div key={`blank-${b}`} className="bg-transparent p-2 rounded-lg"></div>))}
              {days.map((day) => {
                const dateStr = `${selectedYear}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const dailyData = calendarData[dateStr] || { type: "平日", events: [], marketingEvents: [] };
                const st = CAL_STYLES[dailyData.type] || CAL_STYLES["平日"];
                const dayProjects = yearProjects.filter((p) => p.startDate <= dateStr && p.endDate >= dateStr);
                const totalItems = (dailyData.events?.length || 0) + (dailyData.marketingEvents?.length || 0) + dayProjects.length;
                return (
                  <div key={day} className={`min-h-[70px] md:min-h-[110px] border rounded-lg p-1 md:p-2 flex flex-col ${st.bg} ${st.border} cursor-pointer hover:ring-2 hover:ring-indigo-400 transition-all`} onClick={() => setSelectedDayInfo({ date: dateStr, dailyData, dayProjects, st })}>
                    <div className="flex flex-col lg:flex-row justify-between items-center lg:items-start mb-1 gap-1 lg:gap-0">
                      <span className={`font-bold text-sm ${st.text}`}>{day}</span>
                      <span className={`text-[9px] md:text-[10px] px-1 rounded shadow-sm ${st.tag} whitespace-nowrap`}>{dailyData.type}</span>
                    </div>
                    {totalItems > 0 && (<div className="md:hidden mt-auto text-[10px] text-center font-bold text-indigo-600 bg-white border border-indigo-200 rounded py-0.5 shadow-sm">{totalItems} 備註</div>)}
                    <div className="hidden md:block flex-1 space-y-1 mt-1 overflow-y-auto">
                      {dailyData.events && dailyData.events.map((ev: any, idx: number) => (<div key={`ev-${idx}`} className="text-[10px] bg-yellow-100 text-yellow-800 border border-yellow-200 px-1 py-0.5 rounded mb-1 truncate" title={ev}>{ev}</div>))}
                      {dailyData.marketingEvents && dailyData.marketingEvents.map((ev: any, idx: number) => (<div key={`mk-ev-${idx}`} className="text-[10px] bg-green-50 text-green-700 border border-green-200 px-1 py-0.5 rounded mb-1 truncate" title={ev}>{ev}</div>))}
                      {dayProjects.map((p) => (<div key={p.id} className={`text-[10px] px-1.5 py-0.5 rounded truncate text-white shadow-sm ${p.status === "scheduled" ? "bg-indigo-500" : "bg-orange-400"}`} title={p.title}>{p.title}</div>))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const DashboardActiveProjectsCard = () => (
    <div className="bg-white rounded-xl shadow-sm border border-indigo-200 p-5 lg:col-span-2 flex flex-col h-full min-h-[350px]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-gray-100 pb-3">
        <div className="flex items-center gap-3 text-indigo-600"><PlayCircle className="w-6 h-6" /><h3 className="font-bold text-lg">目前進行專案 (已排程)</h3></div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-gray-50 rounded border border-gray-200 px-2 py-1">
            <Filter className="w-3 h-3 text-gray-500 mr-1" />
            <select className="bg-transparent text-sm outline-none text-gray-700 font-medium cursor-pointer" value={dashboardDeptFilter} onChange={(e) => setDashboardDeptFilter(e.target.value)}>
              <option value="all">全館所有部門</option>
              {DEPARTMENTS.map((d) => (<option key={d} value={d}>{d}</option>))}
            </select>
          </div>
          <div className="flex items-center bg-gray-50 rounded border border-gray-200 px-2 py-1">
            <Calendar className="w-3 h-3 text-gray-500 mr-1" />
            <select className="bg-transparent text-sm outline-none text-gray-700 font-medium cursor-pointer" value={dashboardMonthFilter} onChange={(e) => setDashboardMonthFilter(e.target.value)}>
              <option value="all">全年</option>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (<option key={m} value={m}>{m}月</option>))}
            </select>
          </div>
        </div>
      </div>
      <p className="text-3xl font-black mb-4 text-indigo-700">{dashboardActiveProjects.length} <span className="text-sm text-gray-400 font-medium">個專案</span></p>
      <div className="space-y-2 flex-1 overflow-y-auto pr-2">
        {dashboardActiveProjects.length === 0 && (<div className="flex flex-col items-center justify-center h-full text-gray-400"><CheckCircle className="w-8 h-8 mb-2 opacity-20" /><p className="text-sm font-medium">該篩選條件下尚無進行中專案</p></div>)}
        {dashboardActiveProjects.map((p) => (
          <div key={p.id} onClick={() => { setEditingProject({ ...p }); setModalMode("view"); setIsModalOpen(true); }} className="text-sm p-3 bg-indigo-50 border border-indigo-100 rounded-lg cursor-pointer hover:bg-indigo-100 flex flex-col sm:flex-row sm:justify-between sm:items-center text-indigo-800 transition-colors shadow-sm gap-2 sm:gap-0">
            <span className="font-bold truncate">{p.title}</span>
            <span className="text-xs text-indigo-600 shrink-0 bg-white px-2 py-1 rounded border border-indigo-200 font-medium">{p.startDate?.substring(5).replace("-", "/") || "未定"} ~ {p.endDate?.substring(5).replace("-", "/") || "未定"}</span>
          </div>
        ))}
      </div>
    </div>
  );

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center">
        <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <div className="text-indigo-600 font-bold">系統與資料庫連線中...</div>
      </div>
    );
  }

  // 登入畫面
  if (view === "login") {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
          <div className="bg-indigo-600 p-8 text-center text-white">
            <Layout className="w-12 h-12 mx-auto mb-4 opacity-90" />
            <h1 className="text-2xl font-bold tracking-wide">專案管理系統</h1>
          </div>
          <div className="p-8">
            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div><label className="block text-sm font-medium mb-1">登入帳號</label><div className="relative"><UserCircle className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" /><input name="account" type="text" required defaultValue={savedAccount} className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div></div>
              <div><label className="block text-sm font-medium mb-1">登入密碼</label><div className="relative"><Lock className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" /><input name="password" type="password" required defaultValue={savedPassword} className="w-full pl-10 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none" /></div></div>
              <div className="flex items-center"><input id="rem" type="checkbox" className="mr-2 h-4 w-4 text-indigo-600" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} /><label htmlFor="rem" className="text-sm font-medium text-gray-700">記住密碼</label></div>
              <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-bold py-2.5 rounded-lg mt-4 shadow">登入系統</button>
            </form>
            <div className="mt-6 text-center border-t pt-4"><button onClick={handleGuestLogin} className="text-sm text-gray-500 hover:text-indigo-600">以訪客身分預覽</button></div>
          </div>
        </div>
      </div>
    );
  }

  // 後台管理畫面
  if (view === "users") {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800">
        <header className="bg-white shadow-sm sticky top-0 z-20">
          <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-600"><ShieldCheck className="w-6 h-6" /><h1 className="font-bold text-xl tracking-wide">系統後台 - 帳號密碼管理</h1></div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-700 max-w-[80px] sm:max-w-none truncate">{currentUser?.name}</span>
              <button onClick={() => setIsChangePwdModalOpen(true)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 sm:p-2 rounded-lg transition-colors" title="變更密碼"><Key className="w-4 h-4 sm:w-5 sm:h-5" /></button>
              <button onClick={() => setView("app")} className="text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm font-medium transition-colors ml-2 border border-gray-200">返回主系統</button>
            </div>
          </div>
        </header>
        <main className="max-w-5xl mx-auto px-4 py-8">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
              <h2 className="font-bold text-gray-800">使用者列表</h2>
              <button onClick={() => { setEditingUser({ account: "", password: "", name: "", role: "employee", dept: "企劃部" }); setIsUserModalOpen(true); }} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-1 shadow-sm hover:bg-indigo-700"><Plus className="w-4 h-4" /> 新增帳號</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 text-sm">
                    <th className="p-4">姓名</th><th className="p-4">所屬部門</th><th className="p-4">登入帳號</th><th className="p-4">登入密碼</th><th className="p-4">系統權限</th><th className="p-4 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="p-4 font-medium">{u.name}</td><td className="p-4">{u.dept}</td><td className="p-4">{u.account}</td><td className="p-4 text-gray-400">••••</td>
                      <td className="p-4"><span className={`px-2 py-1 rounded text-xs font-bold ${ROLES_INFO[u.role]?.bg || "bg-gray-100"} ${ROLES_INFO[u.role]?.color || "text-gray-700"}`}>{ROLES_INFO[u.role]?.name || u.role}</span></td>
                      <td className="p-4 flex justify-center gap-2">
                        {u.account !== "admin" ? (
                          <><button onClick={() => { setEditingUser({ ...u }); setIsUserModalOpen(true); }} className="text-indigo-600 hover:bg-indigo-50 p-2 rounded"><Edit className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteUser(u.id)} className="text-red-600 hover:bg-red-50 p-2 rounded"><Trash2 className="w-4 h-4" /></button></>
                        ) : (<span className="text-xs font-bold text-gray-400 px-2 py-2">預設管理員</span>)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </main>

        {isUserModalOpen && editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <form onSubmit={handleSaveUser} className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
              <div className="px-6 py-4 border-b flex justify-between"><h2 className="font-bold">{editingUser.id ? "編輯帳號" : "新增帳號"}</h2><button type="button" onClick={() => setIsUserModalOpen(false)}><X className="w-5 h-5" /></button></div>
              <div className="p-6 space-y-4 text-sm">
                <div><label className="block mb-1 font-medium">姓名</label><input type="text" required className="w-full border rounded p-2 outline-none focus:ring-2 focus:ring-indigo-500" value={editingUser.name} onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })} /></div>
                <div><label className="block mb-1 font-medium">所屬部門</label><select className="w-full border rounded p-2 outline-none focus:ring-2 focus:ring-indigo-500" value={editingUser.dept} onChange={(e) => setEditingUser({ ...editingUser, dept: e.target.value })}>{DEPARTMENTS.map((d) => (<option key={d} value={d}>{d}</option>))}<option value="管理層">管理層</option><option value="系統管理">系統管理</option></select></div>
                <div><label className="block mb-1 font-medium">登入帳號</label><input type="text" required className="w-full border rounded p-2 outline-none focus:ring-2 focus:ring-indigo-500" value={editingUser.account} onChange={(e) => setEditingUser({ ...editingUser, account: e.target.value })} /></div>
                <div><label className="block mb-1 font-medium">登入密碼</label><input type="text" required className="w-full border rounded p-2 outline-none focus:ring-2 focus:ring-indigo-500" value={editingUser.password} onChange={(e) => setEditingUser({ ...editingUser, password: e.target.value })} /></div>
                <div><label className="block mb-1 font-medium">系統權限</label><select className="w-full border rounded p-2 outline-none focus:ring-2 focus:ring-indigo-500" value={editingUser.role} onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}><option value="employee">一般員工/各部門 (可提案/會簽)</option><option value="gm">總經理 (觀看/審核簽呈)</option><option value="admin">系統管理員 (所有權限)</option></select></div>
              </div>
              <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2"><button type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-gray-600">取消</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">儲存帳號</button></div>
            </form>
          </div>
        )}
      </div>
    );
  }

  // ==========================================
  // 主應用畫面
  // ==========================================
  return (
    <div className={`min-h-screen font-sans ${isPrintLayoutActive ? "bg-white" : "bg-slate-50 text-slate-800"}`}>
      
      {/* 🌟 PDF 完美列印專用 CSS */}
      <style>{`
        .sign-table { width: 100%; border-collapse: collapse; margin-bottom: 1.5rem; border: 1px solid #d1d5db; }
        .sign-table th, .sign-table td { border: 1px solid #d1d5db; padding: 0.75rem; text-align: left; vertical-align: top; }
        .sign-table th { background-color: #f3f4f6; color: #374151; font-weight: 600; text-align: center; }
        .sign-table .center { text-align: center; }
        
        @media print {
          @page { margin: 1cm; size: auto; }
          body * { visibility: hidden; }
          body, html { height: auto !important; overflow: visible !important; background-color: white !important; }
          
          /* 將所有帶有 no-print 類別的區塊徹底隱藏 */
          .no-print { display: none !important; }
          
          /* 將 Modal 解除固定定位，變為一般網頁流，從而支援跨頁列印 */
          .print-modal-wrapper { position: static !important; background: transparent !important; padding: 0 !important; display: block !important; }
          .print-modal, .print-modal * { visibility: visible; }
          .print-modal { position: static !important; width: 100% !important; max-height: none !important; overflow: visible !important; border: none !important; box-shadow: none !important; }
          
          /* 防止表格被切斷 */
          table { page-break-inside: auto; width: 100%; }
          tr { page-break-inside: avoid; page-break-after: auto; }
          td, th { page-break-inside: avoid; }
          h1, h2, h3, h4 { page-break-after: avoid; }
          
          /* 強制列印背景顏色 */
          .sign-table th { background-color: #e5e7eb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-gray-100 { background-color: #f3f4f6 !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .bg-gray-50 { background-color: #f9fafb !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}</style>

      {/* 列印預覽模式 - 全館清單 */}
      {isPrintLayoutActive && (
        <div className="bg-white min-h-screen pb-12 font-sans print-modal" id="pdf-export-area">
          <div className="fixed top-0 left-0 w-full bg-slate-800 text-white p-3 flex justify-between items-center z-[100] no-print shadow-md">
            <div className="font-medium flex items-center gap-2"><Printer className="w-5 h-5" /> 列印預覽模式 </div>
            <div className="flex gap-3">
              <button onClick={() => window.print()} className="bg-indigo-500 hover:bg-indigo-600 px-4 py-1.5 rounded font-medium text-sm shadow">列印 (或 Ctrl+P)</button>
              <button onClick={() => setIsPrintLayoutActive(false)} className="bg-slate-600 hover:bg-slate-700 px-4 py-1.5 rounded font-medium text-sm">退出預覽</button>
            </div>
          </div>
          <div className="p-4 sm:p-8 max-w-5xl mx-auto mt-16 print:mt-0 print:p-0">
            <h1 className="text-2xl sm:text-3xl font-bold text-center mb-8">{exportConfig.year} 年度 {exportConfig.month === "all" ? "全年" : `${exportConfig.month}月`} 專案清單</h1>
            <table className="w-full border-collapse border border-gray-400 mb-8 text-sm">
              <thead><tr className="bg-gray-100"><th className="border border-gray-400 p-2 text-left">專案名稱</th><th className="border border-gray-400 p-2 text-center w-48">活動期間</th><th className="border border-gray-400 p-2 text-center w-32">狀態</th><th className="border border-gray-400 p-2 text-center w-32">提案人</th></tr></thead>
              <tbody>
                {projects.filter((p) => {
                  if (!p.startDate || !p.endDate) return false;
                  const startY = parseInt(p.startDate.split("-")[0]); const endY = parseInt(p.endDate.split("-")[0]);
                  if (startY > exportConfig.year || endY < exportConfig.year) return false;
                  if (exportConfig.month !== "all") { const startM = parseInt(p.startDate.split("-")[1]); const endM = parseInt(p.endDate.split("-")[1]); const targetM = parseInt(exportConfig.month); return targetM >= startM && targetM <= endM; }
                  return true;
                }).map((p) => (
                  <tr key={p.id}>
                    <td className="border border-gray-400 p-2 font-medium">{p.title}</td><td className="border border-gray-400 p-2 text-center">{p.startDate} ~ {p.endDate}</td>
                    <td className="border border-gray-400 p-2 text-center">{p.status === "scheduled" ? "已排程" : p.status === "unconfirmed" ? "主管審核中" : p.status === "revision" ? "提案人版本確認中" : "單位會簽中"}</td>
                    <td className="border border-gray-400 p-2 text-center">{p.creator?.split("-")[0] || ""}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 一般主介面 (被列印時隱藏) */}
      {!isPrintLayoutActive && (
        <div className={isModalOpen ? "no-print" : ""}>
          <header className="bg-white shadow-sm sticky top-0 z-20 no-print">
            <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
              <div className="flex items-center gap-1 sm:gap-2 text-indigo-600">
                <Layout className="w-5 h-5 sm:w-6 sm:h-6" />
                <h1 className="font-bold text-lg sm:text-xl tracking-wide hidden md:block">專案管理</h1>
                <select className="ml-1 sm:ml-2 bg-indigo-50 border border-indigo-200 text-indigo-800 text-xs sm:text-sm font-bold rounded-lg focus:ring-indigo-500 p-1.5 cursor-pointer outline-none" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
                  {yearOptions.map((y) => (<option key={y} value={y}>{y} 年</option>))}
                </select>
              </div>
              <div className="flex items-center gap-1 sm:gap-3">
                <button onClick={() => setIsImportModalOpen(true)} className="text-white bg-green-600 hover:bg-green-700 px-2 sm:px-3 py-2 rounded-lg text-sm font-bold flex items-center gap-1 transition-colors shadow-sm"><UploadCloud className="w-4 h-4" /> <span className="hidden lg:inline">匯入資料</span></button>
                <div className="h-4 sm:h-6 w-px bg-gray-200 mx-1 sm:mx-1"></div>
                <button onClick={() => setIsExportModalOpen(true)} className="text-gray-600 hover:text-indigo-600 hover:bg-indigo-50 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1"><DownloadCloud className="w-4 h-4" /> <span className="hidden lg:inline">匯出清單</span></button>
                {currentUser?.role === "admin" && (
                  <button onClick={() => setView("users")} className="text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-2 sm:px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-1 border border-indigo-100 transition-colors"><Settings className="w-4 h-4" /> <span className="hidden lg:inline">後台管理</span></button>
                )}
                <div className="h-4 sm:h-6 w-px bg-gray-200 mx-1 sm:mx-2"></div>
                <div className="flex items-center gap-1 sm:gap-2 px-1">
                  <span className={`hidden md:inline px-2 py-0.5 rounded text-xs font-bold ${ROLES_INFO[currentUser?.role || "guest"]?.bg} ${ROLES_INFO[currentUser?.role || "guest"]?.color}`}>{currentUser?.dept || "訪客"}</span>
                  <span className="text-sm font-medium text-gray-700 max-w-[80px] sm:max-w-none truncate">{currentUser?.name}</span>
                </div>
                {currentUser && currentUser.role !== "guest" && (<button onClick={() => setIsChangePwdModalOpen(true)} className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-1.5 sm:p-2 rounded-lg transition-colors" title="變更密碼"><Key className="w-4 h-4 sm:w-5 sm:h-5" /></button>)}
                <button onClick={handleLogout} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 sm:p-2 rounded-lg transition-colors" title="登出"><LogOut className="w-4 h-4 sm:w-5 sm:h-5" /></button>
                {currentUser?.role !== "guest" && (
                  <button onClick={() => handleOpenCreate()} className="bg-indigo-600 hover:bg-indigo-700 text-white px-2 sm:px-4 py-1.5 sm:py-2 ml-1 sm:ml-2 rounded-lg text-sm font-medium flex items-center gap-1 sm:gap-2 shadow-sm transition-colors"><Plus className="w-4 h-4" /> <span className="hidden md:inline">新增簽呈</span></button>
                )}
              </div>
            </div>
          </header>

          <main className="max-w-7xl mx-auto px-4 py-8 space-y-6">
            {currentUser && currentUser.role !== "guest" && (
              <section className="mb-8">
                <div className="flex items-center justify-between mb-4"><h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">👋 歡迎回來，{currentUser.name} <span className="text-sm text-gray-500 font-medium ml-2">({currentUser.dept} 專屬主控板)</span></h2></div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-1 flex flex-col gap-6">
                    <div className="bg-white rounded-xl shadow-sm border border-orange-200 p-5 flex-1 flex flex-col min-h-[160px]">
                      <div className="flex items-center gap-3 mb-4 text-orange-600"><AlertCircle className="w-6 h-6" /><h3 className="font-bold text-lg">待我會辦的專案</h3></div>
                      <p className="text-3xl font-black mb-4">{myPendingCountersign.length}</p>
                      <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                        {myPendingCountersign.length === 0 && (<p className="text-sm text-gray-400">目前無待會辦事項</p>)}
                        {myPendingCountersign.map((p) => (<div key={p.id} onClick={() => { setEditingProject({ ...p }); setModalMode("view"); setIsModalOpen(true); }} className="text-sm p-3 bg-orange-50 border border-orange-100 rounded cursor-pointer hover:bg-orange-100 truncate text-orange-800 shadow-sm font-medium">{p.title}</div>))}
                      </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-sm border border-blue-200 p-5 flex-1 flex flex-col min-h-[160px]">
                      <div className="flex items-center gap-3 mb-4 text-blue-600"><PenTool className="w-6 h-6" /><h3 className="font-bold text-lg">我的提案 (待處理)</h3></div>
                      <p className="text-3xl font-black mb-4">{myOwnProposals.length}</p>
                      <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                        {myOwnProposals.length === 0 && (<p className="text-sm text-gray-400">尚無進行中的提案</p>)}
                        {myOwnProposals.map((p) => (
                          <div key={p.id} onClick={() => { setEditingProject({ ...p }); setModalMode("view"); setIsModalOpen(true); }} className="text-sm p-2 bg-blue-50 border border-blue-100 rounded cursor-pointer hover:bg-blue-100 text-blue-800 shadow-sm flex flex-col gap-1">
                            <span className="font-bold truncate">{p.title}</span>
                            <span className={`self-start font-bold shrink-0 px-2 py-0.5 rounded text-[10px] ${p.status === "revision" ? "bg-red-500 text-white" : "bg-white text-blue-600 border border-blue-200"}`}>{p.status === "revision" ? "等待我確認修改" : p.status === "unconfirmed" ? "送交主管審核中" : "單位會簽中"}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    {["admin", "gm"].includes(currentUser.role) && (
                      <div className="bg-white rounded-xl shadow-sm border border-purple-200 p-5 relative overflow-hidden flex-1 flex flex-col min-h-[160px]">
                        <div className="absolute top-0 right-0 w-2 h-full bg-purple-500"></div>
                        <div className="flex items-center gap-3 mb-4 text-purple-700"><ClipboardList className="w-6 h-6" /><h3 className="font-bold text-lg">待審核簽呈 (決議中)</h3></div>
                        <p className="text-3xl font-black mb-4 text-purple-700">{managerPendingApproval.length} <span className="text-sm text-gray-400 font-medium">件</span></p>
                        <div className="space-y-2 flex-1 overflow-y-auto pr-2">
                          {managerPendingApproval.length === 0 && (<p className="text-sm text-gray-400">目前無待審核事項</p>)}
                          {managerPendingApproval.map((p) => (<div key={p.id} onClick={() => { setEditingProject({ ...p }); setModalMode("view"); setIsModalOpen(true); }} className="text-sm p-3 bg-purple-50 border border-purple-100 rounded cursor-pointer hover:bg-purple-100 truncate text-purple-800 font-bold shadow-sm">{p.title}</div>))}
                        </div>
                      </div>
                    )}
                  </div>
                  <DashboardActiveProjectsCard />
                </div>
              </section>
            )}

            <div className="bg-white p-3 rounded-lg shadow-sm border border-gray-200 flex flex-wrap gap-4 text-sm items-center">
              <span className="font-bold text-gray-600">行事曆圖例：</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-white border border-gray-300"></span>平日</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></span>旺日</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-pink-100 border border-pink-300"></span>假日</span>
              <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-100 border border-red-300"></span>大假日 (除夕、春節、連假)</span>
            </div>

            {/* 甘特圖區塊 */}
            <section className={`bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden`}>
              <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col md:flex-row justify-between md:items-center gap-4">
                <h2 className="text-lg font-bold flex items-center gap-2 text-gray-800"><Calendar className="w-5 h-5 text-indigo-600" /> {selectedYear} 年度專案甘特圖 (全館)</h2>
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2"><Filter className="w-4 h-4 text-gray-500" /><span className="text-sm font-bold text-gray-700">部門:</span><select className="border border-gray-300 rounded p-1 text-sm outline-none focus:border-indigo-500 bg-white" value={ganttDeptFilter} onChange={(e) => setGanttDeptFilter(e.target.value)}><option value="all">全部</option>{DEPARTMENTS.map((d) => (<option key={d} value={d}>{d}</option>))}</select></div>
                  <div className="flex items-center gap-2"><span className="text-sm font-bold text-gray-700">月份:</span><select className="border border-gray-300 rounded p-1 text-sm outline-none focus:border-indigo-500 bg-white" value={ganttMonthFilter} onChange={(e) => setGanttMonthFilter(e.target.value)}><option value="all">全年</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (<option key={m} value={m}>{m}月</option>))}</select></div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <div className="min-w-[800px]">
                  <div className="flex border-b border-gray-200 bg-gray-50">
                    <div className="w-48 flex-shrink-0 p-3 border-r border-gray-200 font-semibold text-gray-600 text-sm">專案名稱</div>
                    <div className="flex-1 grid grid-cols-12">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (<div key={m} onClick={() => setSelectedMonthView(m)} className={`border-r border-gray-200 p-2 text-center text-xs font-medium cursor-pointer hover:bg-indigo-100 transition-colors text-gray-700`} title="點擊查看本月詳細平旺日與活動">{m}月</div>))}
                    </div>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-0 flex ml-48 pointer-events-none">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (<div key={`bg-${m}`} className="flex-1 border-r border-gray-100"></div>))}
                    </div>
                    <div className="relative z-10">
                      {filteredScheduledProjects.length === 0 && (<div className="py-12 text-center text-gray-400 font-medium bg-gray-50/50">此條件下尚未有符合的專案排程</div>)}
                      {filteredScheduledProjects.map((p) => (
                        <div key={p.id} className="flex items-center group cursor-pointer border-b border-gray-100 hover:bg-gray-50 transition-colors" onClick={() => { setEditingProject({ ...p }); setModalMode("view"); setIsModalOpen(true); }}>
                          <div className="w-48 flex-shrink-0 p-3 pr-4 border-r border-gray-200"><div className="font-medium text-sm text-gray-800 truncate">{p.title}</div><div className="text-xs text-gray-400 mt-1">{p.startDate?.substring(5)} ~ {p.endDate?.substring(5)}</div></div>
                          <div className="flex-1 relative h-12"><div className={`absolute top-3 bottom-3 rounded-md shadow-sm transition-all bg-indigo-500 hover:bg-indigo-600`} style={getBarStyles(p.startDate, p.endDate)}><div className="px-2 text-xs text-white leading-6 truncate drop-shadow-sm">{p.title}</div></div></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>
      )}

      {/* 匯入資料 Modal (已移除文字框，僅保留 Excel 上傳) */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between bg-green-50">
              <h2 className="text-lg font-bold text-green-900 flex items-center gap-2"><UploadCloud className="w-5 h-5" /> 匯入 Excel 資料</h2>
              <button onClick={() => setIsImportModalOpen(false)}><X className="w-5 h-5 text-gray-500 hover:text-gray-800" /></button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600 mb-2">系統將讀取 <b className="text-green-600">Excel (.xlsx, .csv)</b> 檔案中的資料，並自動為您建立一份新的草稿簽呈。</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition-colors">
                <input type="file" accept=".xlsx, .xls, .csv" className="hidden" id="excel-upload" onChange={(e) => setImportFile(e.target.files?.[0] || null)} />
                <label htmlFor="excel-upload" className="cursor-pointer flex flex-col items-center justify-center">
                  <FileText className={`w-10 h-10 mb-2 ${importFile ? 'text-green-500' : 'text-gray-400'}`} />
                  <span className="font-medium text-indigo-600 hover:text-indigo-800">{importFile ? `已選擇檔案：${importFile.name}` : "點擊此處上傳 Excel 檔案"}</span>
                </label>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end items-center border-t border-gray-100 gap-2">
              <button onClick={() => setIsImportModalOpen(false)} className="px-4 py-2 text-gray-600 bg-white border rounded-lg font-medium text-sm">取消</button>
              <button onClick={handleProcessImport} className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors">解析並建立簽呈</button>
            </div>
          </div>
        </div>
      )}

      {/* 單日詳細資訊與備註彈出視窗 */}
      {selectedDayInfo && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden border">
            <div className={`px-4 py-3 border-b flex justify-between items-center ${selectedDayInfo.st.bg} ${selectedDayInfo.st.text}`}>
              <h3 className="font-bold flex items-center gap-2"><CalendarDays className="w-5 h-5" />{selectedDayInfo.date}</h3>
              <button onClick={() => setSelectedDayInfo(null)} className="hover:opacity-70"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div><span className={`text-xs px-2 py-1 rounded shadow-sm ${selectedDayInfo.st.tag} font-bold`}>{selectedDayInfo.dailyData.type}</span></div>
              
              {selectedDayInfo.dailyData.events?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 mb-1 border-b pb-1">節慶與官方活動</h4>
                  <ul className="space-y-1">
                    {selectedDayInfo.dailyData.events.map((ev: string, idx: number) => (<li key={idx} className="text-sm bg-yellow-50 text-yellow-800 border border-yellow-200 px-2 py-1 rounded">{ev}</li>))}
                  </ul>
                </div>
              )}
              {selectedDayInfo.dailyData.marketingEvents?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 mb-1 border-b pb-1">行銷節慶</h4>
                  <ul className="space-y-1">
                    {selectedDayInfo.dailyData.marketingEvents.map((ev: string, idx: number) => (<li key={idx} className="text-sm bg-green-50 text-green-700 border border-green-200 px-2 py-1 rounded">{ev}</li>))}
                  </ul>
                </div>
              )}
              {selectedDayInfo.dayProjects?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-gray-500 mb-1 border-b pb-1">館內專案排程</h4>
                  <ul className="space-y-1">
                    {selectedDayInfo.dayProjects.map((p: any) => (<li key={p.id} className={`text-sm px-2 py-1 rounded text-white shadow-sm cursor-pointer hover:opacity-80 transition-opacity ${p.status === "scheduled" ? "bg-indigo-500" : "bg-orange-400"}`} onClick={() => { setEditingProject({ ...p }); setModalMode("view"); setSelectedDayInfo(null); setIsModalOpen(true); }}>{p.title}</li>))}
                  </ul>
                </div>
              )}
              
              {(!selectedDayInfo.dailyData.events?.length) && (!selectedDayInfo.dailyData.marketingEvents?.length) && (!selectedDayInfo.dayProjects?.length) && (
                 <div className="text-center text-gray-400 text-sm py-2">本日無任何活動或專案排程</div>
              )}

              {/* 日程特殊備註與權限管理 */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <h4 className="text-sm font-bold text-indigo-800 flex items-center gap-1 mb-2">
                  <MessageSquare className="w-4 h-4" /> 日程特殊備註
                </h4>
                {currentUser?.role !== "admin" && (
                  <div className="bg-gray-50 p-3 rounded-lg border border-gray-200 text-sm text-gray-700 whitespace-pre-wrap min-h-[60px]">
                    {dbEvents.find(e => e.date === selectedDayInfo.date)?.description || "本日無特殊備註。"}
                  </div>
                )}
                {currentUser?.role === "admin" && (
                  <div className="flex flex-col gap-2">
                    <textarea
                      id="day-remark-input"
                      className="w-full border border-indigo-200 bg-indigo-50/30 rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                      rows={3}
                      placeholder="管理員專用：請輸入本日備註 (如交通管制、滿房提醒)..."
                      defaultValue={dbEvents.find(e => e.date === selectedDayInfo.date)?.description || ""}
                    ></textarea>
                    <button
                      onClick={() => handleSaveDayRemark(selectedDayInfo.date, (document.getElementById("day-remark-input") as HTMLTextAreaElement).value)}
                      className="self-end bg-indigo-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-indigo-700 shadow-sm"
                    >
                      儲存至資料庫
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedMonthView && <MonthCalendarView month={selectedMonthView} />}

      {/* 匯出 Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between bg-indigo-50">
              <h2 className="text-lg font-bold text-indigo-900 flex items-center gap-2"><FileDown className="w-5 h-5" /> 匯出專案清單</h2>
              <button onClick={() => setIsExportModalOpen(false)}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <p className="text-gray-500 mb-2">請選擇匯出範圍：</p>
              <div><label className="block font-bold mb-1">匯出年度</label><select className="w-full border rounded-lg p-2 outline-none focus:border-indigo-500" value={exportConfig.year} onChange={(e) => setExportConfig({ ...exportConfig, year: Number(e.target.value) })}>{yearOptions.map((y) => (<option key={y} value={y}>{y} 年</option>))}</select></div>
              <div><label className="block font-bold mb-1">匯出月份</label><select className="w-full border rounded-lg p-2 outline-none focus:border-indigo-500" value={exportConfig.month} onChange={(e) => setExportConfig({ ...exportConfig, month: e.target.value })}><option value="all">全年度</option>{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((m) => (<option key={m} value={m}>{m} 月</option>))}</select></div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-between items-center border-t border-gray-100">
              <button onClick={handleExportListWord} className="flex items-center gap-1 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium text-sm transition-colors border border-blue-200"><FileType2 className="w-4 h-4" /> 下載 Word</button>
              <button onClick={handleExportSystemPDF} className="flex items-center gap-1 px-4 py-2 bg-indigo-600 text-white hover:bg-indigo-700 rounded-lg font-medium text-sm transition-colors"><Printer className="w-4 h-4" /> 列印 (PDF)</button>
            </div>
          </div>
        </div>
      )}

      {/* 變更密碼 Modal */}
      {isChangePwdModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm no-print">
          <form onSubmit={handleChangePassword} className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="px-6 py-4 border-b flex justify-between bg-indigo-50">
              <h2 className="font-bold text-indigo-900 flex items-center gap-2"><Key className="w-4 h-4" /> 變更密碼</h2>
              <button type="button" onClick={() => { setIsChangePwdModalOpen(false); setPwdForm({ old: "", new: "", confirm: "" }); }}><X className="w-5 h-5" /></button>
            </div>
            <div className="p-6 space-y-4 text-sm">
              <div><label className="block mb-1 font-medium">原密碼</label><input type="password" required className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500" value={pwdForm.old} onChange={(e) => setPwdForm({ ...pwdForm, old: e.target.value })} /></div>
              <div><label className="block mb-1 font-medium">新密碼</label><input type="password" required className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500" value={pwdForm.new} onChange={(e) => setPwdForm({ ...pwdForm, new: e.target.value })} /></div>
              <div><label className="block mb-1 font-medium">確認新密碼</label><input type="password" required className="w-full border rounded p-2 focus:ring-2 focus:ring-indigo-500" value={pwdForm.confirm} onChange={(e) => setPwdForm({ ...pwdForm, confirm: e.target.value })} /></div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-2"><button type="button" onClick={() => { setIsChangePwdModalOpen(false); setPwdForm({ old: "", new: "", confirm: "" }); }} className="px-4 py-2 text-gray-600">取消</button><button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded">確認變更</button></div>
          </form>
        </div>
      )}

      {/* 💥 最重要：專案 Modal (檢視 / 編輯 / 新增) 💥 */}
      {isModalOpen && editingProject && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm print-modal-wrapper">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-5xl flex flex-col max-h-[95vh] print-modal">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 no-print">
              <h2 className="text-xl font-bold text-gray-800">
                {modalMode === "create" ? "新增簽呈" : modalMode === "edit" ? "編輯簽呈" : "專案簽呈內容"}
              </h2>
              <div className="flex items-center gap-2">
                {modalMode === "view" && (
                  <>
                    <button onClick={handlePrintSingleProject} className="flex items-center gap-1 text-sm bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded"><Printer className="w-4 h-4" /> 列印 PDF</button>
                    <button onClick={() => exportSingleProjectToWord(editingProject)} className="flex items-center gap-1 text-sm bg-blue-50 text-blue-700 px-3 py-1.5 rounded"><FileType2 className="w-4 h-4" /> 下載 Word</button>
                  </>
                )}
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 ml-2"><X className="w-6 h-6" /></button>
              </div>
            </div>

            {/* Content */}
            <div className="p-8 overflow-y-auto text-sm md:text-base text-gray-900 bg-white">
              {modalMode === "view" ? (
                <div className="max-w-4xl mx-auto">
                  <div className="no-print"><WorkflowProgressBar project={editingProject} /></div>
                  <h1 className="text-2xl font-bold text-center mb-6">{editingProject.creator?.split('-')[0]?.trim() || '行銷公關部'} 簽呈 Official application</h1>
                  
                  <div className="mb-4 font-medium text-gray-700 flex justify-between">
                    <span>Date 日期：{editingProject.applyDate}</span>
                    <span>Ref No 文檔號：{editingProject.refNo}</span>
                  </div>
                  <table className="sign-table">
                    <tbody>
                      <tr><th className="w-32 center">專案類型</th><td className="font-bold text-indigo-600">{editingProject.projectType === 'room' ? '🏨 住房專案' : '☕ 休閒 / 餐飲專案'}</td></tr>
                      <tr><th className="w-32 center">主旨</th><td className="font-bold text-lg">{editingProject.title}</td></tr>
                      <tr><th className="center">說明</th><td className="whitespace-pre-wrap">{editingProject.purpose}</td></tr>
                      <tr><th className="center">活動日期</th><td>{editingProject.startDate} ～ {editingProject.endDate}</td></tr>
                      <tr><th className="center">內容說明</th><td className="whitespace-pre-wrap">{editingProject.content}</td></tr>
                      <tr><th className="center">注意事項</th><td className="whitespace-pre-wrap">{editingProject.precautions}</td></tr>
                    </tbody>
                  </table>
                  
                  <h3 className="font-bold mb-2 text-lg mt-6">財務內拆表 (多重專案)</h3>
                  {(editingProject.breakdown || []).map((pkg: any, idx: number) => {
                    const otaVal = pkg.ota ? Math.round((parseFloat(String(pkg.price).replace(/,/g, "")) || 0) * (parseFloat(pkg.ota) / 100)) : 0;
                    return (
                      <div key={pkg.id || idx} className="mb-6">
                        <h4 className="font-bold text-indigo-800 mb-1">{pkg.name}</h4>
                        <table className="sign-table center !mb-0">
                          <thead>
                            <tr>
                              <th className="center" width="20%">售價</th>
                              <th className="center" width="20%">OTA抽成 ({pkg.ota || 0}%)</th>
                              {(pkg.items || []).map((item: any, iIdx: number) => (<th key={iIdx} className="center">{item.name}</th>))}
                              <th className="center" width="20%">淨價</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr>
                              <td className="font-medium">{pkg.price}</td>
                              <td className="text-red-600 font-medium">{otaVal > 0 ? `- ${otaVal}` : "0"}</td>
                              {(pkg.items || []).map((item: any, iIdx: number) => (<td key={iIdx}>{item.value}</td>))}
                              <td className="font-bold text-indigo-700 text-lg">{pkg.net}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    );
                  })}

                  <div className="mt-6 mb-8">
                    <h3 className="font-bold text-lg text-red-600 mb-2">專案亮點</h3>
                    <p className="bg-red-50 p-4 rounded border font-medium whitespace-pre-wrap">{editingProject.highlights}</p>
                  </div>
                  <div className="mt-8">
                    <p className="font-bold mb-2 text-lg">擬辦：奉 核後，函知各相關部門後續作業</p>
                    <table className="sign-table">
                      <tbody><tr><th className="w-32 center">會簽單位</th><td className="font-medium">{(editingProject.countersign || []).map((c: any) => c.dept).join("、 ") || "無須會簽"}</td></tr></tbody>
                    </table>
                  </div>

                  {editingProject.countersign?.length > 0 && (
                    <div className="mt-8 border border-gray-300 rounded-lg overflow-hidden shadow-sm">
                      <div className="bg-gray-100 px-4 py-2 font-bold text-gray-800 border-b flex items-center gap-2"><PenTool className="w-4 h-4 no-print" /> 會簽意見</div>
                      <div className="p-4 bg-gray-50 space-y-4">
                        {editingProject.countersign.map((c: any) => (
                          <div key={c.dept} className="flex flex-col border-b pb-3 last:border-0 last:pb-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-gray-900 bg-white px-2 py-0.5 rounded border">{c.dept}</span>
                              {c.status === "approved" ? (<span className="text-xs text-green-600 font-bold flex items-center gap-1"><CheckCircle className="w-3 h-3 no-print" /> 已確認 ({c.time})</span>) : (<span className="text-xs text-orange-600 font-bold">待確認...</span>)}
                            </div>
                            {c.status === "approved" ? (
                              <div className="text-black font-bold whitespace-pre-wrap pl-1 border-l-4 border-gray-400 ml-1 mt-1 p-2 bg-white rounded">{c.comment || "無意見。"}</div>
                            ) : (
                              editingProject.status === "countersigning" && (currentUser?.dept === c.dept || currentUser?.role === "admin") && (
                                <div className="flex gap-2 mt-2 no-print">
                                  <input type="text" id={`comment-${c.dept}`} className="flex-1 border rounded px-3 py-1.5 text-sm" placeholder={currentUser?.role === 'admin' ? "管理員強制代簽" : "請填寫會簽意見"} />
                                  <button onClick={() => submitDeptComment(c.dept, (document.getElementById(`comment-${c.dept}`) as HTMLInputElement).value)} className="bg-indigo-600 text-white px-4 py-1.5 rounded text-sm font-bold hover:bg-indigo-700">送出確認</button>
                                </div>
                              )
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {editingProject.status === "unconfirmed" && editingProject.feedback && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mt-6">
                      <div className="flex gap-2 text-orange-800 font-bold mb-1"><MessageSquare className="w-5 h-5 no-print" /> 主管退回意見：</div>
                      <p className="text-orange-700 font-bold border-l-4 border-orange-400 pl-2 ml-1">{editingProject.feedback}</p>
                    </div>
                  )}
                  {editingProject.status === "revision" && editingProject.feedback && (
                    <div className="bg-orange-50 p-4 rounded-lg border border-orange-200 mt-6">
                      <div className="flex gap-2 text-orange-800 font-bold mb-1"><MessageSquare className="w-5 h-5 no-print" /> 主管退回意見：</div>
                      <p className="text-orange-700 font-bold border-l-4 border-orange-400 pl-2 ml-1">{editingProject.feedback}</p>
                    </div>
                  )}

                  <div className="flex gap-3 pt-6 border-t mt-6 no-print justify-end">
                    {editingProject.status === "revision" && editingProject.creator?.includes(currentUser?.name) && (
                      <button onClick={submitRevisionToManager} className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2">修改完成，送交審核 <ArrowRight className="w-4 h-4" /></button>
                    )}
                    {["admin", "gm"].includes(currentUser?.role) && editingProject.status === "unconfirmed" && (
                      <><button onClick={approveByManager} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold">核准排程</button>
                      <button onClick={rejectByManager} className="bg-orange-500 text-white px-6 py-2 rounded-lg font-bold">退回修改</button></>
                    )}
                    {(["admin", "gm"].includes(currentUser?.role) || (currentUser?.role === "employee" && editingProject.creator?.includes(currentUser?.name))) && editingProject.status !== "scheduled" && (
                      <button onClick={() => setModalMode("edit")} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-6 py-2 rounded-lg font-medium"><Edit className="w-4 h-4" /> 編輯</button>
                    )}
                  </div>
                </div>
              ) : (
                
                // --- 📝 編輯模式表單 ---
                <form id="project-form" onSubmit={handleSave} className="space-y-8 max-w-4xl mx-auto bg-white">
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b pb-2 text-indigo-800 flex items-center gap-2">一、基本資料</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block font-medium mb-1">文檔號</label><input type="text" className="w-full border rounded-lg p-2.5 bg-gray-50" value={editingProject.refNo} onChange={(e) => setEditingProject({ ...editingProject, refNo: e.target.value })} /></div>
                      <div><label className="block font-medium mb-1">申請日期</label><input type="date" className="w-full border rounded-lg p-2.5 bg-gray-50" value={editingProject.applyDate} onChange={(e) => setEditingProject({ ...editingProject, applyDate: e.target.value })} /></div>
                    </div>
                    {/* 🌟 專案類型選擇 */}
                    <div className="pt-2">
                      <label className="block font-medium mb-2">專案類型</label>
                      <div className="flex gap-6">
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700"><input type="radio" name="projectType" checked={editingProject.projectType === 'room'} onChange={() => setEditingProject({...editingProject, projectType: 'room'})} className="w-5 h-5 text-indigo-600" />🏨 住房專案</label>
                        <label className="flex items-center gap-2 cursor-pointer font-bold text-gray-700"><input type="radio" name="projectType" checked={editingProject.projectType === 'leisure'} onChange={() => setEditingProject({...editingProject, projectType: 'leisure'})} className="w-5 h-5 text-indigo-600" />☕ 休閒 / 餐飲專案</label>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b pb-2 text-indigo-800">二、活動內容</h3>
                    <div><label className="block font-medium mb-1">專案主旨</label><input type="text" required className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" value={editingProject.title} onChange={(e) => setEditingProject({ ...editingProject, title: e.target.value })} /></div>
                    <div><label className="block font-medium mb-1">企劃目的</label><textarea rows={2} className="w-full border rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500" value={editingProject.purpose} onChange={(e) => setEditingProject({ ...editingProject, purpose: e.target.value })}></textarea></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block font-medium mb-1">總區間 - 開始日期</label><input type="date" required className="w-full border rounded-lg p-2.5" value={editingProject.startDate} onChange={(e) => setEditingProject({ ...editingProject, startDate: e.target.value })} /></div>
                      <div><label className="block font-medium mb-1">總區間 - 結束日期</label><input type="date" required className="w-full border rounded-lg p-2.5" value={editingProject.endDate} onChange={(e) => setEditingProject({ ...editingProject, endDate: e.target.value })} /></div>
                    </div>
                    <div><label className="block font-medium mb-1">內容說明</label><textarea rows={4} className="w-full border rounded-lg p-2.5" value={editingProject.content} onChange={(e) => setEditingProject({ ...editingProject, content: e.target.value })}></textarea></div>
                    <div><label className="block font-medium mb-1">注意事項</label><textarea rows={3} className="w-full border rounded-lg p-2.5" value={editingProject.precautions} onChange={(e) => setEditingProject({ ...editingProject, precautions: e.target.value })}></textarea></div>
                    <div><label className="block font-medium text-red-600 mb-1">專案亮點</label><textarea rows={2} className="w-full border-red-200 rounded-lg p-2.5 bg-red-50 focus:ring-red-500" value={editingProject.highlights} onChange={(e) => setEditingProject({ ...editingProject, highlights: e.target.value })}></textarea></div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex justify-between items-center border-b pb-2">
                      <h3 className="font-bold text-lg text-indigo-800">三、財務內拆表 (支援多重專案)</h3>
                      <button type="button" onClick={handleAddPackage} className="text-sm flex items-center gap-1 bg-indigo-600 text-white px-3 py-1.5 rounded-lg shadow-sm hover:bg-indigo-700">
                        <Plus className="w-4 h-4" /> 新增一個子專案
                      </button>
                    </div>

                    {/* 🌟 全新的多重包裹拆帳 UI */}
                    {(editingProject.breakdown || []).map((pkg: any, pIdx: number) => {
                      const otaVal = pkg.ota ? Math.round((parseFloat(String(pkg.price).replace(/,/g, "")) || 0) * (parseFloat(pkg.ota) / 100)) : 0;
                      return (
                        <div key={pkg.id || pIdx} className="bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6 shadow-sm">
                          <div className="flex justify-between items-center mb-4">
                            <input type="text" className="font-bold text-lg text-indigo-800 bg-transparent border-b-2 border-indigo-300 focus:border-indigo-600 outline-none px-1 py-1 w-2/3" value={pkg.name} onChange={(e) => updatePackage(pIdx, 'name', e.target.value)} placeholder="輸入專案名稱 (例：專案一 湯屋2H)" />
                            {editingProject.breakdown.length > 1 && (<button type="button" onClick={() => handleRemovePackage(pIdx)} className="text-red-500 hover:text-red-700 flex items-center gap-1 text-sm font-bold bg-red-50 px-2 py-1 rounded"><Trash2 className="w-4 h-4" /> 刪除此專案</button>)}
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4 bg-white p-3 rounded-lg border">
                            <div><label className="block text-xs font-bold text-gray-500 mb-1">售價</label><input type="text" className="w-full border rounded p-2 text-sm font-bold" value={pkg.price} onChange={(e) => updatePackage(pIdx, 'price', e.target.value)} placeholder="總金額" /></div>
                            <div>
                               <label className="block text-xs font-bold text-gray-500 mb-1">OTA 抽成 (%)</label>
                               <div className="relative">
                                  <span className="absolute left-3 top-2 text-gray-500 font-bold text-sm">%</span>
                                  <input type="number" className="w-full border rounded p-2 text-sm pl-8" value={pkg.ota} onChange={(e) => updatePackage(pIdx, 'ota', e.target.value)} placeholder="例: 15" />
                               </div>
                            </div>
                            <div><label className="block text-xs font-bold text-red-500 mb-1">OTA 扣除額</label><div className="w-full bg-red-50 border border-red-100 rounded p-2 text-sm font-bold text-red-700">- {otaVal}</div></div>
                            <div><label className="block text-xs font-bold text-indigo-600 mb-1">最終淨價 (扣除OTA與內扣)</label><div className="w-full bg-indigo-100 border border-indigo-200 rounded p-2 text-lg font-black text-indigo-800">{pkg.net}</div></div>
                          </div>

                          <div className="mt-4">
                            <div className="flex justify-between items-center mb-2">
                              <label className="font-bold text-sm">內部扣除成本設定：</label>
                              <button type="button" onClick={() => handleAddPackageItem(pIdx)} className="text-xs flex items-center gap-1 bg-white border border-gray-300 text-gray-700 px-2 py-1 rounded hover:bg-gray-100"><Plus className="w-3 h-3" /> 自訂扣除項目</button>
                            </div>
                            <div className="flex flex-wrap gap-2 mb-3">
                              <span className="text-xs text-gray-500 py-1">快速新增：</span>
                              {PRESET_BREAKDOWN_ITEMS.map((preset) => (
                                <button key={preset} type="button" onClick={() => handleTogglePreset(pIdx, preset)} className={`text-xs px-2 py-1 rounded border transition-colors ${(pkg.items || []).some((i: any) => i.name === preset) ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 hover:bg-gray-100'}`}>{(pkg.items || []).some((i: any) => i.name === preset) ? '✓ ' : ''}{preset}</button>
                              ))}
                            </div>
                            {(pkg.items || []).length > 0 && (
                              <table className="w-full border-collapse border bg-white text-sm">
                                <thead><tr className="bg-gray-100"><th className="border p-2 text-left w-1/2">扣除項目名稱</th><th className="border p-2 text-left">扣除金額</th><th className="border p-2 w-12"></th></tr></thead>
                                <tbody>
                                  {(pkg.items || []).map((item: any, iIdx: number) => (
                                    <tr key={iIdx}>
                                      <td className="border p-1"><input type="text" className="w-full p-1 outline-none" value={item.name} onChange={(e) => handlePackageItemChange(pIdx, iIdx, 'name', e.target.value)} placeholder="名稱" /></td>
                                      <td className="border p-1"><input type="text" className="w-full p-1 outline-none" value={item.value} onChange={(e) => handlePackageItemChange(pIdx, iIdx, 'value', e.target.value)} placeholder="金額" /></td>
                                      <td className="border p-1 text-center"><button type="button" onClick={() => handleRemovePackageItem(pIdx, iIdx)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4 mx-auto" /></button></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  </div>
                  <div className="space-y-4">
                    <h3 className="font-bold text-lg border-b pb-2 text-indigo-800">四、會簽與設定</h3>
                    <div>
                      <label className="block font-medium mb-2">需會簽之部門</label>
                      <div className="flex flex-wrap gap-3">
                        {DEPARTMENTS.map((dept) => (
                          <label key={dept} className="flex items-center gap-2 bg-gray-50 border px-3 py-2 rounded-lg cursor-pointer">
                            <input type="checkbox" checked={(editingProject.countersign || []).some((c: any) => c.dept === dept)} onChange={() => handleToggleDept(dept)} className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-medium">{dept}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  </div>
                </form>
              )}
            </div>
            
            {/* Footer */}
            {modalMode !== "view" && (
              <div className="px-6 py-4 border-t bg-gray-50 flex justify-end gap-3 no-print">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-6 py-2 text-gray-600 bg-white border rounded-lg font-medium">取消</button>
                <button type="submit" form="project-form" className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-medium">儲存簽呈</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
