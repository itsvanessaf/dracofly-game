/************************
***** DECLARATIONS: *****
************************/
let cvs = document.getElementById('game')
let ctx = cvs.getContext('2d')
let description = document.getElementById('description')

// Set ukuran canvas mengikuti layar desktop secara penuh
function resizeCanvas() {
    cvs.width = window.innerWidth
    cvs.height = window.innerHeight
}
resizeCanvas()
window.addEventListener('resize', resizeCanvas)

let frame = 0
let degree = Math.PI / 180

const SFX_SCORE = new Audio('audio/sfx_point.wav')
const SFX_FLAP = new Audio('audio/sfx_wing.wav')
const SFX_COLLISION = new Audio('audio/sfx_hit.wav')
const SFX_FALL = new Audio('audio/sfx_die.wav')
const SFX_SWOOSH = new Audio('audio/sfx_swooshing.wav')

// Seimbangkan volume agar suara kepakan tidak menutupi suara hit & die
SFX_FLAP.volume = 0.45
SFX_COLLISION.volume = 1.0
SFX_FALL.volume = 1.0
SFX_SCORE.volume = 0.8
SFX_SWOOSH.volume = 0.8

const ALL_SFX = [SFX_SCORE, SFX_FLAP, SFX_COLLISION, SFX_FALL, SFX_SWOOSH]
let audioUnlocked = false

// Unlock seluruh objek audio pada klik/tombol pertama pemain
function unlockAllAudio() {
    if (audioUnlocked) return
    audioUnlocked = true
    ALL_SFX.forEach((sfx) => {
        sfx.muted = true
        sfx.play().then(() => {
            sfx.pause()
            sfx.currentTime = 0
            sfx.muted = false
        }).catch(() => {
            sfx.muted = false
        })
    })
}

// Helper pemutar SFX agar selalu mulai dari detik 0 & terdeteksi jika gagal
function playSFX(sfx) {
    sfx.muted = false
    sfx.currentTime = 0
    sfx.play().catch((err) => {
        console.warn('Gagal memutar SFX:', sfx.src, err)
    })
}

// Background Music (BGM) Main Menu & Gameplay
const BGM_MENU = new Audio('audio/Medieval Vol. 2 7.mp3')
const BGM_GAMEPLAY = new Audio('audio/Medieval Vol. 2 3.mp3')

BGM_MENU.preload = 'auto'
BGM_GAMEPLAY.preload = 'auto'
BGM_MENU.loop = true
BGM_GAMEPLAY.loop = true

// Atur volume BGM lebih rendah agar efek suara (SFX) tetap terdengar jelas
BGM_MENU.volume = 0.45
BGM_GAMEPLAY.volume = 0.40

function playMenuBGM() {
    BGM_GAMEPLAY.pause()
    BGM_GAMEPLAY.currentTime = 0
    if (BGM_MENU.paused) {
        BGM_MENU.play().catch(() => {})
    }
}

function playGameplayBGM() {
    BGM_MENU.pause()
    BGM_MENU.currentTime = 0
    BGM_GAMEPLAY.currentTime = 0
    BGM_GAMEPLAY.play().catch(() => {})
}

function stopAllBGM() {
    BGM_MENU.pause()
    BGM_MENU.currentTime = 0
    BGM_GAMEPLAY.pause()
    BGM_GAMEPLAY.currentTime = 0
}

// Jalankan musik Main Menu saat halaman dibuka (dengan fallback klik pertama untuk kebijakan autoplay browser)
window.addEventListener('load', () => {
    if (gameState.current === gameState.startScreen) {
        playMenuBGM()
    }
})

function unlockMenuAudioOnFirstInput() {
    if (gameState.current === gameState.startScreen && BGM_MENU.paused) {
        playMenuBGM()
    }
    window.removeEventListener('pointerdown', unlockMenuAudioOnFirstInput)
    window.removeEventListener('keydown', unlockMenuAudioOnFirstInput)
}
window.addEventListener('pointerdown', unlockMenuAudioOnFirstInput)
window.addEventListener('keydown', unlockMenuAudioOnFirstInput)

const DRAGON_FLY_SHEET = new Image()
DRAGON_FLY_SHEET.src = 'img/fly_10f_sheet.png'

const DRAGON_DEATH_SHEET = new Image()
DRAGON_DEATH_SHEET.src = 'img/death_66f_sheet.png'

const DRAGON_BREATH_SHEET = new Image()
DRAGON_BREATH_SHEET.src = 'img/breath_48f_sheet.png'

let gameState = {
    current: -1,
    gateScreen: -1,
    startScreen: 0,
    getReady: 1,
    play: 2,
    gameOver: 3,
    watchingAd: 4
}

