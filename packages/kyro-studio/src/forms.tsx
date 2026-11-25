import React, { useState } from "react";
import type { StudioRenderProps } from "./types";
import { text, list, safeStudioUrl } from "./primitives";

export interface FormSubmissionAdapterOptions {
  apiBase?: string;
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
}

export function createFormSubmissionAdapter(options: FormSubmissionAdapterOptions = {}) {
  const apiBase = (options.apiBase || "").replace(/\/$/, "");

  return function renderStudioForm(form: Record<string, any>, props: StudioRenderProps): React.ReactNode {
    const { editing } = props;
    const formId = form.id || form.slug;

    if (editing) {
      // In editor preview: Display non-submitting disabled form fields
      return (
        <div className="kyro-form-preview" data-kyro-interactive>
          {form.subtitle && <p className="kyro-form-subtitle">{text(form.subtitle)}</p>}
          <div className="kyro-form-fields">
            {list(form.fields).map((f: any, idx: number) => (
              <label key={f.id || idx} className="kyro-form-field">
                <span className="kyro-form-label">
                  {text(f.fieldName)}
                  {f.isRequired && (
                    <span className="kyro-required" aria-hidden="true">
                      {" "}
                      *
                    </span>
                  )}
                </span>
                {f.inputType === "textarea" ? (
                  <textarea disabled placeholder={text(f.placeholder)} />
                ) : (
                  <input
                    disabled
                    type={["text", "email", "tel", "checkbox"].includes(f.inputType) ? f.inputType : "text"}
                    placeholder={text(f.placeholder)}
                  />
                )}
              </label>
            ))}
          </div>
          <button type="button" disabled className="kyro-btn kyro-btn-primary">
            {text(form.submitButtonText) || "Submit"}
          </button>
          <small className="kyro-form-note">Preview mode · submissions disabled</small>
        </div>
      );
    }

    // Live site renderer: interactive submission component
    return <InteractiveStudioForm form={form} formId={formId} apiBase={apiBase} options={options} />;
  };
}

function InteractiveStudioForm({
  form,
  formId,
  apiBase,
  options,
}: {
  form: Record<string, any>;
  formId: string;
  apiBase: string;
  options: FormSubmissionAdapterOptions;
}) {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setFieldErrors({});

    try {
      const res = await fetch(`${apiBase}/api/forms/${encodeURIComponent(formId)}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        if (data.fieldErrors) {
          setFieldErrors(data.fieldErrors);
        }
        throw new Error(data.error || data.message || "Failed to submit form");
      }

      setSubmitted(true);
      if (options.onSuccess) options.onSuccess(data);

      if (data.redirectUrl) {
        const safeUrl = safeStudioUrl(data.redirectUrl);
        if (safeUrl) {
          window.location.href = safeUrl;
        }
      }
    } catch (err: any) {
      const msg = err.message || "Submission failed";
      setErrorMessage(msg);
      if (options.onError) options.onError(err);
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="kyro-form-success" role="status">
        <h3>Thank you!</h3>
        <p>Your submission has been received.</p>
      </div>
    );
  }

  return (
    <form className="kyro-live-form" onSubmit={handleSubmit} noValidate>
      {form.subtitle && <p className="kyro-form-subtitle">{text(form.subtitle)}</p>}
      {errorMessage && (
        <div className="kyro-form-alert error" role="alert">
          {errorMessage}
        </div>
      )}
      <div className="kyro-form-fields">
        {/* Anti-spam honeypot */}
        <input
          type="text"
          name="_gotcha"
          style={{ display: "none" }}
          tabIndex={-1}
          autoComplete="off"
          onChange={(e) => setFormData((prev) => ({ ...prev, _gotcha: e.target.value }))}
        />
        {list(form.fields).map((f: any, idx: number) => {
          const fieldName = f.fieldName || `field_${idx}`;
          const error = fieldErrors[fieldName];
          return (
            <label key={f.id || idx} className={`kyro-form-field ${error ? "has-error" : ""}`}>
              <span className="kyro-form-label">
                {text(f.fieldName)}
                {f.isRequired && (
                  <span className="kyro-required" aria-hidden="true">
                    {" "}
                    *
                  </span>
                )}
              </span>
              {f.inputType === "textarea" ? (
                <textarea
                  required={f.isRequired}
                  placeholder={text(f.placeholder)}
                  value={formData[fieldName] || ""}
                  onChange={(e) => setFormData((prev) => ({ ...prev, [fieldName]: e.target.value }))}
                />
              ) : (
                <input
                  type={["text", "email", "tel", "checkbox"].includes(f.inputType) ? f.inputType : "text"}
                  required={f.isRequired}
                  placeholder={text(f.placeholder)}
                  checked={f.inputType === "checkbox" ? Boolean(formData[fieldName]) : undefined}
                  value={f.inputType !== "checkbox" ? formData[fieldName] || "" : undefined}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      [fieldName]: f.inputType === "checkbox" ? e.target.checked : e.target.value,
                    }))
                  }
                />
              )}
              {error && (
                <span className="kyro-field-error" role="alert">
                  {error}
                </span>
              )}
            </label>
          );
        })}
      </div>
      <button type="submit" disabled={submitting} className="kyro-btn kyro-btn-primary">
        {submitting ? "Submitting…" : text(form.submitButtonText) || "Submit"}
      </button>
    </form>
  );
}
