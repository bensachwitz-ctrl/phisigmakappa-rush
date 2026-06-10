"use client";

import React from "react";

// 3D WebGL "plexus" background for the interactive demo.
//
// Extracted verbatim from MobileAppClient.tsx. Its gating is intentional and
// must stay intact: it bails entirely under prefers-reduced-motion and on small
// viewports, and pauses the requestAnimationFrame loop whenever the tab is
// hidden (visibilitychange) or the canvas is scrolled offscreen
// (IntersectionObserver).
export function WebGLBackground() {
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // PERF + a11y: this is a continuous O(n²) plexus render over 90 particles on
    // every animation frame. It must NEVER run when:
    //   (1) the user prefers reduced motion (skip it entirely), or
    //   (2) the viewport is small / mobile (skip it entirely — phones don't need
    //       a heavy decorative GL loop), or
    //   (3) the document/tab is hidden, or
    //   (4) the canvas is scrolled offscreen.
    // We honor (1)+(2) by bailing before any GL setup, and (3)+(4) by pausing the
    // requestAnimationFrame loop (rather than burning CPU/GPU in the background).
    const reduceMotionQuery =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(prefers-reduced-motion: reduce)")
        : null;
    if (reduceMotionQuery?.matches) {
      // Reduced motion: render nothing and do not allocate any GL resources.
      return;
    }

    // Small viewports (phones / narrow tablets): skip the decorative GL plexus
    // entirely — never allocate GL resources or start the loop on small screens.
    const smallViewportQuery =
      typeof window !== "undefined" && window.matchMedia
        ? window.matchMedia("(max-width: 640px)")
        : null;
    if (smallViewportQuery?.matches) {
      return;
    }

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const vsSource = `
      attribute vec3 aPosition;
      attribute vec4 aColor;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      varying lowp vec4 vColor;
      void main(void) {
        gl_Position = uProjectionMatrix * uModelViewMatrix * vec4(aPosition, 1.0);
        gl_PointSize = 4.5;
        vColor = aColor;
      }
    `;

    const fsSource = `
      varying lowp vec4 vColor;
      void main(void) {
        gl_FragColor = vColor;
      }
    `;

    function loadShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader | null {
      const shader = gl.createShader(type);
      if (!shader) return null;
      gl.shaderSource(shader, source);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error("Shader compilation error: " + gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
      }
      return shader;
    }

    const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
    const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);
    if (!vertexShader || !fragmentShader) return;

    const shaderProgram = gl.createProgram();
    if (!shaderProgram) return;
    gl.attachShader(shaderProgram, vertexShader);
    gl.attachShader(shaderProgram, fragmentShader);
    gl.linkProgram(shaderProgram);

    if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
      console.error("Shader linking error");
      return;
    }

    const programInfo = {
      program: shaderProgram,
      attribLocations: {
        vertexPosition: gl.getAttribLocation(shaderProgram, "aPosition"),
        vertexColor: gl.getAttribLocation(shaderProgram, "aColor"),
      },
      uniformLocations: {
        projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
        modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
      },
    };

    const numParticles = 90;
    const positions: number[] = [];
    const colors: number[] = [];
    const velocities: number[] = [];

    for (let i = 0; i < numParticles; i++) {
      positions.push(
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5,
        (Math.random() - 0.5) * 5
      );
      colors.push(
        0.35 + Math.random() * 0.15,
        0.45 + Math.random() * 0.2,
        0.85 + Math.random() * 0.15,
        0.12 + Math.random() * 0.18
      );
      velocities.push(
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003,
        (Math.random() - 0.5) * 0.003
      );
    }

    const positionBuffer = gl.createBuffer();
    const colorBuffer = gl.createBuffer();
    const linePosBuffer = gl.createBuffer();
    const lineColorBuffer = gl.createBuffer();

    const fieldOfView = (45 * Math.PI) / 180;
    const zNear = 0.1;
    const zFar = 100.0;

    function makePerspectiveMatrix(fov: number, aspect: number, near: number, far: number) {
      const f = 1.0 / Math.tan(fov / 2);
      const rangeInv = 1.0 / (near - far);
      return [
        f / aspect, 0, 0, 0,
        0, f, 0, 0,
        0, 0, (near + far) * rangeInv, -1,
        0, 0, near * far * rangeInv * 2, 0
      ];
    }

    function makeIdentityMatrix() {
      return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
      ];
    }

    function rotateMatrixY(m: number[], angle: number) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const r = [...m];
      r[0] = m[0] * c + m[8] * s;
      r[2] = m[2] * c + m[10] * s;
      r[8] = m[0] * -s + m[8] * c;
      r[10] = m[2] * -s + m[10] * c;
      return r;
    }

    function rotateMatrixX(m: number[], angle: number) {
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const r = [...m];
      r[5] = m[5] * c + m[9] * -s;
      r[6] = m[6] * c + m[10] * -s;
      r[9] = m[5] * s + m[9] * c;
      r[10] = m[6] * s + m[10] * c;
      return r;
    }

    let rotationY = 0;
    let rotationX = 0;
    let mouseX = 0;
    let mouseY = 0;

    const handleMouseMoveGlobal = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth - 0.5) * 0.4;
      mouseY = (e.clientY / window.innerHeight - 0.5) * 0.4;
    };
    window.addEventListener("mousemove", handleMouseMoveGlobal);

    let animationFrameId: number | null = null;
    // running: whether the loop is currently scheduling frames.
    // visible / onScreen: the two gates that decide whether it SHOULD run.
    let running = false;
    let visible = typeof document === "undefined" || !document.hidden;
    let onScreen = true;

    function render() {
      if (!canvas || !gl) return;

      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
        gl.viewport(0, 0, width, height);
      }

      gl.clearColor(0.0, 0.0, 0.0, 0.0);
      gl.clearDepth(1.0);
      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      const aspect = width / height;
      const projectionMatrix = makePerspectiveMatrix(fieldOfView, aspect, zNear, zFar);

      for (let i = 0; i < numParticles; i++) {
        const idx = i * 3;
        positions[idx] += velocities[idx];
        positions[idx + 1] += velocities[idx + 1];
        positions[idx + 2] += velocities[idx + 2];

        if (Math.abs(positions[idx]) > 2.8) velocities[idx] *= -1;
        if (Math.abs(positions[idx + 1]) > 2.8) velocities[idx + 1] *= -1;
        if (Math.abs(positions[idx + 2]) > 2.8) velocities[idx + 2] *= -1;
      }

      gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.DYNAMIC_DRAW);
      gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

      gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
      gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
      gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

      let modelViewMatrix = makeIdentityMatrix();
      modelViewMatrix[14] = -6.5;

      rotationY += 0.0008;
      const currentRotY = rotationY + mouseX;
      const currentRotX = rotationX + mouseY;

      modelViewMatrix = rotateMatrixY(modelViewMatrix, currentRotY);
      modelViewMatrix = rotateMatrixX(modelViewMatrix, currentRotX);

      gl.useProgram(programInfo.program);

      gl.uniformMatrix4fv(programInfo.uniformLocations.projectionMatrix, false, new Float32Array(projectionMatrix));
      gl.uniformMatrix4fv(programInfo.uniformLocations.modelViewMatrix, false, new Float32Array(modelViewMatrix));

      gl.drawArrays(gl.POINTS, 0, numParticles);

      const linePositions: number[] = [];
      const lineColors: number[] = [];
      const threshold = 1.0;

      for (let i = 0; i < numParticles; i++) {
        const p1x = positions[i * 3];
        const p1y = positions[i * 3 + 1];
        const p1z = positions[i * 3 + 2];

        for (let j = i + 1; j < numParticles; j++) {
          const p2x = positions[j * 3];
          const p2y = positions[j * 3 + 1];
          const p2z = positions[j * 3 + 2];

          const dx = p1x - p2x;
          const dy = p1y - p2y;
          const dz = p1z - p2z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < threshold) {
            linePositions.push(p1x, p1y, p1z, p2x, p2y, p2z);
            const opacity = (1.0 - dist / threshold) * 0.1;
            lineColors.push(
              0.4, 0.5, 0.9, opacity,
              0.4, 0.5, 0.9, opacity
            );
          }
        }
      }

      if (linePositions.length > 0) {
        gl.bindBuffer(gl.ARRAY_BUFFER, linePosBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(linePositions), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexPosition, 3, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexPosition);

        gl.bindBuffer(gl.ARRAY_BUFFER, lineColorBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(lineColors), gl.DYNAMIC_DRAW);
        gl.vertexAttribPointer(programInfo.attribLocations.vertexColor, 4, gl.FLOAT, false, 0, 0);
        gl.enableVertexAttribArray(programInfo.attribLocations.vertexColor);

        gl.drawArrays(gl.LINES, 0, linePositions.length / 3);
      }

      animationFrameId = requestAnimationFrame(render);
    }

    function start() {
      if (running) return;
      running = true;
      animationFrameId = requestAnimationFrame(render);
    }
    function stop() {
      running = false;
      if (animationFrameId !== null) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
    }
    // Run only while BOTH gates are satisfied (visible tab AND on-screen canvas).
    function sync() {
      if (visible && onScreen) start();
      else stop();
    }

    // Gate 2: pause when the tab/document is hidden.
    const handleVisibility = () => {
      visible = !document.hidden;
      sync();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Gate 3: pause when the canvas is scrolled offscreen. Falls back to
    // always-on if IntersectionObserver is unavailable.
    let observer: IntersectionObserver | null = null;
    if (typeof IntersectionObserver !== "undefined") {
      observer = new IntersectionObserver(
        (entries) => {
          onScreen = entries.some((e) => e.isIntersecting);
          sync();
        },
        { threshold: 0 },
      );
      observer.observe(canvas);
    }

    // Reduced-motion can flip on at runtime — if it does, tear the loop down.
    const handleReduceMotionChange = () => {
      if (reduceMotionQuery?.matches) stop();
      else sync();
    };
    reduceMotionQuery?.addEventListener?.("change", handleReduceMotionChange);

    sync();

    return () => {
      window.removeEventListener("mousemove", handleMouseMoveGlobal);
      document.removeEventListener("visibilitychange", handleVisibility);
      reduceMotionQuery?.removeEventListener?.("change", handleReduceMotionChange);
      observer?.disconnect();
      stop();
      gl.deleteBuffer(positionBuffer);
      gl.deleteBuffer(colorBuffer);
      gl.deleteBuffer(linePosBuffer);
      gl.deleteBuffer(lineColorBuffer);
      gl.deleteProgram(shaderProgram);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none z-0"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
