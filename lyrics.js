let lastHandle = 0;


// includeStyleElement(`
//     .WBWline {

//     }

//     `, "WBWLyricsStyle");

const observerForElement = new MutationObserver((mutationsList, observer) => {
    mutationsList.forEach((mutation) => {
        if (mutation.type === 'childList') {
            const targetElement = document.querySelector('.SimLRC');
            if (targetElement) {
                observer.disconnect();
                let debounceTimeout;
                startReplaceElement();
                const lyricsObserver = new MutationObserver((lyricsMutations) => {
                    if (debounceTimeout) clearTimeout(debounceTimeout);
                    debounceTimeout = setTimeout(() => {
                        lyricsMutations.forEach((lyricsMutation) => {
                            if (lyricsMutation.type === 'childList') {
                                startReplaceElement();
                                console.log('歌词元素发生变化，重新加载逐字歌词');
                            }
                        });
                    }, 500);
                });
                lyricsObserver.observe(targetElement, {
                    childList: true,
                    subtree: true,
                    characterData: true
                });
                window.lyricsObserver = lyricsObserver;
            }
        }
    });
});

// 初始观察器的配置
observerForElement.observe(document.body, {
    childList: true,
    subtree: true
});

function postApiArray(apiUrl, callback) {
    fetch(apiUrl)
        .then(response => response.json())
        .then(data => callback(data))
        .catch(error => {
            console.error('API请求错误:', error);
            callback(null);
        });
}

function parseYRC(yrcStr) {
    try {
        const lines = yrcStr.split('\n').filter(line => line.trim() !== '');
        const result = [];

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            try {
                let parsedLine;
                try {
                    // JSON
                    parsedLine = JSON.parse(line);
                } catch (jsonError) {
                    // 正则
                    const match = line.match(/^\[(\d+),(\d+)\](.*)$/);
                    if (match) {
                        const [_, start, duration, text] = match;
                        const startTime = parseInt(start, 10);
                        const durationTime = parseInt(duration, 10);
                        const words = [];
                        const wordRegex = /\((\d+),(\d+),(\d+)\)([^\(\)]*)/g;
                        let lastIndex = 0;
                        let matchWord;

                        while ((matchWord = wordRegex.exec(text)) !== null) {
                            const beforeText = text.substring(lastIndex, matchWord.index);
                            if (beforeText) {
                                // 保留空格和其他字符
                                words.push({ tx: beforeText });
                            }

                            const [_, t, d, __, tx] = matchWord;
                            words.push({
                                tx: tx,
                                t: parseInt(t, 10),
                                d: parseInt(d, 10)
                            });

                            lastIndex = wordRegex.lastIndex;
                        }

                        const remainingText = text.substring(lastIndex);
                        if (remainingText) {
                            // 保留空格和其他字符
                            words.push({ tx: remainingText });
                        }

                        parsedLine = {
                            t: startTime,
                            d: durationTime,
                            c: words
                        };
                    } else {
                        console.error(`Invalid line format: ${line}`);
                        continue;
                    }
                }

                // 补全音乐信息之间间隔缺少
                if (parsedLine && typeof parsedLine === 'object') {
                    if (parsedLine.t !== undefined && parsedLine.c !== undefined) {
                        if (i < lines.length - 1) {
                            try {
                                let nextLine = lines[i + 1];
                                let nextParsed;
                                try {
                                    nextParsed = JSON.parse(nextLine);
                                } catch (e) {
                                    const nextMatch = nextLine.match(/^\[(\d+),(\d+)\]/);
                                    if (nextMatch) {
                                        nextParsed = {
                                            t: parseInt(nextMatch[1], 10)
                                        };
                                    }
                                }

                                if (nextParsed && nextParsed.t !== undefined && parsedLine.d === undefined) {
                                    parsedLine.d = nextParsed.t - parsedLine.t;
                                }
                            } catch (e) {
                                console.error(`Failed to calculate next line start time: ${e.message}`);
                            }
                        }
                        result.push(parsedLine);
                    }
                }
            } catch (error) {
                console.error(`解析行失败: ${line}, 错误原因: ${error.message}`);
            }
        }

        return result;
    } catch (error) {
        console.error('无法解析YRC歌词:', error.message);
        return [];
    }
}

