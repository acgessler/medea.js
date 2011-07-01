

medea.stubs["Node"] = (function() {

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
			
			this.lmatrix = M4x4.clone(M4x4.I);
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
			M4x4.translateSelf(vec,this.lmatrix);
			this.flags |= medea._NODE_FLAG_DIRTY;
		},
		
		Rotate: function(angle,axis) {
			M4x4.rotate(angle,axis,this.lmatrix,this.lmatrix);
			this.flags |= medea._NODE_FLAG_DIRTY;
		},
		
		ScaleUniform: function(s) {
			M4x4.scale1(s,this.lmatrix,this.lmatrix);
			this.flags |= medea._NODE_FLAG_DIRTY;
		},
		
		ScaleNonUniform: function(v) {
			M4x4.scale(v,this.lmatrix,this.lmatrix);
			this.flags |= medea._NODE_FLAG_DIRTY;
		},
		
		ResetTransform: function() {
			this.lmatrix = M4x4.clone(M4x4.I);
			this.flags |= medea._NODE_FLAG_DIRTY;
		},
		
		_UpdateGlobalTransform: function() {
			if (!(this.flags & medea._NODE_FLAG_DIRTY)) {
				return;
			}
			this.flags &= ~medea._NODE_FLAG_DIRTY;
			if (this.parent) {
				return M4x4.Mul(this.parent.GetGlobalTransform(),this.lmatrix,this.gmatrix);
			}
			return this.gmatrix = this.lmatrix;
		},

	});
	
	medea.stubs["Node"] = null;
});
