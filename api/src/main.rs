use axum::http::Method;
use axum::{Router, error_handling::HandleErrorLayer, routing::get, serve};
use sea_orm::{Database, DatabaseConnection};
use std::{net::SocketAddr, time::Duration};

use tokio::net::TcpListener;
use tower_http::{
    add_extension::AddExtensionLayer,
    cors::{Any, CorsLayer},
};

mod config;
mod entity;
mod errors;
mod models;
mod routes;
mod ws;

#[derive(Clone)]
pub struct AppState {
    pub db: DatabaseConnection,
    pub settings: config::Settings,
}

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let db = Database::connect("postgres://rust_chat:rust_chat@localhost:5434/rust_chat").await?;

    // Load configuration
    let settings = config::Settings::new();

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods([Method::GET, Method::POST])
        .allow_headers(Any)
        .max_age(Duration::from_secs(60 * 60));

    // Build shared application state
    let state = AppState { db, settings };

    // Build the router
    let app = Router::new()
        .merge(routes::router())
        .route("/ws/{room}/{user}", get(ws::handle_ws))
        .layer(cors)
        .layer(AddExtensionLayer::new(state.clone()))
        .layer(HandleErrorLayer::new(errors::handle_error));

    // Bind address and create a listener
    let addr = SocketAddr::from(([0, 0, 0, 0], state.settings.http_port));
    let listener = TcpListener::bind(addr).await?;
    println!("Listening on {}", addr);

    // Serve the app using Axum's built-in `serve`
    serve(listener, app).await?;

    Ok(())
}

// use std::{
//     io::{self, BufRead, BufReader, Write},
//     net::{TcpListener, TcpStream},
//     sync::{Arc, Mutex, mpsc},
//     thread,
// };

// fn main() -> Result<(), Box<dyn std::error::Error>> {
//     println!("1. Create a server\n2. Join a server");
//     let choice = loop {
//         let mut input = String::new();
//         io::stdin().read_line(&mut input)?;
//         let trimmed = input.trim();
//         if ["1", "2"].contains(&trimmed) {
//             break trimmed.to_string();
//         }
//         println!("Invalid option, try again!");
//     };

//     match choice.as_str() {
//         "1" => create_chat()?,
//         "2" => join_chat()?,
//         _ => unreachable!(),
//     };

//     Ok(())
// }

// fn create_chat() -> Result<(), Box<dyn std::error::Error>> {
//     println!("Enter the room number: ");
//     let mut port_input = String::new();
//     io::stdin().read_line(&mut port_input)?;
//     let port: u16 = port_input.trim().parse().expect("Port is not a number");

//     let addr = format!("127.0.0.1:{}", port);
//     let listener = TcpListener::bind(addr)?;

//     let peers = Arc::new(Mutex::new(Vec::<mpsc::Sender<String>>::new()));

//     for stream in listener.incoming() {
//         let stream = stream?;
//         let peer_addr = stream.peer_addr()?;
//         let mut writer = stream.try_clone()?;

//         // Each client gets its own channel
//         let (tx, rx) = mpsc::channel::<String>();
//         peers.lock().unwrap().push(tx.clone());

//         thread::spawn(move || {
//             for message in rx {
//                 // if write failed, then we assume that the client as disconnected
//                 if writer.write_all(message.as_bytes()).is_err() {
//                     break;
//                 }
//             }
//         });

//         let peers_readers = Arc::clone(&peers);
//         thread::spawn(move || {
//             let reader = BufReader::new(stream);
//             for line in reader.lines() {
//                 match line {
//                     Ok(text) => {
//                         let full = format!("[{}] {}\n", peer_addr, text);

//                         // broadacast to all peers
//                         let locked = peers_readers.lock().unwrap();
//                         for peer_tx in locked.iter() {
//                             let _ = peer_tx.send(full.clone());
//                         }
//                     }
//                     Err(_) => break, // broken pipe or has disconnected
//                 }
//             }
//             println!("🔴 {} disconnected", peer_addr);
//         });
//     }

//     Ok(())
// }

// fn join_chat() -> Result<(), Box<dyn std::error::Error>> {
//     println!("Enter the room number: ");
//     let mut port_input = String::new();
//     io::stdin().read_line(&mut port_input)?;
//     let port: u16 = port_input.trim().parse().expect("Port is not a number");

//     let addr = format!("127.0.0.1:{}", port);
//     let mut stream = TcpStream::connect(&addr)?;
//     println!("Connected to chat at {}", addr);

//     // thread to read incoming messages and print them
//     {
//         let mut reader = BufReader::new(stream.try_clone()?);
//         thread::spawn(move || {
//             let mut line = String::new();
//             while let Ok(n) = reader.read_line(&mut line) {
//                 if n == 0 {
//                     break;
//                 }
//                 print!("{}", line);
//                 line.clear();
//             }
//             println!("Server closed connection!");
//         });
//     }

//     let stdin = io::stdin();
//     for line in stdin.lock().lines() {
//         let text = line?;
//         stream.write_all(text.as_bytes())?;
//         stream.write_all(b"\n")?;
//     }
//     Ok(())
// }
