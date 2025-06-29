use axum::{Json, extract::State};
use sea_orm::{EntityTrait, QuerySelect, sea_query::Expr};
use tower_cookies::Cookies;

use crate::{
    AppState,
    entity::{chat, online_user},
    errors::Error,
    models::chat::Chat,
};

pub async fn active_chats(
    _: Cookies,
    State(state): State<AppState>,
) -> Result<Json<Vec<Chat>>, Error> {
    let rows = chat::Entity::find()
        .left_join(online_user::Entity)
        .select_only()
        .column(chat::Column::Id)
        .column(chat::Column::Name)
        .column_as(
            Expr::col((online_user::Entity, online_user::Column::UserId)).count(),
            "active_users",
        )
        .group_by(chat::Column::Id)
        .into_model::<Chat>()
        .all(&state.db)
        .await?;

    Ok(Json(rows))
}
