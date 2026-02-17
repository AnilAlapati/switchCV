
import { AlertTriangle } from "lucide-react";

export default function BetaDisclaimer() {
    return (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-8 flex gap-3 items-start">
            <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-amber-900 leading-relaxed">
                <span className="font-semibold block mb-1">
                    Beta Version Disclaimer:
                </span>
                SwitchCV is currently in its MVP (Minimum Viable Product) phase. The
                legal agreements below are based on standard templates and may not fully
                reflect all custom features or final legal stipulations of the platform.
            </div>
        </div>
    );
}
