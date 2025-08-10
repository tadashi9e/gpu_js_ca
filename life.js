// Game of Life
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

    console.log("creating kernel: life");
    const life = gpu.createKernel(
        function(cells) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            const sum =
                  get(cells, h, w, y-1, x-1) +
                  get(cells, h, w, y-1, x) +
                  get(cells, h, w, y-1, x+1) +
                  get(cells, h, w, y, x-1) +
                  get(cells, h, w, y, x+1) +
                  get(cells, h, w, y+1, x-1) +
                  get(cells, h, w, y+1, x) +
                  get(cells, h, w, y+1, x+1);
            const cell = cells[y][x];
            if (cell == 1) {
                if (sum == 2 || sum == 3) {
                    return 1;
                }
            } else {
                if (sum == 3) {
                    return 1;
                }
            }
            return 0;
        })
          .setConstants({width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);

    console.log("creating kernel: life_render");
    const life_render = gpu.createKernel(
        function(cells) {
            const cell = cells[this.thread.y][this.thread.x];
            this.color(cell, cell, cell, 1);
        })
          .setGraphical(true)
          .setOutput([WIDTH, HEIGHT]);
    // --------------------------------------------------
    console.log("initializing: cell space");
    let cells = [];
    for (let y = 0; y < HEIGHT; y++) {
        let line = [];
        for (let x = 0; x < WIDTH; x++) {
            line.push(Math.round(Math.random()));
        }
        cells.push(line);
    }
    cells = to_texture(cells);

    console.log("initializing: canvas setup & initial rendering");
    life_render(cells);
    const canvas = life_render.canvas;
    document.getElementById("gpu").appendChild(canvas);
    // --------------------------------------------------
    console.log("start rendering...");
    let count = 0;
    function render_loop() {
        cells = to_texture(life(cells));
        life_render(cells);
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
