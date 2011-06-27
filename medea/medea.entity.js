

medea.stubs["Entity"] = (function() {

	this.Entity = function(name) {	
		if(name) {	
			this.name = name;
		}
	}

	this.Entity.prototype = {
		name : "",
	
		Render : function() {
			// at this level of abstraction Render() is empty, deriving classes will substitute their own logic
		}
	};
	
	medea.stubs["Entity"] = null;
});
