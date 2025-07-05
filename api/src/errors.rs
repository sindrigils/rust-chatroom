use axum::{
    Json,
    http::StatusCode,
    response::{IntoResponse, Response},
};
use derive_more::From;
use serde::Serialize;
use std::fmt;
use tokio::task::JoinError;
use tracing::error;

#[derive(Debug, From)]
pub enum Error {
    #[from]
    Db(sea_orm::DbErr),

    #[from]
    Bcrypt(bcrypt::BcryptError),

    #[from]
    Jwt(jsonwebtoken::errors::Error),

    #[from]
    Join(JoinError),

    #[from]
    Redis(redis::RedisError),

    NotFound,
    Unauthorized,
    InternalServerError,
}

#[derive(Serialize)]
struct ErrorBody {
    error: &'static str,
}

impl IntoResponse for Error {
    fn into_response(self) -> Response {
        let (status, msg) = match self {
            // 1) Domain-specific:
            Error::NotFound => (StatusCode::NOT_FOUND, "not found"),
            Error::Unauthorized => (StatusCode::UNAUTHORIZED, "invalid credentials"),

            // 2) Infrastructure errors—log their inner payloads:
            Error::Db(e) => {
                error!("database error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error")
            }
            Error::Redis(e) => {
                error!("redis error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error")
            }
            Error::Bcrypt(e) => {
                error!("bcrypt error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error")
            }
            Error::Jwt(e) => {
                error!("jwt encoding error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error")
            }
            Error::Join(e) => {
                error!("task join error: {:?}", e);
                (StatusCode::INTERNAL_SERVER_ERROR, "internal server error")
            }

            Error::InternalServerError => {
                (StatusCode::INTERNAL_SERVER_ERROR, "something went wrong")
            }
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
