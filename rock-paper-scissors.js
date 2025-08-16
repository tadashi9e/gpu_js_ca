// Rock-Paper-Scissors
const WIDTH = 800;
const HEIGHT = 800;

window.onload = function() {
    // initialize param_a, param_b
    let param_a = document.getElementById('slider_a').value / 50 - 8;
    document.getElementById('param_a').textContent = param_a;
    let param_b = document.getElementById('slider_b').value / 50 - 8;
    document.getElementById('param_b').textContent = param_b;
    // addEventListener to sliders
    document.getElementById('slider_a').addEventListener(
        'mouseup', function(event) {
            param_a = this.value / 50 - 8;
            document.getElementById('param_a').textContent = param_a;
        });
    document.getElementById('slider_b').addEventListener(
        'mouseup', function(event) {
            param_b = this.value / 50 - 8;
            document.getElementById('param_b').textContent = param_b;
        });

    console.log("new GPU");
    let gpu;
    try {
        gpu = new GPU();
    } catch (error) {
        console.error(error);
        console.log("retrying new GPU...");
        gpu = new GPU.GPU();
    }
    // --------------------------------------------------
    console.log("adding GPU function: get");
    function get(cells, h, w, y, x) {
        return cells
        [(y < 0) ? (y + h) : (y >= h) ? (y - h) : y]
        [(x < 0) ? (x + w) : (x >= w) ? (x - w) : x];
    }
    gpu.addFunction(get);
    console.log("adding GPU function: count_if");
    function count_if(cells, h, w, y, x, state) {
        let n = 0;
        for (let dy = -1; dy < 2; dy++) {
            for (let dx = -1; dx < 2; dx++) {
                if (dy != 0 || dx != 0) {
                    const c = get(cells, h, w, y+dy, x+dx);
                    if (c == state) {
                        n += 1;
                    }
                }
            }
        }
        return n;
    }
    gpu.addFunction(count_if);

    console.log("creating kernel: to_texture");
    const to_texture = gpu.createKernel(
        function(array) {
            const x = this.thread.x;
            const y = this.thread.y;
            return array[y][x];
        })
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);

    console.log("creating kernel: rps");
    const rps = gpu.createKernel(
        function(cells, param_a, param_b) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            const r = count_if(cells, h, w, y, x, this.constants.ST_ROCK);
            const p = count_if(cells, h, w, y, x, this.constants.ST_PAPER);
            const s = count_if(cells, h, w, y, x, this.constants.ST_SCISSORS);
            const center = get(cells, h, w, y, x);
            const next_r =
                  r > 0 && r > p - param_a && r > s - param_b &&
                  (center == this.constants.ST_SCISSORS || center == 0);
            const next_p =
                  p > 0 && p > s - param_a  && p > r - param_b &&
                  (center == this.constants.ST_ROCK || center == 0);
            const next_s =
                  s > 0 && s > r - param_a && s > p - param_b &&
                  (center == this.constants.ST_PAPER || center == 0);
            if (next_r && !next_p && !next_s) {
                return this.constants.ST_ROCK;
            }
            if (next_p && !next_s && !next_r) {
                return this.constants.ST_PAPER;
            }
            if (next_s && !next_r && !next_p) {
                return this.constants.ST_SCISSORS;
            }
            return center;
        })
          .setConstants({
              ST_ROCK: 1, ST_PAPER: 2, ST_SCISSORS: 3,
              width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);

    console.log("creating kernel: rps_render");
    const rps_render = gpu.createKernel(
        function(cells) {
            const cell = cells[this.thread.y][this.thread.x];
            if (cell == this.constants.ST_ROCK) {
                this.color(1, 0, 0, 1);
            } else if (cell == this.constants.ST_PAPER) {
                this.color(0, 1, 0, 1);
            } else if (cell == this.constants.ST_SCISSORS) {
                this.color(0, 0, 1, 1);
            } else {
                this.color(0, 0, 0, 1);
            }
        })
          .setConstants({
              ST_ROCK: 1, ST_PAPER: 2, ST_SCISSORS: 3})
          .setGraphical(true)
          .setOutput([WIDTH, HEIGHT]);
    // --------------------------------------------------
    console.log("initializing: cell space");
    let cells = [];
    for (let y = 0; y < HEIGHT; y++) {
        let line = [];
        for (let x = 0; x < WIDTH; x++) {
            if (x > WIDTH / 3 && x < 2 * WIDTH / 3 &&
                y > HEIGHT / 3 && y < 2 * HEIGHT / 3) {
                line.push(Math.floor(Math.random() * 4));
            } else {
                line.push(0);
            }
        }
        cells.push(line);
    }
    cells = to_texture(cells);

    console.log("initializing: canvas setup & initial rendering");
    rps_render(cells);
    const canvas = rps_render.canvas;
    document.getElementById("gpu").appendChild(canvas);
    // --------------------------------------------------
    console.log("start rendering...");
    let count = 0;
    function render_loop() {
        cells = to_texture(rps(cells, param_a, param_b));
        rps_render(cells);
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
