output "project_id" {
  value = var.project_id
}

output "storage_bucket_url" {
  value = google_storage_bucket.user_uploads.url
}

output "storage_bucket_name" {
  value = google_storage_bucket.user_uploads.name
}

output "firestore_database" {
  value = google_firestore_database.database.name
}

output "cloud_functions_service_account" {
  value = google_service_account.cloud_functions.email
}

output "secret_ids" {
  value = [for s in google_secret_manager_secret.app_secrets : s.secret_id]
}

output "process_resume_function_url" {
  value = google_cloudfunctions2_function.process_resume.url
}

output "on_user_created_function_url" {
  value = google_cloudfunctions2_function.on_user_created.url
}

output "budget_monitor_function_url" {
  value = google_cloudfunctions2_function.budget_monitor.url
}
