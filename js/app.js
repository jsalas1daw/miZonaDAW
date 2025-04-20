// ---------- Configuración ----------
const ADMIN_PASSWORD = ''; // Cambia esto por una contraseña segura
        
let isAdmin = false;
let entries = [];
let tags = new Set();
let filteredEntries = [];
let activeTagFilter = null;
let activeDateFilter = null;
let searchTerm = '';
let currentEntryId = null;
let config = {
    githubUrl: 'https://github.com/jsalas1daw/miZonaDAW'
};

// ---------- Elementos DOM ----------
const authModal = document.getElementById('auth-modal');
const githubConfigModal = document.getElementById('github-config-modal');
const loginHeaderBtn = document.getElementById('login-header-btn');
const logoutBtn = document.getElementById('logout-btn');
const newEntryBtn = document.getElementById('new-entry-btn');
const entryForm = document.getElementById('entry-form');
const formTitle = document.getElementById('form-title');
const entriesContainer = document.getElementById('entries-container');
const entriesList = document.getElementById('entries-list');
const entryViewer = document.getElementById('entry-viewer');
const noEntries = document.getElementById('no-entries');
const loading = document.getElementById('loading');
const cancelBtn = document.getElementById('cancel-btn');
const backBtn = document.getElementById('back-btn');
const tagCloud = document.getElementById('tag-cloud');
const searchInput = document.getElementById('search-input');
const dateFilter = document.getElementById('date-filter');
const blogForm = document.getElementById('blog-form');
const adminActions = document.getElementById('admin-actions');
const adminTools = document.getElementById('admin-tools');
const editEntryBtn = document.getElementById('edit-entry-btn');
const deleteEntryBtn = document.getElementById('delete-entry-btn');
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');
const exportDataBtn = document.getElementById('export-data-btn');
const importDataBtn = document.getElementById('import-data-btn');
const importFile = document.getElementById('import-file');
const configGithubBtn = document.getElementById('config-github-btn');
const saveGithubBtn = document.getElementById('save-github-btn');
const githubLink = document.getElementById('github-link');
const closeAuthModal = document.getElementById('close-auth-modal');
const closeGithubModal = document.getElementById('close-github-modal');
const closeDeleteModal = document.getElementById('close-delete-modal');
const togglePassword = document.getElementById('toggle-password');
const passwordInput = document.getElementById('password');
const toggleThemeBtn = document.getElementById('toggle-theme-btn');

// Configuración de Firebase

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();
const storage = firebase.storage();
const entriesRef = db.ref('entries');
const configRef = db.ref('config');

// ---------- Inicialización ----------
document.addEventListener('DOMContentLoaded', function() {
    // Verificar autenticación al cargar
    checkAuthState();
    
    // Cargar configuración
    loadConfig();
    
    // Cargar entradas
    loadEntries();
    
    // Event listeners
    loginHeaderBtn.addEventListener('click', showAuthModal);
    document.getElementById('login-btn').addEventListener('click', login);
    logoutBtn.addEventListener('click', logout);
    newEntryBtn.addEventListener('click', showNewEntryForm);
    cancelBtn.addEventListener('click', hideEntryForm);
    backBtn.addEventListener('click', hideEntryViewer);
    blogForm.addEventListener('submit', saveEntry);
    searchInput.addEventListener('input', handleSearch);
    dateFilter.addEventListener('change', handleDateFilter);
    editEntryBtn.addEventListener('click', handleEditEntry);
    deleteEntryBtn.addEventListener('click', showDeleteModal);
    cancelDeleteBtn.addEventListener('click', hideDeleteModal);
    confirmDeleteBtn.addEventListener('click', deleteEntry);
    exportDataBtn.addEventListener('click', exportData);
    importDataBtn.addEventListener('click', () => importFile.click());
    importFile.addEventListener('change', importData);
    configGithubBtn.addEventListener('click', showGithubConfigModal);
    saveGithubBtn.addEventListener('click', saveGithubConfig);
    
    // Nuevos event listeners para cerrar modales
    closeAuthModal.addEventListener('click', hideAuthModal);
    closeGithubModal.addEventListener('click', hideGithubConfigModal);
    closeDeleteModal.addEventListener('click', hideDeleteModal);
    
    // Toggle para mostrar/ocultar contraseña
    togglePassword.addEventListener('click', function() {
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            togglePassword.innerHTML = '<i class="fas fa-eye-slash"></i>';
        } else {
            passwordInput.type = 'password';
            togglePassword.innerHTML = '<i class="fas fa-eye"></i>';
        }
    });

    // Toggle para cambiar de tema la pagina
    if (localStorage.getItem('darkMode') === 'true') {
        document.body.classList.add('dark-mode');
        toggleThemeBtn.innerHTML = '<i class="fas fa-sun mr-1"></i><span class="hidden sm:inline"></span>';
    }
    toggleThemeBtn.addEventListener('click', toggleDarkMode);
});

