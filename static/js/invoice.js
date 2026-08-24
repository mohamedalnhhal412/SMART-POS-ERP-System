
/* =========================================================
   SMART POS / ERP
   invoice.js
   Invoice Management & Printing
   ========================================================= */

"use strict";

window.SmartPOS = window.SmartPOS || {};

SmartPOS.invoice = SmartPOS.invoice || {};


/* =========================================================
   STATE
========================================================= */

SmartPOS.invoice.state = {

    initialized: false,

    printing: false,

    copied: false,

    invoiceNumber: null,

    saleId: null,

    printUrl: null,

    currency: "EGP"

};


/* =========================================================
   SELECTORS
========================================================= */

SmartPOS.invoice.selectors = {

    root:
        "[data-invoice]",

    invoiceNumber:
        "[data-invoice-number]",

    saleId:
        "[data-sale-id]",

    print:
        "[data-invoice-print]",

    printPage:
        "[data-invoice-print-page]",

    copyNumber:
        "[data-invoice-copy]",

    back:
        "[data-invoice-back]",

    newSale:
        "[data-invoice-new-sale]",

    download:
        "[data-invoice-download]",

    status:
        "[data-invoice-status]",

    message:
        "[data-invoice-message]",

    total:
        "[data-invoice-total]",

    paid:
        "[data-invoice-paid]",

    change:
        "[data-invoice-change]"

};


/* =========================================================
   DOM HELPERS
========================================================= */

SmartPOS.invoice.$ = function (
    selector,
    parent = document
) {

    return parent.querySelector(
        selector
    );

};


SmartPOS.invoice.$$ = function (
    selector,
    parent = document
) {

    return Array.from(
        parent.querySelectorAll(
            selector
        )
    );

};


/* =========================================================
   ROOT
========================================================= */

SmartPOS.invoice.getRoot =
    function () {

        return SmartPOS.invoice.$(
            SmartPOS.invoice
                .selectors
                .root
        );

    };


/* =========================================================
   INIT
========================================================= */

SmartPOS.invoice.init =
    function () {

        const root =
            SmartPOS.invoice.getRoot();

        if (!root) {

            return;

        }


        if (
            SmartPOS.invoice
                .state
                .initialized
        ) {

            return;

        }


        SmartPOS.invoice
            .state
            .initialized =
            true;


        SmartPOS.invoice
            .readData();


        SmartPOS.invoice
            .bindEvents();


        SmartPOS.invoice
            .setupPrint();


        console.log(
            "SMART POS Invoice initialized."
        );

    };


/* =========================================================
   READ DATA FROM HTML
========================================================= */

SmartPOS.invoice.readData =
    function () {

        const root =
            SmartPOS.invoice.getRoot();

        if (!root) {

            return;

        }


        SmartPOS.invoice
            .state
            .saleId =
            root.dataset.saleId ||
            null;


        SmartPOS.invoice
            .state
            .invoiceNumber =
            root.dataset.invoiceNumber ||
            null;


        SmartPOS.invoice
            .state
            .printUrl =
            root.dataset.printUrl ||
            null;


        SmartPOS.invoice
            .state
            .currency =
            root.dataset.currency ||
            "EGP";


        const numberElement =
            SmartPOS.invoice.$(
                SmartPOS.invoice
                    .selectors
                    .invoiceNumber
            );


        if (
            !SmartPOS.invoice
                .state
                .invoiceNumber &&
            numberElement
        ) {

            SmartPOS.invoice
                .state
                .invoiceNumber =
                numberElement
                    .textContent
                    .trim();

        }

    };


/* =========================================================
   GET PRINT URL
========================================================= */

SmartPOS.invoice.getPrintUrl =
    function () {

        if (
            SmartPOS.invoice
                .state
                .printUrl
        ) {

            return SmartPOS.invoice
                .state
                .printUrl;

        }


        const root =
            SmartPOS.invoice.getRoot();

        if (
            root &&
            root.dataset.printUrl
        ) {

            return root.dataset.printUrl;

        }


        return null;

    };


