/**
 * Live Channels Application
 * Google Live Channels inspired design
 */

// Global variables
let channels = [];
let currentChannel = null;
let player = null;
let epgData = {};

// DOM elements
const channelListEl = document.getElementById('channel-list');
const channelCarouselEl = document.getElementById('channel-carousel');
const searchInput = document.getElementById('search-channels');
const categorySelect = document.getElementById('category-select');
const videoPlayerEl = document.getElementById('video-player');
const nowPlayingEl = document.getElementById('now-playing');
const epgChannelsEl = document.getElementById('epg-channels');
const epgProgramsEl = document.getElementById('epg-programs');
const uploadBtn = document.getElementById('upload-btn');
const playlistFileInput = document.getElementById('playlist-file');
const fullscreenBtn = document.getElementById('fullscreen-btn');
const toastContainer = document.getElementById('toast-container');

/**
 * Initialize the application
 */
async function init() {
    await loadChannels();
    await loadEPG();
    loadCategories();
    setupEventListeners();
    initVideoPlayer();
}

/**
 * Load channels from the server
 */
async function loadChannels() {
    try {
        const response = await fetch('/api/channels');
        channels = await response.json();
        renderChannels(channels);
        renderCarousel(channels);
    } catch (error) {
        console.error('Error loading channels:', error);
        showToast('Error loading channels', 'error');
    }
}

/**
 * Render channel list in sidebar
 * @param {Array} channelData - Array of channel objects
 */
function renderChannels(channelData) {
    channelListEl.innerHTML = '';

    if (channelData.length === 0) {
        channelListEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📡</div>
                <div class="empty-state-text">No channels found</div>
            </div>
        `;
        return;
    }

    channelData.forEach(channel => {
        const channelEl = document.createElement('div');
        channelEl.className = 'channel-item';
        channelEl.dataset.channelName = channel.name;

        const logoUrl = channel.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=1a73e8&color=fff&size=96`;

        channelEl.innerHTML = `
            <img src="${logoUrl}" alt="${channel.name}" class="channel-logo" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=1a73e8&color=fff&size=96'">
            <div class="channel-info">
                <div class="channel-name">${channel.name}</div>
                <div class="channel-category">${channel.category}</div>
            </div>
        `;

        channelEl.addEventListener('click', () => selectChannel(channel));
        channelListEl.appendChild(channelEl);
    });
}

/**
 * Render channel carousel
 * @param {Array} channelData - Array of channel objects
 */
