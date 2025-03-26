# Upload all files from dist directory to the bucket
resource "null_resource" "upload_files" {
  # This will re-run when these values change
  triggers = {
    build_timestamp = timestamp()
  }

  # Upload all files from dist directory to the bucket
  provisioner "local-exec" {
    command = "gsutil -m cp -r ../dist/* gs://${var.bucket_name}/${var.bucket_path}/"
  }

  depends_on = [google_compute_backend_bucket.default]
} 