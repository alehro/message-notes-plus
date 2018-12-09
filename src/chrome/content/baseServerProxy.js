/*Copyright Alexander Khromov, aka alehro. All rights reserved. Contact: al(spam protection brackets)ehro00<spam protection brackets>gmail.com*/

/*global Components: false, Components: false, messagenotesplus_Single: false,  
 document: false, window: false
 */

Components.utils.import("resource://msgmodules/s3.js");

messagenotesplus_Single.global_decls.BaseServerProxy = function() {
	'use strict';
	var mnpSingle = messagenotesplus_Single;
	this.requestDataServer = function() {
	};// override
	
	
	//do not touch status. this objects is just for updating, but not creationg. 
	this.editNoteBase =  function(messageId, newNote) {
		var this_ = this;
		//var newNote = {};
		newNote.messageId = messageId;
		//newNote.date = new Date().getTime(); do not set it automatically, it can be changed only from server, otherwise we will have wrong unread flag.
		if(!newNote.note){
			var subnote = JSON.stringify(mnpSingle.Notes.createSubnote("",new Date().getTime(),null));
			newNote.note = subnote;
		}
		// newNote.name = this_.myName;
		return newNote;
	};
	//full object, for creation
	this.createNoteObj = function(messageId, msgNote, status) {
		var this_ = this;
		var dat = new Date().getTime();
		if(!status){
			status=0;
		}
		var subnote = JSON.stringify(mnpSingle.Notes.createSubnote(msgNote,dat,status));
		var noteDeets = {
			messageId : messageId,
			status : -4,//note status until server sets it - 'doesn't exist'
			note : subnote,
			lstatus : status,
			// name : this_.myName,
			//date : dat			
		};
		return noteDeets;
	};
	//overridable
	this.onDeleteNote = function(messageId){		
	};
	//overridable
	this.startUserActionLife = function(){		
	};	
};