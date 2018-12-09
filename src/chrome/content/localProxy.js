/*Copyright Alexander Khromov, aka alehro. All rights reserved. Contact: al(spam protection brackets)ehro00<spam protection brackets>gmail.com*/

/*global Components: false, Components: false, messagenotesplus_Single: false,  
 document: false, window: false
 */
Components.utils.import("resource://msgmodules/s3.js");

messagenotesplus_Single.global_decls.LocalServerProxy = function() {
	'use strict';
	var mnpSingle = messagenotesplus_Single;
	this.Cc = Components.classes;
	this.Ci = Components.interfaces;
	// this.prefService =
	// Components.classes["@mozilla.org/preferences-service;1"]
	// .getService(Components.interfaces.nsIPrefBranch);
	this.dbTableName = "MESSAGENOTES";
	this.dbConnection = null;

	this.dbSchema = {
		tables : {
			// schema is taken and cropped from commercial server's
			// MessageNotes-v4.
			messagenotes : "messageId STRING PRIMARY KEY, " + "status INTEGER,"
					+ "note TEXT," + "date INTEGER," + "hlText TEXT"	
			//,mnptags : "id INTEGER, "+"messageId STRING, " + "tag STRING"
		}
	};
	// clientUid : null,
	// notesServerUrl : 'http://208.109.119.104:8088',
	// lockPullProc : -1,
	// servertimeout : 10,
	// myName : "",
	this.init = function(afterThat, pmeter) {
		var this_ = this;
		mnpSingle.logDebug("local init 2");
		this_.dbInit();
		
		if(!this_.dbConnection.tableExists("messagenotes_db_version_1")){		
			this_.addTableColumn("lstatus", "INTEGER", function(){//note format version for compatibility with old versions.
				mnpSingle.logDebug("init: column lstatus added");				
				this_.addTableColumn("nformat", "INTEGER", function(){//note format version for compatibility with old versions.
					mnpSingle.logDebug("init: column nformat added");					
						mnpSingle.logDebug("init: column nformat added");
						this_.addTableColumn("remote_my", "TEXT", function(){//JSON like {name:n,status:s,body:b,date:d}
							mnpSingle.logDebug("init: column remote_my added");
							this_.addTableColumn("remote_others", "TEXT", function(){//JSON like [{...},{...},{...},...]
								mnpSingle.logDebug("init: column remote_others added");
								this_.addTableColumn("remote_others_merged", "TEXT", function(){//raw text with stripped JSON for search purposes
									this_.addTableColumn("local_note_body", "TEXT", function(){								
										this_.addTableColumn("pending", "INTEGER", function(){
											mnpSingle.logDebug("init: column pending added");
											this_.addTableColumn("state", "TEXT", function(){//JSON like [{...},{...},{...},...]
												this_.addTableColumn("name", "TEXT", function(){//owner of msgNote
													mnpSingle.logDebug("init: column 'name' added");
													this_.addTableColumn("readTime", "INTEGER", function(){
														mnpSingle.logDebug("init: column 'readTime' added");
													
														this_.dbConnection.createTable("messagenotes_db_version_1", "stub_column INTEGER PRIMARY KEY");
														mnpSingle.logDebug("db version upgaraded");
														afterThat();				
														mnpSingle.logDebug("init 3");
													});
												});
											});
										});
									});
								});								
							});						
						});		
				});
			});
		}else{
			afterThat();				
			mnpSingle.logDebug("init 3");
		}
		//asynch recursion. do not code below.
	
	};

	this.dbInit = function() {
		var this_ = this;
		var dirService = this_.Cc["@mozilla.org/file/directory_service;1"]
				.getService(this_.Ci.nsIProperties);

		var dbFile = dirService.get("ProfD", this_.Ci.nsIFile);
		dbFile.append("messagenotesplus.sqlite");

		var dbService = this_.Cc["@mozilla.org/storage/service;1"]
				.getService(this_.Ci.mozIStorageService);

		var dbConnection;
		//if (!dbFile.exists()) {
		dbConnection = this_._dbCreate(dbService, dbFile);
		//} else {
		//	dbConnection = dbService.openDatabase(dbFile);
		//}
		this_.dbConnection = dbConnection;
	};
	this.addTableColumn = function(columnName, columnType, onAfter) {
		var this_ = this;
		mnpSingle.logDebug('alter table');
		var sql = "ALTER TABLE messagenotes ADD COLUMN " + columnName + " "+columnType;			
		var statement = this_.dbConnection.createStatement(sql);		
		
		var asynchReceiver1 = { handleCompletion : function() {
			mnpSingle.logDebug('add column completion');		
			if(onAfter){
				onAfter();
			}
		}};
		statement.executeAsync(asynchReceiver1);
		// tail recursion, do not code below.
	};
	this._dbCreate = function(aDBService, aDBFile) {
		var this_ = this;
		var dbConnection = aDBService.openDatabase(aDBFile);
		this_._dbCreateTables(dbConnection);
		return dbConnection;
	};

	this._dbCreateTables = function(aDBConnection) {
		var this_ = this, name;
		for (name in this_.dbSchema.tables) {
			if(!aDBConnection.tableExists(name)){
				aDBConnection.createTable(name, this_.dbSchema.tables[name]);
			}
		}
	};
	this.base = messagenotesplus_Single.global_decls.LocalServerProxy.prototype;
	this.editNoteBase = function(n1) {
		var this_ = this;	
		
		var note = this_.cloneNote(n1);		
		var res = this.base.editNoteBase.call(this,
				note.messageId, note);		
		return res;
	};
	this.cloneNote = function(note){
		var n1 = note;
		if(!n1){
			n1 = {};
		}
		var i;
		var db_fields = this.db_fields;
		var res = {};		
		for(i in db_fields){
			var name = db_fields[i];
			if(n1[name]!=undefined){
				res[name] = n1[name];				
			}					
		}
		return res;
//		return {
//			messageId: n1.messageId,
//			status:n1.status,
//			note:n1.note,
//			//lockUid:n1.lockUid,
//			//lastLockTime:n1.lastLockTime, 
//			date:n1.date//, 
//			//group:n1.group,
//			//name:n1.name 
//			};
	};

	
	// doPost, doPostImpl
	this.requestDataServer = function(request, onResponse, onError, pm) {
		var this_ = this, stopPMeter;
		if (pm) {
			pm.setAttribute('style', 'visibility: visible;');
			stopPMeter = function() {
				pm.setAttribute('style', 'visibility: hidden;');
			};
		} else {
			stopPMeter = function() {
			};
		}
		this_.requestDb(request, onResponse, onError, function() {
			stopPMeter();
		});
	};
	// client, doAjax. //TOREF: Looks good for refactoring.
	this.requestDb = function(request, onResponse, onError, onStopProgress) {
		var this_ = this;
		mnpSingle.logDebug('requestDb. local. request: '+JSON.stringify(request));
		this_
				.fetchData(
						request,
						function(res) {
							try {
								mnpSingle
										.logDebug('Message notes plus. Data received from local db: '
												+ JSON.stringify(res));
								// var res = JSON.parse(data);
								if (!res.success) {
									var str1 = "Message notes plus. Local db refused operation due to: "
											+ res.message;
									mnpSingle.alert(str1);
									throw str1;
								}
								if (onResponse) {
									if (res.data) {
										onResponse(res.data);
									} else {
										onResponse();
									}

								}
							} catch (e) {
								mnpSingle
								.logError('Error. Message notes plus. Probably invalid data received from local db: '
										+ e);
								if (onError) {									
									onError();
								}
								throw e;
							} finally {
								if (onStopProgress) {
									onStopProgress();
								}
							}

						},
						function(err) {
							try {
								if (onError) {
									onError();
								}
								mnpSingle
										.alert("Cannot talk to message notes local database.");
								Components.utils
										.reportError("Error while communicating with message notes local database: "
												+ err);
							} finally {
								if (onStopProgress) {
									onStopProgress();
								}
							}
						});
	};

	// server, doPost
	this.fetchData = function(request, onSuccess, onError) {
		this
				.fetchDataImpl(request, onSuccess, onError, "do_"
						+ request.command);
	};

	this.get_by_date = function(request, onSuccess, onError) {
		this.fetchDataImpl(request, onSuccess, onError, "get_by_dateImpl");
	};

	this.get_count = function(request, onSuccess, onError) {
		this.fetchDataImpl(request, onSuccess, onError, "get_countImpl");
	};

	this.fetchDataImpl = function(request, onSuccess, onError, theMethod) {
		var this_ = this;
		var asynchReceiver = {
			// filled later: handleResult: function(aResultSet)
				
			//We should initialize res at the high level. We cannot do this in handle result because it can be called several times per request.	
			res : {
					success : false,
					data : null,//it should be initialized later, because depending on the command the data may have different format.
					message : ""
			},
			handleError : function(aError) {
				mnpSingle.logError('handleError ');
				if (onError) {
					onError(aError.message || "Unrecognized database errror.");
				}
			},

			handleCompletion : function(aReason) {
				if (aReason == Components.interfaces.mozIStorageStatementCallback.REASON_FINISHED) {
					this.res.success=true;
//					if (!this.res) {
//						this.res = {
//							success : true,
//							data : null,
//							message : ""
//						};
//					}
					//mnpSingle.logDebug('handleCompletion for ' + counter + " from local db");
					mnpSingle.logDebug('handleCompletion ');
					onSuccess(this.res);// calling client callback.

				} else if (aReason == Components.interfaces.mozIStorageStatementCallback.REASON_CANCELED) {
					if (onError) {
						onError("Query canceled!");
					}
				} else {
					if (onError) {
						onError("Error while executing database query!");
					}
				}
			}
		};

		try {
			this_[theMethod](request, asynchReceiver, onSuccess, onError);
		} catch (e) {
			mnpSingle.logError('Error while executing command to database: '
					+ e);
		}
		// tail recursion, do not code below.
	};
	this.db_fields=["messageId",
					"status",
					"note",
					"date",
					"hlText",
					"lstatus",
					"nformat",					
					"remote_my",
					"remote_others",
					"remote_others_merged",
					"local_note_body",
					"pending",
					"state",
					"name",
					"readTime"];
	this.getResultByName=function(row){
		var msgNote = {};
		var i;
		for(i in this.db_fields){
			msgNote[this.db_fields[i]] = row.getResultByName(this.db_fields[i]);
		}
//		{
//				messageId : row.getResultByName("messageId"),
//				status : row.getResultByName("status"),
//				note : row.getResultByName("note"),
//				date : row.getResultByName("date"),
//				hlText : row.getResultByName("hlText"),
//				nformat : row.getResultByName("nformat"),
//				sdate : row.getResultByName("sdate"),
//				remote_my : row.getResultByName("remote_my"),
//				remote_others : row.getResultByName("remote_others"),
//				raw_all_local : row.getResultByName("raw_all_local"),
//				pending : row.getResultByName("pending")
//			};
		return msgNote;
	};
	this.do_getAll = function(request, asynchReceiver) {
		var this_ = this;
		mnpSingle.logDebug('getAll 1');
		var paramNames = "";		
		var i;
		for (i=0; i < request.ids.length; i++) {
			paramNames += "?"+ (i+1) + ",";			
		}
		paramNames = paramNames.slice(0, -1);
		mnpSingle.logDebug("SELECT * FROM " + this_.dbTableName + " WHERE messageId IN ("+paramNames+")");
		var statement = this_.dbConnection
				.createStatement("SELECT * FROM " + this_.dbTableName + " WHERE messageId IN ("+paramNames+")");
		var j;
		for(j in request.ids){
			statement.params[j] = request.ids[j];
		}
		mnpSingle.logDebug('getAll param count: '+statement.parameterCount);
//		var this_ = this;
//		var paramNames = "";
//		var paramPlaceHolders = "";
//		var name;
//		for (name in request.noteObj) {
//			paramNames += name + ",";
//			paramPlaceHolders += ":" + name + ",";
//		}
//		paramNames = paramNames.slice(0, -1);
//		paramPlaceHolders = paramPlaceHolders.slice(0, -1);
//		//do not use INSERT OR REPLACE here because it needs to take care of completeness of the note, otherwise the data will be vanished.
//		var statement = this_.dbConnection
//				.createStatement("INSERT INTO "+this_.dbTableName+" (" + paramNames
//						+ ") VALUES(" + paramPlaceHolders + ")");
//		
//		for (name in request.noteObj) {
//			statement.params[name] = request.noteObj[name];
//		}
//		mnpSingle.logDebug("sql statement obj: " + JSON.stringify(statement));
//		mnpSingle.logDebug("sql statement obj params: "
//				+ JSON.stringify(statement.params));
//		statement.executeAsync(asynchReceiver);		
		mnpSingle.logDebug('getAll 2');
		var counter = 0;
		asynchReceiver.handleResult = function(aResultSet) {
			try {
				if(!this.res.data){
					this.res.data = {};
				}
				//var noteArr = {};
				var row;
				mnpSingle.logDebug('getAll 3');
				for (row = aResultSet.getNextRow(); row; row = aResultSet
						.getNextRow()) {
					var msgNote = this_.getResultByName(row);
					this.res.data[msgNote.messageId] = msgNote;
					counter++;
				}
				mnpSingle.logDebug('Fetched ' + counter + " from local db");
				mnpSingle.logDebug('getAll 4');
//				this.res = {
//					success : true,
//					data : noteArr,
//					message : ""
//				};
				mnpSingle.logDebug('getAll 5');
			} catch (e) {
				mnpSingle.logError('Error wile processing data from database: '
						+ e);
			}
		};
		mnpSingle.logDebug('getAll 6');
		statement.executeAsync(asynchReceiver);
		// tail recursion, do not code below.
	};
	this.do_get_statuses = function(request, asynchReceiver) {
		var this_ = this;
		this_.do_getAll(request, asynchReceiver);
		// tail recursion, do not code below.
	};
	this.do_search = function(request, asynchReceiver) {
		var this_ = this;
		
		var sql = "SELECT * FROM "+this_.dbTableName+" WHERE nformat=0 AND note LIKE :note ESCAPE '!' "
			+" OR local_note_body LIKE :note ESCAPE '!' "+
			" OR remote_others_merged LIKE :note ESCAPE '!' ";
		mnpSingle.logDebug('search sql: '+sql);
		var statement = this_.dbConnection.createStatement(sql);		
		statement.params.note = "%"+request.noteObj.note+"%";
		// "SELECT * FROM " + this_.dbTableName + " WHERE messageId="
		// + "'" + request.noteObj.messageId + "'";
		mnpSingle.logDebug('search 2');
		asynchReceiver.handleResult = function(aResultSet) {
			try {
				if(!this.res.data){
					this.res.data = [];
				}
				//var noteArr = [];
				var row;
				mnpSingle.logDebug('search 3');
				for (row = aResultSet.getNextRow(); row; row = aResultSet
						.getNextRow()) {
					var msgNote = this_.getResultByName(row);
					this.res.data[this.res.data.length] = msgNote;
				}
				mnpSingle.logDebug('search 4');
//				this.res = {
//					success : true,
//					data : noteArr,
//					message : ""
//				};
				mnpSingle.logDebug('search 5');
			} catch (e) {
				mnpSingle.logError('Error wile processing data from database: '
						+ e);
			}
		};
		mnpSingle.logDebug('search 6');
		statement.executeAsync(asynchReceiver);
		// tail recursion, do not code below.
	};
	
	this.do_add = function(request, asynchReceiver) {
		var this_ = this;
		var paramNames = "";
		var paramPlaceHolders = "";
		var name;
		for (name in request.noteObj) {
			paramNames += name + ",";
			paramPlaceHolders += ":" + name + ",";
		}
		paramNames = paramNames.slice(0, -1);
		paramPlaceHolders = paramPlaceHolders.slice(0, -1);
		//do not use INSERT OR REPLACE here because it needs to take care of completeness of the note, otherwise the data will be vanished.
		var statement = this_.dbConnection
				.createStatement("INSERT INTO "+this_.dbTableName+" (" + paramNames
						+ ") VALUES(" + paramPlaceHolders + ")");
		
		for (name in request.noteObj) {
			statement.params[name] = request.noteObj[name];
		}
		mnpSingle.logDebug("sql statement obj: " + JSON.stringify(statement));
		mnpSingle.logDebug("sql statement obj params: "
				+ JSON.stringify(statement.params));
		statement.executeAsync(asynchReceiver);
	};
	this.do_get = function(request, asynchReceiver) {
		var this_ = this;
		var sql = "SELECT * FROM "+this_.dbTableName+" WHERE messageId=:messageId";
		mnpSingle.logDebug('Precreate SQL statement: ' + sql);
		var statement = this_.dbConnection.createStatement(sql);		
		statement.params.messageId = request.noteObj.messageId;
		this_.get_by(statement, asynchReceiver);
	};

	this.get_by_dateImpl = function(request, asynchReceiver) {
		var this_ = this;
		var sql = "SELECT * FROM "+this_.dbTableName+" WHERE date<:date ORDER BY date DESC LIMIT 1";
		mnpSingle.logDebug('Precreate SQL statement: ' + sql);
		var statement = this_.dbConnection.createStatement(sql);		
		statement.params.date = request;
		this_.get_by(statement, asynchReceiver);
	};

	this.get_by = function(statement, asynchReceiver) {
		var this_ = this;
		asynchReceiver.handleResult = function(aResultSet) {
			try {
				mnpSingle.logDebug('handleResult ');
				var row;
				row = aResultSet.getNextRow();
				var msgNote;
				if (row) {
					msgNote = this_.getResultByName(row);
				} else {
					msgNote = null;
				}
				// break;// TODO:? check for multiple results.
				// }
				//mnpSingle.logDebug('get 4');
				this.res = {
					success : true,
					data : msgNote,
					message : ""
				};
				//mnpSingle.logDebug('get 5');

				// onSuccess(res);// calling client callback.
			} catch (e) {
				mnpSingle.logError('Error wile processing data from database: '
						+ e);
			}
		};
		statement.executeAsync(asynchReceiver);
	};

	this.get_countImpl = function(request, asynchReceiver) {
		var this_ = this;
		var sql = "SELECT Count(*) FROM "+this_.dbTableName;
		mnpSingle.logDebug('Precreate SQL statement: ' + sql);
		var statement = this_.dbConnection.createStatement(sql);		
		asynchReceiver.handleResult = function(aResultSet) {
			try {
				var row;
				row = aResultSet.getNextRow();
				var count;
				if (row) {
					count = row.getResultByIndex(0);
				} else {
					count = "unknown";
				}
				mnpSingle.logDebug('get 4');
				this.res = {
					success : true,
					data : count,
					message : ""
				};
				mnpSingle.logDebug('get 5');
			} catch (e) {
				mnpSingle.logError('Error wile processing data from database: '
						+ e);
			}
		};
		statement.executeAsync(asynchReceiver);
	};

	this.do_set_status = function(request, asynchReceiver) {
		this.do_save(request, asynchReceiver);
	};
	this.do_save = function(request, asynchReceiver) {
		var this_ = this;
		var params = "";
		var name;
		for (name in request.noteObj) {
			params += name + "=:" + name + ",";

		}
		params = params.slice(0, -1);
		var sql = "UPDATE "+this_.dbTableName+" SET " + params
				+ " WHERE messageId=:messageId";
		mnpSingle.logDebug('Precreate SQL statement: ' + sql);
		var statement = this_.dbConnection.createStatement(sql);		
		statement.params.messageId = request.noteObj.messageId;

		for (name in request.noteObj) {
			statement.params[name] = request.noteObj[name];
		}
		statement.executeAsync(asynchReceiver);

		// var q1 = "UPDATE " + dbTableName + " SET LOCKUID = '' WHERE
		// messageId="
		// + request.noteObj.messageId;
	};

	this.do_delete = function(request, asynchReceiver) {
		var this_ = this;
		var statement = this_.dbConnection
				.createStatement("DELETE FROM "+this_.dbTableName+" WHERE messageId=:messageId");		
		statement.params.messageId = request.noteObj.messageId;
		statement.executeAsync(asynchReceiver);
	};
	//TODO:6 add tag, track tags through additional table
};

messagenotesplus_Single.global_decls.LocalServerProxy.prototype = new messagenotesplus_Single.global_decls.BaseServerProxy();
messagenotesplus_Single.global_defs.mnpLocalProxy = new messagenotesplus_Single.global_decls.LocalServerProxy();
