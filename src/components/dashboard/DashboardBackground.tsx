interface DashboardBackgroundProps {
  children: React.ReactNode;
}

export function DashboardBackground({ children }: DashboardBackgroundProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[#FFFFF8]">
      {/* Paper texture overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] mix-blend-multiply bg-[url('https://www.transparenttextures.com/patterns/cream-paper.png')]" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