// Pemutar Video Iklan Asli (.mp4) + Tombol Link Instagram
let adScreen = {
    video: document.createElement('video'),
    instagramUrl: 'https://www.instagram.com/omtoro.premiumfood?lqvp=MW8yaTRleG9oeHQzeA==',

    init: function() {
        this.video.src = 'VID-20261125-WA0016.mp4'
        this.video.playsInline = true
        this.video.preload = 'auto'

        this.video.onended = () => {
            this.finishAd()
        }

        this.video.onerror = () => {
            console.warn('Video iklan gagal dimuat, melanjutkan permainan...')
            this.finishAd()
        }
    },

    // Area tombol Instagram di bagian bawah tengah layar iklan
    getIgButtonRect: function() {
        let w = 290
        let h = 48
        return {
            x: cvs.width / 2 - w / 2,
            y: cvs.height - 95,
            w: w,
            h: h
        }
    },

    isInsideIgButton: function(mx, my) {
        let btn = this.getIgButtonRect()
        return mx >= btn.x && mx <= btn.x + btn.w &&
               my >= btn.y && my <= btn.y + btn.h
    },

    start: function() {
        gameState.current = gameState.watchingAd
        stopAllBGM()

        if (description) description.style.display = 'none'
        let gameTitle = document.querySelector('h1, .title, #title')
        if (gameTitle) gameTitle.style.display = 'none'

        this.video.currentTime = 0
        this.video.play().catch((err) => {
            console.warn('Autoplay diblokir browser:', err)
            this.finishAd()
        })
    },

    finishAd: function() {
        this.video.pause()

        if (description) {
            description.style.display = 'block'
            description.style.visibility = 'visible'
        }
        let gameTitle = document.querySelector('h1, .title, #title')
        if (gameTitle) gameTitle.style.display = 'block'

        pipes.reset()
        dragon.y = cvs.height * 0.45
        dragon.velocity = 0
        dragon.rotation = 0
        gameState.current = gameState.getReady
        playSFX(SFX_SWOOSH)
        playGameplayBGM()
    },

    update: function() {},

    render: function() {
        if (gameState.current !== gameState.watchingAd) return

        // Latar belakang hitam
        ctx.fillStyle = '#000000'
        ctx.fillRect(0, 0, cvs.width, cvs.height)

        // Gambar frame video secara proporsional
        if (this.video.readyState >= 2) {
            let vidRatio = this.video.videoWidth / this.video.videoHeight
            let cvsRatio = cvs.width / cvs.height
            let drawW, drawH, drawX, drawY

            if (cvsRatio > vidRatio) {
                drawH = cvs.height
                drawW = drawH * vidRatio
                drawX = (cvs.width - drawW) / 2
                drawY = 0
            } else {
                drawW = cvs.width
                drawH = drawW / vidRatio
                drawX = 0
                drawY = (cvs.height - drawH) / 2
            }

            ctx.drawImage(this.video, drawX, drawY, drawW, drawH)
        }

        // Info sisa detik di pojok kanan atas
        let remaining = Math.max(0, Math.ceil(this.video.duration - this.video.currentTime)) || 0
        ctx.fillStyle = 'rgba(15, 20, 38, 0.85)'
        ctx.fillRect(cvs.width - 230, 15, 210, 36)
        ctx.strokeStyle = '#f1c40f'
        ctx.lineWidth = 2
        ctx.strokeRect(cvs.width - 230, 15, 210, 36)

        ctx.fillStyle = '#f1c40f'
        ctx.font = 'bold 14px "Courier New", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('IKLAN SELESAI: ' + remaining + 'd', cvs.width - 125, 38)

        // --- TOMBOL LINK INSTAGRAM ---
        let btn = this.getIgButtonRect()

        // Gradasi warna khas Instagram
        let igGrad = ctx.createLinearGradient(btn.x, btn.y, btn.x + btn.w, btn.y)
        igGrad.addColorStop(0, '#833ab4')
        igGrad.addColorStop(0.5, '#fd1d1d')
        igGrad.addColorStop(1, '#fcb045')

        ctx.fillStyle = igGrad
        ctx.fillRect(btn.x, btn.y, btn.w, btn.h)

        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 2.5
        ctx.strokeRect(btn.x, btn.y, btn.w, btn.h)

        ctx.save()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 16px "Courier New", monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('KUNJUNGI INSTAGRAM ↗', btn.x + btn.w / 2, btn.y + btn.h / 2)
        ctx.restore()
    }
}

adScreen.init()

// Tombol Interaktif pada Layar GAME OVER
let gameOverButtons = {
    getRetryRect: () => ({
        x: cvs.width / 2 - 135,
        y: cvs.height / 2 - 5,
        w: 270,
        h: 46
    }),

    getHomeRect: () => ({
        x: cvs.width / 2 - 135,
        y: score.lives > 0 ? (cvs.height / 2 + 52) : (cvs.height / 2 + 15),
        w: 270,
        h: 46
    }),

    isInside: function(mx, my, rect) {
        return mx >= rect.x && mx <= rect.x + rect.w &&
               my >= rect.y && my <= rect.y + rect.h
    },

    render: function() {
        if (gameState.current !== gameState.gameOver) return

        let centerX = cvs.width / 2
        ctx.textAlign = 'center'

        if (score.lives > 0) {
            let rBtn = this.getRetryRect()
            ctx.fillStyle = '#27ae60'
            ctx.fillRect(rBtn.x, rBtn.y, rBtn.w, rBtn.h)
            ctx.strokeStyle = '#f1c40f'
            ctx.lineWidth = 2
            ctx.strokeRect(rBtn.x, rBtn.y, rBtn.w, rBtn.h)

            ctx.fillStyle = '#ffffff'
            ctx.font = 'bold 16px "Courier New", monospace'
            ctx.fillText('▶ CONTINUE ?', centerX, rBtn.y + 29)
        }

        let hBtn = this.getHomeRect()
        ctx.fillStyle = '#c0392b'
        ctx.fillRect(hBtn.x, hBtn.y, hBtn.w, hBtn.h)
        ctx.strokeStyle = '#f1c40f'
        ctx.lineWidth = 2
        ctx.strokeRect(hBtn.x, hBtn.y, hBtn.w, hBtn.h)

        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 16px "Courier New", monospace'
        ctx.fillText('⌂ KEMBALI KE HOME', centerX, hBtn.y + 29)
    }
}

