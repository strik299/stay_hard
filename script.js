// Estado de la aplicación
let currentMode = "pomodoro";
let timeLeft = 25 * 60; // en segundos
let timerInterval = null;
let isRunning = false;
let sessionCount = 1;
let isEditingTime = false;
let editingValue = "";
let timerEndTime = null; // Timestamp cuando debería terminar el timer
let audioContext = null; // Reutiliza el contexto de audio para el sonido de finalización

// Configuración de tiempos (en minutos)
let settings = {
  pomodoro: 25,
  shortBreak: 5,
  longBreak: 15,
};

// Tareas
let tasks = [];
let taskIdCounter = 1;

// Proyectos
let projects = [];
let projectIdCounter = 1;
let currentProjectId = null; // null = todas las tareas
let activeTaskProjectId = null; // Proyecto de la tarea activa durante el timer
let activeTaskId = null; // Tarea activa durante el pomodoro
let lastTickTime = null; // Para rastrear el tiempo transcurrido

// Elementos del DOM
const timeDisplay = document.getElementById("timeDisplay");
const timeHint = document.getElementById("timeHint");
const startBtn = document.getElementById("startBtn");
const sessionCounter = document.getElementById("sessionCounter");
const modeTabs = document.querySelectorAll(".mode-tab");

// Vistas
const projectsView = document.getElementById("projectsView");
const projectDetailView = document.getElementById("projectDetailView");
const projectsGrid = document.getElementById("projectsGrid");
const backBtn = document.getElementById("backBtn");
const resetTimeBtn = document.getElementById("resetTimeBtn");

// Modales
const taskModal = document.getElementById("taskModal");
const addTaskBtn = document.getElementById("addTaskBtn");
const closeTaskBtn = document.getElementById("closeTaskBtn");
const saveTaskBtn = document.getElementById("saveTaskBtn");

const projectModal = document.getElementById("projectModal");
const addProjectBtn = document.getElementById("addProjectBtn");
const closeProjectBtn = document.getElementById("closeProjectBtn");
const saveProjectBtn = document.getElementById("saveProjectBtn");

// Lista de tareas y proyectos
const tasksList = document.getElementById("tasksList");
const projectsList = document.getElementById("projectsList");
const currentProjectDisplay = document.getElementById("currentProject");

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  loadSettings();
  loadProjects();
  loadTasks();
  updateDisplay();
  renderProjectsGrid();
  updateProjectSelect();

  // Event listener para volver a la vista de proyectos
  backBtn.addEventListener("click", showProjectsView);

  // Event listener para reiniciar tiempo del proyecto
  resetTimeBtn.addEventListener("click", resetProjectTime);

  // Validación del input de pomodoros para que solo acepte números
  const pomodorosInput = document.getElementById("taskPomodoros");
  pomodorosInput.addEventListener("input", (e) => {
    // Permitir solo números
    e.target.value = e.target.value.replace(/[^0-9]/g, "");
    // Limitar a 2 dígitos
    if (e.target.value.length > 2) {
      e.target.value = e.target.value.slice(0, 2);
    }
  });
});

// Funciones del Timer
function updateDisplay() {
  if (isEditingTime) return; // No actualizar si estamos editando

  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  // Mostrar formato según si hay horas o no
  if (hours > 0) {
    timeDisplay.textContent = `${String(hours).padStart(2, "0")}:${String(
      minutes
    ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  } else {
    timeDisplay.textContent = `${String(minutes).padStart(2, "0")}:${String(
      seconds
    ).padStart(2, "0")}`;
  }

  sessionCounter.textContent = `#${sessionCount}`;

  // Mostrar/ocultar hint de edición
  if (!isRunning) {
    timeDisplay.classList.add("editable");
    timeHint.style.display = "block";
  } else {
    timeDisplay.classList.remove("editable");
    timeHint.style.display = "none";
  }
}

function getAudioContext() {
  if (!audioContext) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioContext = new AudioContextClass();
    }
  }
  return audioContext;
}

function playTimerSound() {
  const ctx = getAudioContext();
  if (!ctx) {
    return;
  }

  if (ctx.state === "suspended") {
    ctx.resume();
  }

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = "triangle";
  oscillator.frequency.setValueAtTime(880, ctx.currentTime);

  gainNode.gain.setValueAtTime(0.0001, ctx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.2, ctx.currentTime + 0.01);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 1);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start();
  oscillator.stop(ctx.currentTime + 1);
}

