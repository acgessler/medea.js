import re
import sys

def read_config(file):
	with open(file, "rt") as inp:
		lines = [l.strip() for l in inp.readlines() if l.strip() and not l.strip()[0] == '#']
		sections = {}
		sections[''] = cur_section = {}
		for n, line in enumerate(lines):
			lineno = n+1
			head = re.match(r'^\[(.+)\]$', line)
			if head is None:
				elem = re.match(r'^(.+?)(?:\=(.+?))?$', line)
				if elem is None:
					print('invalid entry in configuration file, line ' + str(lineno))
					sys.exit(-3)
				cur_section[elem.group(1)] = elem.group(2)
			else:
				sections[head.group(1)] = cur_section = {}

	output = sections['general']['output']
	modules = list(sections['modules'].keys()) if 'modules' in sections else []
	resources = sections['resources'] if 'resources' in sections else {}

	return {
		'output' : output,
		'modules' : modules,
		'resources' : resources
	}