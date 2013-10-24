
import re
import os

line_re = re.compile(r'\s*//\s*#(include|define|ifdef|endif|else)\s*(.*)\s*$')

def run(text, base_dir):
	"""Rudimentary resolver for the following preprocessor commands:

		// #include <some-file>
		    (no check for cyclic includes!)

		TODO: handle more

	"""
	out = []

	lines = text.split('\n')
	for line in lines:
		match = line_re.match(line)
		if match:
			
			if match.group(1) == 'include':
				fpath = os.path.join(base_dir, match.group(2).strip('<>"\''))

				print 'handling js #include: ' + fpath
				with open( fpath, 'rt' ) as inp:
					out.append(run(inp.read(), os.path.split(fpath)[1]))
			else:
				print 'define/ifdef/endif/else currently ignored' 
		else:
			out.append(line)
	return '\n'.join(out)
