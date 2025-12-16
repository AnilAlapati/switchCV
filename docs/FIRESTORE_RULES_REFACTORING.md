/*
  REFACTORED FIRESTORE RULES - EXTRACT HELPERS
  
  This document shows how to refactor the deeply nested rules 
  to improve readability. Replace the corresponding sections in firestore.rules
*/

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // ==================== CORE AUTH FUNCTIONS ====================
    function isAuthenticated() {
      return request.auth != null;
    }

    function isOwner(userId) {
      return isAuthenticated() && request.auth.uid == userId;
    }

    function isAdmin() {
      return isAuthenticated() && request.auth.token.role == 'admin';
    }

    function isRecruiter() {
      return isAuthenticated() && request.auth.token.role == 'recruiter';
    }

    // ==================== USER DOCUMENT VALIDATION ====================
    
    // Extracted from userRoleIsProtected - checks role transitions
    function roleTransitionAllowed() {
      // Role not being modified
      let noRoleChange = !('role' in request.resource.data);
      
      // Creating new user with valid role
      let newUserRole = resource == null 
        && request.resource.data.role in ['jobseeker', 'recruiter'];
      
      // First role selection on existing user
      let firstRoleSelection = resource != null 
        && !('role' in resource.data) 
        && request.resource.data.role in ['jobseeker', 'recruiter'];
      
      // Setting new role during onboarding (no roleSelectedAt yet)
      let onboardingRoleChange = resource != null 
        && 'role' in resource.data 
        && !('roleSelectedAt' in resource.data) 
        && request.resource.data.role in ['jobseeker', 'recruiter'];
      
      // Role unchanged (no modification)
      let roleUnchanged = resource != null 
        && 'role' in resource.data 
        && request.resource.data.role == resource.data.role;
      
      return noRoleChange || newUserRole || firstRoleSelection 
        || onboardingRoleChange || roleUnchanged;
    }

    // Extracted from userTierIsProtected
    function tierTransitionAllowed() {
      // Tier not being modified
      let noTierChange = !('subscriptionTier' in request.resource.data);
      
      // Default tier for new user
      let newUserBasicTier = resource == null 
        && request.resource.data.subscriptionTier == 'basic';
      
      // Tier unchanged
      let tierUnchanged = resource != null 
        && request.resource.data.subscriptionTier == resource.data.subscriptionTier;
      
      return noTierChange || newUserBasicTier || tierUnchanged;
    }

    // Extracted from recruiterFlagProtected
    function recruiterFlagTransitionAllowed() {
      // Flag not being modified
      let noFlagChange = !('isRecruiter' in request.resource.data);
      
      // Default false for new user
      let newUserDefault = resource == null 
        && request.resource.data.isRecruiter == false;
      
      // Flag unchanged
      let flagUnchanged = resource != null 
        && request.resource.data.isRecruiter == resource.data.isRecruiter;
      
      return noFlagChange || newUserDefault || flagUnchanged;
    }

    function userDocHasOnlyAllowedFields() {
      return request.resource.data.keys().hasOnly([
        'uid', 'email', 'displayName', 'photoURL', 'username',
        'needsUsername', 'emailVerified', 'authProvider',
        'companyName', 'role', 'subscriptionTier', 'isRecruiter',
        'createdAt', 'updatedAt', 'settingsUpdatedAt',
        'profileCompletedAt', 'preferences', 'metrics',
        'resumeQuota', 'resumeUsage', 'connectivityIssue',
        'lastLoginAt', 'notificationPreferences', 'maintenanceBypass',
        'tierOverride', 'subscription', 'subscriptionStatus',
        'subscriptionExpiresAt', 'stripeCustomerId', 'billingStatus',
        'roleUpdatedAt', 'roleUpdatedBy', 'roleSelectedAt',
        'plan', 'planId', 'planMetadata', 'planExpiresAt',
        'planRenewalDate', 'planOverride', 'planTier',
        'aiUsage', 'quota', 'quotaOverrides', 'featureFlags',
        'policyAcceptances', 'privacySettings', 'profile'
      ]);
    }

    function userDocHasRequiredIdentity(userId) {
      return request.resource.data.uid == userId 
        && request.resource.data.email is string;
    }

    function existingDocHasCorrectIdentity(userId) {
      return resource.data.uid == userId;
    }

    // ==================== USER DOCUMENT OPERATIONS ====================
    
    // Extracted user creation validation
    function canCreateUserDoc(userId) {
      return isOwner(userId)
        && userDocHasOnlyAllowedFields()
        && userDocHasRequiredIdentity(userId)
        && roleTransitionAllowed()
        && tierTransitionAllowed()
        && recruiterFlagTransitionAllowed();
    }

    // Extracted user update validation
    function canUpdateUserDoc(userId) {
      return isOwner(userId)
        && userDocHasOnlyAllowedFields()
        && existingDocHasCorrectIdentity(userId)
        && roleTransitionAllowed()
        && tierTransitionAllowed()
        && recruiterFlagTransitionAllowed();
    }

    // ==================== RECRUITER REQUEST VALIDATION ====================
    
    function recruiterRequestOwnsRequest() {
      return request.resource.data.fromRecruiter.recruiterId == request.auth.uid;
    }

    function recruiterRequestHasRequiredFields() {
      return request.resource.data.toUserId is string
        && request.resource.data.status == 'pending';
    }

    function canCreateRecruiterRequest() {
      return isRecruiter()
        && recruiterRequestOwnsRequest()
        && recruiterRequestHasRequiredFields();
    }

    // ==================== ACCESS CONTROL RULES ====================
    
    // Users can read/write their own user document
    match /users/{userId} {
      allow read: if isOwner(userId);
      allow create: if canCreateUserDoc(userId);
      allow update: if canUpdateUserDoc(userId);
      allow delete: if isOwner(userId);
    }

    // User profiles
    match /profiles/{userId}/{document=**} {
      allow read, write: if isOwner(userId);
    }

    // Username reservations
    match /usernames/{usernameId} {
      allow get: if isAuthenticated();
      allow list: if false;
      allow create: if isAuthenticated() 
        && request.resource.data.uid == request.auth.uid;
      allow update, delete: if isAuthenticated() 
        && resource.data.uid == request.auth.uid;
    }

    // Resume templates (public read-only)
    match /templates/{templateId} {
      allow read: if true;
      allow write: if false;
    }

    // ==================== RECRUITER WORKFLOW ====================
    
    // Recruiter contact requests
    match /recruiterRequests/{requestId} {
      // Candidate can read their own incoming requests
      allow read: if request.auth != null 
        && request.auth.uid == resource.data.toUserId;
      
      // Recruiter can read their own outgoing requests
      allow read: if request.auth != null 
        && request.auth.uid == resource.data.fromRecruiter.recruiterId;
      
      // Admins can read all requests
      allow read: if isAdmin();
      
      // Recruiters can create new requests with validation
      allow create: if canCreateRecruiterRequest();
      
      // Only admins can update (approve/deny)
      allow update: if isAdmin();
      
      allow delete: if false;
    }

    // Access tokens for recruiter PII access
    match /accessTokens/{tokenId} {
      // Recruiters can read their own tokens
      allow read: if request.auth != null 
        && request.auth.uid == resource.data.recruiterId;
      
      // Candidates can verify tokens for their data
      allow read: if request.auth != null 
        && request.auth.uid == resource.data.userId;
      
      allow create, update, delete: if false; // Backend only
    }

    // Recruiter notifications
    match /recruiterNotifications/{notificationId} {
      // Recruiters read/update their own notifications
      allow read: if request.auth != null 
        && request.auth.uid == resource.data.recruiterId;
      allow update: if request.auth != null 
        && request.auth.uid == resource.data.recruiterId;
      
      allow create, delete: if false; // Backend only
    }

    // Recruiter search history (backend analytics only)
    match /recruiterSearchHistory/{eventId} {
      allow read, write: if false; // Backend telemetry only
    }

    // Admin notifications
    match /adminNotifications/{notificationId} {
      allow read: if isAdmin();
      allow update: if isAdmin();
      allow create, delete: if false;
    }

    // ==================== AUDIT & LOGGING ====================
    
    // Audit logs - admins read all, users read own
    match /auditLogs/{logId} {
      allow read: if isAdmin()
        || (isAuthenticated() && request.auth.uid == resource.data.userId);
      allow create, update, delete: if false; // Backend only
    }

    // Email logs - admins read all, users read own
    match /emailLogs/{logId} {
      allow read: if isAdmin()
        || (isAuthenticated() && request.auth.uid == resource.data.userId);
      allow create, update, delete: if false;
    }

    // Access token audit
    match /accessTokenAudit/{auditId} {
      allow read: if isAdmin()
        || (isAuthenticated() && request.auth.uid == resource.data.userId);
      allow create, update, delete: if false;
    }
  }
}
