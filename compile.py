#!/usr/bin/env python3

"""
Script to generate a collated version of the medea sources. The idea is that
all the modules that are strictly required for a medea application to run,
are all packed together in one file (medea.core-compiled.js), wheras optional
or less frequently used modules remain external dependencies which are 
loaded on demand.

Note: "core", "viewport" and "node" and the sprintf() and matrix math modules
are implicit dependencies and always included in medea.core-compiled.js.

The script proceeds by setting up a topological order in which the modules 
are included in the medea.core-compiled.js file.

Further optimization, such as minification or obfuscation of the javascript
is left to the user.

Usage:

python3 compile.py [output-folder] [modules-to-compact...]

where

  output-folder
      Folder to copy all medea js files to - the medea.core-compiled.js
      as well as all modules not modified by the script will be copied 
      here. This folder should then be served from the web.

  modules-to-compact
      Space-separated list of modules to be included in the 
      medea.core-compiled.js file. Note that any direct dependencies of 
      these modules are implicitly included in the set.

      You may also specify non-medea modules here, in this case the 
      full filename including the .js extension is to be used.

"""

import sys


import compiler


if __name__ == "__main__":
	if len(sys.argv) < 3:
		print('usage: compile.py [output-folder] [modules-to-compact...]')
		sys.exit(-1)

	compiler.run('medea', sys.argv[1], sys.argv[2:])
