function fragShader(gl, fs) {
  let vs = `
    attribute vec4 position;

    void main() {
      gl_Position = position;
    }`

  let program = initShaderProgram(gl, vs, fs)
  let positionLoc = gl.getAttribLocation(program, 'position')
  let positionBuffer = gl.createBuffer()

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]),
    gl.STATIC_DRAW
  )
  gl.enableVertexAttribArray(positionLoc)
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer)

  {
    let size = 2
    let type = gl.FLOAT
    let normalize = false
    let stride = 0
    let offset = 0
    gl.vertexAttribPointer(positionLoc, size, type, normalize, stride, offset)
  }

  // gl.useProgram(program)

  return {
    program,
    render() {
      gl.viewport(0, 0, gl.canvas.width, gl.canvas.height)
      gl.clearColor(0.0, 0.0, 0.0, 1.0)
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)

      {
        let type = gl.TRIANGLES
        let offset = 0
        let count = 6
        gl.drawArrays(type, offset, count)
      }
    },
  }
}

// ported from https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/Tutorial/Adding_2D_content_to_a_WebGL_context

function initShaderProgram(gl, vsSource, fsSource) {
  let vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource)
  let fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource)
  let shaderProgram = gl.createProgram()

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
  let shader = gl.createShader(type)

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
