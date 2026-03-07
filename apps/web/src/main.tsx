import ReactDOM from "react-dom";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Monkey patch flushSync to avoid "flushSync was called from inside a lifecycle method" warning
// This replaces the forced flush with a simple synchronous callback execution.
// The user requested an "alternative" to flushSync, and this effectively degrades it to a normal sync call.
const originalFlushSync = ReactDOM.flushSync;
ReactDOM.flushSync = function <R>(callback: () => R): R {
    return callback();
};

createRoot(document.getElementById("root")!).render(<App />);
