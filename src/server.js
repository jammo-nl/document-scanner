import express from 'express'
import { createServer } from 'http'
import { Server } from 'socket.io'
import { register } from './socket_server'

import { handler } from '../build/handler.js'

const port = 3000
const app = express()
const server = createServer(app)

// register our websocket server functions 
register(new Server(server))

app.use(handler)

server.listen(port)