/* =========================================================
   PRINT CURRENT INVOICE
========================================================= */

SmartPOS.invoice.print =
    function () {

        if (
            SmartPOS.invoice
                .state
                .printing
        ) {

            return;

        }


        SmartPOS.invoice
            .state
            .printing =
            true;


        const printUrl =
            SmartPOS.invoice
                .getPrintUrl();


        if (printUrl) {

            const printWindow =
                window.open(
                    printUrl,
                    "_blank",
                    "noopener,noreferrer"
                );


            if (!printWindow) {

                SmartPOS.invoice.notify(
                    "المتصفح منع فتح نافذة الطباعة.",
                    "warning"
                );

            }


            setTimeout(
                () => {

                    SmartPOS.invoice
                        .state
                        .printing =
                        false;

                },
                800
            );


            return;

        }


        window.print();


        setTimeout(
            () => {

                SmartPOS.invoice
                    .state
                    .printing =
                    false;

            },
            800
        );

    };


/* =========================================================
   PRINT DIRECTLY
========================================================= */

SmartPOS.invoice.printCurrentPage =
    function () {

        window.print();

    };


/* =========================================================
   OPEN PRINT PAGE
========================================================= */

SmartPOS.invoice.openPrintPage =
    function () {

        const url =
            SmartPOS.invoice
                .getPrintUrl();


        if (!url) {

            SmartPOS.invoice.notify(
                "رابط طباعة الفاتورة غير موجود.",
                "error"
            );

            return;

        }


        const popup =
            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );


        if (!popup) {

            SmartPOS.invoice.notify(
                "تعذر فتح صفحة الطباعة.",
                "warning"
            );

        }

    };


/* =========================================================
   COPY INVOICE NUMBER
========================================================= */

SmartPOS.invoice.copyNumber =
    async function () {

        const number =
            SmartPOS.invoice
                .state
                .invoiceNumber;


        if (!number) {

            SmartPOS.invoice.notify(
                "رقم الفاتورة غير موجود.",
                "error"
            );

            return;

        }


        try {

            await navigator
                .clipboard
                .writeText(
                    String(number)
                );


            SmartPOS.invoice
                .state
                .copied =
                true;


            SmartPOS.invoice.notify(
                `تم نسخ رقم الفاتورة ${number}.`,
                "success"
            );


            setTimeout(
                () => {

                    SmartPOS.invoice
                        .state
                        .copied =
                        false;

                },
                2000
            );


        } catch (error) {

            console.error(
                "Copy invoice number error:",
                error
            );


            SmartPOS.invoice
                .fallbackCopy(
                    String(number)
                );

        }

    };


/* =========================================================
   FALLBACK COPY
========================================================= */

SmartPOS.invoice.fallbackCopy =
    function (
        text
    ) {

        const textarea =
            document.createElement(
                "textarea"
            );


        textarea.value =
            text;


        textarea.style.position =
            "fixed";

        textarea.style.opacity =
            "0";

        textarea.style.pointerEvents =
            "none";


        document.body.appendChild(
            textarea
        );


        textarea.focus();

        textarea.select();


        try {

            document.execCommand(
                "copy"
            );


            SmartPOS.invoice.notify(
                `تم نسخ رقم الفاتورة ${text}.`,
                "success"
            );


        } catch {

            SmartPOS.invoice.notify(
                "تعذر نسخ رقم الفاتورة.",
                "error"
            );

        }


        textarea.remove();

    };


/* =========================================================
   GO BACK
========================================================= */

SmartPOS.invoice.goBack =
    function () {

        if (
            window.history.length > 1
        ) {

            window.history.back();

            return;

        }


        window.location.href =
            "/";

    };


/* =========================================================
   NEW SALE
========================================================= */

SmartPOS.invoice.newSale =
    function () {

        /*
         * نرجع المستخدم إلى شاشة البيع.
         *
         * إذا كان عندك Route مختلف لشاشة POS،
         * ضع الرابط في data-pos-url داخل invoice.html.
         */

        const root =
            SmartPOS.invoice.getRoot();


        const posUrl =
            root?.dataset.posUrl ||
            "/pos";


        window.location.href =
            posUrl;

    };