// ---------- Funciones de autenticación ----------
function checkAuthState() {
    firebase.auth().onAuthStateChanged(function(user) {
        isAdmin = !!user;
        updateAdminUI();
    });
}

function showAuthModal() {
    authModal.classList.remove('hidden');
    passwordInput.value = ''; // Limpiar el campo al mostrar
    passwordInput.type = 'password'; 
    togglePassword.innerHTML = '<i class="fas fa-eye"></i>'; // Restaurar icono de ojo
}

function hideAuthModal() {
    authModal.classList.add('hidden');
}

function login() {
    const password = document.getElementById('password').value;
    
    if (password === ADMIN_PASSWORD) {
        // Crear una cuenta de autenticación anónima en Firebase
        firebase.auth().signInAnonymously()
            .then(() => {
                hideAuthModal();
                showToast('¡Bienvenido, administrador!');
            })
            .catch(error => {
                console.error('Error de autenticación:', error);
                showToast('Error al iniciar sesión: ' + error.message);
            });
    } else {
        showToast('Contraseña incorrecta');
    }
}

function logout() {
    firebase.auth().signOut()
        .then(() => {
            console.log("Sesión cerrada correctamente");
        })
        .catch(error => {
            console.error('Error al cerrar sesión:', error);
            showToast('Error al cerrar sesión: ' + error.message);
        });
}

function updateAdminUI() {
    if (isAdmin) {
        loginHeaderBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        newEntryBtn.classList.remove('hidden');
        adminTools.classList.remove('hidden');
        document.getElementById('admin-stats').classList.remove('hidden');
        
        // Actualizar estadísticas
        updateStatistics();
        
        // Si estamos viendo una entrada, mostrar las acciones de administrador
        if (!entryViewer.classList.contains('hidden')) {
            adminActions.classList.remove('hidden');
        }
    } else {
        loginHeaderBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
        newEntryBtn.classList.add('hidden');
        adminTools.classList.add('hidden');
        document.getElementById('admin-stats').classList.add('hidden');
        
        // Si hay elementos de administración visibles, ocultarlos
        hideEntryForm();
        if (!entryViewer.classList.contains('hidden')) {
            adminActions.classList.add('hidden');
        }
    }
}

// ---------- Funciones de GitHub ----------
function loadConfig() {
    configRef.once('value').then(snapshot => {
        const data = snapshot.val();
        if (data) {
            config = data;
            updateGithubLink();
        } else {
            // Si no hay configuración en Firebase, guardar la configuración por defecto
            configRef.set(config);
        }
    }).catch(error => {
        console.error('Error al cargar la configuración:', error);
    });
}

function updateGithubLink() {
    githubLink.href = config.githubUrl;
}

function showGithubConfigModal() {
    document.getElementById('github-url').value = config.githubUrl;
    githubConfigModal.classList.remove('hidden');
}

function hideGithubConfigModal() {
    githubConfigModal.classList.add('hidden');
}

function saveGithubConfig() {
    const url = document.getElementById('github-url').value.trim();
    
    if (url) {
        config.githubUrl = url;
        
        // Guardar en Firebase
        configRef.set(config)
            .then(() => {
                updateGithubLink();
                hideGithubConfigModal();
                showToast('Configuración de GitHub guardada correctamente');
            })
            .catch(error => {
                console.error('Error al guardar la configuración:', error);
                showToast('Error al guardar la configuración: ' + error.message);
            });
    } else {
        showToast('Por favor, introduce una URL válida');
    }
}

