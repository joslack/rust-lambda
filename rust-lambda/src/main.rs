use lambda_runtime::{run, service_fn, Error, LambdaEvent};
use serde::{Deserialize, Serialize};
use tracing::{info, instrument};
use tracing_subscriber::fmt::format::JsonFields;
use tracing_subscriber::fmt::time::UtcTime;

#[derive(Deserialize)]
struct Request {
    event_id: String,
    // Add other fields you need
}

#[derive(Serialize)]
struct Response {
    req_id: String,
    msg: String,
}

#[instrument(skip(event), fields(event_id = %event.payload.event_id))]
async fn function_handler(event: LambdaEvent<Request>) -> Result<Response, Error> {
    // Extract request ID and payload
    let event_id = event.payload.event_id;
    let context = event.context;

    // Log structured event information
    info!(
        request_id = %context.request_id,
        event_id = %event_id,
        "Processing new event"
    );

    // Your business logic here
    
    Ok(Response {
        req_id: context.request_id,
        msg: format!("Processed event {}", event_id),
    })
}

#[tokio::main]
async fn main() -> Result<(), Error> {
    // Initialize the tracing subscriber with JSON formatting
    tracing_subscriber::fmt()
        .with_timer(UtcTime::rfc_3339())
        .json()
        .with_env_filter(tracing_subscriber::EnvFilter::from_default_env())
        .init();

    info!("Lambda function initialized");
    
    run(service_fn(function_handler)).await
} 