
/* =========================================================
   SMART POS / ERP
   app.js
   Global Application JavaScript
   ========================================================= */

"use strict";

/* =========================================================
   GLOBAL APPLICATION OBJECT
   ========================================================= */

window.SmartPOS = window.SmartPOS || {};

SmartPOS.config = {
    appName: "SMART POS / ERP",
    currency: "EGP",
    currencySymbol: "ج.م",
    locale: "ar-EG",

    selectors: {
        body: "body",
        sidebar: "#sidebar",
        overlay: "#sidebarOverlay",
        notificationContainer: "#notificationContainer",
        modalContainer: "#modalContainer",
        loadingOverlay: "#loadingOverlay"
    },

    storage: {
        theme: "smartpos_theme",
        sidebar: "smartpos_sidebar",
        language: "smartpos_language"
    }
};


/* =========================================================
   DOM HELPERS
   ========================================================= */

SmartPOS.$ = function (selector, parent = document) {
    return parent.querySelector(selector);
};

SmartPOS.$$ = function (selector, parent = document) {
    return Array.from(parent.querySelectorAll(selector));
};

SmartPOS.createElement = function (tag, className = "", attributes = {}) {
    const element = document.createElement(tag);

    if (className) {
        element.className = className;
    }

    Object.entries(attributes).forEach(([key, value]) => {
        element.setAttribute(key, value);
    });

    return element;
};


/* =========================================================
   SAFE HTML
   ========================================================= */

SmartPOS.escapeHTML = function (value) {
    if (value === null || value === undefined) {
        return "";
    }

    const div = document.createElement("div");
    div.textContent = String(value);

    return div.innerHTML;
};


/* =========================================================
   CSRF TOKEN
   ========================================================= */

SmartPOS.getCSRFToken = function () {
    const meta = document.querySelector(
        'meta[name="csrf-token"]'
    );

    if (meta) {
        return meta.getAttribute("content");
    }

    const input = document.querySelector(
        'input[name="csrf_token"]'
    );

    if (input) {
        return input.value;
    }

    return null;
};


/* =========================================================
   API REQUEST HELPER
   ========================================================= */

SmartPOS.api = async function (
    url,
    options = {}
) {
    const config = {
        method: "GET",
        credentials: "same-origin",
        headers: {
            "Accept": "application/json"
        },
        ...options
    };

    config.headers = {
        "Accept": "application/json",
        ...(options.headers || {})
    };

    const csrfToken = SmartPOS.getCSRFToken();

    if (
        csrfToken &&
        ["POST", "PUT", "PATCH", "DELETE"].includes(
            String(config.method).toUpperCase()
        )
    ) {
        config.headers["X-CSRFToken"] = csrfToken;
    }

    if (
        config.body &&
        !(config.body instanceof FormData)
    ) {
        config.headers["Content-Type"] =
            "application/json";

        if (typeof config.body !== "string") {
            config.body = JSON.stringify(config.body);
        }
    }

    try {
        const response = await fetch(url, config);

        const contentType =
            response.headers.get("content-type") || "";

        let data;

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            const message =
                typeof data === "object" &&
                data?.message
                    ? data.message
                    : `حدث خطأ في الطلب (${response.status})`;

            throw new Error(message);
        }

        return data;

    } catch (error) {
        console.error(
            "SMART POS API Error:",
            error
        );

        throw error;
    }
};


/* =========================================================
   FORM DATA TO OBJECT
   ========================================================= */

SmartPOS.formToObject = function (form) {
    const formData = new FormData(form);
    const object = {};

    formData.forEach((value, key) => {
        if (object[key] !== undefined) {

            if (!Array.isArray(object[key])) {
                object[key] = [object[key]];
            }

            object[key].push(value);

        } else {
            object[key] = value;
        }
    });

    return object;
};


/* =========================================================
   FORM SUBMISSION
   ========================================================= */

