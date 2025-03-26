# This file configures bucket-related settings

# We don't create the bucket, but we can reference it
data "google_storage_bucket" "existing" {
  name = var.bucket_name
}

# Add an output to remind about configuring objects in the bucket
output "bucket_instructions" {
  description = "Instructions for deploying your app to the bucket"
  value       = "Make sure to deploy your app to gs://${var.bucket_name}/${var.bucket_path}/ directory"
} 