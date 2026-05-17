"use client";

import {
  useState,
  useCallback,
  useRef,
  type ChangeEvent,
  type FocusEvent,
} from "react";
import { AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ZodSchema, ZodError } from "zod";

type ValidationMode = "onBlur" | "onChange" | "onSubmit";

interface FieldState {
  value: string;
  error: string | null;
  touched: boolean;
  dirty: boolean;
}

type FieldStates<T extends Record<string, unknown>> = {
  [K in keyof T]: FieldState;
};

export interface UseFormValidationReturn<T extends Record<string, unknown>> {
  /** Current field values */
  values: T;
  /** Per-field error messages */
  errors: Partial<Record<keyof T, string>>;
  /** Per-field touched state */
  touched: Partial<Record<keyof T, boolean>>;
  /** Whether any field has been modified */
  isDirty: boolean;
  /** Whether all fields pass validation */
  isValid: boolean;
  /** Set a single field value */
  setValue: (field: keyof T, value: string) => void;
  /** Handle an input change event */
  handleChange: (field: keyof T) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** Handle an input blur event */
  handleBlur: (field: keyof T) => (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  /** Validate all fields and return whether valid */
  validate: () => boolean;
  /** Reset all fields to initial values */
  reset: () => void;
  /** Get props to spread onto an input element */
  getFieldProps: (field: keyof T) => {
    value: string;
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onBlur: (e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    "aria-invalid": boolean;
    "aria-describedby": string;
  };
}

export function useFormValidation<T extends Record<string, unknown>>(
  schema: ZodSchema<T>,
  initialValues: T,
  mode: ValidationMode = "onBlur"
): UseFormValidationReturn<T> {
  const initialRef = useRef(initialValues);

  const buildFieldStates = useCallback(
    (vals: T): FieldStates<T> => {
      const states = {} as FieldStates<T>;
      for (const key of Object.keys(vals) as (keyof T)[]) {
        states[key] = {
          value: String(vals[key] ?? ""),
          error: null,
          touched: false,
          dirty: false,
        };
      }
      return states;
    },
    []
  );

  const [fields, setFields] = useState<FieldStates<T>>(() =>
    buildFieldStates(initialValues)
  );

  const validateField = useCallback(
    (name: keyof T, value: string, currentFields: FieldStates<T>): string | null => {
      // Build a full values object for schema validation
      const fullValues = {} as Record<string, unknown>;
      for (const key of Object.keys(currentFields) as (keyof T)[]) {
        fullValues[key as string] = key === name ? value : currentFields[key].value;
      }

      try {
        schema.parse(fullValues);
        return null;
      } catch (err) {
        const zodErr = err as ZodError;
        const fieldError = zodErr.errors.find(
          (e) => e.path[0] === name
        );
        return fieldError?.message ?? null;
      }
    },
    [schema]
  );

  const validateAll = useCallback(
    (currentFields: FieldStates<T>): FieldStates<T> => {
      const fullValues = {} as Record<string, unknown>;
      for (const key of Object.keys(currentFields) as (keyof T)[]) {
        fullValues[key as string] = currentFields[key].value;
      }

      let errors: Record<string, string> = {};
      try {
        schema.parse(fullValues);
      } catch (err) {
        const zodErr = err as ZodError;
        for (const issue of zodErr.errors) {
          const path = String(issue.path[0]);
          if (!errors[path]) {
            errors[path] = issue.message;
          }
        }
      }

      const updated = { ...currentFields };
      for (const key of Object.keys(updated) as (keyof T)[]) {
        updated[key] = {
          ...updated[key],
          error: errors[key as string] ?? null,
          touched: true,
        };
      }
      return updated;
    },
    [schema]
  );

  const setValue = useCallback(
    (field: keyof T, value: string) => {
      setFields((prev) => {
        const updated = { ...prev };
        updated[field] = {
          ...updated[field],
          value,
          dirty: value !== String(initialRef.current[field] ?? ""),
        };

        if (mode === "onChange" || (mode === "onBlur" && updated[field].touched)) {
          updated[field] = {
            ...updated[field],
            error: validateField(field, value, updated),
          };
        }

        return updated;
      });
    },
    [mode, validateField]
  );

  const handleChange = useCallback(
    (field: keyof T) =>
      (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setValue(field, e.target.value);
      },
    [setValue]
  );

  const handleBlur = useCallback(
    (field: keyof T) =>
      (_e: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        setFields((prev) => {
          const updated = { ...prev };
          updated[field] = {
            ...updated[field],
            touched: true,
            error: validateField(field, updated[field].value, updated),
          };
          return updated;
        });
      },
    [validateField]
  );

  const validate = useCallback((): boolean => {
    const updated = validateAll(fields);
    setFields(updated);
    return Object.values(updated).every(
      (f) => (f as FieldState).error === null
    );
  }, [fields, validateAll]);

  const reset = useCallback(() => {
    setFields(buildFieldStates(initialRef.current));
  }, [buildFieldStates]);

  // Derived state
  const values = {} as T;
  const errors: Partial<Record<keyof T, string>> = {};
  const touchedMap: Partial<Record<keyof T, boolean>> = {};
  let isDirty = false;
  let isValid = true;

  for (const key of Object.keys(fields) as (keyof T)[]) {
    const f = fields[key];
    (values as Record<string, unknown>)[key as string] = f.value;
    if (f.error) {
      errors[key] = f.error;
      isValid = false;
    }
    if (f.touched) touchedMap[key] = true;
    if (f.dirty) isDirty = true;
  }

  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: fields[field].value,
      onChange: handleChange(field),
      onBlur: handleBlur(field),
      "aria-invalid": !!(fields[field].touched && fields[field].error),
      "aria-describedby": `${String(field)}-error`,
    }),
    [fields, handleChange, handleBlur]
  );

  return {
    values,
    errors,
    touched: touchedMap,
    isDirty,
    isValid,
    setValue,
    handleChange,
    handleBlur,
    validate,
    reset,
    getFieldProps,
  };
}

