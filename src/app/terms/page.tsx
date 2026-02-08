import type { Metadata } from "next";
import TermsOfServiceContent from "@/components/legal/TermsOfServiceContent";

export const metadata: Metadata = {
  title: "Terms of Service – SwitchCV",
  description: "Terms and conditions for using the SwitchCV platform.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-6 py-16">
        <TermsOfServiceContent />
      </div>
    </div>
  );
}
