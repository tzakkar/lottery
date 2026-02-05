/**
 * Vercel serverless handler: forwards all lottery API requests to the Express app.
 * Rewrites in vercel.json send /getTempData, /getUsers, etc. here.
 */
const pathModule = require("path");
const url = require("url");

let app;
let loadError = null;

try {
  // Ensure server runs with correct cwd so static and data paths resolve
  process.chdir(pathModule.join(__dirname, ".."));
  app = require("../server/server").app;
} catch (err) {
  loadError = err;
  console.error("Failed to load server:", err.message, err.stack);
}

module.exports = (req, res) => {
  if (loadError) {
    res.status(500).json({ error: "Server failed to load", message: loadError.message });
    return;
  }
  try {
    // Rewrites send path as query param so one handler can serve all lottery API routes
    const pathname = (req.url && url.parse(req.url, true).query.path) || "";
    req.url = pathname ? "/" + pathname : "/";
    app(req, res);
  } catch (err) {
    console.error("Request error:", err.message, err.stack);
    res.status(500).json({ error: "Request failed", message: err.message });
  }
};
