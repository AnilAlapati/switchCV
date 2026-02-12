variable "project_id" {
  description = "The ID of the Google Cloud project"
  type        = string
}

variable "region" {
  description = "The region to deploy resources to"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Execution environment (dev, staging, prod)"
  type        = string
  default     = "dev"
}
