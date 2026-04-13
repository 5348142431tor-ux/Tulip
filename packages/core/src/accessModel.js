export const ACTOR_TYPES = {
  PLATFORM_OWNER: "platform_owner",
  COMPANY: "company",
  COMPANY_STAFF: "company_staff",
  CLIENT: "client",
};

export const ROLE_LABELS = {
  project_owner: "Создатель платформы",
  company_admin: "Руководитель компании",
  manager: "Менеджер компании",
  client: "Клиент",
  owner: "Собственник",
  tenant: "Арендатор",
};

export const HIERARCHY_LEVELS = {
  project_owner: 1,
  company: 2,
  company_admin: 3,
  manager: 4,
  client: 5,
  owner: 5,
  tenant: 5,
};

export const VIEW_ACCESS_BY_ROLE = {
  project_owner: ["dashboard", "admin-panel", "company-clients", "requests", "clients", "properties", "payments", "documents"],
  company_admin: ["dashboard", "managers", "properties", "clients", "payments", "requests"],
  manager: ["dashboard", "requests", "clients", "properties", "payments", "documents"],
  client: ["properties", "requests"],
};

export function getRoleLabel(role) {
  return ROLE_LABELS[role] || role || "Без роли";
}

export function getHierarchyLevel(key) {
  return HIERARCHY_LEVELS[key] || null;
}

export function getViewAccess(role) {
  return VIEW_ACCESS_BY_ROLE[role] || [];
}

export function canAccessView(role, viewKey) {
  return getViewAccess(role).includes(viewKey);
}

export function getDefaultView(role, fallback = "dashboard") {
  return getViewAccess(role)[0] || fallback;
}

export function canCreateRequests(role) {
  return ["project_owner", "company_admin", "manager", "client"].includes(role);
}

export function canAddProperties(role) {
  return ["project_owner", "company_admin", "manager"].includes(role);
}

export function canManageCompanies(role) {
  return role === "project_owner";
}

export function canReadCompanies(role) {
  return canManageCompanies(role);
}

export function canManageProperty({
  role,
  propertyManagerName,
  currentUserName,
  propertyManagerId,
  currentUserId,
  propertyCompanyCode,
  currentCompanyCode,
}) {
  if (!role) return false;
  if (role === "project_owner") return true;
  if (role === "company_admin") {
    return Boolean(propertyCompanyCode) && propertyCompanyCode === currentCompanyCode;
  }
  return role === "manager"
    && propertyManagerId === currentUserId
    && Boolean(propertyCompanyCode)
    && propertyCompanyCode === currentCompanyCode;
}

export function canReadProperty({
  role,
  propertyManagerName,
  currentUserName,
  propertyManagerId,
  currentUserId,
  propertyCompanyCode,
  currentCompanyCode,
}) {
  if (!role || !canAccessView(role, "properties")) return false;
  if (role === "company_admin") {
    return Boolean(propertyCompanyCode) && propertyCompanyCode === currentCompanyCode;
  }
  if (role === "manager") {
    return propertyManagerId === currentUserId
      && Boolean(propertyCompanyCode)
      && propertyCompanyCode === currentCompanyCode;
  }
  return role !== "client";
}

export function buildRoleDescriptor(role, overrides = {}) {
  return {
    code: role,
    label: getRoleLabel(role),
    hierarchyLevel: getHierarchyLevel(role),
    viewAccess: getViewAccess(role),
    ...overrides,
  };
}

export function buildCompanyDescriptor(company, overrides = {}) {
  return {
    ...company,
    entityType: "management_company",
    label: "Компания",
    hierarchyLevel: getHierarchyLevel("company"),
    ...overrides,
  };
}