const parseLRC = (translationData) => {
    const translations = {};

    if (!translationData) {
        return translations;
    }

    const lines = translationData.split('\n');

    for (let line of lines) {
        line = line.trim();
        const match = line.match(/^\[(\d+):(\d+)\.(\d+)\](.*)/);
        if (!match) continue;

        const minutes = parseInt(match[1], 10) || 0;
        const seconds = parseInt(match[2], 10) || 0;
        const milliseconds = parseInt(match[3].slice(0, 3).padEnd(3, '0'), 10);

        const timestamp = minutes * 60000 + seconds * 1000 + milliseconds;

        const text = match[4].trim();

        if (text) {
            translations[timestamp] = text;
        }
    }

    return translations;
};

const findClosestTranslation = (translations, targetTime, maxTimeDiff = 1500) => {
    let closestTime = null;
    let minDiff = Infinity;

    // 遍历所有翻译时间戳，找到最接近的一个
    for (const time in translations) {
        const diff = Math.abs(time - targetTime);
        if (diff < minDiff && diff <= maxTimeDiff) {
            minDiff = diff;
            closestTime = time;
        }
    }

    return closestTime !== null ? translations[closestTime] : null;
};

let scrollTimeout = null;

function spawnYRCElement(yrc, audioElement, translationData) {
    document.querySelectorAll('.active-dots').forEach((element) => {
        element.remove();
    });


    const lyricsElement = document.querySelector('.SimLRC');

    let dotAnimationFrame = null;
    if (!lyricsElement) return;

    lyricsElement.innerHTML = '';

    const translations = parseLRC(translationData);

    console.log('Translation data:', translations);

    // 存储每行歌词对应的翻译行
    const translationLines = {};

    yrc.forEach((line, index) => {
        // 创建包含原始歌词和翻译的容器
        const lineContainer = document.createElement('div');
        lineContainer.classList.add('line-container');
        lineContainer.style.display = 'flex';
        lineContainer.style.flexDirection = 'column';
        lineContainer.style.alignItems = 'start';
        lineContainer.style.marginBottom = '15px';

        // 创建原始歌词行
        const lineDiv = document.createElement('div');
        if (index == 0) lineDiv.classList.add('active');
        lineContainer.setAttribute('data-stamp', line.t);
        lineContainer.setAttribute('data-duration', line.d);
        lineDiv.classList.add('WBWline');
        lineDiv.style.display = 'flex';
        lineDiv.style.flexFlow = 'wrap';
        lineDiv.style.whiteSpace = 'pre';
        lineDiv.style.justifyContent = 'center';
        lineDiv.onclick = () => { audioElement.currentTime = lineContainer.dataset.stamp / 1000; };

        // 添加逐字歌词
        line.c.forEach((word, index) => {
            const wordSpan = document.createElement('span');
            wordSpan.textContent = word.tx;
            wordSpan.style.opacity = '0.6';
            wordSpan.style.width = 'auto';
            wordSpan.style.whiteSpace = 'pre';
            wordSpan.style.transition = `opacity ${word.d}ms ease-out`;
            wordSpan.setAttribute('data-wordstamp', word.t);
            wordSpan.setAttribute('data-wordduration', word.d);
            lineDiv.appendChild(wordSpan);
            if (index < line.c.length - 1) {
                lineDiv.appendChild(document.createTextNode(' '));
            }
        });

        lineContainer.appendChild(lineDiv);

        // 自动匹配翻译
        const translation = findClosestTranslation(translations, line.t);
        if (translation) {
            const transDiv = document.createElement('div');
            transDiv.classList.add('translation');
            transDiv.setAttribute('data-transtamp', line.t);
            transDiv.setAttribute('data-tranduration', line.d);
            transDiv.textContent = translation;
            transDiv.style.opacity = '0.6';
            transDiv.style.transition = 'opacity 300ms';
            transDiv.style.fontSize = '0.8em';
            transDiv.style.marginTop = '5px';
            transDiv.onclick = () => { audioElement.currentTime = lineContainer.dataset.stamp / 1000; };


            lineContainer.appendChild(transDiv);

            // 存储翻译行与歌词行的对应关系
            translationLines[line.t] = transDiv;
        }

        lyricsElement.appendChild(lineContainer);
    });

    let activeDots = null;
    let lastActiveLine = null;
    let lastScroll = 0;

    function updateLyrics(timestamp) {
        if (lastHandle == 0) return;
        if (lastHandle !== config.getItem('currentMusic')) return;

        const containers = Array.from(lyricsElement.querySelectorAll('.line-container'));
        const TIME_TOLERANCE = 50;

        // 寻找当前激活行和下一行
        let activeContainer = null;
        let nextContainer = null;
        for (let i = 0; i < containers.length; i++) {
            const container = containers[i];
            const lineStart = parseInt(container.getAttribute('data-stamp'), 10);
            const lineDuration = parseInt(container.getAttribute('data-duration'), 10);

            if (timestamp >= lineStart - TIME_TOLERANCE && timestamp < lineStart + lineDuration + TIME_TOLERANCE) {
                activeContainer = container;
                if (i < containers.length - 1) {
                    nextContainer = containers[i + 1];
                }
                break;
            } else if (timestamp < lineStart && !activeContainer) {
                nextContainer = container;
                break;
            }
        }

        // 清除之前的动画帧
        if (dotAnimationFrame) {
            cancelAnimationFrame(dotAnimationFrame);
            dotAnimationFrame = null;
        }

        // 更新三点占位符逻辑
        if (!activeContainer && nextContainer) {
            const prevContainer = lastActiveLine;

            if (prevContainer) {
                const prevStart = parseInt(prevContainer.getAttribute('data-stamp'), 10);
                const prevDuration = parseInt(prevContainer.getAttribute('data-duration'), 10);
                const nextStart = parseInt(nextContainer.getAttribute('data-stamp'), 10);

                const interval = nextStart - (prevStart + prevDuration);
                const segmentDuration = interval / 3;
                const timeInInterval = timestamp - (prevStart + prevDuration);

                if (timeInInterval > 0 && timeInInterval < interval) {
                    if (activeDots) activeDots.remove();
                    if (!activeDots || !lyricsElement.contains(activeDots)) {
                        activeDots = document.createElement('div');
                        activeDots.innerHTML = '<span class="dot">●</span>　<span class="dot">●</span>　<span class="dot">●</span>';
                        activeDots.classList.add('active-dots');
                        activeDots.classList.add('active');
                        activeDots.style.textAlign = 'center';
                        activeDots.setAttribute('data-stamp', prevStart + prevDuration);
                        activeDots.setAttribute('data-duration', interval);
                        activeDots.style.fontSize = '1.2em';
                        activeDots.style.opacity = '0.6';
                        activeDots.style.marginTop = '10px';
                        // if (scrollTimeout) clearTimeout(scrollTimeout);
                        // scrollTimeout = 
                        if (lastScroll !== lastActiveLine) {
                            setTimeout(() => {
                                activeDots.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                lastScroll = lastActiveLine;
                            }, 100)
                        }
                        // }, 500);
                        activeDots.style.display = interval > 10000 ? 'flex' : 'none';
                        if (prevContainer.nextSibling) {
                            prevContainer.parentNode.insertBefore(activeDots, prevContainer.nextSibling);
                        } else {
                            lyricsElement.appendChild(activeDots);
                        }
                    }

                    // 更新三个点的透明度
                    const dots = activeDots.querySelectorAll('.dot');
                    dots.forEach((dot, index) => {
                        const dotStartTime = segmentDuration * index;
                        const dotEndTime = segmentDuration * (index + 1);
                        let newOpacity;
                        if (timeInInterval >= dotStartTime && timeInInterval < dotEndTime) {
                            const progress = (timeInInterval - dotStartTime) / segmentDuration;
                            newOpacity = 0.6 + (0.4 * progress);
                            for (let i = 0; i < index; i++) {
                                if (dots[i].style.opacity !== '1') {
                                    dots[i].style.opacity = '1';
                                }
                            }
                            for (let i = index + 1; i < dots.length; i++) {
                                if (dots[i].style.opacity !== '0.6') {
                                    dots[i].style.opacity = '0.6';
                                }
                            }
                        } else if (timeInInterval >= dotEndTime) {
                            newOpacity = '1';
                        } else {
                            newOpacity = '0.6';
                        }
                        if (dot.style.opacity !== newOpacity.toString()) {
                            dot.style.opacity = newOpacity;
                        }
                    });
                } else if (activeDots) {
                    activeDots.remove();
                    activeDots = null;
                    // if (scrollTimeout) clearTimeout(scrollTimeout);
                    // scrollTimeout = setTimeout(() => {

                    // }, 500);
                }
            }
        } else if (activeDots) {
            activeDots.remove();
            activeDots = null;
            scrollTimeout = setTimeout(() => {
            activeContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });
            lastScroll = null;
            }, 100);
        }

        // 更新行状态
        containers.forEach(container => {
            const lineDiv = container.querySelector('.WBWline');
            const lineStart = parseInt(container.getAttribute('data-stamp'), 10);
            const lineDuration = parseInt(container.getAttribute('data-duration'), 10);

            if (container === activeContainer) {
                const words = Array.from(lineDiv.querySelectorAll('span'));

                lineDiv.classList.add('active');
                lineDiv.style.filter = 'none';
                if (words[0].getAttribute('data-wordstamp') == null) lineDiv.style.opacity = '1';
                lastActiveLine = container;

                // 更新对应的翻译行样式
                const transDiv = container.querySelector('.translation');
                if (transDiv) {
                    transDiv.style.opacity = '0.9';
                }

                // 更新逐字歌词样式
                let anyWordActive = false;

                words.forEach((word, wordIndex) => {
                    const wordStart = parseInt(word.getAttribute('data-wordstamp'), 10);
                    const wordDuration = parseInt(word.getAttribute('data-wordduration'), 10);
                    const wordEnd = wordStart + wordDuration;

                    if (timestamp >= wordStart && timestamp < wordEnd) {
                        word.style.opacity = '1';
                        if (wordDuration >= 1000) {
                            word.style.textShadow = '0 0 8px rgba(255, 255, 255, 0.8)';
                        } else {
                            word.style.textShadow = 'none';
                        }
                        anyWordActive = true;
                    } else if (timestamp >= wordEnd) {
                        word.style.opacity = '1';
                        word.style.textShadow = 'none';
                    } else {
                        word.style.opacity = '0.5';
                        word.style.textShadow = 'none';
                    }
                });

                // 如果没有单词处于激活状态，但整行歌词处于激活时间段
                if (!anyWordActive && timestamp >= lineStart && timestamp < lineStart + lineDuration) {
                    words.forEach(word => {
                        word.style.opacity = '0.9';
                        word.style.textShadow = 'none';
                    });
                }
                ipcRenderer.invoke('lrcUpdate', lineDiv.parentElement.innerHTML)
            } else {
                lineDiv.classList.remove('active');

                const transDiv = container.querySelector('.translation');
                if (transDiv) {
                    transDiv.style.opacity = '0.6';
                }

                Array.from(lineDiv.querySelectorAll('span')).forEach(word => {
                    word.style.opacity = '0.6';
                    word.style.textShadow = 'none';
                });
            }
        });
    }

    if (audioElement) {
        if (!audioElement.hasLyricsListener) {
            audioElement.addEventListener('timeupdate', () => {
                const currentTime = audioElement.currentTime * 1000;
                updateLyrics(currentTime);
            });
            audioElement.hasLyricsListener = true;
        }
    }
}

