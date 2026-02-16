/**
 * Form field definitions. Order here must match your Google Sheet header row.
 * Add/remove fields by editing this array.
 */
export const FORM_FIELDS = [
  { id: "date", label: "日期", type: "date", required: true },
  { id: "startTime", label: "開始時間", type: "time", required: true },
  { id: "endTime", label: "完結時間", type: "time", required: true },
  { id: "noOfPpl", label: "人數", type: "number", required: true },
  { id: "noOfHrs", label: "鐘數", type: "number", required: true },
  { id: "amount", label: "消費", type: "number", required: true },
  { id: "deposit", label: "按金", type: "number", required: true, defaultZero: true },
  { id: "overtime", label: "逾時", type: "number", required: true, defaultZero: true },
  { id: "extendHr", label: "加鐘", type: "number", required: true, defaultZero: true },
  { id: "otherDiscount", label: "其他優惠", type: "number", required: true, defaultZero: true },
  { id: "percentageDiscount", label: "Discount", type: "number", required: false },
  { id: "total", label: "總數", type: "number", required: true },
  { id: "depositReturned", label: "已退回按金", type: "checkbox", required: false },
  { id: "phoneNumber", label: "電話", type: "tel", required: false },
  { id: "remark", label: "備注", type: "textarea", required: false },
];
