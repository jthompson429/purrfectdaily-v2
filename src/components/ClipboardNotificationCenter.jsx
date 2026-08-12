import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Bell, CheckCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { base44 } from "@/api/base44Client";
import { useWorkspace } from "@/lib/workspaceContext";
import { wsUpdate } from "@/lib/workspaceApi";
import { toast } from "@/components/ui/use-toast";

function formatWhen(value) {
  if (!value) return "";
  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ClipboardNotificationCenter() {
  const { activeWorkspaceId } = useWorkspace();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const notifiedIds = useRef(new Set());
  const initialized = useRef(false);

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => base44.auth.me(),
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["clipboardNotifications", activeWorkspaceId, user?.id],
    queryFn: () => base44.entities.ClipboardNotification.filter(
      {
        workspace_id: activeWorkspaceId,
        recipient_user_id: user.id,
      },
      "-created_at",
      100
    ),
    enabled: Boolean(activeWorkspaceId && user?.id),
    refetchInterval: 8000,
    refetchIntervalInBackground: true,
  });

  const unread = useMemo(
    () => notifications.filter((notification) => !notification.read),
    [notifications]
  );

  useEffect(() => {
    if (!user?.id) return;
    const now = Date.now();

    notifications.forEach((notification) => {
      if (notification.read || notifiedIds.current.has(notification.id)) return;
      const age = now - new Date(notification.created_at || notification.created_date).getTime();
      const shouldToast = initialized.current || age < 30000;
      notifiedIds.current.add(notification.id);
      if (shouldToast) {
        toast({
          variant: "destructive",
          title: "Urgent Digital Clipboard entry",
          description: notification.title,
        });
      }
    });

    initialized.current = true;
  }, [notifications, user?.id]);

  const markRead = async (notification) => {
    if (!notification.read) {
      await wsUpdate(
        "ClipboardNotification",
        notification.id,
        { read: true, read_at: new Date().toISOString() },
        activeWorkspaceId
      );
      await qc.invalidateQueries({
        queryKey: ["clipboardNotifications", activeWorkspaceId, user?.id],
      });
    }
  };

  const openNotification = async (notification) => {
    await markRead(notification);
    setOpen(false);
    navigate("/clipboard");
  };

  const markAllRead = async () => {
    await Promise.all(unread.map(markRead));
  };

  return (
    <div className="relative">
      <button
        type="button"
        aria-label={unread.length > 0
          ? `${unread.length} unread urgent clipboard ${unread.length === 1 ? "notification" : "notifications"}`
          : "Notifications"}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="relative flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
      >
        <Bell className="h-4 w-4" />
        {unread.length > 0 && (
          <span className="absolute right-0 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-black text-destructive-foreground">
            {unread.length > 99 ? "99+" : unread.length}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40"
            aria-label="Close notifications"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full z-50 mt-2 w-[min(22rem,calc(100vw-2rem))] rounded-2xl border bg-popover p-2 shadow-xl">
            <div className="flex items-center justify-between gap-3 px-2 py-2">
              <div>
                <p className="text-sm font-black">Urgent notifications</p>
                <p className="text-xs text-muted-foreground">
                  {unread.length} unread
                </p>
              </div>
              {unread.length > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="inline-flex items-center gap-1 text-xs font-bold text-primary"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 space-y-1 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                  No urgent Clipboard notifications.
                </p>
              ) : notifications.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className={`w-full rounded-xl p-3 text-left transition-colors hover:bg-muted ${notification.read ? "opacity-65" : "bg-destructive/5"}`}
                >
                  <div className="flex items-start gap-2">
                    <AlertTriangle className={`mt-0.5 h-4 w-4 shrink-0 ${notification.read ? "text-muted-foreground" : "text-destructive"}`} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold">{notification.title}</p>
                      <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                        {notification.message}
                      </p>
                      <p className="mt-1 text-[10px] text-muted-foreground">
                        {formatWhen(notification.created_at || notification.created_date)}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-destructive" />
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
