// Brian's Brain
const WIDTH = 800;
const HEIGHT = 800;

window.onload = function() {
    console.log("new GPU");
    const gpu = new GPU();
    // --------------------------------------------------
    console.log("adding GPU function: get");
    function get(cells, h, w, y, x) {
        return cells
        [(y < 0) ? (y + h) : (y >= h) ? (y - h) : y]
        [(x < 0) ? (x + w) : (x >= w) ? (x - w) : x];
    }
    gpu.addFunction(get);

    console.log("creating kernel: to_texture");
    const to_texture = gpu.createKernel(
        function(array) {
            const x = this.thread.x;
            const y = this.thread.y;
            return array[y][x];
        })
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);

    console.log("creating kernel: brian");
    const brian = gpu
          .createKernel(
        function(cells) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            let count = 0;
            for (let dy = -1; dy < 2; dy++) {
                for (let dx = -1; dx < 2; dx++) {
                    const c = get(cells, h, w, y + dy, x + dx);
                    if (dx == 0 && dy == 0) {
                        if (c == this.constants.ST_ON) {
                            return this.constants.ST_DYING;
                        } else if (c == this.constants.ST_DYING) {
                            return this.constants.ST_OFF;
                        }
                    }
                    if (c == this.constants.ST_ON) {
                        count += 1;
                    }
                }
            }
            if (count == 2) {
                return this.constants.ST_ON;
            }
            return this.constants.ST_OFF;
        })
          .setConstants({
              ST_OFF: 0, ST_DYING: 1, ST_ON: 2,
              width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);

    console.log("creating kernel: brian_render");
    const brian_render = gpu.createKernel(
        function(cells) {
            const cell = cells[this.thread.y][this.thread.x];
            if (cell == this.constants.ST_OFF) {
                this.color(0, 0, 0, 1);
            } else if (cell == this.constants.ST_DYING) {
                this.color(1, 1, 0, 1);
            } else if (cell == this.constants.ST_ON) {
                this.color(0, 1, 1, 1);
            }
        })
          .setConstants({
              ST_OFF: 0, ST_DYING: 1, ST_ON: 2})
          .setGraphical(true)
          .setOutput([WIDTH, HEIGHT]);
    // --------------------------------------------------
    console.log("initializing: cell space");
    let cells = [];
    for (let y = 0; y < HEIGHT; y++) {
        let line = [];
        for (let x = 0; x < WIDTH; x++) {
            line.push(Math.round(Math.random() * 2));
        }
        cells.push(line);
    }
    cells = to_texture(cells);

    console.log("initializing: canvas setup & initial rendering");
    brian_render(cells);
    const canvas = brian_render.canvas;
    document.getElementById("gpu").appendChild(canvas);
    // --------------------------------------------------
    console.log("start rendering...");
    let count = 0;
    function render_loop() {
        cells = to_texture(brian(cells));
        brian_render(cells);
        window.requestAnimationFrame(render_loop);
        count += 1;
    }
    window.requestAnimationFrame(render_loop);
    // --------------------------------------------------
    console.log("start displaying fps...");
    let prev_count = 0;
    setInterval(function() {
        document.getElementById("stat").textContent =
            'generation[' + count + ']: ' + (count - prev_count) + ' fps';
        prev_count = count;
    }, 1000);
};
