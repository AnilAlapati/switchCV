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

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "Environment must be one of: dev, staging, prod."
  }
}

variable "website_url" {
  description = "Public URL of the SwitchCV website"
  type        = string
  default     = "https://switchcv.com"
}

variable "cors_origins" {
  description = "Allowed CORS origins for Cloud Storage"
  type        = list(string)
  default     = ["https://switchcv.com", "http://localhost:3000"]
}
