// 处理同源插件移除

// 错误名称更正
if (config.getItem("ext").playerMode != null) {
    const extData = config.getItem("ext");
    delete extData.playerMode;
    config.setItem("ext", extData);
    location.reload();
}

// 旧版歌词模式移除
if (config.getItem("ext").lyricsMode != null) {
    const extData = config.getItem("ext");
    delete extData.lyricsMode;
    config.setItem("ext", extData);
    location.reload();
}

var style = `
.playerContainer {
    margin: 20px max(calc(50vw - 700px), 110px);
}

#playPage {
    background: black;
}

.controls,.hideLyrics.hideList .controls {
    width: calc(100vw* 0.4);
    margin: auto 0 15% 0;
}

.controls #album {
    width: calc(100vw* 0.20);
}

.controls .infoBar {
    margin: 30px 0 10px 0;
}

.controls .musicInfo b {
    font-size: 3.0em;
    white-space: break-spaces;
}

.controls .musicInfo div {
    margin-top: 20px;
}

.lyrics , .list {
    left: calc(100vw* 0.45);
    width: calc(100vw* 0.4);
    height: calc(100% - 60px);
}

.controls .buttons {
    position: fixed;
    bottom: -10px;
    left: -8%;
    width: 100vw;
    display: none;
}

.darkPlayer #playPage .SimProgress {
    position: fixed;
    bottom: 60px;
    left: -65px;
    width: 100vw;
}

.bottom > .center > #ExPlayerMenuBtn{
    display: none;
} 

.bottom > .center > #ExPlayerLyricsBtn{
    display: none;
}

.playerShown > .bottom {
    bottom: 0;
    background: transparent;
    z-index: 100;
    color: var(--SimAPTheme);
    transition: all .3s;
}

.playerShown > .bottom > .progressBefore {
    display: none;
}

.playerShown > .bottom > .progressAfter {
    display: none;
}

.playerShown > .bottom > .info {
    display: none;
}

.playerShown .SimProgress {
    opacity: 0.6;
}

.playerShown .SimProgress::hover {
    opacity: 1;
}

.playerShown .SimProgress>div>div {
    background: var(--SimAPTheme) !important;
}

.playerShown .SimProgress:not(.readOnly)::after {
    background: var(--SimAPTheme) !important;
    display: none;
}

.playerShown .SimProgress:not(.readOnly):hover::after {
    background: var(--SimAPTheme) !important;
    display: none;
}

.bottom > .center > #ExPlayerMenuBtn{
    display: none;
} 

.playerShown > .bottom > .center > #ExPlayerMenuBtn{
    display: block;
} 

.playerShown > .bottom > .center > #ExPlayerLyricsBtn{
    display: block;
} 

.playerShown > .bottom > .center> .play {
    font-size: 1.8em;
    margin-top: 0:
}

.playerShown > .bottom > .center.hidden > div:not(.ignoreHide),.playerShown > .bottom > .volume.hidden > div:not(.ignoreHide) {
    opacity: 0;
}

.playerShown > .bottom > .volBtnBottom {
    top: 0;
}

#ExPlayerPlayTime {
    color: unset;
}

.playerShown > #ExPlayerPlayTime {
    color: white;
}

.controls .progressControl {
    display: none;
}

.controls .infoBar i {
    display: none;
}

#background {
    display: none;
}

.ExPlayerBtn {
    font-size: 1.6em;
    transition: all .3s;
    opacity: .3;
    color: var(--SimAPTheme);
    z-index: 9999;
    -webkit-app-region: no-drag;
}

.ExPlayerBtn:hover {
    opacity: .8;
}

.ExPlayerBtn:active {
    opacity: .8;
    transform: scale(0.9);
}
`;

let backgroundRule = document.createElement('style');
backgroundRule.id = 'ExPlayerPageBg';
document.head.appendChild(backgroundRule);

let albumObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.attributeName === 'src') {
            let albumSrc = document.querySelector('.controls #album')?.src;
            setBackground(albumSrc);
        }
    });
});

let fullscreenObserver = new MutationObserver(() => {
    let isFullscreen = document.body.classList.contains("fullscreen");
    let fullToggleBtn = document.querySelector('#ExPlayerFulldBtn');
    if (fullToggleBtn) {
        document.querySelector('#ExPlayerFoldBtn').style.display = isFullscreen ? 'none' : 'block';
        fullToggleBtn.style.left = isFullscreen ? '30px' : '80px';
    }
});

let progressObserver = new MutationObserver(() => {
    let currentTime = document.querySelector('#progressCurrent')?.innerHTML;
    let totalTime = document.querySelector('#progressDuration')?.innerHTML;
    let playTimeElement = document.querySelector('#ExPlayerPlayTime');
    if (playTimeElement) {
        playTimeElement.innerHTML = `${currentTime} / ${totalTime}`;
    }
})

