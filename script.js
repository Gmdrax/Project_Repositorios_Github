// --- CONFIGURACIÓN TAILWIND ---
tailwind.config = {
    darkMode: 'class',
    theme: {
        extend: {
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                display: ['Archivo Black', 'sans-serif'],
                mono: ['JetBrains Mono', 'monospace'],
            },
            colors: {
                primary: '#00f2ea',
                secondary: '#ff0050',
                darkbg: '#050510',
                cardbg: '#0a0a15',
            }
        }
    }
}

// --- CONSTANTES ---
const USERNAME = 'Gmdrax';
const ITEMS_PER_PAGE = 9;
const CACHE_KEY_USER = `gh_user_${USERNAME}`;
const CACHE_KEY_REPOS = `gh_repos_${USERNAME}`;
const CACHE_KEY_TIME = `gh_time_${USERNAME}`;
const CACHE_DURATION = 15 * 60 * 1000; // 15 Minutos en milisegundos

// --- VARIABLES DE ESTADO ---
let allRepos = [];
let filteredRepos = [];
let currentLangFilter = 'all';
let visibleCount = ITEMS_PER_PAGE;

// --- INICIALIZACIÓN ---
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    initApp();

    // Listeners
    document.getElementById('load-more-btn').addEventListener('click', () => {
        visibleCount += ITEMS_PER_PAGE;
        renderRepos(filteredRepos, true);
    });

    document.getElementById('search-input').addEventListener('input', debounce((e) => {
        handleSearch(e.target.value);
    }, 300));
});

// --- GESTIÓN DE CACHÉ ---
function getCachedData() {
    const timestamp = localStorage.getItem(CACHE_KEY_TIME);
    const user = localStorage.getItem(CACHE_KEY_USER);
    const repos = localStorage.getItem(CACHE_KEY_REPOS);

    if (!timestamp || !user || !repos) return null;

    const now = new Date().getTime();
    // Si la caché es reciente (menos de 15 min), úsala
    if (now - parseInt(timestamp) < CACHE_DURATION) {
        return { user: JSON.parse(user), repos: JSON.parse(repos) };
    }
    return null; // Caché expirada, intentar fetch
}

function saveToCache(user, repos) {
    try {
        localStorage.setItem(CACHE_KEY_USER, JSON.stringify(user));
        localStorage.setItem(CACHE_KEY_REPOS, JSON.stringify(repos));
        localStorage.setItem(CACHE_KEY_TIME, new Date().getTime().toString());
    } catch (e) {
        console.warn('Storage lleno', e);
    }
}

function getExpiredCache() {
        // Fallback: Recuperar datos viejos si la API falla
    const user = localStorage.getItem(CACHE_KEY_USER);
    const repos = localStorage.getItem(CACHE_KEY_REPOS);
    if (user && repos) {
        return { user: JSON.parse(user), repos: JSON.parse(repos) };
    }
    return null;
}

