const MOBILE_UA = /\b(Mobile|Android|iPhone|iPod|BlackBerry|IEMobile|Opera Mini|Windows Phone|webOS)\b/i;
const TABLET_UA = /\b(iPad|Tablet)\b/i;

export function isMobileUA(req) {
  const ua = (req && req.headers && (req.headers["user-agent"] || req.headers["User-Agent"])) || "";
  if (!ua) return false;
  if (TABLET_UA.test(ua)) return true;
  return MOBILE_UA.test(ua);
}
