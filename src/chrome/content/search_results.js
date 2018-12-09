/*Copyright Alexander Khromov, aka alehro. All rights reserved. Contact: al(spam protection brackets)ehro00<spam protection brackets>gmail.com*/

/*global Components: false, Components: false, messagenotesplus_Single: false,  
 document: false, window: false
 */
Components.utils.import("resource://msgmodules/s3.js");

var messagenotesplusSearchResults = (function() {

	'use strict';
	var mnpSingle = messagenotesplus_Single;
	return {

		obSvc : Components.classes["@mozilla.org/observer-service;1"]
				.getService(Components.interfaces.nsIObserverService),
		
		init : function() {
			try {
				var this_ = this;
				var searchResults = mnpSingle.Notes.getSearchResults();
				var i;
				var gridRows = document.getElementById('grid_rows'); 
				for(i in searchResults){
					var hdr = searchResults[i].hdr;
					var row1=document.createElement('row');					 
					gridRows.appendChild(row1);
					row1.setAttribute('style',' border-bottom: #000000 solid 1px;');
					
					var label1 = document.createElement('label');
					row1.appendChild(label1);					
					label1.value=this_.ellipse(hdr.mime2DecodedSubject);
					label1.setAttribute('class','text-link');
					label1.setAttribute('messageId',hdr.messageId);
					label1.setAttribute('messageUri',searchResults[i].uri);
					
					label1.addEventListener('click',messagenotesplusSearchResults.onClick);
					//label1.setAttribute('onclick',"messagenotesplusSearchResults.onClick(getAttribute('messageId'))");				
					var label2 = document.createElement('label');
					row1.appendChild(label2);
					var re = new RegExp("\"([^\"]*)\"", "mg"); 
					var ares= re.exec(hdr.author); 
					if(ares && ares[1]){
						label2.value=this_.ellipse(ares[1]);
					}else{
						label2.value = this_.ellipse(hdr.mime2DecodedAuthor);
					}
					
					var label3 = document.createElement('label');
					row1.appendChild(label3);
					var dt = new Date(hdr.date/1000);//microseconds to milliseconds
					label3.value = dt.toLocaleDateString() + " " + dt.toLocaleTimeString();					
				}
			} catch (e) {
				Components.utils.reportError(e);
			}

		},
		onClick: function(){
			try{
				var messageUri = this.getAttribute('messageUri');
			Components.classes['@mozilla.org/observer-service;1']
				.getService(Components.interfaces.nsIObserverService)
				.notifyObservers(null,'messagenotesplus_note_selected',messageUri);
			}catch(e){
				mnpSingle.logError("Unexpected error: "+e);
			}
		},
		ellipse : function(str){
			if(str.length > 57){
				return str.substr(0, 57)+"...";
			}else{
				return str;
			}
		}

	};
}());