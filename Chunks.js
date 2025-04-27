
function makeColumn(x, z, h, padding){
    let res;
    if (x >= padding && z >= padding && x < padding + 32 && z < padding + 32){
        res = Array(h).fill(1);
    } else {
        res = Array(h).fill(6).map((_, i) => {
            if (i == h - 1) return 2;
            if (h - i < 4) return 3;
            return 6;
        });
        // this.cubes[z].push(Array(h).fill(1))
        if (res.length > 0) res[res.length - 1] = 2;
    }
    res.unshift(2);
    // if(this.cubes[z].length > 0) this.cubes[z][this.cubes[z].length - 1] = 2;
    return res;
}

class Chunks {

    CHUNKSIZE = 64

    /**
     * 
     * @param {Number[][]} blockHeights 
     * @param {number} cubeSize 
     * @param {number} padding 
     */
    constructor(blockHeights, cubeSize, padding){
        this.chunks = [];
        this.totalBlockCount = 0;
        this.cubeSize = cubeSize;
        for (let chunkz = 0; chunkz < blockHeights.length / this.CHUNKSIZE; chunkz++){
            this.chunks.push([])
            for (let chunkx = 0; chunkx < blockHeights[chunkz].length / this.CHUNKSIZE; chunkx++){
                let chunk = {
                    blocks: new Array(this.CHUNKSIZE).fill(new Array(this.CHUNKSIZE).fill([])),
                    visible: null,
                    blockCount: 0,
                };

                for (let blockz = 0; blockz < this.CHUNKSIZE; blockz++){
                    let absz = blockz + chunkz * this.CHUNKSIZE;
                    if (absz >= blockHeights.length) break;
                    for (let blockx = 0; blockx < this.CHUNKSIZE; blockx++){
                        let absx = blockx + chunkx * this.CHUNKSIZE;
                        if (absx >= blockHeights[absz].length) break;

                        chunk.blocks[blockz].push([]);
                        chunk.blocks[blockz][blockx].push(...makeColumn(absx, absz, blockHeights[absz][absx], padding));
                        chunk.blockCount += chunk.blocks[blockz][blockx].length;

                    }
                }

                this.totalBlockCount += chunk.blockCount;
                this.chunks[chunkz].push(chunk);
            }
        }
    }


}