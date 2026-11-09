import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { query, onSyncChange, update } from '../offline/data';
import { Bell, X, ExternalLink, CheckCheck } from 'lucide-react';

type Notification = {
  id: number;
  title: string;
  message: string;
  notification_type: string;
  priority: string;
  is_read: boolean;
  created_at: string;
  patient?: number;
  patient_full_name?: string;
  url?: string;
};

function timeAgo(ts?: string): string {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function priorityBadge(priority?: string) {
  const p = (priority || '').toLowerCase();
  if (p === 'emergency' || p === 'urgent') return 'bg-red-100 text-red-700 border-red-200';
  if (p === 'high') return 'bg-orange-100 text-orange-700 border-orange-200';
  if (p === 'medium') return 'bg-yellow-100 text-yellow-700 border-yellow-200';
  return 'bg-slate-100 text-slate-600 border-slate-200';
}

function notificationTarget(n: Notification): string | null {
  const t = (n.notification_type || '').toLowerCase();
  if (t.includes('lab') || t.includes('result')) return '/labs';
  if (t.includes('handover')) return '/handovers';
  if (t.includes('referral')) return '/referrals';
  if (t.includes('vital') || t.includes('vitals')) return '/vitals';
  if (t.includes('admission') || t.includes('inpatient')) return '/inpatient';
  if (t.includes('pharmacy') || t.includes('medication')) return '/pharmacy';
  if (t.includes('billing') || t.includes('payment')) return '/billing';
  if (t.includes('insurance')) return '/insurance';
  if (t.includes('patient')) return `/patients/${n.patient || ''}`;
  if (n.url) return n.url;
  return null;
}

export default function NotificationBell() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  async function load() {
    setLoading(true);
    try {
      const data = await query('notifications');
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    const off = onSyncChange(load);
    return off;
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.is_read).length;
  const recent = [...notifications]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
    .slice(0, 10);

  async function handleMarkAsRead(n: Notification) {
    if (n.is_read || acting) return;
    setActing(true);
    try {
      await update('notifications', n.id, { is_read: true });
      setNotifications((prev) =>
        prev.map((x) => (x.id === n.id ? { ...x, is_read: true } : x)),
      );
    } catch {
      // keep existing state on failure
    } finally {
      setActing(false);
    }
  }

  async function handleMarkAllAsRead() {
    if (acting) return;
    setActing(true);
    try {
      const unread = notifications.filter((n) => !n.is_read);
      await Promise.all(
        unread.map((n) => update('notifications', n.id, { is_read: true })),
      );
      setNotifications((prev) => prev.map((x) => ({ ...x, is_read: true })));
    } catch {
      // keep existing state on failure
    } finally {
      setActing(false);
    }
  }

  function handleNotificationClick(n: Notification) {
    handleMarkAsRead(n);
    const target = notificationTarget(n);
    if (target) {
      navigate(target);
    }
    setOpen(false);
  }

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
        aria-label="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs text-white">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-80 rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
            <h3 className="text-sm font-semibold text-slate-900">Notifications</h3>
            <button
              onClick={() => setOpen(false)}
              className="rounded p-1 text-slate-400 hover:text-slate-600"
              aria-label="Close notifications"
            >
              <X size={14} />
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-sm text-slate-500">Loading...</div>
            ) : recent.length === 0 ? (
              <div className="p-4 text-center text-sm text-slate-500">No notifications.</div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recent.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    className={`flex w-full items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 ${
                      !n.is_read ? 'bg-cyan-50/50' : ''
                    }`}
                  >
                    <div className={`mt-0.5 rounded-full p-1.5 ${!n.is_read ? 'bg-cyan-100 text-cyan-600' : 'bg-slate-100 text-slate-400'}`}>
                      <Bell size={14} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${!n.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                        {n.title}
                      </p>
                      <p className="text-xs text-slate-500 truncate">{n.message}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-xs text-slate-400">{timeAgo(n.created_at)}</span>
                        {n.priority && (
                          <span className={`inline-flex rounded-full border px-1.5 py-0.5 text-xs ${priorityBadge(n.priority)}`}>
                            {n.priority}
                          </span>
                        )}
                      </div>
                    </div>
                    {!n.is_read && (
                      <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-cyan-500" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {recent.length > 0 && (
            <div className="flex items-center justify-between border-t border-slate-200 px-4 py-2">
              <button
                onClick={handleMarkAllAsRead}
                disabled={acting || unreadCount === 0}
                className="flex items-center gap-1 text-xs text-slate-600 hover:text-slate-900 disabled:opacity-50"
              >
                <CheckCheck size={14} />
                Mark all as read
              </button>
              <button
                onClick={() => { navigate('/messaging'); setOpen(false); }}
                className="flex items-center gap-1 text-xs text-cyan-600 hover:text-cyan-700"
              >
                View all <ExternalLink size={12} />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
