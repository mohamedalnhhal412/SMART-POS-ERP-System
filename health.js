/* ================================================================
   SMART POS / ERP
   SYSTEM HEALTH MONITOR
   health.js
   ================================================================ */

"use strict";

/*
 * هذا الملف متوافق مع:
 *
 * templates/health.html
 * static/css/health.css
 * Flask endpoint:
 * health_api
 *
 * لا يوجد بيانات تجريبية.
 * جميع نتائج حالة النظام يتم أخذها من الـ API الحقيقي.
 */


/* ================================================================
   CONFIGURATION
================================================================ */

const HEALTH_CONFIG = Object.freeze({

    defaultInterval: 30000,

    requestTimeout: 10000,

    maxEvents: 30,

    storageKey:
        "smart_pos_health_activity",

    defaultEndpoint:
        "/health",

    appName:
        "SMART POS / ERP",

    appVersion:
        "1.0.0"

});


/* ================================================================
   STATE
================================================================ */

const HealthState = {

    initialized: false,

    checking: false,

    autoRefresh: true,

    refreshTimer: null,

    checkCount: 0,

    startedAt: new Date(),

    lastResult: null,

    lastResponseTime: null,

    lastError: null,

    events: [],

    destroyed: false

};


/* ================================================================
   DOM
================================================================ */

const HealthDOM = {};


/* ================================================================
   DOM CACHE
================================================================ */

function cacheHealthDOM() {

    HealthDOM.page =
        document.getElementById("healthPage");


    /*
     * Header
     */

    HealthDOM.checkButton =
        document.getElementById(
            "healthCheckButton"
        );

    HealthDOM.refreshButton =
        document.getElementById(
            "healthRefreshButton"
        );


    /*
     * Overview
     */

    HealthDOM.overview =
        document.getElementById(
            "healthOverview"
        );

    HealthDOM.overviewIcon =
        document.getElementById(
            "healthOverviewIcon"
        );

    HealthDOM.overviewIconSymbol =
        document.getElementById(
            "healthOverviewIconSymbol"
        );

    HealthDOM.overallStatus =
        document.getElementById(
            "healthOverallStatus"
        );

    HealthDOM.overallMessage =
        document.getElementById(
            "healthOverallMessage"
        );

    HealthDOM.overallBadge =
        document.getElementById(
            "healthOverallBadge"
        );

    HealthDOM.lastCheck =
        document.getElementById(
            "healthLastCheck"
        );


    /*
     * Score
     */

    HealthDOM.scoreCircle =
        document.getElementById(
            "healthScoreCircle"
        );

    HealthDOM.score =
        document.getElementById(
            "healthScore"
        );

    HealthDOM.healthyCount =
        document.getElementById(
            "healthHealthyCount"
        );

    HealthDOM.warningCount =
        document.getElementById(
            "healthWarningCount"
        );

    HealthDOM.errorCount =
        document.getElementById(
            "healthErrorCount"
        );


    /*
     * Uptime
     */

    HealthDOM.uptime =
        document.getElementById(
            "healthUptime"
        );

    HealthDOM.uptimeProgress =
        document.getElementById(
            "healthUptimeProgress"
        );

    HealthDOM.servicesOnline =
        document.getElementById(
            "healthServicesOnline"
        );


    /*
     * Services
     */

    HealthDOM.serviceCards =
        Array.from(
            document.querySelectorAll(
                ".health-service-card[data-service]"
            )
        );


    /*
     * Database information
     */

    HealthDOM.databaseConnectionStatus =
        document.getElementById(
            "databaseConnectionStatus"
        );

    HealthDOM.databasePingStatus =
        document.getElementById(
            "databasePingStatus"
        );

    HealthDOM.databaseResponseTime =
        document.getElementById(
            "databaseResponseTime"
        );

    HealthDOM.databaseLastCheck =
        document.getElementById(
            "databaseLastCheck"
        );


    /*
     * System information
     */

    HealthDOM.serverStatus =
        document.getElementById(
            "serverStatus"
        );

    HealthDOM.browserName =
        document.getElementById(
            "browserName"
        );

    HealthDOM.platformName =
        document.getElementById(
            "platformName"
        );

    HealthDOM.networkStatus =
        document.getElementById(
            "networkStatus"
        );

    HealthDOM.lastSystemCheck =
        document.getElementById(
            "lastSystemCheck"
        );

    HealthDOM.serverTime =
        document.getElementById(
            "serverTime"
        );

    HealthDOM.connectionHealth =
        document.getElementById(
            "connectionHealth"
        );


    /*
     * Activity
     */

    HealthDOM.activityList =
        document.getElementById(
            "healthActivityList"
        );

    HealthDOM.clearActivity =
        document.getElementById(
            "clearHealthActivity"
        );


    /*
     * Notice
     */

    HealthDOM.notice =
        document.getElementById(
            "healthNoticeMessage"
        );


    /*
     * Error
     */

    HealthDOM.errorPanel =
        document.getElementById(
            "healthErrorPanel"
        );

    HealthDOM.errorMessage =
        document.getElementById(
            "healthErrorMessage"
        );

    HealthDOM.retryButton =
        document.getElementById(
            "healthRetryButton"
        );

}


/* ================================================================
   ENDPOINT
================================================================ */

function getHealthEndpoint() {

    if (
        HealthDOM.page &&
        HealthDOM.page.dataset &&
        HealthDOM.page.dataset.healthEndpoint
    ) {

        return HealthDOM.page.dataset.healthEndpoint;

    }


    if (
        window.SMART_POS_HEALTH &&
        window.SMART_POS_HEALTH.endpoint
    ) {

        return window.SMART_POS_HEALTH.endpoint;

    }


    return HEALTH_CONFIG.defaultEndpoint;

}


