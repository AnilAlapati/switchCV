output "project_id" {
  value = var.project_id
}

output "storage_bucket_url" {
  value = google_storage_bucket.user_uploads.url
}
