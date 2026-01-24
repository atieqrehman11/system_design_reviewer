# --- 1. Look up the existing Resource Group ---
# Use a data lookup for an existing resource group and reference its attributes.
data "azurerm_resource_group" "rg" {
    name = var.resource_group_name
}

locals {
    rg_name     = data.azurerm_resource_group.rg.name
    rg_location = data.azurerm_resource_group.rg.location
}

# --- 1a. Register required Azure Resource Providers ---
# This ensures that the subscription is enabled to use Container Apps and its dependencies.
# resource "azurerm_resource_provider_registration" "app" {
#   name = "Microsoft.App"
# }

# --- 2. Create a Container App Environment ---
# This provides the isolated environment for container apps.
resource "azurerm_container_app_environment" "cae" {
  name                = var.container_app_env_name
  location            = local.rg_location
  resource_group_name = local.rg_name

  # Explicitly depend on the provider registration
#   depends_on = [azurerm_resource_provider_registration.app]
}

# --- Data source to get the current client configuration ---
# We need the tenant_id for the Key Vault access policy.
data "azurerm_client_config" "current" {}

# --- 3. Deploy the Container App ---
resource "azurerm_container_app" "ca" {
  name                         = var.container_app_name
  resource_group_name          = local.rg_name
  container_app_environment_id = azurerm_container_app_environment.cae.id
  revision_mode                = "Single"

  # Enable a system-assigned managed identity for the app.
  # This is a security best practice for accessing other Azure resources.
  identity {
    type = "SystemAssigned"
  }

  template {
    container {
      name   = "design-reviewer-app"
      image  = var.docker_hub_image
      cpu    = 0.25
      memory = "0.5Gi"

      # Pass configuration as environment variables.
      # Your application should be configured to read these values.
    
      env {
        name  = "AZURE_API_VERSION"
        value = var.azure_api_version
      }
      env {
        name  = "AZURE_ENDPOINT"
        value = var.azure_endpoint
      }
      env {
        name = "AZURE_API_KEY"
        value = var.azure_api_key
      }
      env {
        name  = "AZURE_MODEL_NAME"
        value = var.model_name
      }
      env {
        name  = "USE_AZURE_OPENAI"
        value = tostring(var.use_azure_openai)
      }
    }
  }
  
  # Configure ingress to make the app accessible from the internet.
  ingress {
    external_enabled = true
    target_port      = 8000 # Your container listens on this port.
    transport        = "http"

    traffic_weight {
      percentage = 100
      latest_revision = true
    }
  }
}