/* ================================================================
   SAFE TEXT
================================================================ */

function safeText(
    value,
    fallback = "--"
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return fallback;

    }


    return String(value);

}


/* ================================================================
   NORMALIZE STATUS
================================================================ */

function normalizeStatus(
    value
) {

    if (
        value === null ||
        value === undefined
    ) {

        return "unknown";

    }


    return String(value)
        .trim()
        .toLowerCase();

}


/* ================================================================
   STATUS HELPERS
================================================================ */

function isHealthyStatus(
    value
) {

    return [
        "ok",
        "healthy",
        "connected",
        "online",
        "success",
        "running",
        "active",
        "up",
        "true"
    ].includes(
        normalizeStatus(value)
    );

}


function isWarningStatus(
    value
) {

    return [
        "warning",
        "warn",
        "degraded",
        "slow",
        "partial"
    ].includes(
        normalizeStatus(value)
    );

}


/* ================================================================
   DATE / TIME
================================================================ */

function formatTime(
    date = new Date()
) {

    try {

        return new Intl.DateTimeFormat(
            "ar-EG",
            {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        ).format(date);

    } catch (error) {

        return date.toLocaleTimeString();

    }

}


function formatDateTime(
    date = new Date()
) {

    try {

        return new Intl.DateTimeFormat(
            "ar-EG",
            {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit"
            }
        ).format(date);

    } catch (error) {

        return date.toLocaleString();

    }

}


/* ================================================================
   TEXT SETTER
================================================================ */

function setText(
    element,
    value,
    fallback = "--"
) {

    if (!element) {

        return;

    }


    element.textContent =
        safeText(
            value,
            fallback
        );

}


/* ================================================================
   CLASS HELPERS
================================================================ */

function removeStateClasses(
    element
) {

    if (!element) {

        return;

    }


    element.classList.remove(
        "healthy",
        "danger",
        "warning",
        "checking",
        "success",
        "loading"
    );

}


function setStateClass(
    element,
    state
) {

    if (!element) {

        return;

    }


    removeStateClasses(
        element
    );


    if (state) {

        element.classList.add(
            state
        );

    }

}


/* ================================================================
   WIDTH
================================================================ */

function setWidth(
    element,
    value
) {

    if (!element) {

        return;

    }


    let number =
        Number(value);


    if (
        !Number.isFinite(number)
    ) {

        number = 0;

    }


    number =
        Math.max(
            0,
            Math.min(
                100,
                number
            )
        );


    requestAnimationFrame(
        function () {

            element.style.width =
                `${number}%`;

        }
    );

}


/* ================================================================
   NUMBER ANIMATION
================================================================ */

function animateNumber(
    element,
    target,
    duration = 700
) {

    if (!element) {

        return;

    }


    const finalValue =
        Math.max(
            0,
            Number(target) || 0
        );


    const startValue =
        Number(
            element.textContent
        ) || 0;


    const started =
        performance.now();


    function frame(
        currentTime
    ) {

        const progress =
            Math.min(
                1,
                (
                    currentTime -
                    started
                ) /
                duration
            );


        const eased =
            1 -
            Math.pow(
                1 - progress,
                3
            );


        const value =
            Math.round(
                startValue +
                (
                    finalValue -
                    startValue
                ) *
                eased
            );


        element.textContent =
            value;


        if (
            progress < 1
        ) {

            requestAnimationFrame(
                frame
            );

        }

    }


    requestAnimationFrame(
        frame
    );

}


/* ================================================================
   FETCH WITH TIMEOUT
================================================================ */

async function fetchWithTimeout(
    url,
    options = {},
    timeout = HEALTH_CONFIG.requestTimeout
) {

    const controller =
        new AbortController();


    const timeoutId =
        window.setTimeout(
            function () {

                controller.abort();

            },
            timeout
        );


    try {

        return await fetch(
            url,
            {
                ...options,

                signal:
                    controller.signal,

                cache:
                    "no-store",

                credentials:
                    "same-origin",

                headers: {

                    Accept:
                        "application/json",

                    "X-Requested-With":
                        "XMLHttpRequest",

                    ...(options.headers || {})

                }

            }
        );

    } finally {

        clearTimeout(
            timeoutId
        );

    }

}


/* ================================================================
   REAL HEALTH CHECK
================================================================ */

async function checkHealth(
    options = {}
) {

    if (
        HealthState.checking
    ) {

        return HealthState.lastResult;

    }


    HealthState.checking =
        true;


    setCheckingState();


    const start =
        performance.now();


    try {

        const endpoint =
            getHealthEndpoint();


        const response =
            await fetchWithTimeout(
                endpoint,
                {
                    method:
                        "GET"
                }
            );


        const responseTime =
            Math.round(
                performance.now() -
                start
            );


        HealthState.lastResponseTime =
            responseTime;


        if (
            !response.ok
        ) {

            let serverMessage =
                "";


            try {

                const errorData =
                    await response.json();


                serverMessage =
                    errorData.message ||
                    errorData.error ||
                    "";

            } catch (error) {

                /*
                 * Response may not contain JSON.
                 */

            }


            throw new Error(
                serverMessage ||
                `HTTP ${response.status}`
            );

        }


        const contentType =
            response.headers.get(
                "content-type"
            ) || "";


        if (
            !contentType.includes(
                "application/json"
            )
        ) {

            throw new Error(
                "الخادم لم يرجع بيانات JSON صحيحة."
            );

        }


        const data =
            await response.json();


        const result =
            normalizeHealthResponse(
                data,
                responseTime
            );


        HealthState.lastResult =
            result;

        HealthState.lastError =
            null;

        HealthState.checkCount++;


        processHealthResult(
            result
        );


        addHealthEvent(
            result
        );


        saveEvents();


        return result;

    } catch (error) {

        HealthState.lastError =
            error;

        HealthState.checkCount++;


        processHealthError(
            error
        );


        addHealthEvent(
            {
                status:
                    "error",

                database:
                    "error",

                responseTime:
                    HealthState.lastResponseTime,

                error:
                    getErrorMessage(
                        error
                    ),

                checkedAt:
                    new Date(),

                reachable:
                    false
            }
        );


        saveEvents();


        return null;

    } finally {

        HealthState.checking =
            false;


        removeLoadingState();

    }

}


/* ================================================================
   NORMALIZE API RESPONSE
================================================================ */

function normalizeHealthResponse(
    data,
    responseTime
) {

    const source =
        data &&
        typeof data === "object"
            ? data
            : {};


    /*
     * Database may be:
     *
     * database: "connected"
     *
     * OR
     *
     * database: {
     *     status: "connected"
     * }
     */

    let database =
        source.database;


    if (
        database &&
        typeof database === "object"
    ) {

        database =
            database.status ||
            database.state ||
            database.connection ||
            database.health;

    }


    /*
     * Main status
     */

    let status =
        source.status ||
        source.health ||
        source.state;


    if (
        status &&
        typeof status === "object"
    ) {

        status =
            status.status ||
            status.state ||
            status.health;

    }


    /*
     * Services
     */

    const services =
        source.services &&
        typeof source.services === "object"
            ? source.services
            : {};


    const result = {

        ...source,

        status:
            status ||
            "unknown",

        database:
            database ||
            services.database ||
            "unknown",

        services,

        responseTime,

        checkedAt:
            new Date(),

        reachable:
            true

    };


    return result;

}


/* ================================================================
   CHECKING UI
================================================================ */

function setCheckingState() {

    if (HealthDOM.page) {

        HealthDOM.page.classList.add(
            "health-checking"
        );

    }


    toggleButtonLoading(
        HealthDOM.checkButton,
        true
    );


    toggleButtonLoading(
        HealthDOM.refreshButton,
        true
    );


    setText(
        HealthDOM.overallStatus,
        "جاري فحص النظام..."
    );


    setText(
        HealthDOM.overallMessage,
        "يتم الآن الاتصال بالخادم والتحقق من الخدمات الأساسية."
    );


    if (
        HealthDOM.overallBadge
    ) {

        setStateClass(
            HealthDOM.overallBadge,
            "checking"
        );


        HealthDOM.overallBadge.innerHTML = `

            <span class="health-status-badge-icon">

                <i class="fa-solid fa-spinner fa-spin"></i>

            </span>

            <span>
                جاري الفحص
            </span>

        `;

    }


    HealthDOM.serviceCards.forEach(
        function (card) {

            setStateClass(
                card,
                "checking"
            );


            const text =
                card.querySelector(
                    ".health-service-status-text"
                );


            setText(
                text,
                "جاري الفحص"
            );

        }
    );


    setText(
        HealthDOM.notice,
        "جاري تنفيذ فحص حقيقي للنظام. يرجى الانتظار..."
    );

}


/* ================================================================
   REMOVE LOADING
================================================================ */

function removeLoadingState() {

    if (HealthDOM.page) {

        HealthDOM.page.classList.remove(
            "health-checking"
        );

    }


    toggleButtonLoading(
        HealthDOM.checkButton,
        false
    );


    toggleButtonLoading(
        HealthDOM.refreshButton,
        false
    );

}


/* ================================================================
   BUTTON LOADING
================================================================ */

function toggleButtonLoading(
    button,
    loading
) {

    if (!button) {

        return;

    }


    button.disabled =
        loading;


    button.classList.toggle(
        "is-loading",
        loading
    );


    if (loading) {

        button.dataset.originalHtml =
            button.innerHTML;


        const icon =
            button.querySelector(
                "i"
            );


        if (icon) {

            icon.className =
                "fa-solid fa-spinner fa-spin";

        }

    } else {

        const original =
            button.dataset.originalHtml;


        if (original) {

            button.innerHTML =
                original;

        }

    }

}


/* ================================================================
   PROCESS SUCCESS
================================================================ */

function processHealthResult(
    result
) {

    const status =
        normalizeStatus(
            result.status
        );


    const databaseStatus =
        normalizeStatus(
            result.database
        );


    const apiHealthy =
        isHealthyStatus(
            status
        );


    const databaseHealthy =
        isHealthyStatus(
            databaseStatus
        );


    const serviceStates =
        getServiceStates(
            result
        );


    const score =
        calculateHealthScore(
            result,
            serviceStates
        );


    const overallHealthy =
        score >= 90 &&
        apiHealthy &&
        databaseHealthy;


    updateOverallStatus(
        overallHealthy,
        score
    );


    updateScore(
        score,
        serviceStates
    );


    updateUptime(
        result,
        serviceStates
    );


    updateServiceCards(
        serviceStates,
        result
    );


    updateDatabaseInformation(
        result,
        databaseHealthy
    );


    updateSystemInformation(
        result,
        apiHealthy
    );


    updateNotice(
        result,
        overallHealthy
    );


    updateLastCheck(
        result
    );


    hideError();

}


/* ================================================================
   PROCESS ERROR
================================================================ */

function processHealthError(
    error
) {

    const message =
        getErrorMessage(
            error
        );


    updateOverallStatus(
        false,
        0,
        true
    );


    updateScore(
        0,
        {
            database: false,
            server: false,
            api: false,
            authentication: false,
            frontend: true,
            session: false
        }
    );


    updateUptime(
        {},
        {
            database: false,
            server: false,
            api: false,
            authentication: false,
            frontend: true,
            session: false
        }
    );


    updateServiceCards(
        {
            database: false,
            server: false,
            api: false,
            authentication: false,
            frontend: true,
            session: false
        },
        {}
    );


    setText(
        HealthDOM.databaseConnectionStatus,
        "تعذر الفحص"
    );


    setText(
        HealthDOM.databasePingStatus,
        "فشل"
    );


    setText(
        HealthDOM.databaseResponseTime,
        HealthState.lastResponseTime !== null
            ? `${HealthState.lastResponseTime} ms`
            : "--"
    );


    setText(
        HealthDOM.serverStatus,
        "Offline / Unknown"
    );


    setText(
        HealthDOM.networkStatus,
        "تعذر التحقق"
    );


    setText(
        HealthDOM.connectionHealth,
        "غير متاح"
    );


    updateNotice(
        {},
        false,
        message
    );


    showError(
        message
    );

}


/* ================================================================
   SERVICE STATES
================================================================ */

function getServiceStates(
    result
) {

    const services =
        result.services || {};


    const database =
        isHealthyStatus(
            result.database
        ) ||
        isHealthyStatus(
            services.database
        );


    const api =
        isHealthyStatus(
            result.status
        ) ||
        isHealthyStatus(
            services.api
        );


    const server =
        isHealthyStatus(
            services.server
        ) ||
        Boolean(
            result.reachable
        );


    const authentication =
        isHealthyStatus(
            services.authentication
        ) ||
        isHealthyStatus(
            services.auth
        );


    const frontend =
        isHealthyStatus(
            services.frontend
        ) ||
        true;


    const session =
        isHealthyStatus(
            services.session
        ) ||
        Boolean(
            result.user ||
            result.authenticated
        );


    return {

        database,

        server,

        api,

        authentication,

        frontend,

        session

    };

}


/* ================================================================
   SCORE
================================================================ */

function calculateHealthScore(
    result,
    states
) {

    const weights = {

        database: 30,

        server: 20,

        api: 20,

        authentication: 10,

        frontend: 10,

        session: 10

    };


    let total =
        0;


    let availableWeight =
        0;


    Object.keys(
        weights
    ).forEach(
        function (key) {

            /*
             * Frontend is locally known to be running
             * if this JavaScript is executing.
             */

            if (
                key === "frontend"
            ) {

                total +=
                    weights[key];

                availableWeight +=
                    weights[key];

                return;

            }


            /*
             * If backend did not provide
             * an explicit value for optional services,
             * don't punish the score.
             */

            const hasExplicitValue =
                result.services &&
                (
                    Object.prototype.hasOwnProperty.call(
                        result.services,
                        key
                    ) ||
                    (
                        key === "authentication" &&
                        Object.prototype.hasOwnProperty.call(
                            result.services,
                            "auth"
                        )
                    )
                );


            if (
                key === "database" ||
                key === "server" ||
                key === "api"
            ) {

                availableWeight +=
                    weights[key];

                if (
                    states[key]
                ) {

                    total +=
                        weights[key];

                }

                return;

            }


            if (
                hasExplicitValue
            ) {

                availableWeight +=
                    weights[key];


                if (
                    states[key]
                ) {

                    total +=
                        weights[key];

                }

            }

        }
    );


    if (
        availableWeight <= 0
    ) {

        return 0;

    }


    return Math.round(
        (
            total /
            availableWeight
        ) *
        100
    );

}


/* ================================================================
   OVERALL STATUS
================================================================ */

function updateOverallStatus(
    healthy,
    score,
    error = false
) {

    if (!HealthDOM.overview) {

        return;

    }


    const state =
        healthy
            ? "healthy"
            : error
                ? "danger"
                : "warning";


    setStateClass(
        HealthDOM.overview,
        state
    );


    setStateClass(
        HealthDOM.overviewIcon,
        state
    );


    if (healthy) {

        setText(
            HealthDOM.overallStatus,
            "النظام يعمل بشكل ممتاز"
        );


        setText(
            HealthDOM.overallMessage,
            "جميع الخدمات الأساسية التي تم فحصها تعمل بصورة طبيعية."
        );


        updateBadge(
            "healthy",
            "النظام سليم",
            "fa-circle-check"
        );


        if (
            HealthDOM.overviewIconSymbol
        ) {

            HealthDOM.overviewIconSymbol.className =
                "fa-solid fa-circle-check";

        }

    } else if (error) {

        setText(
            HealthDOM.overallStatus,
            "تعذر فحص النظام"
        );


        setText(
            HealthDOM.overallMessage,
            "تعذر الوصول إلى endpoint الخاص بفحص حالة النظام."
        );


        updateBadge(
            "danger",
            "فشل الفحص",
            "fa-circle-xmark"
        );


        if (
            HealthDOM.overviewIconSymbol
        ) {

            HealthDOM.overviewIconSymbol.className =
                "fa-solid fa-triangle-exclamation";

        }

    } else {

        setText(
            HealthDOM.overallStatus,
            "يوجد مكوّن يحتاج إلى المراجعة"
        );


        setText(
            HealthDOM.overallMessage,
            "تم الوصول إلى النظام ولكن إحدى الخدمات تحتاج إلى الانتباه."
        );


        updateBadge(
            "warning",
            "تحذير",
            "fa-triangle-exclamation"
        );


        if (
            HealthDOM.overviewIconSymbol
        ) {

            HealthDOM.overviewIconSymbol.className =
                "fa-solid fa-triangle-exclamation";

        }

    }


    animateNumber(
        HealthDOM.score,
        score
    );

}


/* ================================================================
   BADGE
================================================================ */

function updateBadge(
    state,
    text,
    icon
) {

    if (
        !HealthDOM.overallBadge
    ) {

        return;

    }


    setStateClass(
        HealthDOM.overallBadge,
        state
    );


    HealthDOM.overallBadge.innerHTML = `

        <span class="health-status-badge-icon">

            <i class="fa-solid ${icon}"></i>

        </span>

        <span>
            ${escapeHtml(text)}
        </span>

    `;

}


/* ================================================================
   SCORE UI
================================================================ */

function updateScore(
    score,
    states
) {

    animateNumber(
        HealthDOM.score,
        score
    );


    if (
        HealthDOM.scoreCircle
    ) {

        HealthDOM.scoreCircle
            .style.setProperty(
                "--health-score",
                `${score}%`
            );

    }


    const values =
        Object.values(
            states || {}
        );


    const healthy =
        values.filter(
            value => value === true
        ).length;


    const total =
        values.length;


    const errors =
        values.filter(
            value => value === false
        ).length;


    const warnings =
        Math.max(
            0,
            total -
            healthy -
            errors
        );


    setText(
        HealthDOM.healthyCount,
        healthy
    );


    setText(
        HealthDOM.warningCount,
        warnings
    );


    setText(
        HealthDOM.errorCount,
        errors
    );

}


/* ================================================================
   UPTIME
================================================================ */

function updateUptime(
    result,
    states
) {

    let uptime =
        Number(
            result.uptime
        );


    /*
     * If Flask sends uptime as percentage.
     */

    if (
        Number.isFinite(uptime)
    ) {

        uptime =
            Math.max(
                0,
                Math.min(
                    100,
                    uptime
                )
            );

    } else {

        const values =
            Object.values(
                states || {}
            );


        const healthy =
            values.filter(
                Boolean
            ).length;


        uptime =
            values.length
                ? Math.round(
                    (
                        healthy /
                        values.length
                    ) *
                    100
                )
                : 0;

    }


    setText(
        HealthDOM.uptime,
        `${uptime}%`
    );


    setWidth(
        HealthDOM.uptimeProgress,
        uptime
    );


    const values =
        Object.values(
            states || {}
        );


    const online =
        values.filter(
            Boolean
        ).length;


    setText(
        HealthDOM.servicesOnline,
        `${online} / ${values.length || 0}`
    );

}


/* ================================================================
   SERVICE CARDS
================================================================ */

function updateServiceCards(
    states,
    result
) {

    HealthDOM.serviceCards.forEach(
        function (card) {

            const service =
                card.dataset.service;


            const value =
                states[
                    service
                ];


            let state =
                "warning";


            if (
                value === true
            ) {

                state =
                    "healthy";

            } else if (
                value === false
            ) {

                state =
                    "danger";

            }


            setStateClass(
                card,
                state
            );


            const statusText =
                card.querySelector(
                    ".health-service-status-text"
                );


            const valueElement =
                card.querySelector(
                    `[data-service-value="${service}"]`
                );


            if (
                state === "healthy"
            ) {

                setText(
                    statusText,
                    "يعمل بشكل طبيعي"
                );


                setText(
                    valueElement,
                    getServiceValue(
                        service,
                        result
                    )
                );

            } else if (
                state === "danger"
            ) {

                setText(
                    statusText,
                    "يوجد خطأ"
                );


                setText(
                    valueElement,
                    "ERROR"
                );

            } else {

                setText(
                    statusText,
                    "غير معروف"
                );


                setText(
                    valueElement,
                    "--"
                );

            }

        }
    );

}


/* ================================================================
   SERVICE VALUE
================================================================ */

function getServiceValue(
    service,
    result
) {

    const services =
        result.services || {};


    switch (
        service
    ) {

        case "database":

            return "CONNECTED";


        case "server":

            return "ONLINE";


        case "api":

            return "ONLINE";


        case "authentication":

            return (
                isHealthyStatus(
                    services.authentication
                ) ||
                isHealthyStatus(
                    services.auth
                )
                    ? "SECURE"
                    : "ACTIVE"
            );


        case "frontend":

            return "ACTIVE";


        case "session":

            return (
                result.authenticated
                    ? "ACTIVE"
                    : "AVAILABLE"
            );


        default:

            return "OK";

    }

}


/* ================================================================
   DATABASE INFORMATION
================================================================ */

function updateDatabaseInformation(
    result,
    healthy
) {

    const database =
        result.database;


    const responseTime =
        result.database_response_time ??
        result.databaseResponseTime ??
        result.db_response_time ??
        result.responseTime;


    setText(
        HealthDOM.databaseConnectionStatus,
        healthy
            ? "متصلة بنجاح"
            : "غير متصلة"
    );


    setText(
        HealthDOM.databasePingStatus,
        healthy
            ? "SELECT 1 ناجح"
            : "فشل الاختبار"
    );


    setText(
        HealthDOM.databaseResponseTime,
        Number.isFinite(
            Number(responseTime)
        )
            ? `${Number(responseTime)} ms`
            : "--"
    );


    setText(
        HealthDOM.databaseLastCheck,
        formatTime()
    );

}


/* ================================================================
   SYSTEM INFORMATION
================================================================ */

function updateSystemInformation(
    result,
    apiHealthy
) {

    setText(
        HealthDOM.serverStatus,
        apiHealthy
            ? "Online"
            : "Offline"
    );


    setText(
        HealthDOM.browserName,
        detectBrowser()
    );


    setText(
        HealthDOM.platformName,
        detectPlatform()
    );


    setText(
        HealthDOM.networkStatus,
        navigator.onLine
            ? "متصل بالإنترنت"
            : "غير متصل"
    );


    setText(
        HealthDOM.lastSystemCheck,
        formatDateTime()
    );


    setText(
        HealthDOM.serverTime,
        getServerTime(
            result
        )
    );


    setText(
        HealthDOM.connectionHealth,
        apiHealthy
            ? "مستقر"
            : "غير مستقر"
    );

}


/* ================================================================
   SERVER TIME
================================================================ */

function getServerTime(
    result
) {

    const value =
        result.server_time ||
        result.serverTime ||
        result.time ||
        result.timestamp;


    if (!value) {

        return formatTime();

    }


    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return safeText(
            value
        );

    }


    return formatDateTime(
        date
    );

}


