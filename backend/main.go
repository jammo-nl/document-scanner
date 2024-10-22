package main

import (
	"flag"
	"log"
	"net/http"
)

var port int
var rooms int
var path string

func main() {
	// commandline args
	flag.IntVar(&port, "port", 8080, "Listen on port")
	flag.IntVar(&rooms, "rooms", 1000, "Maximum number of rooms")
	flag.StringVar(&path, "path", "../frontend/dist", "Path to the static files")
	flag.Parse()

	fs := http.FileServer(http.Dir(path))
	http.Handle("/", fs)

	log.Print("Listening on :3000...")
	err := http.ListenAndServe(":3000", nil)
	if err != nil {
		log.Fatal(err)
	}
}