// Tombol START interaktif bertema Kerajaan
let startButton = {
    w: 240,
    h: 60,
    getX: function() { return cvs.width / 2 - this.w / 2 },
    getY: function() { return cvs.height / 2 - this.h / 2 },

    render: function() {
        if (gameState.current === gameState.gateScreen) {
            let centerX = cvs.width / 2
            let centerY = cvs.height / 2

            ctx.fillStyle = 'rgba(15, 20, 38, 0.78)'
            ctx.fillRect(0, 0, cvs.width, cvs.height)

            // Efek teks berkedip halus
            if (Math.floor(frame / 25) % 2 === 0) {
                ctx.fillStyle = '#ffffff'
                ctx.font = 'bold 18px "Courier New", monospace'
                ctx.textAlign = 'center'
                ctx.fillText('[ KLIK LAYAR / TEKAN SPACE UNTUK MASUK ]', centerX, centerY + 25)
            }
            return
        }

        if (gameState.current !== gameState.startScreen) return

        let x = this.getX()
        let y = this.getY()
        let centerX = cvs.width / 2

        // Lapisan gelap transparan
        ctx.fillStyle = 'rgba(15, 20, 38, 0.65)'
        ctx.fillRect(0, 0, cvs.width, cvs.height)

        // Bayangan tombol
        ctx.fillStyle = '#4a151b'
        ctx.fillRect(x + 4, y + 6, this.w, this.h)

        // Badan tombol merah kerajaan
        ctx.fillStyle = '#c0392b'
        ctx.fillRect(x, y, this.w, this.h)

        // Bingkai emas kerajaan
        ctx.strokeStyle = '#f1c40f'
        ctx.lineWidth = 3
        ctx.strokeRect(x, y, this.w, this.h)

        // Teks di dalam tombol
        ctx.save()
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 21px "Courier New", monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('▶ PLAY', x + this.w / 2, y + this.h / 2 + 1)
        ctx.restore()

        // Tampilkan High Score di bawah tombol
        ctx.fillStyle = '#f1c40f'
        ctx.font = 'bold 16px "Courier New", monospace'
        ctx.textAlign = 'center'
        ctx.fillText('HIGH SCORE: ' + String(score.best).padStart(3, '0'), centerX, y + this.h + 32)
    }
}

const getBottomBarHeight = () => 50
const getGroundHeight = () => 55
const getGroundY = () => cvs.height - getBottomBarHeight() - getGroundHeight()
const getCeilingBottom = () => 44

// 1. BACKGROUND: Kerajaan Megah, Bendera Berkibar & Pegunungan
let bg = {
    xMountains: 0,
    xCastle: 0,
    xClouds: 0,

    themes: [
        {
            // Tema 0 (Skor 0-4): Siang Kerajaan Cerah
            sky: ['#2980b9', '#6dd5fa', '#ffffff'],
            celestial: '#fff200',
            isSun: true,
            mountain: '#576574',
            mountainHighlight: '#8395a7',
            castle: '#dcdde1',
            castleShadow: '#7f8fa6',
            roof: '#c23616',
            banner: '#e84118',
            window: '#fbc531',
            hasStars: false
        },
        {
            // Tema 1 (Skor 5-9): Senja Kerajaan Emas
            sky: ['#2c3e50', '#d35400', '#f39c12'],
            celestial: '#ffdd59',
            isSun: true,
            mountain: '#4b3832',
            mountainHighlight: '#6f4e37',
            castle: '#95a5a6',
            castleShadow: '#535c68',
            roof: '#8e44ad',
            banner: '#f1c40f',
            window: '#ffeaa7',
            hasStars: false
        },
        {
            // Tema 2 (Skor 10-14): Malam Kerajaan Biru Safir
            sky: ['#0c1445', '#192a56', '#273c75'],
            celestial: '#f5f6fa',
            isSun: false,
            mountain: '#1e272e',
            mountainHighlight: '#2f3640',
            castle: '#485460',
            castleShadow: '#1e272e',
            roof: '#e84118',
            banner: '#fbc531',
            window: '#f1c40f',
            hasStars: true
        }
    ],

    render: function() {
        let groundY = getGroundY()
        let themeIndex = Math.floor(score.current / 5) % this.themes.length
        let currentTheme = this.themes[themeIndex]

        // Langit Kerajaan
        let skyGrad = ctx.createLinearGradient(0, 0, 0, groundY)
        skyGrad.addColorStop(0, currentTheme.sky[0])
        skyGrad.addColorStop(0.65, currentTheme.sky[1])
        skyGrad.addColorStop(1, currentTheme.sky[2])
        ctx.fillStyle = skyGrad
        ctx.fillRect(0, 0, cvs.width, cvs.height)

        // Bintang saat tema malam
        if (currentTheme.hasStars) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)'
            for (let i = 0; i < 25; i++) {
                let sx = (i * 197) % cvs.width
                let sy = 50 + ((i * 73) % Math.max(150, groundY * 0.45))
                ctx.fillRect(sx, sy, 2, 2)
            }
        }

        // Matahari / Bulan Kerajaan
        let celX = cvs.width * 0.22
        let celY = Math.max(115, cvs.height * 0.2)
        ctx.fillStyle = currentTheme.celestial
        ctx.beginPath()
        ctx.arc(celX, celY, 42, 0, Math.PI * 2)
        ctx.fill()

        if (!currentTheme.isSun) {
            ctx.fillStyle = currentTheme.sky[0]
            ctx.beginPath()
            ctx.arc(celX + 15, celY - 8, 37, 0, Math.PI * 2)
            ctx.fill()
        }

        // Awan Putih Halus
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)'
        let cloudSpan = 420
        let cloudCount = Math.ceil(cvs.width / cloudSpan) + 2
        for (let i = -1; i < cloudCount; i++) {
            let cx = this.xClouds + i * cloudSpan + 120
            let cy = 110 + (Math.abs(i) % 2) * 45
            ctx.beginPath()
            ctx.arc(cx, cy, 24, 0, Math.PI * 2)
            ctx.arc(cx + 22, cy - 8, 28, 0, Math.PI * 2)
            ctx.arc(cx + 48, cy, 22, 0, Math.PI * 2)
            ctx.fill()
        }

        // Pegunungan Latar
        let mWidth = 480
        let mCount = Math.ceil(cvs.width / mWidth) + 2
        for (let i = -1; i < mCount; i++) {
            let offsetX = this.xMountains + i * mWidth
            ctx.fillStyle = currentTheme.mountain
            ctx.beginPath()
            ctx.moveTo(offsetX, groundY)
            ctx.lineTo(offsetX + 110, groundY - 210)
            ctx.lineTo(offsetX + 230, groundY - 110)
            ctx.lineTo(offsetX + 350, groundY - 230)
            ctx.lineTo(offsetX + mWidth, groundY)
            ctx.closePath()
            ctx.fill()
        }

        // Siluet Istana Kerajaan Megah
        let castleSpan = 920
        let cCount = Math.ceil(cvs.width / castleSpan) + 2
        let wave = Math.sin(frame * 0.12) * 4

        for (let i = -1; i < cCount; i++) {
            let cx = this.xCastle + i * castleSpan + 350

            // Dinding Tembok Utama Istana
            ctx.fillStyle = currentTheme.castle
            ctx.fillRect(cx + 40, groundY - 130, 260, 130)

            // Gerigi Tembok Istana (Battlements)
            for (let bx = cx + 40; bx < cx + 300; bx += 22) {
                ctx.fillRect(bx, groundY - 142, 12, 12)
            }

            // Menara Kiri & Kanan
            ctx.fillRect(cx, groundY - 200, 65, 200)
            ctx.fillRect(cx + 275, groundY - 200, 65, 200)

            // Menara Utama Tengah (Royal Keep)
            ctx.fillStyle = currentTheme.castleShadow
            ctx.fillRect(cx + 125, groundY - 255, 90, 255)

            // Atap Kerucut Kerajaan
            ctx.fillStyle = currentTheme.roof
            ctx.beginPath()
            ctx.moveTo(cx - 8, groundY - 200)
            ctx.lineTo(cx + 32, groundY - 265)
            ctx.lineTo(cx + 73, groundY - 200)
            ctx.fill()

            ctx.beginPath()
            ctx.moveTo(cx + 267, groundY - 200)
            ctx.lineTo(cx + 307, groundY - 265)
            ctx.lineTo(cx + 348, groundY - 200)
            ctx.fill()

            ctx.beginPath()
            ctx.moveTo(cx + 115, groundY - 255)
            ctx.lineTo(cx + 170, groundY - 340)
            ctx.lineTo(cx + 225, groundY - 255)
            ctx.fill()

            // Tiang & Bendera Kerajaan Berkibar
            ctx.fillStyle = '#f1c40f'
            ctx.fillRect(cx + 168, groundY - 375, 4, 35)
            ctx.fillStyle = currentTheme.banner
            ctx.beginPath()
            ctx.moveTo(cx + 172, groundY - 373)
            ctx.lineTo(cx + 204, groundY - 365 + wave)
            ctx.lineTo(cx + 172, groundY - 355)
            ctx.fill()

            // Gerbang Utama Istana
            ctx.fillStyle = '#2f3640'
            ctx.beginPath()
            ctx.arc(cx + 170, groundY - 55, 26, Math.PI, 0)
            ctx.lineTo(cx + 196, groundY)
            ctx.lineTo(cx + 144, groundY)
            ctx.fill()

            // Jendela Istana Bercahaya
            ctx.fillStyle = currentTheme.window
            ctx.fillRect(cx + 24, groundY - 170, 16, 28)
            ctx.fillRect(cx + 300, groundY - 170, 16, 28)
            ctx.fillRect(cx + 160, groundY - 220, 20, 34)
        }
    },

    position: function() {
        if (gameState.current == gameState.play) {
            this.xClouds = (this.xClouds - 0.25) % 420
            this.xMountains = (this.xMountains - 0.5) % 480
            this.xCastle = (this.xCastle - 1.1) % 920
        }
    }
}

