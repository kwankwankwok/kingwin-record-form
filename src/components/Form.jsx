import { useState } from "react";
import { FORM_FIELDS } from "../config/fields.js";
import styles from "./Form.module.css";

// Dev: same-origin /api/sheet (Vite proxy). Production: direct Apps Script URL.
const base = (import.meta.env.BASE_URL || "/").replace(/\/?$/, "/");
const SCRIPT_URL = import.meta.env.DEV
  ? base + "api/sheet"
  : import.meta.env.VITE_GOOGLE_SCRIPT_URL;

const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
);
const MINUTES_5 = [
  "00",
  "30",
  "05",
  "10",
  "15",
  "20",
  "25",
  "35",
  "40",
  "45",
  "50",
  "55",
];

const PERCENTAGE_DISCOUNT_OPTIONS = [
  { value: 0, label: "無" },
  { value: 5, label: "95折" },
  { value: 10, label: "9折" },
  { value: 15, label: "85折" },
  { value: "other", label: "其他" },
];

const PRESET_PERCENTAGES = [0, 5, 10, 15];

const TOTAL_FORMULA_FIELDS = [
  "amount",
  "overtime",
  "extendHr",
  "percentageDiscount",
  "otherDiscount",
];

const AMOUNT_PRICE_SMALL = Object.freeze({
  BASE_2_PPL_MON_THU: 110,
  BASE_2_PPL_FRI_SUN: 140,
  BASE_3_PPL_UP_MON_THU: 100,
  BASE_3_PPL_UP_FRI_SUN: 130,
  EXTRA_HOUR_PER_PERSON_MON_THU: 20,
  EXTRA_HOUR_PER_PERSON_FRI_SUN: 25,
  INCLUDED_HOURS: 4,
});

const AMOUNT_PRICE_LARGE = Object.freeze({
  BASE_MON_THU: 130,
  BASE_FRI_SUN: 150,
  EXTRA_HOUR_PER_PERSON_MON_THU: 20,
  EXTRA_HOUR_PER_PERSON_FRI_SUN: 25,
  INCLUDED_HOURS: 4,
});

function parseTime(value) {
  if (!value || typeof value !== "string") return { hour: "", minute: "" };
  const [hour, minute] = value.trim().split(":");
  const h = hour?.length === 2 ? hour : "";
  const minNum = parseInt(minute, 10);
  const snapped = Number.isNaN(minNum)
    ? ""
    : ((Math.round(minNum / 5) * 5) % 60).toString().padStart(2, "0");
  return { hour: h, minute: snapped };
}

function computeNoOfHrs(startTime, endTime) {
  if (
    !startTime ||
    !endTime ||
    typeof startTime !== "string" ||
    typeof endTime !== "string"
  )
    return null;
  const [sh, sm] = startTime.trim().split(":").map(Number);
  const [eh, em] = endTime.trim().split(":").map(Number);
  if (
    Number.isNaN(sh) ||
    Number.isNaN(sm) ||
    Number.isNaN(eh) ||
    Number.isNaN(em)
  )
    return null;
  const startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  return Math.round((endMins - startMins) / 60);
}

