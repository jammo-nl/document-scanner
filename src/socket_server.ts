import type { Server } from "socket.io";

function register(io: Server) {
    io.on('connection', (socket) => {
        const room_id = socket.id + "_rtcconn";
        socket.join(room_id);
        socket.emit('room_id', room_id);

        // try to establish a connection
        socket.on('join', (room_id, response) => {
            const room = io.sockets.adapter.rooms.get(room_id);
            if (room && room.size == 1) {
                socket.join(room_id)
                socket.to(room_id).emit("completed")
                response({ result: true })
            } else if (room) {
                response({ result: false, reason: "ToManyClients" })
            } else {
                response({ result: false, reason: "NoServer" })
            }
        });
        // signalling messages
        socket.on("config", ({ message, to }) => {
            socket.to(to).emit("config", message)
        })
        socket.on("ice", ({ message, to }) => {
            socket.to(to).emit("ice", message)
        })
        socket.on("offer", ({ message, to }) => {
            socket.to(to).emit("offer", message)
        })
        socket.on("answer", ({ message, to }) => {
            socket.to(to).emit("answer", message)
        })
    })
}
export { register }