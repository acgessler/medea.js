
/* medea.js - Open Source, High-Performance 3D Engine based on WebGL.
 *
 * (c) 2011-2013, Alexander C. Gessler
 *  https://github.com/acgessler/medea.js
 *
 * Made available under the terms and conditions of a 3-clause BSD license.
 *
 */

medealib.define('texture_dds',[],function(medealib, undefined) {
	"use strict";
	var medea = this, gl = medea.gl;

	// #include "snippets/dds.js"

	 /** Extract the width and height of a DDS iimage from a given arrayBuffer */
    function getDDSDimension(arrayBuffer) {
        var header = new Int32Array(arrayBuffer, 0, headerLengthInt);
        return [header[off_width], header[off_height]];
    }

    // publish API for texture module to use
    medea._DDSgetDDSDimension = getDDSDimension;
    medea._DDSuploadDDSLevels = uploadDDSLevels;
});
