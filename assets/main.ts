import { approxPolyDP } from "@techstark/opencv-js";
import { NetworkManager } from "./app";
import rtcConfig from "./config";

let netman = new NetworkManager();

let connect_button = document.getElementById("connect");
let state = document.getElementById("state");
const open_link: HTMLLinkElement | null = document.querySelector("#link");

netman.onConnectionStateChanged(() => {
    state!.innerText = state?.innerText + "\n" + netman.state + " : " + JSON.stringify(netman.errorMessages);
})


connect_button!.addEventListener('click', async () => {
    let room = await netman.createRoom(rtcConfig);
    open_link!.href = "/scanner/" + room
    netman.connect();
});
