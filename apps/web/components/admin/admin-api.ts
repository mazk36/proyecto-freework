import * as adminService from "@/lib/admin-service";

/** The slice of the admin service the panel uses; the review page injects an in-memory fake with the same shape. */
export type AdminApi = Pick<typeof adminService,
  "isAdmin" | "listVerificationRequests" | "verify" | "reject" | "undoVerification" | "listUsers" | "setUserSuspended" |
  "listProblems" | "setProblemSuspended" | "getAdminSummary" | "getSettings" | "setSetting">;

export const defaultAdminApi: AdminApi = adminService;