// 2. OBSTACLES: Benteng Kerajaan + Benteng Bergerak + Bola Meriam
let pipes = {
    w: 78,
    gap: 152,
    dx: 4.2,
    pipeGenerator: [],
    cannonballs: [],

    reset: function() {
        this.pipeGenerator = []
        this.cannonballs = []
    },

    drawCastleTower: function(x, y, height, isTop, isMoving) {
        if (height <= 0) return

        // Badan Tembok Benteng Batu Kerajaan
        ctx.fillStyle = isMoving ? '#8c7ae6' : '#bdc3c7'
        ctx.fillRect(x + 6, y, this.w - 12, height)

        // Sisi Bayangan Benteng
        ctx.fillStyle = isMoving ? '#7158e2' : '#95a5a6'
        ctx.fillRect(x + this.w - 20, y, 14, height)

        ctx.strokeStyle = '#2c3e50'
        ctx.lineWidth = 2
        ctx.strokeRect(x + 6, y, this.w - 12, height)

        // Garis susunan batu bata benteng
        ctx.strokeStyle = 'rgba(44, 62, 80, 0.35)'
        for (let by = y + 25; by < y + height - 20; by += 26) {
            ctx.beginPath()
            ctx.moveTo(x + 6, by)
            ctx.lineTo(x + this.w - 6, by)
            ctx.stroke()
        }

        // Panji Kerajaan di tengah benteng jika cukup tinggi
        if (height > 85) {
            let bannerY = y + height / 2 - 22
            ctx.fillStyle = '#c0392b'
            ctx.beginPath()
            ctx.moveTo(x + this.w / 2 - 12, bannerY)
            ctx.lineTo(x + this.w / 2 + 12, bannerY)
            ctx.lineTo(x + this.w / 2 + 12, bannerY + 32)
            ctx.lineTo(x + this.w / 2, bannerY + 42)
            ctx.lineTo(x + this.w / 2 - 12, bannerY + 32)
            ctx.closePath()
            ctx.fill()

            ctx.fillStyle = '#f1c40f'
            ctx.beginPath()
            ctx.arc(x + this.w / 2, bannerY + 18, 5, 0, Math.PI * 2)
            ctx.fill()
        }

        // Kepala Benteng (Battlement)
        let capH = Math.min(26, height)
        let capY = isTop ? (y + height - capH) : y
        ctx.fillStyle = isMoving ? '#9c88ff' : '#ecf0f1'
        ctx.fillRect(x, capY, this.w, capH)
        ctx.strokeStyle = '#2c3e50'
        ctx.strokeRect(x, capY, this.w, capH)

        // Gerigi Benteng Kerajaan (Crenellations)
        let merlonCount = 3
        let merlonW = 16
        let spacing = (this.w - merlonCount * merlonW) / (merlonCount + 1)
        ctx.fillStyle = isMoving ? '#f1c40f' : '#bdc3c7'

        for (let i = 0; i < merlonCount; i++) {
            let mx = x + spacing + i * (merlonW + spacing)
            let my = isTop ? (capY + capH) : (capY - 12)
            ctx.fillRect(mx, my, merlonW, 12)
            ctx.strokeRect(mx, my, merlonW, 12)
        }
    },

    render: function() {
        let ceilingBottom = getCeilingBottom()
        let groundTop = getGroundY()

        for (let i = 0; i < this.pipeGenerator.length; i++) {
            let p = this.pipeGenerator[i]
            let topHeight = p.gapY - ceilingBottom
            let botY = p.gapY + this.gap
            let botHeight = groundTop - botY

            this.drawCastleTower(p.x, ceilingBottom, topHeight, true, p.isMoving)
            this.drawCastleTower(p.x, botY, botHeight, false, p.isMoving)
        }

        for (let i = 0; i < this.cannonballs.length; i++) {
            let cb = this.cannonballs[i]
            ctx.save()
            ctx.translate(cb.x, cb.y)

            // Ekor api meriam
            ctx.fillStyle = '#e67e22'
            ctx.beginPath()
            ctx.moveTo(0, -8)
            ctx.lineTo(24 + Math.random() * 8, 0)
            ctx.lineTo(0, 8)
            ctx.fill()

            // Bola besi meriam
            ctx.fillStyle = '#2f3640'
            ctx.beginPath()
            ctx.arc(0, 0, cb.r, 0, Math.PI * 2)
            ctx.fill()
            ctx.strokeStyle = '#f1c40f'
            ctx.lineWidth = 2
            ctx.stroke()

            // Kilau logam
            ctx.fillStyle = '#7f8fa6'
            ctx.beginPath()
            ctx.arc(-4, -4, 3.5, 0, Math.PI * 2)
            ctx.fill()
            ctx.restore()
        }
    },

    position: function() {
        if (gameState.current !== gameState.play) return

        let minY = getCeilingBottom() + 55
        let maxY = getGroundY() - this.gap - 55

        // Spawn Benteng Baru
        let lastPipe = this.pipeGenerator[this.pipeGenerator.length - 1]
        if (!lastPipe || lastPipe.x <= cvs.width - 390) {
            let canMove = score.current >= 2 && Math.random() < 0.55
            let moveSpeed = (Math.random() * 1.1 + 0.9) * (Math.random() < 0.5 ? 1 : -1)

            this.pipeGenerator.push({
                x: cvs.width,
                gapY: Math.floor(Math.random() * (maxY - minY + 1)) + minY,
                passed: false,
                isMoving: canMove,
                vy: canMove ? moveSpeed : 0
            })

            if (score.current >= 4 && Math.random() < 0.45) {
                this.cannonballs.push({
                    x: cvs.width + 200,
                    y: Math.floor(Math.random() * (maxY - minY + 40)) + minY,
                    r: 12,
                    vx: this.dx + 2.4
                })
            }
        }

        // Update posisi & tabrakan Benteng
        for (let i = 0; i < this.pipeGenerator.length; i++) {
            let pg = this.pipeGenerator[i]
            pg.x -= this.dx

            if (pg.isMoving) {
                pg.gapY += pg.vy
                if (pg.gapY <= minY || pg.gapY >= maxY) {
                    pg.vy *= -1
                }
            }

            if (!pg.passed && pg.x + this.w < dragon.x) {
                pg.passed = true
                score.current++
                score.updateBest()
                playSFX(SFX_SCORE)
            }

            if (pg.x < -this.w - 30) {
                this.pipeGenerator.shift()
                i--
                continue
            }

            let dLeft = dragon.x - dragon.r
            let dRight = dragon.x + dragon.r
            let dTop = dragon.y - dragon.r
            let dBottom = dragon.y + dragon.r

            if (dRight > pg.x + 4 && dLeft < pg.x + this.w - 4) {
                if (dTop < pg.gapY + 8 || dBottom > pg.gapY + this.gap - 8) {
                    score.loseLife()
                    playSFX(SFX_COLLISION)
                    stopAllBGM()
                    return
                }
            }
        }

        // Update posisi & tabrakan Bola Meriam Bergerak
        for (let i = 0; i < this.cannonballs.length; i++) {
            let cb = this.cannonballs[i]
            cb.x -= cb.vx
            cb.y += Math.sin(frame * 0.08 + i) * 1.5

            if (cb.x < -30) {
                this.cannonballs.splice(i, 1)
                i--
                continue
            }

            let dx = dragon.x - cb.x
            let dy = dragon.y - cb.y
            let dist = Math.sqrt(dx * dx + dy * dy)
            if (dist < dragon.r + cb.r - 2) {
                score.loseLife()
                playSFX(SFX_COLLISION)
                stopAllBGM()
                return
            }
        }
    }
}

