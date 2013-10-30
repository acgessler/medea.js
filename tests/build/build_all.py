#!/bin/env python

import sys
import os
	# must come first or python's compiler module is picked
	# definitely must rename the medea compiler module
sys.path.insert(0, os.path.join('..','..'))

import compiler 

configs = [
	  'null-debug'
	, 'collated-debug'
	, 'null-release'
	, 'collated-release'
] 

if __name__ == '__main__':
	for cfg in configs:
		file = 'compile-config-' + cfg + '.txt'
		cfg_data = compiler.read_config(file)
		print cfg_data
		compiler.run(os.path.join('..', '..', 'medea'), cfg_data)