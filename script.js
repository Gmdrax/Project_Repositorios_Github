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

// --- LÓGICA PRINCIPAL ---
async function initApp() {
    try {
        const [userRes, reposRes] = await Promise.all([
            fetch(`https://api.github.com/users/${USERNAME}`),
            fetch(`https://api.github.com/users/${USERNAME}/repos?per_page=100&sort=updated`)
        ]);

        if (!userRes.ok) throw new Error('Usuario no encontrado o límite de API excedido.');

        const user = await userRes.json();
        allRepos = await reposRes.json();
        
        filteredRepos = allRepos;

        renderProfile(user);
        calculateStats(allRepos);
        setupFilters(allRepos);
        renderRepos(filteredRepos);

        // Ocultar Loading suavemente
        const loader = document.getElementById('loading');
        loader.style.opacity = '0';
        setTimeout(() => {
            loader.style.display = 'none';
            document.getElementById('main-content').style.opacity = '1';
        }, 300);

    } catch (error) {
        console.error(error);
        document.getElementById('loading').innerHTML = `
            <div class="text-red-500 text-center px-4">
                <p class="font-bold text-xl mb-2">¡Error de Conexión!</p>
                <p class="text-sm opacity-80">${error.message}</p>
                <button onclick="location.reload()" class="mt-4 px-4 py-2 bg-red-500/20 text-red-500 border border-red-500 rounded text-xs uppercase font-bold">Reintentar</button>
            </div>
        `;
    }
}

