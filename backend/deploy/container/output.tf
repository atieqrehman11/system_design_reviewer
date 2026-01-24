
# --- Output the URL of the deployed Container App ---
output "container_app_url" {
  description = "The FQDN of the deployed Container App."
  value       = "https://${azurerm_container_app.ca.latest_revision_fqdn}"
}