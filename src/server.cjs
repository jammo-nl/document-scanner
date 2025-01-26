// CommonJS loader (fixes error on FusionPassenger)
async function loadApp() {
    await import("./server.js"); // this is your normal entry file - (index.js, main.js, app.mjs etc.)
}
loadApp()
