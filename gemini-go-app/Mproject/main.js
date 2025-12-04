import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { Octree } from "three/addons/math/Octree.js";
import { Capsule } from "three/addons/math/Capsule.js";

//Audio with Howler.js
const sounds = {
  backgroundMusic: new Howl({
    src: ["./sfx/music.ogg"],
    loop: true,
    volume: 0.3,
    preload: true,
  }),

  projectsSFX: new Howl({
    src: ["./sfx/projects.ogg"],
    volume: 0.5,
    preload: true,
  }),

  pokemonSFX: new Howl({
    src: ["./sfx/pokemon.ogg"],
    volume: 0.5,
    preload: true,
  }),

  jumpSFX: new Howl({
    src: ["./sfx/jumpsfx.ogg"],
    volume: 1.0,
    preload: true,
  }),
};

let touchHappened = false;

let isMuted = false;

function playSound(soundId) {
  if (!isMuted && sounds[soundId]) {
    sounds[soundId].play();
  }
}

function stopSound(soundId) {
  if (sounds[soundId]) {
    sounds[soundId].stop();
  }
}

//three.js setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xaec972);
const canvas = document.getElementById("experience-canvas");
const sizes = {
  width: window.innerWidth,
  height: window.innerHeight,
};

// Physics stuff
const GRAVITY = 30;
const CAPSULE_RADIUS = 0.35;
const CAPSULE_HEIGHT = 1;
const JUMP_HEIGHT = 11;
const MOVE_SPEED = 7;

let character = {
  instance: null,
  isMoving: false,
  spawnPosition: new THREE.Vector3(),
};
let targetRotation = Math.PI / 2;

const colliderOctree = new Octree();
const playerCollider = new Capsule(
  new THREE.Vector3(0, CAPSULE_RADIUS, 0),
  new THREE.Vector3(0, CAPSULE_HEIGHT, 0),
  CAPSULE_RADIUS
);

let playerVelocity = new THREE.Vector3();
let playerOnFloor = false;

// Renderer Stuff
// See: https://threejs.org/docs/?q=render#api/en/constants/Renderer
const renderer = new THREE.WebGLRenderer({
  canvas: canvas,
  antialias: true,
});

renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.enabled = true;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.7;

// Some of our DOM elements, others are scattered in the file
let isModalOpen = false;
const modal = document.querySelector(".modal");
const modalbgOverlay = document.querySelector(".modal-bg-overlay");
const dialogueSpeaker = document.querySelector(".dialogue-speaker");
const projectDialogueText = document.querySelector(".project-dialogue");
const dialogueNextButton = document.querySelector(".dialogue-next-button");
const dialogueChoicesContainer = document.querySelector(".dialogue-choices");
const modalExitButton = document.querySelector(".modal-exit-button");
const themeToggleButton = document.querySelector(".theme-mode-toggle-button");
const firstIcon = document.querySelector(".first-icon");
const secondIcon = document.querySelector(".second-icon");

const audioToggleButton = document.querySelector(".audio-toggle-button");
const firstIconTwo = document.querySelector(".first-icon-two");
const secondIconTwo = document.querySelector(".second-icon-two");
const taskToggleButton = document.querySelector(".task-toggle-button");
const taskPanel = document.querySelector(".task-panel");
const taskList = document.querySelector(".task-list");

// Simple on-screen tip for interactions
const interactionTip = document.createElement("div");
interactionTip.textContent = "Press SPACE to interact";
interactionTip.style.position = "fixed";
interactionTip.style.left = "50%";
interactionTip.style.bottom = "40px";
interactionTip.style.transform = "translateX(-50%)";
interactionTip.style.padding = "8px 14px";
interactionTip.style.borderRadius = "6px";
interactionTip.style.fontFamily = "'Pixelify Sans', system-ui, sans-serif";
interactionTip.style.fontSize = "14px";
interactionTip.style.letterSpacing = "0.05em";
interactionTip.style.background = "rgba(0, 0, 0, 0.6)";
interactionTip.style.color = "#fff";
interactionTip.style.zIndex = "9999";
interactionTip.style.pointerEvents = "none";
interactionTip.style.display = "none";
document.body.appendChild(interactionTip);

// Modal stuff
let currentDialogueLines = [];
let currentDialogueIndex = 0;
let autoCloseTimeout = null;
let currentChoices = null;
let hasUnreadTasks = false;