function renderCarousel(channelData) {
    channelCarouselEl.innerHTML = '';

    if (channelData.length === 0) {
        return;
    }

    channelData.forEach(channel => {
        const carouselItem = document.createElement('div');
        carouselItem.className = 'carousel-item';
        carouselItem.dataset.channelName = channel.name;

        const logoUrl = channel.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=1a73e8&color=fff&size=200`;

        carouselItem.innerHTML = `
            <img src="${logoUrl}" alt="${channel.name}" class="carousel-logo" onerror="this.src='https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=1a73e8&color=fff&size=200'">
            <div class="carousel-name">${channel.name}</div>
        `;

        carouselItem.addEventListener('click', () => selectChannel(channel));
        channelCarouselEl.appendChild(carouselItem);
    });
}

/**
 * Select and play a channel
 * @param {Object} channel - Channel object
 */
function selectChannel(channel) {
    currentChannel = channel;

    // Update UI
    document.querySelectorAll('.channel-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.channelName === channel.name) {
            item.classList.add('active');
        }
    });

    document.querySelectorAll('.carousel-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.channelName === channel.name) {
            item.classList.add('active');
            item.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    });

    // Update now playing
    nowPlayingEl.innerHTML = `
        <div class="now-playing-icon">📺</div>
        <div class="now-playing-info">
            <div class="now-playing-label">Now Playing</div>
            <div class="now-playing-title">${channel.name}</div>
        </div>
    `;

    // Play the channel
    playStream(channel);

    // Show channel EPG
    showChannelEPG(channel);
}

/**
 * Play stream using Video.js
 * @param {Object} channel - Channel object
 */
function playStream(channel) {
    if (!player) {
        initVideoPlayer();
    }

    player.src({
        src: channel.stream_url,
        type: 'application/x-mpegURL'
    });

    player.poster(channel.logo || '');
    player.play().catch(error => {
        console.log('Auto-play prevented:', error);
    });
}

/**
 * Initialize Video.js player
 */
function initVideoPlayer() {
    player = videojs(videoPlayerEl, {
        autoplay: false,
        controls: true,
        responsive: true,
        fluid: true,
        playbackRates: [0.5, 1, 1.5, 2],
        sources: []
    });

    player.on('error', () => {
        showToast('Error loading stream. Please try another channel.', 'error');
    });

    player.on('play', () => {
        console.log('Video started playing');
    });

    player.on('ended', () => {
        console.log('Video ended');
    });
}

/**
 * Load EPG data
 */
async function loadEPG() {
    try {
        const response = await fetch('/api/epg');
        epgData = await response.json();
    } catch (error) {
        console.error('Error loading EPG:', error);
    }
}

/**
 * Show channel EPG in timeline view
 * @param {Object} channel - Channel object
 */
function showChannelEPG(channel) {
    const channelId = channel.epg_id || channel.name.toLowerCase().replace(/ /g, '_');
    const programs = epgData[channelId] || [];

    epgChannelsEl.innerHTML = '';
    epgProgramsEl.innerHTML = '';

    if (programs.length === 0) {
        epgProgramsEl.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📋</div>
                <div class="empty-state-text">No program guide available</div>
            </div>
        `;
        return;
    }

    // Get sorted programs
    const sortedPrograms = programs
        .sort((a, b) => parseInt(a.start) - parseInt(b.start))
        .slice(0, 8);

    // Render channel info
    const logoUrl = channel.logo || `https://ui-avatars.com/api/?name=${encodeURIComponent(channel.name)}&background=1a73e8&color=fff&size=96`;

    const channelInfoEl = document.createElement('div');
    channelInfoEl.className = 'epg-channel-item active';
    channelInfoEl.innerHTML = `
        <img src="${logoUrl}" alt="${channel.name}" class="epg-channel-logo">
        <div class="epg-channel-name">${channel.name}</div>
    `;
    epgChannelsEl.appendChild(channelInfoEl);

    // Render programs
    const now = new Date();
    sortedPrograms.forEach(program => {
        const programStart = parseProgramTime(program.start);
        const programEnd = parseProgramTime(program.end);
        const isNowPlaying = now >= programStart && now <= programEnd;

        const programEl = document.createElement('div');
        programEl.className = 'epg-program-row';

        programEl.innerHTML = `
            <div class="epg-time">${formatProgramTime(program.start)}</div>
            <div class="epg-program ${isNowPlaying ? 'now-playing' : ''}">
                <div class="epg-program-title">${program.title}</div>
                <div class="epg-program-meta">${formatProgramTime(program.start)} - ${formatProgramTime(program.end)}</div>
            </div>
        `;

        epgProgramsEl.appendChild(programEl);
    });
}

/**
 * Parse program time string
 * @param {string} timeStr - Time string in YYYYMMDDHHMMSS format
 * @returns {Date} Parsed date
 */
function parseProgramTime(timeStr) {
    if (!timeStr || timeStr.length < 12) return new Date();

    try {
        const year = parseInt(timeStr.substring(0, 4));
        const month = parseInt(timeStr.substring(4, 6)) - 1;
        const day = parseInt(timeStr.substring(6, 8));
        const hour = parseInt(timeStr.substring(8, 10));
        const minute = parseInt(timeStr.substring(10, 12));

        return new Date(year, month, day, hour, minute);
    } catch (e) {
        return new Date();
    }
}

/**
 * Format program time for display
 * @param {string} timeStr - Time string in YYYYMMDDHHMMSS format
 * @returns {string} Formatted time
 */
function formatProgramTime(timeStr) {
    if (!timeStr || timeStr.length < 12) return timeStr;

    try {
        const hour = timeStr.substring(8, 10);
        const minute = timeStr.substring(10, 12);
        return `${hour}:${minute}`;
    } catch (e) {
        return timeStr;
    }
}

/**
 * Load categories from channels
 */
function loadCategories() {
    const categories = [...new Set(channels.map(ch => ch.category))].filter(Boolean);

    categorySelect.innerHTML = '<option value="">All Categories</option>';

    categories.forEach(category => {
        const option = document.createElement('option');
        option.value = category;
        option.textContent = category;
        categorySelect.appendChild(option);
    });
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
    // Search channels
    searchInput.addEventListener('input', (e) => {
        filterChannels(e.target.value, categorySelect.value);
    });

    // Filter by category
    categorySelect.addEventListener('change', (e) => {
        filterChannels(searchInput.value, e.target.value);
    });

    // Upload playlist button
    uploadBtn.addEventListener('click', () => {
        playlistFileInput.click();
    });

    // File input change
    playlistFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (file) {
            await uploadPlaylist(file);
        }
    });

    // Fullscreen button
    fullscreenBtn.addEventListener('click', toggleFullscreen);

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboardShortcuts);
}

