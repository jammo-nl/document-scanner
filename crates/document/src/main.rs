use std::{fs::File, io::Read};

use document::Document;
fn main() {
    let args: Vec<String> = std::env::args().collect();
    let file = &args[1];

    let mut f = File::open(file).expect("no file found");
    let mut buffer = vec![];
    f.read_to_end(&mut buffer).expect("buffer overflow");

    let doc = Document::new(&buffer);
}
