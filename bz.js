// Belousov–Zhabotinsky Reaction
const WIDTH = 800;
const HEIGHT = 800;

window.onload = function() {
    console.log("new GPU");
    const gpu = new GPU.GPU();

    console.log("adding GPU function: get");
    function get(cells, h, w, y, x) {
        return cells
        [(y < 0) ? (y + h) : (y >= h) ? (y - h) : y]
        [(x < 0) ? (x + w) : (x >= w) ? (x - w) : x];
    }
    gpu.addFunction(get);

    console.log("adding GPU function: average");
    function average(cells, h, w, y, x) {
        return (get(cells, h, w, y-1, x-1) +
                get(cells, h, w, y-1, x) +
                get(cells, h, w, y-1, x+1) +
                get(cells, h, w, y, x-1) +
                get(cells, h, w, y, x+1) +
                get(cells, h, w, y+1, x-1) +
                get(cells, h, w, y+1, x) +
                get(cells, h, w, y+1, x+1)) / 8;
    }
    gpu.addFunction(average);

    console.log("adding GPU function: limit");
    function limit(v) {
        if (v < 0.0) {
            return 0.0;
        }
        if (v > 1.0) {
            return 1.0;
        }
        return v;
    }
    gpu.addFunction(limit);

    console.log("adding GPU function: reaction");
    function reaction(a, b, c, param_a, param_c) {
        return limit(a + a * (param_a * b - param_c * c));
    }
    gpu.addFunction(reaction);

    console.log("creating kernel: to_texture");
    const to_texture = gpu.createKernel(
        function(data) {
            const x = this.thread.x;
            const y = this.thread.y;
            return data[y][x];
        })
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);
    to_texture.immutable = true;

    console.log("creating kernel: bz_diffusion");
    const bz_diffusion = gpu.createKernel(
        function(src, rate) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            return (1.0 - rate) * get(src, h, w, y, x) +
                rate * average(src, h, w, y, x);
        })
          .setConstants({width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);
    bz_diffusion.immutable = true;

    console.log("creating kernel: bz_reaction");
    const bz_reaction = gpu.createKernel(
        function(a, b, c, param_a, param_c) {
            const w = this.constants.width;
            const h = this.constants.height;
            const x = this.thread.x;
            const y = this.thread.y;
            return reaction(
                get(a, h, w, y, x),
                get(b, h, w, y, x),
                get(c, h, w, y, x),
                get(param_a, h, w, y, x),
                get(param_c, h, w, y, x));
        })
          .setConstants({width: WIDTH, height: HEIGHT})
          .setOutput([WIDTH, HEIGHT])
          .setPipeline(true);
    bz_reaction.immutable = true;

    console.log("creating kernel: bz_render");
    const bz_render = gpu.createKernel(
        function(a, b, c) {
            const x = this.thread.x;
            const y = this.thread.y;
            this.color(a[y][x], b[y][x], c[y][x], 1.0);
        })
          .setGraphical(true)
          .setOutput([WIDTH, HEIGHT]);
    // --------------------------------------------------
    function create_random_center() {
        let spc = [];
        for (let y = 0; y < HEIGHT; y++) {
            let line = [];
            for (let x = 0; x < WIDTH; x++) {
                const v =
                      ((x > WIDTH / 3 && x < WIDTH * 2 / 3) &&
                       (y > HEIGHT / 3 && y < HEIGHT * 2 / 3))
                      ? Math.random() : 0.5;
                line.push(v);
            }
            spc.push(line);
        }
        return to_texture(spc);
    }
    console.log("initializing: cell space a");
    let a = create_random_center();
    console.log("initializing: cell space b");
    let b = create_random_center();
    console.log("initializing: cell space c");
    let c = create_random_center();
    function create_random(mid, dist) {
        let spc = [];
        for (let y = 0; y < HEIGHT; y++) {
            let line = [];
            for (let x = 0; x < WIDTH; x++) {
                // line.push(1.2);
                line.push(mid + dist * Math.random());
            }
            spc.push(line);
        }
        return to_texture(spc);
    }
    console.log("initializing: param_a");
    let param_a = create_random(1, 0.4);
    console.log("initializing: param_b");
    let param_b = create_random(0.8, 0.4);
    console.log("initializing: param_c");
    let param_c = create_random(0.8, 0.4);

    console.log("initializing: canvas setup & initial rendering");
    bz_render(a, b, c);
    const canvas = bz_render.canvas;
    document.getElementById("gpu").appendChild(canvas);
    // --------------------------------------------------
    console.log("start rendering...");
    let count = 0;
    function render_loop() {
        let a2 = bz_diffusion(a, 0.9);
        let b2 = bz_diffusion(b, 0.9);
        let c2 = bz_diffusion(c, 0.9);
        a.delete(); b.delete(); c.delete();
        a = bz_reaction(a2, b2, c2, param_a, param_c);
        b = bz_reaction(b2, c2, a2, param_b, param_a);
        c = bz_reaction(c2, a2, b2, param_c, param_b);
        a2.delete(); b2.delete(); c2.delete();
        bz_render(a, b, c);
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
