import { createStandaloneApplication } from './standalone/application.js';
import { describeError } from './standalone/errors.js';

let application;
try {
  application = createStandaloneApplication({
    googleApiKey: import.meta.env.GOOGLE_MAPS_API_KEY,
    cesiumToken: import.meta.env.CESIUM_ION_TOKEN,
    allowQaRegistration: import.meta.env.DEV,
  });

  application.start().catch((error) => {
    console.error("God's Eye View initialization failed:", error);
    const msg = error?.stack || describeError(error);
    const loaderStatus = document.querySelector('#loading-screen .loader-status');
    if (loaderStatus) {
      loaderStatus.textContent = `Error: ${msg}`;
      loaderStatus.style.color = '#ff4444';
      loaderStatus.style.whiteSpace = 'pre-wrap';
      loaderStatus.style.textAlign = 'left';
      loaderStatus.style.fontSize = '12px';
      loaderStatus.style.maxHeight = '80vh';
      loaderStatus.style.overflow = 'auto';
    }
    try {
      fetch('/2244/api/client-log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'init-failure', message: String(error?.message || error), stack: error?.stack }),
      }).catch(() => {});
    } catch (_) {}
  });
} catch (error) {
  console.error("God's Eye View bootstrap failed:", error);
  const loaderStatus = document.querySelector('#loading-screen .loader-status');
  if (loaderStatus) {
    loaderStatus.textContent = `Bootstrap error: ${describeError(error)}`;
    loaderStatus.style.color = '#ff4444';
  }
}

export { application };
