

medea.stubs["Entity"] = (function() {
	var medea = this;

	this.Entity = medea.Class.extend({
		name : "",
		
		init : function(name) {	
			if(name) {	
				this.name = name;
			}
		},
	
		Render : function(viewport,rqmanager) {
			// at this level of abstraction Render() is empty, deriving classes will substitute their own logic
		},
		
		Update : function(dtime) {
		}
	});
	
	medea.stubs["Entity"] = null;
});
