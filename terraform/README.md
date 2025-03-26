# GCP Subdomain Deployment with Terraform

This Terraform configuration sets up a subdomain (`garbage.guskov.dev`) using a Google-managed SSL certificate and an existing Google Cloud Storage bucket.

## Prerequisites

- Google Cloud CLI installed and configured
- Terraform installed
- An existing GCP project
- An existing Cloud Storage bucket
- Domain already configured in Cloud DNS

## Setup Instructions

1. Copy `terraform.tfvars.example` to `terraform.tfvars`:

   ```
   cp terraform.tfvars.example terraform.tfvars
   ```

2. Edit `terraform.tfvars` with your specific values:

   - Your GCP project ID
   - Your existing bucket name
   - Adjust other values if needed

3. Initialize Terraform:

   ```
   cd terraform
   terraform init
   cd ..
   ```

4. Deploy the application:

   ```
   npm run deploy
   ```

   This will:

   - Build your application
   - Apply the Terraform configuration
   - Upload your files to the bucket

5. After deployment completes, note the outputs:
   - The URL of your deployed subdomain
   - The static IP address
   - Certificate ID

## File Deployment

The configuration includes an automated file upload process using a `null_resource` with a local-exec provisioner. It will automatically upload the contents of your `dist` directory to the specified bucket path.

If you make changes to your application, you can simply run:

```
npm run deploy
```

## Important Notes

- The SSL certificate for `garbage.guskov.dev` may take some time to provision
- DNS propagation can take up to 24-48 hours
- Make sure your Google Cloud Storage bucket has appropriate public access settings
- The Vite configuration should use base path of `/` for root deployment

## Cleanup

To destroy all created resources:

```
cd terraform
terraform destroy
```
