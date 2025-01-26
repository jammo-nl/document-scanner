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

  let client;
  let server = Connector.server(config, (room_id) => {
    console.log("Room created", room_id);
    client = Connector.client(room_id);
    client.onStateChanged((state) => {
      console.log("CLIChanged state to ", state);
    });
    client.onDataReceivingChanged((status) => {
      console.log("Client receiving data", status);
    });
    client.onDataSendingChanged((status) => {
      console.log("Client sending data", status);
    });

    client.onDataReceived((data) => {
      const blob = new Blob([data.buffer]);
      const img = document.createElement("img");
      img.src = URL.createObjectURL(blob);
      document.body.appendChild(img);
    });

    server.onStateChanged((state) => {
      console.log("SRVChanged state to ", state);
      if (state == 2) {
      }
    });
    server.onDataReceivingChanged((status) => {
      console.log("Server receiving data", status);
    });
    server.onDataSendingChanged((status) => {
      console.log("Server sending data", status);
    });
  });

  onMount(() => {
    document.getElementById("file")!.onchange = sendIt;

    function sendIt(ev: Event) {
      const target = ev.target as HTMLInputElement;
      const files = target.files as FileList;

      for (let file of files) {
        file.arrayBuffer().then((buff) => {
          let data = new Uint8Array(buff);
          server.sendData(data);
        });
      }
    }
  });
</script>

<h1>Page: Le webbie</h1>
<input multiple type="file" id="file" />
