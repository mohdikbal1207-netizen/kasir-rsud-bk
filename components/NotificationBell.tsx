"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  Bell, Sparkles, CheckCircle2, Volume2, VolumeX, Check, Trash2, 
  ExternalLink, AlertTriangle, Info, ShieldAlert, X,
  Search, Loader2, Wifi, WifiOff, RefreshCw, ChevronDown, 
  Megaphone, CheckCheck, Volume1, Settings, Copy, CheckIcon,
  Play, Clock, Pin, PinOff, Sliders, CheckSquare, Square,
  Download, Moon, Filter
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
  const [pageLimit, setPageLimit] = useState<number>(15);
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

  const audioPrefsRef = useRef({ soundEnabled, speechEnabled, soundVolume, dndMode });
  useEffect(() => {
    audioPrefsRef.current = { soundEnabled, speechEnabled, soundVolume, dndMode };
  }, [soundEnabled, speechEnabled, soundVolume, dndMode]);

  // State Filters
  const [filterTab, setFilterTab] = useState<"all" | "alert" | "info">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // State UI
  const [showClearConfirmModal, setShowClearConfirmModal] = useState<boolean>(false);
  const [showSettingsPanel, setShowSettingsPanel] = useState<boolean>(false);
  const [latestToast, setLatestToast] = useState<Notification | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const isAdminRole = currentRole?.toLowerCase().includes("admin");

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("notif_sound_enabled", JSON.stringify(soundEnabled));
      localStorage.setItem("notif_speech_enabled", JSON.stringify(speechEnabled));
      localStorage.setItem("notif_sound_volume", JSON.stringify(soundVolume));
      localStorage.setItem("notif_dnd_mode", JSON.stringify(dndMode));
    }
  }, [soundEnabled, speechEnabled, soundVolume, dndMode]);

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

  const fetchNotifications = useCallback(async (limitCount = pageLimit) => {
    setIsLoading(true);

    let query = supabase
      .from("notifications")
      .select("id, title, message, role, is_read, link, created_at, is_pinned")
      .order("created_at", { ascending: false })
      .limit(limitCount);

    if (!isAdminRole) {
      query = query.or(`role.eq.${currentRole},role.eq.all`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Gagal mengambil notifikasi:", error.message);
    }

    if (data && !error) {
      setNotifications(data.map((item) => ({ ...item, is_pinned: item.is_pinned || false })));
      setHasMore(data.length >= limitCount);
      setLastRefreshedAt(new Date());
    }
    setIsLoading(false);
  }, [currentRole, isAdminRole, pageLimit]);

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel(`realtime-bell-${currentRole}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
        },
        (payload) => {
          const newNotif = { ...(payload.new as Notification), is_pinned: false };
          const isTargetForUser = isAdminRole || newNotif.role === currentRole || newNotif.role === "all";

          if (isTargetForUser) {
            setNotifications((prev) => [newNotif, ...prev]);
            playChimeSound();
            speakNotificationTitle(newNotif.title);
            
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
  }, [currentRole, isAdminRole, fetchNotifications, playChimeSound, speakNotificationTitle]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setShowSettingsPanel(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleItemClick = async (notif: Notification) => {
    setNotifications((prev) => prev.filter((n) => n.id !== notif.id));
    
    const { error } = await supabase.from("notifications").delete().eq("id", notif.id);
    if (error) {
      console.error("Gagal menghapus notifikasi saat diklik:", error.message);
    }

    setIsOpen(false);
    if (notif.link) {
      router.push(notif.link);
    }
  };

  const handleDeleteItem = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    setNotifications((prev) => prev.filter((n) => n.id !== id));

    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) {
      console.error("Gagal menghapus notifikasi:", error.message);
      fetchNotifications();
    }
  };

  const handleConfirmClearAll = async () => {
    setShowClearConfirmModal(false);
    setNotifications([]);
    
    let query = supabase.from("notifications").delete();
    
    if (!isAdminRole) {
      query = query.or(`role.eq.${currentRole},role.eq.all`);
    } else {
      // Klausul pengaman WHERE untuk memenuhi syarat Supabase DELETE
      query = query.not('id', 'is', null);
    }

    const { error } = await query;
    if (error) {
      console.error("Gagal menghapus semua notifikasi:", error.message);
      fetchNotifications();
    }
  };

  const getNotificationStyle = (title: string) => {
    const lower = title.toLowerCase();
    if (lower.includes("alert") || lower.includes("keamanan") || lower.includes("ditolak")) {
      return { type: "alert", icon: <ShieldAlert className="w-4 h-4 text-rose-600 flex-shrink-0 mt-0.5" /> };
    }
    if (lower.includes("peringatan") || lower.includes("pending")) {
      return { type: "alert", icon: <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" /> };
    }
    return { type: "info", icon: <Info className="w-4 h-4 text-sky-600 flex-shrink-0 mt-0.5" /> };
  };

  const filteredNotifications = notifications.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        n.message.toLowerCase().includes(searchQuery.toLowerCase());
    if (!matchSearch) return false;
    if (filterTab === "alert") return getNotificationStyle(n.title).type === "alert";
    if (filterTab === "info") return getNotificationStyle(n.title).type === "info";
    return true;
  }).sort((a, b) => Number(b.is_pinned || false) - Number(a.is_pinned || false));

  const unreadCount = notifications.length;

  return (
    <>
      <div className="relative inline-block text-left" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="relative p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer shadow-sm flex items-center justify-center active:scale-95"
          title="Notifikasi Sistem"
        >
          <Bell className={`w-5 h-5 text-slate-700 ${unreadCount > 0 && !dndMode ? "animate-bounce" : ""}`} />
          {unreadCount > 0 && (
            <span className={`absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow ${dndMode ? "bg-slate-500" : "bg-rose-600 animate-pulse"}`}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {isOpen && (
          <div className="fixed sm:absolute bottom-0 sm:bottom-auto right-0 sm:mt-2 w-full sm:w-96 bg-white border border-slate-200 rounded-t-3xl sm:rounded-2xl shadow-2xl z-50 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-3.5 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                <h3 className="text-xs font-black uppercase text-slate-900 tracking-wider">
                  Notifikasi ({currentRole})
                </h3>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => fetchNotifications()}
                  className="p-1 text-slate-400 hover:text-slate-600 transition rounded-lg hover:bg-slate-200/60"
                  title="Muat Ulang"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin text-emerald-600" : ""}`} />
                </button>

                <button
                  onClick={() => setShowSettingsPanel(!showSettingsPanel)}
                  className="p-1 text-slate-400 hover:text-slate-600 transition rounded-lg hover:bg-slate-200/60"
                  title="Pengaturan Suara"
                >
                  <Settings className="w-3.5 h-3.5" />
                </button>

                {notifications.length > 0 && (
                  <button
                    onClick={() => setShowClearConfirmModal(true)}
                    className="p-1 text-slate-400 hover:text-rose-600 transition rounded-lg hover:bg-rose-50"
                    title="Hapus Semua"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {showSettingsPanel && (
              <div className="p-3 bg-slate-100/90 border-b border-slate-200 text-xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Suara Chime</span>
                  <button
                    onClick={() => setSoundEnabled(!soundEnabled)}
                    className={`px-2 py-0.5 rounded-lg font-bold text-[10px] ${soundEnabled ? "bg-emerald-600 text-white" : "bg-slate-300 text-slate-600"}`}
                  >
                    {soundEnabled ? "Aktif" : "Mute"}
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-700">Mode DND</span>
                  <button
                    onClick={() => setDndMode(!dndMode)}
                    className={`px-2 py-0.5 rounded-lg font-bold text-[10px] ${dndMode ? "bg-slate-900 text-white" : "bg-slate-200 text-slate-600"}`}
                  >
                    {dndMode ? "Aktif" : "Nonaktif"}
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
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 flex-1">
              {isLoading && notifications.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400">Memuat notifikasi...</div>
              ) : filteredNotifications.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 font-medium space-y-1">
                  <p>Tidak ada notifikasi baru untuk akun Anda.</p>
                </div>
              ) : (
                filteredNotifications.map((n) => {
                  const style = getNotificationStyle(n.title);
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleItemClick(n)}
                      className="p-3.5 text-xs transition cursor-pointer flex items-start justify-between space-x-3 group bg-white hover:bg-emerald-50/40 border-l-4 border-emerald-500"
                    >
                      <div className="flex items-start space-x-2.5 flex-1">
                        {style.icon}
                        <div className="flex-1">
                          <p className="font-bold text-slate-800 leading-snug">{n.title}</p>
                          <p className="text-slate-600 mt-0.5 leading-relaxed">{n.message}</p>
                          <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                            {new Date(n.created_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => handleDeleteItem(e, n.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 transition rounded-lg"
                        title="Hapus"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <button
                onClick={() => setIsOpen(false)}
                className="w-full py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
              >
                Tutup Panel
              </button>
            </div>
          </div>
        )}
      </div>

      {latestToast && !isOpen && !dndMode && (
        <div 
          onClick={() => handleItemClick(latestToast)}
          className="fixed bottom-5 right-5 z-50 max-w-sm bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-800 cursor-pointer flex items-start space-x-3"
        >
          <Sparkles className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <div className="flex-1 pr-2">
            <p className="text-xs font-bold text-white">{latestToast.title}</p>
            <p className="text-[11px] text-slate-300 mt-0.5 line-clamp-2">{latestToast.message}</p>
          </div>
        </div>
      )}

      {showClearConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900">Bersihkan Semua Notifikasi?</h3>
              <p className="text-xs text-slate-500 mt-1">
                Seluruh notifikasi untuk role <span className="font-bold text-slate-700">{currentRole}</span> akan dihapus permanen.
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