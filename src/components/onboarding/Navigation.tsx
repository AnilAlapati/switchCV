interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

/**
 * Progress bar showing completion percentage
 */
export function ProgressBar({ currentStep, totalSteps }: ProgressBarProps) {
  const percentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className="bg-gray-200 rounded-full h-2">
      <div
        data-testid="progress-bar"
        className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

interface StepIndicatorProps {
  steps: string[];
  currentStep: number;
  onStepClick: (step: number) => void;
}

/**
 * Step indicator buttons showing progress through steps
 */
export function StepIndicator({
  steps,
  currentStep,
  onStepClick,
}: StepIndicatorProps) {
  return (
    <div className="flex gap-2 justify-center flex-wrap">
      {steps.map((step, index) => (
        <button
          key={index}
          onClick={() => onStepClick(index)}
          className={`px-3 py-1 text-xs sm:text-sm rounded-full transition-colors ${
            index === currentStep
              ? "bg-indigo-600 text-white"
              : index < currentStep
              ? "bg-green-100 text-green-800"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {index + 1}. {step}
        </button>
      ))}
    </div>
  );
}

interface StepHeaderProps {
  stepNumber: number;
  stepName: string;
  totalSteps: number;
  title?: string;
}

/**
 * Header showing current step information
 */
export function StepHeader({
  stepNumber,
  stepName,
  totalSteps,
  title,
}: StepHeaderProps) {
  const heading = title ?? "Create Your Resume";

  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2">
        {heading}
      </h1>
      <p className="text-gray-600 text-sm sm:text-base">
        Step {stepNumber + 1} of {totalSteps}:{" "}
        <span className="font-medium">{stepName}</span>
      </p>
    </div>
  );
}

interface NavigationButtonsProps {
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  onComplete: () => void;
  nextLabel?: string;
  completeLabel?: string;
  isNextDisabled?: boolean;
  isCompleteDisabled?: boolean;
}

/**
 * Navigation buttons for step progression
 */
export function NavigationButtons({
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  onComplete,
  nextLabel,
  completeLabel,
  isNextDisabled,
  isCompleteDisabled,
}: NavigationButtonsProps) {
  return (
    <div className="flex flex-col-reverse sm:flex-row gap-4 justify-between">
      <button
        onClick={onPrevious}
        disabled={currentStep === 0}
        className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors w-full sm:w-auto"
      >
        ← Previous
      </button>

      {currentStep === totalSteps - 1 ? (
        <button
          onClick={onComplete}
          disabled={isCompleteDisabled}
          className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {completeLabel ?? "✓ Complete Setup"}
        </button>
      ) : (
        <button
          onClick={onNext}
          disabled={isNextDisabled}
          className="px-6 py-2 bg-indigo-600 text-white rounded-md font-medium hover:bg-indigo-700 transition-colors w-full sm:w-auto disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {nextLabel ?? "Next →"}
        </button>
      )}
    </div>
  );
}
