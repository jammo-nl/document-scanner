<script lang="ts">
  import Connector from "$lib/connector";
  import { onMount } from "svelte";

  const config = {
    iceServers: [
      {
        urls: "stun:stun.l.google.com:19302",
      },
    ],
  };

  let room_id = "";
  let server = Connector.server(config, (my_room_id) => {
    room_id = my_room_id;
  });

  server.onDataReceivingChanged((status) => {
    console.log("Server receiving data", status);
  });
  server.onStateChanged((state) => {
    console.log("SRVChanged state to ", state);
    if (state == 2) {
    }
  });
  server.onDataReceived((data) => {
    const blob = new Blob([data.buffer]);
    const img = document.createElement("img");
    img.src = URL.createObjectURL(blob);
    document.body.appendChild(img);
  });
</script>

<h1>Page: Le webbie</h1>
<a href="./scanner/{room_id}">Client {room_id}</a><br />
