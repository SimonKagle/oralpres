class World {

    /**
     * World Constructor
     * @param {Number[][]} blockHeights Heights of each block tower in the world
     */
    constructor (blockHeights, cubeSize, padding){
        /**@type {Number} */
        this.block_count = 0;
        this.total_blocks = 0;
        /**@type {number[][][]} */
        this.cubes = []
        console.log(this.cubes);
        this.cubeSize = cubeSize;


        let visible = [];
        for (var z = 0; z < blockHeights.length; z++){
            this.cubes.push([])
            for (var x = 0; x < blockHeights[z].length; x++){
                this.cubes[z].push(makeColumn(x, z, blockHeights[z][x], padding))
                // this.cubes[z][x].push(makeColumn(x, z, blockHeights[z][x], padding))
                this.block_count += this.cubes[z][x].length;

                let minNeighborHeight = Math.min(
                    z - 1 >= 0 ? blockHeights[z - 1][x] : 0,
                    z + 1 < blockHeights.length ? blockHeights[z + 1][x] : 0,
                    blockHeights[z][x - 1] || 0,
                    blockHeights[z][x + 1] || 0,
                );

                visible.push(...this.grid2point(x, this.cubes[z][x].length - 1, z, blockHeights), this.cubes[z][x].at(-1) - 1);
                    
                for (let i = minNeighborHeight + 1; i < this.cubes[z][x].length - 1; i++){
                    visible.push(...this.grid2point(x, i, z, blockHeights), this.cubes[z][x][i] - 1);
                }

            }
        }


        this.total_blocks = this.block_count;
        this.block_count = visible.length / 4;
        console.log("Object done");


        this.inst = new TexCube(new Matrix4(), null, new Array(3).fill(this.cubeSize));
        
        /** @type {Int16Array} */
        this.offset_cache = new Int16Array(visible);
        // console.log(visible);
        this.offset_buffer_stale = true;
        this.offsetBuffer = null;

        this.culledOffsets = null;

        this.uvOffset_cache = null;
        this.uvOffsetBuffer = null;

        this.uvBuffer = null;
        this.vertexBuffer = null;
        this.normalBuffer = null;

        console.log("Done");
    }

    render(gl, a_Position, a_UV, u_Matrix, u_NormalMatrix){
        this.block_count = 0;
        for (var z = 0; z < this.cubes.length; z++){
            for (var x = 0; x < this.cubes[z].length; x++){
                for (var y = 0; y < this.cubes[z][x].length; y++){
                    if (this.cubes[z][x][y]){
                        this.inst.matrix.setTranslate(
                            (x - this.cubes[z].length / 2) * 2 * this.cubeSize, 
                            y * 2 * this.cubeSize, 
                            (z - this.cubes.length / 2) * 2 * this.cubeSize);
                        this.inst.render(gl, a_Position, a_UV, u_Matrix, u_NormalMatrix);
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

    grid2point(gx, gy, gz, subst){
        return [
            (gx - (subst ? subst[gz] : this.cubes[gz]).length / 2) * 2 * this.cubeSize, 
            gy * 2 * this.cubeSize, 
            (gz - (subst || this.cubes).length / 2) * 2 * this.cubeSize
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

    getAABBPoints(){
        let max = [0, 0, this.cubes.length];
        for (let z = 0; z < this.cubes.length; z++){
            if (max[0] < this.cubes[z].length) max[0] = this.cubes[z].length;
            for (let x = 0; x < this.cubes[z].length; x++){
                if (max[1] < this.cubes[z][x].length) max[1] = this.cubes[z][x].length;
            }
        }
        
        let out = [];
        for (let i = 0; i < (1 << 3); i++){
            let gx = i & 1 ? 0 : max[0] - 1;
            let gy = i & 2 ? 0 : max[1] - 1;
            let gz = i & 4 ? 0 : max[2] - 1;
            out.push(new Vector3(this.grid2point(gx, gy, gz)));
        }

        return out;
    }

    /**
     * Removes all cubes not in frustum
     * @param {Camera} camera Current camera
     */
    cull(camera){

        // if (this.offset_cache === null){
        //     this.fillOffsetCache();
        // }

        // this.culledOffsets = new Int16Array(this.offset_cache.length);
        // for (let i = 0; i < this.offset_cache.length; i += 4){
        //     let [x, y, z, w] = this.offset_cache.slice(i, i + 4);
        //     let [ex, ey, ez] = camera.eye.elements;
        //     let [ax, ay, az] = camera.at.elements;
        //     let dp = (x - ex) * (ax - ex) + (y - ey) * (ay - ey) + (z - ez) * (az - ez);
        //     if (dp > 0){
        //         this.culledOffsets[i + 0] = x;
        //         this.culledOffsets[i + 1] = y;
        //         this.culledOffsets[i + 2] = z;
        //         this.culledOffsets[i + 3] = w;
        //     }
        // }
        // this.culledOffsets = new Int16Array(this.culledOffsets);

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
        // gl.bufferData(gl.ARRAY_BUFFER, this.culledOffsets, gl.STREAM_DRAW);
        if (this.offset_buffer_stale){
            gl.bufferData(gl.ARRAY_BUFFER, this.offset_cache, gl.STREAM_DRAW);
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

    /**
     * Destroy this World, free all memory
     * @param {WebGL2RenderingContext} gl 
     */
    destroy(gl){
        gl.deleteBuffer(this.uvBuffer);
        gl.deleteBuffer(this.normalBuffer);
        gl.deleteBuffer(this.vertBuffer);
        gl.deleteBuffer(this.offsetBuffer);
    }
}