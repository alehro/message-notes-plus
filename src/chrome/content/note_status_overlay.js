/*Copyright Alexander Khromov, aka alehro. All rights reserved. Contact: al(spam protection brackets)ehro00<spam protection brackets>gmail.com*/

/*global Components: false, Components: false, messagenotesplus_Single: false,  
 document: false, window: false, gDBView:false, messagenotesplus:false
 */
Components.utils.import("resource://msgmodules/s3.js");

messagenotesplus_Single.global_decls.columnHandler4messagenoteplusStatus = (function() {
	'use strict';
	var mnpSingle = messagenotesplus_Single;
	return {

		// interface implementation
		getCellText : function(row, col) {
			return null;
		},
		// getSortStringForRow: function(hdr) {return
		// hdr.getStringProperty("replyTo");},
		getSortStringForRow : function(hdr) {
			return "status";
		},
		isString : function() {
			return false;
		},

		getCellProperties : function(row, col, props) {
		},
		getRowProperties : function(row, props) {
		},
		getImageSrc : function(row, col) {
			var this_ = this;
			// this_.logInfo("getImageSrc: " + " row: " + row + "
			// column: "+col);
			// this_.logInfo("getImageSrc: " + " row: " + row + "
			// column: "+col);
			// this_.logInfo("status: "+status);
			//https://groups.google.com/forum/#!msg/mozilla.dev.apps.thunderbird/JlT_rAkkACE/1_8CmLtMzR4J
			var hdr = gDBView.getMsgHdrAt(row);
			var note = messagenotesplus.getNoteStatus(hdr);
			var status, pending, unread;
			if (note) {
				if (mnpSingle.isFreeDistribution && note.lstatus != undefined) {
					status = note.lstatus;
				} else {
					status = note.status;
				}
				pending = note.pending;
				unread = 0;
				if (note.date) {
					if (!note.readTime || (note.date > note.readTime)) {
						//this_.logInfo("Unread note: "+JSON.stringify(note));
						unread = 1;
					}
				}
			} else {
				status = -1;
				pending = 0;
				unread = 0;
			}

			if (status >= -4 && status <= 2) {
				if (mnpSingle.isFreeDistribution || (!pending && !unread)) {
					return mnpSingle.icons[status];
				} else if (!pending && unread) {
					return mnpSingle.icons_unread[status];
				} else if (pending && !unread) {
					return mnpSingle.icons_pending[status];
				} else {
					return mnpSingle.icons_pending_unread[status];
				}
			}

			else {
				this_.logInfo("Invalid note status: " + status + ". Shoing it as normal.");
				return "chrome://messagenotesplus/skin/note_status_green.png";
			}

		},
		getSortLongForRow : function(hdr) {
			//  sorting is hard to implement correctly because: 
			//	1) current implementation of local db layer cannot process infinite large packs of notes requests.
			//  2) it's hard to call refreshSort at the end. it is almost always overlapped by invalidateCurrentNoteStatus.
			//	Possible solution: make direct local db requests for every msgHdr.
			//	
			//			var note = messagenotesplus.getNoteSortOrder(hdr);
			//			var status, pending, unread;
			//			if(note){
			//				status = note.status;
			//				pending = note.pending;
			//				unread = 0;
			//				if(note.date){
			//					if(!note.readTime || (note.date > note.readTime)){
			//						//this_.logInfo("Unread note: "+JSON.stringify(note));
			//						unread = 1;
			//					}					
			//				}
			//			}else{
			//				status = -1;
			//				pending = 0;
			//				unread = 0;
			//			}
			//			var res = status;
			//			res+=10;//overlap negative values, because this function works correctly with positives. 
			//			if(pending){//highest priority
			//				res+=30;
			//			}
			//			if(unread){
			//				res+=10;
			//			}

			//TODO: tune performance. refactor notes to hash.
			return null;
		},
		// interface implementation end

		doOnceLoaded : function() {
			var ObserverService = Components.classes["@mozilla.org/observer-service;1"]
					.getService(Components.interfaces.nsIObserverService);
			ObserverService.addObserver(messagenotesplus_Single.global_decls.columnHandler4messagenoteplusStatus.CreateDbObserver,
					"MsgCreateDBView", false);
			// Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logInfo('CreateDbObserver
			// added');
		},

		CreateDbObserver : {
			// Components.interfaces.nsIObserver
			observe : function(aMsgFolder, aTopic, aData) {
				// Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logInfo('before
				// CreateDbObserver observe called');
				messagenotesplus_Single.global_decls.columnHandler4messagenoteplusStatus.addCustomColumnHandler();
				// Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logInfo('after
				// CreateDbObserver observe called');

			}
		},
		addCustomColumnHandler : function() {
			var this_ = this;
			this_.logInfo("addCustomColumnHandler messagenotesplus=" + messagenotesplus);
			// this_.logInfo("notes length="+mnpSingle.notes.length);
			// Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logInfo('before
			// addCustomColumnHandler');
			gDBView.addColumnHandler("MessageNotesPlus_noteStatus",
					messagenotesplus_Single.global_decls.columnHandler4messagenoteplusStatus);
			// Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logInfo('after
			// addCustomColumnHandler');

		},
		logInfo : function(msg) {
			try {
				mnpSingle.logDebug(msg);
			} catch (e) {
				Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService).logError(
						"Error while logging in note_statue_overlay.js");
			}
		}
	};
}());
window.addEventListener("load", messagenotesplus_Single.global_decls.columnHandler4messagenoteplusStatus.doOnceLoaded, false);