// 3. GROUND & CEILING: Jalan Batu Kerajaan & Obor Api Emas
let ground = {
    x: 0,
    dx: 4.2,

    drawRoyalTorch: function(tx, ty) {
        ctx.fillStyle = '#4a3525'
        ctx.fillRect(tx - 3, ty, 6, 36)
        ctx.fillStyle = '#f1c40f'
        ctx.fillRect(tx - 6, ty - 3, 12, 5)

        let flicker = Math.sin(frame * 0.25 + tx) * 3.5
        ctx.fillStyle = 'rgba(243, 156, 18, 0.28)'
        ctx.beginPath()
        ctx.arc(tx, ty - 14, 24 + flicker, 0, Math.PI * 2)
        ctx.fill()

        ctx.fillStyle = '#e67e22'
        ctx.beginPath()
        ctx.moveTo(tx - 8, ty - 3)
        ctx.quadraticCurveTo(tx - 10, ty - 20, tx + flicker * 0.5, ty - 32 - flicker)
        ctx.quadraticCurveTo(tx + 10, ty - 20, tx + 8, ty - 3)
        ctx.fill()

        ctx.fillStyle = '#fff200'
        ctx.beginPath()
        ctx.arc(tx, ty - 10, 4.5, 0, Math.PI * 2)
        ctx.fill()
    },

    render: function() {
        let groundY = getGroundY()
        let groundH = getGroundHeight()
        let barY = cvs.height - getBottomBarHeight()

        // Langit-langit Batu Kerajaan
        ctx.fillStyle = '#7f8fa6'
        ctx.fillRect(0, 30, cvs.width, 14)
        ctx.strokeStyle = '#2f3640'
        ctx.lineWidth = 2
        ctx.strokeRect(0, 30, cvs.width, 14)

        // Obor Kerajaan & Semak Taman Istana
        let segmentW = 280
        let count = Math.ceil(cvs.width / segmentW) + 2
        for (let i = -1; i < count; i++) {
            let baseX = this.x + i * segmentW
            this.drawRoyalTorch(baseX + 75, groundY - 36)
            this.drawRoyalTorch(baseX + 215, groundY - 36)

            ctx.fillStyle = '#27ae60'
            ctx.beginPath()
            ctx.arc(baseX + 142, groundY - 6, 12, Math.PI, 0)
            ctx.arc(baseX + 154, groundY - 5, 10, Math.PI, 0)
            ctx.fill()
        }

        // Jalan Batu Kerajaan (Cobblestone)
        ctx.fillStyle = '#7f8c8d'
        ctx.fillRect(0, groundY, cvs.width, groundH)

        // Lis Rumput Hijau di atas jalan batu
        ctx.fillStyle = '#2ecc71'
        ctx.fillRect(0, groundY, cvs.width, 6)

        ctx.strokeStyle = '#2c3e50'
        ctx.lineWidth = 2
        let rowH = groundH / 3
        for (let row = 0; row < 3; row++) {
            let by = groundY + row * rowH
            ctx.beginPath()
            ctx.moveTo(0, by); ctx.lineTo(cvs.width, by)
            ctx.stroke()

            let offset = (row % 2) * 24
            for (let bx = this.x - 48 + offset; bx < cvs.width + 48; bx += 48) {
                ctx.beginPath()
                ctx.moveTo(bx, by); ctx.lineTo(bx, by + rowH)
                ctx.stroke()
            }
        }

        // Panel Kontrol Bawah Kerajaan
        // 1. Background & garis pembatas atas
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(0, barY, cvs.width, getBottomBarHeight());
        
        ctx.strokeStyle = '#f1c40f';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, barY);
        ctx.lineTo(cvs.width, barY);
        ctx.stroke();

        // Pengaturan font global untuk bar bawah
        ctx.font = 'bold 15px "Courier New", monospace';

        // 2. Kolom Kiri: [PRESS SPACE TO FLY]
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText('[PRESS SPACE TO FLY]', 24, barY + 30);

        // 3. Kolom Tengah: Ikon Panah Atas + [PRESS ARROW UP TO FLY]
        const arrowText = '[PRESS ARROW UP TO FLY]';
        const iconSize = 22;
        const gap = 8;
        const textWidth = ctx.measureText(arrowText).width;
        const totalCenterWidth = iconSize + gap + textWidth;
        
        // Menghitung posisi agar gabungan ikon & teks pas di tengah canvas
        const btnX = (cvs.width - totalCenterWidth) / 2;

        ctx.fillStyle = '#2f3640';
        ctx.fillRect(btnX, barY + 13, iconSize, iconSize);
        ctx.strokeStyle = '#f1c40f';
        ctx.strokeRect(btnX, barY + 13, iconSize, iconSize);

        ctx.fillStyle = '#f1c40f';
        ctx.beginPath();
        ctx.moveTo(btnX + 11, barY + 18);
        ctx.lineTo(btnX + 6, barY + 27);
        ctx.lineTo(btnX + 16, barY + 27);
        ctx.closePath();
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';
        ctx.fillText(arrowText, btnX + iconSize + gap, barY + 30);

        // 4. Kolom Kanan: [PRESS CLICK TO PLAY]
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'right';
        ctx.fillText('[PRESS CLICK TO PLAY]', cvs.width - 24, barY + 30);
    },

    position: function() {
        if (gameState.current == gameState.play) {
            this.x = (this.x - this.dx) % 280
        }
    }
}

