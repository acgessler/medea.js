import sys
if sys.version_info <  (3,0):
	from BaseHTTPServer import HTTPServer
	from SimpleHTTPServer import SimpleHTTPRequestHandler
else:
	from http.server import HTTPServer, SimpleHTTPRequestHandler
 
httpd = HTTPServer(('0.0.0.0', 80), SimpleHTTPRequestHandler)
httpd.serve_forever()
