"use client";

interface NotificationProps {
  type: "success" | "error";
  text: string;
}

export function Notification({ type, text }: NotificationProps) {
  return (
    <div
      className={`fixed bottom-4 right-4 px-6 py-4 rounded-lg font-medium transition-all duration-300 ${
        type === "success"
          ? "bg-green-500/20 text-green-300 border border-green-500/30"
          : "bg-red-500/20 text-red-300 border border-red-500/30"
      }`}
    >
      {text}
    </div>
  );
}