const modalContent = {
  Project_1: {
    title: "🍜Recipe Finder👩🏻‍🍳",
    dialogue: [
      "Recipe Finder reporting for duty! I fetch meals from TheMealDB API and plate them on tidy React cards.",
      "Need inspiration? I’ll keep a warm batch ready whenever you’re hungry for UI.",
    ],
    choices: [
      {
        label: "That sounds delicious!",
        followup: [
          "Right? Clean UI and tasty data are my favorite combo.",
          "Take a stroll around the park and imagine the recipes coming to life.",
        ],
        completeTaskId: "explorePark",
        newTask: {
          id: "cookQuest",
          title: "Plan your dream recipe app",
          subtasks: [
            "Imagine a recipe you’d like to build into an app.",
            "Think about which data and UI components you would need.",
          ],
        },
      },
      {
        label: "I'm just browsing.",
        followup: [
          "No pressure! I’ll be here simmering in the background if you get curious.",
        ],
      },
    ],
  },
  Project_2: {
    title: "📋ToDo List✏️",
    dialogue: [
      "ToDo List at your service. Tailwind CSS keeps me tidy while React hooks juggle the tasks.",
      "Give me your chaos and I’ll stack it into clean little checkboxes.",
    ],
  },
  Project_3: {
    title: "🌞Weather App😎",
    dialogue: [
      "Weather App sliding in! I auto-detect your location and paint the forecast in a shiny Figma-inspired UI.",
      "Sun, clouds, or cozy rain—I keep the vibe check running.",
    ],
  },
  Chest: {
    title: "💁‍♀️ About Me",
    dialogue: [
      "Hi! I’m Bella’s treasure chest. Crack me open to read her origin story and creative hobbies.",
      "Drawing, clay sculpting, Pokémon binges—she’s got plenty to chat about.",
    ],
  },
  Picnic: {
    title: "🍷 Uggh yesss 🧺",
    dialogue: [
      "Picnic basket here—grape juice in a wine glass, sunshine, max aura points.",
      "Stretch out on the grass and vibe with me for a minute.",
    ],
  },
  Model: {
    title: "🧊 Model Workshop",
    dialogue: [
      "Welcome to the Model station! I keep Bella's meshes crisp and well-behaved.",
      "Sometimes I switch between low-poly wireframes and painterly surfaces just for fun.",
    ],
    choices: [
      {
        label: "Show me the wireframes",
        followup: [
          "Picture every vertex glowing neon blue—that's my nightly look.",
          "Maybe one day you'll unlock free-cam mode to inspect every face.",
        ],
      },
      {
        label: "Any texturing tips?",
        followup: [
          "Blend soft gradients with chunky highlights. It makes everything feel toy-like but polished.",
          "Try it on your next scene and bring me screenshots!",
        ],
      },
    ],
  },
};

const tasks = [
  {
    id: "explorePark",
    completed: false,
    isNew: false,
    title: "Explore the park",
    subtasks: [
      "Talk to the Recipe Finder sign",
      "Chat with the ToDo List sign",
      "Visit the Weather App board",
    ],
  },
  {
    id: "meetResidents",
    completed: false,
    isNew: false,
    title: "Meet the residents",
    subtasks: [
      "Wave at at least one Pokémon",
      "Open Bella's treasure chest",
      "Relax at the picnic spot",
    ],
  },
];

function showModal(id) {
  const content = modalContent[id];
  if (!content) return;

  dialogueSpeaker.textContent = content.title || id;
  currentDialogueLines =
    content.dialogue && content.dialogue.length > 0
      ? content.dialogue
      : ["No dialogue found."];
  currentDialogueIndex = 0;
  currentChoices = content.choices || null;
  updateDialogueUI();

  modal.classList.remove("hidden");
  modalbgOverlay.classList.remove("hidden");
  interactionTip.style.display = "none";
  isModalOpen = true;
}

function updateDialogueUI() {
  projectDialogueText.textContent =
    currentDialogueLines[currentDialogueIndex] || "";

  // Clear any existing choices when updating a dialogue line
  if (dialogueChoicesContainer) {
    dialogueChoicesContainer.innerHTML = "";
    dialogueChoicesContainer.classList.add("hidden");
  }

  const hasMore =
    currentDialogueIndex < currentDialogueLines.length - 1 &&
    currentDialogueLines.length > 1;
  dialogueNextButton.classList.toggle("hidden", !hasMore);

  clearAutoCloseTimer();
  if (!hasMore) {
    // Last line: either show choices (if any) or auto-close after delay
    if (
      currentChoices &&
      currentChoices.length > 0 &&
      dialogueChoicesContainer
    ) {
      currentChoices.forEach((choice, index) => {
        const btn = document.createElement("button");
        btn.className = "dialogue-choice-button";
        btn.textContent = choice.label;
        btn.addEventListener("click", () => handleDialogueChoice(index));
        dialogueChoicesContainer.appendChild(btn);
      });
      dialogueChoicesContainer.classList.remove("hidden");
    } else {
      startAutoCloseTimer();
    }
  }
}

