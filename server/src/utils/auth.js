const SECRET = "maternite-demo-secret";

export function createToken(payload) {
  return Buffer.from(JSON.stringify({ ...payload, secret: SECRET })).toString("base64url");
}

export function getUserFromAuthHeader(headerValue) {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const raw = headerValue.slice("Bearer ".length);
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (parsed.secret !== SECRET) {
      return null;
    }
    delete parsed.secret;
    return parsed;
  } catch {
    return null;
  }
}

export function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acces refuse pour ce role." });
    }
    next();
  };
}
