'use strict';

/**
 * Creates and draws buffer of points
 * @param {WebGLRenderingContext} gl WebGL rendering context
 * @param {Number} drawType Primitive type to pass to drawArrays
 * @param {Number} n Number of vertices per primative
 * @param {Matrix4} matrix Model matrix
 * @param {Number[]} color RGB 0-1 color
 * @param {GLint} a_Position Attribute that positions primitive
 * @param {WebGLUniformLocation} u_FragColor Uniform that determines color of primitive
 * @param {WebGLUniformLocation} u_Matrix Uniform does matrix transform on the primative
 */
function drawPrimitive(gl, drawType, n, matrix, color, 
    a_Position, a_Normal, u_FragColor, u_Matrix, vertBuffer, normalBuffer){

    gl.uniform4f(u_FragColor, ...color, 1);
    gl.uniformMatrix4fv(u_Matrix, false, matrix.elements);

    if(!vertBuffer){
        throw new Error('No vert buffer!');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    if(!normalBuffer){
        throw new Error('No vert buffer!');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(drawType, 0, n);
}

/**
 * Creates and draws buffer of points
 * @param {WebGLRenderingContext} gl WebGL rendering context
 * @param {Number} drawType Primitive type to pass to drawArrays
 * @param {Number} n Number of vertices per primative
 * @param {Float32Array} vertices Vertices of object
 * @param {Float32Array} uvs UVs of object
 * @param {Matrix4} matrix Model matrix
 * @param {GLint} a_Position Attribute that positions primitive
 * @param {GLint} a_UV Attribute that sends UV coordinates of texture
 * @param {WebGLUniformLocation} u_Matrix Uniform does matrix transform on the primative
 */
function drawPrimitiveUV(gl, drawType, n, matrix, 
    a_Position, a_UV, a_Normal, u_Matrix, vertBuffer, uvBuffer, normalBuffer){

    gl.uniformMatrix4fv(u_Matrix, false, matrix.elements);

    if(!vertBuffer){
        throw new Error('Could not create vert buffer!');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, vertBuffer);
    gl.vertexAttribPointer(a_Position, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Position);

    if(!uvBuffer){
        throw new Error('Could not create UV buffer!');
    }

    gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
    gl.vertexAttribPointer(a_UV, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_UV);

    if(!normalBuffer){
        throw new Error('No normal buffer!');
    }
    gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
    gl.vertexAttribPointer(a_Normal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(a_Normal);

    gl.drawArrays(drawType, 0, n);
}

class Cube {

    baseVerts = [
        [0, 0, 0],
        [0, 0, 1],
        [0, 1, 0],
        [0, 1, 1],
        [1, 0, 0],
        [1, 0, 1],
        [1, 1, 0],
        [1, 1, 1],
    ];

    baseNormals = [
         0,  1,  0,
         0, -1,  0,
         0,  0,  1,
         0,  0, -1,
        -1,  0,  0,
         1,  0,  0,
    ]

    // Adapted from https://stackoverflow.com/questions/58772212/what-are-the-correct-vertices-and-indices-for-a-cube-using-this-mesh-function
    baseIndVerts = [
        // +Y
        2, 7, 6,
        2, 3, 7,

        // -Y
        0, 4, 5,
        0, 5, 1,

        // +X
        0, 2, 6,
        0, 6, 4,

        // -X
        1, 7, 3,
        1, 5, 7,

        // -Z
        0, 3, 2,
        0, 1, 3,

        // +Z
        4, 6, 7,
        4, 7, 5
    ];

    /**
     * Cube constructor
     * @param {Matrix4} matrix Transformation Matrix
     * @param {Number[][] | Number[]} face_colors Color for each face or single color for all faces.
     * @param {Number[]} scale Scale of x, y, z faces
     * 
     * If specifying each color individually, the order is:
     *  1. Top
     *  2. Bottom
     *  3. Left
     *  4. Right
     *  5. Front
     *  6. Back 
     */
    constructor (matrix, face_colors, scale) {

        // Construct vertices, too lazy to do this by hand
        this.vertices = [];
        for (var i = 0; i < this.baseIndVerts.length; i++){
            var [x, y, z] = this.baseVerts[this.baseIndVerts[i]];
            this.vertices.push(
                (x - 0.5) * 2 * scale[0],
                (y - 0.5) * 2 * scale[1],
                (z - 0.5) * 2 * scale[2],
            );
        }

        this.vertices = new Float32Array(this.vertices);
        
        this.normals = [];
        for (let i = 0; i < this.baseNormals.length; i += 3){
            for (let j = 0; j < 6; j++){
                this.normals.push(this.baseNormals[i + 0],
                                  this.baseNormals[i + 1],
                                  this.baseNormals[i + 2]);
            }
        }
        this.normals = new Float32Array(this.normals);

        // Handle passing either a single color for whole cube, or one color per face
        if (!(face_colors[0] instanceof Array) && (face_colors instanceof Array)){
            this.face_colors = [];
            for (var i = 0; i < 8; i++){
                this.face_colors.push(face_colors);
            }
        } else {
            this.face_colors = face_colors;
        }


        this.matrix = matrix;
        this.vertBuffer = null;
        this.normalBuffer = null;
    }

    /**
     * Renders cube
     * @param {WebGLRenderingContext} gl Rendering Context
     * @param {GLint} a_Position Position Attribute
     * @param {WebGLUniformLocation} u_FragColor Color uniform
     * @param {WebGLUniformLocation} u_Matrix Matrix uniform
     */
    render(gl, a_Position, a_Normal, u_FragColor, u_Matrix, u_NormalMatrix){
        
        gl.uniformMatrix4fv(u_NormalMatrix, false, new Matrix4(this.matrix).invert().transpose().elements);

        if (this.vertBuffer == null){
            console.log(this.vertices);
            this.vertBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.DYNAMIC_DRAW);
        }

        if (this.normalBuffer == null){
            this.normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.DYNAMIC_DRAW);
        }


        drawPrimitive(gl, gl.TRIANGLES, this.vertices.length / 3, 
            this.matrix, this.face_colors[0], a_Position, a_Normal, u_FragColor, u_Matrix,
            this.vertBuffer, this.normalBuffer
        );
    }
}

class TexCube extends Cube {
    
    uvs = [ 
        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,

        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,

        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        
        0,0, 1,0, 1,1, 
        0,0, 1,1, 0,1,
        0,0, 1,1, 1,0, 
        0,0, 0,1, 1,1,
    ];
    
    /**
     * Constructor
     * @param {Matrix4} matrix 
     * @param {String | String[]} face_texs 
     * @param {[Number, Number, Number]} scale 
     */
    constructor(matrix, face_texs, scale){
        super(matrix, [0, 0, 0], scale);
        this.face_texs = this.face_texs instanceof Array ? face_texs : Array(8).fill(face_texs);
        // var nuv = [];
        // for (var i = 0; i < 8; i++){
        //     nuv.push(...this.uvs);
        // }
        this.uvs = new Float32Array(this.uvs);
        this.uvBuffer = null;
        this.normalBuffer = null;
        this.vertBuffer = null;
    }

    render(gl, a_Position, a_Normal, a_UV, u_Matrix, u_NormalMatrix){

        gl.uniformMatrix4fv(u_NormalMatrix, false, new Matrix4(this.matrix).invert().transpose().elements);

        if (this.vertBuffer == null){
            console.log(this.vertices);
            this.vertBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.vertices, gl.STATIC_DRAW);
        }

        if (this.uvBuffer == null){
            this.uvBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
        }

        if (this.normalBuffer == null){
            this.normalBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.DYNAMIC_DRAW);
        }

        drawPrimitiveUV(gl, gl.TRIANGLES, this.vertices.length / 3, this.matrix, 
            a_Position, a_UV, a_Normal, u_Matrix, this.vertBuffer, this.uvBuffer, this.normalBuffer
        );
    }
}

