window.onload = function () {
    var before_chk = document.querySelector("#before_chk");
    var ready = document.querySelector("#ready_btn");
    before_chk.style.opacity = "1";
    setTimeout(function () {
        ready.style.opacity = "1";
    }, 2000);

    var startLogin = document.querySelector("#start_btn");

    startLogin.addEventListener(
        "click",
        function () {
            var loginArea = document.querySelector("#login_area");
            loginArea.style.display = "block";
            document.querySelector("#login_pw").focus();
            this.style.display = "none";
        },
        false
    );
};

var bgm1 = document.querySelector("#bgm1");
var bgm2 = document.querySelector("#bgm2");
var errSe = document.querySelector("#errSe");
var rdBar = 0;
var before = document.querySelector("#before_load");
var title = document.querySelector("#title");
var bgImg = document.querySelector("#bg-wrap");
var bgLoading = document.querySelector(".loading");
var bgLoaded = document.querySelector(".loaded");
var loadArea = document.querySelector("#loading_area");
var startArea = document.querySelector("#start_area");
bgm1.volume = 0.1;
bgm2.volume = 0.1;

function fadeOut(audio) {
    TweenMax.to(audio, 1, { volume: 0.1 });
    audio.volume = 0.1;
    audio.pause();
    audio.currentTime = 0;
}

function fadeIn(audio) {
    audio.volume = 0.1;
    audio.loop = true;
    audio.play();    
    TweenMax.to(audio, 1, { volume: 0.5 });
}

function move() {
    if (rdBar == 0) {
        rdBar = 1;
        var elem = document.querySelector("#loadBar");
        var width = 1;
        var id = setInterval(frame, 10);
        var pNum = document.querySelector("#pNum");

        function frame() {
            if (width >= 100) {
                clearInterval(id);
                rdBar = 0;
                var change = setTimeout(function () {
                    loadArea.style.display = "none";
                    startArea.style.display = "block";
                }, 2000);
            } else {
                width++;
                elem.style.width = width + "%";
                if (width < 10) {
                    pNum.innerText = "0" + width;
                } else {
                    pNum.innerText = width;
                }
            }
        }
    }
}

/* ── 익명 통계 (hidden-stats 허브) — 진짜 손님만, 로컬 테스트 제외. IP·개인정보 미수집 ── */
var ZSTAT_SITE = 'firstfoundbride';
function _zsid() { try { var k = 'hstat:sid', v = sessionStorage.getItem(k); if (!v) { v = Date.now().toString(36) + Math.random().toString(36).slice(2, 10); sessionStorage.setItem(k, v); } return v; } catch (_) { return null; } }
function _zon() { try { var h = location.hostname || ''; if (h === 'localhost' || h === '127.0.0.1' || /^192\.168\./.test(h) || /^10\./.test(h)) return false; return true; } catch (_) { return false; } }
function zStat(event, step) { if (!_zon()) return; try { var pl = JSON.stringify({ site: ZSTAT_SITE, event: event, step: step || null, sid: _zsid() }); if (navigator.sendBeacon) { navigator.sendBeacon('https://hidden-stats.vercel.app/api/track', new Blob([pl], { type: 'application/json' })); } else { fetch('https://hidden-stats.vercel.app/api/track', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: pl, keepalive: true }).catch(function () {}); } } catch (_) {} }
function zStatOnce(flag, event, step) { if (!_zon()) return; try { var fk = 'hstat:f:' + flag; if (sessionStorage.getItem(fk)) return; sessionStorage.setItem(fk, '1'); } catch (_) {} zStat(event, step); }

function readyGo() {
    zStatOnce('enter', 'enter', null);                 // 세션당 1회 — 방문(시작)
    before.style.display = "none";
    title.style.display = "block";
    // 풀스크린 요청 (브라우저 주소창 숨겨서 세로 높이 확보 — 작은 폰 가로 모드 대응)
    try {
        var docEl = document.documentElement;
        var req = docEl.requestFullscreen || docEl.webkitRequestFullscreen || docEl.mozRequestFullScreen || docEl.msRequestFullscreen;
        if (req) { req.call(docEl).catch(function(){}); }
    } catch (e) { /* 풀스크린 거부돼도 정상 진행 */ }
    bgm1.play();
    fadeIn(bgm1);
    var loadComplete = setTimeout(function () {
        // bgLoading.style.display = "none";
        // bgLoaded.style.display = "block";
        loadArea.style.display = "block";
    }, 3000);
    var loadStart = setTimeout(function () {
        move();
    }, 3500);
}
var counter;
var p = 0;
var subcontent;
var page;
var subArea = document.querySelector("#subpage_area");
var object = document.querySelector("#object_play");

