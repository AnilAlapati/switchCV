"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.ValidationError = void 0;
exports.sanitizeString = sanitizeString;
exports.sanitizeHtml = sanitizeHtml;
exports.validateEmail = validateEmail;
exports.validateUrl = validateUrl;
exports.validateUserId = validateUserId;
exports.validateModelId = validateModelId;
exports.validateResumeData = validateResumeData;
exports.validateJobDescription = validateJobDescription;
exports.validateTone = validateTone;
exports.validateTemplate = validateTemplate;
exports.validateObject = validateObject;
exports.handleValidationError = handleValidationError;
exports.sanitizeRequestBody = sanitizeRequestBody;
const functions = __importStar(require("firebase-functions"));
/**
 * Validation error
 */
class ValidationError extends Error {
    constructor(message, field, code = "VALIDATION_ERROR") {
        super(message);
        this.field = field;
        this.code = code;
        this.name = "ValidationError";
    }
}
exports.ValidationError = ValidationError;
/**
 * Sanitize string input
 */
function sanitizeString(input, maxLength = 1000) {
    if (typeof input !== "string") {
        throw new ValidationError("Input must be a string");
    }
    // Remove any null bytes
    let sanitized = input.replace(/\0/g, "");
    // Trim and limit length
    sanitized = sanitized.trim().slice(0, maxLength);
    return sanitized;
}
/**
 * Sanitize HTML/script content
 */
function sanitizeHtml(input) {
    return input
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#x27;")
        .replace(/\//g, "&#x2F;");
}
/**
 * Validate email format
 */
function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}
/**
 * Validate URL format
 */
function validateUrl(url) {
    try {
        new URL(url);
        return true;
    }
    catch (_a) {
        return false;
    }
}
/**
 * Validate user ID format (Firebase UID)
 */
function validateUserId(userId) {
    if (typeof userId !== "string") {
        throw new ValidationError("User ID must be a string", "userId");
    }
    if (userId.length < 1 || userId.length > 128) {
        throw new ValidationError("User ID must be between 1 and 128 characters", "userId");
    }
    // Firebase UIDs are alphanumeric
    if (!/^[a-zA-Z0-9_-]+$/.test(userId)) {
        throw new ValidationError("Invalid user ID format", "userId");
    }
    return userId;
}
/**
 * Validate model ID against allowed list
 */
function validateModelId(modelId, allowedModels) {
    if (typeof modelId !== "string") {
        throw new ValidationError("Model ID must be a string", "modelId");
    }
    if (!allowedModels.includes(modelId)) {
        throw new ValidationError(`Invalid model: ${modelId}. Allowed models: ${allowedModels.join(", ")}`, "modelId", "INVALID_MODEL");
    }
    return modelId;
}
/**
 * Validate resume data structure
 */
function validateResumeData(data) {
    if (!data || typeof data !== "object") {
        throw new ValidationError("Resume data must be an object", "resumeData");
    }
    // Validate personal info
    if (!data.personalInfo || typeof data.personalInfo !== "object") {
        throw new ValidationError("Personal info is required", "resumeData.personalInfo");
    }
    const { name, email } = data.personalInfo;
    if (!name || typeof name !== "string" || name.trim().length === 0) {
        throw new ValidationError("Name is required", "resumeData.personalInfo.name");
    }
    if (!email || typeof email !== "string" || !validateEmail(email)) {
        throw new ValidationError("Valid email is required", "resumeData.personalInfo.email");
    }
    // Validate summary
    if (!data.summary || typeof data.summary !== "string") {
        throw new ValidationError("Summary is required", "resumeData.summary");
    }
    if (data.summary.length > 5000) {
        throw new ValidationError("Summary must be less than 5000 characters", "resumeData.summary");
    }
    // Validate experience array
    if (!Array.isArray(data.experience)) {
        throw new ValidationError("Experience must be an array", "resumeData.experience");
    }
    data.experience.forEach((exp, index) => {
        if (!exp.title || typeof exp.title !== "string") {
            throw new ValidationError(`Experience ${index} must have a title`, `resumeData.experience[${index}].title`);
        }
        if (!exp.company || typeof exp.company !== "string") {
            throw new ValidationError(`Experience ${index} must have a company`, `resumeData.experience[${index}].company`);
        }
        if (!exp.description || typeof exp.description !== "string") {
            throw new ValidationError(`Experience ${index} must have a description`, `resumeData.experience[${index}].description`);
        }
    });
    // Validate education array
    if (!Array.isArray(data.education)) {
        throw new ValidationError("Education must be an array", "resumeData.education");
    }
    // Validate skills array
    if (!Array.isArray(data.skills)) {
        throw new ValidationError("Skills must be an array", "resumeData.skills");
    }
    if (data.skills.length === 0) {
        throw new ValidationError("At least one skill is required", "resumeData.skills");
    }
    data.skills.forEach((skill, index) => {
        if (typeof skill !== "string") {
            throw new ValidationError(`Skill ${index} must be a string`, `resumeData.skills[${index}]`);
        }
    });
}
/**
 * Validate job description
 */
