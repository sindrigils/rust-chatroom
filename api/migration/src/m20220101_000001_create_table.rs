use sea_orm_migration::prelude::*;
use sea_orm_migration::prelude::{ColumnDef, Expr, ForeignKey, ForeignKeyAction};
use sea_orm_migration::schema::{pk_auto, string, text};

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(User::Table)
                    .if_not_exists()
                    .col(pk_auto(User::Id))
                    .col(string(User::Username).not_null())
                    .col(string(User::Password).not_null())
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Chat::Table)
                    .if_not_exists()
                    .col(pk_auto(Chat::Id))
                    .col(string(Chat::Name).not_null())
                    .col(ColumnDef::new(Chat::OwnerId).integer().not_null())
                    .col(
                        ColumnDef::new(Chat::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-chat-owner_id-user-id")
                            .from(Chat::Table, Chat::OwnerId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(Message::Table)
                    .if_not_exists()
                    .col(pk_auto(Message::Id))
                    .col(text(Message::Content))
                    .col(ColumnDef::new(Message::SenderId).integer().not_null())
                    .col(ColumnDef::new(Message::ChatId).integer().not_null())
                    .col(
                        ColumnDef::new(Message::CreatedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-user-sender_id-user-id")
                            .from(Message::Table, Message::SenderId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-chat-chat-id-chat-id")
                            .from(Message::Table, Message::ChatId)
                            .to(Chat::Table, Chat::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_table(
                Table::create()
                    .table(OnlineUser::Table)
                    .if_not_exists()
                    .col(pk_auto(OnlineUser::Id))
                    .col(ColumnDef::new(OnlineUser::UserId).integer().not_null())
                    .col(ColumnDef::new(OnlineUser::ChatId).integer().not_null())
                    .col(
                        ColumnDef::new(OnlineUser::JoinedAt)
                            .timestamp()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-user-user_id-user-id")
                            .from(OnlineUser::Table, OnlineUser::UserId)
                            .to(User::Table, User::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .foreign_key(
                        ForeignKey::create()
                            .name("fk-chat-chat_id-chat-id")
                            .from(OnlineUser::Table, OnlineUser::ChatId)
                            .to(Chat::Table, Chat::Id)
                            .on_delete(ForeignKeyAction::Cascade)
                            .on_update(ForeignKeyAction::Cascade),
                    )
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(OnlineUser::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Message::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(Chat::Table).to_owned())
            .await?;

        manager
            .drop_table(Table::drop().table(User::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(DeriveIden)]
enum User {
    Table,
    Id,
    Username,
    Password,
}

#[derive(DeriveIden)]
enum Chat {
    Table,
    Id,
    Name,
    OwnerId,
    CreatedAt,
}

#[derive(DeriveIden)]
enum Message {
    Table,
    Id,
    Content,
    SenderId,
    ChatId,
    CreatedAt,
}

#[derive(DeriveIden)]
enum OnlineUser {
    Table,
    Id,
    UserId,
    ChatId,
    JoinedAt,
}
