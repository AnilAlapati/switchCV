# SwitchCV API Documentation

## Overview

This document outlines the REST API endpoints available in the SwitchCV application.
Base URL: `/api`

## Authentication

Most endpoints require authentication via Firebase Auth. Include the ID token in the Authorization header:
`Authorization: Bearer <firebase_id_token>`

## Endpoints

### User Profile

- **GET /user/profile**
  - Get current user's profile.
  - Query Params: `userId` (must match auth user)
- **POST /user/profile**
  - Create a new user profile.
  - Body: `{ uid, email, displayName, companyName }`
- **PUT /user/profile**
  - Update user profile.
  - Body: `{ uid, displayName, companyName }`

### Resumes

- **GET /resumes/[id]**
  - Get a specific resume by ID.
- **POST /resumes/create**
  - Create a new resume.
- **DELETE /resume/delete**
  - Delete a resume.
- **POST /resume/generate**
  - Generate resume content using AI.

### Recruiters

- **POST /recruiters/request-contact**
  - Request contact info from a candidate.
- **POST /recruiters/approve-contact**
  - Approve a contact request (Admin only).
- **POST /recruiters/deny-contact**
  - Deny a contact request (Admin only).
- **POST /recruiter/search**
  - Search for candidates.

### AI Services

- **POST /ai/generate**
  - Generate text content.
- **POST /search/ai**
  - Semantic search for profiles.

### Analytics

- **GET /analytics/dashboard**
  - Get analytics data for the dashboard.

## Error Handling

Standard HTTP status codes are used:

- 200: Success
- 400: Bad Request
- 401: Unauthorized
- 403: Forbidden
- 404: Not Found
- 500: Internal Server Error

Response format for errors:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```
