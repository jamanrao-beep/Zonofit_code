"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
const PAGE = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>ZonoFit</title>
</head>
<body style="font-family: sans-serif; padding: 24px; color: #111827;">
  <p id="msg">Returning to ZonoFit…</p>
  <p><a id="open" href="#">Open ZonoFit</a></p>
  <script>
    var hash = window.location.hash || "";
    var msg = document.getElementById("msg");
    var link = document.getElementById("open");
    if (hash.indexOf("id_token=") === -1) {
      msg.textContent = "Google did not return an account. Close this page and try again.";
      link.style.display = "none";
    } else {
      var next = "zonofit://oauth/google" + hash;
      link.href = next;
      window.location.replace(next);
    }
  </script>
</body>
</html>`;
// Google sends the account token in the URL hash, so this server never receives it.
// The page only hands that hash back to the installed app.
router.get("/google", (_req, res) => {
    res.setHeader("Content-Security-Policy", "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; base-uri 'none'");
    res.setHeader("Referrer-Policy", "no-referrer");
    res.setHeader("Cache-Control", "no-store");
    res.type("html").send(PAGE);
});
exports.default = router;
//# sourceMappingURL=googleOAuthReturn.js.map