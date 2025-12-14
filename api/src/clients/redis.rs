use crate::errors::Error;
use redis::{AsyncCommands, Client, aio::Connection, aio::ConnectionManager};

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

    pub async fn get_async_connection(&self) -> Result<Connection, redis::RedisError> {
        self.client.get_async_connection().await
    }

    pub async fn publish(&self, key: &str, payload: String) -> Result<(), Error> {
        let mut connection = self.connection.clone();
        Ok(connection.publish(key, payload).await?)
    }

    pub async fn lpush(&self, key: &str, value: String) -> Result<i64, Error> {
        let mut connection = self.connection.clone();
        Ok(connection.lpush(key, value).await?)
    }

    pub async fn ltrim(&self, key: &str, start: isize, stop: isize) -> Result<(), Error> {
        let mut connection = self.connection.clone();
        Ok(connection.ltrim(key, start, stop).await?)
    }

    pub async fn lrange(&self, key: &str, start: isize, stop: isize) -> Result<Vec<String>, Error> {
        let mut connection = self.connection.clone();
        Ok(connection.lrange(key, start, stop).await?)
    }
}
