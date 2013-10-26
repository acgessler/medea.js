
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medealib.define('filesystem',[],function(undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	var baked_resources = medea._bakedResources;

	// #ifdef DEBUG
	if (baked_resources !== undefined) {
		medealib.LogDebug('using embedded resources');
	}
	else {
		medealib.LogDebug('embedded resources not available');
	}
	// #endif


	// find root location for remote files
	var settings_root = medea.GetSettings()['dataroot'] || 'data';
	if (settings_root.charAt(settings_root.length-1) !== '/') {
		settings_root += '/';
	}
	
	
	var AppendUrlParameters = function(s, no_client_cache) {
		if (no_client_cache) {
			s += (s.indexOf('?') !== -1 ? '&' : '?') + 'nocache='+(new Date()).getTime();
		}
		return s;
	}
	

	// TODO this is only necessary because the image module still relies on the
	// browser's URL resolution.
	medea.FixURL = function(s, no_client_cache, root) {
	
		if (s.slice(0,7) === 'remote:') {
			s = (root || settings_root) + s.slice(7);
		}
		else if (s.slice(0,4) === 'url:') {
			s = s.slice(4);
		}
		else {
			// #ifdef DEBUG
			medealib.DebugAssert(false, 
				"not a valid resource name, probably missing url: prefix? :" + s);
			// #endif 
			return null;
		}

		// cleanup URL to avoid trouble in some browsers
		s = medea.FixResourceName(s);

		s = AppendUrlParameters(s);
		return s;
	};
	
	
	medea.FixResourceName = function(name) {
		// a) replace backslashes by forward slashes
		name = name.replace(/\\/,'/');
		// b) drop double slashes
		name = name.replace(/\/\//,'/');
		return name;
	};
	

	// class Resource
	medea.Resource = medealib.Class.extend({

		ref_count : 1,

		init : function(src, callback, do_not_load) {
			if(!src) {
				this.complete = true;
				this.src = '';
				return;
			}
			this.callback = callback;
			this.complete = false;
			this.src = src;

			if (!do_not_load) {
				var outer = this;
				(src instanceof Array ? medea.FetchMultiple : medea.Fetch)(src,
					function() {
						outer.OnDelayedInit.apply(outer,arguments);
					},
					function(error) {
						medea.Log('failed to delay initialize resource from ' + src + 
							', resource remains non-complete: '+error, 'error');
					}
				);
			}
		},

		AddRef : function() {
			// #ifdef DEBUG
			medealib.DebugAssert(this.ref_count > 0);
			// #endif
			this.ref_count++;
		},

		Release : function() {
			// #ifdef DEBUG
			medealib.DebugAssert(this.ref_count > 0);
			// #endif
			if(--this.ref_count === 0) {
				this.Dispose();
			}
		},

		Dispose : function() {
			// TODO: suitable debug behaviour 
		},

		IsComplete : function() {
			return this.complete;
		},

		IsRenderable : function() {
			return this.IsComplete();
		},

		OnDelayedInit : function() {
			this.complete = true;

			if(this.callback) {
				this.callback(this);
			}
		}
	});


	// class FileSystemHandler
	medea.FileSystemHandler = medealib.Class.extend({

		CanHandle : function(name) {
			return false;
		},

		Load : function(name) {
			return null;
		}
	});

	// class LocalFileSystemHandler
	medea.LocalFileSystemHandler = medea.FileSystemHandler.extend({

		init : function(root) {
			this.root = root || settings_root;
// #ifdef DEBUG
			if (!this.root) {
				medealib.DebugAssert("need a valid filesystem handle for local file support");
			}
// #endif
		},

		CanHandle : function(prefix) {
			return prefix == "local";
		},

		Load : function(what,callback,onerror) {
			medealib.LogDebug("begin loading: " + what + " from local disk");

			this.root.getFile(what, {}, function(fileEntry) {

				var reader = new FileReader();
				reader.onload = function(e) {
					callback(e.target.result);
				};

				reader.onerror = onerror || function() {
					callback(null);
				};
				reader.readAsText(fileEntry);
				return true;
			},
			function(e) {
				onerror("got error from getFile: " + e);
			});
		}
	});

	// class LocalFileSystemHandler
	medea.HTTPRemoteFileSystemHandler = medea.FileSystemHandler.extend({
	
		init : function(root_name, prefix) {
			this.root = root_name;
			this.prefix = prefix;
		},
	

		CanHandle : function(prefix) {
			return prefix == this.prefix;
		},

		Load : function(what_orig, callback, onerror) {
			var what = this.root + AppendUrlParameters(what_orig);
		

			medealib.LogDebug("begin loading: " + what + " via HTTP");
			medealib._AjaxFetch(what,function(response,status) {

				medealib.LogDebug("end loading " + what + ", HTTP status " + status);
				if (status >= 300 || status < 200) {
					if (onerror) {
						onerror(status);
					}
					else {
						callback(null);
					}
					return;
				}
				callback(response);
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
				if(onerror) {
					onerror('element not found in DOM: ' + name);
				}
				else {
					callback(null);
				}
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

		if(baked_resources !== undefined) {
			var entry = baked_resources[what];
			if(entry !== undefined) {
				// #ifdef DEBUG
				medealib.LogDebug('resource is embedded: ' + what);
				// #endif
				callback(entry);
				return;
			}
		}

		var tuple = medea.GetFileSystemHandler(what);
		if (!tuple) {
			if(onerror) {
				onerror('no handler found for this filesystem location');
			}
			else {
				callback(null);
			}
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
				else if (!onerror) {
					// if onerror is not given, the main callback receives the
					// sad truth.
					callback(null);
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
		new medea.DocumentFileSystemHandler()
	];

	medea.AddFileSystemHandler(new medea.HTTPRemoteFileSystemHandler(settings_root, "remote"));
	medea.AddFileSystemHandler(new medea.HTTPRemoteFileSystemHandler("","url"));
});

