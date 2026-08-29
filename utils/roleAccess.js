const ROLE_GROUPS = ["ADMIN", "EMPLOYEE", "CUSTOMER"];

const ROLE_TOKENS = {
  ADMIN: ["admin", "superadmin", "أدمن"],
  EMPLOYEE: ["employee", "worker", "موظف", "عامل"],
  CUSTOMER: ["customer", "user", "مستخدم", "زبون"],
};

function normalizeRoleName(value) {
  return String(value || "").trim().toLowerCase();
}

function inferRoleGroup(name) {
  const normalized = normalizeRoleName(name);
  for (const [group, tokens] of Object.entries(ROLE_TOKENS)) {
    if (tokens.some((token) => normalized.includes(token))) return group;
  }
  return null;
}

function getRoleGroup(role) {
  const explicit = String(role?.group || "").trim().toUpperCase();
  if (ROLE_GROUPS.includes(explicit)) return explicit;
  return inferRoleGroup(role?.name);
}

const isAdminRole = (role) => getRoleGroup(role) === "ADMIN";
const isEmployeeRole = (role) => getRoleGroup(role) === "EMPLOYEE";
const isCustomerRole = (role) => getRoleGroup(role) === "CUSTOMER";

module.exports = { ROLE_GROUPS, inferRoleGroup, getRoleGroup, isAdminRole, isEmployeeRole, isCustomerRole, normalizeRoleName };
