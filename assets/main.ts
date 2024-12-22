import "./fontawesome/css/fontawesome.css";
import "./fontawesome/css/solid.css";
import "./styles/main.css";

import QRCode from 'qrcode';
import { ConnectionState, NetworkManager } from "./app";
import rtcConfig from "./config";
import { Document, Page } from "./document";
import Sortable from 'sortablejs';
import { CornersEdit } from "./update_corners";
import jsPDF from "jspdf";


const netman = new NetworkManager();
const doc = new Document();
let edit_page: Page | null = null;

const add_file = document.querySelector('#add-file');
const connect_phone = document.querySelector('#connect-phone');
const connect_phone_state = document.querySelector('#connect-phone-state');
const document_new = document.querySelector('#document-new');
const document_new_confirm = document.querySelector('#confirm-delete-btn');
const document_new_cancel = document.querySelector('#confirm-cancel-btn');
const document_export = document.querySelector('#document-export');
const document_container = document.querySelector("#doccontainer");
const close_edit = document.querySelector("#close-edit");
const confirm_reset = document.querySelector("#confirm_reset") as HTMLDivElement;

// avoid leaving the page if we have a document
window.addEventListener('beforeunload', function (event) {
    if (doc.renderedPages().length > 0) {
        event.preventDefault();
        return (event.returnValue = "");
    }
});

document_export!.addEventListener('click', () => {
    if (doc.renderedPages().length == 0) return;

    var pdfDoc = new jsPDF("p", "mm", "a4");

    var width = pdfDoc.internal.pageSize.getWidth();
    var height = pdfDoc.internal.pageSize.getHeight();

    let pages = doc.renderedPages();
    let first_page = pages.shift();
    pdfDoc.addImage(first_page!.src, 'JPEG', 0, 0, width, height);

    pages.forEach((page) => {
        pdfDoc.addPage();
        pdfDoc.addImage(page.src, 'JPEG', 0, 0, width, height);
    });

    pdfDoc.save('scanresult.pdf');
});
add_file!.addEventListener('change', (ev) => {
    var files = (<HTMLInputElement>ev.target)!.files;

    if (files == undefined)
        return;

    for (var i = 0; i < files.length; i++) {
        let file = files[i];
        // detach the current file handling so we can handle all files
        setTimeout((file) => {
            var reader = new FileReader();
            var img = document.createElement("img");

            img.onload = () => {
                doc.addImagePage(img);
                updateView();
            }
            reader.onload = function (event) {
                img.src = event.target!.result as string;
            };

            reader.readAsDataURL(file);
        }, 1, file);
    }
});
document_new!.addEventListener('click', () => {
    confirm_reset!.style.display = "block";
});
document_new_confirm!.addEventListener('click', () => {
    confirm_reset!.style.display = "none";
    doc.reset();
    updateView();
});
document_new_cancel!.addEventListener('click', () => {
    confirm_reset!.style.display = "none";
});

function handleEditAction(button: HTMLElement) {
    let d = document_container?.children!;
    let items = Array.prototype.slice.call(d);
    let index = items.indexOf(button.parentElement?.parentElement);

    // get the page to edit
    edit_page = doc.page(index);

    // start the editor
    const elements = document.querySelectorAll<HTMLElement>('.editor-state');
    elements.forEach((element) => { element!.style.display = "block"; });
    new CornersEdit("#editor-canvas", edit_page.orig, edit_page.points);

    // edit page details
    const edit_width = document.querySelector<HTMLInputElement>('#editor-page-width');
    const edit_height = document.querySelector<HTMLInputElement>('#editor-page-height');
    const edit_color = document.querySelector<HTMLSelectElement>('#editor-page-color');
    edit_width!.value = ''+edit_page.width;
    edit_height!.value = ''+edit_page.height;

    if ( edit_page.color ) {
        edit_color!.value = "color";
    } else {
        edit_color!.value = "gray";
    }
}
close_edit!.addEventListener('click', () => {
    const elements = document.querySelectorAll<HTMLElement>('.editor-state');
    elements.forEach((element) => { element!.style.display = "none"; });
    
    // save page details
    const edit_width = document.querySelector<HTMLInputElement>('#editor-page-width');
    const edit_height = document.querySelector<HTMLInputElement>('#editor-page-height');
    const edit_color = document.querySelector<HTMLSelectElement>('#editor-page-color');
    edit_page!.width = parseInt(edit_width!.value,10);
    edit_page!.height = parseInt(edit_height!.value,10);

    if ( edit_color!.value == "color" ) {
        edit_page!.color = true;
    } else {
        edit_page!.color = false;
    }
    
    doc.updatePageResult(edit_page!);
    updateView();
});
function handleDeleteAction(button: HTMLElement) {
    let d = document_container?.children!;
    let items = Array.prototype.slice.call(d);
    let index = items.indexOf(button.parentElement?.parentElement);

    var result = confirm("Are you sure you want to remove this item?");
    if (result) {
        doc.remove(index);
        updateView();
    }
}