// ---------- Funciones de gestión de entradas ----------
function loadEntries() {
    // Mostrar indicador de carga
    loading.classList.remove('hidden');
    noEntries.classList.add('hidden');
    
    // Escuchar cambios en las entradas de Firebase
    entriesRef.on('value', (snapshot) => {
        const data = snapshot.val();
        entries = [];
        tags = new Set(); // Resetear el conjunto de tags
        
        console.log("Datos cargados desde Firebase:", data);
        
        if (data) {
            // Convertir el objeto de Firebase en un array
            Object.keys(data).forEach(key => {
                const entry = data[key];
                entry.id = key;
                entries.push(entry);
                
                // Recopilar todas las etiquetas
                if (entry.tags && Array.isArray(entry.tags)) {
                    console.log(`Procesando tags de entrada ${key}:`, entry.tags);
                    entry.tags.forEach(tag => {
                        if (tag && typeof tag === 'string' && tag.trim() !== '') {
                            tags.add(tag.trim());
                        }
                    });
                }
            });
            
            console.log("Total de tags únicos encontrados:", tags.size);
            console.log("Tags:", Array.from(tags));
            
            // Ordenar entradas por fecha (más recientes primero)
            entries.sort((a, b) => new Date(b.date) - new Date(a.date));
        }
        
        // Actualizar UI
        renderTagCloud();
        applyFilters();
        
        // Actualizar estadísticas si es admin
        if (isAdmin) {
            console.log("Usuario es admin, actualizando estadísticas...");
            updateStatistics();
        }
        
        // Ocultar indicador de carga
        loading.classList.add('hidden');
    }, error => {
        console.error('Error al cargar las entradas:', error);
        loading.classList.add('hidden');
        showToast('Error al cargar las entradas: ' + error.message);
    });
}

function renderTagCloud() {
    tagCloud.innerHTML = '';
    
    // Crear y agregar tags al DOM
    Array.from(tags).sort().forEach(tag => {
        const tagElement = document.createElement('span');
        tagElement.classList.add('tag', 'bg-blue-100', 'text-blue-800', 'text-xs', 'px-2', 'py-1', 'rounded-full', 'cursor-pointer');
        
        if (activeTagFilter === tag) {
            tagElement.classList.add('bg-blue-600', 'text-white');
        }
        
        tagElement.textContent = tag;
        tagElement.addEventListener('click', () => handleTagFilter(tag));
        tagCloud.appendChild(tagElement);
    });
}

function handleTagFilter(tag) {
    if (activeTagFilter === tag) {
        // Si ya estaba seleccionado, quitar el filtro
        activeTagFilter = null;
    } else {
        // Aplicar nuevo filtro
        activeTagFilter = tag;
    }
    
    currentPage = 1; // Resetear a la primera página cuando cambia el filtro
    renderTagCloud();
    applyFilters();
}

function handleDateFilter() {
    activeDateFilter = dateFilter.value ? new Date(dateFilter.value) : null;
    currentPage = 1; // Resetear a la primera página cuando cambia el filtro
    applyFilters();
}

function handleSearch() {
    searchTerm = searchInput.value.toLowerCase().trim();
    currentPage = 1; // Resetear a la primera página cuando cambia la búsqueda
    applyFilters();
}

function applyFilters() {
    filteredEntries = entries.filter(entry => {
        // Filtrar por etiqueta
        if (activeTagFilter && (!entry.tags || !entry.tags.includes(activeTagFilter))) {
            return false;
        }
        
        // Filtrar por fecha
        if (activeDateFilter) {
            const entryDate = new Date(entry.date);
            // Comparar solo año, mes y día
            if (entryDate.getFullYear() !== activeDateFilter.getFullYear() ||
                entryDate.getMonth() !== activeDateFilter.getMonth() ||
                entryDate.getDate() !== activeDateFilter.getDate()) {
                return false;
            }
        }
        
        // Filtrar por término de búsqueda
        if (searchTerm) {
            const matchesTitle = entry.title.toLowerCase().includes(searchTerm);
            const matchesDescription = entry.description.toLowerCase().includes(searchTerm);
            const matchesTags = entry.tags ? entry.tags.some(tag => tag.toLowerCase().includes(searchTerm)) : false;
            
            if (!matchesTitle && !matchesDescription && !matchesTags) {
                return false;
            }
        }
        
        return true;
    });
    
    // Usar la función displayEntries en lugar de renderEntries
    displayEntries(filteredEntries);
}