SmartPOS.submitForm = async function (
    form,
    options = {}
) {
    if (!form) {
        throw new Error("Form not found.");
    }

    const method =
        (
            options.method ||
            form.getAttribute("method") ||
            "POST"
        ).toUpperCase();

    const action =
        options.action ||
        form.getAttribute("action") ||
        window.location.href;

    const formData = new FormData(form);

    const csrfToken = SmartPOS.getCSRFToken();

    if (
        csrfToken &&
        !formData.has("csrf_token")
    ) {
        formData.append(
            "csrf_token",
            csrfToken
        );
    }

    try {
        SmartPOS.showLoading();

        const response = await fetch(action, {
            method,
            body: formData,
            credentials: "same-origin",
            headers: {
                "X-Requested-With":
                    "XMLHttpRequest"
            }
        });

        const contentType =
            response.headers.get("content-type") || "";

        let data;

        if (contentType.includes("application/json")) {
            data = await response.json();
        } else {
            data = await response.text();
        }

        if (!response.ok) {
            throw new Error(
                data?.message ||
                "تعذر تنفيذ العملية."
            );
        }

        if (options.onSuccess) {
            options.onSuccess(data);
        }

        return data;

    } catch (error) {

        console.error(
            "Form submission error:",
            error
        );

        SmartPOS.notify(
            error.message ||
            "حدث خطأ أثناء تنفيذ العملية.",
            "error"
        );

        throw error;

    } finally {
        SmartPOS.hideLoading();
    }
};


/* =========================================================
   NOTIFICATIONS
   ========================================================= */

SmartPOS.notify = function (
    message,
    type = "info",
    duration = 4500
) {
    let container =
        SmartPOS.$(
            SmartPOS.config.selectors
                .notificationContainer
        );

    if (!container) {
        container = SmartPOS.createElement(
            "div",
            "smartpos-notifications",
            {
                id: "notificationContainer",
                "aria-live": "polite",
                "aria-atomic": "true"
            }
        );

        document.body.appendChild(container);
    }

    const notification =
        SmartPOS.createElement(
            "div",
            `smartpos-notification notification-${type}`
        );

    const icons = {
        success: "fa-circle-check",
        error: "fa-circle-exclamation",
        warning: "fa-triangle-exclamation",
        info: "fa-circle-info"
    };

    const icon =
        icons[type] || icons.info;

    notification.innerHTML = `
        <div class="notification-icon">
            <i class="fa-solid ${icon}"></i>
        </div>

        <div class="notification-content">
            <div class="notification-message">
                ${SmartPOS.escapeHTML(message)}
            </div>
        </div>

        <button
            type="button"
            class="notification-close"
            aria-label="إغلاق"
        >
            <i class="fa-solid fa-xmark"></i>
        </button>
    `;

    const closeButton =
        SmartPOS.$(
            ".notification-close",
            notification
        );

    const remove = () => {
        notification.classList.add(
            "notification-removing"
        );

        setTimeout(() => {
            notification.remove();
        }, 250);
    };

    closeButton.addEventListener(
        "click",
        remove
    );

    container.appendChild(notification);

    requestAnimationFrame(() => {
        notification.classList.add(
            "notification-visible"
        );
    });

    if (duration > 0) {
        setTimeout(remove, duration);
    }

    return notification;
};


/* =========================================================
   LOADING OVERLAY
   ========================================================= */

SmartPOS.showLoading = function (
    message = "جاري تنفيذ العملية..."
) {
    let overlay =
        SmartPOS.$(
            SmartPOS.config.selectors
                .loadingOverlay
        );

    if (!overlay) {
        overlay = SmartPOS.createElement(
            "div",
            "smartpos-loading-overlay",
            {
                id: "loadingOverlay"
            }
        );

        overlay.innerHTML = `
            <div class="loading-box">

                <div class="loading-spinner">
                    <i class="fa-solid fa-circle-notch fa-spin"></i>
                </div>

                <div class="loading-message">
                    ${SmartPOS.escapeHTML(message)}
                </div>

            </div>
        `;

        document.body.appendChild(overlay);
    }

    overlay.classList.add(
        "loading-visible"
    );

    document.body.classList.add(
        "is-loading"
    );
};


SmartPOS.hideLoading = function () {
    const overlay =
        SmartPOS.$(
            SmartPOS.config.selectors
                .loadingOverlay
        );

    if (overlay) {
        overlay.classList.remove(
            "loading-visible"
        );
    }

    document.body.classList.remove(
        "is-loading"
    );
};


/* =========================================================
   MODAL
   ========================================================= */