var pCount = document.querySelector("#page_count");
var pMove = document.querySelector(".page_move");

var countPage = document
    .querySelector("#page_count")
    .querySelector(".count");

var countMax = document
    .querySelector("#page_count")
    .querySelector(".count-max");

function openSubPage(c) {
    subArea.style.display = "block";
    subcontent = document.querySelector(
        ".subpage_content[data-content='" + c + "'"
    );
    page = subcontent.querySelectorAll(".page");
    subcontent.style.display = "block";
    page[0].style.display = "block";
    countPage.innerHTML = 1;
    countMax.innerHTML = page.length;
    counter = c;
    if (c == 2) zStatOnce('reach:story_start', 'reach', 'story_start');   // 메인 스토리 진입
    if (c > 1) {
        fadeOut(bgm1);
        fadeIn(bgm2);
    }
}

var answers = [
    "789603692065531",
    "VIP ROOM",
    "선악과",
    "204",
    "BOOM",
    "ESC",
    "ONE MONTH LATER"
];

var currected = [
    false,
    false,
    false,
    false,
    false,
    false,
    false,
]

function answerInput(a) {
    var input = document.querySelectorAll(".answer-input");
    if (input[a].value == answers[a]) {
        if (a == 0) {
            document.querySelector("#login").style.display = "none";
            document.querySelector("#main_wrap").style.display = "block";
            zStatOnce('reach:login_ok', 'reach', 'login_ok');        // 로그인 PIN 성공
        } else {
            if (p < page.length - 1) {
                p = p + 1;
                for (i = 0; i < page.length; i++) {
                    page[i].style.display = "none";
                }
                page[p].style.display = "block";
                countPage.innerHTML = p + 1;
            } else {
                // alert("ë§ì§ë§ íì´ì§ ìëë¤");
            }
            input[a].value = "";
            document.querySelector(
                ".answer_area[data-quiz='" + a + "']"
            ).style.display = "none";
            currected[a] = true;
            zStatOnce('reach:quiz' + a, 'reach', 'quiz' + a);        // 퍼즐 N 정답
        }
    } else {
        errSe.play();
        zStat('fail', a == 0 ? 'login_ok' : 'quiz' + a);            // 오답 1회 (난이도 측정)
    }
}

var subC = document.querySelectorAll('.subpage_content');

function closeIt() {
    subArea.style.display = "none";
    document.querySelector(".answer_area").style.display = "none";
    for (k = 0; k < subC.length; k++) {
        subC[k].style.display = 'none';
    }
    for (i = 0; i < page.length; i++) {
        page[i].style.display = "none";
    }
    for (j = 1; j < currected.length - 1; j++) {
        currected[j] = false;
    }
    p = 0;
    fadeOut(bgm2);
    fadeIn(bgm1);
}

function soon() {
    window.location.href = 'https://fantastrickside.gabia.io/hidden-page-online/';
}

