const jwt = require("jsonwebtoken");
const { UnauthorizedError, ForbiddenError } = require("../lib/errors");
const SECRET = process.env.JWT_SECRET;

function authenticate(req, res, next) {
  const h = req.headers.authorization;
  if (!h || !h.startsWith("Bearer "))
    throw new UnauthorizedError("No token provided");
  try {
    req.user = jwt.verify(h.split(" ")[1], SECRET, { algorithms: ["HS256"] });
    next();
  } catch {
    req.log.warn({},"Error authenticating");
    throw new ForbiddenError("Invalid or expired token");
  }
}

module.exports = authenticate;