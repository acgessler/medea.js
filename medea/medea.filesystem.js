

medea.stubs["FileSystem"] = (function() {
	var medea = this, gl = medea.gl;
	
	// class Resource
	medea.Resource = medea.Class.extend({
	
		init : function(src) {
			this.complete = false;
			this.src = src;
			
			(src instanceof Array ? medea.FetchMultiple : medea.Fetch)(src,this.OnDelayedInit,function(error) {
				medea.LogError('failed to delay initialize resource from ' + src + ', resource remains non-complete: '+error);
			});
		},
		
		IsComplete : function() {
			return this.complete;
		},
		
		OnDelayedInit : function() {
			this.complete = true;
		}
	});
	
	
	// class FileSystemHandler
	medea.FileSystemHandler = medea.Class.extend({
		
		CanHandle : function(name) {
			return false;
		},
		
		Load : function(name) {
			return null;
		}
	});
	
	// class LocalFileSystemHandler
	medea.LocalFileSystemHandler = medea.FileSystemHandler.extend({
	
		init : function() {
		//	window.requestFileSystem(window.PERSISTENT,);
		}
	
		CanHandle : function(prefix) {
// #ifdef MEDEA_LOCAL_TEST
			return prefix == "local" || prefix == 'remote';
// #else
			return prefix == "local";
// #endif
		},
		
		Load : function(what,callback,onerror) {
			medea.LogDebug("begin loading: " + what + " from local disk");
			
			root.getFile('log.txt', {}, function(fileEntry) {} )l
			
			var reader = new FileReader();
			reader.onload = function(e) {
				callback(e.target.result);
			};
			
			reader.onerror = onerror;
			reader.readAsText(what);			
			return true;
		}
	});
	
	// class LocalFileSystemHandler
	medea.HTTPRemoteFileSystemHandler = medea.FileSystemHandler.extend({
	
		CanHandle : function(prefix) {
			return prefix == "remote";
		},
		
		Load : function(what,callback,onerror) {
			medea.LogDebug("begin loading: " + what + " via HTTP");
			medea._AjaxFetch(what,function(response,status,data) {
			
				medea.LogDebug(medea.sprintf("end loading %s, got response %s with HTTP status %i",what,response,status));
				if (status >= 300 || status < 200) {
					if (onerror) {
						onerror(status);
					}
					return;
				}
				callback(data);
			});
			return true;
		}
	});
	
	// class DocumentFileSystemHandler
	medea.DocumentFileSystemHandler = medea.FileSystemHandler.extend({
	
		CanHandle : function(prefix) {
			return prefix == "document";
		},
		
		Load : function(name,callback,onerror) {
			var element = document.getElementById(name);
			if (!element) {
				onerror('element not found in DOM: ' + name);
			}
			
			callback(element.innerHTML);
			return true;
		}
	});
	
	
	medea.AddFileSystemHandler = function(fs) {
		medea._fs_handlers.push(fs);
	};
	
	
	medea.GetFileSystemHandler = function(name) {
		var pidx = name.indexOf(':');
		var prefix = pidx==-1 ? '' : name.slice(0,pidx);
		
		name = name.slice(pidx+1);
	
		var fs = medea._fs_handlers;
		for(var i = 0, e = fs.length; i < e; ++i) {
			if (fs[i].CanHandle(prefix,name)) {
				return [fs[i],name];
			}
		}
	
		return null;
	}
	
	
	// load a particular resource from any filesystem location
	medea.Fetch = function(what,callback,onerror) {
		var tuple = medea.GetFileSystemHandler(what);
		if (!tuple) {
			onerror('no handler found for this filesystem location');
			return;
		}
		
		return tuple[0].Load(tuple[1],callback,onerror);
	};
	
	// load multiple files, the ok-callback receives a dictionary of the files along with their
	// contents while the optional onerror callback receives a dictionary of the files that
	// failed along with their respective (HTTP) error codes.
	medea.FetchMultiple = function(_whatlist,callback,onerror) {
		var ok = [], error = [], whatlist = _whatlist.slice(0);
		
		var fire_callback = function() {
			if (ok.length + error.length == whatlist.length) {
				if (error.length() && onerror) {
					onerror(error);
				}
				if (ok.length()) {
					callback(ok);
				}
// #ifdef DEBUG
				ok = error = null;
// #endif
			}
		};
		
		whatlist.forEach(function(ename) {
			medea.Fetch(ename,function(contents) {
				ok[ename] = contents;
				fire_callback();
			},
			function(status) {
				error[ename] = status;
				fire_callback();
			});
		});
	};
	
	
	// default file system handlers
	medea._fs_handlers = [
		new medea.DocumentFileSystemHandler(),
	];

// #ifdef MEDEA_LOCAL_TEST	
	if (window.File && window.FileReader && window.FileList && window.Blob) {
		// workaround for Chrome 
		window.requestFileSystem  = window.requestFileSystem || window.webkitRequestFileSystem;
		
		medea.AddFileSystemHandler(new medea.LocalFileSystemHandler());
		medea.LogDebug('HTML5 file APIs are available');
	}
// #endif

	medea.AddFileSystemHandler(new medea.HTTPRemoteFileSystemHandler());
	medea.stubs["FileSystem"] = null;
});
