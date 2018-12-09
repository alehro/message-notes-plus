/*Copyright Alexander Khromov, aka alehro. All rights reserved. Contact: al(spam protection brackets)ehro00<spam protection brackets>gmail.com*/

/*global Components: false, Components: false, messagenotesplus_Single: false,  
 document: false, window: false
 */
Components.utils.import("resource://msgmodules/s3.js");

messagenotesplus_Single.global_decls.RemoteServerProxyStub = function() {
	'use strict';
	var mnpSingle = messagenotesplus_Single;
	this.getOnlineState = function(){
		return '';
	};
	this.saveLocalToRemote = function(messageId, onFinish) {
		if(onFinish){
			onFinish();
		}
	};
	this.notifyUi=function(){		
		mnpSingle.obSvc.notifyObservers(null, "update_messagenotesplus",
				null);
	};
	this.pingNote = function(messageId1, onAfter){
		if(onAfter){
			onAfter();
		}
	};
	this.init=function(afterThat, pmeter){
		if(afterThat){
			afterThat();
		}
	};
	this.startUserActionLife=function(){		
	};
	this.getServerWarnings = function(){
		return '';
	};	
};
messagenotesplus_Single.global_decls.RemoteServerProxyStub.prototype = new messagenotesplus_Single.global_decls.BaseServerProxy();
messagenotesplus_Single.global_defs.mnpRemoteProxyStub = new messagenotesplus_Single.global_decls.RemoteServerProxyStub();