function createEntryElement(entry) {
    const entryElement = document.createElement('div');
    entryElement.classList.add('entrada-blog', 'bg-white', 'p-6', 'rounded-lg', 'shadow-sm', 'hover:shadow-md', 'transition-shadow');
    entryElement.setAttribute('data-entry-id', entry.id);

    // Formatear fecha
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    
    // Crear HTML para etiquetas
    const tagsHTML = entry.tags ? entry.tags.map(tag => 
        `<span class="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">${tag}</span>`
    ).join('') : '';
    
    // Crear HTML para la entrada (sin contador de vistas)
    entryElement.innerHTML = `
        <h3 class="text-xl font-semibold text-gray-800 mb-2">${entry.title}</h3>
        <div class="flex items-center mb-4">
            <span class="text-sm text-gray-500 mr-4">${formattedDate}</span>
            <div class="flex flex-wrap gap-1">
                ${tagsHTML}
            </div>
        </div>
        <p class="text-gray-600 mb-4">${truncateText(entry.description, 150)}</p>
        <div class="flex items-center justify-between">
            <button class="view-entry-btn text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center">
                Leer más <i class="fas fa-arrow-right ml-2"></i>
            </button>
        </div>
    `;
    
    // Añadir evento para ver la entrada completa
    entryElement.querySelector('.view-entry-btn').addEventListener('click', () => viewEntry(entry.id));
    
    return entryElement;
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ---------- Funciones de visualización de entradas ----------
function viewEntry(entryId) {
    currentEntryId = entryId;
    const entry = entries.find(e => e.id === entryId);
    
    if (!entry) {
        showToast('Entrada no encontrada');
        return;
    }
    
    // Ocultar lista de entradas y mostrar visor
    entriesContainer.classList.add('hidden');
    entryViewer.classList.remove('hidden');
    
    // Mostrar acciones de administrador si corresponde
    adminActions.classList.toggle('hidden', !isAdmin);
    
    // Formatear fecha
    const date = new Date(entry.date);
    const formattedDate = date.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
    });
    
    // Rellenar información
    document.getElementById('viewer-title').textContent = entry.title;
    document.getElementById('viewer-date').textContent = formattedDate;
    document.getElementById('viewer-description').textContent = entry.description;
    
    // Crear etiquetas
    const tagsContainer = document.getElementById('viewer-tags');
    tagsContainer.innerHTML = '';
    
    if (entry.tags) {
        entry.tags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.classList.add('bg-blue-100', 'text-blue-800', 'text-xs', 'px-2', 'py-1', 'rounded-full');
            tagElement.textContent = tag;
            tagsContainer.appendChild(tagElement);
        });
    }
    
    // Configurar PDF (usando base64)
    const pdfViewerContainer = document.getElementById('pdf-viewer-container');

    if (entry.pdfBase64) {
        // Limpiar el contenedor primero
        pdfViewerContainer.innerHTML = '';
        
        // Crear un nuevo elemento object para forzar la recarga
        const pdfObject = document.createElement('object');
        pdfObject.id = 'pdf-viewer';
        pdfObject.data = entry.pdfBase64;
        pdfObject.type = 'application/pdf';
        
        // Añadir un mensaje alternativo dentro del object
        const fallbackP = document.createElement('p');
        fallbackP.innerHTML = `Tu navegador no puede mostrar el PDF. <a href="${entry.pdfBase64}" download="${entry.pdfName || 'documento.pdf'}">Descárgalo aquí</a>.`;
        pdfObject.appendChild(fallbackP);
        
        // Añadir el object al contenedor
        pdfViewerContainer.appendChild(pdfObject);
    } else {
        // Si no hay PDF, mostrar mensaje
        pdfViewerContainer.innerHTML = `
            <div class="flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-300 rounded-lg bg-gray-50 text-gray-500">
                <i class="fas fa-file-pdf text-4xl mb-3"></i>
                <p class="text-lg font-medium">No hay PDF adjunto para esta entrada</p>
            </div>
        `;
    }
}

function hideEntryViewer() {
    entryViewer.classList.add('hidden');
    entriesContainer.classList.remove('hidden');
    currentEntryId = null;
}

