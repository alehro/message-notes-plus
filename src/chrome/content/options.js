/*global Components: false, Components: false, messagenotesplus_Single: false,  
 document: false, window: false, userActionsCollectionFromAnt: false
 */
Components.utils.import("resource://msgmodules/s3.js");

var messagenotesplusOptions = (function() {
	'use strict';
	var mnpSingle = messagenotesplus_Single;
	return {
		_elementIDs : [ 'MNdebug', 'MNshow', 'MNDoNotBlock', 'MNServerTimeout', 'MNtagNotes', 'MNmultiUser', 'MNmaxPanelHeight' ],
		obSvc : Components.classes["@mozilla.org/observer-service;1"].getService(Components.interfaces.nsIObserverService),

		updateObserver : {
			observe : function(subject, topic, state) {
				var this_ = this;
				try {
					// var this_ = state; I don't know how to drop 'this' here
					// correctly,
					// so, delegate all to global object.
					if (topic == "messagenotesplus_update_userInfo") {
						this_.holder.optionsPlus.updateUserInfo();
					}
				} catch (e) {
					Components.utils.reportError(e);
				}
			}
		},
		
		setDistributionType : function() {
			mnpSingle.updateDistributionType();
			var el3 = document.getElementById('MNmultiUser');
			if (mnpSingle.isFreeDistribution) {
				el3.checked = 'false';
			} else {
				el3.checked = 'true';
			}
		},

		init : function() {
			try {
				var this_ = this;				
				if (mnpSingle.isFreeDistribution) {
					this_.optionsPlus = messagenotesplus_Single.global_defs.mnpOptionsStub;
				}else{
					this_.optionsPlus = messagenotesplus_Single.global_defs.mnpOptions;
				}
				this_.optionsPlus.init(this_);
				this_.updateObserver.holder = this_;
				this_.setDistributionType();
				this_.obSvc.addObserver(this_.updateObserver, "messagenotesplus_update_userInfo", false);
				this_.optionsPlus.updateUserInfo();			
				this_.updateIcons();
				// initialize the default window values...
				var i;
				for (i = 0; i < this_._elementIDs.length; i++) {
					var elementID = this_._elementIDs[i];
					var element = document.getElementById(elementID);
					if (!element) {
						break;
					}
					var eltType = element.localName;

					if (eltType == "radiogroup") {
						try {
							var itm = mnpSingle.getCharPref(element.getAttribute("prefstring"));
							if (itm == 'never') {
								itm = 0;
							} else if (itm == 'ifnote') {
								itm = 1;
							}
							element.selectedItem = element.childNodes[itm];
						} catch (e) {
							element.selectedItem = element.childNodes[3];
							try {
								mnpSingle.setCharPref(element.getAttribute("prefstring"), element.getAttribute("defaultpref"));
							} catch (e1) {
							}
						}
					} else if (eltType == "checkbox") {
						try {
							element.checked = (mnpSingle.getBoolPref(element.getAttribute("prefstring")) == true);
						} catch (e2) {
							element.checked = (element.getAttribute("defaultpref") == "true");
							try {
								mnpSingle.setBoolPref(element.getAttribute("prefstring"), element.getAttribute("defaultpref") == "true");
							} catch (e3) {
							}
						}
					} else if (eltType == "textbox") {
						try {
							element.setAttribute("value", mnpSingle.getCharPref(element.getAttribute("prefstring")));
						} catch (e4) {
							element.setAttribute("value", element.getAttribute("defaultpref"));
							try {
								mnpSingle.setCharPref(element.getAttribute("prefstring"), element.getAttribute("defaultpref"));
							} catch (e5) {
							}
						}
					} else if (eltType == "menulist") {
						try {
							element.value = mnpSingle.getIntPref(element.getAttribute("prefstring"));
						} catch (e6) {
							element.value = element.getAttribute("defaultpref");
							try {
								mnpSingle.setIntPref(element.getAttribute("prefstring"), element.getAttribute("defaultpref"));
							} catch (e7) {
							}
						}
					}
				}
				this_.initKeyBindings();
			} catch (e8) {
				Components.utils.reportError(e8);
			}
		},
		

		updateIcons : function() {
			try {
				try {
					var default_dir = Components.classes["@mozilla.org/file/local;1"]
						.createInstance(Components.interfaces.nsILocalFile);
					default_dir.initWithPath(mnpSingle.extPath.path);
					default_dir.append("assets");
					default_dir.append("icons");
					document.getElementById("defaultIconsFolderPath").value = default_dir.path;
					var path = mnpSingle.getCharPref("customIconsFolderPath");
					document.getElementById("customIconsFolderPath").value = path;
				} catch (e) {
				}
		
			} catch (e1) {
				Components.utils.reportError(e1);
			}
		},
		applyIcons : function() {
			try {
				var this_ = this;
				var path = document.getElementById("customIconsFolderPath").value;		
				mnpSingle.setCharPref("customIconsFolderPath", path);
				mnpSingle.updateIcons(function() {
					mnpSingle.showPopup("Icons are applied successfully.\nYou may need to restart the Thunderbird to get them updated.");
				});			
			} catch (e1) {
				Components.utils.reportError(e1);
			}
		},
		selectIconsFolder : function() {
			try {
				var this_ = this;
				var nsIFilePicker = Components.interfaces.nsIFilePicker;
				var fp = Components.classes["@mozilla.org/filepicker;1"].createInstance(nsIFilePicker);
				fp.init(window, "Select folder with your icons", nsIFilePicker.modeGetFolder);
				try {
					var path = mnpSingle.getCharPref("customIconsFolderPath");
					var custom_dir = Components.classes["@mozilla.org/file/local;1"].createInstance(Components.interfaces.nsILocalFile);
					custom_dir.initWithPath(path);
					fp.displayDirectory = custom_dir;
					document.getElementById("customIconsFolderPath").value = path;
				} catch (e) {
				}

				var res = fp.show();
				if (res != nsIFilePicker.returnCancel) {
					document.getElementById("customIconsFolderPath").value = fp.file.path;
				}
			} catch (e1) {
				Components.utils.reportError(e1);
			}
		},

		initKeyBindings : function() {
			try {
				var this_ = this;			
				var i;
				for (i = 0; i < mnpSingle.userActions.length; i++) {
					this_.initTextBoxValue("MNP" + mnpSingle.userActions[i][0] + "KeyTextBox", mnpSingle.userActions[i][0] + "Key", mnpSingle.userActions[i][2]);
					this_.initTextBoxValue("MNP" + mnpSingle.userActions[i][0] + "KeyModTextBox", mnpSingle.userActions[i][0] + "KeyMod", mnpSingle.userActions[i][3]);
				}
			} catch (e) {
				Components.utils.reportError(e);
			}
		},

		initTextBoxValue : function(elemId, prefName, defaultPref) {
			var el = document.getElementById(elemId);
			try {
				el.value = mnpSingle.getCharPref(prefName);
				//el.setAttribute("value", mnpSingle.getCharPref(prefName));
			} catch (e4) {
				el.value = defaultPref;
				//el.setAttribute("value", defaultPref);
				try {
					mnpSingle.setCharPref(prefName, el.value);
				} catch (e5) {
				}
			}
		},
		saveKeyBindings : function() {
			try {
				var this_ = this;				
				var userActions = [["SetNoteStatus2","Important","","","messagenotesplus.pUA('setNoteStatus',2);"],["SetNoteStatus1","Needs attention","","","messagenotesplus.pUA('setNoteStatus',1);"],["SetNoteStatus0","Normal","","","messagenotesplus.pUA('setNoteStatus',0);"],["ShowHideNote","Show/Hide Note","DOM_VK_F9","shift","messagenotesplus.pUA('togglemessagenotesplus');"],["AddNote","Add Note","DOM_VK_F9","control","messagenotesplus.pUA('addNote');"],["ShareNoteChanges","Share Note Changes","DOM_VK_F9","control+shift","messagenotesplus.pUA('shareNote');"],["CancelNoteLocalChanges","Cancel Note Local Changes","DOM_VK_F11","control+shift","messagenotesplus.pUA('cancelChanges');"],["DeleteNote","Delete note","DOM_VK_F12","control+shift","messagenotesplus.pUA('deleteNote');"],["Search","Search","DOM_VK_F3","control","messagenotesplus.pUA('searchForNotesWithText');"],["Memorize","Memorize Note","","","messagenotesplus.pUA('memorizeNoteFromThisMessage');"],["AddMemorized","Add Memorized Note","","","messagenotesplus.pUA('addMemorized');"],["Print","Print...","","","messagenotesplus.pUA('openPrint');"]];
				var i;
				for (i = 0; i < userActions.length; i++) {
					var key = document.getElementById("MNP" + userActions[i][0] + "KeyTextBox").value;
					var mods = document.getElementById("MNP" + userActions[i][0] + "KeyModTextBox").value;
					mnpSingle.setCharPref(userActions[i][0] + "Key", key);
					mnpSingle.setCharPref(userActions[i][0] + "KeyMod", mods);
				}
			} catch (e) {
				Components.utils.reportError(e);
			}
		},

		savePrefs : function() {
			try {
				var this_ = this;
		
				var i;
				for (i = 0; i < this_._elementIDs.length; i++) {
					var elementID = this_._elementIDs[i];
					var element = document.getElementById(elementID);
					if (!element) {
						break;
					}
					var eltType = element.localName;
					if (eltType == "radiogroup") {
						mnpSingle.setCharPref(element.getAttribute("prefstring"), element.value);
					} else if (eltType == "checkbox") {
						mnpSingle.setBoolPref(element.getAttribute("prefstring"), element.checked);
					} else if (eltType == "textbox" && element.preftype == "int") {
						mnpSingle.setIntPref(element.getAttribute("prefstring"), parseInt(element.getAttribute("value"), 10));
					} else if (eltType == "textbox" && element.id == "quickreplyIdent") {
						mnpSingle.setIntPref(element.getAttribute("prefstring"), parseInt(element.value, 10));
					}
				
					else if (eltType == "textbox" && element.id == "MNServerTimeout") {
						mnpSingle.setCharPref(element.getAttribute("prefstring"), element.value);
					} else if (eltType == "textbox" && element.id == "MNmaxPanelHeight") {
						mnpSingle.setCharPref(element.getAttribute("prefstring"), element.value);
					} else if (eltType == "menulist") {
						mnpSingle.setIntPref(element.getAttribute("prefstring"), parseInt(element.value, 10));
					}
				}
				this_.saveKeyBindings();
				this_.obSvc.notifyObservers(null, "messagenotesplus_update_settings", null);
			} catch (e) {
				Components.utils.reportError(e);
			}
		}
	};
}());