"use client";

import { useState, useCallback } from "react";

export type Stage = "choice" | "flood" | "search" | "discovery" | "reveal";

interface AnimationState {
    stage: Stage;
    selectedRole: "recruiter" | "jobseeker" | null;
}

const STAGE_ORDER: Stage[] = ["choice", "flood", "search", "discovery", "reveal"];

export function useAnimationSequence() {
    const [state, setState] = useState<AnimationState>({
        stage: "choice",
        selectedRole: null,
    });

    const nextStage = useCallback(() => {
        setState((prev) => {
            const currentIndex = STAGE_ORDER.indexOf(prev.stage);
            const nextIndex = Math.min(currentIndex + 1, STAGE_ORDER.length - 1);
            return { ...prev, stage: STAGE_ORDER[nextIndex] };
        });
    }, []);

    const goToStage = useCallback((stage: Stage) => {
        setState((prev) => ({ ...prev, stage }));
    }, []);

    const resetToStart = useCallback(() => {
        setState({ stage: "choice", selectedRole: null });
    }, []);

    const setSelectedRole = useCallback(
        (role: "recruiter" | "jobseeker") => {
            setState((prev) => ({ ...prev, selectedRole: role }));
        },
        []
    );

    return {
        stage: state.stage,
        selectedRole: state.selectedRole,
        nextStage,
        goToStage,
        resetToStart,
        setSelectedRole,
    };
}