function startTimer() {
  if (!isRunning) {
    isRunning = true;
    startBtn.textContent = "PAUSAR";
    startBtn.classList.add("pause");
    startBtn.classList.add("active");

    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") {
      ctx.resume();
    }

    // Establecer el tiempo del último tick y determinar el proyecto activo
    lastTickTime = Date.now();
    // Calcular cuándo debería terminar el timer (timestamp futuro)
    timerEndTime = Date.now() + timeLeft * 1000;

    if (currentMode === "pomodoro") {
      activeTaskProjectId = null;
      activeTaskId = null;

      if (currentProjectId) {
        const projectTask = tasks.find(
          (task) => task.projectId === currentProjectId && !task.completed
        );

        if (projectTask) {
          activeTaskProjectId = projectTask.projectId;
          activeTaskId = projectTask.id;
        } else {
          activeTaskProjectId = currentProjectId;
        }
      } else {
        const currentTask = tasks.find((task) => !task.completed);
        if (currentTask) {
          activeTaskProjectId = currentTask.projectId;
          activeTaskId = currentTask.id;
        }
      }
    } else {
      activeTaskProjectId = null;
      activeTaskId = null;
    }

    timerInterval = setInterval(() => {
      // Calcular tiempo restante basado en el timestamp, no en decrementar
      const now = Date.now();
      const remainingMs = timerEndTime - now;
      const newTimeLeft = Math.max(0, Math.ceil(remainingMs / 1000));

      // Calcular tiempo transcurrido para el proyecto
      const elapsedSeconds = Math.floor((now - lastTickTime) / 1000);

      if (
        elapsedSeconds >= 1 &&
        currentMode === "pomodoro" &&
        activeTaskProjectId
      ) {
        addTimeToProject(activeTaskProjectId, elapsedSeconds);
        lastTickTime = now;
      } else if (elapsedSeconds >= 1) {
        lastTickTime = now;
      }

      timeLeft = newTimeLeft;
      updateDisplay();

      if (timeLeft <= 0) {
        const taskIdForProgress = activeTaskId;
        stopTimer();
        playNotification();

        if (currentMode === "pomodoro") {
          sessionCount++;
          incrementCurrentTaskProgress(taskIdForProgress);
        }

        // Auto-cambiar al siguiente modo
        if (currentMode === "pomodoro") {
          if (sessionCount % 4 === 0) {
            switchMode("longBreak");
          } else {
            switchMode("shortBreak");
          }
        } else {
          switchMode("pomodoro");
        }
      }
    }, 100); // Actualizar cada 100ms para mayor precisión visual
  } else {
    pauseTimer();
  }
}

function pauseTimer() {
  isRunning = false;
  clearInterval(timerInterval);

  // Acumular el tiempo restante si hay un proyecto activo
  if (currentMode === "pomodoro" && activeTaskProjectId && lastTickTime) {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastTickTime) / 1000);
    if (elapsedSeconds > 0) {
      addTimeToProject(activeTaskProjectId, elapsedSeconds);
    }
  }

  lastTickTime = null;
  activeTaskProjectId = null;
  timerEndTime = null;

  startBtn.textContent = "INICIAR";
  startBtn.classList.remove("pause");
  startBtn.classList.remove("active");
}

function stopTimer() {
  isRunning = false;
  clearInterval(timerInterval);

  // Acumular tiempo final si hay un proyecto activo
  if (currentMode === "pomodoro" && activeTaskProjectId && lastTickTime) {
    const now = Date.now();
    const elapsedSeconds = Math.floor((now - lastTickTime) / 1000);
    if (elapsedSeconds > 0) {
      addTimeToProject(activeTaskProjectId, elapsedSeconds);
    }
  }

  lastTickTime = null;
  activeTaskProjectId = null;
  timerEndTime = null;

  startBtn.textContent = "INICIAR";
  startBtn.classList.remove("pause");
  startBtn.classList.remove("active");
}