function goToNextDialogueLine() {
  if (
    currentDialogueIndex < currentDialogueLines.length - 1 &&
    currentDialogueLines.length > 1
  ) {
    currentDialogueIndex += 1;
    updateDialogueUI();
  }
}

function startAutoCloseTimer() {
  clearAutoCloseTimer();
  autoCloseTimeout = setTimeout(() => {
    hideModal();
  }, 3000);
}

function clearAutoCloseTimer() {
  if (autoCloseTimeout) {
    clearTimeout(autoCloseTimeout);
    autoCloseTimeout = null;
  }
}

function handleDialogueChoice(index) {
  if (!currentChoices || !currentChoices[index]) return;
  const choice = currentChoices[index];

  // Mark task complete if requested
  if (choice.completeTaskId) {
    markTaskCompleted(choice.completeTaskId);
  }

  // Add a new task if this choice defines one
  if (choice.newTask) {
    addOrUpdateTask(choice.newTask, { markNew: true });
  }

  // If there's follow-up dialogue, show it, otherwise close immediately
  if (choice.followup && choice.followup.length > 0) {
    currentDialogueLines = choice.followup;
    currentDialogueIndex = 0;
    currentChoices = null;
    updateDialogueUI();
  } else {
    hideModal();
  }
}

function markTaskCompleted(taskId) {
  let changed = false;
  tasks.forEach((task) => {
    if (task.id === taskId && !task.completed) {
      task.completed = true;
      changed = true;
    }
  });

  if (changed && taskPanel && !taskPanel.classList.contains("hidden")) {
    renderTasks();
  }
}

function addOrUpdateTask(taskConfig, { markNew } = { markNew: false }) {
  if (!taskConfig || !taskConfig.id) return;
  let existing = tasks.find((t) => t.id === taskConfig.id);
  if (existing) {
    existing.title = taskConfig.title || existing.title;
    existing.subtasks = taskConfig.subtasks || existing.subtasks;
    if (markNew) existing.isNew = true;
  } else {
    tasks.push({
      id: taskConfig.id,
      title: taskConfig.title || taskConfig.id,
      subtasks: taskConfig.subtasks || [],
      completed: false,
      isNew: !!markNew,
    });
  }

  if (markNew) {
    hasUnreadTasks = true;
    updateTaskToggleBadge();
  }

  if (taskPanel && !taskPanel.classList.contains("hidden")) {
    renderTasks();
  }
}

function updateTaskToggleBadge() {
  if (!taskToggleButton) return;
  if (hasUnreadTasks) {
    taskToggleButton.classList.add("has-unread");
  } else {
    taskToggleButton.classList.remove("has-unread");
  }
}

function renderTasks() {
  if (!taskList) return;
  taskList.innerHTML = "";
  tasks.forEach((task) => {
    const li = document.createElement("li");
    li.className = "task-item";
    if (task.completed) {
      li.classList.add("completed");
    }

    const title = document.createElement("div");
    title.className = "task-item-title";
    title.textContent = `• ${task.title}`;

    if (task.isNew) {
      const badge = document.createElement("span");
      badge.className = "task-new-badge";
      badge.textContent = "NEW";
      title.appendChild(badge);
    }
    li.appendChild(title);

    if (task.subtasks && task.subtasks.length > 0) {
      const subUl = document.createElement("ul");
      subUl.className = "subtask-list";
      task.subtasks.forEach((st) => {
        const subLi = document.createElement("li");
        subLi.className = "subtask-item";
        subLi.textContent = st;
        subUl.appendChild(subLi);
      });
      li.appendChild(subUl);
    }

    taskList.appendChild(li);
  });
}

function toggleTaskPanel() {
  if (!taskPanel) return;
  const isHidden = taskPanel.classList.contains("hidden");
  if (isHidden) {
    renderTasks();
    taskPanel.classList.remove("hidden");
    // Mark all tasks as read (clear NEW highlight and badge)
    tasks.forEach((t) => {
      if (t.isNew) t.isNew = false;
    });
    hasUnreadTasks = false;
    updateTaskToggleBadge();
  } else {
    taskPanel.classList.add("hidden");
  }
}

