terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 3.31"
    }
    github = {
      source  = "integrations/github"
      version = "~> 4.5.1"
    }
  }
  required_version = "1.0.5"
}
