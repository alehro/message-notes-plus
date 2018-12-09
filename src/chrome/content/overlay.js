/*Copyright Alexander Khromov, aka alehro. All rights reserved. Contact: al(spam protection brackets)ehro00<spam protection brackets>gmail.com*/

/*global Components: false, Components: false, messagenotesplus: true, messagenotesplus_Single: false,  
 document: false, EnsureSubjectValue:true, window: false, gHighlightedMessageText: true, gFolderDisplay:false,
 MailUtils: false, gFolderTreeView: false, KeyboardEvent: false, Gloda: false, messenger: false*/

Components.utils.import("resource:///modules/MailUtils.js");
Components.utils.import("resource://msgmodules/s3.js");


messagenotesplus_Single.global_decls.Messagenotesplus = function() {

	'use strict';
	var mnpSingle = messagenotesplus_Single;

	this.VISIBLE = 1;
	this.INVISIBLE = 2;
	this.initialized = false;
	this.consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
	// this.prefService =
	// Components.classes["@mozilla.org/preferences-service;1"]
	// .getService(Components.interfaces.nsIPrefBranch);
	this.pathToFile = null;
	// notes : new Array(),
	this.TBmain = null;
	this.viewType = 'ifnote'; // can be 'ifnote' or 'never'
	this.searchIdx = -1;
	this.userActions = [];
	this.memorizedMessageId = null;
	this.DBGlastTime = 0;
	this.progress = false;
	this.doc = document;

	// myName : "",
	// myPassword : "",

	this.initialize = function() {
		var this_ = this;
		// if(!mnpSingle.data){
		// mnpSingle.data=mnpData.init();
		// }
		mnpSingle.logDebug("msgntpSingle: " + mnpSingle.my_birth_time);
		mnpSingle.logDebug("Messagenotesplus initialization started.");

		mnpSingle.updateDistributionType();
		try {
			mnpSingle.donotblock = mnpSingle.getBoolPref("donotblock");
		} catch (e) {
			mnpSingle.setBoolPref("donotblock", true);
		}
		try {
			mnpSingle.tagNotes = mnpSingle.getBoolPref("tagNotes");
		} catch (e1) {
			mnpSingle.setBoolPref("tagNotes", true);
		}
		try {
			mnpSingle.maxPanelHeight = parseInt(mnpSingle.getCharPref("maxPanelHeight"), 10);
		} catch (e2) {
			mnpSingle.setCharPref("maxPanelHeight", '250');
		}

		this_.initUserActions();
		window.addEventListener("keydown", function(e) {
			messagenotesplus.processKey(e);
		}, false);

		mnpSingle.logDebug("1: initialize1");

		this_.DBGlastTime = new Date().getTime();
		if (document.documentURI.indexOf('messenger.xul') < 0) {
			mnpSingle.logDebug("1.1: initialize1");
			// this code is running in a standalone message window
			mnpSingle.logDebug('init started in standalone');
			this_.TBmain = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService().QueryInterface(
					Components.interfaces.nsIWindowMediator).getMostRecentWindow("mail:3pane");
		}
		mnpSingle.obSvc.addObserver(this_.updateObserver, "messagenotesplus_update_icons", false);
		mnpSingle.obSvc.addObserver(this_.updateObserver, "messagenotesplus_on_error", false);
		mnpSingle.obSvc.addObserver(this_.updateObserver, "messagenotesplus_on_progress", false);
		mnpSingle.obSvc.addObserver(this_.updateObserver, "messagenotesplus_note_deleted", false);
		mnpSingle.obSvc.addObserver(this_.updateObserver, "messagenotesplus_note_added", false);
		// window.setTimeout(function(){
		if (mnpSingle.isFreeDistribution) {
			this_.hideMenuItem("ShareNoteChanges");
			this_.hideMenuItem("CancelNoteLocalChanges");

			mnpSingle.init(messagenotesplus_Single.global_defs.mnpLocalProxy, messagenotesplus_Single.global_defs.mnpRemoteProxyStub, function() {
				this_.initialize2();
			});
		} else {
			mnpSingle.init(messagenotesplus_Single.global_defs.mnpLocalProxy, messagenotesplus_Single.global_defs.mnpRemoteProxy, function() {
				this_.initialize2();
			});
		}
		// }, 5000);
	};
	this.hideMenuItem = function(mnpId) {
		try {
			var cm = document.getElementById('messagenotesplusNoteCMenu');
			var e1 = cm.getElementsByAttribute("mnpId", mnpId);
			e1[0].hidden = true;
			var mc = document.getElementById('mailContext');
			var e2 = mc.getElementsByAttribute("mnpId", mnpId);
			e2[0].hidden = true;
		} catch (e3) {
			mnpSingle.alert("Failed to hide menu item: " + e3);
		}

	};
	// TOREF: move to mnpSingle
	this.initUserActions = function() {	
		var this_ = this;
		var i;
		this_.userActions = [];// resetting
		mnpSingle.logDebug("mnp key handlers initializing started. mnpSingle source: " + JSON.stringify(mnpSingle.userActions));
		for (i = 0; i < mnpSingle.userActions.length; i++) {
			var keyS = mnpSingle.loadKeyParam(mnpSingle.userActions[i][0], "Key");
			var keyMS = mnpSingle.loadKeyParam(mnpSingle.userActions[i][0], "KeyMod");
			var keyId = KeyboardEvent[keyS];
			var subset = this_.userActions[keyId];
			if (!subset) {
				subset = [];
				this_.userActions[keyId] = subset;
				// subset = this_.userActions[mnpSingle.userActions[i][2]];
			}
			var keyMods = this_.numberifyKeyMods(keyMS);
			subset[keyMods] = mnpSingle.userActions[i][0];
		}
		mnpSingle.logDebug("mnp key handlers initialized: " + this_.strigifyUserActions());
	};
	this.strigifyUserActions = function() {
		var this_ = this;
		var j, k;
		var res = "";
		for (j in this_.userActions) {
			res += j + "{";
			for (k in this_.userActions[j]) {
				res += k + ": " + this_.userActions[j][k];
			}
			res += "}";
		}
		return res;
	};
	this.numberifyKeyMods = function(str) {
		var ar = str.split('+');
		var res = 0;
		var i;
		for (i in ar) {
			if ('control' == ar[i]) {
				res += 8;
			} else if ('alt' == ar[i]) {
				res += 4;
			} else if ('shift' == ar[i]) {
				res += 2;
			} else if ('meta' == ar[i]) {
				res += 1;
			}
		}
		return res;
	};
	this.processKey = function(e) {
		var this_ = this;
		var subset = this_.userActions[e.keyCode];
		if (!subset) {
			return;
		}
		var m1 = (e.ctrlKey << 3) + (e.altKey << 2) + (e.shiftKey << 1) + (e.metaKey);
		var actionId = subset[m1];
		if (actionId) {
			this.runKeyHandler(actionId);
		}

	};
	this.runKeyHandler = function(actionId) {
		var event = 'hotkey';
		var v12345 = '';
 switch(actionId){
case 'SetNoteStatus2':messagenotesplus.pUA('setNoteStatus',2);;
break;
case 'SetNoteStatus1':messagenotesplus.pUA('setNoteStatus',1);;
break;
case 'SetNoteStatus0':messagenotesplus.pUA('setNoteStatus',0);;
break;
case 'ShowHideNote':messagenotesplus.pUA('togglemessagenotesplus');;
break;
case 'AddNote':messagenotesplus.pUA('addNote');;
break;
case 'ShareNoteChanges':messagenotesplus.pUA('shareNote');;
break;
case 'CancelNoteLocalChanges':messagenotesplus.pUA('cancelChanges');;
break;
case 'DeleteNote':messagenotesplus.pUA('deleteNote');;
break;
case 'Search':messagenotesplus.pUA('searchForNotesWithText');;
break;
case 'Memorize':messagenotesplus.pUA('memorizeNoteFromThisMessage');;
break;
case 'AddMemorized':messagenotesplus.pUA('addMemorized');;
break;
case 'Print':messagenotesplus.pUA('openPrint');;
break;
};
 v12345='';
	};
	// initialize1 : function() {
	// var this_ = this;
	//		
	//		
	// },
	this.initialize2 = function() {
		var this_ = this;

		mnpSingle.logDebug("3: initialize1");

		mnpSingle.obSvc.addObserver(this_.updateObserver, "update_messagenotesplus", false);
		mnpSingle.obSvc.addObserver(this_.updateObserver, "messagenotesplus_update_settings", false);
		mnpSingle.obSvc.addObserver(this_.updateObserver, "messagenotesplus_update_view", false);
		mnpSingle.obSvc.addObserver(this_.updateObserver, "messagenotesplus_synch", false);
		mnpSingle.obSvc.addObserver(this_.updateObserver, "messagenotesplus_note_selected", false);
		mnpSingle.obSvc.addObserver(this_.updateObserver, "messagenotesplus_update_note_pending", false);
		mnpSingle.obSvc.addObserver(this_.updateObserver, "messagenotesplus_update_note_date", false);

		// intercept calls to EnsureSubjectValue, this built in function
		// gets
		// called every time a message is loaded
		/*
		 * var this_ = this; // gMessageListeners.push({ // onStartHeaders:
		 * function () {}, // onEndHeaders: function () // { //
		 * this_.ensureSubjectValue(); // }, // onEndAttachments: function ()
		 * {}, // onBeforeShowHeaderPane: function () {} // });
		 */
		EnsureSubjectValue = this_.ensureSubjectValue;
		try {
			this_.viewType = mnpSingle.getCharPref("ShowNoteBox");
		} catch (e) {
			this_.viewType = 'ifnote';
			mnpSingle.setCharPref("ShowNoteBox", this_.viewType);
		}

		mnpSingle.logDebug("1.2: initialize1");
		try {
			mnpSingle.getBoolPref("buttons");
		} catch (e1) {
			mnpSingle.setBoolPref("buttons", true);
		}

		document.getElementById("messagenotesplusBox").hidden = true;
		this_.onFirstRun();

		var ind = document.getElementById("messagenotesplusNoteIndicator");
		if (ind) {
			ind.setAttribute("src", mnpSingle.icons.indicator);
		}

		this_.correctButtonImage("messagenotesplusToggleButton", "chrome://messagenotesplus/skin/note_icon_grey.png");
		this_.correctButtonImage("messagenotesplusDeleteButton", "chrome://messagenotesplus/skin/note_icon_delete.png");
		this_.setStatusPanel();

		this_.initialized = true;
		mnpSingle.logDebug('init ending');
		this_.runTests();
	};
	// stub
	this.runTests = function() {
	};

	this.setStatusPanel = function() {
		var l1 = document.createElement('statusbarpanel');
		if (!l1) {
			return;
		}// more than half of cases, probably some unknown windows. Cannot
		// imagine other reason.
		l1.className = 'statusbarpanel-iconic-text';
		l1.setAttribute('src', 'chrome://messagenotesplus/skin/green_light.png');
		l1.setAttribute('id', 'messagenotesplusStatus');
		l1.setAttribute('label', 'MNP');
		l1.setAttribute("tooltiptext", 'Message Notes Plus operates normally');

		var sb = document.getElementById('statusTextBox');
		var st = document.getElementById('statusText');
		sb.insertBefore(l1, st);
		// l1.style.color='#cc0000'
		// l1.setAttribute("tooltiptext", "error")
	};

	this.updateStatusPanel = function() {
		var l1 = document.getElementById('messagenotesplusStatus');
		if (!l1) {// more than half of cases, probably some unknown windows.
			// Cannot
			// imagine other reason.
			return;
		}
		var i;
		var text = "";
		var wrn = mnpSingle.getServerWarnings();
		if (wrn) {
			wrn = "Some warnings happened:" + wrn;
		}
		if (mnpSingle.currentError) {
			l1.setAttribute('src', 'chrome://messagenotesplus/skin/red_light.png');
			l1.style.color = '#cc0000';
			var message = "Some errors happened:\n- " + mnpSingle.currentError;
			if (wrn) {
				message += "\n" + wrn;
			}
			text += message;
			// l1.setAttribute("tooltiptext", message);
		} else if (wrn) {
			l1.setAttribute('src', 'chrome://messagenotesplus/skin/yellow_light.png');
			l1.style.color = 'black';
			text += wrn;
			// l1.setAttribute("tooltiptext", wrn);
		} else {
			l1.setAttribute('src', 'chrome://messagenotesplus/skin/green_light.png');
			l1.style.color = 'black';
		}
		l1.setAttribute('label', 'MNP ' + mnpSingle.remoteProxy.getOnlineState());
		if (mnpSingle.lastSuccessfulSynch) {
			if (text) {
				text += "\n";
			}
			text += mnpSingle.lastSuccessfulSynch;
		}
		l1.setAttribute("tooltiptext", text);
	};

	// sometimes XUL button image is empty. So, forcing it one more time.
	this.correctButtonImage = function(name, path) {
		var tb = document.getElementById(name);
		if (tb && !tb.image) {
			tb.image = path;
		}
	};
	// https://developer.mozilla.org/en/Code_snippets/Toolbar
	this.onFirstRun = function() {
		try {
			var firstRun = mnpSingle.getBoolPref("firstRunButton");
			// mnpSingle.logInfo('firstRun='+firstRun);
		} catch (e3) {
			// set button
			var p2 = document.getElementById("header-view-toolbar");
			var c1 = p2.firstChild;
			p2.insertItem("messagenotesplusToggleButton", c1);
			var oldSet = p2.getAttribute("currentset");
			p2.setAttribute("currentset", p2.currentSet);
			document.persist("header-view-toolbar", "currentset");

			mnpSingle.setBoolPref("firstRunButton", false);
			mnpSingle.logDebug('it was firstRun of the add-on');
		}

	};

	this.getSelectedMsgHeader = function() {
		return gFolderDisplay.selectedMessage;
		// var messageURIs = gFolderDisplay.selectedMessageUris;
		// return gFolderDisplay.messenger.msgHdrFromURI(messageURIs[0]);
	};

	this.addTag = function(messageId, tagName) {
		var this_ = this;
		var tagService = Components.classes["@mozilla.org/messenger/tagservice;1"].getService(Components.interfaces.nsIMsgTagService);
		tagService.addTag(tagName, null, null);
		// we should use messageId but not msgHdr, because the notes are binded
		// using it. And it is broader then msgHdr: one messageId can correspond
		// to many msgHdrs.
		this.actUponMessageId(messageId, tagName, function(hdr, folder, tagName) {
			var msgHdrArray = window.toXPCOMArray([ hdr ], Components.interfaces.nsIMutableArray);
			folder.addKeywordsToMessages(msgHdrArray, tagName);
			if (this_.getCurrentMessageId() == messageId) {
				gFolderDisplay.view.dbView.reloadMessage();
			}
			// msgHdr.folder.msgDatabase = null do we really need it?
		});

	};
	this.actUponMessageId = function(messageId, tagName, actor) {
		var this_ = this;
		try {
			// we should use messageId, because the notes are binded using it.
			// And it is broader then msgHdr: one messageId can correspond to
			// many msgHdrs.
			this_.glodaSearch({
				begin : 0,
				end : 1
			}, [ messageId ], function(hdr, uri) {
				if (hdr) {
					var folder = hdr.folder;
					if (folder) {
						actor(hdr, folder, tagName);
					} else {
						mnpSingle.logError("Cannot remove tag, folder is null");
					}
				} else {
					mnpSingle.logError("Cannot remove tag, msgHdr is null.");
				}
			});
		} catch (e) {
			mnpSingle.alert("Error while actUponMessageId(): " + e);
		}
	};
	this.removeTag = function(messageId, tagName) {
		var this_ = this;
		// we should use messageId but not msgHdr, because the notes are binded
		// using it. And it is broader then msgHdr: one messageId can correspond
		// to many msgHdrs.
		this.actUponMessageId(messageId, tagName, function(hdr, folder, tagName) {
			var msgHdrArray = window.toXPCOMArray([ hdr ], Components.interfaces.nsIMutableArray);
			folder.removeKeywordsFromMessages(msgHdrArray, tagName);
			if (this_.getCurrentMessageId() == messageId) {
				gFolderDisplay.view.dbView.reloadMessage();
			}
		});
	};
	this.markByTag = function(destArray) {
		// TODO:6 , use only for relatively small arrays
	};
	this.clearAllOfTag = function(messageId) {
		// TODO:6 search for tag and clear, use only for relatively small arrays
	};

	this.glodaSearch = function(context, inArray, actor, onFinish) {
		var this_ = this;
		if (context.begin < context.end) {
			var query = Gloda.newQuery(Gloda.NOUN_MESSAGE);
			query.headerMessageID.apply(query, inArray.slice(context.begin, context.end));
			var myListener = {
				// we need the stubs, since otherwise there will be a lot of
				// exceptions from gloda.
				/*
				 * called when new items are returned by the database query or
				 * freshly indexed
				 */
				onItemsAdded : function myListener_onItemsAdded(aItems, aCollection) {
				},
				/*
				 * called when items that are already in our collection get
				 * re-indexed
				 */
				onItemsModified : function myListener_onItemsModified(aItems, aCollection) {
				},
				/*
				 * called when items that are in our collection are purged from
				 * the system
				 */
				onItemsRemoved : function myListener_onItemsRemoved(aItems, aCollection) {
				},
				/* called when our database query completes */
				onQueryCompleted : function myListener_onQueryCompleted(aCollection) {
					var k = 0;
					for (k in aCollection.items) {
						var uri = aCollection.items[k].folderMessageURI;
						if (uri) {// sometimes it is null, b.e. "Google
							// account password changed", folder - "All
							// mail"
							var hdr = messenger.msgHdrFromURI(uri);
							if (hdr) {
								actor(hdr, uri);
								// mnpSingle.Notes.searchResults.push({hdr:hdr,
								// uri:uri});
							} else {
								mnpSingle.logError("Unexpected result of messenger.msgHdrFromURI: null.");
							}
						}
						// mnpSingle.Notes.searchResults
						// .push(aCollection.items[k].folderMessageURI);
					}
					this_.glodaSearch({
						begin : context.begin + 10,
						end : Math.min(context.begin + 10 + 10, inArray.length)
					}, inArray, actor, onFinish);
				}
			};
			query.getCollection(myListener);
		} else {
			mnpSingle.logDebug('Gloda search ended. Before showing the results.');
			if (context.end > 0) {
				if (onFinish) {
					onFinish();
				}
			} else {
				mnpSingle.showPopup("Nothing is found.");
			}
		}
	};

	this.searchForNotesWithText = function() {
		var this_ = this, promptService, oldSubj, newSubject, rv, accountManager, allServers, re, rslt, mID, URI, i;
		this_.searchIdx = -1;
		promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
		oldSubj = '';
		newSubject = {
			value : oldSubj
		};
		rv = promptService.prompt(window, "Search for Messages with note", "Enter search string", newSubject, null, {
			value : 0
		});
		if (!rv) {
			return;
		}
		if (!newSubject.value) {
			mnpSingle.showPopup("Invalid search expression.");
			return;
		}

		mnpSingle.logDebug('startSearch');

		mnpSingle.Notes.searchNotes(newSubject.value, function(found) {
			var i, j;
			mnpSingle.Notes.resetSearchResults();
			this_.glodaSearch({
				begin : 0,
				end : Math.min(10, found.length)
			}, found, function(hdr, uri) {
				if (!mnpSingle.Notes.searchResults[hdr.messageId]) {
					mnpSingle.Notes.searchResults[hdr.messageId] = {
						hdr : hdr,
						uri : uri
					};
					// this_.addTag(hdr, "mnp-search"); do in next release
				}
			}, function() {
				this_.finishSearch();
			});
			// asynch recursion, don't code below

		});
	};

	this.finishSearch = function() {
		var this_ = this;

		mnpSingle.logDebug('finishSearch, finished all notes');
		window.openDialog('chrome://messagenotesplus/content/search_results.xul', null,
				'resizable=yes,scrollbars=yes,status=yes,centerscreen');

	};

	this.selectFolder = function(folderUri, searchResults) {
		var this_ = this;
		// var folderTree = GetFolderTree();
		var msgFolder = MailUtils.getFolderForURI(folderUri);
		// before we can select a folder, we need to make sure it is
		// "visible"
		// in the tree. to do that, we need to ensure that all its
		// ancestors are expanded
		// var folderIndex = EnsureFolderIndex(folderTree.builderView,
		// msgFolder);
		gFolderTreeView.selectFolder(msgFolder);
		// ChangeSelection(folderTree, folderIndex);
		var msgHdr = searchResults[this_.searchIdx];
		window.setTimeout(function() {
			this_.selectMessage.apply(this_, arguments);
		}, 300, msgHdr);
	};

	this.selectMessage = function(aMessageHeader) {
		gFolderDisplay.selectMessage(aMessageHeader);
		// GetDBView().selectMsgByKey(msgKey)
	};

	this.onUpdateMessageNotesPlus = function() {
		try {
			var this_ = this;
			var messageId = this_.getMessageId(this_.getSelectedMsgHeader());
			mnpSingle.Notes.getNote(messageId, function(note) {
				this_.displayCurrentNote();
			});
		} catch (e) {
			mnpSingle.logError("Errror while processing update_messagenotesplus event: " + e);
		}
	};
	this.onUpdateView = function() {
		var this_ = this;
		try {
			var messageId = this_.getMessageId(this_.getSelectedMsgHeader());
			mnpSingle.Notes.getNote(messageId, function(note) {
				this_.displayCurrentNote();
			});
		} catch (e) {
			mnpSingle.logError("Errror while processing messagenotesplus_update_view event: " + e);
		}
	};

	this.onUpdateSettings = function() {
		var this_ = this;
		try {
			this_.initUserActions();
			this_.viewType = mnpSingle.getCharPref("ShowNoteBox");
			mnpSingle.donotblock = mnpSingle.getBoolPref("donotblock");
			mnpSingle.tagNotes = mnpSingle.getBoolPref("tagNotes");
			mnpSingle.maxPanelHeight = parseInt(mnpSingle.getCharPref("maxPanelHeight"), 10);

			var messageId = this_.getMessageId(this_.getSelectedMsgHeader());
			if (messageId) {
				mnpSingle.Notes.getNote(messageId, function(note) {
					this_.displayCurrentNote();
				});
			}
		} catch (e) {
			mnpSingle.logError("Errror while processing messagenotesplus_update_settings event: " + e);
		}
	};

	this.onUpdateIcons = function() {
		var this_ = this;
		try {
			this_.invalidateNoteStatuses();
			var ind = document.getElementById("messagenotesplusNoteIndicator");
			if (ind) {
				ind.setAttribute("src", mnpSingle.icons.indicator);
			}
		} catch (e) {
			mnpSingle.logError("Errror while processing messagenotesplus_update_icons event: " + e);
		}
	};
	this.onSynch = function() {
		var this_ = this;
		// this_.onUpdateStatuses();
		this_.displayCurrentNote();

	};
	this.onNoteSelected = function(messageUri) {
		var this_ = this;
		// var hdr = mnpSingle.Notes.getNoteField(messageId, 'hdr');
		var hdr = messenger.msgHdrFromURI(messageUri);
		if (hdr) {
			gFolderTreeView.selectFolder(hdr.folder);
			gFolderDisplay.selectMessage(hdr);
		} else {
			mnpSingle.logError("Probably invalid message uri: " + messageUri);
		}
		// this_.onUpdateStatuses();
		// this_.displayCurrentNote();

	};
	this.onNoteDeleted = function(messageId) {
		var this_ = this;
		this_.removeTag(messageId, "mnp-note");
	};
	this.onNoteAdded = function(messageId) {
		var this_ = this;
		if (!mnpSingle.tagNotes) {
			return;
		}
		this_.addTag(messageId, "mnp-note");
	};

	this.updateNoteError = function(testText) {
		var this_ = this;
		try {
			var olTextBox = document.getElementById('MessageNotesPlus_msgText');
			if (!olTextBox) {// !
				return;
			}
			var messageId = this_.getCurrentMessageId();
			if (!messageId) {
				return;
			}
			var note = mnpSingle.Notes.getNoteSynchronously(messageId);
			var err, hdoc;
			if (note) {
				if (note.state && !mnpSingle.isFreeDistribution) {
					hdoc = this_.getNotesHtmlDoc();
					err = hdoc.getElementById('messagenotesplusHtmlError');
					if (err) {
						err.style.visibility = 'visible';
						err.title = note.state;
					}
				} else {
					hdoc = this_.getNotesHtmlDoc();
					err = hdoc.getElementById('messagenotesplusHtmlError');
					if (err) {
						err.style.visibility = 'hidden';
						err.title = '';
					}
				}
				// // TODO: ! testing, remove it
				// err.style.visibility = 'visible';
				// err.title = testText;
			}
		} catch (e) {
			mnpSingle.logError("Errror while showing note error status: " + e);
		}
	};
	this.onError = function() {
		var this_ = this;
		try {
			this_.updateStatusPanel();
			this_.updateNoteError();
		} catch (e) {
			mnpSingle.logError("Errror while processing messagenotesplus_on_error event: " + e);
		}
	};
	this.onProgress = function() {
		var this_ = this;
		try {
			var olTextBox = document.getElementById('MessageNotesPlus_msgText');
			if (!olTextBox) {// !
				return;
			}
			var d1 = olTextBox.contentDocument.getElementById('messagenotesplusHtmlProgress');
			var hdoc, pr;
			if (olTextBox && d1) {
				if (mnpSingle.progress) {
					hdoc = this_.getNotesHtmlDoc();
					pr = hdoc.getElementById('messagenotesplusHtmlProgress');
					pr.style.visibility = 'visible';
				} else {
					hdoc = this_.getNotesHtmlDoc();
					pr = hdoc.getElementById('messagenotesplusHtmlProgress');
					pr.style.visibility = 'hidden';
				}
			}
		} catch (e) {
			mnpSingle.logError("Errror while processing messagenotesplus_on_progress event: " + e);
		}
	};
	this.updateObserver = {
		// this ensures that all windows ( including standalone ) will get
		// updated properly
		observe : function(subject, topic, state) {
			try {
				// var this_ = state; I don't know how to drop 'this' here
				// correctly,
				// so, delegate all to global object.
				if (messagenotesplus.initialized) {
					mnpSingle.startUserActionLife();
				}
				if (topic == "messagenotesplus_update_note_date") {
					messagenotesplus.onNoteDateChanged(state);
				} else if (topic == "messagenotesplus_synch") {
					messagenotesplus.onSynch();
				} else if (topic == "messagenotesplus_note_selected") {
					messagenotesplus.onNoteSelected(state);
				} else if (topic == "messagenotesplus_on_error") {
					messagenotesplus.onError();
				} else if (topic == "messagenotesplus_on_progress") {
					messagenotesplus.onProgress();
				} else if (topic == "update_messagenotesplus") {
					messagenotesplus.onUpdateMessageNotesPlus();
				} else if (topic == "messagenotesplus_update_note_pending") {
					messagenotesplus.onNotePending(state);
				} else if (topic == "messagenotesplus_update_settings") {
					messagenotesplus.onUpdateSettings();
				} else if (topic == "messagenotesplus_update_view") {
					messagenotesplus.onUpdateView();
				} else if (topic == "messagenotesplus_update_icons") {
					messagenotesplus.onUpdateIcons();
				} else if (topic == "messagenotesplus_note_deleted") {
					messagenotesplus.onNoteDeleted(state);
				} else if (topic == "messagenotesplus_note_added") {
					messagenotesplus.onNoteAdded(state);
				}
			} catch (e) {
				mnpSingle.logError("updateObserver error: " + e);
			}
		}
	};

	this.onTxtContextShowing = function(popupNode) {
		mnpSingle.logDebug('ontxt');
		var children = popupNode.childNodes;
		var i;
		for (i = 0; i < children.length; i++) {
			var command = children[i].getAttribute("cmd");
			if (command) {
				var controller = document.commandDispatcher.getControllerForCommand(command);
				var enabled = controller.isCommandEnabled(command);
				if (enabled) {
					children[i].removeAttribute("disabled");
				} else {
					children[i].setAttribute("disabled", "true");
				}
			}
		}
	};

	this.messagePaneOnLoad = function() {
	};

	this.onKeypress = function(event) {
	};

	this.onClickBox = function(event) {
	};
	this.getNotesHtmlBody = function(olTextBox) {
		return this.getNotesHtmlDoc(olTextBox).body;
	};
	this.getNotesHtmlDoc = function(olTextBox) {
		if (!olTextBox) {
			olTextBox = document.getElementById('MessageNotesPlus_msgText');
		}
		return olTextBox.contentDocument;
	};
	this.additem = function(note) {
		var this_ = this;
		mnpSingle.logDebug('additem, adding >' + note.note + '< notes to notes box');
		var olTextBox = document.getElementById('MessageNotesPlus_msgText');
		var d1 = olTextBox.contentDocument.getElementById('mnp-html-dynamic-content');
		//d1.innerHTML = mnpSingle.Notes.getNotesHtml(note);

		// moved to hote.js.
		// this_.executeHtmlJs("messagenotesplusInitNotesHtml(jQuery);");
		this_.initNoteHtml(note, d1);

		var body = this_.getNotesHtmlBody(olTextBox);
		body.style.padding = 0;
		body.style.margin = 0;
		body.setAttribute('messageId', note.messageId);
		// autosize note area
		var vb = document.getElementById('messagenotesplusBox');
		if (d1.clientHeight < mnpSingle.maxPanelHeight) {
			vb.height = d1.clientHeight;
		} else {
			vb.height = mnpSingle.maxPanelHeight;
		}

		return;
	};
	this.initNoteHtml = function(note, mainParent) {
		var this_ = this;
		// mnpSingle.logDebug('executing js code on mnp html');
		var olTextBox = document.getElementById('MessageNotesPlus_msgText');
		var hdoc = olTextBox.contentDocument;
		hdoc.mnpInitNoteHtml(hdoc.jQuery, document, this_, note, mainParent);
		// olTextBox.contentDocument.messagenotesplusXulDoc = document;
		// olTextBox.contentDocument.messagenotesplusXulWindow = window;
		// olTextBox.contentDocument.messagenotesplus = this_;
		// execute inner script from outside:
		// http://stackoverflow.com/questions/2592092/executing-script-elements-inserted-with-innerhtml?rq=1
		// var script = olTextBox.contentDocument.createElement('script');
		// script.type = "text/javascript";
		// script.appendChild(olTextBox.contentDocument.createTextNode(code));
		// var body = this_.getNotesHtmlBody(olTextBox);
		// body.insertBefore(script, d1);
		// body.removeChild(script);
	};
	// deprecated
	// this.executeHtmlJs = function(code) {
	// var this_ = this;
	// // mnpSingle.logDebug('executing js code on mnp html');
	// var olTextBox = document.getElementById('MessageNotesPlus_msgText');
	// var d1 = olTextBox.contentDocument
	// .getElementById('mnp-html-dynamic-content');
	// // olTextBox.contentDocument.messagenotesplusXulDoc = document;
	// // olTextBox.contentDocument.messagenotesplusXulWindow = window;
	// // olTextBox.contentDocument.messagenotesplus = this_;
	// // execute inner script from outside:
	// //
	// http://stackoverflow.com/questions/2592092/executing-script-elements-inserted-with-innerhtml?rq=1
	// var script = olTextBox.contentDocument.createElement('script');
	// script.type = "text/javascript";
	// script.appendChild(olTextBox.contentDocument.createTextNode(code));
	// var body = this_.getNotesHtmlBody(olTextBox);
	// body.insertBefore(script, d1);
	// body.removeChild(script);
	// };

	this.deleteNote = function() {
		var this_ = this;
		mnpSingle.logDebug('deleteNote started');

		var messageId = this_.getMessageId(this_.getSelectedMsgHeader());

		mnpSingle.Notes.deleteNote(messageId);
	};

	this.memorizeNoteFromThisMessage = function() {
		var this_ = this;
		mnpSingle.logDebug('memorizeNote started');

		this_.memorizedMessageId = this_.getMessageId(this_.getSelectedMsgHeader());
	};

	this.addMemorized = function(onAfter) {
		var this_ = this;
		mnpSingle.logDebug('addMemorized started');

		var sels = gFolderDisplay.selectedMessages;

		mnpSingle.Notes.getNote(this_.memorizedMessageId, function(fromNote) {
			var msgHdr;
			var walkSelected = function(context, messages) {
				if (context.i < sels.length) {
					var messageId = this_.getMessageId(sels[context.i]);
					context.i++;
					var toNote = mnpSingle.Notes.getNoteSynchronously(messageId);
					if (fromNote.note) {
						var my_subnote = JSON.parse(fromNote.note);
						var newNote = mnpSingle.localProxy.createNoteObj(messageId, my_subnote.body, my_subnote.status);
						newNote.status = toNote.status;
						if (fromNote.lstatus != undefined) {
							newNote.lstatus = fromNote.lstatus;
						}
						mnpSingle.Notes.saveOrAddToLocal(messageId, newNote, function() {
							// mnpSingle.Notes.setNoteField(messageId,
							// 'status', -1);
							walkSelected(context, sels);
						}, true);
					} else {
						walkSelected(context, sels);
					}

				} else {
					mnpSingle.obSvc.notifyObservers(null, "update_messagenotesplus", null);
					this_.invalidateNoteStatuses();
					if (onAfter) {
						onAfter();
					}
				}
			};
			walkSelected({
				i : 0
			}, sels);

		});

		// this_.memorizedMessageId =
		// this_.getMessageId(this_.getSelectedMsgHeader());
	};

	this.ensureSubjectValue = function() {
		// var this_ = this; this_ is invalid here.
		document.getElementById("messagenotesplusBox").hidden = true;
		var messageId = messagenotesplus.getMessageId(messagenotesplus.getSelectedMsgHeader());
		mnpSingle.obSvc.notifyObservers(null, "update_messagenotesplus", messageId);
	};

	this.addNote = function() {
		var this_ = this;
		this_.addTextBoxNote();
		return;

	};

	this.addTextBoxNote = function() {
		var this_ = this;
		if (!this_.getSelectedMsgHeader()) {
			mnpSingle
					.showPopup("Please select a message to what you want to add note. Then use the add note button or context menu to add note.");
		}
		var messageId = this_.getMessageId(this_.getSelectedMsgHeader());
		this_.addNoteFor(messageId, "");
	};
	// asynch
	this.addNoteFor = function(messageId, msgNote, onSuccess) {
		var this_ = this;
		mnpSingle.Notes.addNote(messageId, msgNote, function() {
			mnpSingle.obSvc.notifyObservers(null, "update_messagenotesplus", null);
			window.setTimeout(function() {
				this_.textBoxFocus.apply(this_, arguments);
			}, 1500);
			if (onSuccess) {
				onSuccess();
			}
		});
	};

	this.textBoxFocus = function() {
		var this_ = this;
		var oBox = document.getElementById("MessageNotesPlus_msgText");
		if (oBox && oBox.contentDocument) {
			var cont = oBox.contentDocument.getElementById("messagenotesplusNoteContent");
			if (cont) {
				cont.focus();
			}
		}
	};

	this.onNotePendingTimer = null;
	this.onNotePendingImpl = function(pending) {
		var this_ = this;
		try {
			this_.invalidateNoteStatuses();
			var olTextBox = document.getElementById('MessageNotesPlus_msgText');
			if (!olTextBox) {// !
				return;
			}
			var hdoc, pend;
			if (olTextBox) {
				if (pending == "true" && !mnpSingle.isFreeDistribution) {
					hdoc = this_.getNotesHtmlDoc();
					pend = hdoc.getElementById('messagenotesplusHtmlPending');
					if (pend) {
						pend.style.visibility = 'visible';
					}

				} else {
					hdoc = this_.getNotesHtmlDoc();
					pend = hdoc.getElementById('messagenotesplusHtmlPending');
					if (pend) {
						pend.style.visibility = 'hidden';
					}
					
				}

			}
		} catch (e) {
			mnpSingle.logError("Errror while processing messagenotesplus_update_note_pending event: " + e);
		}

	};
	this.onNotePending = function(pending) {
		var this_ = this;
		window.clearTimeout(this_.onNotePendingTimer);
		this_.onNotePendingTimer = null;
		this_.onNotePendingTimer = window.setTimeout(function() {
			this_.onNotePendingImpl(pending);
		}, 200);
	};
	this.onNoteDateChanged = function(dateString) {
		var this_ = this;
		try {
			var olTextBox = document.getElementById('MessageNotesPlus_msgText');
			if (!olTextBox) {// !
				return;
			}			
			if (olTextBox) {
				var hdoc = this_.getNotesHtmlDoc();
				var date = hdoc.getElementById('messagenotesplusHtmlDate');
				date.textContent = dateString;				
				
//				if (dateString) {
//					this_.executeHtmlJs("var date = document.getElementById('messagenotesplusHtmlDate');" + " date.innerHTML='"
//							+ dateString + "';");
//
//				}

			}
		} catch (e) {
			mnpSingle.logError("Errror while processing messagenotesplus_update_note_date event: " + e);
		}

	};
	this.shareNote = function(onAfter) {
		var this_ = this;
		var hdr = this_.getSelectedMsgHeader();// it works ok, even for
		// separated message windows and
		// even when in folder tree is
		// selected different message.
		var editingMessageId;
		var olTextBox = document.getElementById('MessageNotesPlus_msgText');
		if (hdr) {
			if (olTextBox) {
				var body = this_.getNotesHtmlBody(olTextBox);
				if (body) {
					editingMessageId = body.getAttribute('messageId');
					if (editingMessageId && editingMessageId == hdr.messageId) {
						var area = olTextBox.contentDocument.getElementById('messagenotesplusNoteContent');
						if (area) {
							mnpSingle.Notes.saveTextToLocal(editingMessageId, area.value, function() {
								mnpSingle.remoteProxy.saveLocalToRemote(editingMessageId, function() {
									mnpSingle.remoteProxy.notifyUi();
									if(onAfter){
										onAfter();
									}
								});
							}, null, true);
							return;
						}
					}
				}
			}
			mnpSingle.remoteProxy.saveLocalToRemote(hdr.messageId, function() {
				mnpSingle.remoteProxy.notifyUi();
				if(onAfter){
					onAfter();
				}
			});
		}// else no message selected - ok.
	};

	this.cancelChanges = function() {
		var this_ = this;
		var hdr = this_.getSelectedMsgHeader();
		if (hdr) {
			mnpSingle.Notes.cancelLocalChanges(hdr.messageId);
		}// else no message selected - ok.
	};
	this.saveTextToLocal = function(messageId, value) {
		mnpSingle.Notes.saveTextToLocal(messageId, value);
	};
	this.onTextBoxInputDelayedAutoSave = function(window, messageId, value) {
		mnpSingle.Notes.onTextBoxInputDelayedAutoSave(window, messageId, value);
	};
	this.saveJoinToLocal = function(messageId) {
		mnpSingle.Notes.saveJoinToLocal(messageId);
	};

	this.getCurrentMessageId = function() {
		var this_ = this;
		var body = this_.getNotesHtmlBody();
		return body.getAttribute('messageId');
	};

	// perform user action. wrap any start of activity. currently there are
	// wrapped only user actions , but probably it is worth to wrap any
	// activity
	// starts.
	this.pUA = function(methodName) {//here are var args possible.
		var this_ = this;
		var mainThis = this_;
		// if (this_.TBmain != null) {
		// mainThis = this_.TBmain.messagenotesplus;
		// } else {
		// mainThis = this_;
		// }
		if (!this_.initialized) {
			mnpSingle
					.alert("Action cannot be performed. Message notes plus extension is not initialized. Please try to restart Thunderbird and see"
							+ " what kind of errors are produced.");
			return;
		}
		try {
			var firstRun = mnpSingle.getBoolPref("firstRunColumn");
			// mnpSingle.logInfo('firstRun='+firstRun);
		} catch (e3) {
			// set column
			var noteStatus = document.getElementById("MessageNotesPlus_noteStatus");
			noteStatus.removeAttribute("hidden");
			mnpSingle.setBoolPref("firstRunColumn", false);
		}

		mnpSingle.startUserActionLife();
		mnpSingle.alertFloodCount = 0;

		var args = Array.prototype.slice.call(arguments);
		mainThis[methodName].apply(mainThis, args.slice(1));
	};

	this.setNoteStatus = function(status_) {
		var this_ = this;
		var messageId = this_.getMessageId(this_.getSelectedMsgHeader());

		mnpSingle.Notes.setNoteStatus(messageId, status_, function onSuccess() {
			this_.invalidateCurrentNoteStatus();
			mnpSingle.logDebug("status setted to = " + status_);
		});
	};
	this.invalidateNoteStatusesTimer = null;
	this.invalidateNoteStatuses = function() {
		var this_ = this;
		window.clearTimeout(this_.invalidateNoteStatusesTimer);
		this_.invalidateNoteStatusesTimer = null;
		this_.invalidateNoteStatusesTimer = window.setTimeout(function() {
			var o1 = document.getElementById("threadTree");
			if (o1) {
				// o1.treeBoxObject.invalidate();
				mnpSingle.logDebug('invalidateNoteStatuses executing');
				o1.treeBoxObject.invalidateColumn(o1.treeBoxObject.columns.MessageNotesPlus_noteStatus);
				// o1.treeBoxObject.columns.noteStatus.invalidate();
			}
		}, 500);

	};
	this.invalidateCurrentNoteStatusTimer = null;
	this.invalidateCurrentNoteStatus = function() {
		var this_ = this;
		// beginUpdateBatch();https://developer.mozilla.org/en/nsITreeBoxObject
		// endUpdateBatch();
		// tree.columns["lastName"];
		// https://developer.mozilla.org/en/Tree_Widget_Changes
		// void invalidateColumn(in nsITreeColumn col);
		window.clearTimeout(this_.invalidateCurrentNoteStatusTimer);
		this_.invalidateCurrentNoteStatusTimer = null;
		mnpSingle.logDebug('invalidateCurrentNoteStatus called');
		this_.invalidateCurrentNoteStatusTimer = window.setTimeout(function() {
			var o1 = document.getElementById("threadTree");
			if (o1) {
				mnpSingle.logDebug('invalidateCurrentNoteStatus executing');
				o1.treeBoxObject.invalidateColumn(o1.treeBoxObject.columns.MessageNotesPlus_noteStatus);
				// o1.treeBoxObject.columns.noteStatus.invalidate();
				// o1.treeBoxObject.invalidate();
			}
		}, 200);
	};

	this.getNoteStatus = function(msgHdr) {
		var this_ = this;
		var messageId = this_.getMessageId(msgHdr);
		return mnpSingle.Notes.getNoteStatus(messageId, function() {
			this_.invalidateCurrentNoteStatus();
		}, window);
	};
	// sorting is hard to implement correctly because:
	// 1) current implementation of local db layer cannot process infinite large
	// packs of notes requests.
	// 2) it's hard to call refreshSort at the end. it is almost alway
	// overlapped by invalidateCurrentNoteStatus.
	//	
	// this.refreshSortTimer = null;
	// this.refreshSort = function() {
	// var this_ = this;
	// // beginUpdateBatch();https://developer.mozilla.org/en/nsITreeBoxObject
	// // endUpdateBatch();
	// // tree.columns["lastName"];
	// // https://developer.mozilla.org/en/Tree_Widget_Changes
	// // void invalidateColumn(in nsITreeColumn col);
	// window.clearTimeout(this_.refreshSortTimer);
	// this_.refreshSortTimer = null;
	// mnpSingle.logDebug('refreshSort called');
	// this_.refreshSortTimer = window
	// .setTimeout(
	// function() {
	// var o1 = document.getElementById("threadTree");
	// if (o1) {
	// mnpSingle
	// .logDebug('refreshSort executing');
	// //double the call, to deal with reversing
	// window.HandleColumnClick('MessageNotesPlus_noteStatus');
	// window.HandleColumnClick('MessageNotesPlus_noteStatus');
	// //o1.treeBoxObject
	// //
	// .invalidateColumn(o1.treeBoxObject.columns.MessageNotesPlus_noteStatus);
	// // o1.treeBoxObject.columns.noteStatus.invalidate();
	// // o1.treeBoxObject.invalidate();
	// }
	// }, 200);
	// };
	// this.getNoteSortOrder = function(msgHdr) {
	// var this_ = this;
	// var messageId = this_.getMessageId(msgHdr);
	// mnpSingle.logDebug('getNoteSortOrder called');
	// return mnpSingle.Notes.getNoteStatus(messageId, null, window, function()
	// {
	// mnpSingle.logDebug('before refreshSort');
	// this_.refreshSort();
	// });
	// };

	this.togglemessagenotesplus = function() {
		var this_ = this;
		var but = document.getElementById("messagenotesplusToggleButton");
		if (but.label == 'Add Note') {
			this_.addTextBoxNote();
			return;
		}
		var hdr = this_.getSelectedMsgHeader();
		var messageId = this_.getMessageId(hdr);
		var note = mnpSingle.Notes.getNote(messageId, function onAfter(note) {
			if (note) {
				var messagenotesplusBox = document.getElementById("messagenotesplusBox");
				if (messagenotesplusBox.hidden) {
					// we need to store visibility, because display note may be
					// called multiple times.
					note.visibility = this_.VISIBLE;
					this_.displayCurrentNote();
				} else {
					note.visibility = this_.INVISIBLE;
					this_.displayCurrentNote();
				}
			} else {
				this_.displayCurrentNote();
			}
		});

	};

	this.getCurrentNote = function() {
		var this_ = this;
		var note = null;
		var messageId = this_.getMessageId(this_.getSelectedMsgHeader());
		note = mnpSingle.Notes.getNoteSynchronously(messageId);
		return note;
	};

	this.saveReadTimer = null;
	this.saveRead = function(note) {
		var this_ = this;
		window.clearTimeout(this_.saveReadTimer);
		this_.saveReadTimer = null;
		this_.saveReadTimer = window.setTimeout(function() {
			var messageId = this_.getMessageId(this_.getSelectedMsgHeader());
			if (messageId == note.messageId) {
				mnpSingle.logDebug('saveRead called');
				mnpSingle.Notes.saveRead(note, function() {
					this_.invalidateCurrentNoteStatus();
				});
			}
		}, 1000);
	};
	this.displayCurrentNote = function(note, visibility) {
		var this_ = this;
		note = this_.getCurrentNote();

		mnpSingle.logDebug('begin display notes');
		var notesBox = document.getElementById("messagenotesplusBox");
		var but = document.getElementById("messagenotesplusToggleButton");
		// think before adding logic to the calcLabel. The visibility is
		// calculated below and the calcLabel should just use he result.
		var calcLabel = function(note, hidden, effectiveStatus) {
			if (!note || effectiveStatus == -2) {
				return 'Add Note';
			}
			if (note && hidden) {
				return 'Show Note';
			}
			if (note) {
				return 'Hide Note';
			}
		};

		// now get the message id of the displayed message
		try {
			// var hdr = this_.getSelectedMsgHeader();
			// var messageId = this_.getMessageId(hdr);
			// var note = mnpSingle.notes[messageId];
			var indicator = document.getElementById("messagenotesplusNoteIndicator");
			var effectiveStatus;
			if (mnpSingle.isFreeDistribution && note.lstatus != undefined) {
				effectiveStatus = note.lstatus;
			} else if(!mnpSingle.isFreeDistribution && note.pending){
				effectiveStatus = 0;//we use it only to decide if it is visible or not, so any value != -4,-2 is fine.
			}else{
				effectiveStatus = note.status;
			}
			

			if (note && effectiveStatus != -2) {
				indicator.setAttribute('hidden', false);
				// calc visibility
				if ((this_.viewType == 'ifnote' && note.visibility != this_.INVISIBLE && effectiveStatus != -4)
						|| note.visibility == this_.VISIBLE) {
					notesBox.hidden = false;
					// if(messageId===mnpSingle.lockedNoteMessageId){
					// this_
					// .updateViewLockState(note.messageId ==
					// mnpSingle.lockedNoteMessageId);
					this_.additem(note);
					this_.saveRead(note);
					// but.label = 'Hide Notes';
				} else {
					notesBox.hidden = true;
				}
			} else {
				notesBox.hidden = true;
				indicator.setAttribute('hidden', true);
			}
			but.label = calcLabel(note, notesBox.hidden, effectiveStatus);
			this_.invalidateCurrentNoteStatus();
		} catch (e) {
			mnpSingle.logError('Exception: display notes: ' + e);
		}
		mnpSingle.logDebug('end display notes');
	};
	this.getMessageId = function(msgHdr) {
		if (!msgHdr) {
			return null;
		}
		var messageId = msgHdr.messageId;
		if (messageId.substring(0, 3) == 'md5') {
			messageId = msgHdr.dateInSeconds + messageId;
		}
		return messageId;
	};

	this.showHelp = function() {
		window.openContentTab("chrome://messagenotesplus/content/free/help.html");
	};
	// https://developer.mozilla.org/en-US/docs/DOM/window.btoa
	this.utf8_to_b64 = function(str) {
		return window.btoa(window.unescape(window.encodeURIComponent(str)));
	};
	this.b64_to_utf8 = function(str) {
		return window.decodeURIComponent(window.escape(window.atob(str)));
	};
	this.openPrint = function(){
	    //var messageId = this.getCurrentMessageId(); buggy, seems cashing old ids.	    
	    var msgHdr = this.getSelectedMsgHeader();
	    if(!msgHdr){
	        mnpSingle.showPopup("Nothing to print. No message is selected.");
	        return;
	    }
	    var hdc = document.getElementById('messagepane');
	    if(!hdc || !hdc.contentDocument || !hdc.contentDocument.URL){
	        mnpSingle.showPopup("Nothing to print. Message should be visible before printing.");
            return;
	    }
	    var note = this.getCurrentNote();
	    var notesBox = document.getElementById("messagenotesplusBox");
	    if(notesBox.hidden){
	        note = null;
	    }
	    //var uri =  messageURIs[0];
	    window.openDialog ('chrome://messagenotesplus/content/print.xul', null,
	            'resizable=yes,scrollbars=yes,status=yes,centerscreen', note, hdc.contentDocument.URL);
	};

};
messagenotesplus = new messagenotesplus_Single.global_decls.Messagenotesplus();

window.addEventListener("load", function(e) {
	'use strict';
	messagenotesplus.initialize();
}, false);

// window.addEventListener("load", function(e) { messagenotesplus .onLoad(e); },
// false);
