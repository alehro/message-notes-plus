/*Copyright Alexander Khromov, aka alehro. All rights reserved. Contact: al(spam protection brackets)ehro00<spam protection brackets>gmail.com*/

/*global Components: false, Components: false, printWindow: true, messagenotesplus_Single: false,  
 document: false, EnsureSubjectValue:true, window: false, gHighlightedMessageText: true, gFolderDisplay:false,
 MailUtils: false, gFolderTreeView: false, KeyboardEvent: false, Gloda: false, messenger: false*/

Components.utils.import("resource://msgmodules/s3.js");

messagenotesplus_Single.global_decls.Print = function() {

    'use strict';
    var mnpSingle = messagenotesplus_Single;

    this.initialize = function() {
        var this_ = this;
        mnpSingle.logDebug("print window called... ");
        var ec = document.getElementById("emailContent");
        var olTextBox = document.getElementById('MessageNotesPlus_msgText');
        var hdoc = olTextBox.contentDocument;
        var d1 = olTextBox.contentDocument.getElementById('mnp-html-dynamic-content');
        
        var note = window['arguments'][0];
        var uri = window['arguments'][1];
        ec.setAttribute('src', uri);
        
        window.setTimeout(function(){
          //hdoc.mnpInitNoteHtml(hdoc.jQuery, document, null, messagenotesplus_Single.Notes.notes["4F28F729.5010108@gmail.com"], d1);
            if(note){
                hdoc.mnpInitNoteHtml(hdoc.jQuery, document, null, note, d1);
                ec.contentDocument.body.appendChild(d1);
            }
            
            ec.contentDocument.body.style.backgroundColor = 'FFFFFF';

            var btn = document.getElementById("printButton");
            btn.focus();
            
            ec.contentWindow.scrollTo(0,ec.contentWindow.scrollMaxY);

            //this_.print();
        }, 1000);
        
    };
// stupid thing doen't works, so, using timeout   this.emailPostLoad = function(){
//        var ec = document.getElementById("emailContent");
//        var olTextBox = document.getElementById('MessageNotesPlus_msgText');
//        var hdoc = olTextBox.contentDocument;
//        var d1 = olTextBox.contentDocument.getElementById('mnp-html-dynamic-content');
//        
//        var messageId = window['arguments'][0];
//        
//        hdoc.mnpInitNoteHtml(hdoc.jQuery, document, null, messagenotesplus_Single.Notes.notes[messageId], d1);
//        ec.contentDocument.body.appendChild(d1);
//        ec.contentDocument.body.style.backgroundColor = 'FFFFFF';
//
//        var btn = document.getElementById("printButton");
//        btn.focus();
//
//        this.print();
//    };
    this.print = function() {
        var wnd = window;
        var ec = document.getElementById("emailContent");
//    don't close myself. it's buggy on first call.    ec.contentWindow.addEventListener('afterprint', function() {
//            mnpSingle.logDebug("print finished... ");
//            window.setTimeout(function() {
//                window.close();
//            }, 0);//without timeout it doen't closes himself. message loop glitch?
//        });
        ec.contentWindow.print();
        
    };
   

};
printWindow = new messagenotesplus_Single.global_decls.Print();

window.addEventListener("load", function(e) {
    'use strict';
    printWindow.initialize();
}, false);
