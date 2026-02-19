import { getSystemConfig } from "@/lib/getSystemConfig";
import { SystemConfigProvider } from "@/context/SystemConfigProvider";
import { MaintenancePage } from "@/components/layout/MaintenancePage";
import { BlockingGuard } from "@/components/layout/BlockingGuard";
import { AuthProvider } from "@/hooks/useAuth";
import { SWRProvider } from "@/components/providers/SWRProvider";
import { MaintenanceBanner } from "@/components/layout/MaintenanceBanner";
import { Footer } from "@/components/layout/Footer";
import { DevModeBanner } from "@/components/dev/DevModeBanner";
import { BetaBadge } from "@/components/layout/BetaBadge";
import { MobileNotice } from "@/components/layout/MobileNotice";
import { CookieConsentBanner } from "@/components/layout/CookieConsentBanner";
import { Toaster } from "sonner";
import { ConsentAwareAnalytics } from "@/components/analytics/ConsentAwareAnalytics";

interface ConfigLoaderProps {
    children: React.ReactNode;
    nonce?: string;
}

/**
 * Server Component that fetches system configuration.
 * Extracted from RootLayout to enable streaming of the HTML shell.
 */
export async function ConfigLoader({ children, nonce }: ConfigLoaderProps) {
    const config = await getSystemConfig();
    const isMaintenance = config.maintenance.isActive && config.maintenance.blocking;

    if (isMaintenance) {
        return <MaintenancePage />;
    }

    return (
        <SystemConfigProvider initialConfig={config}>
            <BlockingGuard>
                <AuthProvider>
                    <SWRProvider>
                        <Toaster
                            position="top-right"
                            richColors
                            closeButton
                            theme="dark"
                        />
                        <MaintenanceBanner />
                        <div className="flex min-h-screen flex-col">
                            <div className="flex-1">{children}</div>
                            <Footer />
                        </div>
                        <DevModeBanner />
                        <BetaBadge />
                        <MobileNotice />
                        <CookieConsentBanner />
                        <ConsentAwareAnalytics nonce={nonce} />
                    </SWRProvider>
                </AuthProvider>
            </BlockingGuard>
        </SystemConfigProvider>
    );
}