// ---------- Funciones de creación y edición de entradas ----------
function showNewEntryForm() {
    formTitle.textContent = 'Nueva Entrada';
    document.getElementById('entry-id').value = '';
    blogForm.reset();
    document.getElementById('current-file').classList.add('hidden');
    
    entriesContainer.classList.add('hidden');
    entryForm.classList.remove('hidden');
}

function hideEntryForm() {
    entryForm.classList.add('hidden');
    entriesContainer.classList.remove('hidden');
}

function handleEditEntry() {
    if (!currentEntryId) return;
    
    const entry = entries.find(e => e.id === currentEntryId);
    if (!entry) return;
    
    // Ocultar visor y mostrar formulario
    entryViewer.classList.add('hidden');
    entryForm.classList.remove('hidden');
    
    // Actualizar título del formulario
    formTitle.textContent = 'Editar Entrada';
    
    // Rellenar formulario con datos existentes
    document.getElementById('entry-id').value = entry.id;
    document.getElementById('title').value = entry.title;
    document.getElementById('description').value = entry.description;
    document.getElementById('tags').value = entry.tags ? entry.tags.join(', ') : '';
    
    // Mostrar nombre del archivo actual si existe
    if (entry.pdfName) {
        document.getElementById('current-file').classList.remove('hidden');
        document.getElementById('file-name').textContent = entry.pdfName;
    } else {
        document.getElementById('current-file').classList.add('hidden');
    }
}

function saveEntry(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showToast('No tienes permisos para realizar esta acción');
        return;
    }
    
    const entryId = document.getElementById('entry-id').value;
    const title = document.getElementById('title').value.trim();
    const description = document.getElementById('description').value.trim();
    const tagsInput = document.getElementById('tags').value.trim();
    const pdfFile = document.getElementById('pdf').files[0];
    
    // Validación básica
    if (!title || !description) {
        showToast('Por favor, completa los campos obligatorios');
        return;
    }
    
    // Procesamiento de etiquetas - MEJORADO
    let tags = [];
    if (tagsInput) {
        tags = tagsInput.split(',')
            .map(tag => tag.trim())
            .filter(tag => tag.length > 0);
        
        console.log("Etiquetas procesadas:", tags);
    }
    
    // Preparar datos de la entrada
    const entryData = {
        title,
        description,
        tags, // Asegurarse de que esto sea un array, incluso si está vacío
        date: entryId ? entries.find(e => e.id === entryId).date : new Date().toISOString()
    };
    
    // Mostrar indicador de carga
    loading.classList.remove('hidden');
    entryForm.classList.add('hidden');
    
    // Si hay un nuevo archivo PDF, convertirlo a base64
    if (pdfFile) {
        // Verificar tamaño del archivo (recomendable limitar el tamaño para no sobrecargar la BD)
        if (pdfFile.size > 5 * 1024 * 1024) { // 5MB límite
            showToast('El archivo es demasiado grande. El tamaño máximo es 5MB.');
            loading.classList.add('hidden');
            entryForm.classList.remove('hidden');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            // El resultado es una cadena en base64
            entryData.pdfBase64 = event.target.result;
            entryData.pdfName = pdfFile.name;
            entryData.pdfSize = pdfFile.size;
            
            saveEntryToDatabase(entryId, entryData);
        };
        reader.onerror = function() {
            console.error('Error al leer el archivo');
            showToast('Error al procesar el archivo PDF');
            loading.classList.add('hidden');
            entryForm.classList.remove('hidden');
        };
        
        // Leer el archivo como Data URL (base64)
        reader.readAsDataURL(pdfFile);
    } else {
        // Si no hay un nuevo archivo, conservar el existente si estamos editando
        if (entryId) {
            const existingEntry = entries.find(e => e.id === entryId);
            if (existingEntry.pdfBase64) {
                entryData.pdfBase64 = existingEntry.pdfBase64;
                entryData.pdfName = existingEntry.pdfName;
                entryData.pdfSize = existingEntry.pdfSize;
            }
        }
        
        saveEntryToDatabase(entryId, entryData);
    }
}

