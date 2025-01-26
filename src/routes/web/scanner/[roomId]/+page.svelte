<script lang="ts">
  import { error } from "@sveltejs/kit";
  import { page } from "$app/state";
  import { io } from "socket.io-client";

  let message_target = page.params.roomId;
  const socket = io();

  socket.on("clientID", (message) => {
    socket.emit(
      "connectToClient",
      {
        to: message_target,
      },
      (response: boolean) => {
        console.log(response);
      }
    );
  });
  socket.on("remoteClientId", (message) => {
    console.log("Remote", message);
  });
</script>

<h1>Page: Le scannie</h1>