async function startReplaceElement() {
    const musicId = config.getItem('currentMusic');
    const lyricsElement = document.querySelector('.SimLRC');
    if (lastHandle == musicId) return;
    lastHandle = musicId;
    console.log('开始加载歌曲', musicId);
    if (config.getItem('ext')['ncm'] == null) {
        console.error('未安装网易云扩展但正在尝试播放网易云音乐');
        return;
    }
    const apiUrl = config.getItem('ext.ncm.apiEndpoint');
    if (apiUrl == null) {
        console.error('网易云扩展API地址未设置，无法获取歌词');
        return;
    }
    if (musicId.startsWith('ncm:')) {
        postApiArray(apiUrl + '/lyric/new?id=' + musicId.replace('ncm:', ''), (lyrics) => {
            if (lyrics == null) {
                console.error('歌词数据为空');
                return;
            }
            if (lyrics.yrc == null) {
                console.error('该歌曲暂无逐字歌词');
                return;
            }
            lyricsElement.innerHTML = '<div data-stamp="0" style="filter: none;" class="active"><span>正在加载逐字歌词</span></div>';
            const yrc = parseYRC(lyrics.yrc.lyric);
            console.log(yrc);
            spawnYRCElement(yrc, document.querySelector('#audio'), lyrics.tlyric ? lyrics.tlyric.lyric : '');
        });
    }
}

let EXprogressObserver2 = new MutationObserver(() => {
    let currentTime = document.querySelector('#progressCurrent')?.innerHTML;
    let totalTime = document.querySelector('#progressDuration')?.innerHTML;
    let playTimeElement = document.querySelector('#ExPlayerPlayTime');
    if (playTimeElement) {
        if (currentTime == totalTime) {
            lastHandle = 0;
        }
    }
})

let EXprogressCurrentElement2 = document.querySelector('#progressCurrent');
let EXprogressDurationElement2 = document.querySelector('#progressDuration');
if (EXprogressCurrentElement2) {
    EXprogressObserver2.observe(EXprogressCurrentElement2, { childList: true, subtree: true });
}
if (EXprogressDurationElement2) {
    EXprogressObserver2.observe(EXprogressDurationElement2, { childList: true, subtree: true });
}