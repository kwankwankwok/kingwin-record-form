import { FORM_FIELDS } from "../config/fields.js";

export const HOURS_24 = Array.from({ length: 24 }, (_, i) =>
  i.toString().padStart(2, "0"),
);
export const MINUTES_5 = [
  "00", "30", "05", "10", "15", "20", "25", "35", "40", "45", "50", "55",
];
export const PERCENTAGE_DISCOUNT_OPTIONS = [
  { value: 0, label: "無" },
  { value: 5, label: "95折" },
  { value: 10, label: "9折" },
  { value: 15, label: "85折" },
  { value: "other", label: "其他" },
];
export const PRESET_PERCENTAGES = [0, 5, 10, 15];
export const TOTAL_FORMULA_FIELDS = [
  "amount", "overtime", "extendHr", "percentageDiscount", "otherDiscount",
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

export function parseTime(value) {
  if (!value || typeof value !== "string") return { hour: "", minute: "" };
  const [hour, minute] = value.trim().split(":");
  const h = hour?.length === 2 ? hour : "";
  const minNum = parseInt(minute, 10);
  const snapped = Number.isNaN(minNum)
    ? ""
    : ((Math.round(minNum / 5) * 5) % 60).toString().padStart(2, "0");
  return { hour: h, minute: snapped };
}

export function computeNoOfHrs(startTime, endTime) {
  if (
    !startTime ||
    !endTime ||
    typeof startTime !== "string" ||
    typeof endTime !== "string"
  )
    return null;
  const [sh, sm] = startTime.trim().split(":").map(Number);
  const [eh, em] = endTime.trim().split(":").map(Number);
  if (Number.isNaN(sh) || Number.isNaN(sm) || Number.isNaN(eh) || Number.isNaN(em))
    return null;
  const startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) endMins += 24 * 60;
  return Math.round((endMins - startMins) / 60);
}

export function computeAmount(date, noOfPpl, noOfHrs, roomType = "small") {
  if (!date || typeof date !== "string" || date.trim() === "") return null;
  const d = new Date(date.trim() + "T12:00:00");
  if (Number.isNaN(d.getTime())) return null;
  const day = d.getDay();
  const ppl = Number(noOfPpl) || 0;
  const hrs = Number(noOfHrs) || 0;
  if (ppl < 1 || hrs < 0) return null;
  const isMonThu = day >= 1 && day <= 4;
  let basePrice, extraPerHourPerPerson;
  const includedHours =
    roomType === "large"
      ? AMOUNT_PRICE_LARGE.INCLUDED_HOURS
      : AMOUNT_PRICE_SMALL.INCLUDED_HOURS;
  if (roomType === "large") {
    basePrice = isMonThu ? AMOUNT_PRICE_LARGE.BASE_MON_THU : AMOUNT_PRICE_LARGE.BASE_FRI_SUN;
    extraPerHourPerPerson = isMonThu
      ? AMOUNT_PRICE_LARGE.EXTRA_HOUR_PER_PERSON_MON_THU
      : AMOUNT_PRICE_LARGE.EXTRA_HOUR_PER_PERSON_FRI_SUN;
  } else {
    if (ppl >= 3) {
      basePrice = isMonThu ? AMOUNT_PRICE_SMALL.BASE_3_PPL_UP_MON_THU : AMOUNT_PRICE_SMALL.BASE_3_PPL_UP_FRI_SUN;
      extraPerHourPerPerson = isMonThu
        ? AMOUNT_PRICE_SMALL.EXTRA_HOUR_PER_PERSON_MON_THU
        : AMOUNT_PRICE_SMALL.EXTRA_HOUR_PER_PERSON_FRI_SUN;
    } else {
      basePrice = isMonThu ? AMOUNT_PRICE_SMALL.BASE_2_PPL_MON_THU : AMOUNT_PRICE_SMALL.BASE_2_PPL_FRI_SUN;
      extraPerHourPerPerson = isMonThu
        ? AMOUNT_PRICE_SMALL.EXTRA_HOUR_PER_PERSON_MON_THU
        : AMOUNT_PRICE_SMALL.EXTRA_HOUR_PER_PERSON_FRI_SUN;
    }
  }
  const extraHours = Math.max(0, hrs - includedHours);
  return Math.round(ppl * (basePrice + extraHours * extraPerHourPerPerson) * 100) / 100;
}

export function computeTotal(amount, overtime, extendHr, percentageDiscount, otherDiscount) {
  const a = Number(amount) || 0;
  const o = Number(overtime) || 0;
  const e = Number(extendHr) || 0;
  const pct = Number(percentageDiscount) || 0;
  const other = Number(otherDiscount) || 0;
  const total = a * (1 - pct / 100) + o + e - other;
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

export function getInitialState() {
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

/** Normalize formData into payload and build body for submit. */
export function buildSubmitBody(formData, roomType, accessCode) {
  const payload = { ...formData };
  FORM_FIELDS.forEach(({ id, defaultZero, type }) => {
    if (
      defaultZero &&
      (payload[id] === "" || payload[id] === undefined || payload[id] === null)
    )
      payload[id] = 0;
    if (type === "checkbox") payload[id] = Boolean(payload[id]);
  });
  if (payload.percentageDiscount === "" || payload.percentageDiscount === undefined || payload.percentageDiscount === null) {
    payload.percentageDiscount = 0;
  } else {
    payload.percentageDiscount = Number(payload.percentageDiscount);
  }
  const body = { ...payload, roomType, accessCode: accessCode.trim() };
  if (body.percentageDiscount === 0) body.percentageDiscount = "";
  return body;
}

/**
 * Validate payload before submit. Returns { ok: true } or { ok: false, message }.
 */
export function validateSubmitBody(payload) {
  const numericField = FORM_FIELDS.find(
    (f) => f.type === "number" && Number(payload[f.id]) < 0,
  );
  if (numericField)
    return { ok: false, message: `${numericField.label} cannot be negative` };
  const required = FORM_FIELDS.filter((f) => f.required);
  const missing = required.find((f) => {
    const val = payload[f.id];
    if (f.defaultZero && (val === "" || val === undefined || val === null)) return false;
    return !String(val).trim();
  });
  if (missing)
    return { ok: false, message: `${missing.label} is required` };
  return { ok: true };
}
