

medea.stubs["node"] = (function(undefined) {

	medea._NODE_FLAG_DIRTY = 0x1;

	this.Node = medea.Class.extend({
		name:"",
		flags:0,
		
		parent:null,
		
		lmatrix:null,
		gmatrix:null,
		
		init : function(name) {		
			this.children = [];
			this.entities = [];
			this.name = name || "";
			
			this.lmatrix = mat4.identity(mat4.create());
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
			this.children.push(child);
			child.parent = this;
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
			this.flags |= medea._NODE_FLAG_DIRTY;
		},
		
		Rotate: function(angle,axis) {
			mat4.rotate(this.lmatrix,angle,axis);
			this.flags |= medea._NODE_FLAG_DIRTY;
		},
		
		ScaleUniform: function(s) {
			mat4.scale(this.lmatrix,[s,s,s]);
			this.flags |= medea._NODE_FLAG_DIRTY;
		},
		
		ScaleNonUniform: function(v) {
			mat4.scale(this.lmatrix,v);
			this.flags |= medea._NODE_FLAG_DIRTY;
		},
		
		ResetTransform: function() {
			this.lmatrix = mat4.identity(mat4.create());
			this.flags |= medea._NODE_FLAG_DIRTY;
		},
		
		_UpdateGlobalTransform: function() {
			if (!(this.flags & medea._NODE_FLAG_DIRTY)) {
				return;
			}
			this.flags &= ~medea._NODE_FLAG_DIRTY;
			if (this.parent) {
				return mat4.multiply(this.parent.GetGlobalTransform(),this.lmatrix,this.gmatrix);
			}
			return this.gmatrix = this.lmatrix;
		},

	});
	
	medea.stubs["node"] = null;
});
