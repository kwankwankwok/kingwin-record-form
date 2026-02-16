import { useState } from "react";
import { FORM_FIELDS } from "../config/fields.js";
import {
  HOURS_24,
  MINUTES_5,
  PERCENTAGE_DISCOUNT_OPTIONS,
  PRESET_PERCENTAGES,
  TOTAL_FORMULA_FIELDS,
  parseTime,
  computeNoOfHrs,
  computeAmount,
  computeTotal,
  getInitialState,
  buildSubmitBody,
  validateSubmitBody,
} from "../lib/formLogic.js";
import { submitToSheet } from "../lib/submitSheet.js";
import styles from "./Form.module.css";

const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
const SCRIPT_URL = import.meta.env.DEV
  ? base + "api/sheet"
  : import.meta.env.VITE_GOOGLE_SCRIPT_URL;

export default function Form() {
  const [formData, setFormData] = useState(getInitialState);
  const [roomType, setRoomType] = useState("small");
  const [percentageDiscountIsOther, setPercentageDiscountIsOther] =
    useState(false);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [accessCode, setAccessCode] = useState("");

  function handleChange(id, value) {
    setFormData((prev) => {
      const next = { ...prev, [id]: value };
      if (id === "startTime" || id === "endTime") {
        const hrs = computeNoOfHrs(next.startTime, next.endTime);
        if (hrs !== null) next.noOfHrs = hrs;
      }
      if (["date", "noOfPpl", "startTime", "endTime"].includes(id)) {
        const amount = computeAmount(
          next.date,
          next.noOfPpl,
          next.noOfHrs,
          roomType,
        );
        if (amount !== null) next.amount = amount;
      }
      if (
        TOTAL_FORMULA_FIELDS.includes(id) ||
        ["date", "noOfPpl", "startTime", "endTime"].includes(id)
      ) {
        next.total = computeTotal(
          next.amount,
          next.overtime,
          next.extendHr,
          next.percentageDiscount,
          next.otherDiscount,
        );
      }
      return next;
    });
    setStatus(null);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!SCRIPT_URL) {
      setStatus({ type: "error", message: "Missing VITE_GOOGLE_SCRIPT_URL" });
      return;
    }
    if (!accessCode || !accessCode.trim()) {
      setStatus({ type: "error", message: "Access code is required" });
      return;
    }
    const body = buildSubmitBody(formData, roomType, accessCode);
    const validation = validateSubmitBody(body);
    if (!validation.ok) {
      setStatus({ type: "error", message: validation.message });
      return;
    }
    setSubmitting(true);
    setStatus(null);
    try {
      await submitToSheet(SCRIPT_URL, body);
      setStatus({ type: "success", message: "Submitted successfully" });
      setFormData(getInitialState());
      setPercentageDiscountIsOther(false);
    } catch (err) {
      setStatus({
        type: "error",
        message: err.message || "Something went wrong",
      });
    } finally {
      setSubmitting(false);
    }
  }

  function handleClear(e) {
    e.preventDefault();
    setFormData(getInitialState());
    setRoomType("small");
    setPercentageDiscountIsOther(false);
    setStatus(null);
  }

  function handleRoomTypeChange(newRoomType) {
    setRoomType(newRoomType);
    setFormData((prev) => {
      const next = { ...prev };
      const amount = computeAmount(
        prev.date,
        prev.noOfPpl,
        prev.noOfHrs,
        newRoomType,
      );
      if (amount !== null) next.amount = amount;
      next.total = computeTotal(
        next.amount,
        next.overtime,
        next.extendHr,
        next.percentageDiscount,
        next.otherDiscount,
      );
      return next;
    });
    setStatus(null);
  }

  return (
    <div className={styles.wrapper}>
      <form className={styles.form} onSubmit={handleSubmit}>
        <div className={styles.field}>
          <label htmlFor="accessCode" className={styles.label}>
            Access code *
          </label>
          <input
            id="accessCode"
            type="password"
            className={styles.input}
            value={accessCode}
            onChange={(e) => {
              setAccessCode(e.target.value);
              setStatus(null);
            }}
            autoComplete="off"
            required
          />
        </div>
        <div className={styles.roomToggle} role='tablist' aria-label='房間'>
          <button
            type='button'
            role='tab'
            aria-selected={roomType === "small"}
            className={
              roomType === "small" ? styles.roomTabActive : styles.roomTab
            }
            onClick={() => handleRoomTypeChange("small")}
          >
            細房
          </button>
          <button
            type='button'
            role='tab'
            aria-selected={roomType === "large"}
            className={
              roomType === "large" ? styles.roomTabActive : styles.roomTab
            }
            onClick={() => handleRoomTypeChange("large")}
          >
            大房
          </button>
        </div>
        {FORM_FIELDS.filter(({ id }) => id !== "depositReturned").map(
          ({ id, label, type, required }) => (
            <div key={id} className={styles.field}>
              <label htmlFor={id} className={styles.label}>
                {label}
                {required && " *"}
              </label>
              {type === "textarea" ? (
                <textarea
                  id={id}
                  className={styles.input}
                  value={formData[id]}
                  onChange={(e) => handleChange(id, e.target.value)}
                  required={required}
                  rows={4}
                />
              ) : type === "checkbox" ? (
                <input
                  id={id}
                  type='checkbox'
                  className={styles.input}
                  checked={Boolean(formData[id])}
                  onChange={(e) => handleChange(id, e.target.checked)}
                />
              ) : type === "time" ? (
                <div className={styles.timeRow}>
                  <select
                    id={id}
                    className={styles.input}
                    value={parseTime(formData[id]).hour}
                    onChange={(e) => {
                      const { minute } = parseTime(formData[id]);
                      const hour = e.target.value;
                      handleChange(
                        id,
                        hour && minute ? `${hour}:${minute}` : hour,
                      );
                    }}
                    required={required}
                    aria-label={`${label} hour`}
                  >
                    <option value=''>--</option>
                    {HOURS_24.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  <span className={styles.timeSeparator}>:</span>
                  <select
                    className={styles.input}
                    value={parseTime(formData[id]).minute}
                    onChange={(e) => {
                      const { hour } = parseTime(formData[id]);
                      const minute = e.target.value;
                      handleChange(
                        id,
                        hour && minute ? `${hour}:${minute}` : minute,
                      );
                    }}
                    required={required}
                    aria-label={`${label} minute`}
                  >
                    <option value=''>--</option>
                    {MINUTES_5.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                  <span className={styles.timeSuffix}> (24h)</span>
                </div>
              ) : id === "noOfHrs" ? (
                <input
                  id={id}
                  type='number'
                  className={styles.input}
                  value={formData[id]}
                  readOnly
                  min={0}
                  step={1}
                  aria-label={label}
                />
              ) : id === "total" ? (
                <input
                  id={id}
                  type='number'
                  className={styles.input}
                  value={formData[id]}
                  onChange={(e) =>
                    handleChange(
                      id,
                      e.target.value === "" ? "" : Number(e.target.value),
                    )
                  }
                  min={0}
                  step={0.01}
                  aria-label={label}
                />
              ) : id === "percentageDiscount" ? (
                <div className={styles.percentageDiscountRow}>
                  <select
                    id={id}
                    className={styles.percentageDiscountSelect}
                    value={percentageDiscountIsOther ? "other" : formData[id]}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (v === "other") {
                        setPercentageDiscountIsOther(true);
                        const current = formData[id];
                        handleChange(
                          id,
                          PRESET_PERCENTAGES.includes(Number(current))
                            ? 0
                            : current,
                        );
                      } else {
                        setPercentageDiscountIsOther(false);
                        handleChange(id, Number(v));
                      }
                    }}
                    aria-label={label}
                  >
                    {PERCENTAGE_DISCOUNT_OPTIONS.map(
                      ({ value, label: optLabel }) => (
                        <option key={value} value={value}>
                          {optLabel}
                        </option>
                      ),
                    )}
                  </select>
                  {percentageDiscountIsOther && (
                    <input
                      type='number'
                      className={styles.percentageDiscountInput}
                      min={0}
                      max={100}
                      step={1}
                      value={formData[id]}
                      onChange={(e) =>
                        handleChange(
                          id,
                          e.target.value === "" ? "" : Number(e.target.value),
                        )
                      }
                      placeholder='%'
                      aria-label={`${label} custom`}
                    />
                  )}
                </div>
              ) : (
                <input
                  id={id}
                  type={type}
                  className={styles.input}
                  value={formData[id]}
                  onChange={(e) => handleChange(id, e.target.value)}
                  required={required}
                  {...(type === "number" && { min: 0 })}
                />
              )}
            </div>
          ),
        )}
        {status && (
          <p
            className={status.type === "error" ? styles.error : styles.success}
          >
            {status.message}
          </p>
        )}
        <div className={styles.formActions}>
          <button type='submit' className={styles.button} disabled={submitting}>
            {submitting ? "Sending…" : "Submit"}
          </button>
          <button
            type='button'
            className={styles.buttonSecondary}
            onClick={handleClear}
          >
            Clear
          </button>
        </div>
      </form>
    </div>
  );
}
