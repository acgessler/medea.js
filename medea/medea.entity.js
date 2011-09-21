

medea.stubs["entity"] = (function() {
	var medea = this;

	this.Entity = medea.Class.extend({
		name : "",
		parent : null,
		
		init : function(name) {	
			if(name) {	
				this.name = name;
			}
		},
	
		Render : function(viewport,rqmanager) {
			// at this level of abstraction Render() is empty, deriving classes will substitute their own logic
		},
		
		Update : function(dtime) {
		},
		
		
		OnSetParent : function(parent) {
				this.parent = parent;
		},
	});
	
	medea.stubs["entity"] = null;
});
