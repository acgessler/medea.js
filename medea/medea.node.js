

medea.stubs["Node"] = (function() {

	this.Node = function(name) {		
		this.children = [];
		this.entities = [];
		this.name = name || "";
	}

	this.Node.prototype = {
		name:"",

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

	};
	
	medea.stubs["Node"] = null;
});