function saveEntryToDatabase(entryId, entryData) {
    let savePromise;
    
    if (entryId) {
        // Actualizar entrada existente
        savePromise = entriesRef.child(entryId).update(entryData);
    } else {
        // Crear nueva entrada
        savePromise = entriesRef.push(entryData);
    }
    
    return savePromise
        .then(() => {
            loading.classList.add('hidden');
            entriesContainer.classList.remove('hidden');
            showToast(entryId ? 'Entrada actualizada correctamente' : 'Entrada creada correctamente');
        })
        .catch(error => {
            console.error('Error al guardar la entrada:', error);
            showToast('Error al guardar la entrada: ' + error.message);
            loading.classList.add('hidden');
        });
}

// ---------- Funciones de eliminación de entradas ----------
function showDeleteModal() {
    deleteModal.classList.remove('hidden');
}

function hideDeleteModal() {
    deleteModal.classList.add('hidden');
}

function deleteEntry() {
    if (!currentEntryId || !isAdmin) {
        hideDeleteModal();
        return;
    }
    
    // Mostrar indicador de carga
    loading.classList.remove('hidden');
    hideDeleteModal();
    
    // Eliminar entrada en la base de datos
    entriesRef.child(currentEntryId).remove()
        .then(() => {
            // Importante: primero ocultar el visor y luego mostrar la lista
            hideEntryViewer();
            entriesContainer.classList.remove('hidden');
            loading.classList.add('hidden');
            showToast('Entrada eliminada correctamente');
        })
        .catch(error => {
            console.error('Error al eliminar la entrada:', error);
            showToast('Error al eliminar la entrada: ' + error.message);
            loading.classList.add('hidden');
        });
}

// ---------- Funciones de exportación e importación ----------
function exportData() {
    if (!isAdmin) return;
    
    // Preguntar si quiere incluir los PDFs en la exportación
    const includePDFs = confirm('¿Deseas incluir los archivos PDF en la exportación? (Aumentará considerablemente el tamaño del archivo)');
    
    // Crear objeto para exportar
    const exportData = {
        entries: entries.map(entry => {
            const { id, ...rest } = entry;
            
            // Si no se desea incluir PDFs, eliminar el campo pdfBase64
            if (!includePDFs && rest.pdfBase64) {
                const { pdfBase64, ...entryWithoutPdf } = rest;
                return entryWithoutPdf;
            }
            
            return rest;
        }),
        config
    };
    
    // Convertir a JSON y crear blob
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // Crear link de descarga
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mizonadaw_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(e) {
    if (!isAdmin) return;
    
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(event) {
        try {
            const data = JSON.parse(event.target.result);
            
            if (!data.entries) {
                throw new Error('Formato de archivo inválido');
            }
            
            // Confirmar importación
            if (confirm(`¿Estás seguro de que deseas importar ${data.entries.length} entradas? Esta acción sobrescribirá las entradas existentes.`)) {
                // Mostrar indicador de carga
                loading.classList.remove('hidden');
                
                // Guardar configuración si existe
                let configPromise = Promise.resolve();
                if (data.config) {
                    config = data.config;
                    configPromise = configRef.set(config);
                    updateGithubLink();
                }
                
                // Eliminar entradas existentes y luego importar nuevas
                configPromise
                    .then(() => entriesRef.remove())
                    .then(() => {
                        // Importar nuevas entradas
                        const promises = data.entries.map(entry => entriesRef.push(entry));
                        return Promise.all(promises);
                    })
                    .then(() => {
                        loading.classList.add('hidden');
                        showToast('Datos importados correctamente');
                    })
                    .catch(error => {
                        console.error('Error al importar datos:', error);
                        showToast('Error al importar datos: ' + error.message);
                        loading.classList.add('hidden');
                    });
            }
        } catch (error) {
            console.error('Error al procesar el archivo:', error);
            showToast('Error al procesar el archivo: ' + error.message);
        }
        
        // Limpiar input para permitir seleccionar el mismo archivo de nuevo
        importFile.value = '';
    };
    
    reader.readAsText(file);
}

// ---------- Funciones de tema ----------
function toggleDarkMode() {
    if (document.body.classList.contains('dark-mode')) {
        // Cambiar a modo claro
        document.body.classList.remove('dark-mode');
        localStorage.setItem('darkMode', 'false');
        toggleThemeBtn.innerHTML = '<i class="fas fa-moon mr-1"></i><span class="hidden sm:inline"></span>';
    } else {
        // Cambiar a modo oscuro
        document.body.classList.add('dark-mode');
        localStorage.setItem('darkMode', 'true');
        toggleThemeBtn.innerHTML = '<i class="fas fa-sun mr-1"></i><span class="hidden sm:inline"></span>';
    }
}

// ---------- Funciones de notificaciones toast ----------
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    // Crear toast
    const toast = document.createElement('div');
    toast.classList.add('toast', `toast-${type}`);
    
    // Icono según tipo
    let icon = 'info-circle';
    if (type === 'success') icon = 'check-circle';
    if (type === 'error') icon = 'exclamation-circle';
    
    toast.innerHTML = `
        <div class="toast-icon">
            <i class="fas fa-${icon}"></i>
        </div>
        <div class="toast-message">${message}</div>
        <div class="toast-close">
            <i class="fas fa-times"></i>
        </div>
    `;
    
    // Añadir al DOM
    container.appendChild(toast);
    
    // Forzar reflow para que la animación funcione
    toast.offsetHeight;
    
    // Mostrar toast con animación
    toast.classList.add('show');
    
    // Evento para cerrar manualmente
    toast.querySelector('.toast-close').addEventListener('click', () => {
        removeToast(toast);
    });
    
    // Auto cerrar después de 5 segundos
    setTimeout(() => {
        removeToast(toast);
    }, 5000);
}