// --- LÓGICA PRINCIPAL BLINDADA ---
async function initApp() {
    try {
        // 1. ESTRATEGIA "ZERO-API" (Prioridad Máxima)
        // Intentamos cargar un archivo local generado previamente.
        // Si existe, la web carga instantánea y NO consume cuota de GitHub.
        const staticResponse = await fetch('database.json');
        
        if (staticResponse.ok) {
            const data = await staticResponse.json();
            console.log('🚀 Modo Estático Activo: Carga instantánea (0 consumo API)');
            processData(data.user, data.repos);
            hideLoading();
            return; // Terminamos aquí. La API de GitHub ni se entera.
        }
    } catch (e) {
        console.warn('Modo Estático no disponible, iniciando modo dinámico...');
    }

    // 2. MODO DINÁMICO (Fallback / Respaldo)
    // Solo si no hay archivo local, usamos la lógica original (Caché + API)
    let user, repos;
    const cached = getCachedData();

    try {
        if (cached) {
            console.log('Cargando desde caché navegador...');
            user = cached.user;
            repos = cached.repos;
        } else {
            console.log('Consultando API GitHub...');
            const [userRes, reposRes] = await Promise.all([
                fetch(`https://api.github.com/users/${USERNAME}`),
                fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`)
            ]);

            if (userRes.status === 403 || reposRes.status === 403) throw new Error('API_LIMIT');
            if (!userRes.ok) throw new Error('Usuario no encontrado');

            user = await userRes.json();
            repos = await reposRes.json();
            saveToCache(user, repos);
        }
        processData(user, repos);
        hideLoading();

    } catch (error) {
        console.error(error);
        const expiredData = getExpiredCache();
        if (expiredData) {
            showToast();
            processData(expiredData.user, expiredData.repos);
            hideLoading();
        } else {
            showError(error.message === 'API_LIMIT' 
                ? 'Límite de API excedido. Sube un archivo database.json para solucionarlo permanentemente.' 
                : 'Error de conexión.');
        }
    }
}

function processData(user, repos) {
    allRepos = repos;
    filteredRepos = allRepos;
    renderProfile(user);
    calculateStats(allRepos);
    setupFilters(allRepos);
    renderRepos(filteredRepos);
}

function showToast() {
    const toast = document.getElementById('toast');
    toast.classList.remove('hidden');
    toast.classList.remove('translate-x-full');
}

function hideLoading() {
    const loader = document.getElementById('loading');
    loader.style.opacity = '0';
    setTimeout(() => {
        loader.style.display = 'none';
        document.getElementById('main-content').style.opacity = '1';
    }, 300);
}

function showError(msg) {
    document.getElementById('loading').innerHTML = `
        <div class="text-red-500 text-center px-4">
            <p class="font-bold text-xl mb-2">¡Ups!</p>
            <p class="text-sm opacity-80">${msg}</p>
            <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-500/20 text-red-500 border border-red-500 rounded text-xs uppercase font-bold">Reintentar</button>
        </div>
    `;
}

function renderProfile(user) {
    document.getElementById('avatar').src = user.avatar_url;
    document.getElementById('name').textContent = user.name || USERNAME;
    document.getElementById('username').textContent = `@${user.login}`;
    document.getElementById('followers').textContent = user.followers;
    document.getElementById('following').textContent = user.following;
    document.getElementById('github-link').href = user.html_url;
    let clicks = 0;
    const avatar = document.getElementById('avatar');
    
    avatar.style.cursor = 'pointer'; // Para saber que es clicable
    avatar.onclick = () => {
        clicks++;
        if (clicks === 5) {
            // Activamos el modo admin
            localStorage.setItem('GMDRAX_ADMIN', 'true');
            alert('🔓 MODO DUEÑO ACTIVADO\nAhora puedes ver los botones de edición.');
            
            // Recargamos para mostrar los botones
            location.reload(); 
        }
    };

}

function calculateStats(repos) {
    const totalStars = repos.reduce((acc, repo) => acc + repo.stargazers_count, 0);
    const totalForks = repos.reduce((acc, repo) => acc + repo.forks_count, 0);
    const langs = {};
    repos.forEach(r => { if(r.language) langs[r.language] = (langs[r.language] || 0) + 1; });
    const topLang = Object.keys(langs).length > 0 
        ? Object.keys(langs).reduce((a, b) => langs[a] > langs[b] ? a : b) 
        : 'N/A';

    document.getElementById('total-repos').textContent = repos.length;
    document.getElementById('total-stars').textContent = totalStars;
    document.getElementById('total-forks').textContent = totalForks;
    document.getElementById('top-lang').textContent = topLang;
}

// --- RENDERIZADO ---
// --- RENDERIZADO ---
function renderRepos(repos, append = false) {
    const isAdmin = localStorage.getItem('GMDRAX_ADMIN') === 'true';
    const grid = document.getElementById('repos-grid');
    const loadMoreBtn = document.getElementById('load-more-btn');
    const showingCountLabel = document.getElementById('showing-count');
    
    if (!append) grid.innerHTML = '';

    if (repos.length === 0) {
        grid.innerHTML = `<div class="col-span-full text-center py-10 text-gray-500 font-bold uppercase tracking-widest text-xs">Sin resultados encontrados</div>`;
        loadMoreBtn.classList.add('hidden');
        showingCountLabel.textContent = '';
        return;
    }

    const startIndex = append ? visibleCount - ITEMS_PER_PAGE : 0;
    const itemsToShow = repos.slice(startIndex, visibleCount);

    if(append && itemsToShow.length === 0) return;

    const fragment = document.createDocumentFragment();

    itemsToShow.forEach((repo) => {
        const card = document.createElement('div');
        card.className = 'repo-card p-5 flex flex-col h-full cursor-pointer group';
        
        const langColors = {
            'JavaScript': '#facc15', 'TypeScript': '#3b82f6', 'Python': '#22c55e',
            'HTML': '#f97316', 'CSS': '#3b82f6', 'Vue': '#42b883', 'React': '#61dafb'
        };
        const langColor = langColors[repo.language] || '#ffffff';
        
        // Configuración de URLs
        const editorUrl = repo.html_url.replace('github.com', 'github.dev');
        let hasWeb = false;
        let webUrl = '#';
        if (repo.homepage && repo.homepage.trim() !== "") {
            hasWeb = true;
            webUrl = repo.homepage.startsWith('http') ? repo.homepage : 'https://' + repo.homepage;
        }

        // Generador de Badges (Limpio)
        const generateBadge = (topic) => {
            const logos = {
                'react': 'react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB',
                'vue': 'vue.js-%2335495e.svg?style=flat&logo=vuedotjs&logoColor=%234FC08D',
                'angular': 'angular-%23DD0031.svg?style=flat&logo=angular&logoColor=white',
                'javascript': 'javascript-%23323330.svg?style=flat&logo=javascript&logoColor=%23F7DF1E',
                'typescript': 'typescript-%23007ACC.svg?style=flat&logo=typescript&logoColor=white',
                'python': 'python-3670A0?style=flat&logo=python&logoColor=ffdd54',
                'html': 'html5-%23E34F26.svg?style=flat&logo=html5&logoColor=white',
                'css': 'css3-%231572B6.svg?style=flat&logo=css3&logoColor=white',
                'tailwind': 'tailwindcss-%2338B2AC.svg?style=flat&logo=tailwind-css&logoColor=white',
                'node': 'node.js-6DA55F?style=flat&logo=node.js&logoColor=white',
                'nextjs': 'Next-black?style=flat&logo=next.js&logoColor=white'
            };
            const url = logos[topic.toLowerCase()] || `${topic}-blue?style=flat&logo=github`;
            return `<img src="https://img.shields.io/badge/${url}" alt="${topic}" class="h-5 tech-badge rounded-sm">`;
        };

        const badgesHtml = repo.topics && repo.topics.length > 0
            ? `<div class="flex flex-wrap gap-1.5 mb-4 overflow-hidden h-6">
                ${repo.topics.slice(0, 4).map(t => generateBadge(t)).join('')}
               </div>`
            : '<div class="h-6 mb-4"></div>';

        // HTML Definitivo de la Tarjeta
        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="bg-white/5 p-2 rounded-lg border border-white/10 group-hover:bg-primary group-hover:text-black transition-colors">
                    <i data-lucide="folder" class="w-5 h-5"></i>
                </div>
                
                <div class="flex gap-2">
                    ${isAdmin ? `
                    <a href="${editorUrl}" 
                       target="_blank" 
                       rel="noopener noreferrer" 
                       onclick="event.stopPropagation()" 
                       class="group/edit p-1.5 bg-blue-500/10 hover:bg-blue-500 rounded-md text-blue-400 hover:text-white border border-blue-500/50 transition-all z-10 flex items-center gap-1" 
                       title="Editar ahora (Solo Tú)">
                        <i data-lucide="edit-3" class="w-4 h-4"></i>
                    </a>` : ''}

                    <button 
                        onclick="event.stopPropagation(); copyCloneCommand('${repo.clone_url}', this)" 
                        class="p-1.5 bg-white/5 hover:bg-white/20 rounded-md text-gray-400 hover:text-primary transition-colors z-10" 
                        title="Copiar 'git clone'">
                        <i data-lucide="clipboard-copy" class="w-4 h-4"></i>
                    </button>

                    ${hasWeb ? `
                    <a href="${webUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/50 text-primary rounded-md text-[10px] font-bold uppercase hover:bg-primary hover:text-black transition-all z-10" title="Ver Proyecto Online">
                        <i data-lucide="globe" class="w-3 h-3"></i> WEB
                    </a>` : ''}
                    
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="p-1.5 bg-white/5 hover:bg-white/20 rounded-md text-gray-400 hover:text-white transition-colors z-10" title="Ver en GitHub">
                        <i data-lucide="external-link" class="w-4 h-4"></i>
                    </a>
                </div>
            </div>
            
            ${badgesHtml} 
            
            <h3 class="font-display text-lg mb-2 text-white group-hover:text-primary transition-colors uppercase leading-tight break-all">${repo.name}</h3>
            <p class="text-xs text-gray-400 mb-6 flex-1 truncate-2-lines leading-relaxed">${repo.description || 'Sin descripción disponible.'}</p>
            
            <div class="flex items-center justify-between text-[10px] font-mono uppercase font-bold text-gray-500 pt-3 border-t border-white/5 w-full">
                <div class="flex items-center gap-2">
                    ${repo.language ? `<span class="w-2 h-2 rounded-full" style="background-color: ${langColor}; box-shadow: 0 0 5px ${langColor}"></span> ${repo.language}` : ''}
                </div>
                <div class="flex gap-3 text-gray-400">
                    <span class="flex items-center gap-1"><i data-lucide="star" class="w-3 h-3"></i> ${repo.stargazers_count}</span>
                    <span class="flex items-center gap-1"><i data-lucide="git-fork" class="w-3 h-3"></i> ${repo.forks_count}</span>
                </div>
            </div>
        `;
        
        card.onclick = (e) => {
            if(!e.target.closest('a') && !e.target.closest('button')) openRepoViewer(repo);
        };
        fragment.appendChild(card);
    });

    grid.appendChild(fragment);
    lucide.createIcons();

    if (visibleCount < repos.length) {
        loadMoreBtn.classList.remove('hidden');
    } else {
        loadMoreBtn.classList.add('hidden');
    }
    showingCountLabel.textContent = `Mostrando ${Math.min(visibleCount, repos.length)} de ${repos.length}`;
}

// --- FILTROS Y BÚSQUEDA ---
function setupFilters(repos) {
    const languages = [...new Set(repos.map(r => r.language).filter(Boolean))];
    const container = document.getElementById('filter-container');
    container.innerHTML = '<button class="filter-btn active bg-white text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap border border-white" data-filter="all" onclick="filterByLang(\'all\', this)">Todos</button>';

    languages.forEach(lang => {
        const btn = document.createElement('button');
        btn.className = 'filter-btn bg-black/60 hover:bg-white/20 text-gray-300 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border border-white/20';
        btn.textContent = lang;
        btn.onclick = () => filterByLang(lang, btn);
        container.appendChild(btn);
    });
}

function filterByLang(lang, btnElement) {
    currentLangFilter = currentLangFilter === lang ? 'all' : lang;
    
    document.querySelectorAll('#filter-container button').forEach(b => {
        b.className = 'filter-btn bg-black/60 hover:bg-white/20 text-gray-300 px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap transition-all border border-white/20';
    });

    if (currentLangFilter !== 'all') {
        btnElement.className = 'bg-white text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap border border-white scale-105 shadow-lg shadow-white/10';
    } else {
        document.querySelector('[data-filter="all"]').className = 'bg-white text-black px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-wider whitespace-nowrap border border-white';
    }

    handleSearch(document.getElementById('search-input').value);
}

function handleSearch(term) {
    term = term.toLowerCase();
    filteredRepos = allRepos.filter(repo => {
        const matchesSearch = repo.name.toLowerCase().includes(term) || (repo.description || '').toLowerCase().includes(term);
        const matchesLang = currentLangFilter === 'all' || repo.language === currentLangFilter;
        return matchesSearch && matchesLang;
    });
    visibleCount = ITEMS_PER_PAGE;
    renderRepos(filteredRepos);
}

// --- VISOR DE CÓDIGO (Árbol de Directorios) ---

// 1. Convierte la lista plana de GitHub en una estructura de árbol
function buildHierarchy(files) {
    const root = {};
    files.forEach(file => {
        const parts = file.path.split('/');
        let current = root;
        parts.forEach((part, index) => {
            if (!current[part]) {
                current[part] = {
                    name: part,
                    type: index === parts.length - 1 ? 'file' : 'folder',
                    path: file.path,
                    children: {}
                };
            }
            current = current[part].children;
        });
    });
    return root;
}

// 2. Genera el HTML recursivo con <details> para carpetas
function generateTreeHTML(node, repoName, branch) {
    let html = '';
    // Ordenar: Carpetas primero, luego archivos (alfabéticamente)
    const entries = Object.values(node).sort((a, b) => {
        if (a.type === b.type) return a.name.localeCompare(b.name);
        return a.type === 'folder' ? -1 : 1;
    });

    entries.forEach(item => {
        if (item.type === 'folder') {
            html += `
                <details class="group ml-2 open:mb-1">
                    <summary class="flex items-center gap-2 p-1.5 hover:bg-white/5 rounded cursor-pointer text-[11px] text-gray-400 select-none transition-colors outline-none">
                        <i data-lucide="folder" class="w-3 h-3 text-yellow-500/80 group-open:hidden"></i>
                        <i data-lucide="folder-open" class="w-3 h-3 text-yellow-500 hidden group-open:block"></i>
                        <span class="font-bold text-gray-300 group-hover:text-white">${item.name}</span>
                    </summary>
                    <div class="border-l border-white/10 ml-2.5 pl-1 mt-1">
                        ${generateTreeHTML(item.children, repoName, branch)}
                    </div>
                </details>
            `;
        } else {
            // Usamos data-attributes para pasar los datos de forma segura
            html += `
                <div class="file-node flex items-center gap-2 p-1.5 ml-4 hover:bg-white/10 rounded cursor-pointer text-[10px] text-gray-400 hover:text-primary transition-colors truncate font-mono"
                     onclick="handleFileClick(this)"
                     data-repo="${repoName}"
                     data-branch="${branch}"
                     data-path="${item.path}">
                    <i data-lucide="file-code" class="w-3 h-3 opacity-50"></i>
                    ${item.name}
                </div>
            `;
        }
    });
    return html;
}

// 3. Función intermedia para manejar el click limpiamente
function handleFileClick(element) {
    const { repo, branch, path } = element.dataset;
    loadFileContent(repo, branch, path, element);
}

// 4. Abre el modal y carga el árbol
async function openRepoViewer(repo) {
    // ... (Tu código de apertura de modal) ...
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');
    document.getElementById('modal-title').textContent = repo.name;

    const fileTree = document.getElementById('file-tree');
    fileTree.innerHTML = '<div class="text-center p-4 text-primary animate-pulse font-mono text-[10px] uppercase font-bold">Cargando estructura...</div>';
    
    // Preparar visor
    const viewer = document.getElementById('code-viewer');
    viewer.innerHTML = '<div class="h-full flex flex-col items-center justify-center opacity-50"><i data-lucide="loader-2" class="w-8 h-8 animate-spin mb-2"></i><p class="text-xs uppercase font-bold">Buscando README...</p></div>';
    lucide.createIcons();

    try {
        const res = await fetch(`https://api.github.com/repos/${USERNAME}/${repo.name}/git/trees/${repo.default_branch}?recursive=1`);
        if (!res.ok) throw new Error('Error API');
        
        const data = await res.json();
        
        if (data.tree) {
            const blobs = data.tree.filter(i => i.type === 'blob');
            const hierarchy = buildHierarchy(blobs);
            fileTree.innerHTML = generateTreeHTML(hierarchy, repo.name, repo.default_branch);
            lucide.createIcons();

            // --- LÓGICA AUTO-README ---
            // Buscamos readme.md sin importar mayúsculas/minúsculas
            const readmeNode = blobs.find(f => f.path.toLowerCase() === 'readme.md');
            
            if (readmeNode) {
                // Si existe, lo cargamos usando un flag 'isReadme' para renderizar Markdown
                loadReadmeContent(repo.name, repo.default_branch, readmeNode.path);
            } else {
                viewer.innerHTML = '<div class="flex flex-col items-center opacity-50 mt-20"><i data-lucide="mouse-pointer" class="w-8 h-8 mb-2"></i><p class="text-xs uppercase font-bold">Selecciona un archivo</p></div>';
                lucide.createIcons();
            }
            // --------------------------
        }
    } catch (e) {
        console.error(e);
        fileTree.innerHTML = '<div class="text-red-400 p-4 text-center text-[10px]">Error al cargar</div>';
    }
}

// Nueva función específica para READMEs
async function loadReadmeContent(repoName, branch, path) {
    const viewer = document.getElementById('code-viewer');
    try {
        const res = await fetch(`https://api.github.com/repos/${USERNAME}/${repoName}/contents/${path}?ref=${branch}`);
        const data = await res.json();
        
        // Decodificar Base64 (soporta UTF-8)
        const content = decodeURIComponent(escape(atob(data.content.replace(/\s/g, ''))));
        
        // Renderizar con MARKED.js
        viewer.innerHTML = `
            <div class="h-full overflow-auto custom-scroll">
                <div class="markdown-body">
                    ${marked.parse(content)}
                </div>
            </div>`;
            
    } catch (e) {
        viewer.innerHTML = '<div class="p-10 text-center text-gray-500">No se pudo cargar el README.</div>';
    }
}

// 5. Carga el contenido del archivo (Modificado para la nueva estructura)
async function loadFileContent(repoName, branch, path, element) {
    // Limpiar selección previa (solo en elementos con clase .file-node)
    document.querySelectorAll('.file-node').forEach(d => {
        d.classList.remove('text-primary', 'bg-white/10', 'font-bold');
    });
    
    // Marcar actual
    if(element) element.classList.add('text-primary', 'bg-white/10', 'font-bold');
    
    const viewer = document.getElementById('code-viewer');
    viewer.innerHTML = '<div class="h-full flex items-center justify-center"><div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div></div>';

    try {
        // EncodeURIComponent es vital por si la ruta tiene espacios o #
        const safePath = path.split('/').map(p => encodeURIComponent(p)).join('/');
        const res = await fetch(`https://api.github.com/repos/${USERNAME}/${repoName}/contents/${safePath}?ref=${branch}`);
        
        if (res.status === 403) throw new Error('API_LIMIT');
        if (!res.ok) throw new Error('Error de lectura');
        
        const data = await res.json();
        let content = '';
        
        if (data.encoding === 'base64') {
            // Decodificación segura de caracteres especiales (UTF-8)
            const binaryString = atob(data.content.replace(/\s/g, ''));
            const bytes = Uint8Array.from(binaryString, c => c.charCodeAt(0));
            content = new TextDecoder().decode(bytes);
        } else {
            content = 'Archivo binario o muy grande.';
        }

        const escaped = content.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#039;'}[m]));
        viewer.innerHTML = `<pre class="font-mono text-[10px] text-gray-300 whitespace-pre-wrap break-words h-full overflow-auto custom-scroll p-4 leading-relaxed">${escaped}</pre>`;
        
    } catch (e) {
        console.error(e);
        viewer.innerHTML = '<div class="h-full flex flex-col items-center justify-center text-red-400 font-mono text-xs"><i data-lucide="alert-triangle" class="mb-2"></i>Error al cargar archivo</div>';
        lucide.createIcons();
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    
    // Opcional: Limpiar el contenido para que al abrir otro repo se vea limpio
    setTimeout(() => {
        document.getElementById('file-tree').innerHTML = '';
        document.getElementById('code-viewer').innerHTML = '';
    }, 300);
}

// --- UTILIDAD: COPIAR CLONE ---
async function copyCloneCommand(url, btn) {
    const command = `git clone ${url}`;
    
    try {
        await navigator.clipboard.writeText(command);
        
        // Feedback visual: Cambiar icono a Check verde
        const originalContent = btn.innerHTML;
        btn.innerHTML = `<i data-lucide="check" class="w-4 h-4 text-green-400"></i>`;
        lucide.createIcons();
        
        // Restaurar después de 2 segundos
        setTimeout(() => {
            btn.innerHTML = originalContent;
            lucide.createIcons();
        }, 2000);
        
    } catch (err) {
        console.error('Error al copiar:', err);
        alert('No se pudo copiar al portapapeles');
    }
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), wait);
    };
}