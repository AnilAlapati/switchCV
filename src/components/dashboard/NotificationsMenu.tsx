"use client";

import { logger } from "@/lib/logger";

import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Notification, NotificationStatus } from "@/lib/notifications.types";
import { UI_CONFIG } from "@/config/constants";

export function NotificationsMenu() {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (!user) return;

    const fetchNotifications = async () => {
      try {
        const response = await fetch(
          `/api/notifications?action=get-notifications&userId=${user.uid}`
        );
        if (response.ok) {
          const data = await response.json();
          setNotifications(data.notifications || []);
          // Assuming status is a string enum value
          setUnreadCount(
            data.notifications.filter((n: any) => n.status !== "read").length
          );
        }
      } catch (error) {
        logger.error({ err: error }, "Failed to fetch notifications");
      }
    };

    fetchNotifications();
    // Poll interval configured in constants.ts to manage read costs
    const interval = setInterval(
      fetchNotifications,
      UI_CONFIG.NOTIFICATION_POLLING_INTERVAL_MS
    );
    return () => clearInterval(interval);
  }, [user]);

  const markAsRead = async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "mark-read",
          data: { notificationId },
        }),
      });

      setNotifications((prev) =>
        prev.map((n) =>
          n.id === notificationId
            ? { ...n, status: NotificationStatus.READ }
            : n
        )
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      logger.error({ err: error }, "Failed to mark as read");
    }
  };

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#2C4A3B]/60 hover:text-[#1A2F25] hover:bg-[#2C4A3B]/10 rounded-full transition-colors"
      >
        <svg
          className="w-6 h-6"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 bg-emerald-500 rounded-full text-[10px] flex items-center justify-center text-white font-bold shadow-sm">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl z-50 overflow-hidden border border-slate-100 ring-1 ring-black/5">
          <div className="p-3 border-b border-[#2C4A3B]/10 flex justify-between items-center bg-[#2C4A3B]/5">
            <h3 className="font-bold text-[#1A2F25] text-sm">Notifications</h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-[#2C4A3B]/50 text-sm">
                No notifications
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-3 border-b border-[#2C4A3B]/10 hover:bg-[#2C4A3B]/5 transition-colors cursor-pointer ${notification.status !== "read" ? "bg-white/40" : ""
                    }`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <p className="text-sm text-[#1A2F25] font-bold mb-1">
                    {notification.payload.title}
                  </p>
                  <p className="text-xs text-[#2C4A3B]/70 mb-2">
                    {notification.payload.body}
                  </p>
                  <span className="text-[10px] text-[#2C4A3B]/50">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
