
var default_labyrinth_map = 
"XXXXXXXXXXXXXX XXXXXXXXXX\n" +
"X XXXXXXX XXXX XXXXXXXXXX\n" +
"X         XXX          XX\n" +
"X  XXXXXX XXXXXXXXXXXX XX\n" +
"XX XXXXXX         XXXX XX\n" +
"X     XXX XXXXXXX XXX  XX\n" +
"XXXXX XXX XXX XXX XXX XXX\n" +
"X XXX XXXXXXX XXX XXX XXX\n" +
"X             XXX XX    X\n" +
"XXXXX XXX XXXXXXX XX XX X\n" +
"XXXXX XXXXXXXXXXX XX XX X\n" +
"XX           XX   XXXXX X\n" +
"XX XXXXXXXXX XXXX       X\n" +
"XXXXXXXXXXXX XXXXXXXXXXXX\n";

function gen_labyrinth(src, root, mesh, height) {

	height = height || 5;
	
	var x = -src.indexOf('\n')/2.0, xinit = x;
	var z = -src.split('\n').length/2.0;

	
	for (var i = 0; i < src.length; ++i) {
		var c = src[i];
		if (c === '\n') {
			z += 1;
			x = xinit;
			continue;
		}
		
		if (c === 'X') {
			for(var n = 0; n < height; ++n) { 
				var ch = root.AddChild();
				ch.AddEntity(mesh);
				
				ch.Translate([x,n,z]);
				ch.Scale(0.5);
			}
		}
		
		x += 1;
	}
}
