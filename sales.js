
/* =========================================================
   SMART POS / ERP
   sales.js
   Sales Management
   ========================================================= */

"use strict";

window.SmartPOS = window.SmartPOS || {};

SmartPOS.sales = SmartPOS.sales || {};


/* =========================================================
   STATE
========================================================= */

SmartPOS.sales.state = {

    initialized: false,

    loading: false,

    page: 1,

    perPage: 20,

    totalPages: 1,

    total: 0,

    search: "",

    status: "",

    paymentMethod: "",

    dateFrom: "",

    dateTo: "",

    customerId: "",

    selectedSale: null,

    sales: [],

    endpoints: {

        list: null,

        details: null,

        cancel: null,

        delete: null,

        invoice: null,

        print: null,

        export: null

    }

};


/* =========================================================
   SELECTORS
========================================================= */

SmartPOS.sales.selectors = {

    root:
        "[data-sales]",

    table:
        "[data-sales-table]",

    tbody:
        "[data-sales-body]",

    search:
        "[data-sales-search]",

    status:
        "[data-sales-status]",

    payment:
        "[data-sales-payment]",

    dateFrom:
        "[data-sales-date-from]",

    dateTo:
        "[data-sales-date-to]",

    customer:
        "[data-sales-customer]",

    filter:
        "[data-sales-filter]",

    reset:
        "[data-sales-reset]",

    refresh:
        "[data-sales-refresh]",

    export:
        "[data-sales-export]",

    pagination:
        "[data-sales-pagination]",

    pageInfo:
        "[data-sales-page-info]",

    previous:
        "[data-sales-previous]",

    next:
        "[data-sales-next]",

    loading:
        "[data-sales-loading]",

    empty:
        "[data-sales-empty]",

    modal:
        "[data-sale-modal]",

    modalContent:
        "[data-sale-modal-content]",

    modalClose:
        "[data-sale-modal-close]",

    invoice:
        "[data-sale-invoice]",

    print:
        "[data-sale-print]",

    cancel:
        "[data-sale-cancel]",

    delete:
        "[data-sale-delete]",

    total:
        "[data-sales-total]",

    count:
        "[data-sales-count]"

};


/* =========================================================
   DOM
========================================================= */

SmartPOS.sales.$ = function (
    selector,
    parent = document
) {

    return parent.querySelector(
        selector
    );

};