document.body.addEventListener('click', function (evt) {
    let curr = (<HTMLElement>evt?.target);
    let parent = (<HTMLElement>evt?.target).parentNode! as HTMLElement;
    if (curr.classList.contains('action-edit')) {
        handleEditAction(curr);
    }
    else if (curr.classList.contains('action-delete')) {
        handleDeleteAction(curr);
    }
    else if (parent.classList.contains('action-edit')) {
        handleEditAction(parent);
    }
    else if (parent.classList.contains('action-delete')) {
        handleDeleteAction(parent);
    }
}, false);


function resetDocumentContainer() {
    document_container!.innerHTML = "";
}
function renderDocument(image: HTMLImageElement) {
    let holder = document.createElement("div");
    holder.appendChild(image);
    holder.classList.add("overflow-hidden", "shadow-lg", "flex-none", "hover:drop-shadow-xl", "w-64", "m-5", "relative");

    let action_bar = document.createElement("div");
    action_bar.classList.add("absolute", "bottom-0", "right-0", "text-green");

    let btn_edit = document.createElement("button");
    btn_edit.classList.add("action-edit", "m-2", "bg-blue-500", "hover:bg-blue-700", "text-white", "font-bold", "rounded-full", "h-10", "w-10", "flex", "items-center", "justify-center", "text-xl")
    let btn_edit_icon = document.createElement("i");
    btn_edit_icon.classList.add("fa", "fa-edit");
    btn_edit.appendChild(btn_edit_icon);

    let btn_delete = document.createElement("button");
    btn_delete.classList.add("action-delete", "m-2", "bg-red-500", "hover:bg-red-700", "text-white", "font-bold", "rounded-full", "h-10", "w-10", "flex", "items-center", "justify-center", "text-xl")
    let btn_delete_icon = document.createElement("i");
    btn_delete_icon.classList.add("fa", "fa-remove");
    btn_delete.appendChild(btn_delete_icon);

    action_bar.appendChild(btn_edit);
    action_bar.appendChild(btn_delete);
    holder.appendChild(action_bar);
    document_container!.appendChild(holder);
}
Sortable.create(document_container as HTMLElement, {
    onEnd: (ev) => {
        doc.movePage(ev.oldIndex!, ev.newIndex!);
    }
});



netman.onConnectionStateChanged(() => {
    connect_phone_state?.classList.remove("text-green-500");
    connect_phone_state?.classList.remove("text-orange-500");

    const elements = document.querySelectorAll<HTMLElement>('.qr-state');
    if (netman.state == ConnectionState.Wait4Connection)
        elements.forEach((element) => { element!.style.display = "block"; });
    else
        elements.forEach((element) => { element!.style.display = "none"; });

    if (netman.state == ConnectionState.Connected)
        connect_phone_state?.classList.add("text-green-500");
    else if (netman.state == ConnectionState.Connecting)
        connect_phone_state?.classList.add("text-orange-500");
})
netman.onDataReceived((data: any) => {
    const blob = new Blob([data.buffer], { type: 'image/png' });
    // detach the current file handling so we can handle all files
    setTimeout((blob) => {
        const img = document.createElement('img');
        img.src = URL.createObjectURL(blob);

        img.onload = () => {
            doc.addImagePage(img);
            updateView();
        }
    }, 1, blob);
})

function updateView() {
    resetDocumentContainer();
    doc.renderedPages().forEach((image) => {
        renderDocument(image);
    });
}

connect_phone!.addEventListener('click', async () => {
    let room = await netman.createRoom(rtcConfig);
    const url = (document.location.href + "/scanner/" + room).replace("//scanner", "/scanner");

    // set the qrcode / link
    QRCode.toCanvas(document.getElementById('qrcode'), url, { width: 300 }, function () {
    });
    const qr = document.querySelector<HTMLLinkElement>('#qr');
    qr!.href = url;

    netman.connect();
});
