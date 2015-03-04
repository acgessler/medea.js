import sys
if sys.version_info <  (3,0):
	from BaseHTTPServer import HTTPServer
	from SimpleHTTPServer import SimpleHTTPRequestHandler
else:
	from http.server import HTTPServer, SimpleHTTPRequestHandler
 
httpd = HTTPServer(('0.0.0.0', 8080), SimpleHTTPRequestHandler)
print 'Medea server is launched.' 
print 'Please go to http://localhost:8080 to find demos'
httpd.serve_forever()