/* ================================================================
   BROWSER
================================================================ */

function detectBrowser() {

    const ua =
        navigator.userAgent;


    if (
        ua.includes("Edg/")
    ) {

        return "Microsoft Edge";

    }


    if (
        ua.includes("Chrome/")
    ) {

        return "Google Chrome";

    }


    if (
        ua.includes("Firefox/")
    ) {

        return "Mozilla Firefox";

    }


    if (
        ua.includes("Safari/") &&
        !ua.includes("Chrome/")
    ) {

        return "Apple Safari";

    }


    return "متصفح غير معروف";

}


/* ================================================================
   PLATFORM
================================================================ */

function detectPlatform() {

    const platform =
        navigator.userAgentData?.platform ||
        navigator.platform ||
        "";


    return platform ||
        "غير معروف";

}


/* ================================================================
   LAST CHECK
================================================================ */

function updateLastCheck(
    result
) {

    const date =
        result.checkedAt instanceof Date
            ? result.checkedAt
            : new Date();


    setText(
        HealthDOM.lastCheck,
        formatTime(
            date
        )
    );


    setText(
        HealthDOM.lastSystemCheck,
        formatDateTime(
            date
        )
    );

}


/* ================================================================
   NOTICE
================================================================ */

function updateNotice(
    result,
    healthy,
    errorMessage = null
) {

    if (
        !HealthDOM.notice
    ) {

        return;

    }


    if (
        errorMessage
    ) {

        setText(
            HealthDOM.notice,
            errorMessage
        );


        return;

    }


    if (
        healthy
    ) {

        setText(
            HealthDOM.notice,
            "آخر فحص ناجح. جميع الخدمات الأساسية التي تم التحقق منها تعمل بصورة طبيعية."
        );

    } else {

        setText(
            HealthDOM.notice,
            "تم الوصول إلى النظام، ولكن توجد خدمة أو أكثر تحتاج إلى المراجعة."
        );

    }

}