function hideModal() {
  isModalOpen = false;
  clearAutoCloseTimer();
  modal.classList.add("hidden");
  modalbgOverlay.classList.add("hidden");
  if (!isMuted) {
    playSound("projectsSFX");
  }
}

// Our Intersecting objects
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

let intersectObject = "";
let proximityObject = "";
let lastProximityObject = "";
const intersectObjects = [];

// Separate lists so we can prioritize modal objects for spacebar interaction
const modalObjectNames = [
  "Project_1",
  "Project_2",
  "Project_3",
  "Picnic",
  "Chest",
  "Model",
];
const pokemonObjectNames = [
  "Bulbasaur",
  "Chicken",
  "Pikachu",
  "Charmander",
  "Squirtle",
  "Snorlax",
];

const intersectObjectsNames = [...modalObjectNames, ...pokemonObjectNames];

// Loading screen and loading manager
// See: https://threejs.org/docs/#api/en/loaders/managers/LoadingManager
const loadingScreen = document.getElementById("loadingScreen");
const loadingText = document.querySelector(".loading-text");
const enterButton = document.querySelector(".enter-button");
const instructions = document.querySelector(".instructions");

const manager = new THREE.LoadingManager();

manager.onLoad = function () {
  console.log("--- MANAGER ONLOAD FIRED ---"); // <-- ADD THIS LINE
  enterButton.style.display = "block";

  const t1 = gsap.timeline();

  // t1.to(loadingText, {
  //   opacity: 0,
  //   duration: 0.5,
  // });

  // t1.to(enterButton, {
  //   opacity: 1,
  //   duration: 0.5,
  // });
  // 1. Fade out the "Loading..." text

  t1.to(loadingText, {
    opacity: 0,
    duration: 0.5, // Make the transition visible
  });

  // 2. Fade in the "Enter Park!" button and instructions
  t1.to(
    enterButton,
    {
      opacity: 1, // Show the Enter button
      duration: 0.5,
    },
    "<"
  );
  t1.to(
    instructions,
    {
      opacity: 1, // Show the instructions
      duration: 0.5,
    },
    "<"
  );
};

enterButton.addEventListener("click", () => {
  console.log("🖱️ Button Clicked. Starting Experience.");

  // 1. Resume Audio Context (Fixes "Music Disappear" on Chrome)
  if (THREE.AudioContext && THREE.AudioContext.getContext()) {
    THREE.AudioContext.getContext().resume();
  }

  // 2. Play Sounds
  if (!isMuted) {
    // Force volume reset just in case
    sounds.backgroundMusic.volume(0.3);
    sounds.backgroundMusic.play();
    playSound("projectsSFX");
  }

  gsap.to(loadingScreen, {
    opacity: 0,
    duration: 0.3, // Fade out over 0.3 seconds
    onComplete: () => {
      // ONLY remove the element after the fade is complete
      // loadingScreen.remove();
      loadingScreen.style.display = "none";
    },
  });

  // Also fade out the instructions immediately upon click
  gsap.to(instructions, {
    opacity: 0,
    duration: 0.3,
  });

  if (!isMuted) {
    playSound("projectsSFX");
    playSound("backgroundMusic");
  }
});

//Audio

// GLTF Loader
// See: https://threejs.org/docs/?q=glt#examples/en/loaders/GLTFLoader
const loader = new GLTFLoader(manager);

loader.load(
  "./Portfolio.glb",
  function (glb) {
    glb.scene.traverse((child) => {
      if (intersectObjectsNames.includes(child.name)) {
        intersectObjects.push(child);
      }
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }

      if (child.name === "Character") {
        character.spawnPosition.copy(child.position);
        character.instance = child;
        playerCollider.start
          .copy(child.position)
          .add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));
        playerCollider.end
          .copy(child.position)
          .add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));
      }
      if (child.name === "Ground_Collider") {
        colliderOctree.fromGraphNode(child);
        child.visible = false;
      }
    });
    scene.add(glb.scene);
  },
  undefined,
  function (error) {
    console.error(error);
  }
);