/* =========================================================
   DOWNLOAD / SAVE
========================================================= */

SmartPOS.invoice.download =
    function () {

        const printUrl =
            SmartPOS.invoice
                .getPrintUrl();


        if (!printUrl) {

            SmartPOS.invoice.notify(
                "لا يوجد رابط للطباعة أو الحفظ.",
                "warning"
            );

            return;

        }


        /*
         * فتح صفحة الطباعة.
         * الحفظ كـ PDF يتم من نافذة الطباعة
         * في المتصفح.
         */

        const popup =
            window.open(
                printUrl,
                "_blank",
                "noopener,noreferrer"
            );


        if (!popup) {

            SmartPOS.invoice.notify(
                "تعذر فتح صفحة الفاتورة.",
                "warning"
            );

        }

    };


/* =========================================================
   FORMAT MONEY
========================================================= */

SmartPOS.invoice.money =
    function (
        value
    ) {

        const amount =
            Number(value);


        if (
            !Number.isFinite(
                amount
            )
        ) {

            return "0.00";

        }


        return amount.toLocaleString(
            "ar-EG",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );

    };


/* =========================================================
   UPDATE MONEY ELEMENTS
========================================================= */

SmartPOS.invoice.formatMoneyElements =
    function () {

        const elements =
            SmartPOS.invoice.$$(
                "[data-money]"
            );


        elements.forEach(
            element => {

                const value =
                    element.dataset.money;


                if (
                    value === undefined
                ) {

                    return;

                }


                element.textContent =
                    SmartPOS.invoice
                        .money(
                            value
                        );

            }
        );

    };


/* =========================================================
   UPDATE STATUS
========================================================= */

SmartPOS.invoice.setStatus =
    function (
        status,
        text
    ) {

        const element =
            SmartPOS.invoice.$(
                SmartPOS.invoice
                    .selectors
                    .status
            );


        if (!element) {

            return;

        }


        element.dataset.status =
            status || "";


        element.textContent =
            text ||
            status ||
            "";

    };


/* =========================================================
   SHOW MESSAGE
========================================================= */

SmartPOS.invoice.notify =
    function (
        message,
        type = "info"
    ) {

        if (
            typeof SmartPOS.notify ===
            "function"
        ) {

            SmartPOS.notify(
                message,
                type
            );

            return;

        }


        const container =
            SmartPOS.invoice.$(
                SmartPOS.invoice
                    .selectors
                    .message
            );


        if (!container) {

            console.log(
                `[${type}] ${message}`
            );

            return;

        }


        container.textContent =
            message;


        container.dataset.type =
            type;


        container.classList.add(
            "is-visible"
        );


        setTimeout(
            () => {

                container.classList.remove(
                    "is-visible"
                );

            },
            3500
        );

    };


/* =========================================================
   SETUP PRINT
========================================================= */

SmartPOS.invoice.setupPrint =
    function () {

        window.addEventListener(
            "beforeprint",
            () => {

                document.body.classList.add(
                    "printing-invoice"
                );

            }
        );


        window.addEventListener(
            "afterprint",
            () => {

                document.body.classList.remove(
                    "printing-invoice"
                );

            }
        );

    };


/* =========================================================
   KEYBOARD SHORTCUTS
========================================================= */

SmartPOS.invoice.bindKeyboard =
    function () {

        document.addEventListener(
            "keydown",
            event => {

                /*
                 * Ctrl + P
                 */

                if (
                    event.ctrlKey &&
                    event.key.toLowerCase() ===
                        "p"
                ) {

                    event.preventDefault();

                    SmartPOS.invoice.print();

                }


                /*
                 * Escape
                 */

                if (
                    event.key ===
                    "Escape"
                ) {

                    const active =
                        document.activeElement;


                    if (
                        active &&
                        (
                            active.tagName ===
                                "INPUT" ||
                            active.tagName ===
                                "TEXTAREA"
                        )
                    ) {

                        active.blur();

                    }

                }

            }
        );

    };


