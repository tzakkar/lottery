/**
 * Vercel serverless handler: forwards all lottery API requests to the Express app.
 * Rewrites in vercel.json send /getTempData, /getUsers, etc. here.
 */
const path = require("path");

// Ensure server runs with correct cwd so static and data paths resolve (we only use API routes)
process.chdir(path.join(__dirname, ".."));

const { app } = require("../server/server");

module.exports = (req, res) => {
  // Rewrites send path as query param so one handler can serve all lottery API routes
  const path = (req.url && require("url").parse(req.url, true).query.path) || "";
  req.url = path ? "/" + path : "/";
  app(req, res);
};
