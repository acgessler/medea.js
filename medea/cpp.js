/* @license

cpp.js - Simple implementation of the C Preprocessor in Javascript

Copyright (c) 2011, Alexander Christoph Gessler
All rights reserved.

Redistribution and use of this software in source and binary forms, 
with or without modification, are permitted provided that the 
following conditions are met:

* Redistributions of source code must retain the above
  copyright notice, this list of conditions and the
  following disclaimer.

* Redistributions in binary form must reproduce the above
  copyright notice, this list of conditions and the
  following disclaimer in the documentation and/or other
  materials provided with the distribution.

* Neither the name of the cpp.js team, nor the names of its
  contributors may be used to endorse or promote products
  derived from this software without specific prior
  written permission of the cpp.js Development Team.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS 
"AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT 
LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT 
OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL,
SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT 
LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY 
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT 
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE 
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

function cpp_js(settings) {
	"use strict";

	var trim = function (str) {
		// http://blog.stevenlevithan.com/archives/faster-trim-javascript
		str = str.replace(/^\s+/, '');
		for (var i = str.length - 1; i >= 0; i--) {
			if (/\S/.test(str.charAt(i))) {
				str = str.substring(0, i + 1);
				break;
			}
		}
		return str;
	};
	
	var strip_cpp_comments = function(str) {
		// very loosely based on http://james.padolsey.com/javascript/removing-comments-in-javascript/,
		// but removed JS-specific stuff and added handling of line continuations. Also, newlines
		// are generally preserved to keep line numbers intact.
		str = ('__' + str.replace(/\r\n/g,'\n') + '__').split('');
		var block_comment = false, line_comment = false, quote = false, lines_lost = 0;
		for (var i = 0, l = str.length; i < l; i++) {
	
			if (quote) {
				if ((str[i] === "'" || str[i] === '"') && str[i-1] !== '\\') {
					quote = false;
				}
				continue;
			}
	 
			if (block_comment) {
				if (str[i] === '*' && str[i+1] === '/') {
					str[i+1] = '';
					block_comment = false;
				}
				str[i] = '';
				
				if (str[i] === '\n') {
					++lines_lost;
				}
				continue;
			}
	 
			if (line_comment) {
				if (str[i+1] === '\n') {
					line_comment = false;
				}
				str[i] = '';
				continue;
			}
			
			if (str[i] === '\n') {
				if (str[i-1] == '\\') {
					// line continuation, replace by whitespace
					str[i-1] = '';
					str[i] = '';
					++lines_lost;
				}
				else {
					while(lines_lost > 0) {
						str[i] += '\n';
						--lines_lost;
					}
				}
			}
	 
			quote = str[i] === "'" || str[i] === '"';
			if (str[i] === '/') {
	 
				if (str[i+1] === '*') {
					str[i] = '';
					block_comment = true;
					continue;
				}
				if (str[i+1] === '/') {
					str[i] = '';
					line_comment = true;
					continue;
				}	 
			}
		}
		return str.join('').slice(2, -2);
	};
	
	var is_string_boundary = function(text, idx) {
		return (text[idx] == '"' || text[idx] == "'") && 
			(!idx || text[idx-1] != '\\' ||
			(idx > 1 && text[idx-2] == '\\'));
	};

	// dictionary of default settings, including default error handlers
	var default_settings = {
		signal_char : '#',
		
		warn_func : function(s) {
			console.log(s);
		},
		
		error_func : function(s) {
			console.log(s);
			throw s;
		},
		
		comment_stripper : strip_cpp_comments,
		
		include_func : null,
		completion_func : null,
		
		pragma_func : function(pragma) {
			return null;
		}
	};
	
	// apply default settings
	if (settings) {
		for(var k in default_settings) {
			if (!(k in settings)) {
				settings[k] = default_settings[k];
			}
		}
	}
	else {
		settings = default_settings;
	}
	
	if (settings.include_func && !settings.completion_func) {
		settings.error_func("include_func but not completion_func specified");
	}
	
	// make sure that execution never continues when an error occurs.
	var user_err = settings.error_func;
	settings.error_func = function(e) {
		user_err(e);
		throw e;
	}
	
	// generate a 3 tuple (command, arguments, code_block)
	var block_re = new RegExp("^"+settings.signal_char+
		"(\\w+)[ \t]*(.*?)[ \t]*$","m"
	);
	
	// match identifiers according to 6.4.2.1, do not match 'defined',
	// do not match quote strings either
	var is_identifier_re = /\b(d(?!efined)|[a-ce-zA-Z_])\w*(?![\w"])/g;
	
	// same, but checks if the entire string is an identifier
	var is_identifier_only_re = /^(d(?!efined)|[a-ce-zA-Z_])\w*$/g;
	
	// same, but checks if the entire string is a macro
	var is_macro_only_re = /^((?:d(?!efined)|[a-ce-zA-Z_])\w*)\s*\((.*)\)$/g;
	
	// defined <identifier>
	var defined_no_parens_re = /defined\s+([a-zA-Z_]\w*)/g;
	
	// defined (<identifier>)
	var defined_re = /defined\s*\((\s*[a-zA-Z_]\w*\s*)\)/g;
	
	// __defined_magic_<identifier>_ (a special sentinel value used to
	// temporarily exclude operands to defined from macro substitution.
	var defined_magic_sentinel_re = /__defined_magic_([a-zA-Z_]\w*)_/;
	
	// Match hexadecimal, octal and decimal integer literals with or
	// without L,l,U,u suffix and separate all components.
	var is_integer_re = /\b(\+|-|)(0|0x|)([1-9a-f][0-9a-f]*|0)([ul]*)\b/ig;
	
	// Grab doubly quoted strings
	var is_string_re = /"(.*?)"/g;
	
	// Grab compound assignments. Extra fix for !=, ==, <=, >= needed
	var is_assignment_re = /[+\-*%\/&^|]?=/g; 
	
	// Grab instances of the increment/decrement operators
	var is_increment_re = /--|\+\+/g;
	
	// Grav <included_file> or "included_file"
	var include_re = /(?:(<)(.*)>|"(.*)")(.*)/;
	
	// Magic token to signify the '##' token (to keep it from being
	// treated as the operator of the same signature).
	var pseudo_token_doublesharp = '__doublesharp_magic__';
	var is_pseudo_token_doublesharp = new RegExp(pseudo_token_doublesharp,'g');
	
	// Magic token to signify the ' ' token (to keep it from being
	// treated as token boundary).
	var pseudo_token_space = '__whitespace_magic__';
	var is_pseudo_token_space = new RegExp(pseudo_token_space,'g');
	
	var pseudo_token_empty = '__empty_magic__';
	var is_pseudo_token_empty = new RegExp(pseudo_token_empty,'g');
	
	var pseudo_token_nosubs = '__nosubs__';
	var is_pseudo_token_nosubs = new RegExp(pseudo_token_nosubs,'g');
	
	// List of preprocessing tokens.
	var pp_special_token_list = {
		'==':1,
		'!=':1,
		'+':1,
		'-':1,
		'*':1,
		'/':1,
		'%':1,
		'<=':1,
		'>=':1,
		'<':1,
		'>':1,
		'=':1,
		'+=':1,
		'*=':1,
		'/=':1,
		'&=':1,
		'|=':1,
		'^=':1,
		'#':1,
		'##':1,
		'->':1
	};
	
	
	var state = {};
	var macro_cache = {};
	
	var eval_mask = null;
	
	var max_macro_length = 0;
	var macro_counts_by_length = {};
	
	return {
	
		// ----------------------
		// (public) Clear the current status code. i.e. reset all defines.
		clear : function() {
			state = {};
			macro_counts_by_length = {};
			macro_cache = {};
			max_macro_length = 0;
		},
		
		// ----------------------
		// (public) Check if macro `k` is defined.
		defined : function(k) {
			return k in state;
		},
	
		// ----------------------
		// (public) Define macro `k` with replacement value `v`. To define macros with
		// parameters, include the parameter list in the macro name, i.e. 
		// k <= "foo(a,b)", v <= "a ## b". The function invokes the error
		// callback if the macro contains syntax errors.
		define : function(k,v) {
			var macro = this._get_macro_info(k);
			if (!this._is_identifier(k) && !macro) {
				settings.error_func("not a valid preprocessor identifier: '" + k + "'");
			}
			
			if (typeof v === 'number') {
				v = v.toString(10);
			}
	
			if (macro) {
				k = macro.name;
				this.undefine(k);
				
				// This inserts the macro into the macro cache, which
				// holds pre-parsed data to simplify substitution.
				macro_cache[k] = macro;
			}
			else {
				this.undefine(k);
			}
			
			state[k] = v || '';
			
			// macro length table housekeeping
			macro_counts_by_length[k.length] = (macro_counts_by_length[k.length] || 0 ) + 1;
			if (k.length > max_macro_length) {
				max_macro_length = k.length;
			}
		},
		
		// ----------------------
		// (public) Undefine `k`. A no-op if `k` is not defined.
		undefine : function(k) {
			if(k in state) {
				delete state[k];
				
				// update macro length table
				var nl = macro_counts_by_length[k.length] - 1;
				if (k.length === max_macro_length && !nl) {
					max_macro_length = 0;
					for (var i = k.length-1; i >= 0; --i) {
						if (macro_counts_by_length[i]) {
							max_macro_length = i;
							break;
						}
					}
				}
				
				macro_counts_by_length[k.length] = nl;
				delete macro_cache[k];
			}
			else {
			
				// this happens if the user includes the parameter list
				// in the name. This is not part of the specification,
				// but implemented for reasons of API symmetry.
				var macro = this._get_macro_info(k);
				if (macro) {
					this.undefine(macro.name);
				}
			}
		},
		
		// ----------------------
		// (public) Given a dictionary of macro_name, replacement pairs, invoke
		// `define` on all of them.
		define_multiple : function(dict) {
			for(var k in dict) {
				this.define(k,dict[k]);
			}
		},
	
		// ----------------------
		// (public) Preprocess `text` and return the preprocessed text (or receive
		// a completion callback if asynchronous processing is enabled). `name` is 
		// an optional string that is used in error messages as file name.
		run : function(text, name) {
			name = name || '<unnamed>';
			
			if (!text) {
				error('input empty or null');
			}
			
			text = settings.comment_stripper(text);
			var blocks = text.split(block_re);
			
			var out = new Array(Math.floor(blocks.length/3) + 2), outi = 0;
			for (var i = 0; i < out.length; ++i) {
				out[i] = '';
			}
			
			var ifs_nested = 0, ifs_failed = 0, if_done = false, line = 1, command;
			var if_stack = [];
			
			// wrapped error function, augments line number and file
			var error = function(text) {
				settings.error_func("(cpp) error # "+name+":"+line+": " + text);
			};
			
			// wrapped warning function, augments line number and file
			var warn = function(text) {
				settings.warn_func("(cpp) warning # "+name+":"+line+": " + text);
			};
			
			var skip = false;
			var self = this;
			
			var process_directive = function(command, elem, i) {
				switch (command) {
				case "define":
					var head, tail;
					
					elem = trim(elem);
					
					var par_count = undefined;
					for (var j = 0; j < elem.length; ++j) {
						if (elem[j] == '(') {
							par_count = (par_count || 0) + 1;
						}
						else if ((elem[j] == ')' && --par_count === 0) || elem[j].match(/\s/) && par_count === undefined) {
							if (elem[j] == ')') {
								++j;
							}
							head = elem.slice(0,j);
							tail = trim( elem.slice(j) );
							break;
						}
					}
					
					if (par_count) {
						error('unbalanced parentheses in define: ' + elem);
					}
					
					if (head === undefined) {
						head = elem;
					}
					
					if (self.defined(head)) {
						warn(head + ' redefined');
					}
					
					if (!self._is_identifier(head) && !self._is_macro(head)) {
						error("not a valid preprocessor identifier: '" + head + "'");
					}
			
					self.define(head, tail);
					break;
					
				case "undef":
					self.undefine(elem);
					break;
					
				case "include":
					elem = self.subs(elem, {}, error, warn);
					var parts = elem.match(include_re);
					if (parts[4]) {
						error("unrecognized characters in include: " + elem);
					}
					var file = (parts[2] || '') + (parts[3] || '');
					
					if (!settings.include_func) {
						error("include directive not supported, " +
							"no handler specified");
					}
					
					settings.include_func(file, parts[1] === '<', function(contents) {
						if (contents === null) {
							error("failed to access include file: " +
								file);
						}
						var s = {};
						for(var k in settings) {
							s[k] = settings[k]; 
						}
						
						var processor;
						
						s.completion_func = function(data, lines, new_state) {
							out.length = outi;
							
							outi += lines.length;
							out = out.concat(lines);
			
							// grab any state changes
							self._set_state(processor);
							
							for (++i; i < blocks.length; ++i) {
								if(!process_block(i,blocks[i])) {
									return false;
								}
							}
							self._result(out, state);
						};
						
						// construct a child preprocessor and let it share our
						// state.
						processor = cpp_js(s);
						processor._set_state(self);
						processor.run(contents, file);
					});
					return false;
					
				case "error":
					error("#error: " + elem);
					break;
					
				case "pragma":
					if(!settings.pragma_func(elem)) {
						warn('ignoring unrecognized #pragma: ' + elem);
					}
					break;
					
				default:
					warn("unrecognized preprocessor command: "
						+ command
					);
					break;
				};
				return true;
			};
			
			var process_block = function(i, elem) {
				var elem = blocks[i];
				switch(i % 3) {
				// code line, apply macro substitutions and copy to output.
				case 0:
	
					line += elem.split('\n').length-1;
					if (!ifs_failed && trim(elem).length) {
						out[outi++] = self.subs(elem, error, warn);
					}
					break;
				// preprocessor statement, such as ifdef, endif, ..
				case 1:
					//++line;
					command = elem;
					break;
				// the rest of the preprocessor line, this is where expression 
				// evaluation happens
				case 2:
					var done = true;
					switch (command) {
						case "ifdef":
						case "ifndef":
							if (!elem) {
								error("expected identifier after " + 
									command);
							}
							// translate ifdef/ifndef to regular if by using defined()
							elem = "(defined " + elem + ")";
							if(command == 'ifndef') {
								elem = '!' + elem;
							}
							// fallthrough
							
						case "if":
							if_stack.push(false);
							if (!elem.length) {
								error("expected identifier after if");
							}
							// fallthrough
							
						case "else":
						case "elif":
							var not_reached = false;
							if (command == 'elif' || command == 'else') {
								not_reached = if_stack[if_stack.length-1];
								if (ifs_failed > 0) {
									--ifs_failed;
								}
								
								if (command == 'else' && elem.length) {
									warn('ignoring tokens after else');
								}
							}
							
							if (ifs_failed > 0 || not_reached || 
								(command != 'else' && 
								!self._eval(elem, error, warn)
								
							)){
								++ifs_failed;
							}
							else {
								// we run self branch, so skip any further else/
								// elsif branches
								if_stack[if_stack.length-1] = true;
							}
							break;
							
						case "endif":
							if(!if_stack.length) {
								error("endif with no matching if");
							}
							if (ifs_failed > 0) {
								--ifs_failed;
							}
							if_stack.pop();
							// ignore trailing junk on endifs
							break;
							
						default:
							done = ifs_failed > 0;
					};

					// not done yet, so this is a plain directive (i.e. include)
					if(!done) {
						if(!process_directive(command, elem, i)) {
							return false;
						}
					}
					break;
				}
				return true;
			};
			
			for (var i = 0; i < blocks.length; ++i) {
				if(!process_block(i,blocks[i])) {
					return null;
				}
			}
			
			if(if_stack.length > 0) {
				error("unexpected EOF, expected endif");
			}
			
			return this._result(out, state);
		},
		
		// ----------------------
		// (public) Given a `text`, substitute macros until no further substitutions
		// are possible. `blacklist` is an optional set of macro names to be ignored,
		// these are not substituted and remain as is.
		// `error` and `warn` are optional callbacks, by default the corresponding
		// callbacks from settings are used. Users should never assign a value to
		// `nest_sub`, which is used to keep track of recursive invocations internally.
		subs : function(text, blacklist_in, error, warn, nest_sub) {
			error = error || settings.error_func;
			warn = warn || settings.warn_func;
			
			var TOTALLY_BLACK = 1e10;
			
			// create a copy of the blacklist and make sure that all incoming
			// macros are totally blacked out. 
			var blacklist = {};
			if (blacklist_in) {
				for (var k in blacklist_in) {
					blacklist[k] = TOTALLY_BLACK;
				}
			}
			
			nest_sub = nest_sub || 0;
		
			var new_text = text;
			var rex = /\b.|["']/g, m_boundary;
			
			// XXX This scales terribly. Possible optimization:
			//   use KMP for substring searches
			var pieces = [], last = 0, in_string = false;
			
			while (m_boundary = rex.exec(new_text)) {
			
				var idx = m_boundary.index;
				if (is_string_boundary(new_text, idx)) {
					in_string = !in_string;
				}
				
				if (in_string) {
					continue;
				}
				
				for (var i = Math.min(new_text.length - idx,max_macro_length); i >= 1; --i) {
					if(!macro_counts_by_length[i]) {
						continue;
					}
					var k = new_text.slice(idx,idx+i);
					if (k in state) {
					
						// if this would be a match, but the macro is blacklisted,
						// we need to skip it alltogether or parts of it might be
						// interpreted as macros on their own.
						if (blacklist[k] > idx) {
			
							pieces.push(new_text.slice(0,idx));
							pieces.push(pseudo_token_nosubs+k);
							new_text = new_text.slice(idx+k.length);
							rex.lastIndex = 0;
						
							// adjust blacklist indices
							for(var kk in blacklist) {
								if (blacklist[kk] != TOTALLY_BLACK) {
									if (blacklist[kk] > idx) {
										blacklist[kk] -= idx+k.length;
									}
									else delete blacklist[kk];
								}
							};
							break;
						}
						else {
							delete blacklist[k];
						}
						
						var sub;
						if (this._is_macro(k)) {
							sub = this._subs_macro(new_text, k, {}, 
								error, warn, nest_sub, idx
							);
						}
						else {
							sub = this._subs_simple(new_text, k, {}, 
								error, warn, nest_sub, idx
							);
						}
						if (sub === null) {
							continue;
						}
						
						// handle # and ## operator
						sub[0] = this._handle_ops(sub[0], error, warn);
						
						// handle _Pragma()
						sub[0] = this._handle_pragma(sub[0], error, warn);
						
						// XXX a bit too expensive ... but not too easy to avoid.
						pieces.push(new_text.slice(0,idx));
						new_text = sub[0] + new_text.slice(idx+sub[1]);
						rex.lastIndex = 0;
						
						// adjust blacklist indices
						for(var kk in blacklist) {
							if (blacklist[kk] != TOTALLY_BLACK) {
								if (blacklist[kk] > idx) {
									blacklist[kk] = (sub[0].length-sub[1]) +( blacklist[kk] - idx);
								}
								else delete blacklist[kk];
							}
						}
						
						// rescan this string, but keep the macro that we just replaced
						// blacklisted until we're beyond the replacement. This 
						// prevents infinite recursion and is also mandated by the
						// standard and crucial for proper evaluation of several of
						// its more ... evil ehm elaborate samples.
						blacklist[k] = sub[0].length;
						break;
					}
				}
			}
			
			pieces.push(new_text);
			new_text = pieces.join('');
			
			// if macro substitution is complete, re-introduce any
			// '##' tokens previously substituted in order to keep them 
			// from being treated as operators. Same for spaces and empty
			// tokens.
			if (!nest_sub) {
				new_text = this._remove_sentinels(new_text);
			}
			
			return new_text;
		}, 
		
		// ----------------------
		// Transfer the state from another cpp.js instance to us.
		_set_state : function(other) {
			other = other._get_state();
		
			state = other.state;
			macro_counts_by_length = other.macro_counts_by_length;
			macro_cache = other.macro_cache;
			max_macro_length = other.max_macro_length;
		},
		
		// ----------------------
		// Get a dictionary containing the full processing state of us
		_get_state : function(other) {
			return {
				state : state,
				macro_counts_by_length : macro_counts_by_length,
				macro_cache : macro_cache,
				max_macro_length : max_macro_length
			};
		},
		
		// ----------------------
		// Given an array of single lines, produce the result text by merging lines
		// and trimming the result. The function also invokes the user-defined
		// completion callback, but it also returns the preprocessed text to the caller.
		_result : function(arr, state) {
			// drop empty lines at the end
			for (var i = arr.length-1; i >= 0; --i) {
				if (!arr[i]) {
					arr.pop();
				}
				else {
					break;
				}
			}
		
			var text = arr.join('\n');
			if (settings.completion_func) {
				settings.completion_func(text,arr, state);
			}
			
			return text;
		},
		
		// ----------------------
		// Check if `identifier` is a well-formed identifier according to C rules.
		_is_identifier : function(identifier) {
			// Note: important to use match() because test() would update
			// the 'lastIndex' property on the regex.
			return !!identifier.match(is_identifier_only_re);
		},
		
		// ----------------------
		// Check if `macro` is a well-formed macro name.
		_is_macro : function(macro) {
			return this._get_macro_info(macro) != null;
		},
		
		// ----------------------
		// Check if `tok` is a special preprocessor token (such as ==, <=, >=).
		// These tokens are handled differently when participating on either side
		// of the ## operator.
		_is_pp_special_token : function(tok) {
			return trim(tok) in pp_special_token_list;
		},
		
		// ----------------------
		// Get the description dictionary for a macro named `k` or null if the macro
		// is malformed (i.e. syntax wrong). Does not add new macros to the macro
		// cache but uses the cache to speed-up looking up known macros.
		_get_macro_info : function(k) {
			if (macro_cache[k]) {
				return macro_cache[k];
			}
		
			var m = is_macro_only_re.exec(k);
			if (!m) {
				return null;
			}
			is_macro_only_re.lastIndex = 0;
			
			var params = m[2].split(',');
			if (params.length === 1 && !trim(params[0])) {
				// parameterless macro (i.e. #define p () )
				params = [];
			}
			else {
				for (var i = 0; i < params.length; ++i) {
					var t = params[i] = trim(params[i]);
					if(!this._is_identifier(t) && !this._is_macro(t)) {
						return null;
					}
				}
			}
			
			// ES 1.8's sticky flag would be useful, but sadly it is not
			// universally supported yet.
			var pat = new RegExp(m[1] + '\\s*\\(','g');
			
			return {
				params:params,
				pat:pat,
				name:m[1],
				full:k
			};
		},
		
		// ----------------------
		// Remove all sentinel strings (i.e. placeholders for spaces
		// or empty tokens to indicate placeholder tokens) from the 
		// given string.
		_remove_sentinels : function(new_text) {
			new_text = new_text.replace(is_pseudo_token_doublesharp,'##');
			new_text = new_text.replace(is_pseudo_token_space,' ');
			new_text = new_text.replace(is_pseudo_token_empty,'');
			new_text = new_text.replace(is_pseudo_token_nosubs,'');
			return new_text;
		},
		
		// ----------------------
		// Evaluate the _Pragma(string) preprocessor operator in the given 
		// (partially substituted) sequence of preprocessor tokens.
		_handle_pragma : function(text, error, warn) {
			var self = this;
			// XXX obviously RE aren't sufficient here either, do proper parse.
			return text.replace(/_Pragma\s*\(\s*"(.*?([^\\]|\\\\))"\s*\)/g, function(match, pragma) {
				// destringize 
				pragma =  pragma.replace(/\\"/g,'"').replace(/\\\\/g,'\\');
				pragma = self._remove_sentinels(pragma);
				pragma = self._concatenate_strings(pragma);
				
				if (!settings.pragma_func(pragma)) {
					warn('unrecognized _Pragma(): ' + pragma);
				}
			
				// always substitute an empty string so processing
				// can continue.
				return '';
			});
		},
		
		// ----------------------
		// Concatenate neighbouring string literals such as " hello "
		// "world " and return the result.
		_concatenate_strings : function(text) {
			var in_string = false, last = null, last_taken = 0;
			var text_out = [];
			for (var i = 0; i < text.length; ++i) {
				if (is_string_boundary(text,i)) {
					if (in_string) {
						last = i;
					}
					else if (last !== null) {
						text_out.push(text.slice(last_taken, last));
						last_taken = i+1;
					}
					in_string = !in_string;
				}
				else if (!text[i].match(/\s/)){
					text_out.push(text.slice(last_taken, i));
					last_taken = i;
					last = null;
				}
			}
			text_out.push(text.slice(last_taken));
			return text_out.join('');
		},
		
		// ----------------------
		// Evaluate the '##' and '#' preprocessor operator in the given (partially
		// substituted) sequence of preprocessor tokens.
		_handle_ops : function(text, error, warn) {
	
		
			// XXX The code below is not only extremely slow, it also doesn't
			// take into account that the # operator can only be applied to
			// macro parameter, an information that is no longer available
			// at this point.
		
			// 6.10.3.2: "The order of evaluation of # and ## operators 
			// is unspecified.". We pick '##' first.
			var op, pieces = [], in_string = false; 
			for (var op = 0; op < text.length-1; ++op) {
			
				if (is_string_boundary(text,op)) {
					in_string = !in_string;
					continue;
				}
				
				if (text[op] !== '#' || in_string) {
					continue;
				}
				
				var is_concat = text[op+1] === '#';
				var left = null, right = null;
				
				// identify the tokens on either side of the ## operator or
				// only on the right side of the # operator.
				var in_inner_string = false, nest = 0;
				if(is_concat) {
					for (var i = op-1; i >= 0; --i) {
						if (!text[i].match(/\s/)) {
							if (is_string_boundary(text,i)) {
								in_inner_string = !in_inner_string;
							}
							else if (text[i] === '(') {
								++nest;
							}
							else if (text[i] === ')') {
								--nest;
							}
							left = text[i] + (left || '');
						}
						else if (left !== null) {
							if(!in_inner_string && !nest) {
								break;
							}
							left = ' ' + left;
						}
					}
					++i;
				}
				else {
					i = op;
				}
				
				in_inner_string = false;
				nest = 0;
				
				var first_space = true; 
				for (var j = op+(is_concat?2:1); j < text.length; ++j) {
					if (!text[j].match(/\s/)) {
						first_space = true;
						if (is_string_boundary(text,j)) {
							in_inner_string = !in_inner_string;
						}
						else if (text[j] === '(') {
							++nest;
						}
						else if (text[j] === ')') {
							--nest;
						}
						right = (right || '') + text[j];
					}
					else if (right !== null && !in_inner_string  && !nest) {
						break;
					}
					else {
						// 6.10.3.2 (#): each occurrence of white space between the 
						// argument's preprocessing tokens becomes a single space 
						// character in the character string literal
						if ((is_concat || first_space || in_inner_string) && right !== null) {
							right = right + ' ';
							first_space = false;
						}
					}
				}
				
				right = trim(right || '');
				
				var concat;
				if(is_concat) { 
				
					left = trim(left || '');
					if (!right || !left) {
						error('## cannot appear at either end of a macro expansion');
					}
					
					// To my reading of the standard, it works like this:
					// if both sides are *not* preprocessing special tokens,
					// the concatenation is always ok. Otherwise the result
					// must be a valid preprocessing special token as well.
					if ((this._is_pp_special_token(left) || this._is_pp_special_token(right)) && 
						!this._is_pp_special_token(left + right)) {
						error('pasting "' + left + '" and "' + right + 
							'" does not give a valid preprocessing token'
						);
					}
					
					// the result of the concatenation is another token, but
					// we must take care that the '##' token is not treated
					// as concatenation operator in further replacements.
					concat = left + right;
					if (concat == '##') {
						concat = pseudo_token_doublesharp;
					}
					else {
						// tokens that we marked as no longer available for
						// substitution become available again when they're
						// concatenated with other tokens.
						concat = concat.replace(is_pseudo_token_nosubs,'');
					}
				
				}
				else {
					if (!right) {
						error('# cannot appear at the end of a macro expansion');
					}
					
					concat = '"' + right.replace(/\\/g,'\\\\').replace(/"/g,'\\"') + '"';
				}
				
				pieces.push(text.slice(0,i));
				pieces.push(concat);
				
				if (j < text.length) {
					pieces.push(text.slice(j));
				}
				
				text = pieces.join('');
				pieces.length = 0;
				
				op = 0;
			}

			return text;
		},
		
		// ----------------------
		// Substitute an occurences of `macro_name` in `text` that begins at offset
		// `start_idx`. `macro_name` must be a simple macro with no parameter list. 
		// Return a 2-tuple with the substitution string and the substituted length 
		// in the original string.
		_subs_simple : function(text, macro_name, blacklist_in, error, warn, nest_sub, start_idx) {
			// no macro but just a parameterless substitution
			var rex = new RegExp(macro_name+"(\\b|"+pseudo_token_space+"|"+pseudo_token_empty+")",'g');
			
			rex.lastIndex = start_idx || 0;
			var m_found = rex.exec(text);
			if (!m_found || m_found.index != start_idx) {
				return null;
			}
			
			return [state[macro_name],m_found[0].length];
		},
		
		// ----------------------
		// Substitute an occurences of `macro_name` in `text` that begins at offset
		// `start_idx`. `macro_name` must be a simple macro with parameters. 
		// Return a 2-tuple with the substitution string and the substituted length 
		// in the original string.
		_subs_macro : function(text, macro_name, blacklist, error, warn, nest_sub, start_idx) {
			var info = this._get_macro_info(macro_name);
			var old_text = text;
			
			info.pat.lastIndex = start_idx || 0;
			var m_found = info.pat.exec(text);
			if (!m_found || m_found.index != start_idx) {
				return null;
			}
			
			var params_found = [], last, nest = -1, in_string = false;
			
			// here macro invocations may be nested, so a regex is not
			// sufficient to "parse" this.
			for (var i = m_found.index; i < text.length; ++i) {
				if (text[i] == ',' && !nest) {
					params_found.push(trim(text.slice(last, i)));
					last = i+1;
				}
				
				if ( text[i] == '(' ) {
					if (++nest === 0) {
						last = i+1;
					}
				}
				else if ( (text[i] == '"' || text[i] == "'") && (!i || text[i-1] != '\\')) {
					if (in_string) {
						--nest;
					}
					else {
						++nest;
					}
					in_string = !in_string;
				}
				else if ( text[i] == ')' ) {
					if(--nest === -1) {
						params_found.push(trim(text.slice(last, i)));
						last = i+1;
						break;
					}
				}
			}
			
			if (nest !== -1) {
				error('unbalanced parentheses, expected )');
			}
		
			if (params_found.length != info.params.length) {
				// special case: if no arguments are expected and none passed either,
				// we will still get one empty argument from the previous logic.
				if (info.params.length || params_found.length > 1 || params_found[0]) {
					error('illegal invocation of macro ' + macro_name + ', expected ' + 
						info.params.length + ' parameters but got ' + 
						params_found.length);
				}
				else {
					params_found = [];
				}
			}
			
			// macro parameters may potentially be empty, but this would lead
			// to trouble in subsequent substitutions. So substitute a sentinel
			// string.
			for (var i = 0; i < params_found.length; ++i) {
				if (!params_found[i]) {
					params_found[i] = pseudo_token_empty;
				}
			}
		
			// insert arguments into replacement list, but evaluate them
			// PRIOR to doing this (6.10.3.1). We need, however, to 
			// exclude all arguments directly preceeded or succeeded by
			// either the stringization or the token concatenation operator
			var repl = state[macro_name];
			
			for (var  i = 0; i < info.params.length; ++i) {
				// what applies to empty parameter applies to whitespace in the
				// parameter text as well (only whitespace that concates two
				// otherwise distinct tokens). Substitute by a magic sentinel.
				// This must be done PRIOR to evaluating the parameters -
				// a parameter might evaluate to something like '2, 4'
				// which should obviously not be escaped.
				var param_subs = params_found[i].replace(/(\w)\s+(\w)/g,'$1' + pseudo_token_space+'$2');
				param_subs = this.subs( param_subs, blacklist, error, warn, nest_sub + 1);
				
				var rex = new RegExp("^"+info.params[i]+"\\b");
				var ignore = false, pieces = [], m, bound = true;
				for (var j = 0; j < repl.length; ++j) {
					if (repl[j] == '#') {
						ignore = true;
					}
					else if (bound && (m = rex.exec(repl.slice(j)))) {
						if (!ignore) {
							for (var k = j + m[0].length; k < repl.length; ++k) {
								if (repl[k] == '#') {
									ignore = true;
								}
								else if (!repl[k].match(/\s/)) {
									break;
								}
							}
						}
					
						pieces.push(repl.slice(0,j));
						pieces.push(ignore ? params_found[i] : param_subs);
						repl = repl.slice(j + m[0].length);
						
						j = -1;
						continue;
					}
					else if (!repl[j].match(/\s/)) {
						ignore = false;
					}
					bound = repl[j].match(/\W/);
				}
				
				
			
				pieces.push(repl);
				repl = pieces.join('');
			}
			return [repl,last - start_idx];
		},
		
		// ----------------------
		// Execute a sanitized arithmetic expression given by `scr` and return 
		// the result. This is not intended to be for 'security'. We do trust any
		// code that we preprocess. However, it would not be desirable if the
		// JS environment could be accidentially altered from within 
		// #if's, so let's try to hide eval()'s power as good as we can.
		_masked_eval : function(scr) {
			// based on http://stackoverflow.com/questions/543533/restricting-eval-to-a-narrow-scope
			if (!eval_mask) {
				// set up an object to serve as the context for the code
				// being evaluated. 
				eval_mask = {};
				
				// mask global properties 
				var glob = [];
				try {
					// browser environment, window object present
					glob = [window, {
						window:1
					}];
				}
				catch(e) {
					try {
						// node.js top-level objects present
						glob = [global, {
							global : 1,
							process : 1,
							require : 1,
							module : 1,
							__filename : 1,
							__dirname : 1
						}];
					} 
					catch(e) {}
				}
				
				for (var i = 0; i < glob.length; ++i) {
					for (var p in glob[i]) {
						eval_mask[p] = undefined;
					}
				}
				
				// bring defined() function into scope
				eval_mask.defined = this.defined;
			}
		
			eval_mask.__result__ = false;

			// execute script in private context
			(new Function( "with(this) { __result__ = (" + scr + "); }")).call(eval_mask);
			return eval_mask.__result__;
		},
		
		// ----------------------
		// Evaluate a raw and not yet preprocessed expression from a 
		// #if/#ifdef clause and return the result.
		_eval : function(val, error, warn) {
			var old_val = val;
			// see 6.10.1.2-3
			
			// string literals are not allowed 
			if (val.match(is_string_re)) {
				error('string literal not allowed in if expression');
			}
			
			// neither are assignment or compound assignment ops
			if (val.replace(/[=!<>]=/g,'').match(is_assignment_re)) {
				error('assignment operator not allowed in if expression');
			}
			
			// same for increment/decrement - we need to catch these
			// cases because they might be used to exploit eval().
			if (val.match(is_increment_re)) {
				error('--/++ operators not allowed in if expression');
			}
			
			// XXX handle character constants
			
			// drop the L,l,U,u suffixes for integer literals
			val = val.replace(is_integer_re,'$1$2$3');
			
			// macro substitution - but do not touch unary operands to 'defined',
			// this is done by substituting a safe sentinel value (which starts
			// with two underscores and is thus reserved).
			val = val.replace(defined_no_parens_re,'defined($1)');
			val = val.replace(defined_re,' __defined_magic_$1_ ');
			
			val = this.subs(val, {}, error, warn);
		
			// re-substitute defined() terms and quote the argument
			val = val.replace(defined_magic_sentinel_re,'defined("$1")');
			
			// replace all remaining identifiers with '0'
			val = val.replace(is_identifier_re,' 0 ');
		
			// what remains _should_ be safe to use with eval() since
			// it doesn't contain any identifiers and is thus not able
			// to invoke global functions. This version of eval is
			// even a bit safer and masks all global functions so 
			// anything we missed should eventually get caught.
			// See _masked_eval() for the details.
			try {
				var res = !!this._masked_eval(val);
			}
			catch (e) {
				error("error in expression: " + old_val + " (" + e + ")");
			}
			
			return res;
		}
	};
};

// node.js interface
if (typeof module !== 'undefined' && module.exports) {
    module.exports.create = cpp_js;
}



