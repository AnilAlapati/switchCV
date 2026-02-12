"use client";

import React, { useState } from "react";
import { resumeQuestions, Question } from "@/config/resumeQuestions";

export interface ResumeData {
  [key: string]: string | string[];
}

interface ResumeQAFormProps {
  onComplete: (data: ResumeData) => void;
  onCancel: () => void;
}

export const ResumeQAForm: React.FC<ResumeQAFormProps> = ({
  onComplete,
  onCancel,
}) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<ResumeData>({});
  const [tempAnswer, setTempAnswer] = useState<string>("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const currentQuestion = resumeQuestions[currentQuestionIndex];
  const progress = Math.round(
    ((currentQuestionIndex + 1) / resumeQuestions.length) * 100
  );
  const isFirstQuestion = currentQuestionIndex === 0;
  const isLastQuestion = currentQuestionIndex === resumeQuestions.length - 1;

  // Get current answer from answers object or temp for editing
  const currentAnswer = tempAnswer || getDisplayAnswer();

  function getDisplayAnswer(): string {
    const previousAnswer = answers[currentQuestion.id];
    if (previousAnswer) {
      if (Array.isArray(previousAnswer)) {
        return previousAnswer.join(", ");
      } else {
        return previousAnswer as string;
      }
    }
    return "";
  }

  const validateAnswer = (answer: string, question: Question): boolean => {
    // Check required field
    if (question.required && !answer.trim()) {
      setValidationError(`${question.question} is required`);
      return false;
    }

    // Validate pattern if provided
    if (question.validation?.pattern) {
      const regex = new RegExp(question.validation.pattern);
      if (answer.trim() && !regex.test(answer.trim())) {
        setValidationError(
          question.validation.message || "Invalid input format"
        );
        return false;
      }
    }

    setValidationError(null);
    return true;
  };

  const processAnswer = (answer: string) => {
    return currentQuestion.type === "multiselect"
      ? answer
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s)
      : answer;
  };

  const handleSaveAndNext = () => {
    if (!validateAnswer(currentAnswer, currentQuestion)) {
      return;
    }

    const newAnswers = {
      ...answers,
      [currentQuestion.id]: processAnswer(currentAnswer),
    };

    setAnswers(newAnswers);
    setTempAnswer("");

    if (!isLastQuestion) {
      setCurrentQuestionIndex((prev) => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      // Save current before going back
      const newAnswers = {
        ...answers,
        [currentQuestion.id]: processAnswer(currentAnswer),
      };
      setAnswers(newAnswers);
      setTempAnswer("");
      setCurrentQuestionIndex((prev) => prev - 1);
    }
  };

  const handleComplete = () => {
    if (!validateAnswer(currentAnswer, currentQuestion)) {
      return;
    }

    const finalAnswers = {
      ...answers,
      [currentQuestion.id]: processAnswer(currentAnswer),
    };

    onComplete(finalAnswers);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    setTempAnswer(e.target.value);
    setValidationError(null);
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent mb-2">
          Create Your Professional Resume
        </h1>
        <p className="text-gray-400">
          Answer a few questions and we'll generate your resume
        </p>
      </div>

      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm text-gray-400">
            Question {currentQuestionIndex + 1} of {resumeQuestions.length}
          </span>
          <span className="text-sm font-semibold text-cyan-400">
            {progress}%
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-8 mb-8">
        <label
          htmlFor={`qa-field-${currentQuestion.id}`}
          className="text-xl font-semibold text-white mb-6 block"
        >
          {currentQuestion.question}
        </label>

        {/* Input Fields */}
        <div className="mb-6">
          {currentQuestion.type === "text" && (
            <input
              type="text"
              value={currentAnswer}
              onChange={handleInputChange}
              placeholder={currentQuestion.placeholder}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? "qa-validation-error" : "qa-field-info"}
              data-testid={`qa-input-${currentQuestion.id}`}
              id={`qa-field-${currentQuestion.id}`}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            />
          )}

          {currentQuestion.type === "textarea" && (
            <textarea
              value={currentAnswer}
              onChange={handleInputChange}
              placeholder={currentQuestion.placeholder}
              rows={5}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? "qa-validation-error" : "qa-field-info"}
              data-testid={`qa-textarea-${currentQuestion.id}`}
              id={`qa-field-${currentQuestion.id}`}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
            />
          )}

          {currentQuestion.type === "select" && currentQuestion.options && (
            <select
              value={currentAnswer}
              onChange={handleInputChange}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? "qa-validation-error" : "qa-field-info"}
              data-testid={`qa-select-${currentQuestion.id}`}
              id={`qa-field-${currentQuestion.id}`}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
            >
              <option value="">Select an option...</option>
              {currentQuestion.options.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          )}

          {currentQuestion.type === "multiselect" && (
            <textarea
              value={currentAnswer}
              onChange={handleInputChange}
              placeholder={
                currentQuestion.placeholder || "Enter items separated by commas"
              }
              rows={3}
              aria-invalid={!!validationError}
              aria-describedby={validationError ? "qa-validation-error" : "qa-field-info"}
              data-testid={`qa-multiselect-${currentQuestion.id}`}
              id={`qa-field-${currentQuestion.id}`}
              className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:border-transparent resize-none"
            />
          )}
        </div>

        {/* Validation Error */}
        {validationError && (
          <div id="qa-validation-error" role="alert" className="mb-6 p-4 bg-red-900/30 border border-red-700 rounded-lg">
            <p className="text-red-300 text-sm">{validationError}</p>
          </div>
        )}

        {/* Field Info */}
        <div id="qa-field-info" className="text-sm text-gray-400 mb-6">
          {currentQuestion.required ? (
            <span className="text-cyan-400">* Required field</span>
          ) : (
            <span>Optional field</span>
          )}
          {currentQuestion.type === "multiselect" && (
            <span className="block mt-1">Tip: Separate items with commas</span>
          )}
        </div>
      </div>

      {/* Navigation Buttons */}
      <div className="flex gap-4 justify-between">
        {/* Cancel Button */}
        <button
          onClick={onCancel}
          className="px-6 py-3 text-gray-300 hover:text-white border border-gray-600 hover:border-gray-500 rounded-lg font-medium transition-colors"
        >
          Cancel
        </button>

        {/* Previous Button */}
        <button
          onClick={handlePrevious}
          disabled={isFirstQuestion}
          className="px-6 py-3 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
        >
          ← Previous
        </button>

        {/* Next / Complete Button */}
        {!isLastQuestion ? (
          <button
            onClick={handleSaveAndNext}
            className="px-8 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-lg font-medium transition-all"
          >
            Next →
          </button>
        ) : (
          <button
            onClick={handleComplete}
            className="px-8 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white rounded-lg font-medium transition-all shadow-lg shadow-green-500/20"
          >
            Generate Resume ✓
          </button>
        )}
      </div>

      {/* Category Badge */}
      <div className="mt-8 text-center">
        <span className="inline-block px-4 py-2 bg-gray-700/50 border border-gray-600 rounded-full text-sm text-gray-300">
          📝{" "}
          {currentQuestion.category.charAt(0).toUpperCase() +
            currentQuestion.category.slice(1)}
        </span>
      </div>
    </div>
  );
};
