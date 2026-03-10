/**
 * Parse a confirm-booking message into partial form data.
 * Expects format: 房間已成功預訂(細房) or (大房), 日期：DD/MM/YYYY, 時間：HH:MM-HH:MM, 鐘數：N, 人數：N.
 * Returns { ok: true, data } or { ok: false, error }.
 */
const pad2 = (n) => String(Number(n) || 0).padStart(2, "0");
const timeFrom = (h, m) => `${pad2(h)}:${pad2(m)}`;

export function parseBookingMessage(text) {
  const s = typeof text === "string" ? text.trim() : "";
  if (!s) return { ok: false, error: "沒有貼上任何內容" };

  const data = {
    roomType: /房間已成功預訂\s*[（(]\s*大房\s*[）)]/.test(s) ? "large" : "small",
  };

  const dateMatch = s.match(/日期\s*[：:]\s*(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (dateMatch) data.date = `${dateMatch[3]}-${pad2(dateMatch[2])}-${pad2(dateMatch[1])}`;

  const timeMatch = s.match(/時間\s*[：:]\s*(\d{1,2})[：:](\d{2})\s*[-–—]\s*(\d{1,2})[：:](\d{2})/);
  if (timeMatch) {
    data.startTime = timeFrom(timeMatch[1], timeMatch[2]);
    data.endTime = timeFrom(timeMatch[3], timeMatch[4]);
  }

  const hrsMatch = s.match(/鐘數\s*[：:]\s*(\d+)/);
  if (hrsMatch) data.noOfHrs = parseInt(hrsMatch[1], 10);

  const pplMatch = s.match(/人數\s*[：:]\s*(\d+)/);
  if (pplMatch) data.noOfPpl = parseInt(pplMatch[1], 10);

  const required = ["date", "startTime", "endTime", "noOfHrs", "noOfPpl"];
  const hasAll = required.every((k) => data[k] !== undefined && data[k] !== null);
  if (!hasAll) {
    return { ok: false, error: "無法從訊息中辨識到日期、時間、鐘數及人數，請改用手動輸入" };
  }

  return { ok: true, data };
}