function validateJobDescription(description) {
    if (typeof description !== "string") {
        throw new ValidationError("Job description must be a string", "jobDescription");
    }
    if (description.trim().length === 0) {
        throw new ValidationError("Job description cannot be empty", "jobDescription");
    }
    if (description.length > 10000) {
        throw new ValidationError("Job description must be less than 10000 characters", "jobDescription");
    }
    return sanitizeString(description, 10000);
}
/**
 * Validate tone parameter
 */
function validateTone(tone) {
    const allowedTones = ["professional", "creative", "concise"];
    if (typeof tone !== "string") {
        throw new ValidationError("Tone must be a string", "tone");
    }
    if (!allowedTones.includes(tone)) {
        throw new ValidationError(`Invalid tone. Allowed values: ${allowedTones.join(", ")}`, "tone");
    }
    return tone;
}
/**
 * Validate template parameter
 */
function validateTemplate(template) {
    const allowedTemplates = [
        "modern",
        "classic",
        "creative",
        "minimal",
        "professional",
    ];
    if (typeof template !== "string") {
        throw new ValidationError("Template must be a string", "template");
    }
    if (!allowedTemplates.includes(template)) {
        throw new ValidationError(`Invalid template. Allowed values: ${allowedTemplates.join(", ")}`, "template");
    }
    return template;
}
/**
 * Generic object validator
 */
function validateObject(obj, requiredFields, fieldName = "object") {
    if (!obj || typeof obj !== "object") {
        throw new ValidationError(`${fieldName} must be an object`, fieldName);
    }
    for (const field of requiredFields) {
        if (!(field in obj)) {
            throw new ValidationError(`Missing required field: ${field}`, `${fieldName}.${field}`);
        }
    }
}
/**
 * Handle validation errors in Cloud Functions
 */
function handleValidationError(error, context = "request") {
    if (error instanceof ValidationError) {
        functions.logger.warn("Validation error", {
            context,
            field: error.field,
            message: error.message,
            code: error.code,
        });
        throw new functions.https.HttpsError("invalid-argument", error.message, {
            field: error.field,
            code: error.code,
        });
    }
    // Re-throw unexpected errors
    throw error;
}
/**
 * Sanitize and validate entire request body
 */
function sanitizeRequestBody(body) {
    if (!body || typeof body !== "object") {
        throw new ValidationError("Request body must be an object");
    }
    const sanitized = {};
    for (const [key, value] of Object.entries(body)) {
        if (typeof value === "string") {
            sanitized[key] = sanitizeString(value);
        }
        else if (Array.isArray(value)) {
            sanitized[key] = value.map((item) => typeof item === "string" ? sanitizeString(item) : item);
        }
        else if (value && typeof value === "object") {
            sanitized[key] = sanitizeRequestBody(value);
        }
        else {
            sanitized[key] = value;
        }
    }
    return sanitized;
}
//# sourceMappingURL=validation.js.map