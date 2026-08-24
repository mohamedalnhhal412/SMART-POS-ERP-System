
/* =========================================================
   SMART POS / ERP
   dashboard.js
   Dashboard Controller
   ========================================================= */

"use strict";

window.SmartPOS = window.SmartPOS || {};
SmartPOS.dashboard = SmartPOS.dashboard || {};


/* =========================================================
   DASHBOARD STATE
   ========================================================= */

SmartPOS.dashboard.state = {
    loading: false,
    initialized: false,
    data: null,
    refreshTimer: null,

    refreshInterval: 60000,

    selectors: {
        dashboard: "[data-dashboard]",
        totalSales: "[data-stat='total-sales']",
        todaySales: "[data-stat='today-sales']",
        totalOrders: "[data-stat='total-orders']",
        todayOrders: "[data-stat='today-orders']",
        totalProducts: "[data-stat='total-products']",
        lowStock: "[data-stat='low-stock']",
        customers: "[data-stat='customers']",
        profit: "[data-stat='profit']",
        recentSales: "[data-recent-sales]",
        lowStockTable: "[data-low-stock-table]",
        topProducts: "[data-top-products]",
        salesChart: "[data-sales-chart]",
        refreshButton: "[data-dashboard-refresh]"
    }
};


/* =========================================================
   HELPERS
   ========================================================= */

SmartPOS.dashboard.$ = function (
    selector,
    parent = document
) {
    return parent.querySelector(selector);
};


SmartPOS.dashboard.$$ = function (
    selector,
    parent = document
) {
    return Array.from(
        parent.querySelectorAll(selector)
    );
};


SmartPOS.dashboard.number = function (
    value,
    decimals = 0
) {
    if (
        window.SmartPOS &&
        typeof SmartPOS.formatNumber === "function"
    ) {
        return SmartPOS.formatNumber(
            value,
            decimals
        );
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString(
        "ar-EG",
        {
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }
    );
};


SmartPOS.dashboard.currency = function (
    value
) {
    if (
        window.SmartPOS &&
        typeof SmartPOS.formatCurrency === "function"
    ) {
        return SmartPOS.formatCurrency(value);
    }

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0 ج.م";
    }

    return `${number.toLocaleString("ar-EG", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })} ج.م`;
};


SmartPOS.dashboard.escape = function (
    value
) {
    if (
        window.SmartPOS &&
        typeof SmartPOS.escapeHTML === "function"
    ) {
        return SmartPOS.escapeHTML(value);
    }

    const div = document.createElement("div");

    div.textContent =
        value === null ||
        value === undefined
            ? ""
            : String(value);

    return div.innerHTML;
};


/* =========================================================
   GET DASHBOARD ELEMENT
   ========================================================= */

SmartPOS.dashboard.getRoot = function () {
    return SmartPOS.dashboard.$(
        SmartPOS.dashboard.state
            .selectors.dashboard
    );
};


/* =========================================================
   API ENDPOINT
   ========================================================= */

SmartPOS.dashboard.getEndpoint = function () {
    const root =
        SmartPOS.dashboard.getRoot();

    if (!root) {
        return null;
    }

    return (
        root.dataset.dashboardEndpoint ||
        root.dataset.endpoint ||
        null
    );
};


/* =========================================================
   LOAD DASHBOARD DATA
   ========================================================= */

