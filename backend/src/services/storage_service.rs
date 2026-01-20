use aws_sdk_s3::{Client};
use std::env;

pub async fn upload_image(
    client: &Client,
    bucket: &str,
    file_name: &str,
    data: Vec<u8>
) -> Result<String, Box<dyn std::error::Error>> {
    tracing::info!("Starting upload to MinIO: bucket={}, file={}, size={} bytes", bucket, file_name, data.len());
    
    // Check if bucket exists, create if not
    match client.head_bucket().bucket(bucket).send().await {
        Ok(_) => {
            tracing::debug!("Bucket '{}' exists", bucket);
        }
        Err(e) => {
            tracing::warn!("Bucket '{}' does not exist or is not accessible: {:?}", bucket, e);
            tracing::info!("Attempting to create bucket '{}'", bucket);
            
            match client.create_bucket().bucket(bucket).send().await {
                Ok(_) => {
                    tracing::info!("Successfully created bucket '{}'", bucket);
                }
                Err(create_err) => {
                    tracing::error!("Failed to create bucket '{}': {:?}", bucket, create_err);
                    return Err(format!("Failed to create bucket: {}", create_err).into());
                }
            }
        }
    }
    
    tracing::debug!("Uploading object to MinIO...");
    match client
        .put_object()
        .bucket(bucket)
        .key(file_name)
        .body(data.into())
        .content_type("image/jpeg")
        .send()
        .await {
        Ok(_) => {
            tracing::info!("Successfully uploaded object to MinIO: {}/{}", bucket, file_name);
        }
        Err(e) => {
            tracing::error!("Failed to upload object to MinIO: {:?}", e);
            return Err(format!("Failed to upload to MinIO: {}", e).into());
        }
    }
    
    let minio_url = env::var("MINIO_URL")
        .map_err(|_| {
            tracing::error!("MINIO_URL environment variable not set");
            "MINIO_URL environment variable must be set"
        })?;
    
    let result_url = format!("{}/{}/{}", minio_url, bucket, file_name);
    tracing::info!("Upload complete, returning URL: {}", result_url);
    Ok(result_url)
}