

medea.stubs["Node"] = (function() {

	this.Node = medea.Class.extend({
		name:"",
		
		init : function(name) {		
			this.children = [];
			this.entities = [];
			this.name = name || "";
		},

		GetEntities: function() {
			return this.entities;
		},

		GetChildren: function() {
			return this.children;
		},

		AddChild: function(name_or_child) {
			this.children.push(name_or_child);
		},

		Update: function(dtime) {
		}

	});
	
	medea.stubs["Node"] = null;
});