SmartPOS.openModal = function (
    content,
    options = {}
) {
    let container =
        SmartPOS.$(
            SmartPOS.config.selectors
                .modalContainer
        );

    if (!container) {
        container = SmartPOS.createElement(
            "div",
            "smartpos-modal-container",
            {
                id: "modalContainer"
            }
        );

        document.body.appendChild(container);
    }

    const title =
        options.title ||
        "SMART POS";

    const size =
        options.size ||
        "medium";

    container.innerHTML = `
        <div class="smartpos-modal-backdrop"></div>

        <div
            class="smartpos-modal modal-${size}"
            role="dialog"
            aria-modal="true"
            aria-label="${SmartPOS.escapeHTML(title)}"
        >

            <div class="smartpos-modal-header">

                <h3>
                    ${SmartPOS.escapeHTML(title)}
                </h3>

                <button
                    type="button"
                    class="smartpos-modal-close"
                    aria-label="إغلاق"
                >
                    <i class="fa-solid fa-xmark"></i>
                </button>

            </div>

            <div class="smartpos-modal-body">
                ${content}
            </div>

        </div>
    `;

    const close = () => {
        container.classList.remove(
            "modal-visible"
        );

        document.body.classList.remove(
            "modal-open"
        );

        setTimeout(() => {
            container.innerHTML = "";
        }, 200);
    };

    SmartPOS.$(
        ".smartpos-modal-close",
        container
    ).addEventListener(
        "click",
        close
    );

    SmartPOS.$(
        ".smartpos-modal-backdrop",
        container
    ).addEventListener(
        "click",
        close
    );

    document.addEventListener(
        "keydown",
        function escapeHandler(event) {
            if (event.key === "Escape") {
                close();

                document.removeEventListener(
                    "keydown",
                    escapeHandler
                );
            }
        }
    );

    document.body.classList.add(
        "modal-open"
    );

    requestAnimationFrame(() => {
        container.classList.add(
            "modal-visible"
        );
    });

    return {
        close
    };
};


/* =========================================================
   CONFIRMATION DIALOG
   ========================================================= */

SmartPOS.confirm = function (
    message,
    options = {}
) {
    return new Promise((resolve) => {

        const title =
            options.title ||
            "تأكيد العملية";

        const confirmText =
            options.confirmText ||
            "تأكيد";

        const cancelText =
            options.cancelText ||
            "إلغاء";

        const modal =
            SmartPOS.openModal(
                `
                <div class="confirm-dialog">

                    <div class="confirm-icon">
                        <i class="fa-solid fa-circle-question"></i>
                    </div>

                    <p class="confirm-message">
                        ${SmartPOS.escapeHTML(message)}
                    </p>

                    <div class="confirm-actions">

                        <button
                            type="button"
                            class="btn btn-secondary"
                            data-confirm-cancel
                        >
                            ${SmartPOS.escapeHTML(cancelText)}
                        </button>

                        <button
                            type="button"
                            class="btn btn-primary"
                            data-confirm-ok
                        >
                            ${SmartPOS.escapeHTML(confirmText)}
                        </button>

                    </div>

                </div>
                `,
                {
                    title
                }
            );

        const container =
            SmartPOS.$(
                "#modalContainer"
            );

        SmartPOS.$(
            "[data-confirm-cancel]",
            container
        ).addEventListener(
            "click",
            () => {
                modal.close();
                resolve(false);
            }
        );

        SmartPOS.$(
            "[data-confirm-ok]",
            container
        ).addEventListener(
            "click",
            () => {
                modal.close();
                resolve(true);
            }
        );
    });
};


/* =========================================================
   SIDEBAR
   ========================================================= */

SmartPOS.initSidebar = function () {
    const sidebar =
        SmartPOS.$("#sidebar");

    const overlay =
        SmartPOS.$("#sidebarOverlay");

    const toggleButtons =
        SmartPOS.$$(
            "[data-sidebar-toggle]"
        );

    if (!sidebar) {
        return;
    }

    const openSidebar = () => {
        sidebar.classList.add(
            "sidebar-open"
        );

        if (overlay) {
            overlay.classList.add(
                "overlay-visible"
            );
        }

        document.body.classList.add(
            "sidebar-open"
        );
    };

    const closeSidebar = () => {
        sidebar.classList.remove(
            "sidebar-open"
        );

        if (overlay) {
            overlay.classList.remove(
                "overlay-visible"
            );
        }

        document.body.classList.remove(
            "sidebar-open"
        );
    };

    toggleButtons.forEach(button => {
        button.addEventListener(
            "click",
            () => {

                if (
                    sidebar.classList.contains(
                        "sidebar-open"
                    )
                ) {
                    closeSidebar();
                } else {
                    openSidebar();
                }

            }
        );
    });

    if (overlay) {
        overlay.addEventListener(
            "click",
            closeSidebar
        );
    }

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                sidebar.classList.contains(
                    "sidebar-open"
                )
            ) {
                closeSidebar();
            }
        }
    );
};