class World {

    /**
     * World Constructor
     * @param {Number[][]} blockHeights Heights of each block tower in the world
     */
    constructor (blockHeights, cubeSize){
        /**@type {Number} */
        this.block_count = 0;
        this.total_blocks = 0;
        /**@type {Boolean[][][]} */
        this.cubes = [];
        for (var z = 0; z < blockHeights.length; z++){
            this.cubes.push([]);
            for (var x = 0; x < blockHeights[z].length; x++){
                this.cubes[z].push(Array(blockHeights[z][x]).fill(true));
                this.block_count += blockHeights[z][x];
            }
        }


        this.total_blocks = this.block_count;
        console.log("Object done");


        this.cubeSize = cubeSize;
        this.inst = new TexCube(new Matrix4(), null, new Array(3).fill(this.cubeSize));
        
        /** @type {Float32Array} */
        this.offset_cache = null;
        this.offset_buffer_stale = true;
        this.offsetBuffer = null;

        this.uvBuffer = null;
        this.vertexBuffer = null;
        this.normalBuffer = null;
    }

    render(gl, a_Position, a_UV, u_Matrix){
        this.block_count = 0;
        for (var z = 0; z < this.cubes.length; z++){
            for (var x = 0; x < this.cubes[z].length; x++){
                for (var y = 0; y < this.cubes[z][x].length; y++){
                    if (this.cubes[z][x][y]){
                        this.inst.matrix.setTranslate(
                            (x - this.cubes[z].length / 2) * 2 * this.cubeSize, 
                            y * 2 * this.cubeSize, 
                            (z - this.cubes.length / 2) * 2 * this.cubeSize);
                        this.inst.render(gl, a_Position, a_UV, u_Matrix);
                        this.block_count++;
                    }
                }
            }
        }
    }

