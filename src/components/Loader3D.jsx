import React, { useEffect, useRef } from "react";
import * as THREE from "three";

export default function Loader3D({ size = 80, message = "", fullScreen = false, glowColor = "#10b981" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    const scene = new THREE.Scene();

    // Perspective Camera
    const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 10);
    camera.position.z = 3.5;

    // WebGL Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Torus Knot Geometry (Premium 3D shape)
    const geometry = new THREE.TorusKnotGeometry(0.5, 0.16, 120, 16);

    // Glowing Material
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(glowColor),
      roughness: 0.1,
      metalness: 0.9,
      emissive: new THREE.Color(glowColor),
      emissiveIntensity: 0.35,
    });

    const torusKnot = new THREE.Mesh(geometry, material);
    scene.add(torusKnot);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0xffffff, 1.5, 10);
    pointLight1.position.set(2, 3, 4);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(glowColor, 2, 10);
    pointLight2.position.set(-2, -3, 2);
    scene.add(pointLight2);

    // Animation Loop
    let animationFrameId;
    const animate = () => {
      torusKnot.rotation.x += 0.015;
      torusKnot.rotation.y += 0.02;
      renderer.render(scene, camera);
      animationFrameId = requestAnimationFrame(animate);
    };
    animate();

    // Clean up WebGL context and resources on unmount
    return () => {
      cancelAnimationFrame(animationFrameId);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
    };
  }, [size, glowColor]);

  if (fullScreen) {
    return (
      <div
        className="loader-3d-overlay"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 9999,
          background: "rgba(5, 12, 8, 0.75)",
          backdropFilter: "blur(12px)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
        }}
      >
        <div
          style={{
            background: "rgba(10, 22, 15, 0.85)",
            border: "1px solid var(--glass-border)",
            borderRadius: "20px",
            padding: "40px",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 20px 50px rgba(0, 0, 0, 0.5)",
            maxWidth: "320px",
            textAlign: "center",
          }}
        >
          <div style={{ position: "relative", width: size, height: size, marginBottom: "16px" }}>
            <canvas ref={canvasRef} />
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: size,
                height: size,
                borderRadius: "50%",
                background: `radial-gradient(circle, ${glowColor}33 0%, transparent 70%)`,
                pointerEvents: "none",
                zIndex: -1,
              }}
            />
          </div>
          {message && (
            <h4
              style={{
                margin: 0,
                fontSize: "1.1rem",
                fontWeight: "700",
                fontFamily: "var(--font-display)",
                letterSpacing: "0.5px",
                color: "var(--white)",
              }}
            >
              {message}
            </h4>
          )}
          <p style={{ margin: "8px 0 0 0", fontSize: "0.8rem", color: "var(--gray-600)" }}>
            Please wait...
          </p>
        </div>
      </div>
    );
  }

  // Inline version
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        gap: "10px",
      }}
    >
      <div style={{ position: "relative", width: size, height: size }}>
        <canvas ref={canvasRef} />
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: size,
            height: size,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${glowColor}22 0%, transparent 70%)`,
            pointerEvents: "none",
            zIndex: -1,
          }}
        />
      </div>
      {message && (
        <span style={{ fontSize: "0.85rem", color: "var(--gray-600)", fontWeight: "500" }}>
          {message}
        </span>
      )}
    </div>
  );
}
