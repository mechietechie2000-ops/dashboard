import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import * as registerPushSW from './serviceWorkerRegistration';
// import { serviceWorkerRegistration, registerPushSW } from './serviceWorkerRegistration'

serviceWorkerRegistration.register();
registerPushSW.register();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
