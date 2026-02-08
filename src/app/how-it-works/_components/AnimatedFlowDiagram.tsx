import { Fragment, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { jobseekerFlowSteps, recruiterFlowSteps } from "../content";
import type { FlowStepDefinition, UserMode } from "../types";

interface AnimatedFlowDiagramProps {
  mode: UserMode;
}

export function AnimatedFlowDiagram({ mode }: AnimatedFlowDiagramProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const prevModeRef = useRef(mode);
  const steps = mode === "jobseeker" ? jobseekerFlowSteps : recruiterFlowSteps;

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => (prev + 1) % steps.length);
    }, 2000);
    return () => clearInterval(interval);
  }, [steps.length]);

  useEffect(() => {
    if (prevModeRef.current !== mode) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentStep(0);
      prevModeRef.current = mode;
    }
  }, [mode]);

  return (
    <section className="py-12 px-6 md:px-12 border-y border-black/10 bg-[#F5F5F0]">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl md:text-3xl font-serif font-bold mb-2">
            Watch the AI Workflow in Action
          </h2>
          <p className="text-sm text-gray-600">
            Your resume flows through {steps.length - 2} specialized agents
          </p>
        </div>
        <div className="flex flex-col md:flex-row items-center justify-center gap-3 md:gap-4">
          {steps.map((step, index) => (
            <Fragment key={`${mode}-${step.label}-${index}`}>
              <AnimatedFlowStep {...step} isActive={currentStep === index} />
              {index < steps.length - 1 && (
                <AnimatedFlowArrow isActive={currentStep >= index} />
              )}
            </Fragment>
          ))}
        </div>
      </div>
    </section>
  );
}

interface AnimatedFlowStepProps extends FlowStepDefinition {
  isActive?: boolean;
}

function AnimatedFlowStep({
  label,
  sublabel,
  color,
  isFirst,
  isLast,
  icon: Icon,
  isActive,
}: AnimatedFlowStepProps) {
  const bgClass =
    isFirst || isLast
      ? "bg-black text-white"
      : color === "blue"
        ? "bg-blue-600 text-white"
        : color === "amber"
          ? "bg-amber-500 text-white"
          : color === "rose"
            ? "bg-rose-500 text-white"
            : color === "green"
              ? "bg-green-600 text-white"
              : color === "purple"
                ? "bg-purple-600 text-white"
                : color === "indigo"
                  ? "bg-indigo-600 text-white"
                  : "bg-gray-200 text-black";

  return (
    <motion.div
      className="text-center"
      animate={{
        scale: isActive ? [1, 1.1, 1] : 1,
      }}
      transition={{
        duration: 0.5,
        ease: "easeInOut",
      }}
    >
      <motion.div
        className={`px-4 py-2.5 rounded-lg font-medium text-sm ${bgClass} flex items-center gap-2 justify-center shadow-md relative overflow-hidden`}
        animate={{
          boxShadow: isActive
            ? "0 10px 25px -5px rgba(0, 0, 0, 0.2)"
            : "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
        }}
      >
        {isActive && (
          <motion.div
            className="absolute inset-0 bg-white/20"
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{
              duration: 0.8,
              ease: "easeInOut",
            }}
          />
        )}
        <Icon className="w-4 h-4" />
        {label}
      </motion.div>
      <span className="text-xs text-gray-500 mt-1 block">{sublabel}</span>
    </motion.div>
  );
}

function AnimatedFlowArrow({ isActive }: { isActive?: boolean }) {
  return (
    <>
      <div className="hidden md:block">
        <motion.div
          animate={{
            x: isActive ? [0, 5, 0] : 0,
            opacity: isActive ? [0.4, 1, 0.4] : 0.4,
          }}
          transition={{
            duration: 0.8,
            repeat: isActive ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          <ArrowRight className="w-5 h-5 text-gray-400" />
        </motion.div>
      </div>
      <div className="md:hidden">
        <motion.div
          animate={{
            y: isActive ? [0, 5, 0] : 0,
            opacity: isActive ? [0.4, 1, 0.4] : 0.4,
          }}
          transition={{
            duration: 0.8,
            repeat: isActive ? Infinity : 0,
            ease: "easeInOut",
          }}
        >
          <ArrowRight className="w-5 h-5 rotate-90 text-gray-400" />
        </motion.div>
      </div>
    </>
  );
}
