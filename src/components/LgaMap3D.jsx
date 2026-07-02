import React, { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

const lgasData = [
  { name: "Ini", crop: "Cocoa & Upland Rice", x: 200, y: 35, color: "#10b981" },
  { name: "Ikot Ekpene", crop: "Raffia & Yams", x: 110, y: 80, color: "#f59e0b" },
  { name: "Itu", crop: "Cassava & Fish", x: 210, y: 85, color: "#10b981" },
  { name: "Uyo", crop: "Capital Hub Markets", x: 200, y: 130, color: "#0ea5e9" },
  { name: "Abak", crop: "Palm Oil & Cassava", x: 110, y: 140, color: "#f59e0b" },
  { name: "Mkpat Enin", crop: "Coconut Refinery", x: 100, y: 210, color: "#10b981" },
  { name: "Eket", crop: "Marine Fisheries", x: 200, y: 230, color: "#0ea5e9" },
  { name: "Oron", crop: "Coastal Crayfish", x: 290, y: 190, color: "#f59e0b" },
  { name: "Ibeno", crop: "Ocean Seafood & Fish", x: 250, y: 250, color: "#0ea5e9" },
  { name: "Oruk Anam", crop: "Cassava & Oil Palm", x: 60, y: 170, color: "#10b981" },
  { name: "Essien Udim", crop: "Yam & Cocoyam", x: 70, y: 95, color: "#f59e0b" },
  { name: "Uruan", crop: "Waterleaf & Pumpkin", x: 250, y: 120, color: "#10b981" },
  { name: "Ibiono Ibom", crop: "Rice & Oil Palm", x: 160, y: 95, color: "#10b981" },
  { name: "Ikot Abasi", crop: "Mangrove Seafood", x: 60, y: 230, color: "#0ea5e9" }
];

export default function LgaMap3D({ db, selectedLga, onLgaSelect }) {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const labelsContainerRef = useRef(null);
  const selectedLgaRef = useRef(selectedLga);

  // Keep ref up to date for inside requestAnimationFrame loop
  useEffect(() => {
    selectedLgaRef.current = selectedLga;
  }, [selectedLga]);

  // Compute stats helper
  const getLgaStats = (lgaName) => {
    if (!db) return { farmers: 0, products: 0 };
    const farmersCount = db.users.filter(u => u.role === "Farmer" && u.lga === lgaName).length;
    const productsInLga = db.products.filter(p => p.lga === lgaName && p.status === "Available").length;
    return {
      farmers: farmersCount,
      products: productsInLga
    };
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !labelsContainerRef.current) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    const labelsContainer = labelsContainerRef.current;

    let width = container.clientWidth || 400;
    let height = container.clientHeight || 350;

    // 1. Scene
    const scene = new THREE.Scene();

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 4.8, 5.2);

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1; // Limit camera from going underground
    controls.minDistance = 3;
    controls.maxDistance = 12;
    controls.target.set(0, 0.5, 0);

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    dirLight.position.set(5, 10, 3);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const pointLight = new THREE.PointLight(0x10b981, 1, 10);
    pointLight.position.set(0, 2, 0);
    scene.add(pointLight);

    // 6. Base / Floor Grid
    // Sleek glowing grid
    const gridHelper = new THREE.GridHelper(9, 18, 0x10b981, 0x11281a);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    // Round stylized map base board
    const baseGeom = new THREE.CylinderGeometry(4.3, 4.5, 0.1, 48);
    const baseMat = new THREE.MeshStandardMaterial({
      color: 0x050c08,
      roughness: 0.6,
      metalness: 0.9,
      transparent: true,
      opacity: 0.85
    });
    const baseBoard = new THREE.Mesh(baseGeom, baseMat);
    baseBoard.position.y = -0.05;
    scene.add(baseBoard);

    // 7. Render LGAs as towers
    const lgaMeshes = [];
    const lgaPillarHeights = {};
    const uyoData = lgasData.find(l => l.name === "Uyo");
    const uyoProducts = getLgaStats("Uyo").products;
    const uyoHeight = 0.4 + Math.min(uyoProducts, 8) * 0.35;
    const uyoX = (uyoData.x - 200) / 45;
    const uyoZ = (uyoData.y - 130) / 45;
    const uyoPos = new THREE.Vector3(uyoX, uyoHeight, uyoZ);

    // Track dynamic materials to update selections
    const materialMap = new Map();

    lgasData.forEach(item => {
      const stats = getLgaStats(item.name);
      // Determine tower height based on active produce listings (min 0.4, max capped)
      const height = 0.4 + Math.min(stats.products, 8) * 0.35;
      lgaPillarHeights[item.name] = height;

      const x3d = (item.x - 200) / 45;
      const z3d = (item.y - 130) / 45;

      // Tower geometry: shift origin to base
      const geom = new THREE.CylinderGeometry(0.12, 0.14, height, 24);
      geom.translate(0, height / 2, 0);

      // Neon holograph material
      const mat = new THREE.MeshStandardMaterial({
        color: 0x4b5563,
        emissive: 0x1f2937,
        emissiveIntensity: 0.2,
        roughness: 0.3,
        metalness: 0.8,
        transparent: true,
        opacity: 0.85
      });

      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.set(x3d, 0, z3d);
      mesh.userData = { name: item.name, x3d, z3d, height };

      scene.add(mesh);
      lgaMeshes.push(mesh);
      materialMap.set(item.name, mat);

      // Subtle light source inside active pillars
      if (stats.products > 0) {
        const pillarLight = new THREE.PointLight(item.color === "#0ea5e9" ? 0x0ea5e9 : (item.color === "#f59e0b" ? 0xf59e0b : 0x10b981), 0.2, 1.5);
        pillarLight.position.set(x3d, height, z3d);
        scene.add(pillarLight);
      }
    });

    // 8. Glowing Bezier Curve Logistics Routes (connecting outer LGAs to Uyo)
    const routes = [];
    lgasData.forEach(item => {
      if (item.name === "Uyo") return;

      const x3d = (item.x - 200) / 45;
      const z3d = (item.y - 130) / 45;
      const height = lgaPillarHeights[item.name];
      const startPos = new THREE.Vector3(x3d, height, z3d);

      // Create elevated arc
      const midPoint = new THREE.Vector3().addVectors(startPos, uyoPos).multiplyScalar(0.5);
      midPoint.y += 1.0; // Arch peak height

      const curve = new THREE.QuadraticBezierCurve3(startPos, midPoint, uyoPos);
      const points = curve.getPoints(25);

      // Line mesh for route
      const lineGeom = new THREE.BufferGeometry().setFromPoints(points);
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x10b981,
        transparent: true,
        opacity: 0.2,
        linewidth: 1
      });
      const routeLine = new THREE.Line(lineGeom, lineMat);
      scene.add(routeLine);

      // Animateable logistic cargo package (sphere)
      const cargoGeom = new THREE.SphereGeometry(0.035, 8, 8);
      const cargoMat = new THREE.MeshBasicMaterial({
        color: 0xf59e0b, // Amber glowing parcel
        transparent: true,
        opacity: 0.9
      });
      const cargoMesh = new THREE.Mesh(cargoGeom, cargoMat);
      scene.add(cargoMesh);

      routes.push({
        curve,
        mesh: cargoMesh,
        speed: 0.15 + Math.random() * 0.15,
        offset: Math.random() // Randomize start phase
      });
    });

    // 9. Pulsing Selection Circle Indicator
    const selectionRingGeom = new THREE.RingGeometry(0.24, 0.3, 32);
    selectionRingGeom.rotateX(-Math.PI / 2);
    const selectionRingMat = new THREE.MeshBasicMaterial({
      color: 0x10b981,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.8
    });
    const selectionRing = new THREE.Mesh(selectionRingGeom, selectionRingMat);
    selectionRing.position.set(0, -999, 0); // Hide initially
    scene.add(selectionRing);

    // 10. Floating Particle Cloud (Data drifting up from the map)
    const particleCount = 45;
    const particleGeom = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const speeds = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
      // Random coordinates inside base radius (4.0)
      const r = Math.random() * 4.0;
      const angle = Math.random() * Math.PI * 2;
      positions[i * 3] = Math.cos(angle) * r;
      positions[i * 3 + 1] = Math.random() * 4.0; // Y height
      positions[i * 3 + 2] = Math.sin(angle) * r;
      speeds[i] = 0.005 + Math.random() * 0.01;
    }

    particleGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    const particleMat = new THREE.PointsMaterial({
      color: 0xa7f3d0,
      size: 0.05,
      transparent: true,
      opacity: 0.5,
      depthWrite: false
    });
    const particleCloud = new THREE.Points(particleGeom, particleMat);
    scene.add(particleCloud);

    // 11. Raycaster for clicking & hovering
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let hoveredName = null;

    const getRaycastIntersects = (e) => {
      const rect = renderer.domElement.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      return raycaster.intersectObjects(lgaMeshes);
    };

    const handleMouseMove = (e) => {
      const intersects = getRaycastIntersects(e);
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const name = mesh.userData.name;
        if (hoveredName !== name) {
          hoveredName = name;
          canvas.style.cursor = "pointer";
        }
      } else {
        if (hoveredName !== null) {
          hoveredName = null;
          canvas.style.cursor = "auto";
        }
      }
    };

    const handleMouseClick = (e) => {
      const intersects = getRaycastIntersects(e);
      if (intersects.length > 0) {
        const mesh = intersects[0].object;
        const name = mesh.userData.name;
        onLgaSelect(name);
      }
    };

    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("click", handleMouseClick);

    // 12. Animation Clock
    const clock = new THREE.Clock();
    const tempV = new THREE.Vector3();
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      const elapsed = clock.getElapsedTime();

      // Ambient slow scene rotation when not interacting
      if (controls.state === -1) {
        scene.rotation.y = elapsed * 0.04;
      } else {
        scene.rotation.y = 0; // lock scene rotation when user drags
      }

      controls.update();

      // A. Update Selection Ring and Pillar Highlights
      const currentSelected = selectedLgaRef.current;
      materialMap.forEach((mat, name) => {
        const isSel = name === currentSelected;
        const isGov = name === hoveredName;

        if (isSel) {
          mat.color.setHex(0x10b981); // Emerald select
          mat.emissive.setHex(0x10b981);
          mat.emissiveIntensity = 0.7;
          mat.opacity = 0.95;
        } else if (isGov) {
          mat.color.setHex(0xf59e0b); // Gold hover
          mat.emissive.setHex(0xf59e0b);
          mat.emissiveIntensity = 0.5;
          mat.opacity = 0.9;
        } else {
          mat.color.setHex(0x4b5563); // Gray default
          mat.emissive.setHex(0x111827);
          mat.emissiveIntensity = 0.25;
          mat.opacity = 0.8;
        }
      });

      // Update ring pulse
      const selMesh = lgaMeshes.find(m => m.userData.name === currentSelected);
      if (selMesh) {
        selectionRing.position.set(selMesh.position.x, 0.02, selMesh.position.z);
        const scaleVal = 1.0 + Math.sin(elapsed * 4) * 0.15;
        selectionRing.scale.set(scaleVal, scaleVal, 1);
        selectionRingMat.opacity = 0.5 + Math.sin(elapsed * 4) * 0.25;
      } else {
        selectionRing.position.y = -999;
      }

      // B. Update Logistics Cargo Packets
      routes.forEach(route => {
        const timeFactor = (elapsed * route.speed + route.offset) % 1.0;
        route.curve.getPointAt(timeFactor, tempV);
        route.mesh.position.copy(tempV);
        
        // Scale pulse effect for the parcel
        const pScale = 0.8 + Math.sin(elapsed * 8 + route.offset * 10) * 0.2;
        route.mesh.scale.set(pScale, pScale, pScale);
      });

      // C. Update Floating Particle Drift
      const posAttr = particleGeom.getAttribute("position");
      for (let i = 0; i < particleCount; i++) {
        let yVal = posAttr.getY(i);
        yVal += speeds[i];
        if (yVal > 4.0) {
          yVal = 0.0; // Reset to ground
        }
        posAttr.setY(i, yVal);
      }
      posAttr.needsUpdate = true;

      // D. Project 3D positions to 2D HTML labels
      lgaMeshes.forEach(mesh => {
        const labelDOM = labelsContainer.querySelector(`[data-lga="${mesh.userData.name}"]`);
        if (labelDOM) {
          // Point above the top of the pillar
          tempV.set(mesh.position.x, mesh.userData.height + 0.35, mesh.position.z);
          
          mesh.localToWorld(tempV); // correct for scene-level rotation/matrices
          tempV.project(camera);

          // Render only if in front of camera
          if (tempV.z > 1.0) {
            labelDOM.style.display = "none";
          } else {
            const xOffset = (tempV.x * 0.5 + 0.5) * width;
            const yOffset = (tempV.y * -0.5 + 0.5) * height;

            labelDOM.style.display = "block";
            labelDOM.style.left = `${xOffset}px`;
            labelDOM.style.top = `${yOffset}px`;
          }
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // 13. Responsive Resize handling via ResizeObserver
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries || entries.length === 0) return;
      const entry = entries[0];
      width = entry.contentRect.width || width;
      height = entry.contentRect.height || height;

      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(container);

    // 14. Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();

      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("click", handleMouseClick);

      // Dispose resources
      baseGeom.dispose();
      baseMat.dispose();
      selectionRingGeom.dispose();
      selectionRingMat.dispose();
      particleGeom.dispose();
      particleMat.dispose();

      lgaMeshes.forEach(m => {
        m.geometry.dispose();
      });
      materialMap.forEach(mat => {
        mat.dispose();
      });
      routes.forEach(r => {
        r.mesh.geometry.dispose();
        r.mesh.material.dispose();
      });

      controls.dispose();
      renderer.dispose();
    };
  }, [db]); // Reinitialize only if DB (live listing stats) changes

  return (
    <div
      ref={containerRef}
      style={{
        position: "relative",
        width: "100%",
        height: "420px",
        background: "rgba(0, 0, 0, 0.15)",
        borderRadius: "16px",
        border: "1px solid var(--glass-border)",
        overflow: "hidden"
      }}
    >
      <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
      
      {/* Floating 2D HTML Labels */}
      <div
        ref={labelsContainerRef}
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
          overflow: "hidden",
          fontFamily: "var(--font-display)"
        }}
      >
        {lgasData.map((lga) => {
          const stats = getLgaStats(lga.name);
          const isSelected = selectedLga === lga.name;
          return (
            <div
              key={lga.name}
              data-lga={lga.name}
              style={{
                position: "absolute",
                transform: "translate(-50%, -100%)",
                background: isSelected ? "rgba(16, 185, 129, 0.9)" : "rgba(8, 16, 11, 0.8)",
                border: isSelected ? "1px solid #fff" : "1px solid rgba(255, 255, 255, 0.12)",
                color: isSelected ? "#050a07" : "#e5e7eb",
                padding: "3px 8px",
                borderRadius: "12px",
                fontSize: "10px",
                fontWeight: "bold",
                whiteSpace: "nowrap",
                pointerEvents: "auto",
                cursor: "pointer",
                boxShadow: isSelected ? "0 0 12px rgba(16, 185, 129, 0.6)" : "var(--shadow-sm)",
                transition: "background 0.2s, border-color 0.2s, color 0.2s"
              }}
              onClick={() => onLgaSelect(lga.name)}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                <span>{lga.name}</span>
                {stats.products > 0 && (
                  <span
                    style={{
                      background: isSelected ? "#050a07" : "var(--primary)",
                      color: isSelected ? "var(--primary)" : "#fff",
                      fontSize: "8px",
                      borderRadius: "50%",
                      width: "12px",
                      height: "12px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                  >
                    {stats.products}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modern instructions overlay */}
      <div
        style={{
          position: "absolute",
          bottom: "10px",
          left: "10px",
          fontSize: "9px",
          color: "var(--gray-600)",
          background: "rgba(0,0,0,0.4)",
          padding: "4px 8px",
          borderRadius: "8px",
          pointerEvents: "none"
        }}
      >
        🖱️ Drag to rotate | 📜 Scroll to zoom
      </div>
    </div>
  );
}