SmartPOS.sales.$$ = function (
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

SmartPOS.sales.getRoot =
    function () {

        return SmartPOS.sales.$(
            SmartPOS.sales
                .selectors
                .root
        );

    };


/* =========================================================
   INIT
========================================================= */

SmartPOS.sales.init =
    async function () {

        const root =
            SmartPOS.sales.getRoot();

        if (!root) {

            return;

        }


        if (
            SmartPOS.sales
                .state
                .initialized
        ) {

            return;

        }


        SmartPOS.sales
            .state
            .initialized =
            true;


        SmartPOS.sales
            .readEndpoints();


        SmartPOS.sales
            .bindEvents();


        await SmartPOS.sales
            .loadSales();

    };


/* =========================================================
   READ ENDPOINTS
========================================================= */

SmartPOS.sales.readEndpoints =
    function () {

        const root =
            SmartPOS.sales.getRoot();

        if (!root) {

            return;

        }


        SmartPOS.sales
            .state
            .endpoints = {

                list:
                    root.dataset
                        .salesEndpoint ||
                    null,

                details:
                    root.dataset
                        .saleDetailsEndpoint ||
                    null,

                cancel:
                    root.dataset
                        .cancelSaleEndpoint ||
                    null,

                delete:
                    root.dataset
                        .deleteSaleEndpoint ||
                    null,

                invoice:
                    root.dataset
                        .invoiceEndpoint ||
                    null,

                print:
                    root.dataset
                        .printInvoiceEndpoint ||
                    null,

                export:
                    root.dataset
                        .exportSalesEndpoint ||
                    null

            };

    };


/* =========================================================
   API
========================================================= */

SmartPOS.sales.request =
    async function (
        url,
        options = {}
    ) {

        if (!url) {

            throw new Error(
                "رابط API غير موجود."
            );

        }


        if (
            typeof SmartPOS.api ===
            "function"
        ) {

            return SmartPOS.api(
                url,
                options
            );

        }


        const response =
            await fetch(
                url,
                {

                    credentials:
                        "same-origin",

                    ...options,

                    headers: {

                        "Content-Type":
                            "application/json",

                        ...(options.headers || {})

                    }

                }
            );


        let data = {};

        try {

            data =
                await response.json();

        } catch {

            data = {};

        }


        if (!response.ok) {

            throw new Error(
                data.message ||
                data.error ||
                "حدث خطأ أثناء الاتصال بالخادم."
            );

        }


        return data;

    };


/* =========================================================
   BUILD QUERY
========================================================= */

SmartPOS.sales.buildQuery =
    function () {

        const params =
            new URLSearchParams();


        params.set(
            "page",
            SmartPOS.sales.state.page
        );


        params.set(
            "per_page",
            SmartPOS.sales.state.perPage
        );


        if (
            SmartPOS.sales.state.search
        ) {

            params.set(
                "search",
                SmartPOS.sales.state.search
            );

        }


        if (
            SmartPOS.sales.state.status
        ) {

            params.set(
                "status",
                SmartPOS.sales.state.status
            );

        }


        if (
            SmartPOS.sales.state.paymentMethod
        ) {

            params.set(
                "payment_method",
                SmartPOS.sales.state
                    .paymentMethod
            );

        }


        if (
            SmartPOS.sales.state.dateFrom
        ) {

            params.set(
                "date_from",
                SmartPOS.sales.state.dateFrom
            );

        }


        if (
            SmartPOS.sales.state.dateTo
        ) {

            params.set(
                "date_to",
                SmartPOS.sales.state.dateTo
            );

        }


        if (
            SmartPOS.sales.state.customerId
        ) {

            params.set(
                "customer_id",
                SmartPOS.sales.state
                    .customerId
            );

        }


        return params;

    };


/* =========================================================
   LOAD SALES
========================================================= */

SmartPOS.sales.loadSales =
    async function () {

        const endpoint =
            SmartPOS.sales.state
                .endpoints
                .list;


        if (!endpoint) {

            SmartPOS.sales.notify(
                "لم يتم تحديد رابط المبيعات في sales.html.",
                "error"
            );

            return;

        }


        SmartPOS.sales
            .setLoading(true);


        try {

            const query =
                SmartPOS.sales
                    .buildQuery();


            const separator =
                endpoint.includes("?")
                    ? "&"
                    : "?";


            const response =
                await SmartPOS.sales.request(
                    `${endpoint}${separator}${query.toString()}`,
                    {
                        method: "GET"
                    }
                );


            const data =
                response.data ||
                response;


            SmartPOS.sales.state.sales =
                data.sales ||
                data.items ||
                data.results ||
                [];


            SmartPOS.sales.state.total =
                Number(
                    data.total ||
                    data.count ||
                    SmartPOS.sales
                        .state
                        .sales
                        .length
                );


            SmartPOS.sales.state
                .totalPages =
                Number(
                    data.total_pages ||
                    data.pages ||
                    Math.max(
                        1,
                        Math.ceil(
                            SmartPOS.sales
                                .state
                                .total /
                            SmartPOS.sales
                                .state
                                .perPage
                        )
                    )
                );


            SmartPOS.sales
                .render();


            SmartPOS.sales
                .updatePagination();


            SmartPOS.sales
                .updateStatistics();


        } catch (error) {

            console.error(
                "Sales loading error:",
                error
            );


            SmartPOS.sales.notify(
                error.message ||
                "تعذر تحميل سجل المبيعات.",
                "error"
            );

        } finally {

            SmartPOS.sales
                .setLoading(false);

        }

    };


/* =========================================================
   RENDER
========================================================= */

SmartPOS.sales.render =
    function () {

        const tbody =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .tbody
            );


        if (!tbody) {

            return;

        }


        const sales =
            SmartPOS.sales
                .state
                .sales;


        if (
            !Array.isArray(sales) ||
            sales.length === 0
        ) {

            tbody.innerHTML = `

                <tr>

                    <td
                        colspan="10"
                        class="sales-empty-cell"
                    >

                        <div
                            class="sales-empty"
                        >

                            <i
                                class="fa-solid fa-receipt"
                            ></i>

                            <strong>
                                لا توجد مبيعات
                            </strong>

                            <span>
                                لم يتم العثور على أي فواتير مطابقة.
                            </span>

                        </div>

                    </td>

                </tr>

            `;

            return;

        }


        tbody.innerHTML =
            sales
                .map(
                    sale =>
                        SmartPOS.sales
                            .renderRow(
                                sale
                            )
                )
                .join("");

    };


