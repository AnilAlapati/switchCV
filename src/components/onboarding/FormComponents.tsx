import { Visibility } from "@/types";
import { VisibilityControls } from "@/components/VisibilityControls";

interface VisibilityControlProps {
  value: Visibility;
  onChange: (v: Visibility) => void;
}

/**
 * Reusable visibility control component for form items
 */
export function VisibilityControl({ value, onChange }: VisibilityControlProps) {
  return (
    <VisibilityControls
      value={value}
      onChange={onChange}
      label="Privacy Setting"
      showLabels={false}
    />
  );
}

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
}

/**
 * Reusable form input component with label
 */
export function FormInput({ label, ...props }: FormInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <input
        {...props}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}

interface FormTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
}

/**
 * Reusable form textarea component with label
 */
export function FormTextarea({ label, ...props }: FormTextareaProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <textarea
        {...props}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      />
    </div>
  );
}

interface FormSelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  options: Array<{ value: string; label: string }>;
}

/**
 * Reusable form select component with label
 */
export function FormSelect({ label, options, ...props }: FormSelectProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">{label}</label>
      <select
        {...props}
        className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
}
