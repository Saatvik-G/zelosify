import type { Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthenticatedRequest } from "../../types/typeIndex.js";
import { formatPublicKey } from "../../utils/jwt/formatPubKey.js";
import { isValidRole } from "../../utils/RBAC/isValidRole.js";

const publicKey = formatPublicKey(process.env.KEYCLOAK_RS256_SIG);

export function authorizeRole(requiredrole: string) {
  return async (
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
  ) => {
    // 1. Fast path: If authenticateUser already attached req.user
    if (req.user?.role) {
      if (req.user.role === requiredrole) {
        return next();
      } else {
        return res.status(403).json({
          message: `Access Denied: User does not have required role ${requiredrole}`,
        });
      }
    }

    const token =
      req.headers.authorization?.split(" ")[1] || req.cookies.access_token;

    if (!token) {
      res.status(401).json({ message: "Missing token" });
      return;
    }

    // Validate the provided role
    if (!isValidRole(requiredrole)) {
      res.status(400).json({ message: "Invalid role provided." });
      return;
    }

    try {
      const decoded: any = jwt.decode(token);
      if (!decoded) {
        return res.status(401).json({ message: "Invalid token format" });
      }

      // Verify token signature
      if (decoded?.header?.alg === "RS256" && publicKey) {
        jwt.verify(token, publicKey, { algorithms: ["RS256"] });
      } else if (process.env.JWT_SECRET) {
        jwt.verify(token, process.env.JWT_SECRET);
      }

      const roles = [
        ...(decoded.realm_access?.roles || []),
        ...(decoded.roles || []),
        ...(decoded.role ? [decoded.role] : []),
      ];

      if (!roles.includes(requiredrole)) {
        return res.status(403).json({
          message: `Access Denied: User does not have required role ${requiredrole}`,
        });
      }

      next();
    } catch (err: any) {
      return res.status(401).json({
        message: "Token verification failed",
        error: err.message,
      });
    }
  };
}