/* ================================================================
   ERROR
================================================================ */

function showError(
    message
) {

    if (
        !HealthDOM.errorPanel
    ) {

        return;

    }


    HealthDOM.errorPanel.hidden =
        false;


    setText(
        HealthDOM.errorMessage,
        message
    );

}


function hideError() {

    if (
        !HealthDOM.errorPanel
    ) {

        return;

    }


    HealthDOM.errorPanel.hidden =
        true;

}


/* ================================================================
   ERROR MESSAGE
================================================================ */

function getErrorMessage(
    error
) {

    if (!error) {

        return "حدث خطأ غير معروف.";

    }


    if (
        error.name ===
        "AbortError"
    ) {

        return "انتهت مهلة الاتصال بالخادم بعد 10 ثوانٍ.";

    }


    if (
        error.message &&
        (
            error.message.includes(
                "Failed to fetch"
            ) ||
            error.message.includes(
                "NetworkError"
            ) ||
            error.message.includes(
                "Load failed"
            )
        )
    ) {

        return "تعذر الاتصال بخادم SMART POS. تأكد أن Flask يعمل وأن الاتصال بالخادم متاح.";

    }


    if (
        error.message
    ) {

        return String(
            error.message
        );

    }


    return "حدث خطأ أثناء فحص النظام.";

}


