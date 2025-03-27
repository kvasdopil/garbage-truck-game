# This file configures bucket-related settings

# We don't create the bucket, but we can reference it
data "google_storage_bucket" "existing" {
  name = var.bucket_name
}

# Grant public read access at bucket level
resource "google_storage_bucket_iam_member" "public_read" {
  bucket = data.google_storage_bucket.existing.name
  role   = "roles/storage.objectViewer"
  member = "allUsers"
}

# Add an output to remind about configuring objects in the bucket
output "bucket_instructions" {
  description = "Instructions for deploying your app to the bucket"
  value       = "Make sure to deploy your app to gs://${var.bucket_name}/${var.bucket_path}/ directory"
} 