/** Inline error message display */
export function FieldError({
  name,
  error,
  className,
}: {
  name: string;
  error?: string | null;
  className?: string;
}) {
  if (!error) return null;

  return (
    <p
      id={`${name}-error`}
      role="alert"
      className={cn(
        "mt-1 flex items-center gap-1 text-xs text-red-400",
        className
      )}
    >
      <AlertCircle className="h-3 w-3 shrink-0" />
      {error}
    </p>
  );
}

/** Visual wrapper for form fields showing valid/invalid state */
export function FormField({
  label,
  name,
  error,
  touched,
  children,
  className,
}: {
  label: string;
  name: string;
  error?: string | null;
  touched?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const showError = touched && error;
  const showValid = touched && !error;

  return (
    <div className={cn("space-y-1", className)}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-white/70"
      >
        {label}
      </label>
      <div className="relative">
        {children}
        {showValid && (
          <CheckCircle2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-green-400" />
        )}
      </div>
      {showError && <FieldError name={name} error={error} />}
    </div>
  );
}

/** Styled input that integrates with useFormValidation */
export function ValidatedInput({
  name,
  error,
  touched,
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & {
  name: string;
  error?: string | null;
  touched?: boolean;
}) {
  const hasError = touched && error;

  return (
    <input
      id={name}
      name={name}
      className={cn(
        "w-full rounded-lg border bg-white/5 px-3 py-2 text-sm text-white outline-none transition-colors placeholder:text-white/30",
        hasError
          ? "border-red-500/50 focus:border-red-500"
          : touched && !error
            ? "border-green-500/50 focus:border-green-500"
            : "border-white/10 focus:border-blue-500",
        className
      )}
      aria-invalid={!!hasError}
      aria-describedby={hasError ? `${name}-error` : undefined}
      {...props}
    />
  );
}