    point2Grid(x, y, z){
        return [
            Math.max(0, Math.round(x / (2 * this.cubeSize) + (this.cubes[0].length / 2))),
            Math.max(0, Math.round(y / (2 * this.cubeSize))),
            Math.max(0, Math.round(z / (2 * this.cubeSize) + (this.cubes.length / 2)))
        ];
    }

    grid2point(gx, gy, gz){
        return [
            (gx - this.cubes[gz].length / 2) * 2 * this.cubeSize, 
            gy * 2 * this.cubeSize, 
            (gz - this.cubes.length / 2) * 2 * this.cubeSize
        ];
    }

    addCache(revealed){
        if (this.offset_cache.length - this.block_count * 3 < revealed.length){
            let newCache = new Float32Array(this.block_count * 3 + revealed.length);
            for (let i = 0; i < newCache.length; i++){
                if (i < this.block_count * 3){
                    newCache[i] = this.offset_cache[i];
                    if (i % 3 == 0){
                        for (let j = 0; j < revealed.length; j += 3){
                            if (this.offset_cache[i + 0] == revealed[j + 0] &&
                                this.offset_cache[i + 1] == revealed[j + 1] &&
                                this.offset_cache[i + 2] == revealed[j + 2]){
                                revealed.splice(j, 3);
                            }
                        }
                    }
                } else if (i >= this.block_count * 3) {
                    newCache[i] = revealed[i - this.block_count * 3];
                }
            }
            this.offset_cache = newCache;

        } else {

            for (let i = 0; i < this.offset_cache.length; i += 3){
                if (i < this.block_count * 3){
                    for (let j = 0; j < revealed.length; j += 3){
                        if (this.offset_cache[i + 0] == revealed[j + 0] &&
                            this.offset_cache[i + 1] == revealed[j + 1] &&
                            this.offset_cache[i + 2] == revealed[j + 2]){
                            revealed.splice(j, 3);
                        }
                    }
                } else {
                    this.offset_cache[i + 0] = revealed[i + 0 - this.block_count * 3];
                    this.offset_cache[i + 1] = revealed[i + 1 - this.block_count * 3];
                    this.offset_cache[i + 2] = revealed[i + 2 - this.block_count * 3];
                }
            }
        }

        this.block_count += revealed.length / 3;


    }