function renderProfile(user) {
    document.getElementById('avatar').src = user.avatar_url;
    document.getElementById('name').textContent = user.name || USERNAME;
    document.getElementById('username').textContent = `@${user.login}`;
    document.getElementById('followers').textContent = user.followers;
    document.getElementById('following').textContent = user.following;
    document.getElementById('github-link').href = user.html_url;
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

// --- RENDERIZADO OPTIMIZADO CON FRAGMENTOS ---
function renderRepos(repos, append = false) {
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

    // Optimización: Usar DocumentFragment para reducir reflows
    const fragment = document.createDocumentFragment();

    itemsToShow.forEach((repo) => {
        const card = document.createElement('div');
        card.className = 'repo-card p-5 flex flex-col h-full cursor-pointer group';
        
        // Color mapping
        const langColors = {
            'JavaScript': '#facc15',
            'TypeScript': '#3b82f6',
            'Python': '#22c55e',
            'HTML': '#f97316',
            'CSS': '#3b82f6',
            'Vue': '#42b883',
            'React': '#61dafb'
        };
        const langColor = langColors[repo.language] || '#ffffff';
        
        // --- ARREGLO VISUALIZACIÓN WEB ---
        let hasWeb = false;
        let webUrl = '#';
        
        if (repo.homepage && repo.homepage.trim() !== "") {
            hasWeb = true;
            webUrl = repo.homepage;
            // Asegurar protocolo
            if (!webUrl.startsWith('http')) {
                webUrl = 'https://' + webUrl;
            }
        }

        card.innerHTML = `
            <div class="flex justify-between items-start mb-4">
                <div class="bg-white/5 p-2 rounded-lg border border-white/10 group-hover:bg-primary group-hover:text-black transition-colors">
                    <i data-lucide="folder" class="w-5 h-5"></i>
                </div>
                
                <div class="flex gap-2">
                    ${hasWeb ? `
                    <a href="${webUrl}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="flex items-center gap-1 px-2 py-1 bg-primary/10 border border-primary/50 text-primary rounded-md text-[10px] font-bold uppercase hover:bg-primary hover:text-black transition-all z-10" title="Ver Proyecto Online">
                        <i data-lucide="globe" class="w-3 h-3"></i> WEB
                    </a>` : ''}
                    
                    <a href="${repo.html_url}" target="_blank" rel="noopener noreferrer" onclick="event.stopPropagation()" class="p-1.5 bg-white/5 hover:bg-white/20 rounded-md text-gray-400 hover:text-white transition-colors z-10" title="Ver en GitHub">
                        <i data-lucide="external-link" class="w-4 h-4"></i>
                    </a>
                </div>
            </div>
            
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
        
        // Prevenir abrir el modal si se clickean los botones
        card.onclick = (e) => {
            if(!e.target.closest('a')) openRepoViewer(repo);
        };
        
        fragment.appendChild(card);
    });

    grid.appendChild(fragment);
    lucide.createIcons();

    // Lógica Botón Mostrar Más
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

// --- VISOR DE CÓDIGO MEJORADO ---
async function openRepoViewer(repo) {
    const modal = document.getElementById('modal');
    modal.classList.remove('hidden');
    document.getElementById('modal-title').textContent = repo.name;
    
    const fileTree = document.getElementById('file-tree');
    fileTree.innerHTML = '<div class="text-center p-4 text-primary animate-pulse font-mono text-[10px] uppercase font-bold">Analizando Repo...</div>';
    document.getElementById('code-viewer').innerHTML = '<div class="flex flex-col items-center opacity-50"><i data-lucide="mouse-pointer" class="w-8 h-8 mb-2"></i><p class="text-xs uppercase font-bold">Selecciona un archivo</p></div>';
    lucide.createIcons();

    try {
        const res = await fetch(`https://api.github.com/repos/${USERNAME}/${repo.name}/git/trees/${repo.default_branch}?recursive=1`);
        
        if (!res.ok) throw new Error('Repo vacío o inaccesible');
        
        const data = await res.json();
        
        if (data.tree) {
            // Ordenar: Carpetas primero, luego archivos
            const sorted = data.tree
                .filter(i => i.type === 'blob') // Solo archivos por simplicidad visual
                .sort((a, b) => a.path.localeCompare(b.path));
                
            renderFileTree(sorted, repo.name, repo.default_branch);
        } else {
                fileTree.innerHTML = '<div class="text-gray-500 p-4 text-center text-[10px]">Repositorio vacío</div>';
        }
    } catch (e) {
        fileTree.innerHTML = '<div class="text-red-400 p-4 text-center text-[10px]">No se pudo cargar el árbol de archivos. (Límite API o Repo Vacío)</div>';
    }
}

function renderFileTree(files, repoName, branch) {
    const container = document.getElementById('file-tree');
    container.innerHTML = '';
    
    // Fragmento para rendimiento en listas largas
    const fragment = document.createDocumentFragment();

    files.forEach(file => {
        const div = document.createElement('div');
        div.className = 'flex items-center gap-2 p-2 hover:bg-white/5 rounded cursor-pointer text-[10px] text-gray-400 hover:text-white transition-colors truncate font-mono border-b border-white/5 last:border-0';
        div.innerHTML = `<i data-lucide="file-code" class="w-3 h-3 opacity-50"></i> ${file.path}`;
        div.onclick = () => loadFileContent(repoName, branch, file.path, div);
        fragment.appendChild(div);
    });
    
    container.appendChild(fragment);
    lucide.createIcons();
}

async function loadFileContent(repoName, branch, path, element) {
    // UI Selection
    document.querySelectorAll('#file-tree div').forEach(d => d.classList.remove('text-primary', 'bg-white/10'));
    element.classList.add('text-primary', 'bg-white/10');
    
    const viewer = document.getElementById('code-viewer');
    viewer.innerHTML = '<div class="h-full flex items-center justify-center"><div class="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full"></div></div>';

    try {
        const res = await fetch(`https://api.github.com/repos/${USERNAME}/${repoName}/contents/${path}?ref=${branch}`);
        const data = await res.json();
        
        // DECODIFICACIÓN SEGURA
        let content = '';
        if (data.encoding === 'base64') {
            const binaryString = atob(data.content.replace(/\s/g, ''));
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            content = new TextDecoder().decode(bytes);
        } else {
            content = 'Archivo no soportado o binario.';
        }

        const escaped = content.replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;','\'':'&#039;'}[m]));
        
        viewer.innerHTML = `<pre class="font-mono text-[10px] text-gray-300 whitespace-pre-wrap break-words h-full overflow-auto custom-scroll p-2">${escaped}</pre>`;
        
    } catch (e) {
        console.error(e);
        viewer.innerHTML = '<div class="h-full flex flex-col items-center justify-center text-red-400 font-mono text-xs"><i data-lucide="alert-circle" class="mb-2"></i>Error al leer archivo</div>';
        lucide.createIcons();
    }
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func(...args), wait);
    };
}