import "./style.css";

import * as THREE from "three";

import { PointerLockControls } from "three/addons/controls/PointerLockControls.js";

import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader";

import { VRButton } from "three/examples/jsm/webxr/VRButton.js";

import { XRControllerModelFactory } from "three/examples/jsm/webxr/XRControllerModelFactory.js";

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;

let INTERSECTION;
let tempMatrix = new THREE.Matrix4();

let scene = new THREE.Scene();

// add a ground picture
let groundTexture = new THREE.TextureLoader().load(
  "./depositphotos_10589691-stock-photo-ground-background.webp"
);
groundTexture.wrapS = THREE.RepeatWrapping;
groundTexture.wrapT = THREE.RepeatWrapping;
groundTexture.repeat.set(100, 100);
let groundMaterial = new THREE.MeshLambertMaterial({ map: groundTexture });
let floor = new THREE.Mesh(
  new THREE.PlaneGeometry(4.8, 4.8, 2, 2).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({
    color: 0x808080,
    transparent: true,
    opacity: 0.25,
  })
);
scene.add(floor);

let camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(0, 1, 3);

let pointLight = new THREE.PointLight(0xffffff);
pointLight.position.set(5, 5, 5);

scene.add(pointLight);

// reduce the amount of light in the scene

let ambientLight = new THREE.AmbientLight(0xffffff);
scene.add(ambientLight);

function addTree(number) {
  for (let i = 0; i < number; i++) {
    let loader = new FBXLoader();
    loader.load("./oak_01.fbx", function (object) {
      let randX = Math.random() * 200 - 100;
      let randZ = Math.random() * 200 - 100;
      object.position.set(randX, -5, randZ);
      scene.add(object);
    });
  }
}

addTree(5);

let renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.outputEncoding = THREE.sRGBEncoding;

window.addEventListener("resize", () => {
  renderer.setSize(window.innerWidth, window.innerHeight);
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
});

document.body.appendChild(VRButton.createButton(renderer));
renderer.xr.enabled = true;
renderer.setAnimationLoop(function () {
  renderer.render(scene, camera);
});

let raycaster = new THREE.Raycaster();

renderer.xr.addEventListener(
  "sessionstart",
  () => (baseReferenceSpace = renderer.xr.getReferenceSpace())
);
renderer.xr.enabled = true;

document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

let controller1 = renderer.xr.getController(0);
controller1.addEventListener("selectstart", onSelectStart);
controller1.addEventListener("selectend", onSelectEnd);
controller1.addEventListener("connected", function (event) {
  this.add(buildController(event.data));
});
controller1.addEventListener("disconnected", function () {
  this.remove(this.children[0]);
});
scene.add(controller1);

let controller2 = renderer.xr.getController(1);
controller2.addEventListener("selectstart", onSelectStart);
controller2.addEventListener("selectend", onSelectEnd);
controller2.addEventListener("connected", function (event) {
  this.add(buildController(event.data));
});
controller2.addEventListener("disconnected", function () {
  this.remove(this.children[0]);
});
scene.add(controller2);

let controllerModelFactory = new XRControllerModelFactory();
let controllerGrip1 = renderer.xr.getControllerGrip(0);
controllerGrip1.add(
  controllerModelFactory.createControllerModel(controllerGrip1)
);
scene.add(controllerGrip1);

let controllerGrip2 = renderer.xr.getControllerGrip(1);
controllerGrip2.add(
  controllerModelFactory.createControllerModel(controllerGrip2)
);
scene.add(controllerGrip2);

function onSelectStart() {
  this.userData.isSelecting = true;
}

function onSelectEnd() {
  this.userData.isSelecting = false;

  if (INTERSECTION) {
    const offsetPosition = {
      x: -INTERSECTION.x,
      y: -INTERSECTION.y,
      z: -INTERSECTION.z,
      w: 1,
    };
    const offsetRotation = new THREE.Quaternion();
    const transform = new XRRigidTransform(offsetPosition, offsetRotation);
    const teleportSpaceOffset =
      baseReferenceSpace.getOffsetReferenceSpace(transform);

    renderer.xr.setReferenceSpace(teleportSpaceOffset);
  }
}

controllerGrip1.addEventListener("selectstart", onSelectStart);
controllerGrip1.addEventListener("selectend", onSelectEnd);

controllerGrip2.addEventListener("selectstart", onSelectStart);
controllerGrip2.addEventListener("selectend", onSelectEnd);

function buildController(data) {
  let geometry, material;

  switch (data.targetRayMode) {
    case "tracked-pointer":
      geometry = new THREE.BufferGeometry();
      geometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, -1], 3)
      );
      geometry.setAttribute(
        "color",
        new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3)
      );

      material = new THREE.LineBasicMaterial({
        vertexColors: true,
        blending: THREE.AdditiveBlending,
      });

      return new THREE.Line(geometry, material);

    case "gaze":
      geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, -1);
      material = new THREE.MeshBasicMaterial({
        opacity: 0.5,
        transparent: true,
      });
      return new THREE.Mesh(geometry, material);
  }
}

let loader = new GLTFLoader();
loader.load("voiture.glb", (gltf) => {
  gltf.scene.position.setY(-5);
  gltf.scene.position.setX(12);
  scene.add(gltf.scene);
});
let controls = new PointerLockControls(camera, renderer.domElement);

controls.addEventListener("lock", (event) => {
  document.body.style.cursor = "none";
});

controls.addEventListener("unlock", () => {
  document.body.style.cursor = "auto";
});

document.body.addEventListener("click", () => {
  controls.lock();
});

scene.add(controls.getObject());

let marker = new THREE.Mesh(
  new THREE.CircleGeometry(0.25, 32).rotateX(-Math.PI / 2),
  new THREE.MeshBasicMaterial({ color: 0x808080 })
);
scene.add(marker);

function render() {
  INTERSECTION = undefined;

  if (controller1.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller1.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    let intersects = raycaster.intersectObjects([floor]);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
    }
  } else if (controller2.userData.isSelecting === true) {
    tempMatrix.identity().extractRotation(controller2.matrixWorld);

    raycaster.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
    raycaster.ray.direction.set(0, 0, -1).applyMatrix4(tempMatrix);

    let intersects = raycaster.intersectObjects([floor]);

    if (intersects.length > 0) {
      INTERSECTION = intersects[0].point;
    }
  }

  if (INTERSECTION) marker.position.copy(INTERSECTION);

  marker.visible = INTERSECTION !== undefined;

  renderer.render(scene, camera);
}

function animate() {
  renderer.setAnimationLoop(render);
}

animate();

document.addEventListener("keydown", function (event) {
  if (event.code === "ArrowUp" || event.code === "KeyW") {
    moveForward = true;
  }
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    moveBackward = true;
  }
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    moveLeft = true;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    moveRight = true;
  }
});

document.addEventListener("keyup", function (event) {
  if (event.code === "ArrowUp" || event.code === "KeyW") {
    moveForward = false;
  }
  if (event.code === "ArrowDown" || event.code === "KeyS") {
    moveBackward = false;
  }
  if (event.code === "ArrowLeft" || event.code === "KeyA") {
    moveLeft = false;
  }
  if (event.code === "ArrowRight" || event.code === "KeyD") {
    moveRight = false;
  }
});