    changePoint(x, y, z, isBlock){
        var [gx, gy, gz] = this.point2Grid(x, y, z);
        let old = this.cubes[gz][gx][gy]
        if (this.cubes[gz][gx][gy] == isBlock || (!isBlock && !this.cubes[gz][gx][gy])){
            return;
        }
        this.cubes[gz][gx][gy] = isBlock;

        
        let offsets = this.grid2point(gx, gy, gz);
        
        if (isBlock){
            this.addCache(offsets);
            console.log(offsets, this.block_count);
        } else {
            // if (ind == -1){
            //     this.offset_cache = null;
            //     this.block_count = 0;
            //     console.log(offsets, gx, gy, gz, old);
            //     console.warn("Could not remove block");
            // } else {
            //     let newCache = Array.from(this.offset_cache)
            //     newCache.splice(ind, 3);
            //     this.offset_cache = new Float32Array(newCache);
            //     this.block_count -= 1;
            // }
            let shifting = false;
            for (let i = 0; i < this.offset_cache.length; i += 3){
                if (this.offset_cache[i + 0] == offsets[0] &&
                    this.offset_cache[i + 1] == offsets[1] &&
                    this.offset_cache[i + 2] == offsets[2]){

                    shifting = true;
                }

                if (shifting && i + 3 < this.offset_cache.length){
                    this.offset_cache[i + 0] = this.offset_cache[i + 3];
                    this.offset_cache[i + 1] = this.offset_cache[i + 4];
                    this.offset_cache[i + 2] = this.offset_cache[i + 5];
                }

            }

            if (!shifting){
                console.warn("Could not remove block");
                this.offset_cache = null;
                this.block_count = 0;
            } else {
                this.block_count -= 1;
                let revealed = [];
                for (let dx = -1; dx <= 1; dx++){
                    for (let dy = -1; dy <= 1; dy++){
                        for (let dz = -1; dz <= 1; dz++){
                            if (dx != 0 && dy != 0 && dz != 0 ||
                                dx == 0 && dy == 0 && dz == 0) continue;
                            if (this.cubes[gz + dz][gx + dx][gy + dy]){
                                revealed.push(...this.grid2point(gx + dx, gy + dy, gz + dz));
                            }
                        }
                    }
                }

                this.addCache(revealed);
            }

                

        }

        this.offset_buffer_stale = true;
        this.total_blocks += isBlock ? 1 : -1;
    }

    /**
     * Removes all cubes not in frustum
     * @param {Camera} camera Current camera
     */
    cull(camera){
        // TODO: Maybe only do this on offset cache?
        /*
        this.block_count = 0
        this.offset_cache = new Float32Array(this.total_blocks * 3);
        let [minPt, maxPt] = camera.getAABB();
        let [maxgx, maxgy, maxgz] = this.point2Grid(...maxPt.elements);
        let [mingx, mingy, mingz] = this.point2Grid(...minPt.elements);
        for (var z = mingz; z < this.cubes.length && z <= maxgz; z++){
            for (var x = mingx; x < this.cubes[z].length && x <= maxgx; x++){
                for (var y = mingy; y < this.cubes[z][x].length && y <= maxgy; y++){
                    if (this.cubes[z][x][y]){

                        // let fullyHidden = true;
                        // for (let dx = -1; dx <= 1; dx++){
                        //     for (let dy = -1; dy <= 1; dy++){
                        //         for (let dz = -1; dz <= 1; dz++){
                        //             let testx = x + dx;
                        //             let testy = y + dy;
                        //             let testz = z + dz;
                        //             if (testy < 0) continue;
                        //             if (testx < 0 || testx >= this.cubes[z].length
                        //                 || testz < 0 || testz >= this.cubes.length
                        //                 || testy >= this.cubes[z][x].length
                        //                 || !this.cubes[z + dz][x + dx][y + dy]) {
                        //                 fullyHidden = false;
                        //                 break;
                        //             }
                        //         }
                        //         if (!fullyHidden){
                        //             break;
                        //         }
                        //     }
                        //     if (!fullyHidden){
                        //         break;
                        //     }
                        // }

                        // if (fullyHidden) continue;

                        let offset = [
                            (x - this.cubes[z].length / 2) * 2 * this.cubeSize, 
                            y * 2 * this.cubeSize, 
                            (z - this.cubes.length / 2) * 2 * this.cubeSize
                        ];

                        if (!camera.getSphereInFrustum({elements: offset}, 2 * this.cubeSize)){
                            continue;
                        }

                        this.offset_cache[this.block_count * 3] = offset[0];
                        this.offset_cache[this.block_count * 3 + 1] = offset[1];
                        this.offset_cache[this.block_count * 3 + 2] = offset[2];
                        this.block_count++;
                    }
                }
            }
        }

        this.offset_buffer_stale = true;
        this.offset_cache = new Float32Array(this.offset_cache, 0, this.block_count * 3);
        */
    }
    
