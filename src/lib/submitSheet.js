/**
 * Submit payload to Google Apps Script Web App. Uses try/catch; throws on failure.
 * @param {string} scriptUrl - Full URL of the Web App
 * @param {object} body - JSON body to send
 * @returns {Promise<void>}
 */
export async function submitToSheet(scriptUrl, body) {
  const res = await fetch(scriptUrl, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify(body),
  });
  let result = {};
  try {
    result = await res.json();
  } catch {
    // non-JSON response
  }
  if (!res.ok) {
    throw new Error(result.error || res.statusText || "Request failed");
  }
  if (result && result.success === false) {
    throw new Error(result.error || "Request failed");
  }
}
