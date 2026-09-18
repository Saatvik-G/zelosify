// Utility function to decode JWT token (without verification)
export const decodeJwt = (token) => {
  try {
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join("")
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error("Error decoding JWT:", error);
    return null;
  }
};

// Extract role from JWT token
export const extractRoleFromToken = (token) => {
  if (!token) return null;

  const decoded = decodeJwt(token);
  if (!decoded) return null;

  const businessRolesList = [
    "ADMIN",
    "VENDOR_MANAGER",
    "BUSINESS_USER",
    "HIRING_MANAGER",
    "FINANCE_MANAGER",
    "RESOURCE_MANAGER",
    "IT_VENDOR",
    "PROCUREMENT_MANAGER",
  ];

  // 1. Direct role claim (Local JWT)
  if (decoded.role && businessRolesList.includes(decoded.role)) {
    return decoded.role;
  }

  // 2. Keycloak realm_access.roles
  if (decoded.realm_access && Array.isArray(decoded.realm_access.roles)) {
    const businessRoles = decoded.realm_access.roles.filter((role) =>
      businessRolesList.includes(role)
    );
    if (businessRoles.length > 0) return businessRoles[0];
  }

  return null;
};