    /**
     * Renders in
     * @param {WebGLRenderingContext} gl WebGL rendering context
     * @param {ANGLE_instanced_arrays} ext Instanced Arrays extension
     * @param {Object.<string, WebGLUniformLocation | GLint>} gld WebGL program data
     */
    renderFast(gl, ext, gld, depthOnly){
        gl.uniform1i(gld.u_doingInstances, 1);

        gl.uniformMatrix4fv(gl.u_NormalMatrix, false, new Matrix4().elements);

        if(this.vertBuffer == null) {
            this.vertBuffer = gl.createBuffer();
            if(!this.vertBuffer){
                throw new Error('Could not create vert buffer!');
            }
            gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.inst.vertices, gl.DYNAMIC_DRAW);

        }

        gl.bindBuffer(gl.ARRAY_BUFFER, this.vertBuffer);
        gl.vertexAttribPointer(gld.a_Position, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(gld.a_Position);

        if (!depthOnly){
            if (this.uvBuffer == null) {
                this.uvBuffer = gl.createBuffer();
                if(!this.uvBuffer){
                    throw new Error('Could not create UV buffer!');
                }
                gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, this.inst.uvs, gl.DYNAMIC_DRAW);

            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.uvBuffer);
            gl.vertexAttribPointer(gld.a_UV, 2, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(gld.a_UV);


            if (this.normalBuffer == null) {
                this.normalBuffer = gl.createBuffer();
                if(!this.normalBuffer){
                    throw new Error('Could not create normal buffer!');
                }
                gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
                gl.bufferData(gl.ARRAY_BUFFER, this.inst.normals, gl.DYNAMIC_DRAW);

            }

            gl.bindBuffer(gl.ARRAY_BUFFER, this.normalBuffer);
            gl.vertexAttribPointer(gld.a_Normal, 3, gl.FLOAT, false, 0, 0);
            gl.enableVertexAttribArray(gld.a_Normal);
        }


        if (this.offsetBuffer == null) this.offsetBuffer = gl.createBuffer();
        if(!this.offsetBuffer){
            throw new Error('Could not create UV buffer!');
        }

        if (this.offset_cache == null){
            this.offset_cache = [];
            this.block_count = 0;
            for (var z = 0; z < this.cubes.length; z++){
                for (var x = 0; x < this.cubes[z].length; x++){
                    for (var y = 0; y < this.cubes[z][x].length; y++){
                        if (this.cubes[z][x][y]){

                            let fullyHidden = true;
                            for (let dx = -1; dx <= 1; dx++){
                                for (let dy = -1; dy <= 1; dy++){
                                    for (let dz = -1; dz <= 1; dz++){
                                        if (dx != 0 && dy != 0 && dz != 0 ||
                                            dx == 0 && dy == 0 && dz == 0) continue;
                                        let testx = x + dx;
                                        let testy = y + dy;
                                        let testz = z + dz;
                                        if (testy < 0) continue;
                                        if (testx < 0 || testx >= this.cubes[z].length
                                            || testz < 0 || testz >= this.cubes.length
                                            || testy >= this.cubes[z][x].length
                                            || !this.cubes[z + dz][x + dx][y + dy]) {
                                            fullyHidden = false;
                                            break;
                                        }
                                    }
                                    if (!fullyHidden){
                                        break;
                                    }
                                }
                                if (!fullyHidden){
                                    break;
                                }
                            }

                            if (fullyHidden) continue;

                            this.offset_cache.push(...this.grid2point(x, y, z));
                            this.block_count++;
                        }
                    }
                }
            }

            console.log("Cache done");

            this.offset_cache = new Float32Array(this.offset_cache);

        }

        if (this.offset_buffer_stale){
            gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
            gl.bufferData(gl.ARRAY_BUFFER, this.offset_cache.subarray(0, this.block_count * 3), gl.STREAM_DRAW);
            this.offset_buffer_stale = false;
        } else {
            gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
        }

        gl.vertexAttribPointer(gld.a_offset, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(gld.a_offset);
        ext.vertexAttribDivisorANGLE(gld.a_offset, 1);

        // gl.drawArraysInstanced(drawType, 0, n);
        ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, this.inst.vertices.length / 3, this.block_count);

        gl.uniform1i(gld.u_doingInstances, 0);
        // console.log(gl.getBufferParameter(this.uvBuffer, gl.BUFFER_SIZE));
        // console.log(gl.getBufferParameter(this.offsetBuffer, gl.BUFFER_SIZE));
    }
}