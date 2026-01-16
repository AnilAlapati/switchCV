"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type ThemeVariant = "classic" | "premium";

interface ThemeContextType {
    theme: ThemeVariant;
    setTheme: (theme: ThemeVariant) => void;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    // Initialize theme from localStorage synchronously to avoid flash
    const [theme, setThemeState] = useState<ThemeVariant>(() => {
        if (typeof window !== 'undefined') {
            return (localStorage.getItem("switchcv-theme-variant") as ThemeVariant) || "premium";
        }
        return "premium";
    });

    // Sync theme class to document body
    useEffect(() => {
        document.body.classList.remove("theme-classic", "theme-premium");
        document.body.classList.add(`theme-${theme}`);
    }, [theme]);

    const setTheme = (newTheme: ThemeVariant) => {
        setThemeState(newTheme);
        localStorage.setItem("switchcv-theme-variant", newTheme);

        // Update body class
        document.body.classList.remove("theme-classic", "theme-premium");
        document.body.classList.add(`theme-${newTheme}`);
    };

    const toggleTheme = () => {
        setTheme(theme === "classic" ? "premium" : "classic");
    };

    return (
        <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error("useTheme must be used within a ThemeProvider");
    }
    return context;
}
