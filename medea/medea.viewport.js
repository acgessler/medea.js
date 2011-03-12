

(function() {

	var medea = this;

	// use medea.CreateViewport() instead
	this.Viewport = function(name,x,y,w,h,zorder) {		
		this.name = name;
		this.x = x || 0;
		this.x = y || 0;
		this.x = w || 1.0;
		this.x = h || 1.0;
		this.zorder = zorder || 0;
	}

	this.Viewport.prototype = {

		name:""
		w = 1.0,
		h = 1.0,
		x = 0.0,
		y = 0.0,
		zorder = 0;

		
		GetName: function() {
			return this.name;
		},

		GetZOrder: function() {
			return zorder;
		}

		SetWidth: function(w) {
			this.w = w;
		},

		SetHeight: function(h) {
			this.h = h;
		},

		SetX: function(x) {
			this.x = x;
		},

		SetY: function(y) {
			this.y = y;
		},

		SetPos: function(x,y) {
			this.y = y;
			this.x = x;
		},

		SetSize: function(w,h) {
			this.w = w;
			this.h = h;
		},

		SetRect: function(x,y,w,h) {
			this.w = w;
			this.h = h;
			this.y = y;
			this.x = x;
		},


		GetWidth: function() {
			return this.w;
		},

		GetHeight: function() {
			return this.h;
		},

		GetX: function() {
			return this.x;
		},

		GetY: function() {
			return this.y;
		},

		GetRect: function() {
			return [this.x,this.y,this.w,this.h];
		},

		GetPos: function() {
			return [this.x,this.y];
		},

		GetSize: function() {
			return [this.w,this.h];
		},



		Render: function(dtime) {
			var rq = null; // medea.RenderQueueManager();

			this.VisitGraph(medea.GetRootNode(),function(node) {
				var e = node.GetEntities();
				for(var i = 0; i < e.length; ++i) {
					e[i].Render(vl,rq);
				}
			});
			//rq.Flush();
		}
	};
	

}).apply(medea);