function switchMode(mode) {
  currentMode = mode;
  stopTimer();

  // Actualizar tabs activos
  modeTabs.forEach((tab) => {
    tab.classList.remove("active");
    if (tab.dataset.mode === mode) {
      tab.classList.add("active");
    }
  });

  // Actualizar tiempo
  timeLeft = settings[mode] * 60;
  updateDisplay();
}

function playNotification() {
  playTimerSound();

  // Sonido de notificación (opcional)
  if ("Notification" in window && Notification.permission === "granted") {
    new Notification("¡Tiempo terminado!", {
      body:
        currentMode === "pomodoro"
          ? "¡Toma un descanso!"
          : "¡Hora de trabajar!",
      icon: "⏱️",
    });
  }
}

// Event Listeners del Timer
startBtn.addEventListener("click", startTimer);

// Hacer el tiempo editable al hacer clic
timeDisplay.addEventListener("click", () => {
  if (!isRunning && !isEditingTime) {
    startEditingTime();
  }
});

// Escuchar teclas para editar el tiempo
document.addEventListener("keydown", (e) => {
  if (!isRunning && isEditingTime) {
    handleTimeEdit(e);
  }
});

// Detectar cuando se pierde el foco para salir del modo edición
document.addEventListener("click", (e) => {
  if (isEditingTime && !timeDisplay.contains(e.target)) {
    finishEditingTime();
  }
});

modeTabs.forEach((tab) => {
  tab.addEventListener("click", () => {
    if (isEditingTime) {
      finishEditingTime();
    }
    switchMode(tab.dataset.mode);
  });
});

