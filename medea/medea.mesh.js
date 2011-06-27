
medea.stubs["Mesh"] = (function() {

	var medea = this;
	this.Mesh = medea.Entity.extend(
	{
		Render : function(viewport,rqmanager) {
			// construct a renderable capable of drawing this mesh upon request by the render queue manager
		}
	});
	
	medea.stubs["Mesh"] = null;
});

