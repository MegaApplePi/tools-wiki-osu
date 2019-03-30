// const {app, protocol, BrowserWindow, nativeImage} = require("electron");
const {app, protocol, BrowserWindow} = require("electron");
const path = require("path");
const base = app.getAppPath();
const scheme = "two";

protocol.registerStandardSchemes([scheme], {"secure": true});
require("./create-protocol")(scheme, base);

let browserWindow;
function createWindow() {
  if (browserWindow) {
    return;
  }
  browserWindow = new BrowserWindow({
    "height": 600,
    "minWidth": 750,
    "width": 750,
    "icon": path.join(__dirname, "resources/png/icon.png")
    // "icon": nativeImage.createFromPath(path.join(__dirname, "resources/png/icon.png"))
  });
  browserWindow.setMenu(null);

  browserWindow.openDevTools();

  browserWindow.loadURL(`${scheme}://./index.html`);

  browserWindow.on("closed", () => {
    browserWindow = null;
  });
}

app.on("ready", createWindow);

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
    process.exit();
  }
});

app.on("active", () => {
  if (browserWindow === null) {
    createWindow();
  }
});
