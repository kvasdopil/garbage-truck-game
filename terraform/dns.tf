# Get the managed zone for the domain
data "google_dns_managed_zone" "domain_zone" {
  name = replace(var.domain, ".", "-")
}

# Create the DNS record for the subdomain
resource "google_dns_record_set" "subdomain" {
  name         = "${var.subdomain}.${var.domain}."
  managed_zone = data.google_dns_managed_zone.domain_zone.name
  type         = "A"
  ttl          = 300
  
  # These IPs will be updated with the load balancer IP
  rrdatas = [google_compute_global_address.default.address]
} 