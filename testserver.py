from http.server import HTTPServer, SimpleHTTPRequestHandler
 
httpd = HTTPServer(('127.0.0.1', 80), SimpleHTTPRequestHandler)
httpd.serve_forever()
