import { useNavigate } from "@tanstack/react-router";
import { Bell, CheckCheck, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { memberNotifications } from "@/lib/logic";
import { useMe } from "@/lib/store";

export function MemberNotifications() {
  const { data, me, update, log } = useMe();
  const navigate = useNavigate();
  const notifications = memberNotifications(data, me);
  const unread = notifications.filter((n) => !n.read).length;
  function markRead(ids: string[]) {
    update((d) => ({ ...d, readNotificationIds: { ...d.readNotificationIds, [me.id]: [...new Set([...(d.readNotificationIds[me.id] ?? []), ...ids])] } }));
    log("notifications_read", "user", `Read ${ids.length} notification(s)`, me.id);
  }
  return (
    <Popover>
      <PopoverTrigger asChild><Button variant="outline" size="icon" aria-label={`Notifications${unread ? ` (${unread} unread)` : ""}`} title="Notifications" className="relative ml-auto shrink-0 rounded-full">
        <Bell className="h-4 w-4" />{unread > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] text-destructive-foreground">{unread > 99 ? "99+" : unread}</span>}
      </Button></PopoverTrigger>
      <PopoverContent align="end" className="w-96 max-w-[calc(100vw-2rem)] p-0">
        <div className="flex items-center justify-between border-b p-4"><h2 className="font-semibold">Notifications</h2><Button variant="ghost" size="icon" title="Mark all as read" aria-label="Mark all notifications as read" disabled={!unread} onClick={() => markRead(notifications.filter((n) => !n.read).map((n) => n.id))}><CheckCheck className="h-4 w-4" /></Button></div>
        <div className="max-h-96 overflow-y-auto">
          {!notifications.length ? <p className="p-5 text-sm text-muted-foreground">No notifications yet.</p> : notifications.map((n) => {
            const Icon = n.status === "approved" ? CheckCircle2 : n.status === "declined" || n.status === "cancelled" ? XCircle : Clock3;
            return <Button key={n.id} variant="ghost" className={`h-auto w-full justify-start whitespace-normal rounded-none border-b p-4 text-left ${!n.read ? "bg-accent/10" : ""}`} onClick={() => { if (!n.read) markRead([n.id]); navigate({ to: n.to }); }}>
              <Icon className={`h-4 w-4 shrink-0 ${n.status === "approved" ? "text-success" : n.status === "declined" ? "text-destructive" : "text-muted-foreground"}`} />
              <span className="min-w-0"><span className="block font-medium">{n.title}</span><span className="block break-words text-xs text-muted-foreground">{n.detail}</span><span className="mt-1 block text-xs text-muted-foreground">{format(new Date(n.at), "dd MMM HH:mm")}</span></span>
            </Button>;
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}