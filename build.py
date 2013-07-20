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

python3 build.py [output-folder] [modules-to-compact...]

where

  output-folder
      Folder to copy all medea js files to - the medea.core-compiled.js
      as well as all modules not modified by the script will be copied 
      here. This folder should then be served from the web.

  modules-to-compact
      Space-separated list of modules to be included in the 
      medea.core-compiled.js file. Note that any direct dependencies of 
      these modules are implicitly included in the set.

"""

import sys
import re
import os
import shutil

def get_full_file_name(file):
	return ('medea.' + file + '.js') if not ".js" in file else file

def run(input_folder, output_folder, files_to_compact):

	shutil.rmtree(output_folder, True)
	try:
		os.mkdir(output_folder)
	except:
		pass

	mods_by_deps = {}
	all_deps = set()

	# add implicit dependencies dependent on core (core itself is handled separately)
	files_to_compact.append('node')
	files_to_compact.append('viewport')

	# scan input files for dependencies
	cursor = 0
	while cursor < len(files_to_compact):
		file = files_to_compact[cursor]
		cursor = cursor + 1

		full_file_name = get_full_file_name(file)

		path = os.path.join(input_folder, full_file_name) 
		print('processing: ' + path)

		with open(path, 'rt') as inp:
			contents = inp.read()

			l = None
			for match in re.finditer(r"medea\._addMod\(.*?,\[(.*?)\]", contents):
				if not l is None:
					print('unexpected input: two _addMod calls in one file')
					break
				l = match.group(1)
				l = frozenset(get_full_file_name(l.strip()[1:-1]) for l in l.split(',') if len(l.strip()) > 0)

				for dep in l:
					all_deps.add(dep)
					if not dep in mods_by_deps:
						files_to_compact.append(dep)

				mods_by_deps[full_file_name] = l

	print('deriving topological order of collated modules')

	# awesome O(n^2) algorithm for generating a topological order
	# pre-define sprintf, matrix and the core module as they do not follow the 
	# usual module dependency system.
	topo_order = ['sprintf-0.7.js','glMatrix.js', 'medea.core.js']
	deps_handled = set()
	while len(mods_by_deps) > 0:
		for k,v in mods_by_deps.items():
			if not v.issubset(deps_handled):
				continue

			if not k in topo_order:
				topo_order.append(k)
			mods_by_deps.pop(k)
			deps_handled.add(k)
			break
		else:
			print('error: cyclic dependency in modules, current order is ' + str(topo_order))
			sys.exit(-2)

	print('writing medea.core-compiled.js')
	
	# generate medea.core-compiled.js output file
	with open(os.path.join(output_folder, 'medea.core-compiled.js'), 'wt') as outp:
		for dep in topo_order:
			path = os.path.join(input_folder, dep);
			print('collating: ' + path)

			with open(path, 'rt') as inp:
				outp.write(inp.read())
				outp.write('\n')

	# copy all other files
	for file in os.listdir(input_folder):
		if not file in topo_order and ".js" in file:
			print('copying ' + file + ' to output folder')
			shutil.copy2(os.path.join(input_folder, file), os.path.join(output_folder, file))

if __name__ == "__main__":
	if len(sys.argv) < 3:
		print('usage: build.py [output-folder] [modules-to-compact...]')
		sys.exit(-1)

	run('medea', sys.argv[1], sys.argv[2:])
