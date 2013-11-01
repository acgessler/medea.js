
// Based on https://github.com/mrdoob/stats.js, this is a stats display
// that relies on external input instead of measuring by itself.

// It can, therefore, be used to measure any stats data.
// For performance (DOM!) update() call frequency should be throttled.
var MiniStatsDisplay = function (config) {
	var predef_styles = [
		  ['#002','#0ff','#133']
		, ['#020','#0f0','#130']
		, ['#200','#f00','#131']
		, ['#220','#ff0','#131']
	];

	var	width 			= config.width || 80
	,	caption 		= config.caption || 'stat'
	,	stat 			= 0
	,	stat_min 		= Infinity
	,	stat_max 		= 0
	,	frames 			= 0
	,	style 			= predef_styles[config.style || 0]
	,	bar_width		= config.bar_width || 4
	,	bar_count		= Math.floor((width-6)/bar_width)
	,	left			= config.left || 0
	,	top				= config.top || 0
	,	range			= config.range ? [config.range[0], config.range[1]] : [0,100]
	,	range_changed 	= false
	,	range_upd_freq	= config.autorange
	;

	var container = document.createElement( 'div' );
	container.id = 'stats';
	container.style.cssText = 'width:'+width+'px;opacity:0.9;cursor:pointer';

	var statDiv = document.createElement( 'div' );
	statDiv.id = 'stat';
	statDiv.style.cssText = 'padding:0 0 3px 3px;text-align:left;'+
		'background-color:'+style[0];
	container.appendChild( statDiv );

	var statText = document.createElement( 'div' );
	statText.id = 'statText';
	statText.style.cssText = 'font-family:Helvetica,Arial,sans-serif;'+
		'font-size:9px;font-weight:bold;line-height:15px;color:' + style[1];
	statText.innerHTML = 'stat';
	statDiv.appendChild( statText );

	var stat_graph = document.createElement( 'div' );
	stat_graph.id = 'stat_graph';
	stat_graph.style.cssText = 'position:relative;width:' + 
		(bar_count * bar_width)+'px;height:30px;background-color:'+style[1];
	statDiv.appendChild( stat_graph );

	while ( stat_graph.children.length < bar_count ) {
		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:'+bar_width+'px;height:30px;float:left;'+
			'background-color:'+style[2];
		stat_graph.appendChild( bar );
	}

	container.style.position = 'absolute';
	container.style.left = left + 'px';
	container.style.top = top + 'px';
	document.body.appendChild( container );

	var updateGraph = function ( dom, value ) {
		var child = dom.appendChild( dom.firstChild );
		child.style.height = value + 'px';
	}

	return {

		container : container,

		destroy : function() {
			document.body.removeChild( container );
		},

		range : function(lower, upper) {
			range = [lower|0, upper|0];
			range_changed = true;
		},

		autorange : function(update_frequency) {
			range_upd_freq = update_frequency|0;
		},

		update: function (new_val) {
			var i, kids, new_range, e;

			new_val = new_val|0;
			stat_min = Math.min( stat_min, new_val );
			stat_max = Math.max( stat_max, new_val );

			// if autorange is enabled, update the range every n frames
			// with the minimum/maximum values collected in this time
			// and clear those.
			if(range_upd_freq && (frames % range_upd_freq) === range_upd_freq - 1) {
				e = Math.max(1, (range[1] - range[0]) >> 3);

				new_range = [Math.floor(stat_min * 0.9), Math.ceil(stat_max * 1.1)];
				if (Math.abs(new_range[0] - range[0]) > e || Math.abs(new_range[1] - range[1]) > e) {
					range = new_range;
					range_changed = true;
				}
			}

			// if the range changed, reset all bars
			if(range_changed) {
				kids = stat_graph.children;
				for(i = kids.length-1; i >= 0; --i) {
					kids[i].style.height = '30px';
				}
				range_changed = false;
			}

			statText.textContent = new_val + ' '+ caption +' (' + stat_min + '-' + stat_max + ')';
			updateGraph( stat_graph, Math.max(0, Math.min( 30, 30 - ( (new_val - range[0]) / (range[1] - range[0]) ) * 30)));
			frames++;
		},
	}
};
