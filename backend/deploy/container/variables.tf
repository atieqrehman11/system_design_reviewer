# --- Variables ---
variable "resource_group_name" {
  description = "Name for the Azure Resource Group."
  type        = string
  default     = "design-reviewer-rg"
}

variable "container_app_env_name" {
  description = "Name for the Azure Container App Environment."
  type        = string
  default     = "design-reviewer-env"
}

variable "container_app_name" {
  description = "Name for the Azure Container App."
  type        = string
  default     = "design-reviewer-app"
}

variable "docker_hub_image" {
  description = "Full Docker Hub image name (e.g., atieqrehman/pr-reviewer-bb-app:v1)."
  type        = string
  default     = "atieqrehman/system_design_reviewer_backend:latest"
}

variable "azure_api_version" {
  description = "The API version for Azure OpenAI."
  type        = string
  default     = "2024-12-01-preview"
}

variable "azure_endpoint" {
  type        = string
  description = "description"
  default     = "https://eastus.api.cognitive.microsoft.com/"
}

variable "azure_api_key" {
  description = "The Azure OpenAI API key. Provide securely (e.g., as TF_VAR_azure_openai_key)."
  type        = string
  sensitive   = true
}

variable "model_name" {
  type        = string
  description = "description"
  default     = "gpt-5-mini"
}

variable "use_azure_openai" {
  type        = bool
  description = "description"
  default     = true
}