function setBackground(albumSrc) {
    if (albumSrc) {
        backgroundRule.textContent = `
                            #playPage::before {
                                content: '';
                                position: absolute;
                                top: 0;
                                left: 0;
                                width: 100%;
                                height: 100%;
                                background: url(${albumSrc}) center/cover;
                                filter: blur(70px) brightness(0.6);
                                z-index: -1;
                            }
                        `;
    }
}

const current = document.getElementById("progressCurrent");
const duration = document.getElementById("progressDuration");

function addButton() {

    let lyricsBtn = document.createElement('div');
    lyricsBtn.onclick = () => SimAPControls.toggleLyrics();
    lyricsBtn.style.position = 'fixed';
    lyricsBtn.style.left = '55px';
    lyricsBtn.className = 'large';
    lyricsBtn.id = 'ExPlayerLyricsBtn';
    lyricsBtn.title = '显示歌词';
    let lyricsIcon = document.createElement('i');
    lyricsIcon.innerHTML = '';
    lyricsBtn.appendChild(lyricsIcon);
    document.querySelector('.bottom > .center')?.insertAdjacentElement('afterbegin', lyricsBtn);

    let menuBtn = document.createElement('div');
    menuBtn.onclick = () => PlayerController.showPlayerMenu();
    menuBtn.style.position = 'fixed';
    menuBtn.style.left = '15px';
    menuBtn.className = 'large';
    let menuIcon = document.createElement('i');
    menuIcon.innerHTML = '';
    menuBtn.appendChild(menuIcon);
    menuBtn.id = 'ExPlayerMenuBtn';
    menuBtn.title = '播放器菜单';
    menuBtn.classList.add('ignoreHide');
    menuBtn.visibility = 'visible';
    document.querySelector('.bottom > .center')?.insertAdjacentElement('afterbegin', menuBtn);

    let foldBtn = document.createElement('div');
    foldBtn.onclick = () => SimAPUI.hide();
    foldBtn.style.position = 'absolute';
    foldBtn.style.left = '30px';
    foldBtn.style.top = '30px';
    let foldIcon = document.createElement('i');
    foldIcon.innerHTML = '';
    foldBtn.appendChild(foldIcon);
    foldBtn.className = 'ExPlayerBtn';
    foldBtn.id = 'ExPlayerFoldBtn';
    foldBtn.title = '收起播放页';
    document.querySelector('#playPage')?.insertAdjacentElement('afterbegin', foldBtn);

    let fullToogleBtn = document.createElement('div');
    fullToogleBtn.onclick = () => {
        SimAPUI.toggleFullScreen();
        fullToogleBtn.firstChild.innerHTML = document.body.classList.contains("fullscreen") ? '' : '';
    };
    let fullToggleIcon = document.createElement('i');
    fullToggleIcon.innerHTML = document.body.classList.contains("fullscreen") ? '' : '';
    fullToogleBtn.appendChild(fullToggleIcon);
    fullToogleBtn.style.position = 'absolute';
    fullToogleBtn.style.left = '80px';
    fullToogleBtn.style.top = '30px';
    fullToogleBtn.className = 'ExPlayerBtn';
    fullToogleBtn.id = 'ExPlayerFulldBtn';
    fullToogleBtn.title = document.body.classList.contains("fullscreen") ? "退出全屏" : "播放页全屏";
    document.querySelector('#playPage')?.insertAdjacentElement('afterbegin', fullToogleBtn);

    let playTime = document.createElement('div');
    playTime.style.position = 'absolute';
    playTime.style.right = '190px';
    playTime.style.top = '34px';
    playTime.className = 'ExPlayerBtn';
    playTime.id = 'ExPlayerPlayTime';
    playTime.style.fontSize = '0.8em';
    playTime.innerHTML = '';
    document.querySelector('.bottom')?.insertAdjacentElement('afterbegin', playTime);
}

function deleteButton() {
    document.querySelector('#ExPlayerMenuBtn')?.remove();
    document.querySelector('#ExPlayerLyricsBtn')?.remove();
    document.querySelector('#ExPlayerFoldBtn')?.remove();
    document.querySelector('#ExPlayerFulldBtn')?.remove();
    document.querySelector('#ExPlayerPlayTime')?.remove();
}

