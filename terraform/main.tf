terraform {
  required_version = ">= 1.5.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 4.0.0"
    }
  }
  backend "gcs" {
    bucket = "switchcv-terraform-state"
    prefix = "terraform/state"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

# ============================================================================
# APIs
# ============================================================================

resource "google_project_service" "apis" {
  for_each = toset([
    "firestore.googleapis.com",
    "cloudfunctions.googleapis.com",
    "cloudbuild.googleapis.com",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    "aiplatform.googleapis.com",
    "run.googleapis.com",
    "artifactregistry.googleapis.com",
  ])
  service            = each.key
  disable_on_destroy = false
}

# ============================================================================
# Firestore Database
# ============================================================================

resource "google_firestore_database" "database" {
  project     = var.project_id
  name        = "(default)"
  location_id = var.region
  type        = "FIRESTORE_NATIVE"

  depends_on = [google_project_service.apis]
}

# ── Composite Indexes ──────────────────────────────────────────────────────

resource "google_firestore_index" "user_approval_requests_status" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "userApprovalRequests"

  fields {
    field_path = "status"
    order      = "ASCENDING"
  }
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "access_requests_from_user_cg" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "accessRequests"
  query_scope = "COLLECTION_GROUP"

  fields {
    field_path = "fromUserId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "timestamp"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "access_requests_from_user_status" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "accessRequests"

  fields {
    field_path = "fromUserId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "status"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "audit_logs_resource" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "auditLogs"

  fields {
    field_path = "resourceType"
    order      = "ASCENDING"
  }
  fields {
    field_path = "resourceId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "timestamp"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "audit_logs_user" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "auditLogs"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "timestamp"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "drafts_user" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "drafts"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "events_type_cg" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "events"
  query_scope = "COLLECTION_GROUP"

  fields {
    field_path = "eventType"
    order      = "ASCENDING"
  }
  fields {
    field_path = "timestamp"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "events_type" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "events"

  fields {
    field_path = "eventType"
    order      = "ASCENDING"
  }
  fields {
    field_path = "timestamp"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "events_timestamp_type" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "events"

  fields {
    field_path = "timestamp"
    order      = "ASCENDING"
  }
  fields {
    field_path = "eventType"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "notification_logs" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "notification_logs"

  fields {
    field_path = "notificationId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "timestamp"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "notifications_recipient" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "notifications"

  fields {
    field_path = "recipientId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "recruiter_requests_status" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "recruiterRequests"

  fields {
    field_path = "fromRecruiter.recruiterId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "status"
    order      = "ASCENDING"
  }
}

resource "google_firestore_index" "recruiter_search_history" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "recruiterSearchHistory"

  fields {
    field_path = "recruiterId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "createdAt"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "search_quotas_user" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "searchQuotas"

  fields {
    field_path = "userId"
    order      = "ASCENDING"
  }
  fields {
    field_path = "month"
    order      = "DESCENDING"
  }
}

resource "google_firestore_index" "users_role_login" {
  project    = var.project_id
  database   = google_firestore_database.database.name
  collection = "users"

  fields {
    field_path = "role"
    order      = "ASCENDING"
  }
  fields {
    field_path = "lastLoginAt"
    order      = "ASCENDING"
  }
}

# ============================================================================
# Cloud Storage
# ============================================================================

resource "google_storage_bucket" "user_uploads" {
  name     = "${var.project_id}-uploads"
  location = var.region

  force_destroy               = false
  uniform_bucket_level_access = true

  cors {
    origin          = var.cors_origins
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  versioning {
    enabled = true
  }
}

# ============================================================================
# Secret Manager — Application Secrets
# ============================================================================

locals {
  secrets = [
    "GEMINI_API_KEY",
    "GROQ_API_KEY",
    "CLAUDE_API_KEY",
    "SMTP_PASSWORD",
    "SENTRY_AUTH_TOKEN",
    "FIREBASE_SERVICE_ACCOUNT",
  ]
}

resource "google_secret_manager_secret" "app_secrets" {
  for_each  = toset(local.secrets)
  secret_id = each.key
  project   = var.project_id

  replication {
    auto {}
  }

  labels = {
    environment = var.environment
    managed_by  = "terraform"
  }

  depends_on = [google_project_service.apis]
}

# ============================================================================
# IAM — Cloud Functions Service Account
# ============================================================================

resource "google_service_account" "cloud_functions" {
  account_id   = "switchcv-functions"
  display_name = "SwitchCV Cloud Functions"
  project      = var.project_id
}

resource "google_project_iam_member" "functions_firestore" {
  project = var.project_id
  role    = "roles/datastore.user"
  member  = "serviceAccount:${google_service_account.cloud_functions.email}"
}

resource "google_project_iam_member" "functions_storage" {
  project = var.project_id
  role    = "roles/storage.objectAdmin"
  member  = "serviceAccount:${google_service_account.cloud_functions.email}"
}

resource "google_project_iam_member" "functions_secret_accessor" {
  project = var.project_id
  role    = "roles/secretmanager.secretAccessor"
  member  = "serviceAccount:${google_service_account.cloud_functions.email}"
}

resource "google_project_iam_member" "functions_ai_platform" {
  project = var.project_id
  role    = "roles/aiplatform.user"
  member  = "serviceAccount:${google_service_account.cloud_functions.email}"
}

# ============================================================================
# Cloud Functions (2nd Gen via Cloud Run)
# ============================================================================

resource "google_cloudfunctions2_function" "process_resume" {
  name     = "processResumeGenerationAsync"
  location = var.region
  project  = var.project_id

  build_config {
    runtime     = "nodejs22"
    entry_point = "processResumeGenerationAsync"
    source {
      storage_source {
        bucket = google_storage_bucket.user_uploads.name
        object = "functions/source.zip"
      }
    }
  }

  service_config {
    max_instance_count    = 10
    min_instance_count    = 0
    available_memory      = "512Mi"
    timeout_seconds       = 300
    service_account_email = google_service_account.cloud_functions.email

    environment_variables = {
      NODE_ENV    = var.environment == "prod" ? "production" : "development"
      WEBSITE_URL = var.website_url
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_cloudfunctions2_function" "on_user_created" {
  name     = "onUserCreated"
  location = var.region
  project  = var.project_id

  build_config {
    runtime     = "nodejs22"
    entry_point = "onUserCreated"
    source {
      storage_source {
        bucket = google_storage_bucket.user_uploads.name
        object = "functions/source.zip"
      }
    }
  }

  service_config {
    max_instance_count    = 5
    min_instance_count    = 0
    available_memory      = "256Mi"
    timeout_seconds       = 60
    service_account_email = google_service_account.cloud_functions.email

    environment_variables = {
      NODE_ENV    = var.environment == "prod" ? "production" : "development"
      WEBSITE_URL = var.website_url
    }
  }

  depends_on = [google_project_service.apis]
}

resource "google_cloudfunctions2_function" "budget_monitor" {
  name     = "budgetMonitor"
  location = var.region
  project  = var.project_id

  build_config {
    runtime     = "nodejs22"
    entry_point = "budgetMonitor"
    source {
      storage_source {
        bucket = google_storage_bucket.user_uploads.name
        object = "functions/source.zip"
      }
    }
  }

  service_config {
    max_instance_count    = 1
    min_instance_count    = 0
    available_memory      = "256Mi"
    timeout_seconds       = 120
    service_account_email = google_service_account.cloud_functions.email

    environment_variables = {
      NODE_ENV    = var.environment == "prod" ? "production" : "development"
      WEBSITE_URL = var.website_url
    }
  }

  depends_on = [google_project_service.apis]
}
