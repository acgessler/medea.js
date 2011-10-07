

medea.stubs["node"] = (function(undefined) {

	medea._NODE_FLAG_DIRTY = 0x1;

	this.Node = medea.Class.extend({
		name:"",
		
		// this is to allow subclasses to have their own flags set when the node's transformation
		// matrix is altered. By default we only set DIRTY.
		trafo_dirty_flag: medea._NODE_FLAG_DIRTY,
		
		parent:null,
		
		lmatrix:null,
		gmatrix:null,
		
		init : function(name) {		
			this.children = [];
			this.entities = [];
			this.name = name || "";
			
			this.listeners = {
				'OnUpdateGlobalTransform' : {},
			};
			
			this.lmatrix = mat4.identity(mat4.create());
			this.gmatrix = mat4.identity(mat4.create());
			
			this.flags = medea._NODE_FLAG_DIRTY;
		},

		GetEntities: function() {
			return this.entities;
		},
		
		AddEntity: function(ent) {
			this.entities.push(ent);
			ent.OnSetParent(this);
		},
		
		RemoveEntity: function(ent) {
			ent.OnSetParent(null);
			delete this.entities[ent];
		},

		GetChildren: function() {
			return this.children;
		},

		AddChild: function(child) {
			child = child || new medea.Node();
		
			this.children.push(child);
			child.parent = this;
			
			return child;
		},
		
		RemoveChild: function(child) {
			delete this.children[child];
			child.parent = this;
		},

		Update: function(dtime) {
			this._UpdateGlobalTransform();
		},
		
		GetLocalTransform: function() {
			return this.lmatrix;
		},
		
		GetGlobalTransform: function() {
			this._UpdateGlobalTransform();
			return this.gmatrix;
		},
		
		Translate: function(vec) {
			mat4.translate(this.lmatrix,vec);
			this.flags |= this.trafo_dirty_flag;
			return this;
		},
		
		Rotate: function(angle,axis) {
			mat4.rotate(this.lmatrix,angle,axis);
			this.flags |= this.trafo_dirty_flag;
			return this;
		},
		
		Scale: function(s) {
			mat4.scale(this.lmatrix, typeof s === 'number' ? [s,s,s] : s);
			this.flags |= this.trafo_dirty_flag;
			return this;
		},
		
		ResetTransform: function() {
			this.lmatrix = mat4.identity(mat4.create());
			this.flags |= this.trafo_dirty_flag;
			return this;
		},
		
		LocalXAxis: function(l) {
			if(l === undefined) {
				return [this.lmatrix[0],this.lmatrix[1],this.lmatrix[2]];
			}
			var m = this.lmatrix;
			m[0] = l[0];
			m[1] = l[1];
			m[2] = l[2];
			this.flags |= this.trafo_dirty_flag;
		},
		
		LocalYAxis: function(l) {
			if(l === undefined) {
				return [this.lmatrix[4],this.lmatrix[5],this.lmatrix[6]];
			}
			var m = this.lmatrix;
			m[4] = l[0];
			m[5] = l[1];
			m[6] = l[2];
			this.flags |= this.trafo_dirty_flag;
		},
		
		LocalZAxis: function(l) {
			if(l === undefined) {
				return [this.lmatrix[8],this.lmatrix[9],this.lmatrix[10]];
			}
			var m = this.lmatrix;
			m[8] = l[0];
			m[9] = l[1];
			m[10] = l[2];
			this.flags |= this.trafo_dirty_flag;
		},
		
		LocalPos: function(l) {
			if(l === undefined) {
				return [this.lmatrix[12],this.lmatrix[13],this.lmatrix[14]];
			}
			var m = this.lmatrix;
			m[12] = l[0];
			m[13] = l[1];
			m[14] = l[2];
			this.flags |= this.trafo_dirty_flag;
		},
		
		AddListener : function(what,l, key) {
			// #ifdef DEBUG
			if(!(what in this.listeners)) {
				medea.DebugAssert('listener not recognized ' + what);
			}
			// #endif
			this.listeners[what][key] = l;
		},
		
		RemoveListener : function(key) {
			for(var k in this.listeners) {
				try {
					delete this.listeners[k][key];
				}
				catch(e) {
				}
			}
		},
		
		_UpdateGlobalTransform: function() {
			if (!(this.flags & medea._NODE_FLAG_DIRTY)) {
				return;
			}
			this.flags &= ~medea._NODE_FLAG_DIRTY;
			if (this.parent) {
				mat4.multiply(this.parent.GetGlobalTransform(),this.lmatrix,this.gmatrix);
			}
			else this.gmatrix = this.lmatrix;
			
			this._FireListener("OnUpdateGlobalTransform");
			return this.gmatrix;
		},
		
		_FireListener : function(what) {
			var l = this.listeners[what];
			if(l) {
				for(var k in l) {
					l[k].apply(this,arguments);
				}
			}
		},

	});
	
	medea.stubs["node"] = null;
});