/* =========================================================
   ACTIVE NAVIGATION
   ========================================================= */

SmartPOS.initActiveNavigation = function () {
    const currentPath =
        window.location.pathname
            .replace(/\/+$/, "") || "/";

    SmartPOS.$$(
        "[data-nav-link]"
    ).forEach(link => {

        const href =
            link.getAttribute("href");

        if (!href || href === "#") {
            return;
        }

        try {
            const url =
                new URL(
                    href,
                    window.location.origin
                );

            const linkPath =
                url.pathname
                    .replace(/\/+$/, "") || "/";

            if (linkPath === currentPath) {
                link.classList.add(
                    "active"
                );

                link.setAttribute(
                    "aria-current",
                    "page"
                );
            }

        } catch (error) {
            console.warn(
                "Invalid navigation URL:",
                href
            );
        }
    });
};


/* =========================================================
   SEARCH / FILTER
   ========================================================= */

SmartPOS.initTableSearch = function () {
    SmartPOS.$$(
        "[data-table-search]"
    ).forEach(input => {

        const targetSelector =
            input.dataset.tableSearch;

        const target =
            document.querySelector(
                targetSelector
            );

        if (!target) {
            return;
        }

        input.addEventListener(
            "input",
            () => {

                const query =
                    input.value
                        .trim()
                        .toLowerCase();

                const rows =
                    target.querySelectorAll(
                        "tbody tr"
                    );

                rows.forEach(row => {

                    const text =
                        row.textContent
                            .toLowerCase();

                    row.style.display =
                        !query ||
                        text.includes(query)
                            ? ""
                            : "none";
                });
            }
        );
    });
};


/* =========================================================
   DEBOUNCE
   ========================================================= */

SmartPOS.debounce = function (
    callback,
    delay = 300
) {
    let timeout;

    return function (...args) {

        clearTimeout(timeout);

        timeout = setTimeout(
            () => {
                callback.apply(
                    this,
                    args
                );
            },
            delay
        );
    };
};


/* =========================================================
   THROTTLE
   ========================================================= */

SmartPOS.throttle = function (
    callback,
    delay = 200
) {
    let waiting = false;

    return function (...args) {

        if (waiting) {
            return;
        }

        callback.apply(
            this,
            args
        );

        waiting = true;

        setTimeout(
            () => {
                waiting = false;
            },
            delay
        );
    };
};


/* =========================================================
   CURRENCY FORMAT
   ========================================================= */

SmartPOS.formatCurrency = function (
    amount,
    currency = SmartPOS.config.currency
) {
    const number =
        Number(amount);

    if (!Number.isFinite(number)) {
        return `0 ${SmartPOS.config.currencySymbol}`;
    }

    try {
        return new Intl.NumberFormat(
            SmartPOS.config.locale,
            {
                style: "currency",
                currency,
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        ).format(number);

    } catch (error) {

        return `${number.toFixed(2)} ${SmartPOS.config.currencySymbol}`;
    }
};


/* =========================================================
   NUMBER FORMAT
   ========================================================= */

SmartPOS.formatNumber = function (
    value,
    decimals = 0
) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return new Intl.NumberFormat(
        SmartPOS.config.locale,
        {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }
    ).format(number);
};


/* =========================================================
   DATE FORMAT
   ========================================================= */

SmartPOS.formatDate = function (
    value,
    options = {}
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const defaultOptions = {
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    };

    return new Intl.DateTimeFormat(
        SmartPOS.config.locale,
        {
            ...defaultOptions,
            ...options
        }
    ).format(date);
};


/* =========================================================
   DATE + TIME FORMAT
   ========================================================= */

