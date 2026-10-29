"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminArea = adminArea;
exports.roleCanAccess = roleCanAccess;
const ACCESS = {
    FOUNDER: "*",
    OPS_MANAGER: new Set([
        "dashboard",
        "users",
        "users-write",
        "gyms",
        "gyms-delete",
        "economy",
        "memberships",
        "memberships-write",
        "content",
        "notifications",
        "plans",
        "marketplace",
        "trial",
        "applications",
        "support",
    ]),
    SALES_REP: new Set(["dashboard", "gyms", "trial", "applications", "marketing"]),
    SUPPORT_AGENT: new Set(["dashboard", "users", "support", "memberships"]),
    FINANCE_ADMIN: new Set(["dashboard", "finance", "payouts", "economy", "memberships", "memberships-write", "plans"]),
    MARKETING_MANAGER: new Set(["dashboard", "marketing", "content", "notifications", "marketplace"]),
};
/** Maps an admin URL to a permission area. Unknown paths stay founder-only. */
function adminArea(path, method = "GET") {
    const value = path.split("?")[0];
    if (value.includes("/payouts"))
        return "payouts";
    if (value.includes("/finance"))
        return "finance";
    if (value.includes("/economy"))
        return "economy";
    if (value.includes("/audit-logs") || value.includes("/settings") || value.includes("/admins"))
        return "founder-only";
    if (value.includes("/users/") && value.endsWith("/action"))
        return "users-write";
    if (value.includes("/support"))
        return "support";
    if (value.includes("/marketing"))
        return "marketing";
    if (value.includes("/notifications"))
        return "notifications";
    if (value.includes("/content"))
        return "content";
    if (value.includes("/marketplace"))
        return "marketplace";
    if (value.includes("/memberships/") && method !== "GET" && method !== "HEAD")
        return "memberships-write";
    if (value.includes("/memberships"))
        return "memberships";
    if (/\/trial-gyms(\/|$)/.test(value))
        return "trial";
    if (value.includes("/gym-applications"))
        return "applications";
    if (/\/gyms\/[^/]+$/.test(value) && method === "DELETE")
        return "gyms-delete";
    if (/\/gyms(\/|$)/.test(value))
        return "gyms";
    if (/\/plans(\/|$)/.test(value))
        return "plans";
    if (/\/users(\/|$)/.test(value))
        return "users";
    if (value.includes("/dashboard"))
        return "dashboard";
    return "founder-only";
}
function roleCanAccess(role, path, method = "GET") {
    const area = adminArea(path, method);
    if (area === "founder-only")
        return role === "FOUNDER";
    const allowed = ACCESS[role];
    if (!allowed)
        return false;
    if (allowed === "*")
        return true;
    return allowed.has(area);
}
//# sourceMappingURL=adminAccess.js.map