function computeAmount(date, noOfPpl, noOfHrs, roomType = "small") {
  if (!date || typeof date !== "string" || date.trim() === "") return null;
  const d = new Date(date.trim() + "T12:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDay();
  const ppl = Number(noOfPpl) || 0;
  const hrs = Number(noOfHrs) || 0;
  if (ppl < 1 || hrs < 0) return null;
  const isMonThu = day >= 1 && day <= 4;
  let basePrice;
  let extraPerHourPerPerson;
  const includedHours =
    roomType === "large"
      ? AMOUNT_PRICE_LARGE.INCLUDED_HOURS
      : AMOUNT_PRICE_SMALL.INCLUDED_HOURS;
  if (roomType === "large") {
    basePrice = isMonThu
      ? AMOUNT_PRICE_LARGE.BASE_MON_THU
      : AMOUNT_PRICE_LARGE.BASE_FRI_SUN;
    extraPerHourPerPerson = isMonThu
      ? AMOUNT_PRICE_LARGE.EXTRA_HOUR_PER_PERSON_MON_THU
      : AMOUNT_PRICE_LARGE.EXTRA_HOUR_PER_PERSON_FRI_SUN;
  } else {
    if (ppl >= 3) {
      basePrice = isMonThu
        ? AMOUNT_PRICE_SMALL.BASE_3_PPL_UP_MON_THU
        : AMOUNT_PRICE_SMALL.BASE_3_PPL_UP_FRI_SUN;
      extraPerHourPerPerson = isMonThu
        ? AMOUNT_PRICE_SMALL.EXTRA_HOUR_PER_PERSON_MON_THU
        : AMOUNT_PRICE_SMALL.EXTRA_HOUR_PER_PERSON_FRI_SUN;
    } else {
      basePrice = isMonThu
        ? AMOUNT_PRICE_SMALL.BASE_2_PPL_MON_THU
        : AMOUNT_PRICE_SMALL.BASE_2_PPL_FRI_SUN;
      extraPerHourPerPerson = isMonThu
        ? AMOUNT_PRICE_SMALL.EXTRA_HOUR_PER_PERSON_MON_THU
        : AMOUNT_PRICE_SMALL.EXTRA_HOUR_PER_PERSON_FRI_SUN;
    }
  }
  const extraHours = Math.max(0, hrs - includedHours);
  const amount = ppl * (basePrice + extraHours * extraPerHourPerPerson);
  return Math.round(amount * 100) / 100;
}

function computeTotal(
  amount,
  overtime,
  extendHr,
  percentageDiscount,
  otherDiscount,
) {
  const a = Number(amount) || 0;
  const o = Number(overtime) || 0;
  const e = Number(extendHr) || 0;
  const pct = Number(percentageDiscount) || 0;
  const other = Number(otherDiscount) || 0;
  const discountedAmount = a * (1 - pct / 100);
  const total = discountedAmount + o + e - other;
  return Math.round(total * 100) / 100;
}

function getTodayDateString() {
  const d = new Date();
  return (
    d.getFullYear() +
    "-" +
    String(d.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(d.getDate()).padStart(2, "0")
  );
}

function getInitialState() {
  const state = FORM_FIELDS.reduce((acc, { id, type, defaultZero }) => {
    if (type === "checkbox") return { ...acc, [id]: false };
    if (id === "deposit") return { ...acc, [id]: 500 };
    if (id === "percentageDiscount") return { ...acc, [id]: 0 };
    if (id === "date") return { ...acc, [id]: getTodayDateString() };
    if (id === "startTime") return { ...acc, [id]: "12:00" };
    if (id === "endTime") return { ...acc, [id]: "16:00" };
    if (defaultZero) return { ...acc, [id]: 0 };
    return { ...acc, [id]: "" };
  }, {});
  const noOfHrs = computeNoOfHrs(state.startTime, state.endTime);
  if (noOfHrs !== null) state.noOfHrs = noOfHrs;
  const amount = computeAmount(state.date, state.noOfPpl, state.noOfHrs);
  if (amount !== null) state.amount = amount;
  state.total = computeTotal(
    state.amount,
    state.overtime,
    state.extendHr,
    state.percentageDiscount,
    state.otherDiscount,
  );
  return state;
}

export default function Form() {
  const [formData, setFormData] = useState(getInitialState);
  const [roomType, setRoomType] = useState("small");
  const [percentageDiscountIsOther, setPercentageDiscountIsOther] =
    useState(false);
  const [status, setStatus] = useState(null);
  const [submitting, setSubmitting] = useState(false);

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

  function handleSubmit(e) {
    e.preventDefault();
    if (!SCRIPT_URL) {
      setStatus({ type: "error", message: "Missing VITE_GOOGLE_SCRIPT_URL" });
      return;
    }
    const payload = { ...formData };
    FORM_FIELDS.forEach(({ id, defaultZero, type }) => {
      if (
        defaultZero &&
        (payload[id] === "" ||
          payload[id] === undefined ||
          payload[id] === null)
      )
        payload[id] = 0;
      if (type === "checkbox") payload[id] = Boolean(payload[id]);
    });
    if (
      payload.percentageDiscount === "" ||
      payload.percentageDiscount === undefined ||
      payload.percentageDiscount === null
    ) {
      payload.percentageDiscount = 0;
    } else {
      payload.percentageDiscount = Number(payload.percentageDiscount);
    }
    const numericField = FORM_FIELDS.find(
      (f) => f.type === "number" && Number(payload[f.id]) < 0,
    );
    if (numericField) {
      setStatus({
        type: "error",
        message: `${numericField.label} cannot be negative`,
      });
      return;
    }
    const required = FORM_FIELDS.filter((f) => f.required);
    const missing = required.find((f) => {
      const val = payload[f.id];
      if (f.defaultZero && (val === "" || val === undefined || val === null))
        return false;
      return !String(val).trim();
    });
    if (missing) {
      setStatus({ type: "error", message: `${missing.label} is required` });
      return;
    }
    setSubmitting(true);
    setStatus(null);

    const body = { ...payload, roomType };
    if (body.percentageDiscount === 0) {
      body.percentageDiscount = "";
    }
    fetch(SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body),
    })
      .then((res) => {
        if (!res.ok) throw new Error(res.statusText || "Request failed");
        return res.json().catch(() => ({}));
      })
      .then(() => {
        setStatus({ type: "success", message: "Submitted successfully" });
        setFormData(getInitialState());
        setPercentageDiscountIsOther(false);
      })
      .catch((err) => {
        setStatus({
          type: "error",
          message: err.message || "Something went wrong",
        });
      })
      .finally(() => setSubmitting(false));
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
