
import re
import os

line_re = re.compile(r'\s*//\s*#(include|define|if|ifdef|elif|ifndef|endif|else)(?:\s+(.*)\s*$|($))')


def eval_conditional(cond, symbols):
	cond = cond.strip()

	if not cond:
		return True

	negate = False
	if cond[0] == '!':
		negate = True
		cond = cond[1:]

	val = cond in symbols
	return not val if negate else val


def run(text, base_dir, debug_filename, symbols = set()):
	"""Rudimentary resolver for the following preprocessor commands:

		// #include <some-file>
		    (no check for cyclic includes!)

		// #ifdef | #if <symbol>
		//   <contents>
		// [ #elif
		//   <alt-contents> ]*
		// [ #else
		//   <alt-contents> ]
		// #endif 

	"""
	out = []
	stack = []

	lines = text.split('\n')
	l_iter = iter(zip(range(1, len(lines)+1),lines))
	push_line = None

	nline = -1

	def error(msg):
		raise Exception(msg + '   @   ' + debug_filename + ':' + str(nline))
	
	while True:
		try:
			nline, line = push_line or next(l_iter)
			push_line = None
		except StopIteration:
			break

		match = line_re.match(line)
		if match:

			skip_branch = False
			
			cmd = match.group(1)
			if cmd == 'include':
				name = match.group(2).strip('<>"\'')
				fpath = os.path.join(base_dir, name)

				print 'handling js #include: ' + fpath
				with open( fpath, 'rt' ) as inp:
					out.append(run(inp.read(), os.path.split(fpath)[1], name, symbols))

			elif cmd in ['if', 'ifdef', 'ifndef']:
				val = eval_conditional(match.group(2), symbols)
				if cmd == 'ifndef':
					val = not val

				print('eval: ' + cmd + ' ' + match.group(2) + ' as ' + str(val))

				skip_branch = not val
				stack.append(val)

			elif cmd in ['else', 'elif']:
				if not stack:
					error('syntax error, unexpected ' + cmd)
				# has been handled before?
				if stack[-1]:
					skip_branch = True
				elif cmd != 'elif' or eval_conditional(match.group(2), symbols):
					stack[-1] = True
				else:
					skip_branch = True
			elif cmd == 'endif':
				if not stack:
					error('syntax error, unexpected endif')
					continue

				stack.pop()

			else:
				error('define/ifdef/endif/else currently ignored')

			if skip_branch:
				# skip everything up to the next elif/else/endif at the same nesting level
				nesting = 1
				while True:
					try:
						nline, line = next(l_iter)
						match = line_re.match(line)
						if match:
							done = False
							cmd = match.group(1)
							if cmd in ['if', 'ifdef']:
								nesting += 1
							elif cmd == 'endif':
								nesting -= 1
								if nesting == 0:
									done = True

							if cmd in ['else', 'elif'] and nesting == 1:
								done = True
								
							if done:
								push_line = nline, line
								break

					except StopIteration:
						error('syntax error, unexpected EOF')
						return
		else:
			out.append(line)

	return '\n'.join(out)