/* =========================================================
   BIND EVENTS
========================================================= */

SmartPOS.invoice.bindEvents =
    function () {

        const root =
            SmartPOS.invoice.getRoot();


        if (!root) {

            return;

        }


        /*
         * PRINT
         */

        const printButton =
            SmartPOS.invoice.$(
                SmartPOS.invoice
                    .selectors
                    .print
            );


        if (printButton) {

            printButton.addEventListener(
                "click",
                () => {

                    SmartPOS.invoice.print();

                }
            );

        }


        /*
         * PRINT PAGE
         */

        const printPageButton =
            SmartPOS.invoice.$(
                SmartPOS.invoice
                    .selectors
                    .printPage
            );


        if (printPageButton) {

            printPageButton.addEventListener(
                "click",
                () => {

                    SmartPOS.invoice
                        .openPrintPage();

                }
            );

        }


        /*
         * COPY
         */

        const copyButton =
            SmartPOS.invoice.$(
                SmartPOS.invoice
                    .selectors
                    .copyNumber
            );


        if (copyButton) {

            copyButton.addEventListener(
                "click",
                () => {

                    SmartPOS.invoice
                        .copyNumber();

                }
            );

        }


        /*
         * BACK
         */

        const backButton =
            SmartPOS.invoice.$(
                SmartPOS.invoice
                    .selectors
                    .back
            );


        if (backButton) {

            backButton.addEventListener(
                "click",
                () => {

                    SmartPOS.invoice.goBack();

                }
            );

        }


        /*
         * NEW SALE
         */

        const newSaleButton =
            SmartPOS.invoice.$(
                SmartPOS.invoice
                    .selectors
                    .newSale
            );


        if (newSaleButton) {

            newSaleButton.addEventListener(
                "click",
                () => {

                    SmartPOS.invoice
                        .newSale();

                }
            );

        }


        /*
         * DOWNLOAD
         */

        const downloadButton =
            SmartPOS.invoice.$(
                SmartPOS.invoice
                    .selectors
                    .download
            );


        if (downloadButton) {

            downloadButton.addEventListener(
                "click",
                () => {

                    SmartPOS.invoice
                        .download();

                }
            );

        }


        SmartPOS.invoice
            .bindKeyboard();

    };


/* =========================================================
   TABLE ENHANCEMENTS
========================================================= */

SmartPOS.invoice.enhanceTable =
    function () {

        const rows =
            SmartPOS.invoice.$$(
                "[data-invoice-item]"
            );


        rows.forEach(
            (row, index) => {

                row.dataset.index =
                    String(
                        index + 1
                    );

            }
        );

    };


/* =========================================================
   PRINT MODE
========================================================= */

SmartPOS.invoice.preparePrint =
    function () {

        document.body.classList.add(
            "invoice-print-mode"
        );


        /*
         * إخفاء العناصر التي لا نريدها
         * أثناء الطباعة.
         */

        SmartPOS.invoice.$$(
            "[data-no-print]"
        )
        .forEach(
            element => {

                element.setAttribute(
                    "data-print-hidden",
                    "true"
                );

            }
        );

    };


/* =========================================================
   CLEAN PRINT MODE
========================================================= */

SmartPOS.invoice.cleanPrint =
    function () {

        document.body.classList.remove(
            "invoice-print-mode"
        );


        SmartPOS.invoice.$$(
            "[data-print-hidden]"
        )
        .forEach(
            element => {

                element.removeAttribute(
                    "data-print-hidden"
                );

            }
        );

    };


/* =========================================================
   PRINT EVENTS
========================================================= */

window.addEventListener(
    "beforeprint",
    () => {

        SmartPOS.invoice
            .preparePrint();

    }
);


window.addEventListener(
    "afterprint",
    () => {

        SmartPOS.invoice
            .cleanPrint();

    }
);


/* =========================================================
   AUTO INIT
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        SmartPOS.invoice.init
    );

} else {

    SmartPOS.invoice.init();

}