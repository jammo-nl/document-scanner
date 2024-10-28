package server

import (
	"log"
	"net/http"
	"time"

	"github.com/gorilla/websocket"
)

var AllRooms RoomMap

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

	//go broadcaster()

	for {
		time.Sleep(100)
	}
	// for {
	// 	var msg broadcastMsg

	// 	err := ws.ReadJSON(&msg.Message)
	// 	if err != nil {
	// 		log.Fatal("Read Error:", err)
	// 	}

	// 	msg.Client = ws
	// 	msg.RoomID = roomID[0]

	// 	log.Println(msg.Message)

	// 	broadcast <- msg

	// }
}