/* =========================================================
   RENDER ROW
========================================================= */

SmartPOS.sales.renderRow =
    function (
        sale
    ) {

        const id =
            sale.id ??
            sale.sale_id;


        const invoice =
            sale.invoice_number ||
            sale.invoiceNumber ||
            `#${id}`;


        const customer =
            sale.customer_name ||
            sale.customer?.name ||
            "عميل نقدي";


        const total =
            SmartPOS.sales
                .money(
                    sale.total
                );


        const payment =
            SmartPOS.sales
                .paymentLabel(
                    sale.payment_method ||
                    sale.paymentMethod
                );


        const status =
            sale.status ||
            "completed";


        const date =
            SmartPOS.sales
                .date(
                    sale.created_at ||
                    sale.date ||
                    sale.sale_date
                );


        return `

            <tr
                data-sale-row
                data-sale-id="${SmartPOS.sales.escape(id)}"
            >

                <td>

                    <strong>
                        ${SmartPOS.sales.escape(
                            invoice
                        )}
                    </strong>

                </td>


                <td>

                    ${SmartPOS.sales.escape(
                        customer
                    )}

                </td>


                <td>

                    ${SmartPOS.sales.escape(
                        date
                    )}

                </td>


                <td>

                    <span
                        class="sale-payment"
                        data-payment="${SmartPOS.sales.escape(
                            sale.payment_method ||
                            sale.paymentMethod ||
                            ""
                        )}"
                    >

                        ${SmartPOS.sales.escape(
                            payment
                        )}

                    </span>

                </td>


                <td>

                    <strong>
                        ${total}
                    </strong>

                </td>


                <td>

                    ${SmartPOS.sales
                        .statusBadge(
                            status
                        )}

                </td>


                <td>

                    <div
                        class="sales-actions"
                    >

                        <button
                            type="button"
                            title="عرض الفاتورة"
                            data-view-sale
                            data-id="${SmartPOS.sales.escape(id)}"
                        >

                            <i
                                class="fa-solid fa-eye"
                            ></i>

                        </button>


                        <button
                            type="button"
                            title="طباعة"
                            data-print-sale
                            data-id="${SmartPOS.sales.escape(id)}"
                        >

                            <i
                                class="fa-solid fa-print"
                            ></i>

                        </button>


                        <button
                            type="button"
                            title="إلغاء العملية"
                            data-cancel-sale
                            data-id="${SmartPOS.sales.escape(id)}"
                        >

                            <i
                                class="fa-solid fa-ban"
                            ></i>

                        </button>

                    </div>

                </td>

            </tr>

        `;

    };


/* =========================================================
   VIEW SALE
========================================================= */

SmartPOS.sales.viewSale =
    async function (
        saleId
    ) {

        const sale =
            SmartPOS.sales.state.sales
                .find(
                    item =>
                        String(
                            item.id ??
                            item.sale_id
                        ) ===
                        String(saleId)
                );


        if (sale) {

            SmartPOS.sales.state
                .selectedSale =
                sale;

        }


        const endpoint =
            SmartPOS.sales.state
                .endpoints
                .details;


        if (!endpoint) {

            SmartPOS.sales
                .openModal(
                    sale ||
                    null
                );

            return;

        }


        try {

            const url =
                SmartPOS.sales
                    .replaceId(
                        endpoint,
                        saleId
                    );


            const response =
                await SmartPOS.sales
                    .request(
                        url,
                        {
                            method: "GET"
                        }
                    );


            const data =
                response.data ||
                response.sale ||
                response;


            SmartPOS.sales.state
                .selectedSale =
                data.sale ||
                data;


            SmartPOS.sales
                .openModal(
                    SmartPOS.sales
                        .state
                        .selectedSale
                );


        } catch (error) {

            console.error(
                "Sale details error:",
                error
            );


            SmartPOS.sales.notify(
                error.message ||
                "تعذر تحميل تفاصيل الفاتورة.",
                "error"
            );

        }

    };