/* ================================================================
   EVENTS STORAGE
================================================================ */

function loadEvents() {

    try {

        const raw =
            localStorage.getItem(
                HEALTH_CONFIG.storageKey
            );


        if (!raw) {

            HealthState.events =
                [];

            renderEvents();

            return;

        }


        const parsed =
            JSON.parse(
                raw
            );


        if (
            Array.isArray(parsed)
        ) {

            HealthState.events =
                parsed.slice(
                    0,
                    HEALTH_CONFIG.maxEvents
                );

        } else {

            HealthState.events =
                [];

        }

    } catch (error) {

        console.warn(
            "Unable to load health activity.",
            error
        );


        HealthState.events =
            [];

    }


    renderEvents();

}


/* ================================================================
   SAVE EVENTS
================================================================ */

function saveEvents() {

    try {

        localStorage.setItem(
            HEALTH_CONFIG.storageKey,
            JSON.stringify(
                HealthState.events
            )
        );

    } catch (error) {

        console.warn(
            "Unable to save health activity.",
            error
        );

    }

}


/* ================================================================
   ADD EVENT
================================================================ */

function addHealthEvent(
    result
) {

    const healthy =
        normalizeStatus(
            result.status
        ) === "ok" &&
        normalizeStatus(
            result.database
        ) === "connected";


    const event = {

        id:
            `${Date.now()}-${Math.random()
                .toString(36)
                .slice(2)}`,

        healthy,

        status:
            safeText(
                result.status,
                "unknown"
            ),

        database:
            safeText(
                result.database,
                "unknown"
            ),

        responseTime:
            Number.isFinite(
                Number(
                    result.responseTime
                )
            )
                ? Number(
                    result.responseTime
                )
                : null,

        error:
            result.error ||
            null,

        time:
            new Date().toISOString()

    };


    HealthState.events.unshift(
        event
    );


    if (
        HealthState.events.length >
        HEALTH_CONFIG.maxEvents
    ) {

        HealthState.events =
            HealthState.events.slice(
                0,
                HEALTH_CONFIG.maxEvents
            );

    }


    renderEvents();

}