function pageNext() {
    if (counter == 2) {
        if (p == 2 && !currected[1]) {
            document.querySelector(
                ".answer_area[data-quiz='1']"
            ).style.display = "block";
            document
                .querySelector(".answer_area[data-quiz='1']")
                .querySelectorAll(".answer_card")[0]
                .querySelector("input[type=text]")
                .focus();
        } else if (p == 4 && !currected[2]) {
            document.querySelector(
                ".answer_area[data-quiz='2']"
            ).style.display = "block";
            document
                .querySelector(".answer_area[data-quiz='2']")
                .querySelectorAll(".answer_card")[0]
                .querySelector("input[type=text]")
                .focus();
        } else if (p == 5 && !currected[3]) {
            document.querySelector(
                ".answer_area[data-quiz='3']"
            ).style.display = "block";
            document
                .querySelector(".answer_area[data-quiz='3']")
                .querySelectorAll(".answer_card")[0]
                .querySelector("input[type=text]")
                .focus();
        } else if (p == 7 && !currected[4]) {
            document.querySelector(
                ".answer_area[data-quiz='4']"
            ).style.display = "block";
            document
                .querySelector(".answer_area[data-quiz='4']")
                .querySelectorAll(".answer_card")[0]
                .querySelector("input[type=text]")
                .focus();
        } else if (p == 9 && !currected[5]) {
            document.querySelector(
                ".answer_area[data-quiz='5']"
            ).style.display = "block";
            document
                .querySelector(".answer_area[data-quiz='5']")
                .querySelectorAll(".answer_card")[0]
                .querySelector("input[type=text]")
                .focus();
        } else if (p == 11 && !currected[6]) {
            document.querySelector(
                ".answer_area[data-quiz='6']"
            ).style.display = "block";
            document
                .querySelector(".answer_area[data-quiz='6']")
                .querySelectorAll(".answer_card")[0]
                .querySelector("input[type=text]")
                .focus();
        } else {
            if (p < page.length - 1) {
                p = p + 1;
                for (i = 0; i < page.length; i++) {
                    page[i].style.display = "none";
                }
                page[p].style.display = "block";
                countPage.innerHTML = p + 1;
            } else {
                // alert("ë§ì§ë§ íì´ì§ ìëë¤");
            }
        }
    } else {
        if (p < page.length - 1) {
            p = p + 1;
            for (i = 0; i < page.length; i++) {
                page[i].style.display = "none";
            }
            page[p].style.display = "block";
            countPage.innerHTML = p + 1;
        } else {
            // alert("ë§ì§ë§ íì´ì§ ìëë¤");
        }
    }
    if (counter == 2 && page && p === page.length - 1) {
        zStatOnce('reach:ending', 'reach', 'ending');               // 마지막 페이지(편지) 도달 = 완주
    }
}
function pagePrev() {
    if (p > 0) {
        p = p - 1;
        for (i = 0; i < page.length; i++) {
            page[i].style.display = "none";
        }
        page[p].style.display = "block";
        countPage.innerHTML = p + 1;
    } else {
        // alert("ì²«ë²ì§¸ íì´ì§ ìëë¤");
    }
}

function closePop(u) {
    if (u == 0) {
        var loginArea = document.querySelector("#login_area");
        loginArea.style.display = 'none';
        var startLogin = document.querySelector("#start_btn").style.display = 'block';
    } else {
        document.querySelectorAll('.answer_area')[u - 1].style.display = 'none';
        document.querySelectorAll('.answer_area')[u - 1].querySelectorAll(".answer_card")[0].querySelector("input[type=text]").value = '';
    }
}

