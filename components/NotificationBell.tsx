"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, Sparkles, CheckCircle2, Volume2, VolumeX, Check, Trash2, 
  ExternalLink, AlertTriangle, AlertCircle, Info, ShieldAlert, X,
  Search, Loader2, Wifi, WifiOff, RefreshCw, ChevronDown, Calendar,
  Megaphone, CheckCheck, MessageSquare, Volume1, Settings, Copy, CheckIcon,
  SlidersHorizontal, UserCheck, Layers, Play, Clock, Pin, PinOff, Sliders, CheckSquare, Square,
  Download, Moon, Sun, Filter, AlertOctagon
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Notification {
  id: string;
  title: string;
  message: string;
  role: string;
  is_read: boolean;
  link?: string;
  created_at: string;
  is_pinned?: boolean;
}

interface NotificationBellProps {
  currentRole: string;
}

export default function NotificationBell({ currentRole }: NotificationBellProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRealtimeConnected, setIsRealtimeConnected] = useState<boolean>(true);
  const [pageLimit, setPageLimit] = useState<number>(20);
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  // Preferensi Suara & DND
  const [soundEnabled, setSoundEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notif_sound_enabled");
      return saved !== null ? JSON.parse(saved) : true;
    }
    return true;
  });

  const [speechEnabled, setSpeechEnabled] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notif_speech_enabled");
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });

  const [soundVolume, setSoundVolume] = useState<number>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notif_sound_volume");
      return saved !== null ? parseFloat(saved) : 0.15;
    }
    return 0.15;
  });

  const [dndMode, setDndMode] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("notif_dnd_mode");
      return saved !== null ? JSON.parse(saved) : false;
    }
    return false;
  });

  // Ref untuk menghindari stale closure pada callback realtime tanpa trigger re-subscribing WebSocket
  const audioPrefsRef = useRef({ soundEnabled, speechEnabled, soundVolume, dndMode });
  useEffect(() => {
    audioPrefsRef.current = { soundEnabled, speechEnabled, soundVolume, dndMode };
  }, [soundEnabled, speechEnabled, soundVolume, dndMode]);

  // State Filters
  const [filterTab, setFilterTab] = useState<"all" | "unread" | "alert" | "info" | "rejected">("all");
  const [roleFilter, setRoleFilter] = useState<"all_roles" | "role_only" | "system_all">("all_roles");
  const [timeRangeFilter, setTimeRangeFilter] = useState<"all" | "today" | "week">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // State UI
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isBatchMode, setIsBatchMode] = useState<boolean>(false);
  const [latestToast, setLatestToast] = useState<Notification | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAdminRole = currentRole?.toLowerCase().includes("admin");

  // Simpan preferensi ke localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("notif_sound_enabled", JSON.stringify(soundEnabled));
      localStorage.setItem("notif_speech_enabled", JSON.stringify(speechEnabled));
      localStorage.setItem("notif_sound_volume", JSON.stringify(soundVolume));
      localStorage.setItem("notif_dnd_mode", JSON.stringify(dndMode));
    }
  }, [soundEnabled, speechEnabled, soundVolume, dndMode]);

  // Audio & Speech Handlers
  const playChimeSound = useCallback(() => {
    const { soundEnabled, soundVolume, dndMode } = audioPrefsRef.current;
    if (!soundEnabled || dndMode) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.setValueAtTime(587.33, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.15);

      gain.gain.setValueAtTime(soundVolume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start();
      osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }, []);

  const speakNotificationTitle = useCallback((title: string) => {
    const { speechEnabled, soundVolume, dndMode } = audioPrefsRef.current;
    if (!speechEnabled || dndMode || typeof window === "undefined" || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(title);
      utterance.lang = "id-ID";
      utterance.rate = 1.0;
      utterance.volume = soundVolume * 5;
      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.error("Gagal menjalankan Text-to-Speech:", err);
    }
  }, []);

  const triggerNativeDesktopNotif = useCallback((notif: Notification) => {
    const { dndMode } = audioPrefsRef.current;
    if (dndMode) return;
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
      if (document.hidden) {
        new Notification(notif.title, {
          body: notif.message,
          icon: "/icon.png",
        });
      }
    }
  }, []);

  // ✅ OPTIMASI 1: Ambil hanya kolom yang diperlukan untuk hemat Egress
  const fetchNotifications = useCallback(async (limitCount = pageLimit) => {
    setIsLoading(true);

    let query = supabase
      .from("notifications")
      .select("id, title, message, role, is_read, link, created_at, is_pinned")
      .order("created_at", { ascending: false })
      .limit(limitCount);

    if (!isAdminRole) {
      query = query.or(`role.eq.${currentRole},role.eq.all,role.eq.kasir`);
    }

    const { data, error } = await query;

    if (data && !error) {
      setNotifications(data.map((item) => ({ ...item, is_pinned: item.is_pinned || false })));
      setHasMore(data.length >= limitCount);
      setLastRefreshedAt(new Date());
    }
    setIsLoading(false);
  }, [currentRole, isAdminRole, pageLimit]);

  // Network State Listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleOnline = () => {
      setIsOnline(true);
      fetchNotifications();
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [fetchNotifications]);

  // Request Native Permission
  useEffect(() => {
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // ✅ OPTIMASI 2: Realtime Listener Terisolasi & Tanpa Interval Polling
  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel(`realtime-bell-v9-${currentRole}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = { ...(payload.new as Notification), is_pinned: false };
          const isTargetForUser = isAdminRole || newNotif.role === currentRole || newNotif.role === "all" || newNotif.role === "kasir";

          if (isTargetForUser) {
            setNotifications((prev) => [newNotif, ...prev]);
            playChimeSound();
            speakNotificationTitle(newNotif.title);
            triggerNativeDesktopNotif(newNotif);
            
            if (!audioPrefsRef.current.dndMode) {
              setLatestToast(newNotif);
              setTimeout(() => {
                setLatestToast((curr) => (curr?.id === newNotif.id ? null : curr));
              }, 4000);
            }
          }
        }
      )
      .subscribe((status) => {
        setIsRealtimeConnected(status === "SUBSCRIBED");
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentRole, isAdminRole, fetchNotifications, playChimeSound, speakNotificationTitle, triggerNativeDesktopNotif]);

  // Click Outside & Hotkey Listener
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettingsPanel(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        setShowClearConfirmModal(false);
        setShowSettingsPanel(false);
        setIsBatchMode(false);
      }
      if (event.altKey && (event.key === "n" || event.key === "N")) {
        event.preventDefault();
        setIsOpen((prev) => !prev);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  // Action Handlers
  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    let query = supabase.from("notifications").update({ is_read: true }).eq("is_read", false);
    if (!isAdminRole) {
      query = query.or(`role.eq.${currentRole},role.eq.all`);
    }
    await query;
  };

  const handleConfirmClearAll = async () => {
    setShowClearConfirmModal(false);
    setNotifications([]);
    let query = supabase.from("notifications").delete();
    if (!isAdminRole) {
      query = query.or(`role.eq.${currentRole},role.eq.all`);
    }
    await query;
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    await supabase.from("notifications").delete().eq("id", id);
  };

  const handleMarkSingleAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    await supabase.from("notifications").update({ is_read: true }).eq("id", id);
  };

  const handleCopyMessage = (e: React.MouseEvent, notif: Notification) => {
    e.stopPropagation();
    navigator.clipboard.writeText(`${notif.title}: ${notif.message}`);
    setCopiedId(notif.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleItemClick = async (notif: Notification) => {
    if (isBatchMode) {
      toggleSelectItem(notif.id);
      return;
    }

    if (!notif.is_read) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, is_read: true } : n))
      );
      await supabase.from("notifications").update({ is_read: true }).eq("id", notif.id);
    }

    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleLoadMore = () => {
    const newLimit = pageLimit + 15;
    setPageLimit(newLimit);
    fetchNotifications(newLimit);
  };

  const handleTogglePin = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    const target = notifications.find((n) => n.id === id);
    if (!target) return;
    const newPinnedState = !target.is_pinned;
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_pinned: newPinnedState } : n))
    );
    await supabase.from("notifications").update({ is_pinned: newPinnedState }).eq("id", id);
  };

  const toggleSelectItem = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllFiltered = () => {
    if (selectedIds.length === filteredNotifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredNotifications.map((n) => n.id));
    }
  };

  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n.id)));
    await supabase.from("notifications").delete().in("id", selectedIds);
    setSelectedIds([]);
    setIsBatchMode(false);
  };

  const handleBatchMarkAsRead = async () => {
    if (selectedIds.length === 0) return;
    setNotifications((prev) =>
      prev.map((n) => (selectedIds.includes(n.id) ? { ...n, is_read: true } : n))
    );
    await supabase.from("notifications").update({ is_read: true }).in("id", selectedIds);
    setSelectedIds([]);
    setIsBatchMode(false);
  };

  const handleExportCSV = () => {
    if (notifications.length === 0) return;
    const headers = ["ID,Title,Message,Role,IsRead,CreatedAt\n"];
    const rows = notifications.map(
      (n) =>
        `"${n.id}","${n.title.replace(/"/g, '""')}","${n.message.replace(/"/g, '""')}","${n.role}","${n.is_read}","${n.created_at}"`
    );
    const csvContent = "data:text/csv;charset=utf-8," + headers.concat(rows).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `notif_log_rsud_${currentRole}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Baru saja";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mnt lalu`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} jam lalu`;
    return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  };

  const isBrandNew = (dateString: string) => {
    const diffInSeconds = Math.floor((new Date().getTime() - new Date(dateString).getTime()) / 1000);
    return diffInSeconds < 300;
  };

  const getNotificationStyle = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("alert") || lower.includes("keamanan") || lower.includes("terkunci") || lower.includes("ditolak")) {
      return {
        type: "alert",
        icon: <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" />,
        badgeBg: "bg-rose-50 border-rose-200",
      };
    }
    if (lower.includes("terlambat") || lower.includes("peringatan") || lower.includes("pending")) {
      return {
        type: "alert",
        icon: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />,
        badgeBg: "bg-amber-50 border-amber-200",
      };
    }
    if (lower.includes("pengumuman") || lower.includes("sistem")) {
      return {
        type: "info",
        icon: <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" />,
        badgeBg: "bg-sky-50 border-sky-200",
      };
    }
    return {
      type: "normal",
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />,
      badgeBg: "bg-emerald-50 border-emerald-200",
    };
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const readPercentage = notifications.length > 0 ? Math.round(((notifications.length - unreadCount) / notifications.length) * 100) : 100;

  const filteredNotifications = notifications
    .filter((n) => {
      const matchSearch =
        n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        n.message.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchSearch) return false;

      if (roleFilter === "role_only" && n.role !== currentRole) return false;
      if (roleFilter === "system_all" && n.role !== "all") return false;

      if (timeRangeFilter !== "all") {
        const createdDate = new Date(n.created_at);
        const now = new Date();
        if (timeRangeFilter === "today") {
          if (createdDate.toDateString() !== now.toDateString()) return false;
        } else if (timeRangeFilter === "week") {
          const diffDays = (now.getTime() - createdDate.getTime()) / (1000 * 3600 * 24);
          if (diffDays > 7) return false;
        }
      }

      if (filterTab === "unread") return !n.is_read;
      if (filterTab === "alert") return getNotificationStyle(n.title).type === "alert";
      if (filterTab === "info") return getNotificationStyle(n.title).type === "info";
      if (filterTab === "rejected") {
        const lower = n.title.toLowerCase();
        return lower.includes("ditolak") || lower.includes("gagal") || lower.includes("batal");
      }

      return true;
    })
    .sort((a, b) => Number(b.is_pinned || false) - Number(a.is_pinned || false));

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shadow-sm focus:outline-none flex items-center justify-center active:scale-95"
          title="Pemberitahuan Sistem (Shortcut: Alt + N)"
        >
          <Bell className={`w-5 h-5 text-slate-700 ${unreadCount > 0 && !dndMode ? "animate-bounce" : ""}`} />
          {unreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow ${dndMode ? "bg-slate-500" : "bg-rose-600 animate-pulse"}`}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <>
            <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-[1px] z-40 sm:hidden"></div>

            <div className={`fixed sm:absolute bottom-0 sm:bottom-auto right-0 sm:mt-2 w-full sm:w-96 bg-white border rounded-t-3xl sm:rounded-2xl shadow-2xl z-50 overflow-hidden animate-in slide-in-from-bottom-5 sm:zoom-in-95 duration-200 max-h-[85vh] sm:max-h-none flex flex-col ${
              filterTab === "alert" ? "border-rose-400 ring-2 ring-rose-400/20" : "border-slate-200"
            }`}>
              <div className="sm:hidden w-12 h-1 bg-slate-300 rounded-full mx-auto my-2"></div>

              <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                    Notifikasi RSUD
                  </h3>
                  <span 
                    className={`inline-flex items-center gap-1 text-[9px] font-bold px-1.5 py-0.5 rounded-md ${
                      !isOnline ? "bg-amber-100 text-amber-800" : isRealtimeConnected ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}
                  >
                    {!isOnline ? <WifiOff className="w-2.5 h-2.5 text-amber-600" /> : isRealtimeConnected ? <Wifi className="w-2.5 h-2.5 text-emerald-600" /> : <WifiOff className="w-2.5 h-2.5 text-rose-600" />}
                    {!isOnline ? "No Net" : isRealtimeConnected ? "Live" : "Offline"}
                  </span>
                  {dndMode && (
                    <span className="text-[9px] bg-slate-800 text-white font-bold px-1 rounded flex items-center gap-0.5">
                      <Moon className="w-2.5 h-2.5" /> DND
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => { setIsBatchMode(!isBatchMode); setSelectedIds([]); }}
                    className={`p-1 transition rounded-lg hover:bg-slate-200/60 ${isBatchMode ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <CheckSquare className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => fetchNotifications()}
                    className="p-1 text-slate-400 hover:text-slate-600 transition rounded-lg hover:bg-slate-200/60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
                  </button>

                  <button
                    onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                    className={`p-1 transition rounded-lg hover:bg-slate-200/60 ${showSettingsPanel ? "text-emerald-600 bg-emerald-50" : "text-slate-400 hover:text-slate-600"}`}
                  >
                    <Settings className="w-3.5 h-3.5" />
                  </button>

                  {unreadCount > 0 && !isBatchMode && (
                    <button
                      onClick={handleMarkAllAsRead}
                      className="p-1 text-slate-500 hover:text-emerald-700 transition rounded-lg hover:bg-emerald-50 flex items-center gap-1 text-[11px] font-bold"
                    >
                      <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                    </button>
                  )}

                  {notifications.length > 0 && !isBatchMode && (
                    <button
                      onClick={() => setShowClearConfirmModal(true)}
                      className="p-1 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              <div className="w-full bg-slate-100 h-1">
                <div 
                  className="bg-emerald-500 h-1 transition-all duration-300"
                  style={{ width: `${readPercentage}%` }}
                ></div>
              </div>

              {showSettingsPanel && (
                <div className="p-3 bg-slate-100/80 border-b border-slate-200 text-xs space-y-2.5 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Volume2 className="w-3.5 h-3.5 text-slate-500" /> Nada Chime
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={playChimeSound}
                        className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-[10px] text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5" /> Tes
                      </button>
                      <button
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`px-2 py-0.5 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                          soundEnabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"
                        }`}
                      >
                        {soundEnabled ? "Aktif" : "Mute"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Volume1 className="w-3.5 h-3.5 text-slate-500" /> Pembaca Teks Suara
                    </span>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => speakNotificationTitle("Notifikasi sistem terhubung")}
                        className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 rounded text-[10px] text-slate-700 flex items-center gap-1 cursor-pointer"
                      >
                        <Play className="w-2.5 h-2.5" /> Tes
                      </button>
                      <button
                        onClick={() => setSpeechEnabled(!speechEnabled)}
                        className={`px-2 py-0.5 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                          speechEnabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"
                        }`}
                      >
                        {speechEnabled ? "Aktif" : "Nonaktif"}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60">
                    <span className="font-semibold text-slate-700 flex items-center gap-1.5">
                      <Moon className="w-3.5 h-3.5 text-slate-500" /> Mode DND
                    </span>
                    <button
                      onClick={() => setDndMode(!dndMode)}
                      className={`px-2 py-0.5 rounded-lg font-bold text-[10px] transition cursor-pointer ${
                        dndMode ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {dndMode ? "Aktif" : "Nonaktif"}
                    </button>
                  </div>

                  <div className="pt-1 border-t border-slate-200/60 flex items-center justify-between gap-2">
                    <span className="text-[10px] font-semibold text-slate-500 flex items-center gap-1">
                      <Sliders className="w-3 h-3" /> Volume Audio
                    </span>
                    <input
                      type="range"
                      min="0.01"
                      max="0.5"
                      step="0.01"
                      value={soundVolume}
                      onChange={(e) => setSoundVolume(parseFloat(e.target.value))}
                      className="w-28 h-1 bg-slate-300 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                    />
                  </div>

                  <div className="pt-1.5 border-t border-slate-200/60">
                    <button
                      onClick={handleExportCSV}
                      disabled={notifications.length === 0}
                      className="w-full py-1 bg-white hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg text-[10px] font-bold transition flex items-center justify-center gap-1 cursor-pointer disabled:opacity-50"
                    >
                      <Download className="w-3 h-3 text-slate-600" /> Ekspor Log Notifikasi (.CSV)
                    </button>
                  </div>
                </div>
              )}

              {isBatchMode && (
                <div className="p-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleSelectAllFiltered}
                      className="text-slate-700 hover:text-emerald-700 font-bold flex items-center gap-1"
                    >
                      {selectedIds.length === filteredNotifications.length ? (
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                      ) : (
                        <Square className="w-3.5 h-3.5 text-slate-400" />
                      )}
                      <span>Pilih Semua ({selectedIds.length})</span>
                    </button>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={handleBatchMarkAsRead}
                      disabled={selectedIds.length === 0}
                      className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 rounded-lg text-[10px] font-bold shadow-sm disabled:opacity-50"
                    >
                      Dibaca
                    </button>
                    <button
                      onClick={handleBatchDelete}
                      disabled={selectedIds.length === 0}
                      className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-[10px] font-bold shadow-sm disabled:opacity-50"
                    >
                      Hapus
                    </button>
                  </div>
                </div>
              )}

              <div className="p-2 border-b border-slate-100 bg-white flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Cari notifikasi..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ×
                    </button>
                  )}
                </div>

                <select
                  value={timeRangeFilter}
                  onChange={(e) => setTimeRangeFilter(e.target.value as "all" | "today" | "week")}
                  className="bg-slate-50 border border-slate-200 rounded-xl px-2 py-1.5 text-[11px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="all">Semua Waktu</option>
                  <option value="today">Hari Ini</option>
                  <option value="week">7 Hari Terakhir</option>
                </select>
              </div>

              <div className="flex border-b border-slate-100 bg-slate-50/70 px-3 py-1 gap-2 text-[10px] font-medium text-slate-500">
                <button
                  onClick={() => setRoleFilter("all_roles")}
                  className={`hover:text-slate-900 transition flex items-center gap-1 cursor-pointer ${roleFilter === "all_roles" ? "font-bold text-slate-900 underline underline-offset-4" : ""}`}
                >
                  <Layers className="w-3 h-3" /> Semua Target
                </button>
                <span>•</span>
                <button
                  onClick={() => setRoleFilter("role_only")}
                  className={`hover:text-slate-900 transition flex items-center gap-1 cursor-pointer ${roleFilter === "role_only" ? "font-bold text-slate-900 underline underline-offset-4" : ""}`}
                >
                  <UserCheck className="w-3 h-3" /> Khusus {currentRole.toUpperCase()}
                </button>
                <span>•</span>
                <button
                  onClick={() => setRoleFilter("system_all")}
                  className={`hover:text-slate-900 transition flex items-center gap-1 cursor-pointer ${roleFilter === "system_all" ? "font-bold text-slate-900 underline underline-offset-4" : ""}`}
                >
                  <Megaphone className="w-3 h-3" /> Pengumuman Umum
                </button>
              </div>

              <div className="flex border-b border-slate-100 bg-slate-50/50 px-3 py-1.5 gap-1.5 text-[11px] overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setFilterTab("all")}
                  className={`px-2.5 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                    filterTab === "all" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200/60"
                  }`}
                >
                  Semua ({notifications.length})
                </button>
                <button
                  onClick={() => setFilterTab("unread")}
                  className={`px-2.5 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                    filterTab === "unread" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200/60"
                  }`}
                >
                  Belum Dibaca ({unreadCount})
                </button>
                <button
                  onClick={() => setFilterTab("alert")}
                  className={`px-2.5 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                    filterTab === "alert" ? "bg-rose-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200/60"
                  }`}
                >
                  Kritis/Alert
                </button>
                <button
                  onClick={() => setFilterTab("info")}
                  className={`px-2.5 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                    filterTab === "info" ? "bg-sky-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200/60"
                  }`}
                >
                  Informasi
                </button>
                <button
                  onClick={() => setFilterTab("rejected")}
                  className={`px-2.5 py-1 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                    filterTab === "rejected" ? "bg-amber-600 text-white shadow-sm" : "text-slate-500 hover:bg-slate-200/60"
                  }`}
                >
                  Ditolak
                </button>
              </div>

              <div className="max-h-80 sm:max-h-80 overflow-y-auto divide-y divide-slate-100 flex-1">
                {isLoading && notifications.length === 0 ? (
                  <div className="p-4 space-y-3">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="animate-pulse flex space-x-3">
                        <div className="rounded-full bg-slate-200 h-4 w-4"></div>
                        <div className="flex-1 space-y-1.5">
                          <div className="h-3 bg-slate-200 rounded w-3/4"></div>
                          <div className="h-2.5 bg-slate-200 rounded w-5/6"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filteredNotifications.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 font-medium space-y-1">
                    <p>
                      {searchQuery
                        ? `Tidak ada notifikasi yang cocok dengan "${searchQuery}"`
                        : filterTab === "unread"
                        ? "Tidak ada notifikasi yang belum dibaca"
                        : "Belum ada notifikasi baru"}
                    </p>
                  </div>
                ) : (
                  filteredNotifications.map((n) => {
                    const style = getNotificationStyle(n.title);
                    const brandNew = isBrandNew(n.created_at);
                    const isSelected = selectedIds.includes(n.id);
                    return (
                      <div
                        key={n.id}
                        onClick={() => handleItemClick(n)}
                        className={`p-3.5 text-xs transition cursor-pointer flex items-start justify-between space-x-3 group relative ${
                          n.is_pinned ? "bg-amber-50/60 hover:bg-amber-50" : ""
                        } ${
                          !n.is_read && !n.is_pinned
                            ? "bg-emerald-50/50 hover:bg-emerald-50/80 border-l-4 border-emerald-500"
                            : n.is_pinned
                            ? "border-l-4 border-amber-500"
                            : "bg-white hover:bg-slate-50"
                        }`}
                      >
                        {isBatchMode && (
                          <div className="pt-0.5">
                            {isSelected ? (
                              <CheckSquare className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Square className="w-4 h-4 text-slate-300" />
                            )}
                          </div>
                        )}

                        <div className="flex items-start space-x-2.5 flex-1">
                          {style.icon}
                          <div className="flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <div className="flex items-center gap-1.5">
                                <p className="font-bold text-slate-800 leading-snug">
                                  {n.title}
                                </p>
                                {n.is_pinned && (
                                  <span className="text-[9px] bg-amber-200 text-amber-800 font-bold px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                    <Pin className="w-2.5 h-2.5" /> Sematan
                                  </span>
                                )}
                                {brandNew && !n.is_pinned && (
                                  <span className="text-[9px] bg-emerald-600 text-white font-bold px-1.5 py-0.2 rounded-full animate-pulse">
                                    Baru
                                  </span>
                                )}
                              </div>
                              {n.link && (
                                <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                              )}
                            </div>
                            <p className="text-slate-600 mt-0.5 leading-relaxed">
                              {n.message}
                            </p>
                            <div className="flex items-center justify-between mt-1.5">
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                                {formatTimeAgo(n.created_at)}
                                {n.role === "all" && <span className="text-[9px] bg-slate-100 text-slate-500 px-1 rounded">Sistem</span>}
                                {n.role && n.role !== "all" && <span className="text-[9px] bg-emerald-100 text-emerald-800 px-1 rounded font-bold uppercase">{n.role}</span>}
                              </span>
                              {!n.is_read && (
                                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                              )}
                            </div>
                          </div>
                        </div>

                        {!isBatchMode && (
                          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition">
                            <button
                              onClick={(e) => handleTogglePin(e, n.id)}
                              className={`p-1 transition rounded-lg hover:bg-slate-200/60 ${n.is_pinned ? "text-amber-600" : "text-slate-400 hover:text-slate-600"}`}
                            >
                              {n.is_pinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
                            </button>

                            <button
                              onClick={(e) => handleCopyMessage(e, n)}
                              className="p-1 text-slate-400 hover:text-slate-600 transition rounded-lg hover:bg-slate-200/60"
                            >
                              {copiedId === n.id ? <CheckIcon className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>

                            {!n.is_read && (
                              <button
                                onClick={(e) => handleMarkSingleAsRead(e, n.id)}
                                className="p-1 text-slate-400 hover:text-emerald-600 transition rounded-lg hover:bg-emerald-50"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={(e) => handleDeleteItem(e, n.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}

                {hasMore && !searchQuery && filterTab === "all" && (
                  <div className="p-2 text-center bg-slate-50">
                    <button
                      onClick={handleLoadMore}
                      disabled={isLoading}
                      className="text-[11px] font-bold text-slate-600 hover:text-emerald-600 transition inline-flex items-center gap-1 cursor-pointer"
                    >
                      {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <ChevronDown className="w-3 h-3" />}
                      <span>Muat Notifikasi Lama</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="p-2.5 bg-slate-50 border-t border-slate-100 space-y-1.5 text-center">
                <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
                  <span className="flex items-center gap-1">
                    <Clock className="w-2.5 h-2.5" />
                    Sync: {lastRefreshedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <span>
                    Menampilkan {filteredNotifications.length} dari {notifications.length}
                  </span>
                </div>

                <button
                  onClick={() => setIsOpen(false)}
                  className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
                >
                  Tutup Panel
                </button>
              </div>

            </div>
          </>
        )}
      </div>

      {latestToast && !isOpen && !dndMode && (
        <div 
          onClick={() => handleItemClick(latestToast)}
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 cursor-pointer animate-in slide-in-from-bottom-5 duration-300 flex items-start space-x-3 overflow-hidden relative"
        >
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 pr-2">
            <p className="text-xs font-bold text-white">{latestToast.title}</p>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{latestToast.message}</p>
          </div>
          <button 
            onClick={(e) => { e.stopPropagation(); setLatestToast(null); }}
            className="text-slate-400 hover:text-white p-0.5 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="absolute bottom-0 left-0 h-1 bg-emerald-500 animate-pulse w-full"></div>
        </div>
      )}

      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4 font-sans">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Bersihkan Notifikasi?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh notifikasi untuk role <span className="font-bold text-slate-700">{currentRole}</span> akan dihapus permanen dari database.
              </p>
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setShowClearConfirmModal(false)}
                className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmClearAll}
                className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow cursor-pointer"
              >
                Hapus Semua
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}