/**
 * Filter channels by search term and category
 * @param {string} searchTerm - Search term
 * @param {string} category - Category filter
 */
function filterChannels(searchTerm, category) {
    let filtered = channels;

    if (searchTerm) {
        filtered = filtered.filter(ch =>
            ch.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }

    if (category) {
        filtered = filtered.filter(ch => ch.category === category);
    }

    renderChannels(filtered);
    renderCarousel(filtered);
}

/**
 * Upload M3U playlist
 * @param {File} file - Playlist file
 */
async function uploadPlaylist(file) {
    const formData = new FormData();
    formData.append('file', file);

    try {
        showToast('Loading playlist...', 'info');

        const response = await fetch('/api/upload_playlist', {
            method: 'POST',
            body: formData
        });

        const result = await response.json();

        if (result.success) {
            channels = result.channels;
            renderChannels(channels);
            renderCarousel(channels);
            loadCategories();
            await loadEPG();
            showToast(`Loaded ${channels.length} channels`, 'success');
        } else {
            showToast(result.error || 'Error loading playlist', 'error');
        }
    } catch (error) {
        console.error('Error uploading playlist:', error);
        showToast('Error loading playlist', 'error');
    }
}

/**
 * Toggle fullscreen mode
 */
function toggleFullscreen() {
    const container = document.querySelector('.video-container');

    if (!document.fullscreenElement) {
        container.requestFullscreen().catch(err => {
            console.log('Fullscreen error:', err);
            showToast('Fullscreen not supported', 'error');
        });
    } else {
        document.exitFullscreen();
    }
}

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} e - Keyboard event
 */
function handleKeyboardShortcuts(e) {
    switch (e.key) {
        case ' ':
            e.preventDefault();
            if (player) {
                player.paused() ? player.play() : player.pause();
            }
            break;
        case 'f':
            toggleFullscreen();
            break;
        case 'ArrowLeft':
            navigateChannels(-1);
            break;
        case 'ArrowRight':
            navigateChannels(1);
            break;
        case 'Escape':
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            break;
    }
}

/**
 * Navigate through channels
 * @param {number} direction - Direction (-1 for left, 1 for right)
 */
function navigateChannels(direction) {
    const visibleChannels = Array.from(document.querySelectorAll('.carousel-item:not([style*="display: none"])'));
    const currentIndex = visibleChannels.findIndex(ch => ch.classList.contains('active'));

    if (currentIndex !== -1) {
        const nextIndex = currentIndex + direction;
        if (nextIndex >= 0 && nextIndex < visibleChannels.length) {
            visibleChannels[nextIndex].click();
            visibleChannels[nextIndex].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
    }
}

/**
 * Show toast notification
 * @param {string} message - Message to display
 * @param {string} type - Toast type (success, error, info)
 */
function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;

    toastContainer.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'slideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', init);
