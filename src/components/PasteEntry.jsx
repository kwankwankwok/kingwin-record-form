import { useState } from "react";
import { parseBookingMessage } from "../lib/parseBookingMessage.js";
import styles from "./PasteEntry.module.css";

// eslint-disable-next-line react/prop-types
export default function PasteEntry({ onManualEntry, onRecognitionSuccess }) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const LOADING_MIN_MS = 1000;

  function handlePaste(e) {
    const pasted = e.clipboardData.getData("text");
    if (!pasted.trim()) return;
    e.preventDefault();
    setText(pasted);
    setError(null);
    setLoading(true);
    setTimeout(() => {
      const result = parseBookingMessage(pasted);
      if (result.ok) {
        onRecognitionSuccess?.(result.data);
      } else {
        setError(result.error);
        setLoading(false);
      }
    }, LOADING_MIN_MS);
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.card}>
        <label htmlFor="paste" className={styles.label}>
          貼上確認訂房訊息
        </label>
        <textarea
          id="paste"
          className={styles.textarea}
          placeholder="將確認訂房訊息貼上此處…"
          value={text}
          onChange={(e) => !loading && setText(e.target.value)}
          onPaste={handlePaste}
          disabled={loading}
          rows={14}
          aria-describedby={error ? "paste-error" : undefined}
        />
        {loading && (
          <div className={styles.loading} aria-live="polite">
            <span className={styles.spinner} />
            正在辨識…
          </div>
        )}
        {error && (
          <p id="paste-error" className={styles.error}>
            {error}
          </p>
        )}
        <button
          type="button"
          className={styles.button}
          onClick={onManualEntry}
          disabled={loading}
        >
          手動輸入
        </button>
      </div>
    </div>
  );
}