// 4. HUD ATAS: SCORE, BEST SCORE, & LIVES
let score = {
    current: 0,
    best: parseInt(localStorage.getItem('royalDragonHighScore')) || 0,
    lives: 2,
    maxLives: 2,

    reset: function() {
        this.current = 0
        this.lives = this.maxLives
    },

    updateBest: function() {
        if (this.current > this.best) {
            this.best = this.current
            localStorage.setItem('royalDragonHighScore', this.best)
        }
    },

    loseLife: function() {
        if (this.lives > 0) {
            this.lives--
        }
        gameState.current = gameState.gameOver
    },

    render: function() {
        ctx.fillStyle = '#1e272e'
        ctx.fillRect(0, 0, cvs.width, 30)

        ctx.fillStyle = '#f1c40f'
        ctx.font = 'bold 18px "Courier New", monospace'
        ctx.textAlign = 'left'

        let formattedScore = String(this.current).padStart(3, '0')
        let formattedBest = String(this.best).padStart(3, '0')
        ctx.fillText('SCORE: ' + formattedScore + '  |  BEST: ' + formattedBest, 20, 21)

        // Kotak Ikon Hati Merah
        ctx.fillStyle = '#2f3640'
        ctx.fillRect(20, 36, 24, 22)
        ctx.strokeStyle = '#f1c40f'
        ctx.lineWidth = 1.5
        ctx.strokeRect(20, 36, 24, 22)

        ctx.fillStyle = this.lives > 0 ? '#e84118' : '#576574'
        ctx.beginPath()
        ctx.arc(29, 45, 4, 0, Math.PI * 2)
        ctx.arc(35, 45, 4, 0, Math.PI * 2)
        ctx.moveTo(25, 46)
        ctx.lineTo(32, 54)
        ctx.lineTo(39, 46)
        ctx.fill()

        // Health Bar Dinamis sesuai sisa nyawa
        ctx.fillStyle = '#2f3640'
        ctx.fillRect(48, 40, 100, 14)
        ctx.strokeRect(48, 40, 100, 14)
        let hpWidth = (this.lives / this.maxLives) * 96
        ctx.fillStyle = this.lives === 1 ? '#f39c12' : '#e84118'
        ctx.fillRect(50, 42, hpWidth, 10)

        // Teks Sisa Nyawa
        ctx.fillStyle = '#ffffff'
        ctx.font = 'bold 12px "Courier New", monospace'
        ctx.fillText('LIVES: ' + this.lives + '/' + this.maxLives, 156, 51)
    }
}