SmartPOS.formatDateTime = function (
    value
) {
    if (!value) {
        return "";
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return new Intl.DateTimeFormat(
        SmartPOS.config.locale,
        {
            dateStyle: "medium",
            timeStyle: "short"
        }
    ).format(date);
};


/* =========================================================
   LOCAL STORAGE
   ========================================================= */

SmartPOS.storage = {

    set(key, value) {
        try {
            localStorage.setItem(
                key,
                JSON.stringify(value)
            );

            return true;

        } catch (error) {
            console.warn(
                "LocalStorage error:",
                error
            );

            return false;
        }
    },

    get(key, defaultValue = null) {
        try {
            const value =
                localStorage.getItem(key);

            return value === null
                ? defaultValue
                : JSON.parse(value);

        } catch (error) {
            return defaultValue;
        }
    },

    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;

        } catch (error) {
            return false;
        }
    }
};


/* =========================================================
   THEME
   ========================================================= */

SmartPOS.initTheme = function () {
    const savedTheme =
        SmartPOS.storage.get(
            SmartPOS.config.storage.theme
        );

    if (
        savedTheme === "dark" ||
        savedTheme === "light"
    ) {
        document.documentElement
            .setAttribute(
                "data-theme",
                savedTheme
            );
    }

    SmartPOS.$$(
        "[data-theme-toggle]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const current =
                    document.documentElement
                        .getAttribute(
                            "data-theme"
                        ) || "light";

                const next =
                    current === "dark"
                        ? "light"
                        : "dark";

                document.documentElement
                    .setAttribute(
                        "data-theme",
                        next
                    );

                SmartPOS.storage.set(
                    SmartPOS.config
                        .storage.theme,
                    next
                );
            }
        );
    });
};


/* =========================================================
   PASSWORD VISIBILITY
   ========================================================= */

SmartPOS.initPasswordToggle = function () {
    SmartPOS.$$(
        "[data-password-toggle]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            () => {

                const targetSelector =
                    button.dataset
                        .passwordToggle;

                const input =
                    document.querySelector(
                        targetSelector
                    );

                if (!input) {
                    return;
                }

                const isPassword =
                    input.type === "password";

                input.type =
                    isPassword
                        ? "text"
                        : "password";

                const icon =
                    button.querySelector(
                       ("i")
                    );

                if (icon) {
                    icon.className =
                        isPassword
                            ? "fa-solid fa-eye-slash"
                            : "fa-solid fa-eye";
                }
            }
        );
    });
};


/* =========================================================
   DELETE ACTIONS
   ========================================================= */

SmartPOS.initDeleteActions = function () {
    SmartPOS.$$(
        "[data-confirm-delete]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            async event => {

                event.preventDefault();

                const message =
                    button.dataset
                        .confirmDelete ||
                    "هل أنت متأكد من حذف هذا العنصر؟";

                const confirmed =
                    await SmartPOS.confirm(
                        message,
                        {
                            title:
                                "تأكيد الحذف",
                            confirmText:
                                "حذف",
                            cancelText:
                                "إلغاء"
                        }
                    );

                if (!confirmed) {
                    return;
                }

                const form =
                    button.closest("form");

                if (form) {
                    form.submit();
                    return;
                }

                const href =
                    button.getAttribute(
                        "href"
                    );

                if (href) {
                    window.location.href =
                        href;
                }
            }
        );
    });
};


/* =========================================================
   DISABLE BUTTON DURING SUBMIT
   ========================================================= */

SmartPOS.initSubmitProtection = function () {
    document.addEventListener(
        "submit",
        event => {

            const form =
                event.target;

            if (
                !form ||
                form.dataset
                    .allowMultipleSubmit === "true"
            ) {
                return;
            }

            const submitButtons =
                form.querySelectorAll(
                    'button[type="submit"], input[type="submit"]'
                );

            submitButtons.forEach(button => {

                if (
                    button.dataset
                        .originalText === undefined
                ) {
                    button.dataset
                        .originalText =
                        button.innerHTML;
                }

                button.disabled = true;

                if (
                    button.tagName === "BUTTON"
                ) {
                    button.innerHTML = `
                        <i class="fa-solid fa-spinner fa-spin"></i>
                        جاري التنفيذ...
                    `;
                }
            });
        }
    );
};


