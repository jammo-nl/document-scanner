import { sveltekit } from '@sveltejs/kit/vite';
import { type ViteDevServer, defineConfig } from 'vite';
import { register } from './src/socket_server'

import { Server } from 'socket.io'

const webSocketServer = {
	name: 'webSocketServer',
	configureServer(server: ViteDevServer) {
		if (!server.httpServer) return

		// register our websocket server functions
		register(new Server(server.httpServer))
	}
}

export default defineConfig({
	plugins: [sveltekit(), webSocketServer]
});
