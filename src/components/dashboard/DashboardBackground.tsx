import { BackgroundBlobs } from "@/components/ui/BackgroundBlobs";

interface DashboardBackgroundProps {
  children: React.ReactNode;
}

export function DashboardBackground({ children }: DashboardBackgroundProps) {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <BackgroundBlobs />
      <div className="relative z-10">{children}</div>
    </div>
  );
}
