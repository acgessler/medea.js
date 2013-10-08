
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

	var	width 		= config.width || 80
	,	caption 	= config.caption || 'stat'
	,	stat 		= 0
	,	statMin 	= Infinity
	,	statMax 	= 0
	,	frames 		= 0
	,	style 		= predef_styles[config.style || 0]
	,	bar_width	= config.bar_width || 4
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

	var statGraph = document.createElement( 'div' );
	statGraph.id = 'statGraph';
	statGraph.style.cssText = 'position:relative;width:' + 
		(width-6)+'px;height:30px;background-color:'+style[1];
	statDiv.appendChild( statGraph );

	while ( statGraph.children.length < (width-6)/bar_width ) {
		var bar = document.createElement( 'span' );
		bar.style.cssText = 'width:'+bar_width+'px;height:30px;float:left;'+
			'background-color:'+style[2];
		statGraph.appendChild( bar );
	}

	container.style.position = 'absolute';
	container.style.left = (config.left || 0) + 'px';
	container.style.top = (config.top || 0) + 'px';
	document.body.appendChild( container );

	var updateGraph = function ( dom, value ) {
		var child = dom.appendChild( dom.firstChild );
		child.style.height = value + 'px';
	}

	return {

		update: function (new_val) {
			new_val = ~~new_val;
			statMin = Math.min( statMin, new_val );
			statMax = Math.max( statMax, new_val );

			statText.textContent = new_val + ' '+ caption +' (' + statMin + '-' + statMax + ')';
			updateGraph( statGraph, Math.min( 30, 30 - ( (new_val - statMin) / (statMax - statMin) ) * 30 ) );
			frames++;
		},
	}
};