/* =========================================================
   MODAL
========================================================= */

SmartPOS.sales.openModal =
    function (
        sale
    ) {

        const modal =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .modal
            );


        const content =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .modalContent
            );


        if (
            !modal ||
            !content
        ) {

            return;

        }


        if (!sale) {

            content.innerHTML = `

                <div class="sale-details-empty">

                    <i
                        class="fa-solid fa-circle-exclamation"
                    ></i>

                    <p>
                        لا توجد بيانات لهذه الفاتورة.
                    </p>

                </div>

            `;

        } else {

            content.innerHTML =
                SmartPOS.sales
                    .renderDetails(
                        sale
                    );

        }


        modal.classList.add(
            "is-open"
        );


        modal.setAttribute(
            "aria-hidden",
            "false"
        );


        document.body.classList.add(
            "modal-open"
        );

    };


/* =========================================================
   CLOSE MODAL
========================================================= */

SmartPOS.sales.closeModal =
    function () {

        const modal =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .modal
            );


        if (!modal) {

            return;

        }


        modal.classList.remove(
            "is-open"
        );


        modal.setAttribute(
            "aria-hidden",
            "true"
        );


        document.body.classList.remove(
            "modal-open"
        );

    };


/* =========================================================
   RENDER DETAILS
========================================================= */

SmartPOS.sales.renderDetails =
    function (
        sale
    ) {

        const invoice =
            sale.invoice_number ||
            sale.invoiceNumber ||
            sale.id;


        const customer =
            sale.customer_name ||
            sale.customer?.name ||
            "عميل نقدي";


        const items =
            sale.items ||
            sale.sale_items ||
            [];


        const subtotal =
            SmartPOS.sales.money(
                sale.subtotal
            );


        const discount =
            SmartPOS.sales.money(
                sale.discount
            );


        const tax =
            SmartPOS.sales.money(
                sale.tax
            );


        const total =
            SmartPOS.sales.money(
                sale.total
            );


        const paid =
            SmartPOS.sales.money(
                sale.paid_amount ??
                sale.paid
            );


        const change =
            SmartPOS.sales.money(
                sale.change_amount ??
                sale.change
            );


        return `

            <div
                class="sale-details"
            >

                <header
                    class="sale-details-header"
                >

                    <div>

                        <span>
                            رقم الفاتورة
                        </span>

                        <strong>
                            ${SmartPOS.sales.escape(
                                invoice
                            )}
                        </strong>

                    </div>


                    <div>

                        <span>
                            العميل
                        </span>

                        <strong>
                            ${SmartPOS.sales.escape(
                                customer
                            )}
                        </strong>

                    </div>

                </header>


                <div
                    class="sale-details-items"
                >

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    المنتج
                                </th>

                                <th>
                                    الكمية
                                </th>

                                <th>
                                    السعر
                                </th>

                                <th>
                                    الإجمالي
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            ${
                                items.length
                                    ? items
                                        .map(
                                            item =>
                                                SmartPOS.sales
                                                    .renderItem(
                                                        item
                                                    )
                                        )
                                        .join("")
                                    : `
                                        <tr>

                                            <td
                                                colspan="4"
                                            >
                                                لا توجد تفاصيل للمنتجات.
                                            </td>

                                        </tr>
                                    `
                            }

                        </tbody>

                    </table>

                </div>


                <div
                    class="sale-details-summary"
                >

                    <div>

                        <span>
                            المجموع الفرعي
                        </span>

                        <strong>
                            ${subtotal}
                        </strong>

                    </div>


                    <div>

                        <span>
                            الخصم
                        </span>

                        <strong>
                            ${discount}
                        </strong>

                    </div>


                    <div>

                        <span>
                            الضريبة
                        </span>

                        <strong>
                            ${tax}
                        </strong>

                    </div>


                    <div>

                        <span>
                            المدفوع
                        </span>

                        <strong>
                            ${paid}
                        </strong>

                    </div>


                    <div>

                        <span>
                            الباقي
                        </span>

                        <strong>
                            ${change}
                        </strong>

                    </div>


                    <div
                        class="sale-details-total"
                    >

                        <span>
                            الإجمالي
                        </span>

                        <strong>
                            ${total}
                        </strong>

                    </div>

                </div>

            </div>

        `;

    };