// Función para iniciar la edición del tiempo
function startEditingTime() {
  isEditingTime = true;
  editingValue = ""; // Array de 6 dígitos: HH:MM:SS

  // Mostrar el tiempo actual en formato editable
  const hours = Math.floor(timeLeft / 3600);
  const minutes = Math.floor((timeLeft % 3600) / 60);
  const seconds = timeLeft % 60;

  timeDisplay.classList.add("editing");
  timeDisplay.textContent = `${String(hours).padStart(2, "0")}:${String(
    minutes
  ).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  timeHint.textContent = "Escribe el tiempo (HH:MM:SS) y presiona Enter";
  timeHint.classList.add("show");
}

// Función para manejar la edición del tiempo
function handleTimeEdit(e) {
  // Números del 0-9
  if (e.key >= "0" && e.key <= "9") {
    e.preventDefault();
    if (editingValue.length < 6) {
      // Desplazar a la izquierda y agregar el nuevo número
      editingValue += e.key;
      displayEditingValue();
    }
  }
  // Backspace o Delete para borrar
  else if (e.key === "Backspace" || e.key === "Delete") {
    e.preventDefault();
    // Borrar el último dígito de la izquierda
    editingValue = editingValue.slice(0, -1);
    displayEditingValue();
  }
  // Enter para confirmar
  else if (e.key === "Enter") {
    e.preventDefault();
    finishEditingTime();
  }
  // Escape para cancelar
  else if (e.key === "Escape") {
    e.preventDefault();
    cancelEditingTime();
  }
}

// Mostrar el valor que se está editando
function displayEditingValue() {
  if (editingValue === "") {
    timeDisplay.textContent = "00:00:00";
  } else {
    // Rellenar con ceros a la izquierda hasta tener 6 dígitos
    const padded = editingValue.padStart(6, "0");
    const hours = padded.substring(0, 2);
    const minutes = padded.substring(2, 4);
    const seconds = padded.substring(4, 6);

    timeDisplay.textContent = `${hours}:${minutes}:${seconds}`;
  }
}

// Finalizar la edición y aplicar el cambio
function finishEditingTime() {
  if (!isEditingTime) return;

  // Si no se ingresó nada, cancelar
  if (editingValue === "") {
    cancelEditingTime();
    return;
  }

  // Convertir el valor editado a segundos
  const padded = editingValue.padStart(6, "0");
  const hours = parseInt(padded.substring(0, 2));
  const minutes = parseInt(padded.substring(2, 4));
  const seconds = parseInt(padded.substring(4, 6));

  // Validar que los valores sean correctos
  if (minutes >= 60 || seconds >= 60) {
    alert("Valores inválidos. Los minutos y segundos deben ser menores a 60.");
    cancelEditingTime();
    return;
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;

  if (totalSeconds > 0 && totalSeconds <= 10800) {
    // Máximo 3 horas
    // Guardar en minutos (redondeado) para la configuración
    const totalMinutes = Math.ceil(totalSeconds / 60);
    settings[currentMode] = totalMinutes;
    timeLeft = totalSeconds;
    saveSettings();
  } else if (totalSeconds > 10800) {
    alert("El tiempo máximo es de 3 horas (03:00:00)");
  }

  exitEditingMode();
}

// Cancelar la edición
function cancelEditingTime() {
  exitEditingMode();
}

// Salir del modo edición
function exitEditingMode() {
  isEditingTime = false;
  editingValue = "";
  timeDisplay.classList.remove("editing");
  timeHint.textContent = "Haz clic para editar";
  timeHint.classList.remove("show");
  updateDisplay();
}

function getModeLabel(mode) {
  const labels = {
    pomodoro: "Pomodoro",
    shortBreak: "Descanso Corto",
    longBreak: "Descanso Largo",
  };
  return labels[mode] || mode;
}

// Funciones de Configuración
function loadSettings() {
  const savedSettings = localStorage.getItem("pomodoroSettings");
  if (savedSettings) {
    settings = JSON.parse(savedSettings);
  }

  timeLeft = settings[currentMode] * 60;
}

function saveSettings() {
  localStorage.setItem("pomodoroSettings", JSON.stringify(settings));
} // Funciones de Tareas
function loadTasks() {
  const savedTasks = localStorage.getItem("pomodoroTasks");
  if (savedTasks) {
    tasks = JSON.parse(savedTasks);
    taskIdCounter =
      tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) + 1 : 1;
  }
}

function saveTasks() {
  localStorage.setItem("pomodoroTasks", JSON.stringify(tasks));
}

function addTask() {
  const taskName = document.getElementById("taskName").value.trim();
  const taskPomodorosValue = document
    .getElementById("taskPomodoros")
    .value.trim();
  const taskPomodoros = parseInt(taskPomodorosValue);

  // Si estamos en un proyecto específico, usar ese; si no, usar el selector
  const taskProjectId =
    currentProjectId || document.getElementById("taskProject").value;

  if (!taskName) {
    alert("Por favor ingresa un nombre para la tarea");
    return;
  }

  if (
    !taskPomodorosValue ||
    isNaN(taskPomodoros) ||
    taskPomodoros < 1 ||
    taskPomodoros > 99
  ) {
    alert("Por favor ingresa un número válido de pomodoros (1-99)");
    return;
  }

  const newTask = {
    id: taskIdCounter++,
    name: taskName,
    totalPomodoros: taskPomodoros,
    completedPomodoros: 0,
    completed: false,
    projectId: taskProjectId || null,
  };

  tasks.push(newTask);
  saveTasks();
  renderTasks();

  // Limpiar inputs
  document.getElementById("taskName").value = "";
  document.getElementById("taskPomodoros").value = "1";
  document.getElementById("taskProject").value = "";

  closeModal(taskModal);
}

function deleteTask(taskId) {
  tasks = tasks.filter((task) => task.id !== taskId);
  saveTasks();
  renderTasks();
}

function toggleTaskComplete(taskId) {
  const task = tasks.find((t) => t.id === taskId);
  if (task) {
    task.completed = !task.completed;
    saveTasks();
    renderTasks();
  }
}

function incrementCurrentTaskProgress() {
  const currentTask = tasks.find((task) => !task.completed);
  if (
    currentTask &&
    currentTask.completedPomodoros < currentTask.totalPomodoros
  ) {
    currentTask.completedPomodoros++;
    if (currentTask.completedPomodoros >= currentTask.totalPomodoros) {
      currentTask.completed = true;
    }
    saveTasks();
    renderTasks();
  }
}

function renderTasks() {
  // Filtrar tareas según el proyecto actual
  const filteredTasks = currentProjectId
    ? tasks.filter((task) => task.projectId === currentProjectId)
    : tasks;

  if (filteredTasks.length === 0) {
    tasksList.innerHTML =
      '<div class="empty-tasks">No hay tareas. ¡Agrega una para empezar!</div>';
    return;
  }

  tasksList.innerHTML = filteredTasks
    .map((task) => {
      return `
        <div class="task-item ${task.completed ? "completed" : ""}">
            <div class="task-info">
                <div class="task-name ${task.completed ? "completed" : ""}">${
        task.name
      }</div>
                <div class="task-progress">${task.completedPomodoros} / ${
        task.totalPomodoros
      } pomodoros</div>
            </div>
            <div class="task-actions">
                <button class="task-btn complete-btn" onclick="toggleTaskComplete(${
                  task.id
                })">
                    ${task.completed ? "↺" : "✓"}
                </button>
                <button class="task-btn delete-btn" onclick="deleteTask(${
                  task.id
                })">🗑️</button>
            </div>
        </div>
    `;
    })
    .join("");
}

// Event Listeners de Tareas
addTaskBtn.addEventListener("click", () => {
  // Si estamos en un proyecto específico, ocultar el selector y actualizar título
  const projectField = document.getElementById("taskProjectField");
  const modalTitle = document.getElementById("taskModalTitle");

  if (currentProjectId) {
    projectField.style.display = "none";
    const project = projects.find((p) => p.id === currentProjectId);
    if (project) {
      modalTitle.textContent = `Nueva Tarea en ${project.name}`;
    }
  } else {
    projectField.style.display = "flex";
    modalTitle.textContent = "Nueva Tarea";
    updateProjectSelect();
  }
  openModal(taskModal);
});
closeTaskBtn.addEventListener("click", () => closeModal(taskModal));
saveTaskBtn.addEventListener("click", addTask);

// Event Listeners de Proyectos
addProjectBtn.addEventListener("click", () => openModal(projectModal));
closeProjectBtn.addEventListener("click", () => closeModal(projectModal));
saveProjectBtn.addEventListener("click", addProject);

// Funciones de Proyectos
function loadProjects() {
  const savedProjects = localStorage.getItem("pomodoroProjects");
  if (savedProjects) {
    projects = JSON.parse(savedProjects);
    // Asegurar que todos los proyectos tengan el campo accumulatedTime
    projects = projects.map((project) => ({
      ...project,
      accumulatedTime: project.accumulatedTime || 0,
    }));
    projectIdCounter =
      projects.length > 0 ? Math.max(...projects.map((p) => p.id)) + 1 : 1;
  }
}

function saveProjects() {
  localStorage.setItem("pomodoroProjects", JSON.stringify(projects));
}

function addProject() {
  const projectName = document.getElementById("projectName").value.trim();
  const projectColor = document.getElementById("projectColor").value;

  if (!projectName) {
    alert("Por favor ingresa un nombre para el proyecto");
    return;
  }

  const newProject = {
    id: `project-${projectIdCounter++}`,
    name: projectName,
    color: projectColor,
    accumulatedTime: 0, // tiempo acumulado en segundos
  };

  projects.push(newProject);
  saveProjects();
  renderProjectsGrid();
  updateProjectSelect();

  // Limpiar inputs
  document.getElementById("projectName").value = "";
  document.getElementById("projectColor").value = "#4CAF50";

  closeModal(projectModal);
}

// Función para agregar tiempo a un proyecto
function addTimeToProject(projectId, seconds) {
  const project = projects.find((p) => p.id === projectId);
  if (project) {
    project.accumulatedTime = (project.accumulatedTime || 0) + seconds;
    saveProjects();

    // Actualizar el display del tiempo acumulado si estamos en la vista de detalle
    if (
      currentProjectId === projectId &&
      projectDetailView.classList.contains("active")
    ) {
      updateAccumulatedTimeDisplay(project.accumulatedTime);
    }
  }
}

// Función para formatear tiempo acumulado
function formatAccumulatedTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    return `${minutes}m`;
  } else {
    return `<1m`;
  }
}

function deleteProject(projectId) {
  if (
    !confirm(
      "¿Estás seguro de eliminar este proyecto? Las tareas asociadas no se eliminarán."
    )
  ) {
    return;
  }

  projects = projects.filter((project) => project.id !== projectId);

  // Si el proyecto actual es el que se está eliminando, volver a la vista de proyectos
  if (currentProjectId === projectId) {
    showProjectsView();
  }

  saveProjects();
  renderProjectsGrid();
  updateProjectSelect();
}

// Funciones de Navegación
function showProjectsView() {
  projectsView.classList.add("active");
  projectDetailView.classList.remove("active");
  currentProjectId = null;
  renderProjectsGrid();
}

function showProjectDetailView(projectId) {
  currentProjectId = projectId;
  const project = projects.find((p) => p.id === projectId);

  if (!project) return;

  // Actualizar información del proyecto en la vista de detalle
  document.getElementById("detailProjectName").textContent = project.name;
  document.getElementById("detailProjectColor").style.backgroundColor =
    project.color;
  document.getElementById("detailProjectColor").style.color = project.color;
  document.querySelector(".project-title-section").style.color = project.color;

  // Actualizar tiempo acumulado
  updateAccumulatedTimeDisplay(project.accumulatedTime || 0);

  // Cambiar vista
  projectsView.classList.remove("active");
  projectDetailView.classList.add("active");

  // Renderizar tareas del proyecto
  renderTasks();
}

function updateAccumulatedTimeDisplay(totalSeconds) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);

  document.getElementById("accumulatedHours").textContent = hours;
  document.getElementById("accumulatedMinutes").textContent = minutes;
}

// Función para reiniciar el tiempo de un proyecto
function resetProjectTime() {
  if (!currentProjectId) return;

  const project = projects.find((p) => p.id === currentProjectId);
  if (!project) return;

  if (
    confirm(
      `¿Estás seguro de que quieres reiniciar el tiempo dedicado a "${project.name}"?\n\nEsto no se puede deshacer.`
    )
  ) {
    project.accumulatedTime = 0;
    saveProjects();
    updateAccumulatedTimeDisplay(0);
    renderProjectsGrid(); // Actualizar también el grid para reflejar el cambio
  }
}

// Renderizar Grid de Proyectos
function renderProjectsGrid() {
  if (projects.length === 0) {
    projectsGrid.innerHTML =
      '<div class="empty-projects-grid">No hay proyectos. ¡Crea uno para empezar!</div>';
    return;
  }

  projectsGrid.innerHTML = projects
    .map((project) => {
      const taskCount = tasks.filter((t) => t.projectId === project.id).length;
      const accumulatedTime = project.accumulatedTime || 0;
      const timeDisplay = formatAccumulatedTime(accumulatedTime);

      return `
        <div class="project-card" style="color: ${project.color};" onclick="showProjectDetailView('${project.id}')">
          <div>
            <div class="project-card-header">
              <span class="project-card-color" style="background-color: ${project.color};"></span>
              <span class="project-card-name">${project.name}</span>
            </div>
            <div class="project-card-stats">
              <div class="project-stat">
                <span class="project-stat-label">
                  <span>⏱️</span>
                  Tiempo dedicado
                </span>
                <span class="project-stat-value">${timeDisplay}</span>
              </div>
              <div class="project-stat">
                <span class="project-stat-label">
                  <span>📋</span>
                  Tareas
                </span>
                <span class="project-stat-value">${taskCount}</span>
              </div>
            </div>
          </div>
          <div class="project-card-actions" onclick="event.stopPropagation()">
            <button class="project-card-delete" onclick="deleteProject('${project.id}')">🗑️ Eliminar</button>
          </div>
        </div>
      `;
    })
    .join("");
}

function updateProjectSelect() {
  const taskProjectSelect = document.getElementById("taskProject");
  taskProjectSelect.innerHTML = '<option value="">Sin proyecto</option>';

  projects.forEach((project) => {
    const option = document.createElement("option");
    option.value = project.id;
    option.textContent = project.name;
    taskProjectSelect.appendChild(option);
  });
}

// Funciones de Modal
function openModal(modal) {
  modal.classList.add("active");
}

function closeModal(modal) {
  modal.classList.remove("active");
}

// Cerrar modal al hacer click fuera de él
window.addEventListener("click", (e) => {
  if (e.target === taskModal) {
    closeModal(taskModal);
  }
  if (e.target === projectModal) {
    closeModal(projectModal);
  }
});

// Solicitar permisos de notificación
if ("Notification" in window && Notification.permission === "default") {
  Notification.requestPermission();
}
