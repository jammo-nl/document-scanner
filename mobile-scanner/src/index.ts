import './index.css';

(function () {
    'use strict';
    var video = document.querySelector('video');
    var canvas: HTMLCanvasElement;

    var loading_state = false;

    function takeSnapshot() {
        var img = document.querySelector('img') || document.createElement('img');
        img.className = "preview";
        var context;
        var width = video!.offsetWidth, height = video!.offsetHeight;


        canvas = canvas || document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;

        context = canvas.getContext('2d');
        context!.drawImage(video!, 0, 0, width, height);

        img.src = canvas.toDataURL('image/png');
        document.body.appendChild(img);
    }

    function setErrorState(message: string) {
        let elements = document.querySelectorAll<HTMLElement>('.error-state');
        elements.forEach((element) => { element!.style.display = "block"; });
        let element = document.querySelector<HTMLElement>('.error-message');
        element!.innerHTML = "<center><h1>" + message + "</h1></center>";
    }

    // use MediaDevices API
    // docs: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
    if (navigator.mediaDevices) {
        // access the web cam
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            // permission granted:
            .then(function (stream) {
                video!.srcObject = stream;

                let photo_button = document.querySelector<HTMLElement>('.photo-button');
                photo_button!.addEventListener('click', takeSnapshot);
            })
            // permission denied:
            .catch(function (error) {
                setErrorState('Could not access the camera. Error: ' + error.name);
            });
    }
})();