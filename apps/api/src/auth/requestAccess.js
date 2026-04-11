import {
  canAccessView,
  canAddProperties,
  canManageCompanies,
  canManageProperty,
  canReadCompanies,
  canReadProperty,
  getRoleLabel,
} from "./accessModel.js";
import { getBearerToken, verifyAdminSessionToken } from "./adminSession.js";

export function getRequestAccess(request) {
  const token = getBearerToken(request);
  const session = verifyAdminSessionToken(token);

  return {
    token: session.token,
    role: session.user.role,
    userName: session.user.name,
    userId: session.user.id,
    roleLabel: session.user.roleLabel,
    roleInfo: session.user.roleInfo,
    company: session.user.company || null,
    impersonator: session.impersonator || null,
  };
}

function forbidden(message) {
  const error = new Error(message || "Forbidden");
  error.statusCode = 403;
  return error;
}

export function assertViewAccess(request, viewKey) {
  const access = getRequestAccess(request);

  if (!canAccessView(access.role, viewKey)) {
    throw forbidden(`${getRoleLabel(access.role)} cannot access ${viewKey}`);
  }

  return access;
}

export function assertCompanyReadAccess(request) {
  const access = getRequestAccess(request);

  if (!canReadCompanies(access.role)) {
    throw forbidden(`${getRoleLabel(access.role)} cannot view companies`);
  }

  return access;
}

export function assertCompanyManageAccess(request) {
  const access = getRequestAccess(request);

  if (!canManageCompanies(access.role)) {
    throw forbidden(`${getRoleLabel(access.role)} cannot manage companies`);
  }

  return access;
}

export function assertPropertyListAccess(request) {
  return assertViewAccess(request, "properties");
}

export function assertPropertyCreateAccess(request) {
  const access = getRequestAccess(request);

  if (!canAddProperties(access.role)) {
    throw forbidden(`${getRoleLabel(access.role)} cannot create properties`);
  }

  return access;
}

export function assertPropertyReadAccess(request, property) {
  const access = getRequestAccess(request);

  if (!canReadProperty({
    role: access.role,
    propertyManagerName: property?.manager || "",
    currentUserName: access.userName,
  })) {
    throw forbidden(`${getRoleLabel(access.role)} cannot view this property`);
  }

  return access;
}

export function assertPropertyManageAccess(request, property) {
  const access = getRequestAccess(request);

  if (!canManageProperty({
    role: access.role,
    propertyManagerName: property?.manager || "",
    currentUserName: access.userName,
  })) {
    throw forbidden(`${getRoleLabel(access.role)} cannot manage this property`);
  }

  return access;
}
