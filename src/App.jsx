import { useState } from "react";
import Form from "./components/Form.jsx";
import PasteEntry from "./components/PasteEntry.jsx";

function App() {
  const [page, setPage] = useState("paste");
  const [prefillData, setPrefillData] = useState(null);

  function goToForm(initialData) {
    setPrefillData(initialData ?? null);
    setPage("form");
  }

  return (
    <main>
      {page === "paste" ? (
        <PasteEntry
          onManualEntry={() => goToForm(null)}
          onRecognitionSuccess={(data) => goToForm(data)}
        />
      ) : (
        <Form initialData={prefillData} />
      )}
    </main>
  );
}

export default App;
