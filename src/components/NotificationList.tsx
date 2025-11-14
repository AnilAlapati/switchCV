// src/components/NotificationList.tsx
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Notification } from "@/types/profileSearch";
import { db } from "@/lib/firebase";
import { doc, updateDoc } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";

interface NotificationListProps {
  notifications: Notification[];
  loading: boolean;
  error: string | null;
  onClose: () => void;
}

export function NotificationList({
  notifications,
  loading,
  error,
  onClose,
}: NotificationListProps) {
  const { user } = useAuth();
  const router = useRouter();
  const [markingAsRead, setMarkingAsRead] = useState<string | null>(null);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;

    try {
      setMarkingAsRead(notificationId);
      const notifRef = doc(
        db,
        "users",
        user.uid,
        "notifications",
        notificationId
      );
      await updateDoc(notifRef, { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    } finally {
      setMarkingAsRead(null);
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    if (!notification.read) {
      await handleMarkAsRead(notification.id);
    }

    if (notification.actionUrl) {
      router.push(notification.actionUrl);
      onClose();
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "request":
        return "📥";
      case "approval":
        return "✅";
      case "denial":
        return "❌";
      case "expiry_warning":
        return "⏰";
      case "revoked":
        return "🔒";
      default:
        return "📬";
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "request":
        return "border-blue-500/30 bg-blue-900/10";
      case "approval":
        return "border-green-500/30 bg-green-900/10";
      case "denial":
        return "border-red-500/30 bg-red-900/10";
      case "expiry_warning":
        return "border-yellow-500/30 bg-yellow-900/10";
      case "revoked":
        return "border-gray-500/30 bg-gray-900/10";
      default:
        return "border-gray-500/30 bg-gray-900/10";
    }
  };

  return (
    <div className="absolute right-0 mt-2 w-96 max-h-96 bg-gray-800 border border-gray-700 rounded-lg shadow-lg z-50 overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-700 flex items-center justify-between">
        <h3 className="text-white font-semibold">Notifications</h3>
        <button
          onClick={onClose}
          className="text-gray-500 hover:text-white text-lg"
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {/* Content */}
      <div className="overflow-y-auto flex-1">
        {loading && (
          <div className="flex items-center justify-center h-32 text-gray-400">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
          </div>
        )}

        {error && <div className="p-4 text-red-400 text-sm">{error}</div>}

        {!loading && !error && notifications.length === 0 && (
          <div className="flex items-center justify-center h-32 text-gray-500">
            <p>No notifications yet</p>
          </div>
        )}

        {!loading &&
          !error &&
          notifications.map((notification) => (
            <div
              key={notification.id}
              onClick={() => handleNotificationClick(notification)}
              className={`px-4 py-3 border-l-4 cursor-pointer transition-colors hover:bg-gray-700/50 ${getNotificationColor(
                notification.type
              )} ${
                !notification.read
                  ? "border-l-blue-500 bg-gray-700/20"
                  : "border-l-transparent"
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="text-xl flex-shrink-0">
                  {getNotificationIcon(notification.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">
                    {notification.fromUserName || "Someone"}
                  </p>
                  <p className="text-xs text-gray-400 mt-1 line-clamp-2">
                    {notification.message ||
                      getNotificationMessage(notification)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {formatTime(notification.timestamp)}
                  </p>
                </div>
                {!notification.read && (
                  <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-1"></div>
                )}
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

function getNotificationMessage(notification: Notification): string {
  switch (notification.type) {
    case "request":
      return `requested access to your ${notification.resumeTitle || "resume"}`;
    case "approval":
      return `approved your access request for ${
        notification.resumeTitle || "their resume"
      }`;
    case "denial":
      return `denied your access request`;
    case "expiry_warning":
      return `your access to ${
        notification.resumeTitle || "a resume"
      } will expire soon`;
    case "revoked":
      return `revoked your access to ${
        notification.resumeTitle || "their resume"
      }`;
    default:
      return "new notification";
  }
}

function formatTime(date: Date | null | undefined): string {
  if (!date) return "just now";

  const now = new Date();
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

  return date.toLocaleDateString();
}
