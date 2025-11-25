"use strict";
// functions/src/services/backendService.ts
/**
 * Unified Backend Service Integration
 * Delegates to specialized service modules for better maintainability
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.backendService = exports.BackendServiceIntegration = void 0;
const recruiterRequestService_1 = require("./recruiterRequestService");
const accessTokenService_1 = require("./accessTokenService");
const userDataService_1 = require("./userDataService");
const profileAccessService_1 = require("./profileAccessService");
const securityService_1 = require("./securityService");
class BackendServiceIntegration {
    constructor() {
        // Recruiter Request Operations
        this.createRecruiterRequest = recruiterRequestService_1.recruiterRequestService.create.bind(recruiterRequestService_1.recruiterRequestService);
        this.approveRecruiterRequest = recruiterRequestService_1.recruiterRequestService.approve.bind(recruiterRequestService_1.recruiterRequestService);
        this.denyRecruiterRequest = recruiterRequestService_1.recruiterRequestService.deny.bind(recruiterRequestService_1.recruiterRequestService);
        // Access Token Operations
        this.revokeAccessToken = accessTokenService_1.accessTokenService.revoke.bind(accessTokenService_1.accessTokenService);
        this.verifyAndLogAccessToken = accessTokenService_1.accessTokenService.verify.bind(accessTokenService_1.accessTokenService);
        // User Data Operations
        this.updateUserProfile = userDataService_1.userDataService.updateProfile.bind(userDataService_1.userDataService);
        this.exportUserData = userDataService_1.userDataService.exportUserData.bind(userDataService_1.userDataService);
        this.deleteUserAccount = userDataService_1.userDataService.deleteAccount.bind(userDataService_1.userDataService);
        // Profile Access Operations
        this.logProfileAccess = profileAccessService_1.profileAccessService.logProfileAccess.bind(profileAccessService_1.profileAccessService);
        // Security Operations
        this.logSuspiciousActivity = securityService_1.securityService.logSuspiciousActivity.bind(securityService_1.securityService);
    }
}
exports.BackendServiceIntegration = BackendServiceIntegration;
// Export singleton
exports.backendService = new BackendServiceIntegration();
//# sourceMappingURL=backendService.js.map