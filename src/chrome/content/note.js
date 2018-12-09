/*global messagenotesplus_Single: false,  
 window: false, document: false, setTimeout: false, clearTimeout: false, jQuery: false
 */
var messagenotesplusInitNotesHtml = function($, messagenotesplusXulDoc, mnp, note, mainParent) {
	'use strict';
	var mnpSingle = messagenotesplus_Single;
	document.messagenotesplus = mnp;

	var subnotes = mnpSingle.Notes.extractSubnotes(note);
	var joined = false;
	var isMy = function(subnote) {
		return (!subnote.name || mnpSingle.remoteProxy.myEmail == subnote.name);
	};
	var crAA = function(parent, name, fields, style, customFunc) {
		var tag1 = document.createElement(name);
		if (fields) {
			var i;
			for (i in fields) {
				tag1[i] = fields[i];
			}
		}
		if (style) {
			var j;
			for (j in style) {
				tag1.style[j] = style[j];
			}
		}
		if (customFunc) {
			customFunc(tag1);
		}
		parent.appendChild(tag1);
		return tag1;
	};
	this.appendSubnoteHtmlObj = function(subnote, mainParent) {
		if (!subnote) {//actually it is impossible if the logic works 100% => data integrity 100%
			mnpSingle.logError("Error while preparing to show the note. Missing subnote.");
			return;
		}
		var noteHeader = document.createElement('div');
		noteHeader.className = 'messagenotesplusNoteHeader cmenu1';
		mainParent.appendChild(noteHeader);
		if (!mnpSingle.isFreeDistribution && isMy(subnote)) {
			crAA(noteHeader, 'button', {
				id : 'messagenotesplusHtmlButtonEdit',
				className : 'messagenotesplusHtmlButton',
				title : 'Send local note changes to the server, so, that all users of your group will receive them.',
				textContent : 'Share'
			}, null, function(elem) {
				elem.onclick = function(event) {
					document.messagenotesplus.pUA('shareNote');
				};
			});
			crAA(noteHeader, 'img', {
				id : 'messagenotesplusHtmlProgress',
				src : 'chrome://messagenotesplus/skin/ajax-loader.gif'
			}, {
				visibility : 'hidden'
			});
		}
		if (subnote.name) {
			noteHeader.appendChild(document.createTextNode(mnpSingle.unwrapUserName(subnote.name) + ", "));	
		} else if (mnpSingle.remoteProxy && mnpSingle.remoteProxy.myEmail) {
			noteHeader.appendChild(document.createTextNode(mnpSingle.unwrapUserName(mnpSingle.remoteProxy.myEmail) + ", "));		
		}

		if (isMy(subnote)) {
			crAA(noteHeader, 'span', {
				id : 'messagenotesplusHtmlDate'
			}, null, function(elem) {
				elem.appendChild(document.createTextNode(mnpSingle.Notes.getDateString(new Date(subnote.date))));
			});
		
			var pendingVisibility;
			if (note.pending && !mnpSingle.isFreeDistribution) {
				pendingVisibility = "visible";
			} else {
				pendingVisibility = "hidden";
			}
			crAA(
					noteHeader,
					'img',
					{
						id : 'messagenotesplusHtmlPending',
						title : 'You have changed the note locally. Share button may be used to store the changes to server and make them available for other users of your group.',
						src : 'chrome://messagenotesplus/skin/upload16.png'
					}, {
						marginLeft : '2px',
						position : 'absolute',
						top : '2px',
						visibility : pendingVisibility
					}, function(elem) {
						if (note.pending && !mnpSingle.isFreeDistribution) {
							elem.style.visibility = "visible";
						} else {
							elem.style.visibility = "hidden";
						}
					});
			crAA(noteHeader, 'img', {
				id : 'messagenotesplusHtmlStatus',
				src : mnpSingle.icons[note.lstatus]
			}, {
				marginLeft : '38px',
				position : 'absolute',
				top : '4px'
			}, function(elem) {
				if (!mnpSingle.isFreeDistribution && note.status != undefined && note.lstatus != undefined && note.status != note.lstatus) {
					elem.style.visibility = "visible";
					elem.title = 'The local status of your note differs from the status as it is seen by other users of your group.';
				} else {
					elem.style.visibility = "hidden";
				}
			});
			crAA(noteHeader, 'img', {
				id : 'messagenotesplusHtmlError',
				src : 'chrome://messagenotesplus/skin/exclamation16.png'
			}, {
				marginLeft : '20px',
				position : 'absolute',
				top : '2px'
			}, function(elem) {
				if (note.state && !mnpSingle.isFreeDistribution) {
					elem.style.visibility = "visible";
					elem.title = note.state;
				} else {
					elem.style.visibility = "hidden";
				}
			});

		} else {
			noteHeader.appendChild(document.createTextNode(mnpSingle.Notes.getDateString(new Date(subnote.date))));
		}

		var htmlBody = null;
		if (isMy(subnote)) {
			htmlBody = crAA(mainParent, 'div', {
				className : 'messagenotesplusNoteBody'
			});
			crAA(htmlBody, 'textarea', {
				id : 'messagenotesplusNoteContent',
				flex : '1',
				textContent : subnote.body
			}, {
				width : '100%'
			}, function(elem) {
				elem.onchange = function(event) {
					document.messagenotesplus.pUA('saveTextToLocal', document.body.getAttribute('messageId'), event.target.value);
				};
				elem.oninput = function(event) {
					document.messagenotesplus.pUA('onTextBoxInputDelayedAutoSave', window, document.body.getAttribute('messageId'),
							event.target.value);
				};
			});
			joined = true;
		} else {
			if (!subnote.body) {
				subnote.body = " ";//make at least one empty line, otherwise it looks awkward.
			}
			htmlBody = crAA(mainParent, 'div', {
				className : 'messagenotesplusNoteBody'
			});
			htmlBody.appendChild(document.createTextNode(subnote.body.replace('\n', '<br/>', 'g')));
		}
	};

	this.appendNotesHtmlObj = function(note, mainParent) {
		var this_ = this;

		//var notes = [{name: 'alex1', date: 1341304971206, body: 'first note'}
		//, {name: 'alex2',  date: 1341404971206, body: 'second note'}];	

		var i;
		for (i in subnotes) {
			var subnote = subnotes[i];
			this.appendSubnoteHtmlObj(subnote, mainParent);
		}

		if (subnotes.length && !joined) {//if we don't participate yet, add 'join' button.
			var htmlHeader2 = crAA(mainParent, 'div', {
				className : 'messagenotesplusNoteHeader'
			});
			crAA(htmlHeader2, 'button', {
				id : 'messagenotesplusHtmlButtonJoin',
				className : 'messagenotesplusHtmlButton',
				title : 'Add your opinion to the note.',
				textContent : 'Join'
			}, null, function(elem) {
				elem.onclick = function(event) {
					document.messagenotesplus.pUA('saveJoinToLocal', document.body.getAttribute('messageId'));
				};
			});
		}
		if (!subnotes.length) {
			var warn1;
			if (note.status != -4 && note.status != -2) {
				warn1 = "Something wrong with the note. Probably the last 'Share' operation haven't completed successfully. Please try it again. Also, you may try to Cancel Note Local Changes. Otherwise, it is indication of a bug. Please file it to the service support and the note will be repaired.";
			} else {
				warn1 = "The note status is 'Deleted'. There is nothing to display. To start editing it you should change the note status to something else.";
			}
			mainParent.appendChild(document.createTextNode(warn1));
		}
	};
	$(mainParent).empty();//clear previous
	this.appendNotesHtmlObj(note, mainParent);

	mnpSingle.logDebug("Note.js start executing.");
	$('textarea').inputexpander();
	//	 $(".messagenotesplusHtmlButton").tooltip({
	//    // use div.tooltip as our tooltip
	//    tip: '.tooltip',
	//    // the time before the tooltip is shown
	//    predelay: 400,
	//    // tweak the position
	//    position: "bottom right",
	//    offset: [-50, -80]
	//});
	//tooltip
	//$('.messagenotesplusHtmlButton').tooltip({ predelay: 1000, position: 'center'});
	var tooltipSetup = function(elem) {
		if (elem) {
			document.setupTooltip = function(event, content) {
				document.cancelTooltip();
				document.tooltipTimeoutId = setTimeout(function() {
					mnpSingle.showTooltip(messagenotesplusXulDoc, event.screenX, event.screenY, content);
				}, 1000);
			};
			document.cancelTooltip = function() {
				if (typeof document.tooltipTimeoutId == "number") {
					clearTimeout(document.tooltipTimeoutId);
					delete document.tooltipTimeoutId;
					mnpSingle.hideTooltip(messagenotesplusXulDoc);
				}
			};
			elem.onmouseover = function(event) {
				document.setupTooltip(event, event.target.getAttribute('title'));
			};
			//elem.setAttribute('onmouseover', "document.setupTooltip(event, getAttribute('title'));");
			elem.onmouseout = function() {
				document.cancelTooltip();
			};
			//elem.setAttribute('onmouseout', 'document.cancelTooltip();');
		}
	};
	var btn = document.getElementById('messagenotesplusHtmlButtonEdit');
	tooltipSetup(btn);
	var pend = document.getElementById('messagenotesplusHtmlPending');
	tooltipSetup(pend);
	var err = document.getElementById('messagenotesplusHtmlError');
	tooltipSetup(err);
	var status = document.getElementById('messagenotesplusHtmlStatus');
	tooltipSetup(status);

	var n1 = document.getElementById('messagenotesplusNoteContent');
	if (n1) {
		if (n1.clientHeight < n1.scrollHeight) {
			n1.style.height = n1.scrollHeight + 5;
		}
	}

	//note progress
	var pr = document.getElementById('messagenotesplusHtmlProgress');
	if (pr) {
		if (mnpSingle.progress) {
			pr.style.visibility = 'visible';
		} else {
			pr.style.visibility = 'hidden';
		}
	}
	//note context menu.using xul version because html version is limited to borders of iframe.
	var d1 = document.getElementById('mnp-html-dynamic-content');
	if (d1) {
		d1.oncontextmenu = function(event) {
			mnpSingle.showContextMenu(messagenotesplusXulDoc, event.screenX, event.screenY);
		};
		//d1.setAttribute('oncontextmenu', "mnpSingle.showContextMenu(document.messagenotesplusXulDoc, event.screenX,event.screenY);");
	}
	mnpSingle.logDebug("Note.js end executing.");

};
document.mnpInitNoteHtml = messagenotesplusInitNotesHtml;
document.jQuery = jQuery;