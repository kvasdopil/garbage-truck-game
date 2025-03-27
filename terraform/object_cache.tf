# Default cache control settings for different file types

# HTML files should have a short cache time to ensure fresh content
resource "google_storage_bucket_object_access_control" "html_files" {
  object = "${var.bucket_path}/index.html"
  bucket = var.bucket_name
  role   = "READER"
  entity = "allUsers"
}

resource "null_resource" "update_html_cache_headers" {
  triggers = {
    version = timestamp()
  }

  provisioner "local-exec" {
    command = "gsutil setmeta -h 'Cache-Control:no-cache, max-age=0, must-revalidate' gs://${var.bucket_name}/${var.bucket_path}/*.html"
  }

  depends_on = [google_storage_bucket_object_access_control.html_files]
}

# Static assets can be cached longer
resource "null_resource" "update_static_cache_headers" {
  triggers = {
    version = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      gsutil setmeta -h 'Cache-Control:public, max-age=3600' gs://${var.bucket_name}/${var.bucket_path}/assets/**
      gsutil setmeta -h 'Cache-Control:public, max-age=3600' gs://${var.bucket_name}/${var.bucket_path}/textures/**
    EOT
  }
} 