function removeToast(toast) {
    // Quitar animación
    toast.classList.remove('show');
    
    // Eliminar del DOM después de la animación
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 300);
}

function updateStatistics() {
    console.log("Actualizando estadísticas...");
    console.log("Total de entradas:", entries.length);
    console.log("Set de tags:", tags);
    
    // Total de entradas
    document.getElementById('stats-total-entries').textContent = entries.length;
    
    // Total de etiquetas únicas
    document.getElementById('stats-total-tags').textContent = tags.size;
    
    // Top 5 entradas
    const topEntriesContainer = document.getElementById('stats-top-entries');
    topEntriesContainer.innerHTML = '';
    
    const topEntries = [...entries].slice(0, 5);
    
    if (topEntries.length === 0) {
        topEntriesContainer.innerHTML = '<p class="text-gray-500 text-center text-sm">No hay datos disponibles</p>';
    } else {
        topEntries.forEach(entry => {
            const entryItem = document.createElement('div');
            entryItem.className = 'flex justify-between items-center text-sm';
            entryItem.innerHTML = `
                <span class="text-gray-700 truncate w-4/5" title="${entry.title}">${entry.title}</span>
            `;
            topEntriesContainer.appendChild(entryItem);
        });
    }
    
    // Etiquetas populares
    const topTagsContainer = document.getElementById('stats-top-tags');
    topTagsContainer.innerHTML = '';
    
    // Debug: Examinar todas las entradas y sus etiquetas
    console.log("Examinando entradas para etiquetas:");
    entries.forEach((entry, index) => {
        console.log(`Entrada ${index + 1} - Título: ${entry.title}`);
        console.log(`  Tags:`, entry.tags);
    });
    
    // Contar ocurrencias de cada etiqueta
    const tagCounts = {};
    let tagsFound = false;
    
    entries.forEach(entry => {
        // Verificar primero si entry.tags existe y es un array no vacío
        if (entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0) {
            tagsFound = true;
            entry.tags.forEach(tag => {
                if (tag && typeof tag === 'string' && tag.trim() !== '') {
                    const trimmedTag = tag.trim();
                    tagCounts[trimmedTag] = (tagCounts[trimmedTag] || 0) + 1;
                }
            });
        }
    });
    
    console.log("Tags encontrados:", tagsFound);
    console.log("Conteo de tags:", tagCounts);
    
    // Si no se encontraron etiquetas en ninguna entrada
    if (!tagsFound) {
        topTagsContainer.innerHTML = '<p class="text-gray-500 text-center text-sm w-full">No hay etiquetas disponibles</p>';
        return;
    }
    
    // Ordenar etiquetas por frecuencia
    const sortedTags = Object.keys(tagCounts)
        .sort((a, b) => tagCounts[b] - tagCounts[a])
        .slice(0, 10);
    
    console.log("Tags ordenados:", sortedTags);
    
    if (sortedTags.length === 0) {
        topTagsContainer.innerHTML = '<p class="text-gray-500 text-center text-sm w-full">No hay etiquetas disponibles</p>';
    } else {
        sortedTags.forEach(tag => {
            const tagElement = document.createElement('span');
            tagElement.className = 'tag bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full';
            tagElement.innerHTML = `${tag} <span class="font-semibold">(${tagCounts[tag]})</span>`;
            topTagsContainer.appendChild(tagElement);
        });
    }
}