/* =========================================================
   AUTO DISMISS FLASH MESSAGES
   ========================================================= */

SmartPOS.initFlashMessages = function () {
    SmartPOS.$$(
        "[data-auto-dismiss]"
    ).forEach(element => {

        const duration =
            Number(
                element.dataset
                    .autoDismiss
            ) || 5000;

        setTimeout(() => {

            element.classList.add(
                "is-hidden"
            );

            setTimeout(() => {
                element.remove();
            }, 300);

        }, duration);
    });
};


/* =========================================================
   COPY TO CLIPBOARD
   ========================================================= */

SmartPOS.copy = async function (
    text
) {
    if (!text) {
        return false;
    }

    try {

        await navigator.clipboard.writeText(
            text
        );

        SmartPOS.notify(
            "تم نسخ البيانات بنجاح.",
            "success"
        );

        return true;

    } catch (error) {

        console.error(
            "Clipboard error:",
            error
        );

        SmartPOS.notify(
            "تعذر نسخ البيانات.",
            "error"
        );

        return false;
    }
};


/* =========================================================
   COPY BUTTONS
   ========================================================= */

SmartPOS.initCopyButtons = function () {
    SmartPOS.$$(
        "[data-copy]"
    ).forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                const selector =
                    button.dataset.copy;

                let value = "";

                if (selector) {

                    const element =
                        document.querySelector(
                            selector
                        );

                    if (element) {
                        value =
                            element.value ??
                            element.textContent;
                    }

                } else {
                    value =
                        button.dataset
                            .copyValue || "";
                }

                await SmartPOS.copy(
                    String(value).trim()
                );
            }
        );
    });
};


/* =========================================================
   SCROLL TOP
   ========================================================= */

SmartPOS.initScrollTop = function () {
    const button =
        SmartPOS.$(
            "[data-scroll-top]"
        );

    if (!button) {
        return;
    }

    const update = () => {

        if (window.scrollY > 400) {
            button.classList.add(
                "visible"
            );
        } else {
            button.classList.remove(
                "visible"
            );
        }
    };

    window.addEventListener(
        "scroll",
        SmartPOS.throttle(update)
    );

    button.addEventListener(
        "click",
        () => {
            window.scrollTo({
                top: 0,
                behavior: "smooth"
            });
        }
    );

    update();
};


/* =========================================================
   NETWORK STATUS
   ========================================================= */

SmartPOS.initNetworkStatus = function () {

    const updateStatus = () => {

        if (navigator.onLine) {

            document.body.classList.remove(
                "offline"
            );

        } else {

            document.body.classList.add(
                "offline"
            );

            SmartPOS.notify(
                "لا يوجد اتصال بالإنترنت حاليًا.",
                "warning",
                6000
            );
        }
    };

    window.addEventListener(
        "online",
        updateStatus
    );

    window.addEventListener(
        "offline",
        updateStatus
    );

    updateStatus();
};


/* =========================================================
   GLOBAL AJAX ERROR HANDLING
   ========================================================= */

window.addEventListener(
    "unhandledrejection",
    event => {

        console.error(
            "Unhandled Promise Rejection:",
            event.reason
        );

        if (
            event.reason instanceof Error
        ) {
            SmartPOS.notify(
                "حدث خطأ غير متوقع أثناء تنفيذ العملية.",
                "error"
            );
        }
    }
);


/* =========================================================
   PAGE LOAD
   ========================================================= */

SmartPOS.init = function () {

    SmartPOS.initSidebar();

    SmartPOS.initActiveNavigation();

    SmartPOS.initTableSearch();

    SmartPOS.initTheme();

    SmartPOS.initPasswordToggle();

    SmartPOS.initDeleteActions();

    SmartPOS.initSubmitProtection();

    SmartPOS.initFlashMessages();

    SmartPOS.initCopyButtons();

    SmartPOS.initScrollTop();

    SmartPOS.initNetworkStatus();

    console.log(
        "%cSMART POS / ERP",
        "font-size:18px;font-weight:800;"
    );

    console.log(
        "Global application JavaScript loaded successfully."
    );
};


/* =========================================================
   DOM READY
   ========================================================= */

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        SmartPOS.init
    );
} else {
    SmartPOS.init();
}