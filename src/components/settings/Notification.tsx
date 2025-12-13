"use client";

interface NotificationProps {
  type: "success" | "error";
  text: string;
}

export function Notification({ type, text }: NotificationProps) {
  return (
    <div
      className={`fixed bottom-8 right-8 px-6 py-4 rounded-2xl font-medium shadow-2xl backdrop-blur-xl border transition-all duration-500 animate-in slide-in-from-bottom-4 fade-in z-50 flex items-center gap-3 ${
        type === "success"
          ? "bg-white/90 text-[#1A2F25] border-[#2C4A3B]/20"
          : "bg-white/90 text-red-600 border-red-200"
      }`}
    >
      <div
        className={`w-2 h-2 rounded-full ${
          type === "success" ? "bg-[#2C4A3B]" : "bg-red-500"
        }`}
      />
      {text}
    </div>
  );
}