function loadStyles() {
    config.setItem("darkPlayer", true);
    let styles = "";
    if (config.getItem("ext.playerPage.isEffect") == true) {
        if (config.getItem("ext.playerPage.isEffect") == true && config.getItem("darkPlayer") == false) {
            alert("请在设置中启用播放页深色模式以继续使用「播放页面」插件！");
            config.setItem("ext.playerPage.isEffect", false);
        }
        styles = style;
        let albumElement = document.querySelector('.controls #album');
        if (albumElement) {
            albumObserver.observe(albumElement, { attributes: true });
        }
        let albumSrc = document.querySelector('.controls #album')?.src;
        setBackground(albumSrc);
        fullscreenObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
        let progressCurrentElement = document.querySelector('#progressCurrent');
        let progressDurationElement = document.querySelector('#progressDuration');
        if (progressCurrentElement) {
            progressObserver.observe(progressCurrentElement, { childList: true, subtree: true });
        }
        if (progressDurationElement) {
            progressObserver.observe(progressDurationElement, { childList: true, subtree: true });
        }
        addButton();
        includeStyleElement(styles, "ExPlayerPage");
    } else {
        albumObserver.disconnect();
        fullscreenObserver.disconnect();
        progressObserver.disconnect();
        document.querySelector("#ExPlayerPage")?.remove();
        deleteButton();
    }

}

defaultConfig['ext.playerPage.isEffect'] = true;
defaultConfig['ext.playerPage.autoHideBottom'] = true;

SettingsPage.data.push(
    { type: "title", text: "[第三方扩展] 播放页面" },
    { type: "boolean", text: "启用修改的播放页面", description: "开启后将更改播放页面使其更加美观", configItem: "ext.playerPage.isEffect" },
    { type: "boolean", text: "播放页自动隐藏播放控件", description: "开启后在播放页超过3秒无操作则隐藏部分底栏", configItem: "ext.playerPage.autoHideBottom" },
    { type: "button", text: "逐字歌词功能自动启用", description: "逐字歌词暂不支持自行开启/改变，未来可能添加", configItem: "ext.playerPage.autoHideBottom" },
);

config.listenChange("ext.playerPage.isEffect", () => loadStyles());
config.listenChange("darkPlayer", () => {
    setTimeout(() => {
        config.setItem("darkPlayer", true);
    }, 1000);
});
loadStyles();

// 歌词载入


// 自动隐藏
let inactivityTimer;
const INACTIVITY_THRESHOLD = 3000; // 3秒
function onInactivity() {
    if (!document.body.classList.contains('playerShown')) return;
    document.querySelector('.bottom > .center').style.visibility = 'hidden';
    document.querySelector('.bottom > .volume').style.visibility = 'hidden';
    document.querySelector('#bottomProgressBar').style.top = 'auto';
    document.querySelector('#bottomProgressBar').style.bottom = '0';
    document.querySelector('.bottom > .center > .play').style.visibility = 'visible';
    document.querySelector('.bottom > .center > .play').classList.add('ignoreHide');
    document.querySelector('.bottom > .center > #ExPlayerMenuBtn').style.visibility = 'visible';
    document.querySelector('.bottom > .center').classList.add('hidden');
    document.querySelector('.bottom > .volume').classList.add('hidden');
    document.querySelector('.bottom').style.backdropFilter = 'blur(0px)';
    document.querySelector('#ExPlayerPlayTime').style.right = '30px';
    document.hasInactivity = true;
}
function onActivity() {
    document.querySelector('#bottomProgressBar').style.top = '0';
    document.querySelector('#bottomProgressBar').style.bottom = 'auto';
    document.querySelector('.bottom > .volume').style.visibility = 'visible';
    document.querySelector('.bottom > .center').style.visibility = 'visible';
    document.querySelector('.bottom').style.backdropFilter = 'blur(70px)';
    document.querySelector('.bottom > .center').classList.remove('hidden');
    document.querySelector('.bottom > .volume').classList.remove('hidden');
    document.querySelector('.bottom > .center > #ExPlayerMenuBtn').style.visibility = 'visible';
    document.querySelector('#ExPlayerPlayTime').style.right = '190px';
}
function resetTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(onInactivity, INACTIVITY_THRESHOLD);
}
function setupActivityListeners() {
    document.addEventListener('mousemove', handleUserActivity);
    document.addEventListener('mousedown', handleUserActivity);
    document.addEventListener('mouseup', handleUserActivity);
    document.addEventListener('click', handleUserActivity);
    document.addEventListener('wheel', handleUserActivity); // 滚轮事件
}
function handleUserActivity() {
    if (config.getItem('ext.playerPage.autoHideBottom') == false) {
        onActivity();
        return;
    }
    if (!document.body.classList.contains('playerShown')) {
        document.hasInactivity = true;
        onActivity();
        return;
    }
    if (document.hasInactivity) {
        onActivity();
        document.hasInactivity = false;
    }
    resetTimer();
}

document.hasInactivity = false;
resetTimer();
setupActivityListeners();