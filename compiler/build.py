
import sys
import re
import os
import shutil

def get_full_file_name(file):
	# the rules for module names are simple - if the full .js file name
	# is given, we load it directly. Otherwise, we assume it is a medea
	# module of the given name and derive the file name from it.
	return ('medea.' + file + '.js') if not ".js" in file else file


def javascript_string_escape(s):
	# TODO: this does not catch everything.
	escaped = s.replace('\\','\\\\') 
	escaped = escaped.replace('"','\\"')
	escaped = escaped.replace('\'','\\\'')

	return '+ \n'.join("'" + line + "\\n'" for line in escaped.split('\n')) + '\n'


def include_resource(resource, source_file):
	try:
		with open(source_file, 'rt') as inp:
			return """ 

			medea._bakedResources["{resource}"] = {data};

			""".format(resource=resource, data=javascript_string_escape(inp.read()))
	except IOError:
		print('failed to open input file: ' + source_file)


def derive_topological_order(initial, mods_by_deps):
	mods_by_deps_copy = dict(mods_by_deps)
	topo_order = list(initial)
	deps_handled = set()
	while len(mods_by_deps_copy) > 0:
		for k,v in mods_by_deps_copy.items():
			if not v.issubset(deps_handled):
				continue

			if not k in topo_order:
				topo_order.append(k)
			mods_by_deps_copy.pop(k)
			deps_handled.add(k)
			break
		else:
			print('error: cyclic dependency in modules, current order is ' + str(topo_order))
			sys.exit(-2)
	return topo_order


def run(input_folder, output_folder, files_to_compact, resources_to_include = {}):

	# cleanup previous compiler output
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
				l = frozenset(get_full_file_name(l.strip()[1:-1]) for l in l.split(',') \
					if len(l.strip()) > 0)

				for dep in l:
					all_deps.add(dep)
					if not dep in mods_by_deps:
						files_to_compact.append(dep)

			mods_by_deps[full_file_name] = l or frozenset()

	print('deriving topological order of collated modules')

	# awesome O(n^2) algorithm for generating a topological order
	# pre-define sprintf, matrix and the core module as they do not follow the 
	# usual module dependency system.
	topo_order = derive_topological_order(['sprintf-0.7.js','glMatrix.js', 'medea.core.js'],mods_by_deps)
	print('writing medea.core-compiled.js')
	
	# generate medea.core-compiled.js output file
	with open(os.path.join(output_folder, 'medea.core-compiled.js'), 'wt') as outp:
		outp.write('medea_is_compiled = true;');
		for n, dep in enumerate(topo_order):
			path = os.path.join(input_folder, dep);
			print('collating: ' + path)

			with open(path, 'rt') as inp:
				outp.write(inp.read())
				if n >= 3 and (len(dep) <= 6 or dep[:6] != 'medea.'):
					outp.write('medea._markScriptAsLoaded("'+dep+'")')
				outp.write('\n')

		# embed resource files
		if resources_to_include:
			outp.write('medea._bakedResources = {}; \n')
			for k,v in resources_to_include.items():
				print('embedding: ' + v + ' as ' + k)
				outp.write(include_resource(k,v))

		outp.write('medea._initLibrary();');
		outp.write('delete window.medea_is_compiled;');

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