/* ================================================================
   RENDER EVENTS
================================================================ */

function renderEvents() {

    if (
        !HealthDOM.activityList
    ) {

        return;

    }


    if (
        !HealthState.events.length
    ) {

        HealthDOM.activityList.innerHTML = `

            <div class="health-empty-state">

                <div class="health-empty-icon">

                    <i class="fa-solid fa-wave-square"></i>

                </div>

                <h3>
                    لا توجد عمليات فحص بعد
                </h3>

                <p>
                    سيتم تسجيل عمليات الفحص هنا تلقائيًا.
                </p>

            </div>

        `;

        return;

    }


    HealthDOM.activityList.innerHTML =
        HealthState.events
            .map(
                renderSingleEvent
            )
            .join("");

}


/* ================================================================
   RENDER EVENT
================================================================ */

function renderSingleEvent(
    event
) {

    const healthy =
        Boolean(
            event.healthy
        );


    const status =
        healthy
            ? "success"
            : "danger";


    const icon =
        healthy
            ? "fa-circle-check"
            : "fa-circle-xmark";


    const title =
        healthy
            ? "فحص ناجح"
            : "فشل أو تحذير";


    const message =
        event.error
            ? escapeHtml(
                event.error
            )
            : "تم تنفيذ فحص النظام بنجاح.";


    const response =
        event.responseTime !== null
            ? `${event.responseTime} ms`
            : "--";


    let eventDate =
        new Date(
            event.time
        );


    if (
        Number.isNaN(
            eventDate.getTime()
        )
    ) {

        eventDate =
            new Date();

    }


    return `

        <div
            class="health-event ${status}"
            data-event-id="${escapeHtml(
                event.id
            )}"
        >

            <div class="health-event-icon">

                <i class="fa-solid ${icon}"></i>

            </div>


            <div class="health-event-content">

                <strong>
                    ${title}
                </strong>

                <span>
                    ${message}
                </span>

            </div>


            <div class="health-event-meta">

                <span>
                    ${escapeHtml(
                        response
                    )}
                </span>

                <time>
                    ${escapeHtml(
                        formatTime(
                            eventDate
                        )
                    )}
                </time>

            </div>

        </div>

    `;

}


