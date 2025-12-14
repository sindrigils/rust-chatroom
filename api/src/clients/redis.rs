use crate::errors::Error;
use redis::{AsyncCommands, Client, aio::ConnectionManager};

pub struct RedisClient {
    client: Client,
    connection: ConnectionManager,
}

impl RedisClient {
    pub async fn new(url: String) -> Result<Self, Error> {
        let client = Client::open(url)?;
        let connection = ConnectionManager::new(client.clone()).await?;
        Ok(RedisClient { client, connection })
    }

    pub async fn publish(&self, key: &str, payload: String) -> Result<(), Error> {
        let mut connection = self.connection.clone();
        Ok(connection.publish(key, payload).await?)
    }

    pub async fn list_push() {}

    pub async fn list_fetch() {}
}
