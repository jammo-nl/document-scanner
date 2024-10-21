'use strict';
import './index.css';
import QRCode from 'qrcode';

const document_new = document.querySelector('#document-new');
const document_export = document.querySelector('#document-export');



document_new!.addEventListener('click', () => { alert("NEW") });
document_export!.addEventListener('click', () => { alert("SAVE") });

QRCode.toCanvas(document.getElementById('qrcode'), 'https://www.ljasdf.asld/lasdjf', { width: 300 }, function (error) {
  if (error) console.error(error)
  console.log('success!');
})