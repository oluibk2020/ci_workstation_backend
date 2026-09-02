/**
 * ============================================================================
 * NEW — security fix. `documentUrl` (verification) and `profileImageUrl`
 * (profile) both accept whatever string the client sends, with no format
 * validation anywhere. Since these are rendered back out as `<img src>`
 * AND, for documents, as a clickable `<a href>` (VerificationQueuePage.jsx,
 * so Staff/Admin can open the full image), an attacker could submit a
 * `javascript:...` URI instead of a real image — that payload would
 * execute in the reviewing Staff/Admin's authenticated browser session
 * the moment they click it. This is a stored XSS vulnerability against
 * privileged accounts specifically.
 *
 * Fix: only accept a genuine base64 image data URI, matching exactly what
 * the frontend's own FileReader.readAsDataURL() produces. Anything else —
 * javascript:, http(s):, data:text/html, malformed data URIs — is
 * rejected before it ever reaches the database.
 * ============================================================================
 */

const IMAGE_DATA_URI_PATTERN =
  /^data:image\/(png|jpe?g|gif|webp);base64,[A-Za-z0-9+/]+=*$/;

// ~7MB of base64 text comfortably covers the 10MB JSON body limit (see
// app.js) after accounting for the rest of the request payload.
const MAX_DATA_URI_LENGTH = 7 * 1024 * 1024;

const isValidImageDataUri = (value) => {
  if (typeof value !== "string") return false;
  if (value.length === 0 || value.length > MAX_DATA_URI_LENGTH) return false;
  return IMAGE_DATA_URI_PATTERN.test(value);
};

module.exports = { isValidImageDataUri };
