
'use strict';

window.SmartPOS = window.SmartPOS || {};

SmartPOS.reports = (() => {
    const state = {
        initialized: false,
        loading: false,
        controller: null,
        charts: [],

        filters: {
            report: 'sales',
            date_from: '',
            date_to: '',
            status: '',
            payment_method: '',
            category_id: '',
            product_id: '',
            user_id: '',
            search: '',
            page: 1,
            per_page: 25
        }
    };

    const selectors = {
        root: '[data-reports]',

        form: '[data-report-filter-form]',
        report: '[data-report-type]',
        dateFrom: '[data-report-date-from]',
        dateTo: '[data-report-date-to]',
        status: '[data-report-status]',
        payment: '[data-report-payment]',
        category: '[data-report-category]',
        product: '[data-report-product]',
        user: '[data-report-user]',
        search: '[data-report-search]',
        perPage: '[data-report-per-page]',

        apply: '[data-report-filter]',
        reset: '[data-report-reset]',
        refresh: '[data-report-refresh]',
        export: '[data-report-export]',
        print: '[data-report-print]',

        loading: '[data-reports-loading]',
        error: '[data-report-error]',
        results: '[data-report-results]',
        pagination: '[data-report-pagination]',

        totalSales: '[data-total-sales]',
        totalOrders: '[data-total-orders]',
        totalProfit: '[data-total-profit]',
        totalTax: '[data-total-tax]',
        totalDiscount: '[data-total-discount]',
        averageSale: '[data-average-sale]',
        totalProducts: '[data-total-products]',
        totalCustomers: '[data-total-customers]',

        salesBody: '[data-report-sales-body]',
        productsBody: '[data-report-products-body]',
        inventoryBody: '[data-report-inventory-body]',
        paymentsBody: '[data-report-payment-body]',
        categoriesBody: '[data-report-category-body]',

        salesChart: '[data-chart-sales]',
        productsChart: '[data-chart-products]',
        paymentsChart: '[data-chart-payment]'
    };

    function root() {
        return document.querySelector(selectors.root);
    }

    function qs(selector) {
        const element = root()?.querySelector(selector);
        return element || null;
    }

    function qsa(selector) {
        return root()
            ? [...root().querySelectorAll(selector)]
            : [];
    }

    function getValue(selector, fallback = '') {
        const element = qs(selector);
        return element ? element.value : fallback;
    }

    function setText(selector, value) {
        const element = qs(selector);

        if (element) {
            element.textContent = value;
        }
    }

    function getEndpoints() {
        const element = root();

        if (!element) {
            return {};
        }

        return {
            report:
                element.dataset.reportEndpoint || '',

            export:
                element.dataset.reportExportEndpoint || ''
        };
    }

    function readFilters(resetPage = true) {
        state.filters.report =
            getValue(
                selectors.report,
                'sales'
            );

        state.filters.date_from =
            getValue(
                selectors.dateFrom
            );

        state.filters.date_to =
            getValue(
                selectors.dateTo
            );

        state.filters.status =
            getValue(
                selectors.status
            );

        state.filters.payment_method =
            getValue(
                selectors.payment
            );

        state.filters.category_id =
            getValue(
                selectors.category
            );

        state.filters.product_id =
            getValue(
                selectors.product
            );

        state.filters.user_id =
            getValue(
                selectors.user
            );

        state.filters.search =
            getValue(
                selectors.search
            ).trim();

        state.filters.per_page =
            Number(
                getValue(
                    selectors.perPage,
                    '25'
                )
            ) || 25;

        if (resetPage) {
            state.filters.page = 1;
        }
    }

    function buildQuery() {
        const params =
            new URLSearchParams();

        Object.entries(
            state.filters
        ).forEach(
            ([key, value]) => {
                if (
                    value !== '' &&
                    value !== null &&
                    value !== undefined
                ) {
                    params.set(
                        key,
                        String(value)
                    );
                }
            }
        );

        return params;
    }

    function csrfToken() {
        return (
            document.querySelector(
                'meta[name="csrf-token"]'
            )?.content ||

            document.querySelector(
                'input[name="csrf_token"]'
            )?.value ||

            ''
        );
    }

    async function request(
        url,
        options = {}
    ) {
        if (!url) {
            throw new Error(
                'لم يتم تحديد رابط API التقارير في reports.html.'
            );
        }

        const headers = {
            Accept:
                'application/json',

            ...(options.body
                ? {
                    'Content-Type':
                        'application/json'
                }
                : {}),

            ...(options.headers || {})
        };

        const csrf =
            csrfToken();

        if (csrf) {
            headers[
                'X-CSRFToken'
            ] = csrf;
        }

        const response =
            await fetch(
                url,
                {
                    credentials:
                        'same-origin',

                    ...options,

                    headers,

                    signal:
                        state.controller?.signal
                }
            );

        const contentType =
            response.headers.get(
                'content-type'
            ) || '';

        const payload =
            contentType.includes(
                'application/json'
            )
                ? await response.json()
                : await response.text();

        if (!response.ok) {
            if (response.status === 401) {
                throw new Error(
                    'انتهت جلسة الدخول. سجل الدخول مرة أخرى.'
                );
            }

            if (response.status === 403) {
                throw new Error(
                    'ليس لديك صلاحية لعرض هذه التقارير.'
                );
            }

            const message =
                typeof payload === 'object'
                    ? (
                        payload.message ||
                        payload.error
                    )
                    : payload;

            throw new Error(
                message ||
                `فشل الطلب (${response.status}).`
            );
        }

        return payload;
    }

    function normalize(data) {
        if (
            !data ||
            typeof data !== 'object'
        ) {
            return {};
        }

        if (
            data.data &&
            typeof data.data === 'object'
        ) {
            return data.data;
        }

        if (
            data.report &&
            typeof data.report === 'object'
        ) {
            return data.report;
        }

        return data;
    }

    function setLoading(value) {
        state.loading =
            value;

        const container =
            root();

        if (container) {
            container.classList.toggle(
                'is-loading',
                value
            );
        }

        const loader =
            qs(
                selectors.loading
            );

        if (loader) {
            loader.hidden =
                !value;
        }
    }

    function showError(message) {
        const element =
            qs(
                selectors.error
            );

        if (element) {
            element.hidden =
                false;

            element.textContent =
                message;
        }

        if (
            typeof window.SmartPOS?.notify ===
            'function'
        ) {
            window.SmartPOS.notify(
                message,
                'error'
            );
        } else {
            console.error(
                message
            );
        }
    }

    function clearError() {
        const element =
            qs(
                selectors.error
            );

        if (element) {
            element.hidden =
                true;

            element.textContent =
                '';
        }
    }

    async function load() {
        const endpoint =
            getEndpoints().report;

        if (!endpoint) {
            showError(
                'Route التقارير غير مربوط. أضف data-report-endpoint إلى reports.html.'
            );

            return;
        }

        if (state.controller) {
            state.controller.abort();
        }

        state.controller =
            new AbortController();

        setLoading(true);
        clearError();

        try {
            const query =
                buildQuery();

            const separator =
                endpoint.includes('?')
                    ? '&'
                    : '?';

            const data =
                normalize(
                    await request(
                        `${endpoint}${separator}${query}`
                    )
                );

            render(data);

        } catch (error) {
            if (
                error.name !==
                'AbortError'
            ) {
                console.error(
                    'SMART POS reports:',
                    error
                );

                showError(
                    error.message ||
                    'تعذر تحميل التقرير.'
                );
            }

        } finally {
            setLoading(false);
        }
    }

    function render(data) {
        const summary =
            data.summary ||
            data.statistics ||
            {};

        setText(
            selectors.totalSales,
            money(
                summary.total_sales ??
                summary.sales ??
                0
            )
        );

        setText(
            selectors.totalOrders,
            number(
                summary.total_orders ??
                summary.orders ??
                0
            )
        );

        setText(
            selectors.totalProfit,
            money(
                summary.total_profit ??
                summary.profit ??
                0
            )
        );

        setText(
            selectors.totalTax,
            money(
                summary.total_tax ??
                summary.tax ??
                0
            )
        );

        setText(
            selectors.totalDiscount,
            money(
                summary.total_discount ??
                summary.discount ??
                0
            )
        );

        setText(
            selectors.averageSale,
            money(
                summary.average_sale ??
                summary.average_order ??
                0
            )
        );

        setText(
            selectors.totalProducts,
            number(
                summary.total_products ??
                summary.products ??
                0
            )
        );

        setText(
            selectors.totalCustomers,
            number(
                summary.total_customers ??
                summary.customers ??
                0
            )
        );

        renderSales(
            data.sales ||
            data.sales_report ||
            []
        );

        renderProducts(
            data.products ||
            data.product_report ||
            []
        );

        renderInventory(
            data.inventory ||
            data.inventory_report ||
            []
        );

        renderPayments(
            data.payments ||
            data.payment_methods ||
            []
        );

        renderCategories(
            data.categories ||
            data.category_report ||
            []
        );

        renderCharts(data);

        renderPagination(
            data.pagination ||
            data.meta?.pagination ||
            data.meta ||
            null
        );

        const results =
            qs(
                selectors.results
            );

        if (results) {
            results.hidden =
                false;
        }
    }

    function renderSales(rows) {
        const body =
            qs(
                selectors.salesBody
            );

        if (!body) {
            return;
        }

        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {
            body.innerHTML =
                emptyRow(
                    8,
                    'لا توجد مبيعات ضمن الفلاتر الحالية.'
                );

            return;
        }

        body.innerHTML =
            rows.map(
                (row) => `
                    <tr>
                        <td>
                            ${escapeHtml(
                                row.invoice_number ??
                                row.invoiceNumber ??
                                row.id ??
                                '-'
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                row.customer_name ??
                                row.customer?.name ??
                                'عميل نقدي'
                            )}
                        </td>

                        <td>
                            ${formatDate(
                                row.created_at ??
                                row.sale_date ??
                                row.date
                            )}
                        </td>

                        <td>
                            ${escapeHtml(
                                paymentLabel(
                                    row.payment_method ??
                                    row.paymentMethod
                                )
                            )}
                        </td>

                        <td>
                            ${money(
                                row.subtotal ??
                                0
                            )}
                        </td>

                        <td>
                            ${money(
                                row.discount ??
                                0
                            )}
                        </td>

                        <td>
                            ${money(
                                row.total ??
                                0
                            )}
                        </td>

                        <td>
                            ${statusBadge(
                                row.status
                            )}
                        </td>
                    </tr>
                `
            ).join('');
    }

    function renderProducts(rows) {
        const body =
            qs(
                selectors.productsBody
            );

        if (!body) {
            return;
        }

        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {
            body.innerHTML =
                emptyRow(
                    7,
                    'لا توجد بيانات منتجات.'
                );

            return;
        }

        body.innerHTML =
            rows.map(
                (row) => `
                    <tr>
                        <td>
                            ${escapeHtml(
                                row.name ??
                                row.product_name ??
                                '-'
                            )}
                        </td>

                        <td>
                            ${number(
                                row.quantity_sold ??
                                row.sold_quantity ??
                                row.quantity ??
                                0
                            )}
                        </td>

                        <td>
                            ${money(
                                row.cost ??
                                row.cost_price ??
                                0
                            )}
                        </td>

                        <td>
                            ${money(
                                row.price ??
                                row.sale_price ??
                                0
                            )}
                        </td>

                        <td>
                            ${money(
                                row.revenue ??
                                row.sales ??
                                row.total ??
                                0
                            )}
                        </td>

                        <td>
                            ${money(
                                row.profit ??
                                0
                            )}
                        </td>

                        <td>
                            ${number(
                                row.stock ??
                                row.quantity_in_stock ??
                                0
                            )}
                        </td>
                    </tr>
                `
            ).join('');
    }

    function renderInventory(rows) {
        const body =
            qs(
                selectors.inventoryBody
            );

        if (!body) {
            return;
        }

        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {
            body.innerHTML =
                emptyRow(
                    6,
                    'لا توجد بيانات مخزون.'
                );

            return;
        }

        body.innerHTML =
            rows.map(
                (row) => {
                    const stock =
                        Number(
                            row.stock ??
                            row.quantity ??
                            0
                        );

                    const minimum =
                        Number(
                            row.minimum_stock ??
                            row.min_stock ??
                            0
                        );

                    const stateText =
                        stock <= 0
                            ? 'نفد المخزون'
                            : stock <= minimum
                                ? 'منخفض'
                                : 'متوفر';

                    return `
                        <tr>
                            <td>
                                ${escapeHtml(
                                    row.name ??
                                    row.product_name ??
                                    '-'
                                )}
                            </td>

                            <td>
                                ${number(
                                    stock
                                )}
                            </td>

                            <td>
                                ${number(
                                    minimum
                                )}
                            </td>

                            <td>
                                ${money(
                                    row.stock_value ??
                                    row.value ??
                                    0
                                )}
                            </td>

                            <td>
                                ${escapeHtml(
                                    row.category_name ??
                                    row.category ??
                                    '-'
                                )}
                            </td>

                            <td>
                                ${inventoryBadge(
                                    stateText
                                )}
                            </td>
                        </tr>
                    `;
                }
            ).join('');
    }

    function renderPayments(rows) {
        const body =
            qs(
                selectors.paymentsBody
            );

        if (!body) {
            return;
        }

        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {
            body.innerHTML =
                emptyRow(
                    4,
                    'لا توجد بيانات لطرق الدفع.'
                );

            return;
        }

        body.innerHTML =
            rows.map(
                (row) => `
                    <tr>
                        <td>
                            ${escapeHtml(
                                paymentLabel(
                                    row.method ??
                                    row.payment_method ??
                                    row.name
                                )
                            )}
                        </td>

                        <td>
                            ${number(
                                row.count ??
                                row.orders ??
                                0
                            )}
                        </td>

                        <td>
                            ${money(
                                row.amount ??
                                row.total ??
                                0
                            )}
                        </td>

                        <td>
                            ${number(
                                row.percentage ??
                                0
                            )}%
                        </td>
                    </tr>
                `
            ).join('');
    }

    function renderCategories(rows) {
        const body =
            qs(
                selectors.categoriesBody
            );

        if (!body) {
            return;
        }

        if (
            !Array.isArray(rows) ||
            rows.length === 0
        ) {
            body.innerHTML =
                emptyRow(
                    5,
                    'لا توجد بيانات للتصنيفات.'
                );

            return;
        }

        body.innerHTML =
            rows.map(
                (row) => `
                    <tr>
                        <td>
                            ${escapeHtml(
                                row.name ??
                                row.category_name ??
                                '-'
                            )}
                        </td>

                        <td>
                            ${number(
                                row.products ??
                                row.product_count ??
                                0
                            )}
                        </td>

                        <td>
                            ${number(
                                row.quantity ??
                                row.quantity_sold ??
                                0
                            )}
                        </td>

                        <td>
                            ${money(
                                row.sales ??
                                row.revenue ??
                                row.total ??
                                0
                            )}
                        </td>

                        <td>
                            ${money(
                                row.profit ??
                                0
                            )}
                        </td>
                    </tr>
                `
            ).join('');
    }

    function renderCharts(data) {
        if (
            typeof window.Chart ===
            'undefined'
        ) {
            return;
        }

        destroyCharts();

        createChart(
            selectors.salesChart,
            'line',
            data.sales_chart ||
            data.sales_over_time ||
            [],
            (row) =>
                row.label ??
                row.date ??
                row.day ??
                '',
            (row) =>
                Number(
                    row.total ??
                    row.sales ??
                    row.value ??
                    0
                ),
            'المبيعات'
        );

        createChart(
            selectors.productsChart,
            'bar',
            data.top_products ||
            data.products_chart ||
            [],
            (row) =>
                row.name ??
                row.product_name ??
                '',
            (row) =>
                Number(
                    row.quantity ??
                    row.quantity_sold ??
                    row.sales ??
                    0
                ),
            'الكمية المباعة'
        );

        createChart(
            selectors.paymentsChart,
            'doughnut',
            data.payments ||
            data.payment_methods ||
            [],
            (row) =>
                paymentLabel(
                    row.method ??
                    row.payment_method ??
                    row.name
                ),
            (row) =>
                Number(
                    row.amount ??
                    row.total ??
                    0
                ),
            'طرق الدفع'
        );
    }

    function createChart(
        selector,
        type,
        rows,
        labelFn,
        valueFn,
        label
    ) {
        const canvas =
            qs(selector);

        if (
            !canvas ||
            !Array.isArray(rows) ||
            rows.length === 0
        ) {
            return;
        }

        const chart =
            new window.Chart(
                canvas,
                {
                    type,

                    data: {
                        labels:
                            rows.map(
                                labelFn
                            ),

                        datasets: [
                            {
                                label,

                                data:
                                    rows.map(
                                        valueFn
                                    )
                            }
                        ]
                    },

                    options: {
                        responsive:
                            true,

                        maintainAspectRatio:
                            false,

                        interaction: {
                            intersect:
                                false,

                            mode:
                                'index'
                        },

                        plugins: {
                            legend: {
                                display:
                                    true
                            }
                        },

                        scales:
                            type ===
                            'doughnut'
                                ? {}
                                : {
                                    y: {
                                        beginAtZero:
                                            true
                                    }
                                }
                    }
                }
            );

        state.charts.push(
            chart
        );
    }

    function destroyCharts() {
        state.charts.forEach(
            (chart) => {
                try {
                    chart.destroy();
                } catch (error) {
                    console.warn(
                        'Chart cleanup failed:',
                        error
                    );
                }
            }
        );

        state.charts = [];
    }

    function renderPagination(meta) {
        const container =
            qs(
                selectors.pagination
            );

        if (
            !container ||
            !meta
        ) {
            return;
        }

        const current =
            Number(
                meta.page ??
                meta.current_page ??
                state.filters.page
            ) || 1;

        const totalPages =
            Number(
                meta.pages ??
                meta.total_pages ??
                1
            ) || 1;

        if (totalPages <= 1) {
            container.innerHTML =
                '';

            return;
        }

        const start =
            Math.max(
                1,
                current - 2
            );

        const end =
            Math.min(
                totalPages,
                current + 2
            );

        let html = '';

        if (current > 1) {
            html += `
                <button
                    type="button"
                    data-report-page="${current - 1}"
                >
                    السابق
                </button>
            `;
        }

        for (
            let page = start;
            page <= end;
            page += 1
        ) {
            const active =
                page === current
                    ? ' aria-current="page"'
                    : '';

            html += `
                <button
                    type="button"
                    data-report-page="${page}"
                    ${active}
                >
                    ${page}
                </button>
            `;
        }

        if (
            current <
            totalPages
        ) {
            html += `
                <button
                    type="button"
                    data-report-page="${current + 1}"
                >
                    التالي
                </button>
            `;
        }

        container.innerHTML =
            html;
    }

    function reset() {
        qsa(
            'input, select'
        ).forEach(
            (element) => {
                if (
                    element.dataset
                        .reportKeepValue !==
                    'true'
                ) {
                    element.value =
                        '';
                }
            }
        );

        const type =
            qs(
                selectors.report
            );

        if (type) {
            type.value =
                'sales';
        }

        state.filters = {
            report:
                'sales',

            date_from:
                '',

            date_to:
                '',

            status:
                '',

            payment_method:
                '',

            category_id:
                '',

            product_id:
                '',

            user_id:
                '',

            search:
                '',

            page:
                1,

            per_page:
                Number(
                    getValue(
                        selectors.perPage,
                        '25'
                    )
                ) || 25
        };

        load();
    }

    function exportReport() {
        const endpoint =
            getEndpoints().export;

        if (!endpoint) {
            showError(
                'Route تصدير التقارير غير مربوط في reports.html.'
            );

            return;
        }

        const query =
            buildQuery();

        query.set(
            'format',
            'csv'
        );

        const separator =
            endpoint.includes('?')
                ? '&'
                : '?';

        window.location.assign(
            `${endpoint}${separator}${query.toString()}`
        );
    }

    function bindEvents() {
        const container =
            root();

        if (!container) {
            return;
        }

        const form =
            qs(
                selectors.form
            );

        if (form) {
            form.addEventListener(
                'submit',
                (event) => {
                    event.preventDefault();

                    readFilters(
                        true
                    );

                    load();
                }
            );
        }

        const apply =
            qs(
                selectors.apply
            );

        if (apply) {
            apply.addEventListener(
                'click',
                () => {
                    readFilters(
                        true
                    );

                    load();
                }
            );
        }

        const refresh =
            qs(
                selectors.refresh
            );

        if (refresh) {
            refresh.addEventListener(
                'click',
                () => load()
            );
        }

        const resetButton =
            qs(
                selectors.reset
            );

        if (resetButton) {
            resetButton.addEventListener(
                'click',
                reset
            );
        }

        const exportButton =
            qs(
                selectors.export
            );

        if (exportButton) {
            exportButton.addEventListener(
                'click',
                exportReport
            );
        }

        const printButton =
            qs(
                selectors.print
            );

        if (printButton) {
            printButton.addEventListener(
                'click',
                () => window.print()
            );
        }

        const search =
            qs(
                selectors.search
            );

        if (search) {
            let timer;

            search.addEventListener(
                'input',
                () => {
                    clearTimeout(
                        timer
                    );

                    timer =
                        setTimeout(
                            () => {
                                state.filters.search =
                                    search.value.trim();

                                state.filters.page =
                                    1;

                                load();
                            },
                            350
                        );
                }
            );
        }

        container.addEventListener(
            'click',
            (event) => {
                const button =
                    event.target.closest(
                        '[data-report-page]'
                    );

                if (
                    !button ||
                    !container.contains(
                        button
                    )
                ) {
                    return;
                }

                const page =
                    Number(
                        button.dataset.reportPage
                    );

                if (
                    Number.isInteger(
                        page
                    ) &&
                    page > 0
                ) {
                    state.filters.page =
                        page;

                    load();
                }
            }
        );
    }

    function money(value) {
        const amount =
            Number(value);

        if (
            !Number.isFinite(
                amount
            )
        ) {
            return '0.00';
        }

        return amount.toLocaleString(
            'ar-EG',
            {
                minimumFractionDigits:
                    2,

                maximumFractionDigits:
                    2
            }
        );
    }

    function number(value) {
        const amount =
            Number(value);

        if (
            !Number.isFinite(
                amount
            )
        ) {
            return '0';
        }

        return amount.toLocaleString(
            'ar-EG'
        );
    }

    function formatDate(value) {
        if (!value) {
            return '-';
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return escapeHtml(
                value
            );
        }

        return date.toLocaleString(
            'ar-EG',
            {
                year:
                    'numeric',

                month:
                    '2-digit',

                day:
                    '2-digit',

                hour:
                    '2-digit',

                minute:
                    '2-digit'
            }
        );
    }

    function paymentLabel(value) {
        const labels = {
            cash:
                'نقدي',

            card:
                'بطاقة',

            bank:
                'تحويل بنكي',

            wallet:
                'محفظة إلكترونية',

            credit:
                'آجل',

            online:
                'دفع إلكتروني'
        };

        const key =
            String(
                value ?? ''
            ).toLowerCase();

        return (
            labels[key] ||
            value ||
            'غير محدد'
        );
    }

    function statusLabel(value) {
        const labels = {
            completed:
                'مكتملة',

            paid:
                'مدفوعة',

            pending:
                'معلقة',

            cancelled:
                'ملغاة',

            canceled:
                'ملغاة',

            refunded:
                'مسترجعة',

            draft:
                'مسودة'
        };

        const key =
            String(
                value ?? ''
            ).toLowerCase();

        return (
            labels[key] ||
            value ||
            'غير محدد'
        );
    }

    function statusBadge(value) {
        const key =
            String(
                value ??
                'unknown'
            )
                .toLowerCase()
                .replace(
                    /[^a-z0-9_-]/g,
                    ''
                );

        return `
            <span
                class="report-status report-status-${escapeHtml(
                    key
                )}"
            >
                ${escapeHtml(
                    statusLabel(
                        value
                    )
                )}
            </span>
        `;
    }

    function inventoryBadge(value) {
        const key =
            value ===
            'نفد المخزون'
                ? 'out'
                : value ===
                    'منخفض'
                    ? 'low'
                    : 'available';

        return `
            <span
                class="inventory-status inventory-status-${key}"
            >
                ${escapeHtml(
                    value
                )}
            </span>
        `;
    }

    function emptyRow(
        colspan,
        message
    ) {
        return `
            <tr>
                <td
                    colspan="${Number(
                        colspan
                    )}"
                    class="report-empty-cell"
                >
                    ${escapeHtml(
                        message
                    )}
                </td>
            </tr>
        `;
    }

    function escapeHtml(value) {
        const element =
            document.createElement(
                'div'
            );

        element.textContent =
            value == null
                ? ''
                : String(value);

        return element.innerHTML;
    }

    function init() {
        if (
            state.initialized ||
            !root()
        ) {
            return;
        }

        state.initialized =
            true;

        readFilters();

        bindEvents();

        load();
    }

    return {
        init,
        load,
        reset,
        export:
            exportReport,
        state
    };
})();

document.addEventListener(
    'DOMContentLoaded',
    () => {
        window.SmartPOS.reports.init();
    }
);