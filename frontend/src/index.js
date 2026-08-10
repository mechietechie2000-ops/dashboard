import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App";
import { BrowserRouter } from "react-router-dom";
import * as serviceWorkerRegistration from './serviceWorkerRegistration';
import { registerPushSW } from './serviceWorkerRegistration';

serviceWorkerRegistration.register();
// registerPushSW() used to register a second service worker (push-sw.js)
// for push notifications, but it shared the same default scope ('/') as
// the main service worker above, causing the two registrations to collide
// and making push delivery unreliable. Push handling has been merged into
// the main service-worker.js instead (see src/service-worker.js). Left
// commented out, and registerPushSW()/push-sw.js left in place, for
// reference in case we want a dedicated push worker again later.
// registerPushSW();

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <React.StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </React.StrictMode>
);
