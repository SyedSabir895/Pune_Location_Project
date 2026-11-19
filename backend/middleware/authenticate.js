const jwt = require("jsonwebtoken");

function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "Authentication required." });
  }

  const token = authHeader.slice("Bearer ".length);

  if (!process.env.JWT_SECRET) {
    console.error("JWT_SECRET is not configured.");
    return res.status(500).json({ message: "Unable to authenticate request." });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);

    if (!payload.sub || !payload.role) {
      return res.status(401).json({ message: "Invalid authentication token." });
    }

    req.user = {
      id: payload.sub,
      role: payload.role,
    };

    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token." });
  }
}

module.exports = authenticate;