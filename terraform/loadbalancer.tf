# Reserve a static external IP address
resource "google_compute_global_address" "default" {
  name = "${var.subdomain}-address"
}

# Create a Google-managed SSL certificate
resource "google_compute_managed_ssl_certificate" "default" {
  name = "${var.subdomain}-cert"
  
  managed {
    domains = ["${var.subdomain}.${var.domain}"]
  }
}

# Create a backend bucket with the existing GCS bucket
resource "google_compute_backend_bucket" "default" {
  name        = "${var.subdomain}-backend"
  bucket_name = var.bucket_name
  enable_cdn  = true
}

# URL map to route requests to the backend
resource "google_compute_url_map" "default" {
  name            = "${var.subdomain}-url-map"
  default_service = google_compute_backend_bucket.default.id
  
  host_rule {
    hosts        = ["${var.subdomain}.${var.domain}"]
    path_matcher = "path-matcher-1"
  }
  
  path_matcher {
    name            = "path-matcher-1"
    default_service = google_compute_backend_bucket.default.id
    
    path_rule {
      paths   = ["/*"]
      service = google_compute_backend_bucket.default.id
    }
  }
}

# HTTPS proxy to handle SSL
resource "google_compute_target_https_proxy" "default" {
  name             = "${var.subdomain}-https-proxy"
  url_map          = google_compute_url_map.default.id
  ssl_certificates = [google_compute_managed_ssl_certificate.default.id]
}

# Global forwarding rule to route traffic to the HTTPS proxy
resource "google_compute_global_forwarding_rule" "default" {
  name       = "${var.subdomain}-forwarding-rule"
  target     = google_compute_target_https_proxy.default.id
  port_range = "443"
  ip_address = google_compute_global_address.default.address
} 