# ========================================
# Variables
# ========================================
variable "application_version" {
  type = string
}

variable "application_name" {
  type    = string
  default = "event-persister"
}

variable "aws_region" {
  default = "eu-central-1"
}

# ========================================
# Initialization
# ========================================
terraform {

  backend "s3" {
    encrypt        = "true"
    bucket         = "tango-terraform"
    key            = "resources/event-persister/tfstate.tf"
    region         = "eu-central-1"
    dynamodb_table = "terraform"
  }
}

provider "aws" {
  region = "eu-central-1"
}

provider "github" {
  token        = data.terraform_remote_state.account_resources.outputs.github_access_token
  base_url     = "https://github.com/tamer84"
}

data "terraform_remote_state" "account_resources" {
  backend = "s3"
  config = {
    encrypt = "true"
    bucket  = "tango-terraform"
    key     = "account_resources/tfstate.tf"
    region  = "eu-central-1"
  }
  workspace = "default"
}

data "terraform_remote_state" "environment_resources" {
  backend = "s3"
  config = {
    encrypt = "true"
    bucket  = "tango-terraform"
    key     = "environment_resources/tfstate.tf"
    region  = "eu-central-1"
  }
  workspace = terraform.workspace
}

data "terraform_remote_state" "terraform_build_image_resources" {
  backend = "s3"
  config = {
    encrypt = "true"
    bucket  = "tango-terraform"
    key     = "resources/terraform-build-image/tfstate.tf"
    region  = "eu-central-1"
  }
  workspace = terraform.workspace
}

data "aws_caller_identity" "current" {}

# ========================================
# Locals
# ========================================
locals {
  tableName = "tango-events-${terraform.workspace}"
  hashKey   = "unique_id"
  table_attributes = {
    "unique_id" : "S"
    "product_id" : "S"
    "market" : "S"
    "timestamp" : "N"
    "saga_id" : "S"
    "event_name" : "S"
    "domain" : "S"
    "source" : "S"
  }

  code        = "dist/${var.application_name}.zip"
  cicd_branch = contains(["dev", "test", "int"], terraform.workspace) ? "develop" : "main"

  lambda_rule_id = 1
  lambda_rule = {
    "Name" : "${terraform.workspace}_event_persister",
    "EventPattern" : jsonencode({
      account : [
        data.aws_caller_identity.current.account_id
      ],
      detail-type : [
        {
          anything-but : [
            "IndexableEvent",
            "ValidatableEvent"
          ]
        }
      ]
    }),
    "State" : "DISABLED",
    "Description" : "Forward all events to the persister",
    "EventBusName" : data.terraform_remote_state.environment_resources.outputs.eventbus
  }
  firehose_rule_id = 2
  firehose_rule = {
    "Name" : "${terraform.workspace}_firehose_event_persistor",
    "EventPattern" : jsonencode({
      account : [
        data.aws_caller_identity.current.account_id
      ],
      detail-type : [
        {
          anything-but : [
            "SoldEvent"
          ]
        }
      ]
    }),
    "State" : "ENABLED",
    "Description" : "Forward all events to the firehose delivery stream",
    "EventBusName" : data.terraform_remote_state.environment_resources.outputs.eventbus
  }

}

# ========================================
# Lambda
# ========================================
resource "aws_lambda_function" "event-persister" {
  function_name    = "${var.application_name}-${terraform.workspace}"
  handler          = "src/index.handler"
  filename         = local.code
  runtime          = "nodejs14.x"
  memory_size      = 256
  publish          = true
  source_code_hash = filebase64sha256(local.code)
  role             = data.terraform_remote_state.account_resources.outputs.lambda_default_exec_role.arn
  timeout          = 30

  environment {
    variables = {
      VERSION          = var.application_version
      ENVIRONMENT      = terraform.workspace
      EVENT_BUS        = data.terraform_remote_state.environment_resources.outputs.eventbus
      APPLICATION_NAME = "${var.application_name}-${terraform.workspace}"
      AWSREGION        = var.aws_region
      PRODUCT_EVENTS_TABLE     = data.terraform_remote_state.environment_resources.outputs.event_tables.product.name
    }
  }

  dead_letter_config {
    target_arn = aws_sqs_queue.dlq.arn
  }

  vpc_config {
    security_group_ids = [data.terraform_remote_state.environment_resources.outputs.group_internal_access.id]
    subnet_ids         = data.terraform_remote_state.environment_resources.outputs.private-subnet.*.id
  }

  tags = {
    Terraform   = "true"
    Environment = terraform.workspace
    Source      = var.application_name
  }
}

resource "aws_lambda_function_event_invoke_config" "event_persister" {
  function_name                = aws_lambda_function.event-persister.function_name
  maximum_event_age_in_seconds = 21600
  maximum_retry_attempts       = 0
}

resource "aws_cloudwatch_log_group" "log_group_event_persister" {
  name = "/aws/lambda/${var.application_name}-${terraform.workspace}"
}

# ========================================
# EventBus
# ========================================
module "eventbridge_rule" {
  source = "git::ssh://git@github.com/tamer84/infra.git//modules/eventbridge-rule?ref=develop"

  rule       = local.lambda_rule
  rule_id    = local.lambda_rule_id
  target_arn = aws_lambda_function.event-persister.arn
}

# ========================================
# CICD
# ========================================
module "cicd" {
  source = "git::ssh://git@github.com/tamer84/infra.git//modules/cicd?ref=develop"

  codestar_connection_arn = data.terraform_remote_state.account_resources.outputs.git_codestar_conn.arn

  pipeline_base_configs = {
    "name"        = "${var.application_name}-${terraform.workspace}"
    "bucket_name" = data.terraform_remote_state.environment_resources.outputs.cicd_bucket.id
    "role_arn"    = data.terraform_remote_state.account_resources.outputs.cicd_role.arn
  }

  codebuild_build_stage = {
    "project_name"        = "${var.application_name}-${terraform.workspace}"
    "github_branch"       = local.cicd_branch
    "github_repo"         = "tamer84/event-persister"
    "github_access_token" = data.terraform_remote_state.account_resources.outputs.github_access_token
    "github_certificate"  = "${data.terraform_remote_state.environment_resources.outputs.cicd_bucket.arn}/${data.terraform_remote_state.environment_resources.outputs.github_cert.id}"

    "service_role_arn"   = data.terraform_remote_state.account_resources.outputs.cicd_role.arn
    "cicd_bucket_id"     = data.terraform_remote_state.environment_resources.outputs.cicd_bucket.id
    "vpc_id"             = data.terraform_remote_state.environment_resources.outputs.vpc.id
    "subnets_ids"        = data.terraform_remote_state.environment_resources.outputs.private-subnet.*.id
    "security_group_ids" = [data.terraform_remote_state.environment_resources.outputs.group_internal_access.id]

    "docker_img_url"                   = data.terraform_remote_state.terraform_build_image_resources.outputs.ecr_repository.repository_url
    "docker_img_tag"                   = "latest"
    "docker_img_pull_credentials_type" = "SERVICE_ROLE"
    "buildspec"                        = "./buildspec.yml"
    "env_vars" = [
      {
        name  = "ENVIRONMENT"
        value = terraform.workspace
    }]
  }
}

resource "aws_sqs_queue" "dlq" {
  name                        = "${var.application_name}-${terraform.workspace}"
  fifo_queue                  = false
  content_based_deduplication = false
  message_retention_seconds   = 1209600
}
