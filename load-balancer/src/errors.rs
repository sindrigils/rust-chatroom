use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use derive_more::From;
use serde::Serialize;
use std::fmt;

#[derive(Debug, From)]
pub enum Error {
    WebSocketUpgradeFailed,
    WebSocketConnectionFailed,
    WebSocketProxy,

    MethodNotAllowed,
    Unauthorized,
    BadRequest,
    BadGateway,
    ServiceUnavailable,
    InternalServer,
}

#[derive(Serialize)]
struct ErrorBody {
    error: &'static str,
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            Error::WebSocketUpgradeFailed => (StatusCode::BAD_REQUEST, "websocket upgrade failed"),
            Error::WebSocketConnectionFailed => {
                (StatusCode::BAD_GATEWAY, "websocket connection failed")
            }
            Error::WebSocketProxy => (StatusCode::INTERNAL_SERVER_ERROR, "websocket proxy error"),

            Error::MethodNotAllowed => (StatusCode::METHOD_NOT_ALLOWED, "method not allowed"),
            Error::Unauthorized => (StatusCode::UNAUTHORIZED, "invalid credentials"),
            Error::BadRequest => (StatusCode::BAD_REQUEST, "bad request"),
            Error::BadGateway => (StatusCode::BAD_GATEWAY, "bad gateway"),
            Error::ServiceUnavailable => (StatusCode::SERVICE_UNAVAILABLE, "service unavailable"),
            Error::InternalServer => (StatusCode::INTERNAL_SERVER_ERROR, "internal server error"),
        };

        let body = Json(ErrorBody { error: msg });
        (status, body).into_response()
    }
}
impl fmt::Display for Error {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{self:?}")
    }
}
impl std::error::Error for Error {}
