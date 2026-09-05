/*
 * Aetos browser QA -- responsive layout.
 *
 * Blueprint section 53. A page cannot resize its own window, so the breakpoint
 * *decision* is tested directly and the *application* is verified against
 * whatever size the QA browser happens to be at. Running this suite at several
 * viewport sizes is what covers the rest.
 */

(async function aetosResponsiveQa() {
    "use strict";

    var results = { passed: 0, failed: 0, failures: [] };

    function check(name, condition, detail) {
        if (condition) {
            results.passed += 1;
        } else {
            results.failed += 1;
            results.failures.push(name + (detail ? " -- " + detail : ""));
        }
    }

    var A = window.Aetos;
    var R = window.AetosResponsive;
    if (!A || !R) {
        return { passed: 0, failed: 1, failures: ["AetosResponsive missing"] };
    }

    var root = document.getElementById("aetos-root");

    /* --- Breakpoint decision ------------------------------------------- */

    check("breakpoint: a phone width is phone", R.breakpointFor(390) === "phone",
        R.breakpointFor(390));
    check("breakpoint: a small tablet is phone or tablet",
        ["phone", "tablet"].indexOf(R.breakpointFor(700)) !== -1);
    check("breakpoint: a tablet width is tablet", R.breakpointFor(900) === "tablet",
        R.breakpointFor(900));
    check("breakpoint: a laptop width is desktop", R.breakpointFor(1440) === "desktop",
        R.breakpointFor(1440));
    check("breakpoint: a large monitor is wide", R.breakpointFor(2560) === "wide",
        R.breakpointFor(2560));
    check("breakpoint: boundaries do not leave a gap",
        R.breakpointFor(701) === "tablet" && R.breakpointFor(1101) === "desktop",
        R.breakpointFor(701) + "/" + R.breakpointFor(1101));
    check("breakpoint: an absurd width still resolves",
        R.breakpointFor(99999) === "wide" && !!R.breakpointFor(1));

    /* --- Applied to the document ---------------------------------------- */

    check("layout: the root declares its size", !!root.getAttribute("data-aetos-size"),
        root.getAttribute("data-aetos-size"));
    check("layout: the declared size matches the measured width",
        root.getAttribute("data-aetos-size") ===
            R.breakpointFor(root.getBoundingClientRect().width),
        root.getAttribute("data-aetos-size") + " vs measured " +
            Math.round(root.getBoundingClientRect().width));
    check("layout: short viewports are flagged separately",
        root.getAttribute("data-aetos-short") !== null);

    /* --- Fills, at whatever size this is -------------------------------- */

    var rect = root.getBoundingClientRect();
    check("layout: fills the viewport width",
        Math.abs(rect.width - window.innerWidth) <= 1,
        Math.round(rect.width) + " vs " + window.innerWidth);
    check("layout: fills the viewport height",
        Math.abs(rect.height - window.innerHeight) <= 1,
        Math.round(rect.height) + " vs " + window.innerHeight);
    check("layout: no horizontal overflow",
        document.documentElement.scrollWidth <= window.innerWidth + 1,
        document.documentElement.scrollWidth + " vs " + window.innerWidth);

    /* --- The command input is always reachable --------------------------- */

    var input = document.getElementById("aetos-input");
    var inputRect = input.getBoundingClientRect();
    check("layout: the command input is on screen",
        inputRect.bottom <= window.innerHeight + 1 && inputRect.top >= 0,
        JSON.stringify({ top: Math.round(inputRect.top), bottom: Math.round(inputRect.bottom) }));
    check("layout: the command input has usable width",
        inputRect.width > 80, String(Math.round(inputRect.width)));

    /* --- The console keeps a usable share -------------------------------- */

    var main = document.querySelector('[data-aetos-region="main"]');
    if (main) {
        var mainRect = main.getBoundingClientRect();
        check("layout: the console keeps a meaningful share of the height",
            mainRect.height >= window.innerHeight * 0.3,
            Math.round(mainRect.height / window.innerHeight * 100) + "%");
        check("layout: the console keeps a meaningful share of the width",
            mainRect.width >= window.innerWidth * 0.3,
            Math.round(mainRect.width / window.innerWidth * 100) + "%");
    }

    /* --- Fluid tokens resolve --------------------------------------------- */

    var styles = getComputedStyle(root);
    var fontSize = parseFloat(styles.fontSize);
    check("type: font size stays within readable bounds",
        fontSize >= 12 && fontSize <= 17, styles.fontSize);

    var column = getComputedStyle(document.documentElement)
        .getPropertyValue("--aetos-column").trim();
    check("layout: the side column is a resolved length", !!column, column);

    /* --- No widget is lost at any size ------------------------------------ */

    var mounted = A.layout.instances().map(function (i) { return i.id; });
    var panels = [...document.querySelectorAll("[data-aetos-widget]")]
        .map(function (p) { return p.getAttribute("data-aetos-widget"); });
    check("layout: every mounted widget has a panel in the DOM",
        mounted.every(function (id) { return panels.indexOf(id) !== -1; }),
        JSON.stringify({ mounted: mounted, panels: panels }));

    // A widget must never be dropped just because the screen got smaller --
    // on a phone the side panels are the only non-visual route to exits and
    // room contents (sections 46, 53).
    function isReachable(panel) {
        // A panel outside the viewport is fine IF an ancestor scrolls to it --
        // that is a swipeable strip, not a lost widget. Unreachable means no
        // scrollable ancestor can bring it into view.
        var node = panel.parentNode;
        while (node && node !== document.body) {
            var style = getComputedStyle(node);
            var scrolls = /(auto|scroll)/.test(style.overflowX + style.overflowY);
            if (scrolls && (node.scrollWidth > node.clientWidth ||
                            node.scrollHeight > node.clientHeight)) {
                return true;
            }
            node = node.parentNode;
        }
        var box = panel.getBoundingClientRect();
        return box.right > 0 && box.left < window.innerWidth &&
               box.bottom > 0 && box.top < window.innerHeight;
    }

    var unreachable = [];
    panels.forEach(function (id) {
        var panel = document.querySelector('[data-aetos-widget="' + id + '"]');
        if (getComputedStyle(panel).display === "none") {
            return;
        }
        if (!isReachable(panel)) {
            unreachable.push(id);
        }
    });
    check("layout: every visible widget is reachable", unreachable.length === 0,
        JSON.stringify(unreachable));

    /* --- Touch affordances are declared ------------------------------------ */

    var sheet = [...document.styleSheets].filter(function (s) {
        return s.href && s.href.indexOf("aetos.css") !== -1;
    })[0];
    var hasCoarseRule = false;
    if (sheet) {
        try {
            [...sheet.cssRules].forEach(function (rule) {
                if (rule.conditionText && rule.conditionText.indexOf("coarse") !== -1) {
                    hasCoarseRule = true;
                }
            });
        } catch (err) {
            hasCoarseRule = null; // cross-origin; not assertable here
        }
    }
    if (hasCoarseRule !== null) {
        check("touch: larger targets are declared for coarse pointers", hasCoarseRule,
            "asks about the pointer, not the screen size");
    }

    return results;
})();
