output "subdomain_url" {
  description = "The URL of the deployed subdomain"
  value       = "https://${var.subdomain}.${var.domain}/"
}

output "static_ip" {
  description = "The static IP address assigned to the load balancer"
  value       = google_compute_global_address.default.address
}

output "certificate_id" {
  description = "The ID of the created certificate"
  value       = google_compute_managed_ssl_certificate.default.id
}

output "dns_zone" {
  description = "The DNS zone name"
  value       = data.google_dns_managed_zone.domain_zone.name
} 