/* ================================================================
   CLEAR EVENTS
================================================================ */

function clearEvents() {

    HealthState.events =
        [];


    try {

        localStorage.removeItem(
            HEALTH_CONFIG.storageKey
        );

    } catch (error) {

        console.warn(
            error
        );

    }


    renderEvents();


    setText(
        HealthDOM.notice,
        "تم مسح سجل فحوصات النظام من المتصفح."
    );

}


/* ================================================================
   ESCAPE HTML
================================================================ */

function escapeHtml(
    value
) {

    return String(
        value
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


/* ================================================================
   AUTO REFRESH
================================================================ */

function startAutoRefresh() {

    stopAutoRefresh();


    HealthState.autoRefresh =
        true;


    HealthState.refreshTimer =
        window.setInterval(
            function () {

                if (
                    document.hidden
                ) {

                    return;

                }


                if (
                    HealthState.checking
                ) {

                    return;

                }


                checkHealth();

            },
            HEALTH_CONFIG.defaultInterval
        );

}


/* ================================================================
   STOP AUTO REFRESH
================================================================ */

function stopAutoRefresh() {

    if (
        HealthState.refreshTimer
    ) {

        window.clearInterval(
            HealthState.refreshTimer
        );

    }


    HealthState.refreshTimer =
        null;


    HealthState.autoRefresh =
        false;

}


/* ================================================================
   VISIBILITY
================================================================ */

function handleVisibilityChange() {

    if (
        document.hidden
    ) {

        return;

    }


    if (
        HealthState.autoRefresh &&
        !HealthState.checking
    ) {

        checkHealth();

    }

}


/* ================================================================
   ONLINE / OFFLINE
================================================================ */

function handleNetworkChange() {

    if (
        !navigator.onLine
    ) {

        setText(
            HealthDOM.networkStatus,
            "غير متصل بالإنترنت"
        );


        updateNotice(
            {},
            false,
            "المتصفح فقد الاتصال بالشبكة."
        );


        return;

    }


    setText(
        HealthDOM.networkStatus,
        "متصل بالإنترنت"
    );


    if (
        !HealthState.checking
    ) {

        checkHealth();

    }

}


/* ================================================================
   BUTTON EVENTS
================================================================ */

function setupEventListeners() {

    /*
     * Main check
     */

    if (
        HealthDOM.checkButton
    ) {

        HealthDOM.checkButton
            .addEventListener(
                "click",
                function () {

                    checkHealth();

                }
            );

    }


    /*
     * Refresh
     */

    if (
        HealthDOM.refreshButton
    ) {

        HealthDOM.refreshButton
            .addEventListener(
                "click",
                function () {

                    checkHealth();

                }
            );

    }


    /*
     * Retry
     */

    if (
        HealthDOM.retryButton
    ) {

        HealthDOM.retryButton
            .addEventListener(
                "click",
                function () {

                    hideError();

                    checkHealth();

                }
            );

    }


    /*
     * Clear activity
     */

    if (
        HealthDOM.clearActivity
    ) {

        HealthDOM.clearActivity
            .addEventListener(
                "click",
                function () {

                    clearEvents();

                }
            );

    }


    /*
     * Visibility
     */

    document.addEventListener(
        "visibilitychange",
        handleVisibilityChange
    );


    /*
     * Network
     */

    window.addEventListener(
        "online",
        handleNetworkChange
    );


    window.addEventListener(
        "offline",
        handleNetworkChange
    );

}


/* ================================================================
   KEYBOARD SHORTCUTS
================================================================ */

function setupKeyboardShortcuts() {

    document.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key.toLowerCase() ===
                "r" &&
                !isTypingTarget(
                    event.target
                )
            ) {

                event.preventDefault();

                checkHealth();

            }


            /*
             * Ctrl + Shift + R
             *
             * Toggle auto refresh.
             */

            if (
                (
                    event.ctrlKey ||
                    event.metaKey
                ) &&
                event.shiftKey &&
                event.key.toLowerCase() ===
                    "r"
            ) {

                event.preventDefault();


                if (
                    HealthState.autoRefresh
                ) {

                    stopAutoRefresh();

                } else {

                    startAutoRefresh();

                }

            }

        }
    );

}