// ============================================================
// HINT 모달 핸들러 — v2 시안과 동일한 wrapper / main_area 기반
// ============================================================
(function() {
    var PAGE_TO_HINT = {"2-3": "1", "2-5": "2", "2-6": "3", "2-8": "4", "2-10": "5", "2-12": "6"};
    // production index.html은 .page에 data-page 마크업 없음 → page index 기반 매핑 (스토리 1=index 0, ... 스토리 14=index 13)
    var PAGE_INDEX_TO_HINT = {2: "1", 4: "2", 5: "3", 7: "4", 9: "5", 11: "6"};

    // 1) login wrapper 동적 생성 (1280x720, viewport 가운데)
    var wrapper = document.createElement("div");
    wrapper.id = "login-canvas-wrapper";
    wrapper.style.cssText = "position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); width:1280px; height:720px; pointer-events:none; z-index:500;";
    document.body.appendChild(wrapper);

    // 2) 모든 hint-trigger를 적절한 캔버스로 이동 + 모달 참조 저장
    var mainArea = document.querySelector("#main_area");
    document.querySelectorAll(".hint-trigger").forEach(function(btn) {
        var n = btn.dataset.hintTrigger;
        var modal = btn.parentElement.querySelector('.hint_area[data-hint="' + n + '"]');
        btn._hintModal = modal;
        btn.style.pointerEvents = "auto";
        if (btn.classList.contains('login')) {
            wrapper.appendChild(btn);
        } else if (mainArea) {
            mainArea.appendChild(btn);
        }
    });

    // 3) 활성 페이지에 따라 visibility 토글
    // isVisible: element 본인 + 부모 chain 전체가 display:none 아닌지 확인
    function isVisible(el) {
        while (el && el !== document.body) {
            if (getComputedStyle(el).display === 'none') return false;
            el = el.parentElement;
        }
        return true;
    }

    function getActiveHintNumber() {
        var loginArea = document.querySelector("#login_area");
        if (loginArea && isVisible(loginArea)) return "0";
        var c2 = document.querySelector('.subpage_content[data-content="2"]');
        if (c2 && isVisible(c2)) {
            var pages = c2.querySelectorAll('.page');
            for (var i = 0; i < pages.length; i++) {
                if (getComputedStyle(pages[i]).display !== 'none') {
                    // data-page가 있으면 그것 사용, 없으면 index 기반
                    var dp = pages[i].dataset.page;
                    if (dp && PAGE_TO_HINT[dp]) return PAGE_TO_HINT[dp];
                    return PAGE_INDEX_TO_HINT[i] || null;
                }
            }
        }
        return null;
    }

    function updateHintVisibility() {
        document.querySelectorAll(".hint-trigger").forEach(function(b) {
            b.style.setProperty("display", "none", "important");
        });
        var hn = getActiveHintNumber();
        if (hn !== null) {
            var t = document.querySelector('.hint-trigger[data-hint-trigger="' + hn + '"]');
            if (t) {
                // 해당 모달이 열려 있으면 trigger 계속 숨김
                var modal = t._hintModal;
                var modalOpen = modal && getComputedStyle(modal).display !== 'none';
                if (!modalOpen) t.style.removeProperty("display");
            }
        }
    }

    function closeAllHintModals() {
        document.querySelectorAll('.hint_area').forEach(function(m) {
            m.style.display = 'none';
            var sh = m.querySelector('.step-hint');
            var sa = m.querySelector('.step-answer');
            if (sh) sh.style.display = 'block';
            if (sa) sa.style.display = 'none';
        });
        updateHintVisibility();
    }

    updateHintVisibility();

    // 4) 페이지 전환/입력 함수에 직접 hook — _orig 후 update 호출
    ['pageNext', 'pagePrev', 'closeIt', 'openSubPage', 'answerInput', 'closePop', 'readyGo'].forEach(function(fn) {
        if (typeof window[fn] === 'function') {
            var _orig = window[fn];
            window[fn] = function() {
                closeAllHintModals();
                var result = _orig.apply(this, arguments);
                setTimeout(updateHintVisibility, 50);
                return result;
            };
        }
    });

    // 5) SYSTEM LOGIN (#start_btn) 클릭 시 login_area 표시 → 추가 hook
    document.addEventListener('click', function(e) {
        if (e.target.closest('#start_btn') || e.target.closest('.menu_btn') || e.target.closest('.close_popup')) {
            setTimeout(updateHintVisibility, 100);
        }
    }, true);

    // 6) 안전망: 주기적 재계산 (1초마다)
    setInterval(updateHintVisibility, 1000);

    // 6) 클릭 핸들러
    document.querySelectorAll('.hint-trigger').forEach(function(btn) {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            var modal = btn._hintModal;
            if (!modal) return;
            modal.querySelector('.step-hint').style.display = 'block';
            modal.querySelector('.step-answer').style.display = 'none';
            modal.style.display = 'block';
            btn.style.setProperty('display', 'none', 'important');
        });
    });

    document.querySelectorAll('.btn-show-answer').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var modal = btn.closest('.hint_area');
            modal.querySelector('.step-hint').style.display = 'none';
            modal.querySelector('.step-answer').style.display = 'block';
        });
    });

    document.querySelectorAll('.btn-back-to-hint').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var modal = btn.closest('.hint_area');
            modal.querySelector('.step-answer').style.display = 'none';
            modal.querySelector('.step-hint').style.display = 'block';
        });
    });

    document.querySelectorAll('.btn-close-hint').forEach(function(btn) {
        btn.addEventListener('click', function() {
            var modal = btn.closest('.hint_area');
            modal.style.display = 'none';
            updateHintVisibility();
        });
    });

})();

/* === 이미지 확대 라이트박스 === */
(function() {
    document.addEventListener('click', function(e) {
        var lb = document.getElementById('image-lightbox');
        if (!lb) return;
        // 확대 가능한 이미지 클릭
        if (e.target.classList && e.target.classList.contains('image-zoomable')) {
            var lbImg = lb.querySelector('img');
            lbImg.src = e.target.src;
            lb.classList.add('active');
            return;
        }
        // 라이트박스 배경 또는 X 버튼 클릭 시 닫기
        if (e.target.id === 'image-lightbox' || (e.target.classList && e.target.classList.contains('image-lightbox-close'))) {
            lb.classList.remove('active');
        }
    });
    // ESC 키로 닫기
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            var lb = document.getElementById('image-lightbox');
            if (lb) lb.classList.remove('active');
        }
    });
})();