/* =========================================================
   RENDER ITEM
========================================================= */

SmartPOS.sales.renderItem =
    function (
        item
    ) {

        const name =
            item.product_name ||
            item.name ||
            item.product?.name ||
            "منتج";


        const quantity =
            Number(
                item.quantity || 0
            );


        const price =
            Number(
                item.price ||
                item.unit_price ||
                0
            );


        const total =
            Number(
                item.total ||
                price * quantity
            );


        return `

            <tr>

                <td>
                    ${SmartPOS.sales.escape(
                        name
                    )}
                </td>

                <td>
                    ${quantity}
                </td>

                <td>
                    ${SmartPOS.sales.money(
                        price
                    )}
                </td>

                <td>
                    ${SmartPOS.sales.money(
                        total
                    )}
                </td>

            </tr>

        `;

    };


/* =========================================================
   OPEN INVOICE
========================================================= */

SmartPOS.sales.openInvoice =
    function (
        saleId
    ) {

        const endpoint =
            SmartPOS.sales.state
                .endpoints
                .invoice;


        if (!endpoint) {

            SmartPOS.sales.notify(
                "رابط الفاتورة غير مضبوط.",
                "error"
            );

            return;

        }


        const url =
            SmartPOS.sales
                .replaceId(
                    endpoint,
                    saleId
                );


        window.location.href =
            url;

    };


/* =========================================================
   PRINT SALE
========================================================= */

SmartPOS.sales.printSale =
    function (
        saleId
    ) {

        const endpoint =
            SmartPOS.sales.state
                .endpoints
                .print;


        if (!endpoint) {

            SmartPOS.sales.notify(
                "رابط طباعة الفاتورة غير مضبوط.",
                "error"
            );

            return;

        }


        const url =
            SmartPOS.sales
                .replaceId(
                    endpoint,
                    saleId
                );


        const popup =
            window.open(
                url,
                "_blank",
                "noopener,noreferrer"
            );


        if (!popup) {

            SmartPOS.sales.notify(
                "المتصفح منع فتح نافذة الطباعة.",
                "warning"
            );

        }

    };


/* =========================================================
   CANCEL SALE
========================================================= */

SmartPOS.sales.cancelSale =
    async function (
        saleId
    ) {

        const endpoint =
            SmartPOS.sales.state
                .endpoints
                .cancel;


        if (!endpoint) {

            SmartPOS.sales.notify(
                "إلغاء المبيعات غير مربوط في Flask.",
                "error"
            );

            return;

        }


        const confirmed =
            window.confirm(
                "هل أنت متأكد من إلغاء هذه الفاتورة؟\n\nسيتم تنفيذ العملية حسب صلاحيات النظام."
            );


        if (!confirmed) {

            return;

        }


        try {

            const url =
                SmartPOS.sales
                    .replaceId(
                        endpoint,
                        saleId
                    );


            const response =
                await SmartPOS.sales
                    .request(
                        url,
                        {
                            method: "POST"
                        }
                    );


            SmartPOS.sales.notify(
                response.message ||
                "تم إلغاء الفاتورة بنجاح.",
                "success"
            );


            await SmartPOS.sales
                .loadSales();


        } catch (error) {

            console.error(
                "Cancel sale error:",
                error
            );


            SmartPOS.sales.notify(
                error.message ||
                "تعذر إلغاء الفاتورة.",
                "error"
            );

        }

    };


/* =========================================================
   DELETE SALE
========================================================= */

SmartPOS.sales.deleteSale =
    async function (
        saleId
    ) {

        const endpoint =
            SmartPOS.sales.state
                .endpoints
                .delete;


        if (!endpoint) {

            SmartPOS.sales.notify(
                "حذف المبيعات غير مربوط في Flask.",
                "error"
            );

            return;

        }


        const confirmed =
            window.confirm(
                "تحذير: هل أنت متأكد من حذف هذه العملية؟"
            );


        if (!confirmed) {

            return;

        }


        try {

            const url =
                SmartPOS.sales
                    .replaceId(
                        endpoint,
                        saleId
                    );


            const response =
                await SmartPOS.sales
                    .request(
                        url,
                        {
                            method: "DELETE"
                        }
                    );


            SmartPOS.sales.notify(
                response.message ||
                "تم حذف العملية.",
                "success"
            );


            await SmartPOS.sales
                .loadSales();


        } catch (error) {

            console.error(
                "Delete sale error:",
                error
            );


            SmartPOS.sales.notify(
                error.message ||
                "تعذر حذف العملية.",
                "error"
            );

        }

    };


