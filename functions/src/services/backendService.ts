// functions/src/services/backendService.ts
/**
 * Unified Backend Service Integration
 * Delegates to specialized service modules for better maintainability
 */

import { recruiterRequestService } from "./recruiterRequestService";
import { accessTokenService } from "./accessTokenService";
import { userDataService } from "./userDataService";
import { profileAccessService } from "./profileAccessService";
import { securityService } from "./securityService";

export class BackendServiceIntegration {
  // Recruiter Request Operations
  createRecruiterRequest = recruiterRequestService.create.bind(
    recruiterRequestService
  );
  approveRecruiterRequest = recruiterRequestService.approve.bind(
    recruiterRequestService
  );
  denyRecruiterRequest = recruiterRequestService.deny.bind(
    recruiterRequestService
  );

  // Access Token Operations
  revokeAccessToken = accessTokenService.revoke.bind(accessTokenService);
  verifyAndLogAccessToken = accessTokenService.verify.bind(accessTokenService);

  // User Data Operations
  updateUserProfile = userDataService.updateProfile.bind(userDataService);
  exportUserData = userDataService.exportUserData.bind(userDataService);
  deleteUserAccount = userDataService.deleteAccount.bind(userDataService);

  // Profile Access Operations
  logProfileAccess =
    profileAccessService.logProfileAccess.bind(profileAccessService);

  // Security Operations
  logSuspiciousActivity =
    securityService.logSuspiciousActivity.bind(securityService);
}

// Export singleton
export const backendService = new BackendServiceIntegration();
