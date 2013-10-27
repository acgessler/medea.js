from subprocess import Popen

# TODO: unix
p = Popen(['jscoverage-0.5.1-win\jscoverage-server.exe', '--document-root=..\..']);

import webbrowser
webbrowser.open("http://localhost:8080/tests/coverage/jscoverage.html?../SpecRunner.html")

print('press a key to terminate the jscoverage server')
raw_input()
p.terminate()