/* =========================================================
   FILTER
========================================================= */

SmartPOS.sales.applyFilters =
    function () {

        const search =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .search
            );


        const status =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .status
            );


        const payment =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .payment
            );


        const dateFrom =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .dateFrom
            );


        const dateTo =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .dateTo
            );


        const customer =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .customer
            );


        SmartPOS.sales.state.search =
            search?.value.trim() ||
            "";


        SmartPOS.sales.state.status =
            status?.value ||
            "";


        SmartPOS.sales.state
            .paymentMethod =
            payment?.value ||
            "";


        SmartPOS.sales.state.dateFrom =
            dateFrom?.value ||
            "";


        SmartPOS.sales.state.dateTo =
            dateTo?.value ||
            "";


        SmartPOS.sales.state.customerId =
            customer?.value ||
            "";


        SmartPOS.sales.state.page =
            1;


        SmartPOS.sales
            .loadSales();

    };


/* =========================================================
   RESET FILTERS
========================================================= */

SmartPOS.sales.resetFilters =
    function () {

        SmartPOS.sales.$$(
            "input, select",
            SmartPOS.sales.getRoot()
        )
        .forEach(
            element => {

                if (
                    element.dataset
                        .salesSearch ||
                    element.dataset
                        .salesStatus ||
                    element.dataset
                        .salesPayment ||
                    element.dataset
                        .salesDateFrom ||
                    element.dataset
                        .salesDateTo ||
                    element.dataset
                        .salesCustomer
                ) {

                    element.value =
                        "";

                }

            }
        );


        SmartPOS.sales.state.search =
            "";

        SmartPOS.sales.state.status =
            "";

        SmartPOS.sales.state.paymentMethod =
            "";

        SmartPOS.sales.state.dateFrom =
            "";

        SmartPOS.sales.state.dateTo =
            "";

        SmartPOS.sales.state.customerId =
            "";

        SmartPOS.sales.state.page =
            1;


        SmartPOS.sales
            .loadSales();

    };


/* =========================================================
   PAGINATION
========================================================= */

SmartPOS.sales.goToPage =
    function (
        page
    ) {

        const totalPages =
            SmartPOS.sales.state
                .totalPages;


        page =
            Number(page);


        if (
            !Number.isFinite(page)
        ) {

            return;

        }


        page =
            Math.max(
                1,
                Math.min(
                    page,
                    totalPages
                )
            );


        if (
            page ===
            SmartPOS.sales.state.page
        ) {

            return;

        }


        SmartPOS.sales.state.page =
            page;


        SmartPOS.sales
            .loadSales();

    };


/* =========================================================
   UPDATE PAGINATION
========================================================= */

SmartPOS.sales.updatePagination =
    function () {

        const info =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .pageInfo
            );


        if (info) {

            info.textContent =
                `صفحة ${SmartPOS.sales.state.page} من ${SmartPOS.sales.state.totalPages}`;

        }


        const previous =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .previous
            );


        if (previous) {

            previous.disabled =
                SmartPOS.sales.state.page <= 1;

        }


        const next =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .next
            );


        if (next) {

            next.disabled =
                SmartPOS.sales.state.page >=
                SmartPOS.sales.state.totalPages;

        }

    };


/* =========================================================
   STATISTICS
========================================================= */

SmartPOS.sales.updateStatistics =
    function () {

        const count =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .count
            );


        const total =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .total
            );


        const sales =
            SmartPOS.sales
                .state
                .sales;


        const currentTotal =
            sales.reduce(
                (
                    sum,
                    sale
                ) =>
                    sum +
                    Number(
                        sale.total || 0
                    ),
                0
            );


        if (count) {

            count.textContent =
                SmartPOS.sales.state.total;

        }


        if (total) {

            total.textContent =
                SmartPOS.sales.money(
                    currentTotal
                );

        }

    };


/* =========================================================
   STATUS BADGE
========================================================= */

