// Langton's Ant
const WIDTH = 800;
const HEIGHT = 800;
const N_ANTS = 100;

window.onload = function() {
    console.log("new GPU");
    const gpu = new GPU.GPU();
    // --------------------------------------------------
    console.log("adding GPU function: get");
    function get(cells, h, w, y, x) {
        return cells
        [(y < 0) ? (y + h) : (y >= h) ? (y - h) : y]
        [(x < 0) ? (x + w) : (x >= w) ? (x - w) : x];
    }
    gpu.addFunction(get);

    console.log("creating kernel: ant_rotate");
    const ant_rotate = gpu
          .createKernel(
        function(cells) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            const c = cells[y][x];
            let ant = this.constants.BLANK;
            if ((c & this.constants.BIT_BW) != 0) {
                // white => turn clockwise
                ant = (((c & this.constants.BIT_N) != 0)
                       ? this.constants.BIT_E : this.constants.BLANK)
                    | (((c & this.constants.BIT_E) != 0)
                       ? this.constants.BIT_S : this.constants.BLANK)
                    | (((c & this.constants.BIT_S) != 0)
                       ? this.constants.BIT_W : this.constants.BLANK)
                    | (((c & this.constants.BIT_W) != 0)
                    ? this.constants.BIT_N : this.constants.BLANK);
            } else {
                // black => turn counterclockwise
                ant = (((c & this.constants.BIT_N) != 0)
                       ? this.constants.BIT_W : this.constants.BLANK)
                    | (((c & this.constants.BIT_E) != 0)
                       ? this.constants.BIT_N : this.constants.BLANK)
                    | (((c & this.constants.BIT_S) != 0)
                       ? this.constants.BIT_E : this.constants.BLANK)
                    | (((c & this.constants.BIT_W) != 0)
                       ? this.constants.BIT_S : this.constants.BLANK);
            }
            const bw = c & this.constants.BIT_BW;
            return ant | bw;
        })
          .setConstants({
              BLANK: 0x00, BIT_N: 0x01, BIT_E: 0x02, BIT_S: 0x04, BIT_W: 0x08,
              BIT_BW: 0x10, BITS_NEWS: 0x0f,
              width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);

    const ant_flip = gpu
          .createKernel(
        function(cells) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            const c = cells[y][x];
            const ant = c & this.constants.BITS_NEWS;
            let bw = this.constants.BLANK;
            if (ant != 0) {
                bw = ((c & this.constants.BIT_BW) != 0)
                    ? this.constants.BLANK : this.constants.BIT_BW;
            } else {
                bw = ((c & this.constants.BIT_BW) != 0)
                    ? this.constants.BIT_BW : this.constants.BLANK;
            }
            return ant | bw;
        })
          .setConstants({
              BLANK: 0x00, BIT_N: 0x01, BIT_E: 0x02, BIT_S: 0x04, BIT_W: 0x08,
              BIT_BW: 0x10, BITS_NEWS: 0x0f,
              width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);

    console.log("creating kernel: ant_forward");
    const ant_forward = gpu
          .createKernel(
        function(cells) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            const c = cells[y][x];
            const ant =
                  (((get(cells, h, w, y-1, x) & this.constants.BIT_N) != 0)
                   ? this.constants.BIT_N : this.constants.BLANK)
                  | (((get(cells, h, w, y, x-1) & this.constants.BIT_E) != 0)
                     ? this.constants.BIT_E : this.constants.BLANK)
                  | (((get(cells, h, w, y+1, x) & this.constants.BIT_S) != 0)
                     ? this.constants.BIT_S : this.constants.BLANK)
                  | (((get(cells, h, w, y, x+1) & this.constants.BIT_W) != 0)
                     ? this.constants.BIT_W : this.constants.BLANK);
            const bw = ((c & this.constants.BIT_BW) != 0)
                  ? this.constants.BIT_BW : this.constants.BLANK;
            return ant | bw;
        })
          .setConstants({
              BLANK: 0x00, BIT_N: 0x01, BIT_E: 0x02, BIT_S: 0x04, BIT_W: 0x08,
              BIT_BW: 0x10, BITS_NEWS: 0x0f,
              width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);

    console.log("creating kernel: ant_render");
    const ant_render = gpu.createKernel(
        function(cells) {
            const cell = cells[this.thread.y][this.thread.x];
            if ((cell & this.constants.BITS_NEWS) != 0) {
                this.color(1, 0, 0, 1);
            } else {
                if ((cell & this.constants.BIT_BW) == 0) {
                    this.color(0, 0, 0, 1);
                } else {
                    this.color(1, 1, 1, 1);
                }
            }
        })
          .setConstants({
              BIT_N: 0x01, BIT_E: 0x02, BIT_S: 0x04, BIT_W: 0x08,
              BIT_BW: 0x10, BITS_NEWS: 0x0f})
          .setGraphical(true)
          .setOutput([WIDTH, HEIGHT]);

    /*
    // slow?
    console.log("combining kernel: ant_rotate_flip_and_forward");
    const ant_forward_flip_rotate =
          gpu.combineKernels(
              ant_rotate, ant_flip, ant_forward,
              function(cells) {
                  return ant_forward(ant_flip(ant_rotate(cells)));
              });
    */
    // --------------------------------------------------
    console.log("initializing: cell space");
    let cells = [];
    for (let y = 0; y < HEIGHT; y++) {
        let line = [];
        for (let x = 0; x < WIDTH; x++) {
            line.push(0);
        }
        cells.push(line);
    }
    for (let n = 0; n < N_ANTS; n++) {
        const y = Math.round(Math.random() * (HEIGHT - 1));
        const x = Math.round(Math.random() * (WIDTH - 1));
        const i = Math.round(Math.random() * 3);
        cells[y][x] = 0x01 << i;
    }

    console.log("initializing: canvas setup & initial rendering");
    ant_render(cells);
    const canvas = ant_render.canvas;
    document.getElementById("gpu").appendChild(canvas);
    // --------------------------------------------------
    console.log("start rendering...");
    let count = 0;
    function render_loop() {
        // cells = ant_forward_flip_rotate(cells);
        cells = ant_forward(ant_flip(ant_rotate(cells)));
        ant_render(cells);
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
