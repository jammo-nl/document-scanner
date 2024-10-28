package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"

	"document-scanner/server"
)

var port int
var rooms int
var path string

func main() {
	// commandline args
	flag.IntVar(&port, "port", 8080, "Listen on port")
	flag.IntVar(&rooms, "rooms", 1000, "Maximum number of rooms")
	flag.StringVar(&path, "path", "./webui/dist", "Path to the static files")
	flag.Parse()

	// crate the rooms
	server.AllRooms.Init(int32(rooms))

	fs := http.FileServer(http.Dir(path))
	http.Handle("/", fs)

	http.HandleFunc("/signalling", server.SignallingHandler)

	log.Printf("Listening on 0.0.0.0:%d...", port)
	err := http.ListenAndServe(fmt.Sprintf("0.0.0.0:%d", port), nil)
	if err != nil {
		log.Fatal(err)
	}
}