// 5. PLAYER CHARACTER: FIRE DRAGON (Fly 10f, Breath 48f, Death 66f)
let dragon = {
    fr: 0,
    breathFrame: 24,
    deathFrame: 0,
    x: Math.max(220, window.innerWidth * 0.25),
    y: window.innerHeight * 0.45,
    r: 15,   // Radius hitbox inti badan naga
    w: 128,  // Lebar tampilan sel (rasio 213:120)
    h: 72,   // Tinggi tampilan sel
    fly: 6.2,
    gravity: 0.34,
    velocity: 0,
    rotation: 0,
    fireTimer: 0,

    // Spesifikasi grid seragam untuk ketiga sheet (1704px / 8 kolom = 213px)
    cellW: 213,
    cellH: 120,
    cols: 8,
    flyTotalFrames: 10,
    deathTotalFrames: 66,

    render: function() {
        ctx.save()
        ctx.translate(this.x, this.y)
        ctx.imageSmoothingEnabled = false

        // Efek garis angin saat melayang atau bermain
        if (gameState.current === gameState.play || gameState.current === gameState.getReady) {
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
            ctx.lineWidth = 1.5
            ctx.beginPath()
            ctx.moveTo(-26, -6); ctx.quadraticCurveTo(-40, -2, -48, 8)
            ctx.moveTo(-24, 8); ctx.quadraticCurveTo(-36, 14, -44, 18)
            ctx.stroke()
        }

        // Tentukan sprite sheet, nomor frame, dan pergeseran posisi badan
        let activeSheet = DRAGON_FLY_SHEET
        let frameIndex = this.fr
        let offsetX = 0

        if (gameState.current === gameState.gameOver) {
            activeSheet = DRAGON_DEATH_SHEET
            frameIndex = this.deathFrame
        } else {
            ctx.rotate(this.rotation)
            if (this.fireTimer > 0 && gameState.current === gameState.play) {
                activeSheet = DRAGON_BREATH_SHEET
                frameIndex = this.breathFrame
                offsetX = 24 // Menjaga posisi badan naga tetap sejajar saat api memanjang ke kanan
            }
        }

        // Hitung koordinat potong (sX, sY) pada grid 8 kolom
        let col = frameIndex % this.cols
        let row = Math.floor(frameIndex / this.cols)
        let sX = col * this.cellW
        let sY = row * this.cellH

        if (activeSheet.complete && activeSheet.naturalWidth > 0) {
            ctx.drawImage(
                activeSheet,
                sX, sY, this.cellW, this.cellH,
                (-this.w / 2) + offsetX, -this.h / 2, this.w, this.h
            )
        }

        ctx.restore()
    },

    flap: function() {
        this.velocity = -this.fly
        this.fireTimer = 20
        this.breathFrame = 24 // Mulai langsung pada frame semburan api keluar
    },

    position: function() {
        this.x = Math.max(220, cvs.width * 0.25)

        if (this.fireTimer > 0) {
            this.fireTimer--
            if (this.breathFrame < 43) {
                this.breathFrame++
            }
        }

        if (gameState.current == gameState.gateScreen ||
            gameState.current == gameState.startScreen ||
            gameState.current == gameState.getReady ||
            gameState.current == gameState.watchingAd) {
            this.y = (cvs.height * 0.45) + Math.sin(frame * 0.08) * 8
            this.rotation = 0
            this.deathFrame = 0
            this.fireTimer = 0
            if (frame % 5 == 0) this.fr = (this.fr + 1) % this.flyTotalFrames
        } else {
            this.velocity += this.gravity
            this.y += this.velocity

            if (gameState.current === gameState.gameOver) {
                this.rotation = 0
                this.fireTimer = 0
                if (this.deathFrame < this.deathTotalFrames - 1) {
                    this.deathFrame++
                }
            } else {
                this.deathFrame = 0
                if (frame % 3 == 0) this.fr = (this.fr + 1) % this.flyTotalFrames

                if (this.velocity <= this.fly) {
                    this.rotation = -15 * degree
                } else if (this.velocity >= this.fly + 2) {
                    this.rotation = 55 * degree
                    this.fr = 4
                } else {
                    this.rotation = 0
                }
            }

            let groundY = getGroundY()
            if (this.y + this.r >= groundY) {
                this.y = groundY - this.r
                if (gameState.current == gameState.play) {
                    score.loseLife()
                    playSFX(SFX_FALL)
                    stopAllBGM()
                }
            }

            let ceilingBottom = getCeilingBottom()
            if (this.y - this.r <= ceilingBottom) {
                this.y = ceilingBottom + this.r
                this.velocity = 0
            }
        }
    }
}

