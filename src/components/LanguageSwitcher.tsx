"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export function LanguageSwitcher() {
    const locale = useLocale();
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const onSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const nextLocale = e.target.value;
        startTransition(() => {
            // In next-intl, switching locale usually involves changing the route prefix
            // or setting a cookie. For App Router, we often rely on middleware.
            // A simple reload or navigation with new prefix is often simplest.

            // Note: Ideally we use a path-aware router from next-intl, but standard router works for MVP
            // by modifying the path manually if using path-based routing.
            document.cookie = `NEXT_LOCALE=${nextLocale}; path=/; max-age=31536000; SameSite=Lax; Secure`;
            router.refresh();
        });
    };

    return (
        <div className="relative inline-block text-left">
            <select
                defaultValue={locale}
                onChange={onSelectChange}
                disabled={isPending}
                className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md bg-transparent"
            >
                <option value="en">🇺🇸 EN</option>
                <option value="es">🇪🇸 ES</option>
            </select>
        </div>
    );
}