/* ================================================================
   TYPING TARGET
================================================================ */

function isTypingTarget(
    element
) {

    if (!element) {

        return false;

    }


    const tag =
        element.tagName
            ?.toLowerCase();


    return [
        "input",
        "textarea",
        "select"
    ].includes(
        tag
    ) ||
    element.isContentEditable;

}


/* ================================================================
   INITIAL UI
================================================================ */

function setInitialUI() {

    setText(
        HealthDOM.overallStatus,
        "جاري فحص النظام..."
    );


    setText(
        HealthDOM.overallMessage,
        "يتم الآن الاتصال بخادم SMART POS والتحقق من حالته."
    );


    setText(
        HealthDOM.lastCheck,
        "--"
    );


    setText(
        HealthDOM.score,
        "0"
    );


    setText(
        HealthDOM.healthyCount,
        "0"
    );


    setText(
        HealthDOM.warningCount,
        "0"
    );


    setText(
        HealthDOM.errorCount,
        "0"
    );


    setText(
        HealthDOM.uptime,
        "--"
    );


    setText(
        HealthDOM.servicesOnline,
        "--"
    );


    setText(
        HealthDOM.databaseConnectionStatus,
        "جاري الفحص..."
    );


    setText(
        HealthDOM.databasePingStatus,
        "--"
    );


    setText(
        HealthDOM.databaseResponseTime,
        "--"
    );


    setText(
        HealthDOM.databaseLastCheck,
        "--"
    );


    setText(
        HealthDOM.serverStatus,
        "Checking"
    );


    setText(
        HealthDOM.browserName,
        detectBrowser()
    );


    setText(
        HealthDOM.platformName,
        detectPlatform()
    );


    setText(
        HealthDOM.networkStatus,
        navigator.onLine
            ? "متصل بالإنترنت"
            : "غير متصل"
    );


    setText(
        HealthDOM.lastSystemCheck,
        "--"
    );


    setText(
        HealthDOM.serverTime,
        "--"
    );


    setText(
        HealthDOM.connectionHealth,
        "جاري الفحص"
    );


    setText(
        HealthDOM.notice,
        "يتم تجهيز مراقبة النظام..."
    );

}


/* ================================================================
   CLEANUP
================================================================ */

function cleanupHealthMonitor() {

    stopAutoRefresh();

}


/* ================================================================
   BOOT
================================================================ */

function initializeHealthPage() {

    if (
        HealthState.initialized
    ) {

        return;

    }


    HealthState.initialized =
        true;


    HealthState.startedAt =
        new Date();


    cacheHealthDOM();


    if (
        !HealthDOM.page
    ) {

        console.warn(
            "SMART POS Health page was not found."
        );


        return;

    }


    setInitialUI();


    loadEvents();


    setupEventListeners();


    setupKeyboardShortcuts();


    /*
     * Start real automatic monitoring.
     */

    startAutoRefresh();


    /*
     * Immediately perform the first
     * real server check.
     */

    checkHealth();

}


/* ================================================================
   PAGE LIFECYCLE
================================================================ */

window.addEventListener(
    "beforeunload",
    cleanupHealthMonitor
);


/* ================================================================
   DOM READY
================================================================ */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        initializeHealthPage
    );

} else {

    initializeHealthPage();

}


/* ================================================================
   GLOBAL SMART POS HEALTH API
================================================================ */

window.SMART_POS_HEALTH =
    window.SMART_POS_HEALTH || {};


/*
 * Endpoint
 */

window.SMART_POS_HEALTH.endpoint =
    getHealthEndpoint;


/*
 * Check
 */

window.SMART_POS_HEALTH.check =
    checkHealth;


/*
 * Start monitoring
 */

window.SMART_POS_HEALTH.start =
    startAutoRefresh;


/*
 * Stop monitoring
 */

window.SMART_POS_HEALTH.stop =
    stopAutoRefresh;


/*
 * Clear activity
 */

window.SMART_POS_HEALTH.clearEvents =
    clearEvents;


/*
 * State
 */

window.SMART_POS_HEALTH.state =
    HealthState;