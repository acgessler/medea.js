

medea.stubs["Entity"] = (function() {

	this.Entity = medea.Class.extend({
		name : "",
		
		init : function(name) {	
			if(name) {	
				this.name = name;
			}
		},
	
		Render : function(viewport,rqmanager) {
			// at this level of abstraction Render() is empty, deriving classes will substitute their own logic
		}
	});
	
	medea.stubs["Entity"] = null;
});
