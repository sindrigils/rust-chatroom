use axum::{body::Body, extract::State, http::Request, middleware::Next, response::Response};
use tracing::debug;

use crate::{AppState, errors::Error};

pub async fn require_lb_auth(
    State(state): State<AppState>,
    request: Request<Body>,
    next: Next,
) -> Result<Response<Body>, Error> {
    let headers = request.headers();
    let lb_secret = headers.get("x-lb-secret");
    if lb_secret.is_none() {
        debug!("LB auth failed: no x-lb-secret header");
        return Err(Error::Unauthorized);
    }

    let lb_secret_value = lb_secret.unwrap().to_str().unwrap();
    if lb_secret_value != state.settings.lb_secret {
        debug!("LB auth failed: x-lb-secret header does not match");
        return Err(Error::Unauthorized);
    }
    let res = next.run(request).await;
    Ok(res)
}
