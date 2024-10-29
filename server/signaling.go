package server

import (
	"fmt"
	"log"
	"net/http"

	"github.com/gorilla/websocket"
)

var AllRooms RoomMap

func handleMessages(broadcast chan Message, roomID string, isHost bool) {
	for {
		msg := <-broadcast

		if p, ok := AllRooms.Map[roomID]; ok {
			var err error
			if isHost {
				err = p.Client.WriteJSON(msg)
			} else {
				err = p.Host.WriteJSON(msg)
			}

			if err != nil {
				fmt.Println(err)
				AllRooms.DeleteRoom(roomID)
			}
		} else {
			break
		}
	}
	fmt.Println("DONE")
}

type Message struct {
	MsgType string `json:"message_type"`
	Payload string `json:"data"`
}

var upgrader = websocket.Upgrader{
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

func SignallingHandler(w http.ResponseWriter, r *http.Request) {
	join_roomID, ok := r.URL.Query()["rid"]
	var roomID string
	host := false
	if !ok {
		log.Println("RoomID missing in URL create host")
		roomID = AllRooms.CreateRoom()
		host = true
	} else {
		log.Println("Joining room")
		roomID = join_roomID[0]
	}

	ws, err := upgrader.Upgrade(w, r, nil)

	if err != nil {
		log.Fatal("Web Socket Upgrade Error", err)
	}
	defer ws.Close()

	AllRooms.InsertIntoRoom(roomID, host, ws)

	// notify the client that we joined the room
	msg := Message{
		MsgType: "joined_room",
		Payload: roomID,
	}

	err = ws.WriteJSON(msg)

	// if we are a client, send a notification to the host
	if !host {
		msg = Message{
			MsgType: "client_added",
		}

		p := AllRooms.Map[roomID]
		err = p.Host.WriteJSON(msg)

		if err != nil {
			log.Fatal("Web Socket join room Error", err)
		}
	}

	if err != nil {
		log.Fatal("Web Socket join room Error", err)
	}

	// listen for incomming messages
	var broadcast = make(chan Message)
	go handleMessages(broadcast, roomID, host)
	defer close(broadcast)

	for {
		var msg Message
		err := ws.ReadJSON(&msg)
		if err != nil {
			// delete the room
			fmt.Println(err)
			AllRooms.DeleteRoom(roomID)
			return
		}

		broadcast <- msg
	}
}