SmartPOS.sales.statusBadge =
    function (
        status
    ) {

        const normalized =
            String(
                status ||
                "completed"
            )
            .toLowerCase();


        const labels = {

            completed:
                "مكتملة",

            paid:
                "مدفوعة",

            pending:
                "معلقة",

            cancelled:
                "ملغاة",

            canceled:
                "ملغاة",

            refunded:
                "مسترجعة",

            draft:
                "مسودة"

        };


        const label =
            labels[
                normalized
            ] ||
            status ||
            "غير معروف";


        return `

            <span
                class="sale-status sale-status-${SmartPOS.sales.escape(
                    normalized
                )}"
            >

                ${SmartPOS.sales.escape(
                    label
                )}

            </span>

        `;

    };


/* =========================================================
   PAYMENT LABEL
========================================================= */

SmartPOS.sales.paymentLabel =
    function (
        method
    ) {

        const labels = {

            cash:
                "نقدي",

            card:
                "بطاقة",

            bank:
                "تحويل بنكي",

            wallet:
                "محفظة إلكترونية",

            credit:
                "آجل",

            online:
                "دفع إلكتروني"

        };


        return labels[
            String(
                method || ""
            ).toLowerCase()
        ] ||
        method ||
        "غير محدد";

    };


/* =========================================================
   DATE
========================================================= */

SmartPOS.sales.date =
    function (
        value
    ) {

        if (!value) {

            return "-";

        }


        const date =
            new Date(value);


        if (
            Number.isNaN(
                date.getTime()
            )
        ) {

            return String(value);

        }


        return date.toLocaleString(
            "ar-EG",
            {

                year: "numeric",

                month: "2-digit",

                day: "2-digit",

                hour: "2-digit",

                minute: "2-digit"

            }
        );

    };


/* =========================================================
   MONEY
========================================================= */

SmartPOS.sales.money =
    function (
        value
    ) {

        const number =
            Number(value);


        if (
            !Number.isFinite(number)
        ) {

            return "0.00";

        }


        return number.toLocaleString(
            "ar-EG",
            {

                minimumFractionDigits: 2,

                maximumFractionDigits: 2

            }
        );

    };


/* =========================================================
   ESCAPE
========================================================= */

SmartPOS.sales.escape =
    function (
        value
    ) {

        const element =
            document.createElement(
                "div"
            );


        element.textContent =
            value === null ||
            value === undefined
                ? ""
                : String(value);


        return element.innerHTML;

    };


/* =========================================================
   REPLACE ID IN ENDPOINT
========================================================= */

SmartPOS.sales.replaceId =
    function (
        endpoint,
        id
    ) {

        if (!endpoint) {

            return null;

        }


        if (
            endpoint.includes(
                "__ID__"
            )
        ) {

            return endpoint.replace(
                "__ID__",
                encodeURIComponent(
                    id
                )
            );

        }


        if (
            endpoint.includes(
                "{id}"
            )
        ) {

            return endpoint.replace(
                "{id}",
                encodeURIComponent(
                    id
                )
            );

        }


        return endpoint.endsWith("/")
            ? `${endpoint}${encodeURIComponent(id)}`
            : `${endpoint}/${encodeURIComponent(id)}`;

    };


/* =========================================================
   EXPORT
========================================================= */

SmartPOS.sales.exportSales =
    function () {

        const endpoint =
            SmartPOS.sales.state
                .endpoints
                .export;


        if (!endpoint) {

            SmartPOS.sales.notify(
                "تصدير المبيعات غير مربوط في Flask.",
                "error"
            );

            return;

        }


        const query =
            SmartPOS.sales
                .buildQuery();


        const separator =
            endpoint.includes("?")
                ? "&"
                : "?";


        window.location.href =
            `${endpoint}${separator}${query.toString()}`;

    };


/* =========================================================
   LOADING
========================================================= */

SmartPOS.sales.setLoading =
    function (
        loading
    ) {

        SmartPOS.sales.state.loading =
            loading;


        const root =
            SmartPOS.sales.getRoot();


        if (!root) {

            return;

        }


        root.classList.toggle(
            "sales-loading",
            loading
        );


        const indicator =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .loading
            );


        if (indicator) {

            indicator.hidden =
                !loading;

        }


        const refresh =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .refresh
            );


        if (refresh) {

            refresh.disabled =
                loading;

        }

    };


