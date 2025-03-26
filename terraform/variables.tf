variable "project_id" {
  description = "The GCP project ID"
  type        = string
}

variable "region" {
  description = "The GCP region"
  type        = string
}

variable "domain" {
  description = "The root domain name"
  type        = string
}

variable "subdomain" {
  description = "The subdomain to create"
  type        = string
}

variable "bucket_name" {
  description = "The existing GCS bucket name"
  type        = string
}

variable "bucket_path" {
  description = "The path in the bucket to use for this subdomain"
  type        = string
} 