use axum::{
    Json,
    extract::{Path, State},
    http::StatusCode,
};

use crate::{
    AppState,
    entity::{chat, online_user},
    errors::Error,
    models::chat::{Chat, CreateChatRequest, GetChatResponse, PreviousMessage},
};

use migration::SimpleExpr;
use sea_orm::{
    ActiveModelTrait, ActiveValue::Set, EntityTrait, QueryFilter, QuerySelect, sea_query::Expr,
};

pub async fn active_chats(State(state): State<AppState>) -> Result<Json<Vec<Chat>>, Error> {
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

pub async fn create_chat(
    State(state): State<AppState>,
    Json(payload): Json<CreateChatRequest>,
) -> Result<(StatusCode, Json<chat::Model>), Error> {
    let new_chat = chat::ActiveModel {
        name: Set(payload.name),
        owner_id: Set(payload.owner_id),
        ..Default::default()
    };

    let inserted: chat::Model = new_chat.insert(&state.db).await?;

    let payload = serde_json::json!({
        "type": "new_chat",
        "content": {"id": inserted.id, "name": inserted.name, "active_users": 0},
    })
    .to_string();

    state.redis_client.publish("chat_list", payload).await?;

    Ok((StatusCode::CREATED, Json(inserted)))
}

pub async fn get_all_chats_by_name(
    State(state): State<AppState>,
    Path(name): Path<String>,
) -> Result<(StatusCode, Json<Vec<chat::Model>>), Error> {
    let chats = chat::Entity::find()
        .filter(SimpleExpr::Custom(format!("name ILIKE '{name}%'")))
        .all(&state.db)
        .await?;

    Ok((StatusCode::OK, Json(chats)))
}

pub async fn get_chat(
    State(state): State<AppState>,
    Path(id): Path<i32>,
) -> Result<(StatusCode, Json<GetChatResponse>), Error> {
    let chat_row = chat::Entity::find_by_id(id)
        .one(&state.db)
        .await?
        .ok_or(Error::NotFound)?;

    let raw_messages: Vec<String> = state
        .redis_client
        .lrange(&format!("chat_messages:{id}"), 0, 9)
        .await?;
    let mut messages: Vec<PreviousMessage> = raw_messages
        .into_iter()
        .filter_map(|s| serde_json::from_str::<PreviousMessage>(&s).ok())
        .collect();
    messages.reverse();

    let resp = GetChatResponse {
        id: chat_row.id,
        name: chat_row.name,
        owner_id: chat_row.owner_id,
        messages,
    };

    Ok((StatusCode::OK, Json(resp)))
}