/* =========================================================
   NOTIFICATION
========================================================= */

SmartPOS.sales.notify =
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


        console.log(
            `[${type}] ${message}`
        );

    };


/* =========================================================
   EVENT DELEGATION
========================================================= */

SmartPOS.sales.handleClick =
    function (
        event
    ) {

        const view =
            event.target.closest(
                "[data-view-sale]"
            );


        if (view) {

            SmartPOS.sales
                .viewSale(
                    view.dataset.id
                );

            return;

        }


        const print =
            event.target.closest(
                "[data-print-sale]"
            );


        if (print) {

            SmartPOS.sales
                .printSale(
                    print.dataset.id
                );

            return;

        }


        const cancel =
            event.target.closest(
                "[data-cancel-sale]"
            );


        if (cancel) {

            SmartPOS.sales
                .cancelSale(
                    cancel.dataset.id
                );

            return;

        }


        const remove =
            event.target.closest(
                "[data-delete-sale]"
            );


        if (remove) {

            SmartPOS.sales
                .deleteSale(
                    remove.dataset.id
                );

            return;

        }

    };


/* =========================================================
   BIND EVENTS
========================================================= */

SmartPOS.sales.bindEvents =
    function () {

        const root =
            SmartPOS.sales.getRoot();


        if (!root) {

            return;

        }


        root.addEventListener(
            "click",
            SmartPOS.sales
                .handleClick
        );


        const filter =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .filter
            );


        if (filter) {

            filter.addEventListener(
                "click",
                SmartPOS.sales
                    .applyFilters
            );

        }


        const reset =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .reset
            );


        if (reset) {

            reset.addEventListener(
                "click",
                SmartPOS.sales
                    .resetFilters
            );

        }


        const refresh =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .refresh
            );


        if (refresh) {

            refresh.addEventListener(
                "click",
                () => {

                    SmartPOS.sales
                        .loadSales();

                }
            );

        }


        const exportButton =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .export
            );


        if (exportButton) {

            exportButton.addEventListener(
                "click",
                SmartPOS.sales
                    .exportSales
            );

        }


        const previous =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .previous
            );


        if (previous) {

            previous.addEventListener(
                "click",
                () => {

                    SmartPOS.sales
                        .goToPage(
                            SmartPOS.sales
                                .state
                                .page - 1
                        );

                }
            );

        }


        const next =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .next
            );


        if (next) {

            next.addEventListener(
                "click",
                () => {

                    SmartPOS.sales
                        .goToPage(
                            SmartPOS.sales
                                .state
                                .page + 1
                        );

                }
            );

        }


        const close =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .modalClose
            );


        if (close) {

            close.addEventListener(
                "click",
                SmartPOS.sales
                    .closeModal
            );

        }


        const invoice =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .invoice
            );


        if (invoice) {

            invoice.addEventListener(
                "click",
                () => {

                    const sale =
                        SmartPOS.sales
                            .state
                            .selectedSale;


                    if (!sale) {
                        return;
                    }


                    SmartPOS.sales
                        .openInvoice(
                            sale.id ||
                            sale.sale_id
                        );

                }
            );

        }


        const print =
            SmartPOS.sales.$(
                SmartPOS.sales
                    .selectors
                    .print
            );


        if (print) {

            print.addEventListener(
                "click",
                () => {

                    const sale =
                        SmartPOS.sales
                            .state
                            .selectedSale;


                    if (!sale) {
                        return;
                    }


                    SmartPOS.sales
                        .printSale(
                            sale.id ||
                            sale.sale_id
                        );

                }
            );

        }


        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key ===
                    "Escape"
                ) {

                    SmartPOS.sales
                        .closeModal();

                }

            }
        );


        document.addEventListener(
            "click",
            event => {

                const modal =
                    SmartPOS.sales.$(
                        SmartPOS.sales
                            .selectors
                            .modal
                    );


                if (
                    modal &&
                    event.target ===
                        modal
                ) {

                    SmartPOS.sales
                        .closeModal();

                }

            }
        );

    };


/* =========================================================
   AUTO INIT
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        SmartPOS.sales.init
    );

} else {

    SmartPOS.sales.init();

}