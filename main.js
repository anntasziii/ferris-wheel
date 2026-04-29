async function loadShaderSource(url) {
    const response = await fetch(url);
    return await response.text();
}

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
    }

    return shader;
}

function createProgram(gl, vs, fs) {
    const program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error(gl.getProgramInfoLog(program));
        gl.deleteProgram(program);
    }

    return program;
}

function drawCabin(cabin, modelMatrix, color) {

    // POSITION
    gl.bindBuffer(gl.ARRAY_BUFFER, cabin.vertexBuffer);
    gl.vertexAttribPointer(aPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aPosition);

    // NORMAL
    gl.bindBuffer(gl.ARRAY_BUFFER, cabin.normalBuffer);
    gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(aNormal);

    gl.uniformMatrix4fv(uModel, false, modelMatrix);
    gl.uniform3fv(uObjectColor, color);

    gl.drawArrays(gl.TRIANGLES, 0, cabin.count);
}

async function main() {
    const canvas = document.getElementById("glCanvas");
    const gl = canvas.getContext("webgl");

    if (!gl) {
        alert("WebGL not supported");
        return;
    }

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    gl.viewport(0, 0, canvas.width, canvas.height);

    gl.enable(gl.DEPTH_TEST);

    const vsSource = await loadShaderSource("./shaders/basic/vertex.glsl");
    const fsSource = await loadShaderSource("./shaders/basic/fragment.glsl");

    const vs = createShader(gl, gl.VERTEX_SHADER, vsSource);
    const fs = createShader(gl, gl.FRAGMENT_SHADER, fsSource);
    const program = createProgram(gl, vs, fs);

    gl.useProgram(program);

    const positionLocation = gl.getAttribLocation(program, "aPosition");
    const aPosition = gl.getAttribLocation(program, "aPosition");
    const aNormal = gl.getAttribLocation(program, "aNormal");

    const uModel = gl.getUniformLocation(program, "uModel");
    const uView = gl.getUniformLocation(program, "uView");
    const uProjection = gl.getUniformLocation(program, "uProjection");

    const uLightPos = gl.getUniformLocation(program, "uLightPos");
    const uViewPos = gl.getUniformLocation(program, "uViewPos");
    const uObjectColor = gl.getUniformLocation(program, "uObjectColor");

    gl.uniform3fv(uLightPos, [5, 5, 5]);
    gl.uniform3fv(uViewPos, [0, 0, 4]);

    const cubeVertices = new Float32Array([
        // front
        -0.5,-0.5, 0.5,  0.5,-0.5, 0.5,  0.5, 0.5, 0.5,
        -0.5,-0.5, 0.5,  0.5, 0.5, 0.5, -0.5, 0.5, 0.5,

        -0.5,-0.5,-0.5, -0.5, 0.5,-0.5,  0.5, 0.5,-0.5,
        -0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5,-0.5,-0.5,

        -0.5,-0.5,-0.5, -0.5,-0.5, 0.5, -0.5, 0.5, 0.5,
        -0.5,-0.5,-0.5, -0.5, 0.5, 0.5, -0.5, 0.5,-0.5,

        0.5,-0.5,-0.5,  0.5, 0.5,-0.5,  0.5, 0.5, 0.5,
        0.5,-0.5,-0.5,  0.5, 0.5, 0.5,  0.5,-0.5, 0.5,

        -0.5, 0.5,-0.5, -0.5, 0.5, 0.5,  0.5, 0.5, 0.5,
        -0.5, 0.5,-0.5,  0.5, 0.5, 0.5,  0.5, 0.5,-0.5,

        -0.5,-0.5,-0.5,  0.5,-0.5,-0.5,  0.5,-0.5, 0.5,
        -0.5,-0.5,-0.5,  0.5,-0.5, 0.5, -0.5,-0.5, 0.5
    ]);

    const cubeNormals = new Float32Array([
        0,0,1, 0,0,1, 0,0,1,
        0,0,1, 0,0,1, 0,0,1,

        0,0,-1, 0,0,-1, 0,0,-1,
        0,0,-1, 0,0,-1, 0,0,-1,

        -1,0,0, -1,0,0, -1,0,0,
        -1,0,0, -1,0,0, -1,0,0,

        1,0,0, 1,0,0, 1,0,0,
        1,0,0, 1,0,0, 1,0,0,

        0,1,0, 0,1,0, 0,1,0,
        0,1,0, 0,1,0, 0,1,0,

        0,-1,0, 0,-1,0, 0,-1,0,
        0,-1,0, 0,-1,0, 0,-1,0
    ]);

    const cubeNormalBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeNormals, gl.STATIC_DRAW);

    const cubeBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, cubeVertices, gl.STATIC_DRAW);

    const groundVertices = new Float32Array([
        -5,0,-5, 5,0,-5, 5,0,5,
        -5,0,-5, 5,0,5, -5,0,5
    ]);

    const groundBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, groundVertices, gl.STATIC_DRAW);

    const view = new Float32Array([
        1,0,0,0,
        0,1,0,0,
        0,0,1,0,
        0,0,-4,1
    ]);

    const projection = new Float32Array([
        1,0,0,0,
        0,1,0,0,
        0,0,-1,-1,
        0,0,-0.2,0
    ]);

    gl.uniformMatrix4fv(uView, false, view);
    gl.uniformMatrix4fv(uProjection, false, projection);

    gl.clearColor(0,0,0,1);

    function render() {
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        const t = performance.now() * 0.001;
        const wheelAngle = t * 0.5;

        const hubModel = new Float32Array([
            Math.cos(wheelAngle),0,Math.sin(wheelAngle),0,
            0,1,0,0,
            -Math.sin(wheelAngle),0,Math.cos(wheelAngle),0,
            0,0,0,1
        ]);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeNormalBuffer);
        gl.vertexAttribPointer(aNormal, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(aNormal);

        gl.bindBuffer(gl.ARRAY_BUFFER, cubeBuffer);
        gl.vertexAttribPointer(positionLocation,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(positionLocation);

        gl.uniformMatrix4fv(uModel,false,hubModel);
        gl.uniform3fv(uObjectColor,[0.2,0.8,0.2]);
        gl.drawArrays(gl.TRIANGLES, 0, 36);

        const count = 8;

        const angle = wheelAngle;
        const radius = 2.5;

        for (let i = 0; i < 8; i++) {

            const a = i / 8 * Math.PI * 2;

            const x = Math.cos(a + angle) * radius;
            const z = Math.sin(a + angle) * radius;

            let model = new Float32Array([
                1,0,0,0,
                0,1,0,0,
                0,0,1,0,
                x,0,z,1
            ]);

            const c = Math.cos(-(a + angle));
            const s = Math.sin(-(a + angle));

            model[0] = c; model[2] = s;
            model[8] = -s; model[10] = c;

            gl.uniformMatrix4fv(uModel, false, model);
            gl.uniform3fv(uObjectColor, [0.7, 0.7, 0.7]);

            gl.drawArrays(gl.TRIANGLES, 0, 36);
        }

        const groundModel = new Float32Array([
            1,0,0,0,
            0,1,0,0,
            0,0,1,0,
            0,-1,0,1
        ]);

        gl.bindBuffer(gl.ARRAY_BUFFER, groundBuffer);
        gl.vertexAttribPointer(positionLocation,3,gl.FLOAT,false,0,0);
        gl.enableVertexAttribArray(positionLocation);

        gl.uniformMatrix4fv(uModel,false,groundModel);
        gl.uniform3fv(uObjectColor,[0.3,0.3,0.3]);
        gl.drawArrays(gl.TRIANGLES,0,6);

        requestAnimationFrame(render);
    }

    render();
}

main();