// Lighting and Enviornment Stuff
// See: https://threejs.org/docs/?q=light#api/en/lights/DirectionalLight
// See: https://threejs.org/docs/?q=light#api/en/lights/AmbientLight
const sun = new THREE.DirectionalLight(0xffffff);
sun.castShadow = true;
sun.position.set(280, 200, -80);
sun.target.position.set(100, 0, -10);
sun.shadow.mapSize.width = 4096;
sun.shadow.mapSize.height = 4096;
sun.shadow.camera.left = -150;
sun.shadow.camera.right = 300;
sun.shadow.camera.top = 150;
sun.shadow.camera.bottom = -100;
sun.shadow.normalBias = 0.2;
scene.add(sun.target);
scene.add(sun);

// const shadowCameraHelper = new THREE.CameraHelper(sun.shadow.camera);
// scene.add(shadowCameraHelper);

// const sunHelper = new THREE.CameraHelper(sun);
// scene.add(sunHelper);

const light = new THREE.AmbientLight(0x404040, 2.7);
scene.add(light);

// Camera Stuff
// See: https://threejs.org/docs/?q=orth#api/en/cameras/OrthographicCamera
const aspect = sizes.width / sizes.height;
const camera = new THREE.OrthographicCamera(
  -aspect * 50,
  aspect * 50,
  50,
  -50,
  1,
  1000
);

camera.position.x = -13;
camera.position.y = 39;
camera.position.z = -67;

const cameraOffset = new THREE.Vector3(-13, 39, -67);

camera.zoom = 2.2;
camera.updateProjectionMatrix();

const controls = new OrbitControls(camera, canvas);
controls.update();

// Handle when window resizes
function onResize() {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  const aspect = sizes.width / sizes.height;
  camera.left = -aspect * 50;
  camera.right = aspect * 50;
  camera.top = 50;
  camera.bottom = -50;
  camera.updateProjectionMatrix();

  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
}

// Interact with Objects and Raycaster
// See: https://threejs.org/docs/?q=raycas#api/en/core/Raycaster
let isCharacterReady = true;

function jumpCharacter(meshID) {
  if (!isCharacterReady) return;

  const mesh = scene.getObjectByName(meshID);
  const jumpHeight = 2;
  const jumpDuration = 0.5;
  const isSnorlax = meshID === "Snorlax";

  const currentScale = {
    x: mesh.scale.x,
    y: mesh.scale.y,
    z: mesh.scale.z,
  };

  const t1 = gsap.timeline();

  t1.to(mesh.scale, {
    x: isSnorlax ? currentScale.x * 1.2 : 1.2,
    y: isSnorlax ? currentScale.y * 0.8 : 0.8,
    z: isSnorlax ? currentScale.z * 1.2 : 1.2,
    duration: jumpDuration * 0.2,
    ease: "power2.out",
  });

  t1.to(mesh.scale, {
    x: isSnorlax ? currentScale.x * 0.8 : 0.8,
    y: isSnorlax ? currentScale.y * 1.3 : 1.3,
    z: isSnorlax ? currentScale.z * 0.8 : 0.8,
    duration: jumpDuration * 0.3,
    ease: "power2.out",
  });

  t1.to(
    mesh.position,
    {
      y: mesh.position.y + jumpHeight,
      duration: jumpDuration * 0.5,
      ease: "power2.out",
    },
    "<"
  );

  t1.to(mesh.scale, {
    x: isSnorlax ? currentScale.x * 1.2 : 1,
    y: isSnorlax ? currentScale.y * 1.2 : 1,
    z: isSnorlax ? currentScale.z * 1.2 : 1,
    duration: jumpDuration * 0.3,
    ease: "power1.inOut",
  });

  t1.to(
    mesh.position,
    {
      y: mesh.position.y,
      duration: jumpDuration * 0.5,
      ease: "bounce.out",
      onComplete: () => {
        isCharacterReady = true;
      },
    },
    ">"
  );

  if (!isSnorlax) {
    t1.to(mesh.scale, {
      x: 1,
      y: 1,
      z: 1,
      duration: jumpDuration * 0.2,
      ease: "elastic.out(1, 0.3)",
    });
  }
}

function onClick() {
  if (touchHappened) return;
  handleInteraction();
}

function handleInteraction() {
  raycaster.setFromCamera(pointer, camera);
  const intersects = raycaster.intersectObjects(intersectObjects);

  if (intersects.length > 0) {
    intersectObject = getInteractionName(intersects[0].object);
  } else {
    intersectObject = "";
  }

  triggerObjectInteraction(intersectObject);
}