function exportData() {
    if (!isAdmin) return;
    
    // Preguntar si quiere incluir los PDFs en la exportación
    const includePDFs = confirm('¿Deseas incluir los archivos PDF en la exportación? (Aumentará considerablemente el tamaño del archivo)');
    
    // Crear objeto para exportar
    const exportData = {
        entries: entries.map(entry => {
            const { id, ...rest } = entry;
            
            // Si no se desea incluir PDFs, eliminar el campo pdfBase64
            if (!includePDFs && rest.pdfBase64) {
                const { pdfBase64, ...entryWithoutPdf } = rest;
                return entryWithoutPdf;
            }
            
            return rest;
        }),
        config
    };
    
    // Convertir a JSON y crear blob
    const jsonData = JSON.stringify(exportData, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    
    // Crear link de descarga
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mizonadaw_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Variables para la paginación
let currentPage = 1;
const entriesPerPage = 3; // Número de entradas por página
let totalEntries = 0;

// Función para mostrar las entradas con paginación
function displayEntries(entries) {
    entriesList.innerHTML = '';
    const paginationContainer = document.getElementById('pagination-container');
    paginationContainer.innerHTML = '';
    
    if (!entries || entries.length === 0) {
        noEntries.classList.remove('hidden');
        return;
    }
    
    noEntries.classList.add('hidden');
    totalEntries = entries.length;
    
    // Calcular índices para la página actual
    const startIndex = (currentPage - 1) * entriesPerPage;
    const endIndex = Math.min(startIndex + entriesPerPage, totalEntries);
    
    // Mostrar solo las entradas de la página actual
    const currentEntries = entries.slice(startIndex, endIndex);
    
    // Mostrar las entradas
    currentEntries.forEach(entry => {
        const entryElement = createEntryElement(entry);
        entriesList.appendChild(entryElement);
    });
    
    // Generar los botones de paginación
    createPaginationButtons();
}

// Función para crear los botones de paginación
function createPaginationButtons() {
    const paginationContainer = document.getElementById('pagination-container');
    paginationContainer.innerHTML = '';
    
    if (totalEntries <= entriesPerPage) {
        return; // No necesitamos paginación si hay pocas entradas
    }
    
    const totalPages = Math.ceil(totalEntries / entriesPerPage);
    
    // Botón anterior
    if (currentPage > 1) {
        const prevButton = document.createElement('button');
        prevButton.className = 'pagination-button';
        prevButton.innerHTML = '<i class="fas fa-chevron-left"></i>';
        prevButton.addEventListener('click', () => {
            currentPage--;
            // Usar displayEntries directamente en lugar de loadEntries
            displayEntries(filteredEntries);
        });
        paginationContainer.appendChild(prevButton);
    }
    
    // Botones de número de página
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, currentPage + 2);
    
    // Ajustar para mostrar siempre 5 botones si es posible
    if (endPage - startPage < 4) {
        if (startPage === 1) {
            endPage = Math.min(5, totalPages);
        } else if (endPage === totalPages) {
            startPage = Math.max(1, totalPages - 4);
        }
    }
    
    for (let i = startPage; i <= endPage; i++) {
        const pageButton = document.createElement('button');
        pageButton.className = `pagination-button ${i === currentPage ? 'active' : ''}`;
        pageButton.textContent = i;
        pageButton.addEventListener('click', () => {
            currentPage = i;
            // Usar displayEntries directamente en lugar de loadEntries
            displayEntries(filteredEntries);
        });
        paginationContainer.appendChild(pageButton);
    }
    
    // Botón siguiente
    if (currentPage < totalPages) {
        const nextButton = document.createElement('button');
        nextButton.className = 'pagination-button';
        nextButton.innerHTML = '<i class="fas fa-chevron-right"></i>';
        nextButton.addEventListener('click', () => {
            currentPage++;
            // Usar displayEntries directamente en lugar de loadEntries
            displayEntries(filteredEntries);
        });
        paginationContainer.appendChild(nextButton);
    }
}