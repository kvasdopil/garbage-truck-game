# Default cache control settings for different file types

# HTML files should have a short cache time to ensure fresh content
resource "null_resource" "update_html_cache_headers" {
  triggers = {
    version = timestamp()
  }

  provisioner "local-exec" {
    command = "gsutil -h 'Cache-Control:no-cache, max-age=0, must-revalidate' cp gs://${var.bucket_name}/${var.bucket_path}/*.html gs://${var.bucket_name}/${var.bucket_path}/"
    on_failure = continue
  }
}

# Static assets can be cached longer
resource "null_resource" "update_static_cache_headers" {
  triggers = {
    version = timestamp()
  }

  provisioner "local-exec" {
    command = <<-EOT
      gsutil -h 'Cache-Control:public, max-age=3600' cp gs://${var.bucket_name}/${var.bucket_path}/assets/* gs://${var.bucket_name}/${var.bucket_path}/assets/
      gsutil -h 'Cache-Control:public, max-age=3600' cp gs://${var.bucket_name}/${var.bucket_path}/textures/* gs://${var.bucket_name}/${var.bucket_path}/textures/
    EOT
    on_failure = continue
  }
} 