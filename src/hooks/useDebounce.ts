/**
 * useDebounce Hook
 *
 * Returns a debounced version of the provided value that only updates
 * after the specified delay has passed without the value changing.
 *
 * Useful for reducing API calls during rapid user input (e.g., username availability checks).
 *
 * @module hooks/useDebounce
 */

import { useState, useEffect } from "react";
import { USERNAME_CONFIG } from "@/config/constants";

/**
 * Debounces a value by delaying updates until after a specified delay.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds (defaults to USERNAME_CONFIG.CHECK_DEBOUNCE_MS)
 * @returns The debounced value
 *
 * @example
 * ```tsx
 * function UsernameInput() {
 *   const [username, setUsername] = useState("");
 *   const debouncedUsername = useDebounce(username, 400);
 *
 *   useEffect(() => {
 *     if (debouncedUsername) {
 *       checkUsernameAvailability(debouncedUsername);
 *     }
 *   }, [debouncedUsername]);
 *
 *   return <input value={username} onChange={(e) => setUsername(e.target.value)} />;
 * }
 * ```
 */
export function useDebounce<T>(
  value: T,
  delay: number = USERNAME_CONFIG.CHECK_DEBOUNCE_MS
): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up a timer to update the debounced value after the delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up the timer if the value changes before the delay completes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

/**
 * Hook that returns both the debounced value and a pending state.
 *
 * @param value - The value to debounce
 * @param delay - Delay in milliseconds
 * @returns Object containing debounced value and whether a change is pending
 *
 * @example
 * ```tsx
 * const { debouncedValue, isPending } = useDebouncedValue(username, 400);
 * // isPending is true while waiting for debounce to settle
 * ```
 */
export function useDebouncedValue<T>(
  value: T,
  delay: number = USERNAME_CONFIG.CHECK_DEBOUNCE_MS
): { debouncedValue: T; isPending: boolean } {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  // isPending is derived from comparing current and debounced values
  const isPending = value !== debouncedValue;

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return { debouncedValue, isPending };
}

export default useDebounce;