function triggerObjectInteraction(objectName) {
  if (!modal.classList.contains("hidden")) {
    return;
  }

  if (objectName !== "") {
    if (pokemonObjectNames.includes(objectName)) {
      if (isCharacterReady) {
        if (!isMuted) {
          playSound("pokemonSFX");
        }
        jumpCharacter(objectName);
        isCharacterReady = false;
      }
    } else {
      const modalId = getModalIdFromObjectName(objectName);
      if (modalId) {
        console.log("[CLICK] triggerObjectInteraction modal for:", modalId);
        showModal(modalId);
        if (!isMuted) {
          playSound("projectsSFX");
        }
      } else {
        console.warn("[CLICK] No modalContent found for:", objectName);
      }
    }
  }
}

// Dedicated modal handler for spacebar interactions
function showModalSpacebar(objectName) {
  const modalId = getModalIdFromObjectName(objectName);
  if (!modalId) {
    console.warn("[SPACE] No modalContent found for:", objectName);
    return;
  }
  console.log("[SPACE] showModalSpacebar opening modal for:", modalId);
  showModal(modalId);
  if (!isMuted) {
    playSound("projectsSFX");
  }
}

function handleProximityInteraction() {
  if (!character.instance) {
    console.log("[SPACE] handleProximityInteraction: no character instance");
    return;
  }
  if (!proximityObject) {
    console.log("[SPACE] handleProximityInteraction: no proximityObject");
    return;
  }

  console.log(
    "[SPACE] handleProximityInteraction proximityObject:",
    proximityObject
  );

  // For spacebar, treat Pokémon and modal objects separately
  if (pokemonObjectNames.includes(proximityObject)) {
    if (isCharacterReady) {
      if (!isMuted) {
        playSound("pokemonSFX");
      }
      console.log(
        "[SPACE] handleProximityInteraction jumping Pokémon:",
        proximityObject
      );
      jumpCharacter(proximityObject);
      isCharacterReady = false;
    }
  } else {
    showModalSpacebar(proximityObject);
  }
}

function getModalIdFromObjectName(objectName) {
  if (!objectName) return "";
  if (modalContent[objectName]) return objectName;
  const keys = Object.keys(modalContent);
  return keys.find((key) => objectName.includes(key)) || "";
}

function getInteractionName(object3D) {
  if (!object3D) return "";
  if (intersectObjectsNames.includes(object3D.name)) {
    return object3D.name;
  }
  return getInteractionName(object3D.parent);
}

function onMouseMove(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;
  touchHappened = false;
}

