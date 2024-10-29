package server

import (
	"fmt"
	"log"
	"math/rand"
	"sync"

	"github.com/gorilla/websocket"
)

type Participants struct {
	Host   *websocket.Conn
	Client *websocket.Conn
}

type RoomMap struct {
	Mutex    sync.RWMutex
	max_size int32
	Map      map[string]Participants
}

func (r *RoomMap) Init(size int32) {
	r.max_size = size
	r.Map = make(map[string]Participants)
}

func (r *RoomMap) Get(roomID string) Participants {
	r.Mutex.RLock()
	defer r.Mutex.RUnlock()

	return r.Map[roomID]
}

func (r *RoomMap) CreateRoom() string {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	var letters = []rune("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890")
	b := make([]rune, 15)

	for i := range b {
		b[i] = letters[rand.Intn(len(letters))]
	}

	roomID := string(b)

	r.Map[roomID] = Participants{}

	return roomID
}

func (r *RoomMap) InsertIntoRoom(roomID string, host bool, conn *websocket.Conn) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	if entry, ok := r.Map[roomID]; ok {
		if host {
			log.Println("Inserting host into Room with RoomID: ", roomID)
			entry.Host = conn
		} else {
			log.Println("Inserting client into Room with RoomID: ", roomID)
			entry.Client = conn
		}

		r.Map[roomID] = entry
	}

}

func (r *RoomMap) DeleteRoom(roomID string) {
	r.Mutex.Lock()
	defer r.Mutex.Unlock()

	d := r.Map[roomID]

	if d.Client != nil {
		d.Client.Close()
	}
	if d.Host != nil {
		d.Host.Close()
	}

	fmt.Println("Deleted room: ", roomID)
	delete(r.Map, roomID)
}
