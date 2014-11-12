
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('node',['frustum'],function(medealib, undefined) {
	"use strict";

	var medea = this;

	// #constant

	//-
	// A constant to designate a bounding box of infinite extent.
	//
	// BB_INFINITE can be used almost every time a bounding box
	// is expected, except when otherwise noted.
	//
	// It is possible to assign a static bounding box of this type to a node,
	// effectively disabling culling for it since an infinite bounding box
	// is always visible.
	//
	// Be careful: BB_INFINITE propagates the scene hierarchy upwards.
	// #medea:Node:SetStaticBB
	medea.BB_INFINITE = 'i';

	//-
	// A constant to designate a zero-sized bonding box.
	//
	// BB_EMPTY can be used almost every time a bounding box
	// is expected, except when otherwise noted.
	//
	// Culling-wise, an empty bounding box is never visible.
	medea.BB_EMPTY = 'e';

	medea._NODE_FLAG_DIRTY = 0x1;
	medea._NODE_FLAG_DIRTY_BB = 0x2;
	medea._NODE_FLAG_DIRTY_GI = 0x4;
	medea._NODE_FLAG_STATIC_BB = 0x8;

	//-
	medea.NODE_FLAG_NO_ROTATION = 0x40;
	
	//-
	medea.NODE_FLAG_NO_SCALING = 0x80;

	medea.NODE_FLAG_USER = 0x100000;


	// Flag for |medea.CloneNode|
	// Performs a shallow clone of the node hierarchy, using the same
	// entities as the original node. 
	medea.NODE_CLONE_SHALLOW = 0x1;



	var id_source = 0;

	//-
	// Represents a node in the scenegraph.
	//
	// A scene is represented by a tree structure, called the "scenegraph",
	// which is rooted at a pre-existing root node that is accessible
	// via -> #medea:RootNode.
	//
	// Each node in the tree carries a transformation offset with respect
	// to its parent and offers convenience methods to scale, rotate or
	// translate the subtree of the scenegraph that is rooted here.
	//
	// Entities (i.e. meshes, lights) are attached to the scene graph nodes.
	// (this means they form the leaves of the tree).
	//
	// Furthermore, nodes carry a bounding box, which is used to determine
	// visibility (culling) of a subtree during rendering. The bounding
	// box is by default calculated as the union of all child nodes and
	// attached entities. A custom bounding box can be set using
	// -> #medea:Node:SetStaticBB.
	//
	// While some frameworks encourage to inherit from the scenegraph
	// Node class, medea does not: in most cases, custom logic can
	// reside in entities, not nodes.
	//
	// -> #medea:Entity
	// -> #medea:CreateNode
	medea.Node = medealib.Class.extend({

		// This is to allow subclasses to have their own flags set when
		// the node's transformation matrix is altered. By default we
		// only set DIRTY.
		trafo_dirty_flag: medea._NODE_FLAG_DIRTY |
			medea._NODE_FLAG_DIRTY_GI |
			medea._NODE_FLAG_DIRTY_BB,

		parent : null,
		children : null,
		entities : null,
		id : null,
		name : null,
		plane_hint : null,
		listeners : null,
		lmatrix : null,
		gmatrix : null,
		gimatrix : null,
		bb : null,
		flags : null,
		enabled : null,
		static_bb : null,

		init : function(name, flags) {
			this.children = [];
			this.entities = [];
			this.id = id_source++;
			this.name = name || ("UnnamedNode_" + this.id);

			// For culling purposes, saves the index of the frustun plane
			// that caused this node to be culled recently. This exploits
			// temporal coherence in the scene.
			this.plane_hint = [0];

			this.listeners = {
				'OnUpdateGlobalTransform' : {},
				'OnUpdateBB' : {}
			};

			this.lmatrix = mat4.identity(mat4.create());
			this.gmatrix = mat4.create();
			this.gimatrix = mat4.create();

			this.bb = medea.CreateBB();

			this.flags = this.trafo_dirty_flag | (flags || 0);
			this.enabled = true;
		},

		// 
		GetFlags : function() {
			// Dirty flags should never be of relevance to a user
			return this.flags & ~this.trafo_dirty_flag;
		},
		
		//-
		// Enable or disable a node for rendering and updating.
		//
		// Disabled nodes still contribute their BB to the parent's
		// bounding box, but are neither updated or rendered.
		//
		// This is a cheap way of selectively enabling parts of a
		// scene without incurring expensive scenegraph changes.
		//
		// A node is initially enabled.
		Enabled : function(e) {
			if (e === undefined) {
				return this.enabled;
			}
			this.enabled = e;
		},

		//-
		// Name property: names are used to identify nodes, for example
		// during scenegraph traversal.
		Name : function(n) {
			if (n === undefined) {
				return this.name;
			}
			this.name = n;
		},

		GetEntities: function() {
			return this.entities;
		},

		//- Currently the same as -> #GetEntities
		GetActiveEntities: function(cam) {
			return this.entities;
		},

		//- Add an entity to the nodes.
		//
		// Nothing happens if the entity has been added before.
		//
		// |ent| : #medea:Entity
		AddEntity: function(ent) {
			// #ifdef DEBUG
			medealib.DebugAssert(ent instanceof medea.Entity,'need valid entity to attach');
			// #endif

			if (this.entities.indexOf(ent) !== -1) {
				return;
			}

			this.entities.push(ent);
			ent.OnAttach(this);

			this._SetBBDirty();
		},

		//-
		// Note: when doing this from within Entity.Update(), return medea.ENTITY_UPDATE_WAS_REMOVED
		RemoveEntity: function(ent) {
			var idx = this.entities.indexOf(ent);
			if(idx !== -1) {
				ent.OnDetach(this);

				this._SetBBDirty();
				this.entities.splice(idx,1);
			}
		},
		
		//-
		//
		RemoveAllEntities: function(tag) {
			if(tag === undefined) {
				for (var i = 0; i < this.entities.length; ++i) {
					this.entities[i].OnDetach(this);
				}
				
				this.entities = [];
				this._SetBBDirty();
				return;
			}
			for (var i = 0; i < this.entities.length; ++i) {
				var ent = this.entities[i];
				if(ent.Tag() !== tag) {
					continue;
				}
				
				ent.OnDetach(this);

				this._SetBBDirty();
				this.entities.splice(i,1);
			}
		},

		FilterEntities : function(classes, callback) {
			if (Array.isArray(classes)) {
				var ce = classes.length;
				for (var i = 0, e = this.entities.length; i < e; ++i) {
					var ent = this.entities[i];
					for (var c = 0; c < ce; ++c) {
						if (ent instanceof classes[c]) {
							callback(ent);
						}
					}
				}
				return;
			}

			for (var i = 0, e = this.entities.length; i < e; ++i) {
				var ent = this.entities[i];
				if (ent instanceof classes) {
					callback(ent);
				}
			}
		},

		FilterEntitiesRecursively : function(classes, callback) {
			this.FilterEntities(classes, callback);
			var e = this.children.length;
			for (var i = 0; i < e; ++i) {
				this.children[i].FilterEntitiesRecursively(classes, callback);
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
			medealib.DebugAssert(child !== this,'cannot attach a node to itself');
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
				medealib.DebugAssert(child.parent === this,'inconsistent value for child.parent');
				// #endif

				this._SetBBDirty();
				child.OnAttach(null);

				this.children.splice(idx,1);
				child.parent = null;
			}
		},

		RemoveAllChildren: function() {
			while (this.children.length > 0) {
				this.RemoveChild(this.children[0]);
			}
		},

		OnAttach : function(parent) {
			// #ifdef DEBUG
			medealib.DebugAssert(parent !== this,'cannot attach node to itself');
			// #endif

			this.parent = parent;
			this._SetTrafoDirty();
		},

		// Update gets called once per frame with the |dtime| passed
		// since the last frame, in seconds.
		Update: function(dtime) {
			// All regular updates are carried out lazily, so this is a no-op
		},

		// Render gets called once per frame per camera for nodes that are
		// at least partially visible with respect to the camera.
		//
		// The default implementation does nothing.
		//
		// It gets called *before* Render() is called on all entities that are
		// attached to the node. It is also called *before* recursing into node
		// children (or even checking if they are visible), so any changes made
		// to the node's children take effect immediately.
		Render : function(camera, rqmanager) {
		},

		// Assign a static (local) AABB to the node.
		//
		// |static_bb| will be the static Bounding Box (can be an oriented BB)
		// that is used for culling the node from now on. Automatic upwards
		// propagation of changes to bounding boxes is disabled in sub trees
		// rooted at a static bounding box, saving updates. Changes to the
		// static BB are still propagated to its own parents, though.
		//
		// The static BB is specified in local space. It is transformed
		// by and affected by changes to the node's world matrix.
		//
		// Use this to
		//   1) force a specific bounding box size (i.e. for nodes whose child
		//      nodes are dynamically populated, i.e. a terrain quad tree).
		//   2) avoid any further BB updates if further changes are negligible.
		//      To do so, use |SetStaticBB(GetBB())|
		//
		// To go back to automatic BB calculation, pass |static_bb| falsy.
		SetStaticBB : function(static_bb) {
			if (!static_bb) {
				this.flags &= ~medea._NODE_FLAG_STATIC_BB;
				this.flags |= medea._NODE_FLAG_DIRTY_BB;
				this._UpdateBB();
				return;
			}
			this.flags |= medea._NODE_FLAG_STATIC_BB | medea._NODE_FLAG_DIRTY_BB;
			this.static_bb = static_bb;

			this.bb = null;
			this._FireListener("OnUpdateBB");

			// Propagate the static bounding box up in the tree
			if (this.parent) {
				this.parent._SetBBDirty();
			}
		},

		// Returns a static BB previously set using |SetStaticBB| or |null|
		// if no static bounding box is set.
		GetStaticBB : function() {
			if (this.flags & medea._NODE_FLAG_STATIC_BB) {
				return null;
			}
			return this.static_bb;
		},

		// Returns a world-space AABB for this node.
		//
		// Possible results are also the two special BBs |medea.BB_EMPTY|
		// and |medea.BB_INFINITE|. Unless one of the two occurs, the
		// resulting AABB is always an array of length 2, the first
		// element being a vec3 with the minimum vertices and the second
		// element being a vec3 with the maximum vertices for the
		// AABB that contains the node in world-space.
		//
		// TODO: rename to GetAABB(), the current name is misleading
		// as the BB returned by |GetBB| is strictly speaking also
		// given in world space.
		GetWorldBB: function() {
			this._UpdateBB();
			return this.bb;
		},

		// Returns any BB for this node.
		//
		// Unlike |GetWorldBB| the result value can also be an oriented
		// bounding box for which a third array element contains the
		// transformation matrix by which to transform all corner points
		// of the box.
		//
		// |medea.MakeAABB(GetBB()) equals GetWorldBB()| always holds.
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

		LocalTransform: function(l, no_copy) {
			if(l === undefined) {
				return this.lmatrix;
			}

			this._SetTrafoDirty();

			if(no_copy) {
				this.lmatrix = l;
			}
			else {
				mat4.set(l, this.lmatrix);
			}
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
			mat4.translate(this.lmatrix, vec);
			this._SetTrafoDirty();
			return this;
		},

		TransformBy : function(mat) {
			mat4.multiply(this.lmatrix, mat, this.lmatrix);
			this._SetTrafoDirty();
			return this;
		},

		Rotate: function(angle,axis) {
			// #ifdef DEBUG
			medealib.DebugAssert(!(this.flags & medea.NODE_FLAG_NO_ROTATION),'node cannot be rotated');
			// #endif

			mat4.rotate(this.lmatrix,angle,axis);
			this._SetTrafoDirty();
			return this;
		},

		// Order of translate and scale matters
		Scale: function(s) {
			// #ifdef DEBUG
			medealib.DebugAssert(!(this.flags & medea.NODE_FLAG_NO_SCALING),'node cannot be scaled');
			// #endif

			mat4.scale(this.lmatrix, typeof s === 'number' ? [s,s,s] : s);
			this._SetTrafoDirty();
			return this;
		},

		ScaleToFit : function(s) {
			var bb = this.GetBB()
			,	m
			,	e
			;
			// #ifdef DEBUG
			medealib.DebugAssert(!(this.flags & medea.NODE_FLAG_NO_SCALING),'node cannot be scaled');
			medealib.DebugAssert(bb.length === 2, 'must be AABB');
			// #endif

			e = Math.max(-bb[0][0],bb[1][0],-bb[0][1],bb[1][1],-bb[0][2],bb[1][2]);
			if(e > 1e-6) {
				e = ( s === undefined ? 1.0 : s) / e;

				var vec = [e, e, e, 0];

				// bbs are in world-space, so we have to make it a world-space scaling
				// it is not our job to correct non-uniform scale occuring anywhere
				// in the tree stem, so take the min scale that is in the parent transform
				if(this.parent) {
					var pinv = this.parent.GetGlobalTransform()
					,	v1 = [pinv[0],pinv[4],pinv[8]]
					,	v2 = [pinv[1],pinv[5],pinv[9]]
					,	v3 = [pinv[2],pinv[6],pinv[10]]
					;
					e = e / Math.sqrt(Math.min(vec3.dot(v1,v1), vec3.dot(v2,v2), vec3.dot(v3,v3)));
				}
				
				this.Scale(e);

				// also apply scaling to the translation component
				this.lmatrix[12] *= e;
				this.lmatrix[13] *= e;
				this.lmatrix[14] *= e;
			}		
		},

		Center : function(world_point) {
			world_point = world_point || [0,0,0];

			var bb = this.GetBB();

			// #ifdef DEBUG
			medealib.DebugAssert(bb.length === 2, 'must be AABB');
			// #endif

			var x = bb[1][0] + bb[0][0];
			var y = bb[1][1] + bb[0][1];
			var z = bb[1][2] + bb[0][2];
			var vec = [-x/2 + world_point[0], -y/2 + world_point[1], -z/2 + world_point[2]];

			// bbs are in world-space, so we have to make it a world-space translation
			// by using the parent global transform as offset
			if(this.parent) {
				var pinv = this.parent.GetInverseGlobalTransform();
				mat4.multiplyVec3(pinv, vec);
			}
			this.Translate(vec);
		},


		ResetTransform: function() {
			mat4.identity(this.lmatrix);
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

		GetWorldScale: function() {
			this._UpdateGlobalTransform();
			var m = this.gmatrix;

			// Scaling factors can be found as the lengths of the row vectors
			var x_len = Math.sqrt(m[0] * m[0] + m[4] * m[4] + m[8] * m[8]);
			var y_len = Math.sqrt(m[1] * m[1] + m[5] * m[5] + m[11] * m[11]);
			var z_len = Math.sqrt(m[2] * m[2] + m[6] * m[6] + m[12] * m[12]);
			return [x_len, y_len, z_len];
		},

		// Returns the scaling factor that is applied along the world
		// x-axis. If all scaling transformations applied to the
		// node are uniform scalings, this can be considered the world
		// scaling.
		GetWorldUniformScale: function() {
			this._UpdateGlobalTransform();
			var m = this.gmatrix;

			// Scaling factors can be found as the lengths of the row vectors
			// So any row will do.
			var x_len = Math.sqrt(m[0] * m[0] + m[4] * m[4] + m[8] * m[8]);

			// TODO: If the scalings along the axes disagree, a suitable
			// generalization would be the spectral norm of the world
			// transformation matrix given by
			//
			// |sqrt(lambda_max(M^T * M))|
			//
			// where lambda_max(X) denotes the largest eigen value of X.
			return x_len;
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
				medealib.DebugAssert('listener not recognized ' + what);
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

			var children = this.children;
			for( var i = children.length-1; i >= 0; --i ) {
				children[i]._SetTrafoDirty();
			}
		},

		_SetBBDirty : function() {
			// No upwards propagation for static bounding boxes.
			// See SetStaticBB()
			if (this.flags & (medea._NODE_FLAG_STATIC_BB | medea._NODE_FLAG_DIRTY_BB)) {
				return;
			}
			var node = this, flag = medea._NODE_FLAG_DIRTY_BB;
			do {
				node.flags |= flag;
				node = node.parent;
			}
			// This could be simplified by calling _SetBBDirty()
			// on the parent. This would have significant perf
			// overhead though, so let's leave it unrolled.
			while(node != null && (node.flags & (medea._NODE_FLAG_STATIC_BB | medea._NODE_FLAG_DIRTY_BB)) === 0);
		},

		_UpdateBB: function() {
			if (!(this.flags & medea._NODE_FLAG_DIRTY_BB)) {
				return;
			}

			var trafo = this.GetGlobalTransform();
			this.flags &= ~medea._NODE_FLAG_DIRTY_BB;

			// For static bounding boxes, the BB is only transformed to a
			// worldspace AABB. Children are not taken into account.
			// See SetStaticBB()
			if (this.flags & medea._NODE_FLAG_STATIC_BB) {
				this.bb = medea.MakeAABB(medea.TransformBB( this.static_bb, trafo ));
				return;
			}

			var bbs = new Array(this.children.length + this.entities.length);

			var children = this.children;
			for( var i = children.length-1; i >= 0; --i ) {
				bbs[i] = children[i].GetBB();
			}

			var entities = this.entities;
			for( var i = entities.length-1; i >= 0; --i ) {
				bbs[i + children.length] = medea.TransformBB( entities[i].BB(), trafo );
			}

			this.bb = medea.MergeBBs(bbs);

			// #ifdef DEBUG
			medealib.DebugAssert(!!this.bb,"bounding box computation failed, but it shouldn't have");
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
		}
	});

	//
	medea.CreateNode = function(name, flags) {
		return new medea.Node(name, flags);
	};


	// Clone the existing |node|.
	// |clone_flags| can be any of the |medea.NODE_CLONE_XXX| bitwise flags to control cloning.
	//
	// Currently, cloning is not polymorphic. Inheriting classes such as Camera do
	// get cloned as raw nodes only.
	medea.CloneNode = function(node, clone_flags) {
		clone_flags = clone_flags | medea.NODE_CLONE_SHALLOW;
		if (!(clone_flags & medea.NODE_CLONE_SHALLOW)) {
			medealib.DebugAssert("CloneNode: modes other than NODE_CLONE_SHALLOW are not currently supported");
		}

		// TODO: assign a proper name
		var new_node = medea.CreateNode(undefined, node.GetFlags());

		new_node.LocalTransform(node.LocalTransform());
		new_node.Enabled(node.Enabled());
		new_node.SetStaticBB(node.GetStaticBB());

		// TODO: dispatch to Node implementation to allow descendents to modify or block the cloning

		var entities = node.entities;
		for (var i = 0; i < entities.length; ++i) {
			new_node.AddEntity(entities[i]);
		}

		var children = node.children;
		for (var i = 0; i < children.length; ++i) {
			var new_child = medea.CloneNode(children[i], clone_flags);
			new_node.AddChild(new_child);
		}

		return new_node;
	};
});



