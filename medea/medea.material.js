

medea.stubs["Material"] = (function() {
	var medea = this;

	medea.Material = medea.Class.extend({
		name : "",
		
		init : function(name) {	
			if(name) {	
				this.name = name;
			}
		},
	});
	
	medea.CreateSimpleMaterialFromColor = function(color) {
		return new medea.Material();
	};
	
	medea.stubs["Material"] = null;
});
