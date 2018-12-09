/*Copyright Alexander Khromov, aka alehro. All rights reserved. Contact: al(spam protection brackets)ehro00<spam protection brackets>gmail.com*/
//!!!!!!!!!!!!!!!!!!!!!!!!!!!!
//alehro: TO UNDERSTAND HOW TO PACKAGE THE MODULE FILES DO NOT LOOK AT install.js. LOOK AT buil=moz-impl.xml!
// AND DO NOT TRUST JavaScript shell saying "NS_ERROR_FILE_NOT_FOUND" on trying to import
// But if you want shell, it will it something like: 
// Components.utils.import("file://d:/oDesk/thunderbird_ip/various/main.js")
/*global Components: false, Components: false, messagenotesplus_Single: true,  
 document: false, window: false, AddonManager:false, userActionsCollectionFromAnt: false, Log4Moz: false
 */
Components.utils.import("resource:///modules/gloda/log4moz.js");

var EXPORTED_SYMBOLS = [ "messagenotesplus_Single" ];

// note's view statuses: 0,1,2, -1 - undefined, -2 - doesn't exist or deleted,
// -3 - status request sent(internal state), -4 - partially deleted, locally visible.

function NotesObj(mnpSingle) {
	'use strict';
	this.notes = {};
	//this.serverProxy = {};
	this.localProxy = null;
	this.remoteProxy = null;
	this.alertFloodCount = 0;	
	this.searchResults = {};	
	this.getNote = function(messageId, onAfter) {
		try {
			var this_ = this;
			// display notes even if there was an error.	
			this_.getNote1(messageId, function(messageId, note){
				this_.applyNoteFromServer(messageId, note);

				if (onAfter) {
					onAfter(this_.getTrueNote(messageId));
				}
				//call getting note asynchronously, and left it for its own.
				this_.remoteProxy.pingNote(messageId,function(note){					
					mnpSingle.obSvc.notifyObservers(null, "messagenotesplus_synch",
							null);//to be honesty we need separate event here, but currently it's enough.
				});
			});			
		} catch (e) {
			mnpSingle.logError("Errror while getting note from local database." + e);
		}
	};	
	this.getNote1 = function(messageId, onAfter) {
		try {
			var this_ = this;			
			this_.localProxy.requestDataServer({
					command : 'get',
					noteObj : this_.localProxy.createNoteObj(messageId)
				}, function(note) {		
					this_.updateNoteFormat0to1();					
					onAfter(messageId, note);		
					
				}, function() {
					onAfter();					
			});	
			
		} catch (e) {
			mnpSingle.logError("Errror while getting note from local database." + e);
		}
	};
	this.updateNoteFormat0to1=function(note){		
		if(note && !note.nformat){ //do not use: && note.note!=null
			note.note = JSON.stringify(this.createSubnote(note.note, note.date, note.status));
			note.nformat = 1;
		}
	};
	this.createSubnote=function(body,date,status){
		return {body: body, date:date, status:status};
	};
	this.getNoteSynchronously = function(messageId) {
		return this.getTrueNote(messageId);
	};
	this.getTrueNote = function(messageId) {
		var this_ = this;
		var note = this_.notes[messageId];
		if (note) { 
			return note;
		} else {
			return null;
		}
	};
	
	
	this.addNote = function(messageId, msgNote, onSuccess, pmeter) {
		var this_ = this;		
		var newNote = this_.localProxy.createNoteObj(messageId, msgNote);
		this_.saveOrAddToLocal(messageId, newNote, function() {			
			
			if (onSuccess) {
				onSuccess();
			}
		},true);		
	};
	this.deleteNote = function(messageId, onSuccess) {
//		var this_ = this;
//		
//		this_.localProxy.requestDataServer({
//			command : 'delete',
//			noteObj : this_.localProxy.createNoteObj(messageId)
//		}, function() {
//			if (this_.getTrueNote(messageId)) {
//				mnpSingle.logDebug('deleteNotesFor, deleting note >'
//						+ this_.notes[messageId].note + '< for >' + messageId
//						+ '<');								
//				delete this_.notes[messageId];
//				this_.notes[messageId] = {
//					status : -2
//				};
//			}
//			mnpSingle.obSvc.notifyObservers(null, "update_messagenotesplus",
//					null);
//		});
		
		var this_ = this;		
		
		
		//need stack var, to avoid messageId pollution in case of server error.
		var newNote =  this_.localProxy.editNoteBase(mnpSingle.Notes.getNoteSynchronously(messageId));
		newNote.lstatus=-2;
		if(newNote.note){
			var subnote_my = JSON.parse(newNote.note);
//			if(subnote_my.status ==  -4){
//				if(onSuccess){
//					onSuccess();
//				}
//				return; //not changed
//			}
			subnote_my.status =  -4;
			subnote_my.note = null;
			subnote_my.date = new Date().getTime();
			newNote.note=JSON.stringify(subnote_my);
		}
		if(newNote.status==-4||newNote.status==-2){
			this_.deleteNoteFromLocalDb(messageId, function(){
                mnpSingle.remoteProxy.notifyUi();        
                if(onSuccess){
                    onSuccess();
                }
			});
		}else{
			this_.saveToLocal(messageId, newNote, function(){
				mnpSingle.remoteProxy.saveLocalToRemote(messageId, function(){
					mnpSingle.remoteProxy.notifyUi();		
					if(onSuccess){
						onSuccess();
					}
				});			
			});		
		}
	};
	this.deleteNoteFromLocalDb=function(messageId, onFinish){
		var this_=this;
		this_.localProxy.requestDataServer({
			command : 'delete',
			noteObj : this_.localProxy.createNoteObj(messageId)
		}, function() {
			if (this_.getTrueNote(messageId)) {
				mnpSingle.logDebug('deleting note for messageId: ' + messageId);						
				delete this_.notes[messageId];
				this_.notes[messageId] = {
					status : -2
				};
			}
			mnpSingle.obSvc.notifyObservers(null,'messagenotesplus_note_deleted', messageId);			
			mnpSingle.obSvc.notifyObservers(null, "update_messagenotesplus",
				null);
			if(onFinish){
				onFinish();
			}
		},onFinish);
	};
	this.cancelLocalChanges=function(messageId){
		var this_=this;
		var note = this_.getNoteSynchronously(messageId);
		note.note = note.remote_my;
		if(note.remote_my==undefined && note.remote_others==undefined){//the case when user just created the note and wants to cancel it immediately.
			this_.deleteNoteFromLocalDb(messageId);			
		}else{
			this_.saveToLocal(messageId, note, function(){
				mnpSingle.obSvc.notifyObservers(null, "update_messagenotesplus",
						null);
			}, null);
		}
		
	};
	this.saveOrAddToLocal=function(messageId, noteToSave, onFinish, skipCleaning){
		var this_=this;
		this_.getNote1(messageId, function(messageId, localDbNote){
			var command;			
			if(localDbNote){
				//if we received status from server -2 or -4 and we have -4 status in our subnote, then delete the note from local db!
				if((noteToSave.status == -4 || noteToSave.status == -2) && !skipCleaning){
					if(!localDbNote.note){
						this_.deleteNoteFromLocalDb(messageId, onFinish);	
						return;
					}else{
						var my = JSON.parse(localDbNote.note);
						if((my.status==-4||my.status==-2)){
							this_.deleteNoteFromLocalDb(messageId, onFinish);		
							return;
						}		
					}
					// continue to save (b.e. note deleted on server, but has local part, and needs to clean others parts), if(onFinish){
					//	onFinish();
					//}
					//return;
								
				}
				
				command = 'save';		
//				if(!noteToSave.note && noteToSave.remote_my){//impossible situation until data integrity 100%
//					noteToSave.note = noteToSave.remote_my;
//				}			
				this_.saveToLocalImpl(command,messageId, noteToSave, onFinish, onFinish, localDbNote);	
			}else if(noteToSave.status == -4 && !skipCleaning){// do nothing
				if(onFinish){
					onFinish();
				}				
				return;
			}else{
				command = 'add';
				if(!noteToSave.note && noteToSave.remote_my){
					noteToSave.note = noteToSave.remote_my;
				}
				this_.saveToLocalImpl(command,messageId, noteToSave, function(){
					mnpSingle.obSvc.notifyObservers(null,'messagenotesplus_note_added', messageId);	
					if(onFinish){
						onFinish();
					}
				}, onFinish, localDbNote);	
				
			}			
					
		});
		
	};
	this.updatePending=function(newNote, oldNote){
		var this_=this;
		//var newNote = this_.getNoteSynchronously(messageId);
		var updated = false;
		var etalon ;
		if(oldNote){
			etalon = oldNote;
		}else{
			etalon = newNote;
		}		
		updated = mnpSingle.Notes.compareSubnotes(etalon.note, newNote.remote_my);//false;//mark note as not pending even if there were changes from multi-user version//			
		
		if(updated != etalon.pending){
			newNote.pending=updated;			
			return true;
		}else{
			return false;
		}
	};
	
	this.compareSubnotes = function(subnote1, subnote2){
		var s1, s2;
		if(subnote1){
			s1 = JSON.parse(subnote1);
		}
		if(subnote2){
			s2 = JSON.parse(subnote2);
		}
		if(!s1 && !s2){
			return false;
		}
		if((s1 && !s2) || (!s1 && s2)){
			if(s1 && s1.status != -4){ //-4 deals with the case when server response is null, but locally there are remains exist.
				return true;
			}
			if(s2 && s2.status != -4){//-4 deals with the case when server response is null, but locally there are remains exist.
				return true;
			}
			return false;//some status = -4, another subnote is null.
		}				
		if((s1.body != s2.body)||(s1.status != s2.status)){
			return true; // test cases.
		}
		return false;
	};	
	
	this.saveRead = function(note, onSuccess) {	
		var this_=this;
		if(note.date){
			if(!note.readTime || (note.date > note.readTime)){
				this_.localProxy.requestDataServer({
					command : 'save',
					noteObj : {messageId: note.messageId, readTime: note.date}
				}, function() {			
					this_.setNoteField(note.messageId, 'readTime', note.date);		
					if(onSuccess){
						onSuccess();
					}
				}, function(){
					mnpSingle.alert("Failed to save the note read flag.");					
				});		
			}
		}
	};
	this.calcLocalNoteBody=function(newNote){
		if(newNote.note){
			var subnote_my = JSON.parse(newNote.note);			
			if(subnote_my && subnote_my.body){
				newNote.local_note_body = subnote_my.body;
			}
		}
	};
	this.saveToLocalImpl = function(command, messageId, newNote, onSuccess, onError, localDbNote) {	
		var this_=this;
		newNote.nformat=1;		
		//newNote.pending
		delete newNote.visibility;
		if(localDbNote && localDbNote.readTime && !(newNote.readTime && newNote.readTime > localDbNote.readTime)){
			newNote.readTime = localDbNote.readTime;
		}
		
		var pendingChanged = this_.updatePending(newNote, localDbNote);		//we need calculate the flag before writing to db, because we write it also.
		
		this_.calcLocalNoteBody(newNote);
		
		this_.localProxy.requestDataServer({
			command : command,
			noteObj : newNote
		}, function() {						
			this_.applyNoteFromServer(newNote.messageId, newNote, true);	
			if(pendingChanged){				
				mnpSingle.obSvc.notifyObservers(null, "messagenotesplus_update_note_pending",
						newNote.pending);
			}
			if(onSuccess){
				onSuccess();
			}						
		}, function(){
			mnpSingle.alert("Failed to save the note locally.");
			if(onError){
				onError();
			}				
		});		
	};
	
	
	this.saveToLocal = function(messageId, newNote, onSuccess, onError) {	
		var this_=this;
		this_.saveToLocalImpl('save',messageId, newNote, onSuccess, onError);		
	};
	this.saveJoinToLocal = function(messageId, onSuccess, onError) {
		var this_ = this;			
		//need stack var, to avoid messageId pollution in case of server error.
		var newNote =  this_.localProxy.editNoteBase(mnpSingle.Notes.getNoteSynchronously(messageId));		
		var subnote_my = this_.createSubnote("",new Date().getTime(),newNote.status);			
		newNote.note=JSON.stringify(subnote_my);
		this_.saveToLocal(messageId, newNote, function(){			
			mnpSingle.obSvc.notifyObservers(null, "update_messagenotesplus",
					null);
			if(onSuccess){
				onSuccess();
			}
		}, onError);
		
	};
	this.saveTextToLocal = function(messageId, text, onSuccess, onError, force) {
		var this_ = this;			
		//need stack var, to avoid messageId pollution in case of server error.
		var newNote =  this_.localProxy.editNoteBase(mnpSingle.Notes.getNoteSynchronously(messageId));		
		var subnote_my = JSON.parse(newNote.note);			
		if(subnote_my.body ==  text && !force){//we cannot avoid force parameter here and simply call onSuccess, because onSuccess can cause unwanted visual updates.
			return; //not changed
		}
		subnote_my.body =  text;
		subnote_my.date = new Date().getTime();
		newNote.note=JSON.stringify(subnote_my);
		this_.saveToLocal(messageId, newNote, function(){	
			mnpSingle.obSvc.notifyObservers(null, "messagenotesplus_update_note_date",
					this_.getDateString(new Date(subnote_my.date)));
			if(onSuccess){
				onSuccess();
			}
		}, onError);
		
	};
	
	
	this.saveStatusToLocal = function(messageId, status, onSuccess, onError) {
		var this_ = this;				
		//need stack var, to avoid messageId pollution in case of server error.		
		var newNote =  this_.localProxy.editNoteBase(mnpSingle.Notes.getNoteSynchronously(messageId));
		if(newNote){			
			if(mnpSingle.remoteProxy.myName && newNote.name && newNote.name != mnpSingle.remoteProxy.myName){
				var msg1 = "Note status can be changed only by a note owner (creator). Owner of this note is "
					+ mnpSingle.unwrapUserName(newNote.name) + ". "
					+ "If you are not an owner and you don't want to see this warning again, you may cancel local changes. It will cancel changes of status and text. " +
							"So, if you have changed the text of the note too,"
					+ " be sure that you preserved the text somewhere before canceling of the local changes.";
				if(onError){
					onError(msg1);					
				}else{
					mnpSingle.showPopup(msg1);
				}
				return;
			}
			 
		}
		var subnote_my = JSON.parse(newNote.note);		
		if(subnote_my.status ==  status){
			return; //not changed
		}
		subnote_my.status =  status;
		newNote.lstatus = status;
		subnote_my.date = new Date().getTime();
		newNote.note=JSON.stringify(subnote_my);
		this_.saveToLocal(messageId, newNote, function(){
			mnpSingle.remoteProxy.saveLocalToRemote(messageId, function(){
				mnpSingle.remoteProxy.notifyUi();
				if(onSuccess){
					onSuccess();
				}
			});
			
			}, onError);		
	};
	
	
	this.onTextBoxInputTimer = null;
	this.onTextBoxInputDelayedAutoSave = function(wnd, messageId, value) {
		var this_ = this;
		//mnpSingle.logDebug('window:'+wnd+" value:"+value);
		wnd.clearTimeout(this_.onTextBoxInputTimer);
		this_.onTextBoxInputTimer = null;
		this_.onTextBoxInputTimer = wnd.setTimeout(function() {			
			this_.saveTextToLocal(messageId, value);
			//mnpSingle.logDebug('got new note value: '+value);				
		}, 2000);

	};
	
	this.setNoteStatus = function(messageId, status, onSuccess, onError) {
		var this_ = this;		
		this_.saveStatusToLocal(messageId, status, onSuccess, onError);		
	};
	
	this.initLocalPart = function(messageId) {
		var this_ = this;
		if (!this_.notes[messageId]) {// if (!this_.getTrueNote(messageId))
										// {//see hg rev 155
			var newNote = {};
			// this_.copyField('status', this_.notes[messageId], newNote);
			this_.notes[messageId] = newNote;
		}
	};
	this.setNoteField = function(messageId, name, value) {
		var this_ = this;
		this_.initLocalPart(messageId);
		this_.notes[messageId][name] = value;
		// mnpSingle.logInfo('setted note field: messageId: ' + messageId
		// + " name=" + name + " value=" + value + "result="
		// + this_.notes[messageId][name]);
	};
	this.getNoteField = function(messageId, name) {
		var this_ = this;
		// do not get status through this function.
		// do not call server on every touch.
		this_.initLocalPart(messageId);
		return this_.notes[messageId][name];
	};
	this.createRingBuffer = function(size) {
		var length = size + 1;
		return {
			buffer : [],
			head : 0,
			tail : 0,
			cursor : 0,
			prevCursor : 0,
			capacity : 0,
			begin : function() {
				this.cursor = this.head;
				this.prevCursor = this.head;
			},
			next : function() {
				if (this.cursor == this.tail) {
					//mnpSingle.logDebug("End of queue. cursor: "+ this.cursor);
					return null;
				}
				//mnpSingle.logDebug("cursor: "+ this.cursor);
				var res = this.buffer[this.cursor];
				this.incPointer("cursor");
				if (this.cursor != this.head) {
					this.incPointer("prevCursor");
				}
				// print("cursor=" + this.cursor + " head=" + this.head + "
				// tail="
				// + this.tail);
				//mnpSingle.logDebug("value at cursor: "+ JSON.stringify(res));
				return res;
			},
			push : function(item) {
				if (this.capacity == length - 1) {
					this.incPointer("head");
				}
				
				//mnpSingle.logDebug("queue capacity: "+ this.capacity);
				//mnpSingle.logDebug("queue head: "+ this.head+ " queue tail: " + this.tail);
				this.buffer[this.tail] = item;
				//mnpSingle.logDebug("pushed: "+ JSON.stringify(this.buffer[this.tail]));
				if (this.capacity < length - 1) {
					this.capacity++;
				}
				this.incPointer("tail");

				// print("cursor=" + this.cursor + " head=" + this.head + "
				// tail="
				// + this.tail);
			},
			getCursor : function() {
				return this.cursor;
			},
			getPrevCursor : function() {
				return this.prevCursor;
			},
			remove : function(pos, check) {
				if (this.buffer[pos] && this.buffer[pos].messageId == check) {
					delete this.buffer[pos];
				}
			},
			incPointer : function(pname) {
				this[pname]++;
				// print("inc1, pname=" + pname + " value=" + this[pname])
				if (this[pname] == length) {
					this[pname] = 0;
				}
			}
		};
	};
	// this.noteStatusesQueue = {};// emulating set
	this.noteStatusesQueue = this.createRingBuffer(100);
	this.queryNoteStatusesTimer = null;
	this.getNoteStatus = function(messageId, onAsyncAfter, win) {
		var this_ = this;
		var note = this_.notes[messageId];
		// we need -1 here, because when user scrolls fast some messages can get
		// undefined statuses forever without that. Ring buffer cares to not
		// duplicate requests to the server. All ok.
		if (note && note.status != undefined && note.status != -1) {
			if (note.status == -3) {
				return null;
			}
			return note;
		} else {
			this_.noteStatusesQueue.push({
				messageId : messageId,
				noteStatusesQueueState : 0
			});
			//mnpSingle.logDebug("Quering status: "+ messageId);
			// on successfull retrieve.
			win.clearTimeout(this_.queryNoteStatusesTimer);// check if window
			// is valid
			this_.queryNoteStatusesTimer = null;

			this_.queryNoteStatusesTimer = win.setTimeout(function() {
				mnpSingle.logDebug('quering note statuses pack');
				this_.getNoteStatusPack(onAsyncAfter);
			}, 500);

			this_.notes[messageId] = {
				status : -1
			};
			return null;
		}
	};	
	
	this.getNoteStatusPack = function(onAsyncAfter) {
		var this_ = this;
		if(!this_.localProxy){
			mnpSingle.logDebug('Not initialized yet. Sometimes the initialization isn\'t fast enough. Somewhen it should succeed.');
			return;
		}
			var ar1 = [];
			var ids = {};
			var statusRequestState;
			this_.noteStatusesQueue.begin();
			/* undefined is ok here, it means I was just removed, but the queue
			 doesn't end on me. = > strong comparison operator!*/
			while ((statusRequestState = this_.noteStatusesQueue.next()) !== null) {
				//mnpSingle.logDebug("Check if note status needs querig: "+ JSON.stringify(statusRequestState));
				if (statusRequestState && statusRequestState.noteStatusesQueueState == 0) {
					var stat1 = this_.getNoteField(statusRequestState.messageId, 'status');
					if(stat1 != undefined && stat1 != -1){//deducted from get status conditions
						continue;
					}
					//var note1 = this_.notes[statusRequestState.messageId];
					//this_.
					//if(this_.get notes[statusRequestState.messageId] &&  == {
					//		status : -3
						// request sent, do not repeat it ever.
					//	};
					ar1.push(statusRequestState.messageId);
					this_.setNoteField(statusRequestState.messageId, 'status', -3);// request sent, do not repeat it ever.
					
					//this_.notes[statusRequestState.messageId] = {
					//	status : -3
					// request sent, do not repeat it ever.
					//};
					statusRequestState.noteStatusesQueueState = 1;// request sent, waiting
					// response.
					ids[statusRequestState.messageId] = this_.noteStatusesQueue
							.getPrevCursor();
				}
			}
			//mnpSingle.logDebug('before localProxy.requestDataServer. notes amount to request = '+ ar1.length);
			if (ar1.length > 0) {
				
				this_.localProxy.requestDataServer({
					command : "get_statuses",
					ids : ar1,
				}, function(res) {
					var noteArr = [];
					if (res) {
						var cn1, i;
						for (i in res) {
							cn1 = res[i];							
							this_.applyNoteFromServer(cn1.messageId, cn1);
							this_.noteStatusesQueue.remove(ids[cn1.messageId],
									cn1.messageId);
							delete ids[cn1.messageId];
						}
					}
					var j;
					for (j in ids) {
						this_.noteStatusesQueue.remove(ids[j], j);
						delete this_.notes[j];
						this_.notes[j] = {
							status : -2
						};
					}
					if (onAsyncAfter) {
						onAsyncAfter();
					}
				}, null, null);
			}
			
		
		

	};
	
	this.resetSearchResults=function(){
		delete this.searchResults;
		this.searchResults = {};
	};
	//item is {hdr, uri}
	this.getSearchResults = function(messenger) {
		var this_ = this, messageId;
		var sr = [];
		var i;
		for (i in this_.searchResults) {
			var item = this_.searchResults[i];
			if(item){
				sr.push(item);
			}else{
				mnpSingle.logError("Error while retrieving search results, item is null.");
			}
		}
		return sr;
		//return this.searchResults;
	};
	this.searchNotes = function(text, onAfter) {
		try {
			var this_ = this;
			// display notes even if there was an error.
			this_.localProxy.requestDataServer({
				command : 'search',
				noteObj : {messageId:null, note:text}
			}, function(res) {
				var noteArr = [];
				if (res) {
					var cn1, i;
					for (i in res) {
						cn1 = res[i];						
						// this_.applyNoteFromServer(messageId, cn1); we don't
						// need get note full here, it will be done by following
						// select message.
						noteArr.push(cn1.messageId);// we need only messageId here.						
					}
				}
				if (onAfter) {
					onAfter(noteArr);
				}
			}, function() {
				if (onAfter) {
					onAfter();
				}
			});
		} catch (e) {
			mnpSingle.logError("Errror while getting note from server." + e);
		}
	};

	this.copyField = function(name, src, dest) {
		if (src && src[name] != undefined) {
			dest[name] = src[name];
		}
	};
	this.weakCopyField = function(name, src, dest) {
		if(dest[name]==undefined){
			this.copyField(name, src, dest);
		}
	};
	this.applyNoteFromServer = function(messageId, fromServer, fromMemory) {
		var this_ = this;		
		if (!fromServer) {			
			delete this_.notes[messageId];
			this_.notes[messageId] = {
				status : -2
			};
			return; // note deleted
		}
		if (messageId !== fromServer.messageId) {
			Components.utils
					.reportError("Invalid data from server. Ignored.");
			return;
		}
		this_.updateNoteFormat0to1(fromServer);

		if (this_.notes[messageId]) {			
			var note = this_.notes[messageId];
			this_.copyField('visibility', note, fromServer);		
			//this_.copyField('readTime', note, fromServer);		
			if (!fromServer.note) {
				this_.copyField('note', note, fromServer);
			}
			if(fromMemory){
				var i;
				var db_fields = mnpSingle.localProxy.db_fields;
				for(i in db_fields){
					if(fromServer[db_fields[i]]==undefined){
						this_.copyField(db_fields[i], note, fromServer);
					}					
				}
//				//status : row.getResultByName("status"),
//				if(fromServer.status==undefined){
//					this_.copyField('status', note, fromServer);
//				}
			}
		}
		this_.notes[messageId] = fromServer;
	};
	this.months = [ "Jan", "Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
	this.getDateString = function(dt1){
		return dt1.getDate() +" "+ this.months[dt1.getMonth()]+" "+dt1.getFullYear().toString().substring(2) + " "+dt1.toLocaleTimeString();//toLocaleDateString();
		
	};
	this.extractSubnotes=function(note){
		var res = [];
		if(note.note){
			var my_subnote=JSON.parse(note.note);
			if(my_subnote.status!=-4){
				res.push(my_subnote);
			}
		}
		if(note.remote_others){
			var others = JSON.parse(note.remote_others);
			if(others.length){
				res=res.concat(JSON.parse(note.remote_others));
			}
		}
		return res;
	};
	
	
//	this.cancelLocalStatusChanges = function(){
//		var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"] .getService(Components.interfaces.nsIPromptService);
//		var result = prompts.confirm(null, "Message Notes Plus", "Discard your local changes of status for this note?");  
//		if(result){
//			var i=4;
//			//TODO:6
//		}
//	};
	

}

var mnpSingle = (function() {
	'use strict';
//	TODO: mnpSingle is not defined exception because in old versions we used 
//	mnpSingle from overlay. it isn't well. 
//	how to fix: remove return, convert to 'this....' format. clean up initialization order of single and notes. 
//	call notes initialization after
	return {		
		my_birth_time : "my time: " + new Date(),
		//Notes : new NotesObj(mnpSingle), initialized later to have good mnpSingle.
		donotblock : false,
		tagNotes : true,
		doNotShow : false,
		maxPanelHeight : 250,
		workOffline : false,		
		optVersion : "optV1",
		optVersionSpecial : {
			donotblock : "optV2",
			lufs : "optV2",
			firstRunColumn : "optV3"
		},		
		currentError : "",		
		
		serverTimeoutStart : 0,
		serverTimeout : 0,		
		userActions : [["SetNoteStatus2","Important","","","messagenotesplus.pUA('setNoteStatus',2);"],["SetNoteStatus1","Needs attention","","","messagenotesplus.pUA('setNoteStatus',1);"],["SetNoteStatus0","Normal","","","messagenotesplus.pUA('setNoteStatus',0);"],["ShowHideNote","Show/Hide Note","DOM_VK_F9","shift","messagenotesplus.pUA('togglemessagenotesplus');"],["AddNote","Add Note","DOM_VK_F9","control","messagenotesplus.pUA('addNote');"],["ShareNoteChanges","Share Note Changes","DOM_VK_F9","control+shift","messagenotesplus.pUA('shareNote');"],["CancelNoteLocalChanges","Cancel Note Local Changes","DOM_VK_F11","control+shift","messagenotesplus.pUA('cancelChanges');"],["DeleteNote","Delete note","DOM_VK_F12","control+shift","messagenotesplus.pUA('deleteNote');"],["Search","Search","DOM_VK_F3","control","messagenotesplus.pUA('searchForNotesWithText');"],["Memorize","Memorize Note","","","messagenotesplus.pUA('memorizeNoteFromThisMessage');"],["AddMemorized","Add Memorized Note","","","messagenotesplus.pUA('addMemorized');"],["Print","Print...","","","messagenotesplus.pUA('openPrint');"]],
		icons : {},
		icons_pending : {},
		icons_unread : {},
		icons_pending_unread : {},
		
		isFreeDistribution : Boolean("yes"),
		

		obSvc : Components.classes["@mozilla.org/observer-service;1"]
				.getService(Components.interfaces.nsIObserverService),
		prefService : Components.classes["@mozilla.org/preferences-service;1"]
				.getService(Components.interfaces.nsIPrefBranch),
		consoleService : Components.classes["@mozilla.org/consoleservice;1"]
				.getService(Components.interfaces.nsIConsoleService),
		
		//serverProxy : null,
		localProxy : null,
		remoteProxy : null,	
		initialized : false,
		global_decls : {},
		global_defs : {},
		
		init : function(localProxy_, remoteProxy_, afterThat, pmeter) {
			var this_ = this;
			
			if (!this_.initialized) {
				this_.initialized = true;
				this_.updateIcons(function(){					
					localProxy_.init(function(){
						this_.localProxy = localProxy_;
						this_.Notes.localProxy = localProxy_;
						//if (!this_.remoteProxy) {
							remoteProxy_.init(function(){
								this_.remoteProxy = remoteProxy_;
								this_.Notes.remoteProxy = remoteProxy_;
								afterThat();
							}, pmeter);
							
							//this_.resetNotes();
							return;
						//}else{
						//	afterThat();
						//	return;
						//}
					}, pmeter);
				});
				return;
			} else {
				afterThat();
			}
			this_.logger=this_.getLogger();
		},
		resetNotes : function() {
			var localProxy = this.Notes.localProxy;
			var remoteProxy = this.Notes.remoteProxy;
			this.Notes = new NotesObj(mnpSingle);
			this.Notes.localProxy = localProxy;
			this.Notes.remoteProxy = remoteProxy;
		},
		
		updateServerSuccess : function() {
			if (this.checkServerTimeout()) {
				return;// do not touch this kind of error. very evil.
			}
			this.currentError = "";
			mnpSingle.obSvc.notifyObservers(null, "messagenotesplus_on_error",
					null);
		},
		startUserActionLife:function(){
			this.remoteProxy.startUserActionLife();
		},
		// updateServerSuccessCritical : function(){
		// mnpSingle.servingRefused = false;
		// this.currentError="";
		// mnpSingle.obSvc.notifyObservers(null, "messagenotesplus_on_error",
		// null);
		// },
		setServerTimeoutCritical : function(msg) {
			this.setServerTimeout(20000000000000, msg);
		},
		setServerTimeout : function(timeout, msg) {
			mnpSingle.serverTimeoutStart = new Date().getTime();
			mnpSingle.serverTimeout = timeout;
			mnpSingle.currentError = msg;
			mnpSingle.obSvc.notifyObservers(null, "messagenotesplus_on_error",
					null);
		},
		resetServerTimeout : function() {
			this.serverTimeoutStart = 0;
			mnpSingle.serverTimeout = 0;
			mnpSingle.currentError = "";
			mnpSingle.obSvc.notifyObservers(null, "messagenotesplus_on_error",
					null);
		},
		checkServerTimeout : function() {
			if (!mnpSingle.serverTimeout) {
				return false;
			}
			var current = new Date().getTime();
			if (current > this.serverTimeoutStart + this.serverTimeout) {
				this.resetServerTimeout();
				return false;
			}
			return true;// timeout acts.
		},

		updateServerError : function(msg) {
			if (this.checkServerTimeout()) {
				var d = 1;// do not touch this kind of error.
			} else {
				this.currentError = msg;
			}
			this.logError("Error for user: " + msg);
			mnpSingle.obSvc.notifyObservers(null, "messagenotesplus_on_error",
					null);
		},
		updateServerProgress : function(value) {
			if(	this.progress!=value){
				this.progress = value;
				mnpSingle.obSvc.notifyObservers(null, "messagenotesplus_on_progress",
						null);
			}
		},
		getServerWarnings : function(){
			return this.remoteProxy.getServerWarnings();
		},
		
		updateDistributionType : function(){
			var isFreeDistributionBuild = Boolean("yes");
			if(isFreeDistributionBuild){
				mnpSingle.isFreeDistribution = true;
				mnpSingle.setBoolPref("multiUser", !mnpSingle.isFreeDistribution);
			}else{
				try {
					mnpSingle.isFreeDistribution = !mnpSingle.getBoolPref("multiUser");
				} catch (e) {
					mnpSingle.setBoolPref("multiUser", !mnpSingle.isFreeDistribution);
				}
			}
		},
		
		
		// updateServerErrorCritical : function(msg){
		//			
		// mnpSingle.servingRefused = true;
		// this.currentError=msg;
		// mnpSingle.obSvc.notifyObservers(null, "messagenotesplus_on_error",
		// null);
		// },

		showPopup : function(msg) {
			var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
			this.logInfo("showPopup: "+msg);
			prompts.alert(null, "Message Notes Plus", msg);
		},

		alert : function(msg, forcePopup) {
			var this_ = this;
			this_.updateServerError(msg);
			if ((this_.donotblock || this_.doNotShow || this_.alertFloodCount > 2)
					&& !forcePopup) {
				this.logError("alert to console: "+msg);
				Components.utils.reportError(msg);
			} else {
				var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
						.getService(Components.interfaces.nsIPromptService);
				var check = {
					value : false
				};
				this_.alertFloodCount++;
				// https://developer.mozilla.org/en/XPCOM_Interface_Reference/nsIPromptService#alertCheck_example
				this.logInfo("alert: "+msg);
				prompts
						.alertCheck(
								null,
								"Message Notes Plus",
								msg,
								"Do not show the add-on messages and warnings until Thunderbird restart. Log to error console.",
								check);
				this_.doNotShow = check.value;
			}
		},
		alertError : function(msg) {
			var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Components.interfaces.nsIPromptService);
			this.logInfo("alertError: "+msg);
			prompts	.alert(	null,"Message Notes Plus",	msg);
		},
		alertInfo : function(msg) {
			var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
				.getService(Components.interfaces.nsIPromptService);
			this.logInfo("alertInfo: "+msg);
			prompts.confirmEx(null,"Message Notes Plus", msg, 1, "aeg","","","",{});			
		},		
//		__logRepo: null,
//		get logRepo() {
//		    // Note: This hits the disk so it's an expensive operation; don't call it
//		// on startup.
//		if (this.__logRepo == null) {
//		  //var ozModule = {};		      
//		  
//		  var props = Components.classes["@mozilla.org/file/directory_service;1"].
//		                getService(Components.interfaces.nsIProperties);
//		  var logFile = props.get("ProfD", Components.interfaces.nsIFile);
//		  logFile.append("messagenoteplus.log");
//		  var formatter = new Log4Moz.BasicFormatter();
//		  //var root = Log4MozModule.Log4Moz.repository.rootLogger;
//		  var root = Log4Moz.getConfiguredLogger("messagenotesplus.Logger");
//		  root.level = Log4Moz.Level.All;
//		      var fileAppender = new Log4Moz.RotatingFileAppender(logFile, formatter);
//		      root.addAppender(fileAppender);
//		      var consoleAppender = new Log4Moz.ConsoleAppender(formatter);
//		      root.addAppender(consoleAppender);
//		      this.__logRepo = Log4Moz.repository;
//		    }
//		    return this.__logRepo;
//		},
//		set logRepo(value){
//			this.__logRepo=value;
//		},
		__logger: null,
		get logger() {
		    if (this.__logger == null) {
		        var props = Components.classes["@mozilla.org/file/directory_service;1"].getService(Components.interfaces.nsIProperties);
				  var logFile = props.get("ProfD", Components.interfaces.nsIFile);
				  logFile.append("messagenoteplus.log");
				  var formatter = new Log4Moz.BasicFormatter();
				  //var root = Log4MozModule.Log4Moz.repository.rootLogger;
				  var root = Log4Moz.repository.getLogger("mnp");
				  //var root = Log4Moz.getConfiguredLogger("mnp"); don't need default console and dump appenders
				  root.level = Log4Moz.Level.All;
			      var fileAppender = new Log4Moz.RotatingFileAppender(logFile, formatter);
			      root.addAppender(fileAppender);
			      Log4Moz.ConsoleAppender.prototype.append = function(message){ //override appender to avoid stupid duplication of error messages.
			          var  stringMessage = this._formatter.format(message);
			          this.doAppend(stringMessage);
			      };
			      var consoleAppender = new Log4Moz.ConsoleAppender(formatter);
			      root.addAppender(consoleAppender);
			      this.__logger=root;
				      //this.__logRepo = Log4Moz.repository;
		    }
		    
		      
		      return this.__logger;
		},
		set logger(value){
			this.__logger=value;
		},
		
		
		 

		logDebug : function(msg) {
			var this_=this;
			this.logStringMessage(msg, function(msg1){this_.logger.debug(msg1);});
		},
		logInfo : function(msg) {
			var this_=this;
			this.logStringMessage(msg, function(msg1){this_.logger.info(msg1);});
		},
		logWarning : function(msg) {
			var this_=this;
			this.logStringMessage(msg, function(msg1){this_.logger.warn(msg1);});
		},
		logError : function(msg) {
			var this_=this;
			this.logStringMessage(msg, function(msg1){this_.logger.error(msg1);});
		},

		logStringMessage : function(msg1, logFunc) {
			var this_ = this;
			try {
				var isDebug;
				try {
					isDebug = this_.getBoolPref("debug");
				} catch (e1) {
					this_.setBoolPref("debug", false);
				}
				if (isDebug) {					
//					var dt = new Date();
//					msgg = dt.getHours() + ":" + dt.getMinutes() + ":"
//							+ dt.getSeconds() + "." + dt.getMilliseconds()
//							+ ". " + type + ": " + 'messagenotesplus - ' + msgg;
					//TODO:6 add milliseconds-alter BaseFormatter.
					if(msg1.search("\"password\"")==-1){
						logFunc(msg1);
					}else{
						logFunc("Skip the message containing password while logging.");
					}
					
					//this_.consoleService.logStringMessage(msgg);
				}
			} catch (e) {
				Components.utils.reportError(e, "original error: " + msg1);
			}
		},

		getOptVersion : function(name) {
			var this_ = this;
			if (this_.optVersionSpecial[name]) {
				return this_.optVersionSpecial[name];
			}
			return this_.optVersion;
		},

		getBoolPref : function(name) {
			var this_ = this;
			return this_.prefService.getBoolPref("messagenotesplus."
					+ this_.getOptVersion(name) + "." + name);
		},
		setBoolPref : function(name, value) {
			var this_ = this;
			this_.prefService.setBoolPref("messagenotesplus."
					+ this_.getOptVersion(name) + "." + name, value);
		},
		getCharPref : function(name) {
			var this_ = this;			
			return this_.prefService.getCharPref("messagenotesplus."
					+ this_.getOptVersion(name) + "." + name);			
		},
		setCharPref : function(name, value) {
			var this_ = this;
			this_.prefService.setCharPref("messagenotesplus."
					+ this_.getOptVersion(name) + "." + name, value);
		},
		getIntPref : function(name) {
			var this_ = this;
			return this_.prefService.getIntPref("messagenotesplus."
					+ this_.getOptVersion(name) + "." + name);
		},
		setIntPref : function(name, value) {
			var this_ = this;
			this_.prefService.setIntPref("messagenotesplus."
					+ this_.getOptVersion(name) + "." + name, value);
		},
		loadKeyParam : function(actionId, postfix) {
			var this_ = this;
			var i;
			for (i = 0; i < this_.userActions.length; i++) {
				if (this_.userActions[i][0] == actionId) {
					try {
						var res = this_.getCharPref(this_.userActions[i][0]
								+ postfix);
						return res;
					} catch (e) {
						if (postfix == 'Key') {
							return this_.userActions[i][2];
						} else {
							return this_.userActions[i][3];
						}
					}
				}
			}
		},
		defaultIcons : [ "note_status_0", "note_status_0_pending","note_status_0_unread","note_status_0_pending_unread"
		                 ,"note_status_1", "note_status_1_pending","note_status_1_unread","note_status_1_pending_unread"
		                 ,"note_status_2", "note_status_2_pending","note_status_2_unread","note_status_2_pending_unread"
		                 ,	"note_status_none", "note_status_none_pending", "note_status_none_unread", "note_status_none_pending_unread"
		                 , "note_status_undefined", "note_icon" ],
				//icons : {},
//				icons_pending : {},
//				icons_unread : {},
//				icons_pending_unread : {},
		defaultIconsFolderPath : "",
		extPath : "",
		updateIcons : function(afterThat) {
			var this_ = this;
			try {
				var id = "messagenotesplus@mozilla.org";
				Components.utils.import("resource://gre/modules/AddonManager.jsm");
				// asynch call.
				AddonManager
						.getAddonByID(
								id,
								function(addon) {
									try {
										this_.extPath = addon.getResourceURI("").QueryInterface(
												Components.interfaces.nsIFileURL).file;
										//mnpSingle.logDebug("MNP Extension path: " + this_.extPath);
										var paths = {};
										try {
											var customIconsPath = mnpSingle.getCharPref("customIconsFolderPath");
											var custom_dir = Components.classes["@mozilla.org/file/local;1"]
												.createInstance(Components.interfaces.nsILocalFile);
											custom_dir.initWithPath(customIconsPath);
											mnpSingle.logDebug("Initializing custom icons from directory: " + custom_dir.path);
											var k;
											for(k in this_.defaultIcons){
												var icon = custom_dir.clone();
												icon.append(this_.defaultIcons[k]+".png");
												if(icon.exists()){
													paths[this_.defaultIcons[k]]=icon.path;												
												}									
											}
										}catch (e) {
										}
										
										var default_dir = Components.classes["@mozilla.org/file/local;1"]
											.createInstance(Components.interfaces.nsILocalFile);
										default_dir.initWithPath(this_.extPath.path);
										default_dir.append("assets");
										default_dir.append("icons");
										var j;
										for(j in this_.defaultIcons){
											if(paths[this_.defaultIcons[j]]){
												continue; //the icon is custom
											}
											var icon1 = default_dir.clone();
											icon1.append(this_.defaultIcons[j]+".png");
											if(icon1.exists()){
												paths[this_.defaultIcons[j]]=icon1.path;												
											}else{
												mnpSingle.alert("Cannot find default icon file: " + icon1.path);
											}											
										}
										var l;
										for(l in this_.defaultIcons){
											if (paths[this_.defaultIcons[l]].indexOf("file://") == -1
													&& paths[this_.defaultIcons[l]].indexOf("chrome://") == -1) {
												paths[this_.defaultIcons[l]] = "file://" + paths[this_.defaultIcons[l]];
											}										
										}
										mnpSingle.icons[-4] = paths.note_status_none;
										mnpSingle.icons[-2] = paths.note_status_none;
										mnpSingle.icons[-1] = paths.note_status_undefined;
										mnpSingle.icons[0] = paths.note_status_0;
										mnpSingle.icons[1] = paths.note_status_1;
										mnpSingle.icons[2] = paths.note_status_2;
										mnpSingle.icons_pending[-4] = paths.note_status_none_pending;
										mnpSingle.icons_pending[-2] = paths.note_status_none_pending;
										mnpSingle.icons_pending[0] = paths.note_status_0_pending;
										mnpSingle.icons_pending[1] = paths.note_status_1_pending;
										mnpSingle.icons_pending[2] = paths.note_status_2_pending;
										mnpSingle.icons_unread[-4] = paths.note_status_none_unread;
										mnpSingle.icons_unread[-2] = paths.note_status_none_unread;
										mnpSingle.icons_unread[0] = paths.note_status_0_unread;
										mnpSingle.icons_unread[1] = paths.note_status_1_unread;
										mnpSingle.icons_unread[2] = paths.note_status_2_unread;
										mnpSingle.icons_pending_unread[-4] = paths.note_status_none_pending_unread;
										mnpSingle.icons_pending_unread[-2] = paths.note_status_none_pending_unread;
										mnpSingle.icons_pending_unread[0] = paths.note_status_0_pending_unread;
										mnpSingle.icons_pending_unread[1] = paths.note_status_1_pending_unread;
										mnpSingle.icons_pending_unread[2] = paths.note_status_2_pending_unread;				
	
										mnpSingle.icons.indicator = paths.note_icon;
										mnpSingle.obSvc.notifyObservers(null,
												"messagenotesplus_update_icons", null);
										if(afterThat){
											afterThat();
										}
									} catch (e2) {
										Components.utils.reportError(e2);
									}
									
				});
			
				
			} catch (e1) {
				Components.utils.reportError(e1);
			}
		},
		showContextMenu :function(doc, x, y){
			var this_=this;
			var cm = doc.getElementById('messagenotesplusNoteCMenu');
			//var nb = doc.getElementById('MessageNotesPlus_msgText');			
			//cm.openPopup(nb,null, x,y); this method ignores 'y' if there is not enough space to place the menu downward.
			cm.openPopupAtScreen(x,y);
		},
		
		showTooltip :function(doc, x, y,content){			
			var cm = doc.getElementById('messagenotesplusTooltip');
			var l1 = doc.getElementById('messagenotesplusTooltipLabel');
			l1.value=content;			
			cm.openPopupAtScreen(x,y-5);
		},		  
		hideTooltip :function(doc){			
			var cm = doc.getElementById('messagenotesplusTooltip');
			cm.hidePopup();
		},
		readFromFile : function(path) {
			try {
				var file = Components.classes["@mozilla.org/file/local;1"]
						.createInstance(Components.interfaces.nsILocalFile);
				file.initWithPath(path);
				var data = "";
				var fstream = Components.classes["@mozilla.org/network/file-input-stream;1"]
						.createInstance(Components.interfaces.nsIFileInputStream);
				var cstream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]
						.createInstance(Components.interfaces.nsIConverterInputStream);
				fstream.init(file, -1, 0, 0);
				cstream.init(fstream, "UTF-8", 0, 0);
				var str = {};

				var read = 0;
				do {
					read = cstream.readString(0xffffffff, str); // read as much as
					// we
					// can and put it in
					// str.value
					data += str.value;
				} while (read != 0);

				cstream.close(); // this closes fstream
				return data;
			} catch (e) {
				throw "Error while trying to read file: " + e.message;
			}
		},
		
		writeToFile : function(wnd, path, value) {
			try {
				var file = Components.classes["@mozilla.org/file/local;1"]
						.createInstance(Components.interfaces.nsILocalFile);
				file.initWithPath(path);
				var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"]
						.createInstance(Components.interfaces.nsIFileOutputStream);
				foStream.init(file, 0x02 | 0x08 | 0x20, wnd.parseInt("0666", 8), 0);

				var converter = Components.classes["@mozilla.org/intl/converter-output-stream;1"]
						.createInstance(Components.interfaces.nsIConverterOutputStream);
				converter.init(foStream, "UTF-8", 0, 0);
				converter.writeString(value);
				converter.close();
			} catch (e) {
				throw "Error while trying to write file: " + e.message;
			}
		},
		unwrapUserName : function(name){
			var this_ = this;
			var pos = name.search(',');
			if(pos != -1){
				return name.substring(0,pos); 
			}else{
				return name;
			}
				
		},
		composeUserName : function(onlyEmail, groupId, wnd){
			if(wnd.parseInt(groupId, 10)>100){
				return onlyEmail+","+groupId;
			}else{
				return onlyEmail;				
			}
		} 
		

		

	// me : function() {
	// return this;
	// }
	};
}());
mnpSingle.Notes = new NotesObj(mnpSingle);
var messagenotesplus_Single = mnpSingle;