SmartPOS.dashboard.load = async function (
    options = {}
) {
    const endpoint =
        options.endpoint ||
        SmartPOS.dashboard.getEndpoint();

    if (!endpoint) {
        console.warn(
            "SMART POS: Dashboard endpoint is not configured."
        );

        return null;
    }

    if (
        SmartPOS.dashboard.state.loading &&
        !options.force
    ) {
        return null;
    }

    SmartPOS.dashboard.state.loading = true;

    SmartPOS.dashboard.setLoading(true);

    try {

        const response =
            await SmartPOS.api(
                endpoint,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        const data =
            response?.data ||
            response;

        SmartPOS.dashboard.state.data =
            data;

        SmartPOS.dashboard.render(
            data
        );

        return data;

    } catch (error) {

        console.error(
            "Dashboard loading error:",
            error
        );

        SmartPOS.dashboard.showError(
            error.message ||
            "تعذر تحميل بيانات لوحة التحكم."
        );

        return null;

    } finally {

        SmartPOS.dashboard.state.loading =
            false;

        SmartPOS.dashboard.setLoading(
            false
        );
    }
};


/* =========================================================
   LOADING STATE
   ========================================================= */

SmartPOS.dashboard.setLoading = function (
    loading
) {
    const root =
        SmartPOS.dashboard.getRoot();

    if (!root) {
        return;
    }

    root.classList.toggle(
        "dashboard-loading",
        loading
    );

    const button =
        SmartPOS.dashboard.$(
            SmartPOS.dashboard.state
                .selectors.refreshButton
        );

    if (!button) {
        return;
    }

    button.disabled = loading;

    const icon =
        button.querySelector("i");

    if (icon) {
        icon.classList.toggle(
            "fa-spin",
            loading
        );
    }
};


/* =========================================================
   RENDER DASHBOARD
   ========================================================= */

SmartPOS.dashboard.render = function (
    data
) {
    if (!data) {
        return;
    }

    SmartPOS.dashboard.renderStats(
        data
    );

    SmartPOS.dashboard.renderRecentSales(
        data.recent_sales ||
        data.recentSales ||
        []
    );

    SmartPOS.dashboard.renderLowStock(
        data.low_stock ||
        data.lowStock ||
        []
    );

    SmartPOS.dashboard.renderTopProducts(
        data.top_products ||
        data.topProducts ||
        []
    );

    SmartPOS.dashboard.renderChart(
        data.sales_chart ||
        data.salesChart ||
        data.chart ||
        null
    );
};


/* =========================================================
   STATISTICS
   ========================================================= */

SmartPOS.dashboard.renderStats = function (
    data
) {
    const stats =
        data.stats ||
        data.statistics ||
        data;

    SmartPOS.dashboard.setText(
        "total-sales",
        stats.total_sales ??
        stats.totalSales
    );

    SmartPOS.dashboard.setCurrency(
        "today-sales",
        stats.today_sales ??
        stats.todaySales
    );

    SmartPOS.dashboard.setText(
        "total-orders",
        stats.total_orders ??
        stats.totalOrders
    );

    SmartPOS.dashboard.setText(
        "today-orders",
        stats.today_orders ??
        stats.todayOrders
    );

    SmartPOS.dashboard.setText(
        "total-products",
        stats.total_products ??
        stats.totalProducts
    );

    SmartPOS.dashboard.setText(
        "low-stock",
        stats.low_stock ??
        stats.lowStock
    );

    SmartPOS.dashboard.setText(
        "customers",
        stats.customers ??
        stats.total_customers ??
        stats.totalCustomers
    );

    SmartPOS.dashboard.setCurrency(
        "profit",
        stats.profit ??
        stats.total_profit ??
        stats.totalProfit
    );

    SmartPOS.dashboard.renderChanges(
        stats
    );
};


/* =========================================================
   SET STAT TEXT
   ========================================================= */

SmartPOS.dashboard.setText = function (
    name,
    value
) {
    const element =
        SmartPOS.dashboard.$(
            `[data-stat="${name}"]`
        );

    if (!element) {
        return;
    }

    element.textContent =
        value === null ||
        value === undefined
            ? "0"
            : SmartPOS.dashboard.number(value);
};


/* =========================================================
   SET CURRENCY
   ========================================================= */

SmartPOS.dashboard.setCurrency = function (
    name,
    value
) {
    const element =
        SmartPOS.dashboard.$(
            `[data-stat="${name}"]`
        );

    if (!element) {
        return;
    }

    element.textContent =
        SmartPOS.dashboard.currency(
            value || 0
        );
};


/* =========================================================
   STATISTIC CHANGES
   ========================================================= */

SmartPOS.dashboard.renderChanges = function (
    stats
) {
    const changes = {
        totalSales:
            stats.total_sales_change ??
            stats.totalSalesChange,

        todaySales:
            stats.today_sales_change ??
            stats.todaySalesChange,

        totalOrders:
            stats.total_orders_change ??
            stats.totalOrdersChange,

        products:
            stats.products_change ??
            stats.productsChange,

        customers:
            stats.customers_change ??
            stats.customersChange,

        profit:
            stats.profit_change ??
            stats.profitChange
    };

    Object.entries(changes).forEach(
        ([key, value]) => {

            if (
                value === null ||
                value === undefined
            ) {
                return;
            }

            SmartPOS.dashboard.setChange(
                key,
                value
            );
        }
    );
};


SmartPOS.dashboard.setChange = function (
    key,
    value
) {
    const element =
        SmartPOS.dashboard.$(
            `[data-change="${key}"]`
        );

    if (!element) {
        return;
    }

    const number =
        Number(value);

    const positive =
        number > 0;

    const negative =
        number < 0;

    element.classList.remove(
        "positive",
        "negative",
        "neutral"
    );

    if (positive) {
        element.classList.add(
            "positive"
        );
    } else if (negative) {
        element.classList.add(
            "negative"
        );
    } else {
        element.classList.add(
            "neutral"
        );
    }

    const sign =
        positive
            ? "+"
            : "";

    element.textContent =
        `${sign}${number}%`;
};


/* =========================================================
   RECENT SALES
   ========================================================= */

SmartPOS.dashboard.renderRecentSales = function (
    sales
) {
    const container =
        SmartPOS.dashboard.$(
            SmartPOS.dashboard
                .state
                .selectors
                .recentSales
        );

    if (!container) {
        return;
    }

    if (!Array.isArray(sales) || sales.length === 0) {

        container.innerHTML = `
            <div class="dashboard-empty">
                <i class="fa-solid fa-receipt"></i>
                <span>لا توجد مبيعات حديثة.</span>
            </div>
        `;

        return;
    }

    container.innerHTML =
        sales.map(sale => {

            const invoice =
                sale.invoice_number ??
                sale.invoiceNumber ??
                sale.id ??
                "-";

            const customer =
                sale.customer_name ??
                sale.customerName ??
                sale.customer ??
                "عميل نقدي";

            const total =
                sale.total ??
                sale.total_amount ??
                sale.amount ??
                0;

            const status =
                sale.status ??
                "completed";

            const date =
                sale.created_at ??
                sale.createdAt ??
                sale.date ??
                "";

            return `
                <div class="dashboard-sale-row">

                    <div class="sale-main">

                        <strong>
                            ${SmartPOS.dashboard.escape(invoice)}
                        </strong>

                        <span>
                            ${SmartPOS.dashboard.escape(customer)}
                        </span>

                    </div>

                    <div class="sale-date">
                        ${SmartPOS.dashboard.escape(
                            SmartPOS.dashboard.formatDate(date)
                        )}
                    </div>

                    <div class="sale-total">
                        ${SmartPOS.dashboard.currency(total)}
                    </div>

                    <span class="sale-status status-${SmartPOS.dashboard.escape(status)}">
                        ${SmartPOS.dashboard.statusLabel(status)}
                    </span>

                </div>
            `;
        }).join("");
};


/* =========================================================
   LOW STOCK
   ========================================================= */

SmartPOS.dashboard.renderLowStock = function (
    products
) {
    const container =
        SmartPOS.dashboard.$(
            SmartPOS.dashboard
                .state
                .selectors
                .lowStockTable
        );

    if (!container) {
        return;
    }

    if (
        !Array.isArray(products) ||
        products.length === 0
    ) {
        container.innerHTML = `
            <div class="dashboard-empty dashboard-empty-success">
                <i class="fa-solid fa-circle-check"></i>
                <span>لا توجد منتجات منخفضة المخزون.</span>
            </div>
        `;

        return;
    }

    container.innerHTML =
        products.map(product => {

            const name =
                product.name ||
                product.product_name ||
                "منتج";

            const sku =
                product.sku ||
                product.code ||
                "-";

            const quantity =
                product.quantity ??
                product.stock ??
                product.current_stock ??
                0;

            const minimum =
                product.minimum_stock ??
                product.min_stock ??
                product.reorder_level ??
                0;

            let level = "warning";

            if (
                Number(quantity) <= 0
            ) {
                level = "danger";
            }

            return `
                <div class="dashboard-stock-row">

                    <div class="stock-product">

                        <strong>
                            ${SmartPOS.dashboard.escape(name)}
                        </strong>

                        <span>
                            SKU:
                            ${SmartPOS.dashboard.escape(sku)}
                        </span>

                    </div>

                    <div
                        class="stock-quantity stock-${level}"
                    >
                        ${SmartPOS.dashboard.number(quantity)}
                    </div>

                    <div class="stock-minimum">
                        الحد الأدنى:
                        ${SmartPOS.dashboard.number(minimum)}
                    </div>

                </div>
            `;
        }).join("");
};


/* =========================================================
   TOP PRODUCTS
   ========================================================= */

SmartPOS.dashboard.renderTopProducts = function (
    products
) {
    const container =
        SmartPOS.dashboard.$(
            SmartPOS.dashboard
                .state
                .selectors
                .topProducts
        );

    if (!container) {
        return;
    }

    if (
        !Array.isArray(products) ||
        products.length === 0
    ) {
        container.innerHTML = `
            <div class="dashboard-empty">
                <i class="fa-solid fa-box-open"></i>
                <span>لا توجد بيانات للمنتجات.</span>
            </div>
        `;

        return;
    }

    container.innerHTML =
        products.map(
            (product, index) => {

                const name =
                    product.name ||
                    product.product_name ||
                    "منتج";

                const quantity =
                    product.quantity_sold ??
                    product.sold_quantity ??
                    product.quantity ??
                    0;

                const revenue =
                    product.revenue ??
                    product.total_sales ??
                    product.sales ??
                    0;

                return `
                    <div class="dashboard-top-product">

                        <div class="product-rank">
                            ${index + 1}
                        </div>

                        <div class="product-info">

                            <strong>
                                ${SmartPOS.dashboard.escape(name)}
                            </strong>

                            <span>
                                ${SmartPOS.dashboard.number(quantity)}
                                مبيعات
                            </span>

                        </div>

                        <div class="product-revenue">
                            ${SmartPOS.dashboard.currency(revenue)}
                        </div>

                    </div>
                `;
            }
        ).join("");
};


/* =========================================================
   DATE FORMAT
   ========================================================= */

SmartPOS.dashboard.formatDate = function (
    value
) {
    if (!value) {
        return "";
    }

    if (
        window.SmartPOS &&
        typeof SmartPOS.formatDate === "function"
    ) {
        return SmartPOS.formatDate(value);
    }

    const date =
        new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleDateString(
        "ar-EG"
    );
};


/* =========================================================
   STATUS LABEL
   ========================================================= */

SmartPOS.dashboard.statusLabel = function (
    status
) {
    const labels = {
        completed: "مكتملة",
        paid: "مدفوعة",
        pending: "معلقة",
        cancelled: "ملغاة",
        canceled: "ملغاة",
        refunded: "مسترجعة",
        draft: "مسودة",
        processing: "قيد المعالجة"
    };

    return labels[status] ||
        SmartPOS.dashboard.escape(status);
};


/* =========================================================
   SALES CHART
   ========================================================= */

SmartPOS.dashboard.renderChart = function (
    chartData
) {
    const canvas =
        SmartPOS.dashboard.$(
            SmartPOS.dashboard
                .state
                .selectors
                .salesChart
        );

    if (!canvas) {
        return;
    }

    if (
        !chartData ||
        !Array.isArray(chartData.labels) ||
        !Array.isArray(chartData.values)
    ) {
        return;
    }

    if (
        typeof Chart === "undefined"
    ) {
        console.warn(
            "Chart.js is not loaded. Sales chart cannot be rendered."
        );

        return;
    }

    if (
        SmartPOS.dashboard.chart
    ) {
        SmartPOS.dashboard.chart.destroy();
    }

    SmartPOS.dashboard.chart =
        new Chart(
            canvas,
            {
                type:
                    chartData.type ||
                    "line",

                data: {
                    labels:
                        chartData.labels,

                    datasets: [
                        {
                            label:
                                chartData.label ||
                                "المبيعات",

                            data:
                                chartData.values,

                            borderWidth: 3,

                            tension: 0.35,

                            fill: true
                        }
                    ]
                },

                options: {
                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {
                        intersect: false,
                        mode: "index"
                    },

                    plugins: {
                        legend: {
                            display: true
                        },

                        tooltip: {
                            callbacks: {
                                label:
                                    function (
                                        context
                                    ) {
                                        return (
                                            " " +
                                            SmartPOS.dashboard
                                                .currency(
                                                    context.raw
                                                )
                                        );
                                    }
                            }
                        }
                    },

                    scales: {
                        y: {
                            beginAtZero: true,

                            ticks: {
                                callback:
                                    function (
                                        value
                                    ) {
                                        return SmartPOS.dashboard
                                            .currency(
                                                value
                                            );
                                    }
                            }
                        }
                    }
                }
            }
        );
};


/* =========================================================
   REFRESH BUTTON
   ========================================================= */

SmartPOS.dashboard.initRefresh = function () {
    const button =
        SmartPOS.dashboard.$(
            SmartPOS.dashboard
                .state
                .selectors
                .refreshButton
        );

    if (!button) {
        return;
    }

    button.addEventListener(
        "click",
        async () => {

            await SmartPOS.dashboard.load({
                force: true
            });

            if (
                window.SmartPOS &&
                typeof SmartPOS.notify === "function"
            ) {
                SmartPOS.notify(
                    "تم تحديث بيانات لوحة التحكم.",
                    "success"
                );
            }
        }
    );
};


/* =========================================================
   AUTO REFRESH
   ========================================================= */

SmartPOS.dashboard.startAutoRefresh = function () {
    SmartPOS.dashboard.stopAutoRefresh();

    SmartPOS.dashboard.state.refreshTimer =
        setInterval(
            () => {

                if (
                    document.hidden
                ) {
                    return;
                }

                SmartPOS.dashboard.load();

            },
            SmartPOS.dashboard
                .state
                .refreshInterval
        );
};


SmartPOS.dashboard.stopAutoRefresh = function () {
    if (
        SmartPOS.dashboard.state
            .refreshTimer
    ) {
        clearInterval(
            SmartPOS.dashboard.state
                .refreshTimer
        );

        SmartPOS.dashboard.state
            .refreshTimer = null;
    }
};


/* =========================================================
   ERROR STATE
   ========================================================= */

SmartPOS.dashboard.showError = function (
    message
) {
    const root =
        SmartPOS.dashboard.getRoot();

    if (!root) {
        return;
    }

    const existing =
        root.querySelector(
            ".dashboard-error-message"
        );

    if (existing) {
        existing.remove();
    }

    const error =
        document.createElement("div");

    error.className =
        "dashboard-error-message";

    error.innerHTML = `
        <i class="fa-solid fa-circle-exclamation"></i>

        <span>
            ${SmartPOS.dashboard.escape(message)}
        </span>

        <button
            type="button"
            data-dashboard-error-retry
        >
            إعادة المحاولة
        </button>
    `;

    root.prepend(error);

    const retry =
        error.querySelector(
            "[data-dashboard-error-retry]"
        );

    if (retry) {
        retry.addEventListener(
            "click",
            () => {
                error.remove();

                SmartPOS.dashboard.load({
                    force: true
                });
            }
        );
    }
};


/* =========================================================
   INITIALIZATION
   ========================================================= */

SmartPOS.dashboard.init = function () {
    const root =
        SmartPOS.dashboard.getRoot();

    if (!root) {
        return;
    }

    if (
        SmartPOS.dashboard.state.initialized
    ) {
        return;
    }

    SmartPOS.dashboard.state.initialized =
        true;

    SmartPOS.dashboard.initRefresh();

    SmartPOS.dashboard.load();

    SmartPOS.dashboard.startAutoRefresh();

    console.log(
        "SMART POS Dashboard initialized."
    );
};


/* =========================================================
   CLEANUP
   ========================================================= */

window.addEventListener(
    "beforeunload",
    () => {
        SmartPOS.dashboard.stopAutoRefresh();
    }
);


/* =========================================================
   DOM READY
   ========================================================= */

if (
    document.readyState === "loading"
) {
    document.addEventListener(
        "DOMContentLoaded",
        SmartPOS.dashboard.init
    );
} else {
    SmartPOS.dashboard.init();
}