// 6. OVERLAY STATUS
let overlayUI = {
    render: function() {
        ctx.textAlign = 'center'
        let centerX = cvs.width / 2
        let centerY = cvs.height / 2

        if (gameState.current == gameState.gameOver) {
            let boxH = score.lives > 0 ? 225 : 190
            ctx.fillStyle = 'rgba(15, 20, 38, 0.92)'
            ctx.fillRect(centerX - 190, centerY - 105, 380, boxH)
            ctx.strokeStyle = '#f1c40f'
            ctx.lineWidth = 3
            ctx.strokeRect(centerX - 190, centerY - 105, 380, boxH)

            ctx.fillStyle = '#e74c3c'
            ctx.font = 'bold 34px "Courier New", monospace'
            ctx.fillText('GAME OVER', centerX, centerY - 55)

            ctx.fillStyle = '#f1c40f'
            ctx.font = 'bold 16px "Courier New", monospace'
            ctx.fillText(
                'SCORE: ' + score.current + ' | SISA NYAWA: ' + score.lives,
                centerX,
                centerY - 22
            )

            gameOverButtons.render()
            if (description) description.style.visibility = 'visible'
        }
    }
}

/************************
***** GAME LOOP: ********
************************/
let draw = () => {
    bg.render()
    pipes.render()
    ground.render()
    dragon.render()
    score.render()
    overlayUI.render()
    startButton.render()
    adScreen.render()
}

let update = () => {
    dragon.position()
    bg.position()
    pipes.position()
    ground.position()
    adScreen.update()
}

let loop = () => {
    draw()
    update()
    frame++
}
setInterval(loop, 17)

/*************************
***** EVENT HANDLERS *****
*************************/
function handleAction() {
    unlockAllAudio()
    if (gameState.current == gameState.getReady) {
        gameState.current = gameState.play
        if (BGM_GAMEPLAY.paused) {
            playGameplayBGM()
        }
    }
    if (gameState.current == gameState.play) {
        dragon.flap()
        playSFX(SFX_FLAP)
        if (description) description.style.visibility = 'hidden'

        // Sembunyikan tulisan DRACOFLY saat game mulai
        document.querySelectorAll('h1, .title, #title, .logo, #logo').forEach(el => {
            el.style.display = 'none'
        })
    }
}

// Efek hover pointer untuk layar gerbang, tombol START, GAME OVER, maupun tombol INSTAGRAM
cvs.addEventListener('mousemove', (e) => {
    let rect = cvs.getBoundingClientRect()
    let mouseX = e.clientX - rect.left
    let mouseY = e.clientY - rect.top

    if (gameState.current === gameState.gateScreen) {
        cvs.style.cursor = 'pointer'
    } else if (gameState.current === gameState.startScreen) {
        let bx = startButton.getX()
        let by = startButton.getY()
        cvs.style.cursor = (mouseX >= bx && mouseX <= bx + startButton.w &&
                            mouseY >= by && mouseY <= by + startButton.h)
                            ? 'pointer' : 'default'
    } else if (gameState.current === gameState.gameOver) {
        let overRetry = score.lives > 0 && gameOverButtons.isInside(mouseX, mouseY, gameOverButtons.getRetryRect())
        let overHome = gameOverButtons.isInside(mouseX, mouseY, gameOverButtons.getHomeRect())
        cvs.style.cursor = (overRetry || overHome) ? 'pointer' : 'default'
    } else if (gameState.current === gameState.watchingAd) {
        // Ubah kursor jadi pointer saat diarahkan ke tombol Instagram
        cvs.style.cursor = adScreen.isInsideIgButton(mouseX, mouseY) ? 'pointer' : 'default'
    } else {
        cvs.style.cursor = 'default'
    }
})

cvs.addEventListener('click', (e) => {
    // 0. Layar Gerbang Awal -> Buka kunci audio & putar musik Main Menu
    if (gameState.current == gameState.gateScreen) {
        unlockAllAudio()
        gameState.current = gameState.startScreen
        playSFX(SFX_SWOOSH)
        playMenuBGM()
        return
    }

    let rect = cvs.getBoundingClientRect()
    let clickX = e.clientX - rect.left
    let clickY = e.clientY - rect.top

    // 1. Layar Iklan (Cek apakah tombol Instagram diklik)
    if (gameState.current == gameState.watchingAd) {
        if (adScreen.isInsideIgButton(clickX, clickY)) {
            window.open(adScreen.instagramUrl, '_blank', 'noopener,noreferrer')
        }
        return
    }

    // 2. Layar Main Menu -> Masuk Gameplay
    if (gameState.current == gameState.startScreen) {
        let bx = startButton.getX()
        let by = startButton.getY()

        if (clickX >= bx && clickX <= bx + startButton.w &&
            clickY >= by && clickY <= by + startButton.h) {
            unlockAllAudio()
            score.reset()
            pipes.reset()
            gameState.current = gameState.getReady
            cvs.style.cursor = 'default'
            playSFX(SFX_SWOOSH)
            playGameplayBGM()
        }
        return
    }

    // 3. Layar Game Over (Pilih Continue Nonton Iklan atau Kembali ke Home)
    if (gameState.current == gameState.gameOver) {
        if (score.lives > 0 && gameOverButtons.isInside(clickX, clickY, gameOverButtons.getRetryRect())) {
            cvs.style.cursor = 'default'
            adScreen.start()
            return
        }

        if (gameOverButtons.isInside(clickX, clickY, gameOverButtons.getHomeRect())) {
            pipes.reset()
            score.reset()
            cvs.style.cursor = 'default'
            gameState.current = gameState.startScreen
            playSFX(SFX_SWOOSH)
            playMenuBGM()

            // Munculkan kembali tulisan DRACOFLY saat kembali ke Home
            document.querySelectorAll('h1, .title, #title, .logo, #logo').forEach(el => {
                el.style.display = 'block'
            })
            return
        }
        return
    }

    // 4. Saat GetReady / Play
    handleAction()
})

document.body.addEventListener('keydown', (e) => {
    if (gameState.current == gameState.gateScreen) {
        e.preventDefault()
        unlockAllAudio()
        gameState.current = gameState.startScreen
        playSFX(SFX_SWOOSH)
        playMenuBGM()
        return
    }

    if (gameState.current == gameState.startScreen ||
        gameState.current == gameState.gameOver ||
        gameState.current == gameState.watchingAd) return

    if (e.code === 'Space' || e.code === 'ArrowUp' || e.keyCode === 32 || e.keyCode === 38) {
        e.preventDefault()
        handleAction()
    }
})