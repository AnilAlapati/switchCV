"use client";

import dynamic from "next/dynamic";

/**
 * Demo page with lazy-loaded 3D content.
 * Three.js + @react-three/* (~500KB) are only loaded when this page is visited.
 * Using next/dynamic with ssr: false because Three.js requires browser APIs.
 */
const DemoContent = dynamic(() => import("@/components/demo/DemoContent"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-screen bg-[#050505] flex items-center justify-center">
      <div className="text-white/50 text-lg animate-pulse" role="status" aria-live="polite">
        Loading 3D experience...
      </div>
    </div>
  ),
});

export default function DemoPage() {
  return <DemoContent />;
}