function onTouchEnd(event) {
  pointer.x = (event.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(event.clientY / window.innerHeight) * 2 + 1;

  touchHappened = true;
  handleInteraction();
}

// Movement and Gameplay functions
function respawnCharacter() {
  character.instance.position.copy(character.spawnPosition);

  playerCollider.start
    .copy(character.spawnPosition)
    .add(new THREE.Vector3(0, CAPSULE_RADIUS, 0));
  playerCollider.end
    .copy(character.spawnPosition)
    .add(new THREE.Vector3(0, CAPSULE_HEIGHT, 0));

  playerVelocity.set(0, 0, 0);
  character.isMoving = false;
}

function playerCollisions() {
  const result = colliderOctree.capsuleIntersect(playerCollider);
  playerOnFloor = false;

  if (result) {
    playerOnFloor = result.normal.y > 0;
    playerCollider.translate(result.normal.multiplyScalar(result.depth));

    if (playerOnFloor) {
      character.isMoving = false;
      playerVelocity.x = 0;
      playerVelocity.z = 0;
    }
  }
}

function updatePlayer() {
  if (!character.instance) return;

  if (character.instance.position.y < -20) {
    respawnCharacter();
    return;
  }

  if (!playerOnFloor) {
    playerVelocity.y -= GRAVITY * 0.035;
  }

  playerCollider.translate(playerVelocity.clone().multiplyScalar(0.035));

  playerCollisions();

  character.instance.position.copy(playerCollider.start);
  character.instance.position.y -= CAPSULE_RADIUS;

  let rotationDiff =
    ((((targetRotation - character.instance.rotation.y) % (2 * Math.PI)) +
      3 * Math.PI) %
      (2 * Math.PI)) -
    Math.PI;
  let finalRotation = character.instance.rotation.y + rotationDiff;

  character.instance.rotation.y = THREE.MathUtils.lerp(
    character.instance.rotation.y,
    finalRotation,
    0.4
  );
}

function onKeyDown(event) {
  if (event.code.toLowerCase() === "keyr") {
    respawnCharacter();
    return;
  }

  switch (event.code.toLowerCase()) {
    case "keyw":
    case "arrowup":
      pressedButtons.up = true;
      break;
    case "keys":
    case "arrowdown":
      pressedButtons.down = true;
      break;
    case "keya":
    case "arrowleft":
      pressedButtons.left = true;
      break;
    case "keyd":
    case "arrowright":
      pressedButtons.right = true;
      break;
    case "space":
      handleProximityInteraction();
      break;
  }
}

function onKeyUp(event) {
  switch (event.code.toLowerCase()) {
    case "keyw":
    case "arrowup":
      pressedButtons.up = false;
      break;
    case "keys":
    case "arrowdown":
      pressedButtons.down = false;
      break;
    case "keya":
    case "arrowleft":
      pressedButtons.left = false;
      break;
    case "keyd":
    case "arrowright":
      pressedButtons.right = false;
      break;
  }
}

// Toggle Theme Function
function toggleTheme() {
  if (!isMuted) {
    playSound("projectsSFX");
  }
  const isDarkTheme = document.body.classList.contains("dark-theme");
  document.body.classList.toggle("dark-theme");
  document.body.classList.toggle("light-theme");

  if (firstIcon.style.display === "none") {
    firstIcon.style.display = "block";
    secondIcon.style.display = "none";
  } else {
    firstIcon.style.display = "none";
    secondIcon.style.display = "block";
  }

  gsap.to(light.color, {
    r: isDarkTheme ? 1.0 : 0.25,
    g: isDarkTheme ? 1.0 : 0.31,
    b: isDarkTheme ? 1.0 : 0.78,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(light, {
    intensity: isDarkTheme ? 0.8 : 0.9,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(sun, {
    intensity: isDarkTheme ? 1 : 0.8,
    duration: 1,
    ease: "power2.inOut",
  });

  gsap.to(sun.color, {
    r: isDarkTheme ? 1.0 : 0.25,
    g: isDarkTheme ? 1.0 : 0.41,
    b: isDarkTheme ? 1.0 : 0.88,
    duration: 1,
    ease: "power2.inOut",
  });
}

// Toggle Audio Function
function toggleAudio() {
  if (!isMuted) {
    playSound("projectsSFX");
  }
  if (firstIconTwo.style.display === "none") {
    firstIconTwo.style.display = "block";
    secondIconTwo.style.display = "none";
    isMuted = false;
    sounds.backgroundMusic.play();
  } else {
    firstIconTwo.style.display = "none";
    secondIconTwo.style.display = "block";
    isMuted = true;
    sounds.backgroundMusic.pause();
  }
}

// Mobile controls
const mobileControls = {
  up: document.querySelector(".mobile-control.up-arrow"),
  left: document.querySelector(".mobile-control.left-arrow"),
  right: document.querySelector(".mobile-control.right-arrow"),
  down: document.querySelector(".mobile-control.down-arrow"),
};

const pressedButtons = {
  up: false,
  left: false,
  right: false,
  down: false,
};

function handleJumpAnimation() {
  if (!character.instance || !character.isMoving) return;

  const jumpDuration = 0.5;
  const jumpHeight = 2;

  const t1 = gsap.timeline();

  t1.to(character.instance.scale, {
    x: 1.08,
    y: 0.9,
    z: 1.08,
    duration: jumpDuration * 0.2,
    ease: "power2.out",
  });

  t1.to(character.instance.scale, {
    x: 0.92,
    y: 1.1,
    z: 0.92,
    duration: jumpDuration * 0.3,
    ease: "power2.out",
  });

  t1.to(character.instance.scale, {
    x: 1,
    y: 1,
    z: 1,
    duration: jumpDuration * 0.3,
    ease: "power1.inOut",
  });

  t1.to(character.instance.scale, {
    x: 1,
    y: 1,
    z: 1,
    duration: jumpDuration * 0.2,
  });
}

function handleContinuousMovement() {
  if (!character.instance) return;

  if (
    Object.values(pressedButtons).some((pressed) => pressed) &&
    !character.isMoving
  ) {
    if (!isMuted) {
      playSound("jumpSFX");
    }
    if (pressedButtons.up) {
      playerVelocity.z += MOVE_SPEED;
      targetRotation = 0;
    }
    if (pressedButtons.down) {
      playerVelocity.z -= MOVE_SPEED;
      targetRotation = Math.PI;
    }
    if (pressedButtons.left) {
      playerVelocity.x += MOVE_SPEED;
      targetRotation = Math.PI / 2;
    }
    if (pressedButtons.right) {
      playerVelocity.x -= MOVE_SPEED;
      targetRotation = -Math.PI / 2;
    }

    playerVelocity.y = JUMP_HEIGHT;
    character.isMoving = true;
    handleJumpAnimation();
  }
}

Object.entries(mobileControls).forEach(([direction, element]) => {
  element.addEventListener("touchstart", (e) => {
    e.preventDefault();
    pressedButtons[direction] = true;
  });

  element.addEventListener("touchend", (e) => {
    e.preventDefault();
    pressedButtons[direction] = false;
  });

  element.addEventListener("mousedown", (e) => {
    e.preventDefault();
    pressedButtons[direction] = true;
  });

  element.addEventListener("mouseup", (e) => {
    e.preventDefault();
    pressedButtons[direction] = false;
  });

  element.addEventListener("mouseleave", (e) => {
    pressedButtons[direction] = false;
  });

  element.addEventListener("touchcancel", (e) => {
    pressedButtons[direction] = false;
  });
});

window.addEventListener("blur", () => {
  Object.keys(pressedButtons).forEach((key) => {
    pressedButtons[key] = false;
  });
});

// Adding Event Listeners (tbh could make some of these just themselves rather than seperating them, oh well)
dialogueNextButton.addEventListener("click", goToNextDialogueLine);
modalExitButton.addEventListener("click", hideModal);
modalbgOverlay.addEventListener("click", hideModal);
themeToggleButton.addEventListener("click", toggleTheme);
audioToggleButton.addEventListener("click", toggleAudio);
taskToggleButton.addEventListener("click", toggleTaskPanel);
window.addEventListener("resize", onResize);
window.addEventListener("click", onClick, { passive: false });
window.addEventListener("mousemove", onMouseMove);
window.addEventListener("touchend", onTouchEnd, { passive: false });
window.addEventListener("keydown", onKeyDown);
window.addEventListener("keyup", onKeyUp);

// Like our movie strip!!! Calls on each frame.
function animate() {
  updatePlayer();
  handleContinuousMovement();

  if (character.instance) {
    const targetCameraPosition = new THREE.Vector3(
      character.instance.position.x + cameraOffset.x - 20,
      cameraOffset.y,
      character.instance.position.z + cameraOffset.z + 30
    );
    camera.position.copy(targetCameraPosition);
    camera.lookAt(
      character.instance.position.x + 10,
      camera.position.y - 39,
      character.instance.position.z + 10
    );
  }

  // Update closest interactable object near the character (by distance)
  proximityObject = "";
  if (character.instance && intersectObjects.length > 0) {
    let closestName = "";
    let closestDist = Infinity;
    const charPos = character.instance.position.clone();

    intersectObjects.forEach((obj) => {
      const worldPos = new THREE.Vector3();
      obj.getWorldPosition(worldPos);
      const dist = worldPos.distanceTo(charPos);
      const name = getInteractionName(obj);
      if (!name) return;
      // Large interaction distance threshold to make it easy to trigger
      if (dist < 15 && dist < closestDist) {
        closestDist = dist;
        closestName = name;
      }
    });

    proximityObject = closestName;
  }

  // Toggle interaction tip visibility based on proximity, unless modal is open
  if (proximityObject && !isModalOpen) {
    if (proximityObject !== lastProximityObject) {
      console.log("[PROXIMITY] nearest object is now:", proximityObject);
      lastProximityObject = proximityObject;
    }
    interactionTip.style.display = "block";
    interactionTip.textContent = `Press SPACE to interact with ${proximityObject}`;
  } else {
    if (lastProximityObject) {
      console.log(
        "[PROXIMITY] no nearby object, clearing from:",
        lastProximityObject
      );
      lastProximityObject = "";
    }
    interactionTip.style.display = "none";
  }

  raycaster.setFromCamera(pointer, camera);

  const intersects = raycaster.intersectObjects(intersectObjects);

  if (intersects.length > 0) {
    document.body.style.cursor = "pointer";
  } else {
    document.body.style.cursor = "default";
    intersectObject = "";
  }

  for (let i = 0; i < intersects.length; i++) {
    intersectObject = intersects[0].object.parent.name;
  }

  renderer.render(scene, camera);
}

renderer.setAnimationLoop(animate);
