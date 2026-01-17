"use client";

import { useState, useCallback } from "react";

export type Stage = "choice" | "flood" | "search" | "discovery" | "reveal";

interface AnimationState {
    stage: Stage;
    selectedRole: "recruiter" | "jobseeker" | null;
}

export function useAnimationSequence() {
    const [state, setState] = useState<AnimationState>({
        stage: "choice",
        selectedRole: null,
    });

    const stageOrder: Stage[] = [
        "choice",
        "flood",
        "search",
        "discovery",
        "reveal",
    ];

    const nextStage = useCallback(() => {
        setState((prev) => {
            const currentIndex = stageOrder.indexOf(prev.stage);
            const nextIndex = Math.min(currentIndex + 1, stageOrder.length - 1);
            return { ...prev, stage: stageOrder[nextIndex] };
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
