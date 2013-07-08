
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('filesystem',[],function() {
	"use strict";
	var medea = this, gl = medea.gl;

	// find root location for remote files
	var settings_root = medea.GetSettings()['dataroot'] || 'data';
	if (settings_root.charAt(settings_root.length-1) !== '/') {
		settings_root += '/';
	}

	medea.FixURL = function(s, no_client_cache, root) {
		if (s.slice(0,7) === 'remote:') {
			s = s.slice(7);
		}
		if (no_client_cache) {
			s += '?nocache='+(new Date()).getTime();
		}
		return (root || settings_root) + s;
	};

	// class Resource
	medea.Resource = medea.Class.extend({

		init : function(src, callback) {
			this.callback = callback;
			this.complete = false;
			this.src = src;

			var outer = this;
			(src instanceof Array ? medea.FetchMultiple : medea.Fetch)(src,
				function() {
					outer.OnDelayedInit.apply(outer,arguments);
				},
				function(error) {
					medea.LogError('failed to delay initialize resource from ' + src + ', resource remains non-complete: '+error);
				}
			);
		},

		IsComplete : function() {
			return this.complete;
		},

		OnDelayedInit : function() {
			this.complete = true;

			if(this.callback) {
				this.callback(this);
			}
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

		init : function(root) {
			this.root = root || settings_root;
// #ifdef DEBUG
			if (!this.root) {
				medea.DebugAssert("need a valid filesystem handle for local file support");
			}
// #endif
		},

		CanHandle : function(prefix) {
			return prefix == "local";
		},

		Load : function(what,callback,onerror) {
			medea.LogDebug("begin loading: " + what + " from local disk");

			this.root.getFile(what, {}, function(fileEntry) {

				var reader = new FileReader();
				reader.onload = function(e) {
					callback(e.target.result);
				};

				reader.onerror = onerror;
				reader.readAsText(fileEntry);
				return true;
			},
			function(e) {
				onerror("got error from getFile: " + e);
			});
		}
	});

	// class LocalFileSystemHandler
	var _http_cache = {};
	medea.HTTPRemoteFileSystemHandler = medea.FileSystemHandler.extend({
	
	
		init : function(root_name, prefix) {
			this.root = root_name || settings_root;
			this.prefix = prefix || "remote";
		},
	

		CanHandle : function(prefix) {
			return prefix == this.prefix;
		},

		Load : function(what,callback,onerror,no_session_cache) {

			what = medea.FixURL(what, false, this.root);

			if (!no_session_cache) {
				var c = _http_cache[what];
				if(c) {
					if(Array.isArray(c)) {
						c.push(callback);
					}
					else {
						callback(c);
					}
					return;
				}
				else {
					_http_cache[what] = [];
				}
			}

			medea.LogDebug("begin loading: " + what + " via HTTP");
			medea._AjaxFetch(what,function(response,status) {

				medea.LogDebug(medea.sprintf("end loading %s, got HTTP status %s",what,status));
				if (status >= 300 || status < 200) {
					if (onerror) {
						onerror(status);
					}
					return;
				}
				if (!no_session_cache) {
					var c = _http_cache[what];
					if(Array.isArray(c)) {
						for(var i = 0; i < c.length; ++i) {
							c[i](response);
						}
					}
					_http_cache[what] = response;
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

	medea.AddFileSystemHandler(new medea.HTTPRemoteFileSystemHandler());
	medea.AddFileSystemHandler(new medea.HTTPRemoteFileSystemHandler("./","url"));
});

