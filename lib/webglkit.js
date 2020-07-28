const vs = `
attribute vec4 a_position;
void main() {
  gl_Position = a_position;
}`

function fragShader(canvas, fs) {
  const gl = canvas.getContext('webgl')
  const program = initShaderProgram(gl, vs, fs)
  const resolutionLoc = gl.getUniformLocation(program, 'u_resolution')
  const timeLoc = gl.getUniformLocation(program, 'u_time')
  const positionLoc = gl.getAttribLocation(program, 'a_position')
  const positionBuffer = gl.createBuffer()

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  )

  return {
    gl,
    program,
    render() {
      gl.viewport(0, 0, gl.drawingBufferWidth, gl.drawingBufferHeight)
      gl.clearColor(0.0, 0.0, 0.0, 1.0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      gl.useProgram(program)
      gl.enableVertexAttribArray(positionLoc)
      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

      {
        const size = 2
        const type = gl.FLOAT
        const normalize = false
        const stride = 0
        const offset = 0
        gl.vertexAttribPointer(
          positionLoc,
          size,
          type,
          normalize,
          stride,
          offset
        )
      }

      gl.uniform2f(resolutionLoc, gl.canvas.width, gl.canvas.height)
      gl.uniform1f(timeLoc, performance.now() * 0.001)

      {
        const type = gl.TRIANGLES
        const offset = 0
        const count = 6
        gl.drawArrays(type, offset, count)
      }
    },
  }
}

function animate(fn) {
  function run() {
    fn()
    requestAnimationFrame(run)
  }
  run(performance.now())
}

// ported from https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)
  const shaderProgram = gl.createProgram()

  gl.attachShader(shaderProgram, vertexShader)
  gl.attachShader(shaderProgram, fragmentShader)
  gl.linkProgram(shaderProgram)

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(
      'Unable to initialize the shader program: ' +
        gl.getProgramInfoLog(shaderProgram)
    )
    return null
  }

  return shaderProgram
}

function loadShader(gl, type, source) {
  const shader = gl.createShader(type)

  gl.shaderSource(shader, source)
  gl.compileShader(shader)

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(
      'An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader)
    )
    gl.deleteShader(shader)
    return null
  }

  return shader
}
