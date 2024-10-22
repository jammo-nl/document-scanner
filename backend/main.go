package main

import (
	"flag"
	"fmt"
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

	log.Print(fmt.Sprintf("Listening on localhost:%d...", port))
	err := http.ListenAndServe(fmt.Sprintf("localhost:%d", port), nil)
	if err != nil {
		log.Fatal(err)
	}
}
