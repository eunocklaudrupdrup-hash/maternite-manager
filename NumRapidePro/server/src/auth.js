const SECRET = "numrapidepro-demo-secret";

export function createToken(user) {
  return Buffer.from(JSON.stringify({ ...user, secret: SECRET })).toString("base64url");
}

export function parseToken(headerValue) {
  if (!headerValue?.startsWith("Bearer ")) {
    return null;
  }

  try {
    const raw = headerValue.slice(7);
    const value = JSON.parse(Buffer.from(raw, "base64url").toString("utf8"));
    if (value.secret !== SECRET) {
      return null;
    }
    delete value.secret;
    return value;
  } catch {
    return null;
  }
}
