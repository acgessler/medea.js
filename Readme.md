medea.js
========

#### Highly optimized, robust, lightweight __3D engine for JavaScript__.  ####

Medea has a __stable, declarative and consistent API__ with nonzero testing coverage. It enables productive WebGl development and strives to meet high requirements in terms of performance and robustness. It is also blazingly fast.


**Design Goals**

 - Fast: The framework internally optimizes rendering as to maximize Gl performance.
 - A content pipeline for distributing 3D content on the web. 3D data from authoring tools is converted offline to an optimized representation. <a href="https://github.com/acgessler/assimp2json">assimp2json</a> imports geometry from 40+ 3D formats.
 - Exact and transparent resource management to avoid exhausting browser memory.
 - Library tools for managing Level of Detail to easily scale a wide range of devices, including Mobile/Tablets.
 - Automatic Scene Management and Visibility Detection.

<sub>
Crytek's Sponza Test Scene with dynamic lighting without shadows with medea debug tools enabled.
</sub>
<img src="http://www7.pic-upload.de/19.10.13/bxig953ohjh7.png"> </img>


<sub>A fully-zoomable <a href="https://github.com/acgessler/webgl-lake">planet demo</a>, drawn with medea in less than 500 lines of code.
</sub>
<img src="https://camo.githubusercontent.com/23d2ea50757555192b605a15f13676b3c76bedc1/687474703a2f2f7331342e64697265637475706c6f61642e6e65742f696d616765732f3134303731302f32396b377338646e2e706e67"> </img>


### Getting started ###

 - Clone this repo
 - Run `testserver.py` to start a local dev web server
 - Navigate your browser to <a href="http://localhost/samples">http://localhost/samples</a> to see live samples
 
### Documentation ###

Medea's API structure is very similar to that of other, non-browser-based 3D engines. Documentation will soon be available; for now, have a look at the samples.


### Deployment ###

The `compile.py` script is used to compile all medea modules needed by an application into a single file. It optionally embeds text resources such as shaders into the compiled package as well. The resulting files can then be minified using standard JS minifiers (Google Closure Compiler is recommended).

An _average_ medea distribution is only about `120 KiB`.

### License ###

Medea is licensed under a 3-clause BSD-style license. This means, in short and non-lawyerish, you are free to use medea even in your commercial websites provided the copyright notice, conditions and disclaimer of the license are included. 

See the `LICENSE` file for the full wording.

### Contributions ###

Are very welcome! Fork it on Github, and do a pull request against the main repository.




