import "./fontawesome/css/fontawesome.css";
import "./fontawesome/css/solid.css";
import "./styles/scanner.css";
import { NetworkManager, ConnectionState } from "./app";

enum PageState {
  Working,
  Loading,
  Error,
}

// all our variables
const netman = new NetworkManager();
const room: string = window.location.pathname.split("/").slice(-1)[0];
const video = document.querySelector("video");
let canvas: HTMLCanvasElement;
let creating_image = false;

// use the network manager state to update our status overlay
netman.onConnectionStateChanged(() => {
  switch (netman.state) {
    case ConnectionState.Idle: {
      setCurrentState(PageState.Loading, "Waiting for connection setup");
      break;
    }
    case ConnectionState.Connecting: {
      setCurrentState(PageState.Loading, "Connecting...");
      break;
    }
    case ConnectionState.Connected: {
      setCurrentState(PageState.Working);
      startCamera();
      break;
    }
    case ConnectionState.Error: {
      setCurrentState(PageState.Error, netman.errorMessages[0]);
      break;
    }
    case ConnectionState.Disconnected: {
      setCurrentState(PageState.Error, "Connection lost");
      break;
    }
  }
});

async function sendFiles(ev: Event) {
  var files = (<HTMLInputElement>ev.target)!.files;

  if (files == undefined) return;

  for (var i = 0; i < files.length; i++) {
    let file = files[i];
    // detach the current file handling so we can handle all files
    setTimeout(
      async (file) => {
        const data_array = new Uint8Array(await file!.arrayBuffer());
        // transfer the image
        netman.sendData(data_array);
      },
      1,
      file,
    );
  }
}

function takeSnapshot() {
  if (creating_image) return;
  creating_image = true;
  let img = document.querySelector("img") || document.createElement("img");
  img.className = "preview";
  const width = video!.offsetWidth,
    height = video!.offsetHeight;

  canvas = canvas || document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  let context = canvas.getContext("2d");
  context!.drawImage(video!, 0, 0, width, height);

  canvas.toBlob(async (data) => {
    const data_array = new Uint8Array(await data!.arrayBuffer());
    img.src = URL.createObjectURL(data!);
    document.body.appendChild(img);

    // transfer the image
    netman.sendData(data_array);
  });
  creating_image = false;
}

// use MediaDevices API
// docs: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
function startCamera() {
  if (navigator.mediaDevices) {
    // access the web cam
    navigator.mediaDevices
      .getUserMedia({ video: { width: 3508, facingMode: "environment" } })
      // permission granted:
      .then(function (stream) {
        video!.srcObject = stream;

        let photo_button = document.querySelector<HTMLElement>("#photo-button");
        photo_button!.addEventListener("click", takeSnapshot);

        const add_file = document.querySelector("#upload-button");
        add_file!.addEventListener("change", sendFiles);
      })
      // permission denied:
      .catch(function (error) {
        setCurrentState(
          PageState.Error,
          "Could not access the camera. Error: " + error.name,
        );
      });
  }
}

function setCurrentState(state: PageState, message?: string) {
  let elements = document.querySelectorAll<HTMLElement>(".error-state");

  if (state == PageState.Working)
    elements.forEach((element) => {
      element!.style.display = "none";
    });
  else
    elements.forEach((element) => {
      element!.style.display = "block";
    });

  let element = document.querySelector<HTMLElement>(".error-message");
  element!.innerHTML = "<center><h1>" + message + "</h1></center>";
}

// connect to the client
await netman.connectTo(room);
