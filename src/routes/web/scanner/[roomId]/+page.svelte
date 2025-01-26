<script lang="ts">
  import Connector from "$lib/connector";
  import { onMount } from "svelte";
  import { error } from "@sveltejs/kit";
  import { page } from "$app/state";

  let room_id = page.params.roomId;

  let client = Connector.client(room_id);

  client.onDataSendingChanged((status) => {
    console.log("client sending data", status);
  });

  onMount(() => {
    document.getElementById("file")!.onchange = sendIt;

    function sendIt(ev: Event) {
      const target = ev.target as HTMLInputElement;
      const files = target.files as FileList;

      for (let file of files) {
        file.arrayBuffer().then((buff) => {
          let data = new Uint8Array(buff);
          client.sendData(data);
        });
      }
    }
  });
</script>

<h1>Page: Le scannie</h1>
<input multiple type="file" id="file" />
