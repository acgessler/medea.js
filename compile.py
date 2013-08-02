#!/usr/bin/env python3

help = """
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

**Additionally** the script is able to include textual resources (i.e. shaders)
directly into the medea distribution so that they do not need to be fetched
at runtime using AJAX.

Usage:

python3 compile.py [output-folder] [modules-to-compact...] [-r resources-to-include...]

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

  resources-to-include
      Space-separated list of entries of the form
         <resource_name>=<source_file>
      where resource_name is the name under which a resource is accessible
      from within medea (for example url:some_relative_folder/test.txt")
      and "source_file" points to a path on disk where the data for this
      resource can be found. 

      Embedding resources is only supported for text files.
"""

import sys
import re


import compiler


if __name__ == "__main__":
	if len(sys.argv) < 3:
		print(help)
		sys.exit(-1)

	modules = sys.argv[2:]
	resources = {}

	for n,arg in enumerate(sys.argv):
		if arg[:2] == '-r':
			modules = sys.argv[2:n]

			def parse_res(k):
				match = re.match(r'^(.+?)\=(.+?)$',k)
				if match is None:
					print('invalid format for resource entry: ' + k)
					sys.exit(-2)
				return match.groups()

			resources = dict(parse_res(k) for k in sys.argv[n+1:]);
			break

	compiler.run('medea', sys.argv[1], modules, resources)
