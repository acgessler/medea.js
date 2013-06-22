
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
	medea._NODE_FLAG_DIRTY_GI = 0x4;

	medea.NODE_FLAG_NO_ROTATION = 0x40;
	medea.NODE_FLAG_NO_SCALING = 0x80;

	medea.NODE_FLAG_USER = 0x100000;

	var id_source = 0;

	this.Node = medea.Class.extend({

		// this is to allow subclasses to have their own flags set when the node's transformation
		// matrix is altered. By default we only set DIRTY.
		trafo_dirty_flag: medea._NODE_FLAG_DIRTY |
			medea._NODE_FLAG_DIRTY_GI |
			medea._NODE_FLAG_DIRTY_BB,

		parent:null,


		init : function(name, flags) {
			this.children = [];
			this.entities = [];
			this.id = id_source++;
			this.name = name || ("UnnamedNode_" + this.id);

			// for culling purposes, saves the index of the frustun plane
			// that caused this node to be culled recently. This exploits
			// temporal coherence in the scene.
			this.plane_hint = [0];

			this.listeners = {
				'OnUpdateGlobalTransform' : {},
				'OnUpdateBB' : {},
			};

			this.lmatrix = mat4.identity(mat4.create());
			this.gmatrix = mat4.create();
			this.gimatrix = mat4.create();

			this.bb = medea.CreateBB();

			this.flags = this.trafo_dirty_flag | (flags || 0);
			this.enabled = true;
		},
		
		Enabled : function(e) {
			if (e === undefined) {
				return this.enabled;
			}
			this.enabled = e;
		},

		Name : function(n) {
			if (n === undefined) {
				return this.name;
			}
			this.name = n;
		},

		GetEntities: function() {
			return this.entities;
		},

		GetActiveEntities: function(cam) {
			return this.entities;
		},

		AddEntity: function(ent) {
			// #ifdef DEBUG
			medea.DebugAssert(ent instanceof medea.Entity,'need valid entity to attach');
			// #endif

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
			// #ifdef DEBUG
			medea.DebugAssert(child !== this,'cannot attach a node to itself');
			// #endif

			if(typeof child !== 'object' || !( child instanceof medea.Node )) {
				child = new medea.Node(child);
			}

			if(child.parent === this) {
				return;
			}

			this.children.push(child);
			this._SetBBDirty();

			child.OnAttach(this);
			return child;
		},

		RemoveChild: function(child) {
			var idx = this.children.indexOf(child);
			if(idx !== -1) {
				// #ifdef DEBUG
				medea.DebugAssert(child.parent === this,'inconsistent value for child.parent');
				// #endif

				this._SetBBDirty();
				child.OnAttach(null);

				this.children.splice(idx,1);
				child.parent = null;
			}
		},

		OnAttach : function(parent) {
			// #ifdef DEBUG
			medea.DebugAssert(parent !== this,'cannot attach node to itself');
			// #endif

			this.parent = parent;
			this._SetTrafoDirty();
		},

		Update: function(dtime) {
			// all regular updates are carried out lazily, so this is a no-op
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
			return medea.BBInFrustum(frustum, this.GetWorldBB(), this.plane_hint);
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
			this._UpdateInverseGlobalTransform();
			return this.gimatrix;
		},

		TryGetInverseGlobalTransform: function() {
			return this.flags & medea._NODE_FLAG_DIRTY_GI ? null : this.gimatrix;
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
			if (!(this.flags & medea._NODE_FLAG_DIRTY)) {
				return;
			}
			this.flags &= ~medea._NODE_FLAG_DIRTY;
			if (this.parent) {
				mat4.multiply(this.parent.GetGlobalTransform(),this.lmatrix,this.gmatrix);
			}
			else {
				this.gmatrix = mat4.create( this.lmatrix );
			}

			this._FireListener("OnUpdateGlobalTransform");
		},

		_UpdateInverseGlobalTransform: function() {
			if (!(this.flags & medea._NODE_FLAG_DIRTY_GI)) {
				return;
			}

			this._UpdateGlobalTransform();

			this.flags &= ~medea._NODE_FLAG_DIRTY_GI;
			mat4.inverse(this.gmatrix,this.gimatrix);
		},

		_SetTrafoDirty : function() {
			this.flags |= this.trafo_dirty_flag;
			this._SetBBDirty();

			for( var i = 0, c = this.children, l = c.length; i < l; ++i) {
				c[i]._SetTrafoDirty();
			}
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

			for( var i = 0, c = this.children, l = c.length; i < l; ++i) {
				bbs.push(c[i].GetWorldBB());
			}

			for( var i = 0, c = this.entities, l = c.length; i < l; ++i) {
				bbs.push(medea.TransformBB( c[i].BB(), this.GetGlobalTransform() ));
			}

			this.bb = medea.MergeBBs(bbs);

			// #ifdef DEBUG
			medea.DebugAssert(!!this.bb,"bounding box computation failed, but it shouldn't have");
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



