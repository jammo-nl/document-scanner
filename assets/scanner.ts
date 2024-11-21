import { NetworkManager } from "./app";

let room: string = window.location.pathname.split("/").slice(-1)[0];

let netman = new NetworkManager();

let state = document.getElementById("state");
let connect_button = document.getElementById("connect");
connect_button!.innerText = "Connect to " + room;

netman.onConnectionStateChanged(() => {
    state!.innerText = state?.innerText + "\n" + netman.state + " : " + JSON.stringify(netman.errorMessages);
})

connect_button!.addEventListener('click', async () => {
    await netman.connectTo(room);
});
