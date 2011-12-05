
/* medea - an Open Source, WebGL-based 3d engine for next-generation browser games.
 * (or alternatively, for clumsy and mostly useless tech demos written solely for fun)
 *
 * medea is (c) 2011, Alexander C. Gessler
 * licensed under the terms and conditions of a 3 clause BSD license.
 */

medea._addMod('node',['frustum'],function(undefined) {
	"use strict";
	
	medea.BB_INFINITE = 'i';
	medea.BB_EMPTY = 'e';
	

	medea._NODE_FLAG_DIRTY = 0x1;
	medea._NODE_FLAG_DIRTY_BB = 0x2;

	medea.NODE_FLAG_NO_ROTATION = 0x4;
	medea.NODE_FLAG_NO_SCALING = 0x8;
	
	var id_source = 0;

	this.Node = medea.Class.extend({

		// this is to allow subclasses to have their own flags set when the node's transformation
		// matrix is altered. By default we only set DIRTY.
		trafo_dirty_flag: medea._NODE_FLAG_DIRTY,
		parent:null,


		init : function(name, flags) {
			this.children = [];
			this.entities = [];
			this.name = name || "";
			this.id = id_source++;
			
			// for culling purposes, saves the index of the frustun plane
			// that caused this node to be culled recently. This exploits
			// temporal coherence in the scene.
			this.plane_hint = [0];

			this.listeners = {
				'OnUpdateGlobalTransform' : {},
				'OnUpdateBB' : {},
			};

			this.lmatrix = mat4.identity(mat4.create());
			this.gmatrix = mat4.identity(mat4.create());

			// min/max
			this.bb = medea.CreateBB();

			this.flags = medea._NODE_FLAG_DIRTY | medea._NODE_FLAG_DIRTY_BB | (flags || 0);
		},

		GetEntities: function() {
			return this.entities;
		},

		AddEntity: function(ent) {
			this.entities.push(ent);
			ent.OnAttach(this);

			this._SetBBDirty(); 
		},

		RemoveEntity: function(ent) {
			var idx = this.entities.indexOf(ent);
			if(idx !== -1) {
				ent.OnDetach(this);
				
				this._SetBBDirty();
				this.entities.splice(idx,1);
			}
		},

		GetChildren: function() {
			return this.children;
		},
		
		GetParent: function() {
			return this.parent;
		},

		AddChild: function(child) {
			if(typeof child !== 'object' || !( child instanceof medea.Node )) {
				child = new medea.Node(child);
			}

			if(child.parent === this) {
				return;
			}

			this.children.push(child);
			child.parent = this;

			this._SetBBDirty();
			return child;
		},

		RemoveChild: function(child) {
			var idx = this.children.indexOf(child);
			if(idx !== -1) {
				// #ifdef DEBUG
				medea.DebugAssert(child.parent === this,'inconsistent value for child.parent');
				// #endif

				this._SetBBDirty();
				this.children.splice(idx,1);
				child.parent = null;
			}
		},

		Update: function(dtime) {
			// all regular updates are carried out lazily
		},
		
		GetWorldBB: function() {
			this._UpdateBB();
			return this.bb;
		},

		GetBB: function() {
			this._UpdateBB();
			return this.bb;
		},
			
		Cull : function(frustum) {
			return medea.BBInFrustum(frustum, this.GetBB(), this.plane_hint);
		},

		// pure getter, nowadays deprecated
		GetLocalTransform: function() {
			return this.lmatrix;
		},

		LocalTransform: function(l) {
			if(l === undefined) {
				return this.lmatrix;
			}

			this._SetTrafoDirty();
			this.lmatrix = l;
		},

		GetGlobalTransform: function() {
			this._UpdateGlobalTransform();
			return this.gmatrix;
		},

		GetInverseGlobalTransform: function() {
			if (this.gimatrix) {
				return this.gimatrix;
			}
			return this.gimatrix = mat4.inverse(this.gmatrix,mat4.create());
		},

		Translate: function(vec) {
			mat4.translate(this.lmatrix,vec);
			this._SetTrafoDirty();
			return this;
		},

		Rotate: function(angle,axis) {
			// #ifdef DEBUG
			medea.DebugAssert(!(this.flags & medea.NODE_FLAG_NO_ROTATION),'node cannot be rotated');
			// #endif

			mat4.rotate(this.lmatrix,angle,axis);
			this._SetTrafoDirty();
			return this;
		},

		Scale: function(s) {
			// #ifdef DEBUG
			medea.DebugAssert(!(this.flags & medea.NODE_FLAG_NO_SCALING),'node cannot be scaled');
			// #endif

			mat4.scale(this.lmatrix, typeof s === 'number' ? [s,s,s] : s);
			this._SetTrafoDirty();
			return this;
		},

		ScaleToFit : function(s) {
			var bb = this.GetBB(), m = Math.max, e;
			e = m(-bb[0][0],bb[1][0]);
			e = m(e,m(-bb[0][1],bb[1][1]));
			e = m(e,m(-bb[0][2],bb[1][2]));
			if(e > 1e-6) {
				this.Scale((s===undefined?1.0:s)/e);
			}
		},

		ResetTransform: function() {
			this.lmatrix = mat4.identity(mat4.create());
			this._SetTrafoDirty();
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
			this._SetTrafoDirty();
		},

		LocalYAxis: function(l) {
			if(l === undefined) {
				return [this.lmatrix[4],this.lmatrix[5],this.lmatrix[6]];
			}
			var m = this.lmatrix;
			m[4] = l[0];
			m[5] = l[1];
			m[6] = l[2];
			this._SetTrafoDirty();
		},

		LocalZAxis: function(l) {
			if(l === undefined) {
				return [this.lmatrix[8],this.lmatrix[9],this.lmatrix[10]];
			}
			var m = this.lmatrix;
			m[8] = l[0];
			m[9] = l[1];
			m[10] = l[2];
			this._SetTrafoDirty();
		},

		LocalPos: function(l) {
			if(l === undefined) {
				return [this.lmatrix[12],this.lmatrix[13],this.lmatrix[14]];
			}
			var m = this.lmatrix;
			m[12] = l[0];
			m[13] = l[1];
			m[14] = l[2];
			this._SetTrafoDirty();
		},

		GetWorldPos : function() {
			this._UpdateGlobalTransform();
			return [this.gmatrix[12],this.gmatrix[13],this.gmatrix[14]];
		},

		GetWorldXAxis : function() {
			this._UpdateGlobalTransform();
			return [this.gmatrix[0],this.gmatrix[1],this.gmatrix[2]];
		},

		GetWorldYAxis : function() {
			this._UpdateGlobalTransform();
			return [this.gmatrix[4],this.gmatrix[5],this.gmatrix[6]];
		},

		GetWorldZAxis : function() {
			this._UpdateGlobalTransform();
			return [this.gmatrix[8],this.gmatrix[9],this.gmatrix[10]];
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
			// XXX need a solution for proper propagation of the dirty flag downwards the node hierarchy
			//if (!(this.flags & medea._NODE_FLAG_DIRTY)) {
			//	return;
			//}
			this.flags &= ~medea._NODE_FLAG_DIRTY;
			if (this.parent) {
				mat4.multiply(this.parent.GetGlobalTransform(),this.lmatrix,this.gmatrix);
			}
			else {
				this.gmatrix = mat4.create( this.lmatrix );
			}
			
			this.gimatrix = null;
			this._FireListener("OnUpdateGlobalTransform");
			return this.gmatrix;
		},
		
		_SetTrafoDirty : function() {
			this.flags |= this.trafo_dirty_flag;
			this._SetBBDirty();
		},
		
		_SetBBDirty : function() {
			this.flags |= medea._NODE_FLAG_DIRTY_BB;
			if (this.parent) {
				this.parent._SetBBDirty();
			}
		},

		_UpdateBB: function() {
			if (!(this.flags & medea._NODE_FLAG_DIRTY_BB)) {
				return;
			}
			this.flags &= ~medea._NODE_FLAG_DIRTY_BB;
			var bbs = [];

			for(var i = 0; i < this.children.length; ++i) {
				var c = this.children[i];
				bbs.push(c.GetBB());
			}

			for(var i = 0; i < this.entities.length; ++i) {
				bbs.push(medea.TransformBB( this.entities[i].BB(), this.GetGlobalTransform() ));
			}

			this.bb = medea.MergeBBs(bbs);
			
			// #ifdef DEBUG
			if (!this.bb) {
				medea.DebugAssert("bounding box computation failed, but it shouldn't have");
			}
			// #endif

			this._FireListener("OnUpdateBB");
			return this.bb;
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

	//
	medea.CreateNode = function(name, flags) {
		return new medea.Node(name, flags);
	};
});



