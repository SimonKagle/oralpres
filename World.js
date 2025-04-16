class World {

    /**
     * World Constructor
     * @param {Number[][]} blockHeights Heights of each block tower in the world
     */
    constructor (blockHeights, cubeSize){
        /**@type {Number} */
        this.block_count = 0;
        this.total_blocks = 0;
        /**@type {number[][][]} */
        this.cubes = [];
        for (var z = 0; z < blockHeights.length; z++){
            this.cubes.push([]);
            for (var x = 0; x < blockHeights[z].length; x++){
                this.cubes[z].push(Array(blockHeights[z][x]).fill(6).map((_, i) => {
                    if (i == blockHeights[z][x] - 1) return 2;
                    if (blockHeights[z][x] - i < 4) return 3;
                    return 6;
                }));
                if (this.cubes[z][x].length > 0) this.cubes[z][x][this.cubes[z][x].length - 1] = 2;
                // if(this.cubes[z].length > 0) this.cubes[z][this.cubes[z].length - 1] = 2;
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

        this.uvOffset_cache = null;
        this.uvOffsetBuffer = null;

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
        if (this.offset_cache.length - this.block_count * 4 < revealed.length){
            let newCache = new Int16Array(this.block_count * 4 + revealed.length);
            for (let i = 0; i < newCache.length; i++){
                if (i < this.block_count * 4){
                    newCache[i] = this.offset_cache[i];
                    if (i % 4 == 0){
                        for (let j = 0; j < revealed.length; j += 4){
                            if (this.offset_cache[i + 0] == revealed[j + 0] &&
                                this.offset_cache[i + 1] == revealed[j + 1] &&
                                this.offset_cache[i + 2] == revealed[j + 2]){
                                revealed.splice(j, 4);
                            }
                        }
                    }
                } else if (i >= this.block_count * 4) {
                    newCache[i] = revealed[i - this.block_count * 4];
                }
            }
            this.offset_cache = newCache;

        } else {

            for (let i = 0; i < this.offset_cache.length; i += 4){
                if (i < this.block_count * 4){
                    for (let j = 0; j < revealed.length; j += 4){
                        if (this.offset_cache[i + 0] == revealed[j + 0] &&
                            this.offset_cache[i + 1] == revealed[j + 1] &&
                            this.offset_cache[i + 2] == revealed[j + 2]){
                            revealed.splice(j, 4);
                        }
                    }
                } else {
                    this.offset_cache[i + 0] = revealed[i + 0 - this.block_count * 4];
                    this.offset_cache[i + 1] = revealed[i + 1 - this.block_count * 4];
                    this.offset_cache[i + 2] = revealed[i + 2 - this.block_count * 4];
                    this.offset_cache[i + 3] = revealed[i + 3 - this.block_count * 4];
                }
            }
        }

        this.block_count += revealed.length / 4;


    }

    changePoint(x, y, z, isBlock){
        var [gx, gy, gz] = this.point2Grid(x, y, z);
        let old = this.cubes[gz][gx][gy]
        if (this.cubes[gz][gx][gy] == isBlock || (!isBlock && !this.cubes[gz][gx][gy])){
            return;
        }
        this.cubes[gz][gx][gy] = isBlock;

        
        let offsets = this.grid2point(gx, gy, gz);
        offsets.push(1);
        
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
            for (let i = 0; i < this.offset_cache.length; i += 4){
                if (this.offset_cache[i + 0] == offsets[0] &&
                    this.offset_cache[i + 1] == offsets[1] &&
                    this.offset_cache[i + 2] == offsets[2]){

                    shifting = true;
                }

                if (shifting && i + 4 < this.offset_cache.length){
                    this.offset_cache[i + 0] = this.offset_cache[i + 4];
                    this.offset_cache[i + 1] = this.offset_cache[i + 5];
                    this.offset_cache[i + 2] = this.offset_cache[i + 6];
                    this.offset_cache[i + 3] = this.offset_cache[i + 7];
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
                                revealed.push(...this.grid2point(gx + dx, gy + dy, gz + dz), this.cubes[gz + dz][gx + dx][gy + dy] - 1);
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

    fillOffsetCache(){
        if (this.offset_cache == null){
            this.offset_cache = [];
            this.uvOffset_cache = [];
            this.block_count = 0;
            for (var z = 0; z < this.cubes.length; z++){
                for (var x = 0; x < this.cubes[z].length; x++){
                    for (var y = 0; y < this.cubes[z][x].length; y++){
                        if (this.cubes[z][x][y]){

                            let fullyHidden = true;
                            for (let side_check = 0; side_check < 6; side_check++){
                                let sign = side_check % 2 * 2 - 1;
                                let side = Math.floor(side_check / 2);
                                let testx = x + (side == 0 ? sign : 0);
                                let testy = y + (side == 1 ? sign : 0);
                                let testz = z + (side == 2 ? sign : 0);
                                if (testy < 0) continue;
                                if (testx < 0 || testx >= this.cubes[z].length
                                    || testz < 0 || testz >= this.cubes.length
                                    || testy >= this.cubes[z][x].length
                                    || !this.cubes[testz][testx][testy]) {
                                    fullyHidden = false;
                                    break;
                                }
                            }

                            if (fullyHidden) continue;

                            this.offset_cache.push(...this.grid2point(x, y, z), this.cubes[z][x][y] - 1);
                            this.block_count++;
                        }
                    }
                }
            }


            console.log("Cache done");

            this.offset_cache = new Int16Array(this.offset_cache);
            this.uvOffset_cache = new Float32Array(this.uvOffset_cache);

        }
    }
    
    /**
     * Renders in
     * @param {WebGL2RenderingContext} gl WebGL rendering context
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

            // if (this.uvOffsetBuffer == null) {
            //     this.uvOffsetBuffer = gl.createBuffer();
            //     if(!this.uvOffsetBuffer){
            //         throw new Error('Could not create UV offset buffer!');
            //     }
            // }
        }


        if (this.offsetBuffer == null) this.offsetBuffer = gl.createBuffer();
        if(!this.offsetBuffer){
            throw new Error('Could not create offset buffer!');
        }

        this.fillOffsetCache(gl, gld);

        gl.bindBuffer(gl.ARRAY_BUFFER, this.offsetBuffer);
        if (this.offset_buffer_stale){
            gl.bufferData(gl.ARRAY_BUFFER, this.offset_cache.subarray(0, this.block_count * 4), gl.STREAM_DRAW);
        }

        gl.vertexAttribIPointer(gld.a_offset, 4, gl.SHORT, false, 0, 0);
        gl.enableVertexAttribArray(gld.a_offset);
        gl.vertexAttribDivisor(gld.a_offset, 1);

        // if (!depthOnly){
        //     gl.bindBuffer(gl.ARRAY_BUFFER, this.uvOffsetBuffer);

        //     if (this.offset_buffer_stale){
        //         gl.bufferData(gl.ARRAY_BUFFER, this.uvOffset_cache.subarray(0, this.block_count), gl.STREAM_DRAW);
        //     }

        //     gl.vertexAttribPointer(gld.a_UVoffset, 1, gl.FLOAT, false, 0, 0);
        //     gl.enableVertexAttribArray(gld.a_UVoffset);
        //     ext.vertexAttribDivisorANGLE(gld.a_UVoffset, 1);
        // }

        // gl.drawArraysInstanced(drawType, 0, n);
        gl.drawArraysInstanced(gl.TRIANGLES, 0, this.inst.vertices.length / 3, this.block_count);

        gl.uniform1i(gld.u_doingInstances, 0);
        this.offset_buffer_stale = false;
        // console.log(gl.getBufferParameter(this.uvBuffer, gl.BUFFER_SIZE));
        // console.log(gl.getBufferParameter(this.offsetBuffer, gl.BUFFER_SIZE));
    }
}