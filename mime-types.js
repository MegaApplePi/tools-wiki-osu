const {extname} = require("path");

// eslint-disable-next-line
const mime = (filename) => {
  return mime[extname(`${filename || ""}`).toLowerCase()];
};

mime[""] = "text/plain";
mime[".txt"] = "text/plain";
mime[".md"] = "text/markdown";
mime[".js"] = "application/javascript";
mime[".html"] = "text/html";
mime[".json"] = "application/json";
mime[".css"] = "text/css";
mime[".svg"] = "application/svg+xml";

module.exports = mime;
