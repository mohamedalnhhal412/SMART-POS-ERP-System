
/* =========================================================
   SMART POS / ERP
   products.js
   Product Management Module
   ========================================================= */

"use strict";

window.SmartPOS = window.SmartPOS || {};
SmartPOS.products = SmartPOS.products || {};


/* =========================================================
   STATE
   ========================================================= */

SmartPOS.products.state = {
    initialized: false,
    loading: false,

    products: [],
    categories: [],

    currentPage: 1,
    perPage: 10,
    totalPages: 1,
    totalProducts: 0,

    search: "",
    category: "",
    status: "",
    stockStatus: "",

    selectedProductId: null,

    endpoints: {
        list: null,
        create: null,
        update: null,
        delete: null,
        categories: null
    }
};


/* =========================================================
   SELECTORS
   ========================================================= */

SmartPOS.products.selectors = {

    root: "[data-products]",

    table: "[data-products-table]",

    tbody: "[data-products-body]",

    search: "[data-product-search]",

    category: "[data-product-category]",

    status: "[data-product-status]",

    stockStatus: "[data-stock-status]",

    refresh: "[data-products-refresh]",

    addButton: "[data-product-add]",

    form: "[data-product-form]",

    modal: "[data-product-modal]",

    modalTitle: "[data-product-modal-title]",

    closeModal: "[data-product-modal-close]",

    cancelModal: "[data-product-modal-cancel]",

    pagination: "[data-products-pagination]",

    empty: "[data-products-empty]",

    loading: "[data-products-loading]",

    total: "[data-products-total]",

    selectedCount: "[data-products-selected-count]",

    selectAll: "[data-products-select-all]",

    rowCheckbox: "[data-product-checkbox]",

    deleteSelected: "[data-products-delete-selected]"
};


/* =========================================================
   HELPERS
   ========================================================= */

SmartPOS.products.$ = function (
    selector,
    parent = document
) {
    return parent.querySelector(selector);
};


SmartPOS.products.$$ = function (
    selector,
    parent = document
) {
    return Array.from(
        parent.querySelectorAll(selector)
    );
};


/* =========================================================
   ESCAPE HTML
   ========================================================= */

SmartPOS.products.escape = function (
    value
) {
    if (
        typeof SmartPOS.escapeHTML === "function"
    ) {
        return SmartPOS.escapeHTML(value);
    }

    const element =
        document.createElement("div");

    element.textContent =
        value === null ||
        value === undefined
            ? ""
            : String(value);

    return element.innerHTML;
};


/* =========================================================
   NUMBER FORMAT
   ========================================================= */

SmartPOS.products.number = function (
    value
) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString(
        "ar-EG"
    );
};


/* =========================================================
   CURRENCY FORMAT
   ========================================================= */

SmartPOS.products.currency = function (
    value
) {
    const number =
        Number(value);

    if (!Number.isFinite(number)) {
        return "0.00 ج.م";
    }

    if (
        typeof SmartPOS.formatCurrency ===
        "function"
    ) {
        return SmartPOS.formatCurrency(
            number
        );
    }

    return `${number.toLocaleString(
        "ar-EG",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    )} ج.م`;
};


/* =========================================================
   GET ROOT
   ========================================================= */

SmartPOS.products.getRoot = function () {

    return SmartPOS.products.$(
        SmartPOS.products.selectors.root
    );
};


/* =========================================================
   READ ENDPOINTS
   ========================================================= */

SmartPOS.products.readEndpoints = function () {

    const root =
        SmartPOS.products.getRoot();

    if (!root) {
        return;
    }

    SmartPOS.products.state.endpoints = {

        list:
            root.dataset.productsEndpoint ||
            root.dataset.listEndpoint ||
            null,

        create:
            root.dataset.createEndpoint ||
            null,

        update:
            root.dataset.updateEndpoint ||
            null,

        delete:
            root.dataset.deleteEndpoint ||
            null,

        categories:
            root.dataset.categoriesEndpoint ||
            null
    };
};


/* =========================================================
   API REQUEST
   ========================================================= */

SmartPOS.products.request = async function (
    url,
    options = {}
) {

    if (!url) {
        throw new Error(
            "لم يتم تحديد رابط API للمنتجات."
        );
    }

    if (
        typeof SmartPOS.api === "function"
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
                credentials: "same-origin",

                headers: {
                    "Content-Type":
                        "application/json",

                    ...(options.headers || {})
                },

                ...options
            }
        );

    let data = null;

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
            "حدث خطأ أثناء تنفيذ العملية."
        );
    }

    return data;
};


/* =========================================================
   LOAD PRODUCTS
   ========================================================= */

SmartPOS.products.load = async function (
    options = {}
) {

    if (
        SmartPOS.products.state.loading &&
        !options.force
    ) {
        return;
    }

    const endpoint =
        SmartPOS.products.state
            .endpoints
            .list;

    if (!endpoint) {

        console.warn(
            "SMART POS: Products list endpoint is not configured."
        );

        return;
    }

    SmartPOS.products.state.loading =
        true;

    SmartPOS.products.setLoading(
        true
    );

    try {

        const params =
            new URLSearchParams();

        params.set(
            "page",
            SmartPOS.products.state.currentPage
        );

        params.set(
            "per_page",
            SmartPOS.products.state.perPage
        );

        if (
            SmartPOS.products.state.search
        ) {
            params.set(
                "search",
                SmartPOS.products.state.search
            );
        }

        if (
            SmartPOS.products.state.category
        ) {
            params.set(
                "category",
                SmartPOS.products.state.category
            );
        }

        if (
            SmartPOS.products.state.status
        ) {
            params.set(
                "status",
                SmartPOS.products.state.status
            );
        }

        if (
            SmartPOS.products.state.stockStatus
        ) {
            params.set(
                "stock_status",
                SmartPOS.products.state.stockStatus
            );
        }

        const separator =
            endpoint.includes("?")
                ? "&"
                : "?";

        const response =
            await SmartPOS.products.request(
                `${endpoint}${separator}${params.toString()}`,
                {
                    method: "GET",
                    cache: "no-store"
                }
            );

        const data =
            response.data ||
            response;

        SmartPOS.products.state.products =
            data.products ||
            data.items ||
            [];

        SmartPOS.products.state.totalProducts =
            Number(
                data.total ||
                data.total_products ||
                SmartPOS.products.state.products.length
            );

        SmartPOS.products.state.totalPages =
            Number(
                data.pages ||
                data.total_pages ||
                Math.max(
                    1,
                    Math.ceil(
                        SmartPOS.products.state
                            .totalProducts /
                        SmartPOS.products.state
                            .perPage
                    )
                )
            );

        SmartPOS.products.render();

    } catch (error) {

        console.error(
            "Products loading error:",
            error
        );

        SmartPOS.products.showError(
            error.message ||
            "تعذر تحميل المنتجات."
        );

    } finally {

        SmartPOS.products.state.loading =
            false;

        SmartPOS.products.setLoading(
            false
        );
    }
};


/* =========================================================
   LOAD CATEGORIES
   ========================================================= */

SmartPOS.products.loadCategories =
    async function () {

        const endpoint =
            SmartPOS.products.state
                .endpoints
                .categories;

        if (!endpoint) {
            return;
        }

        try {

            const response =
                await SmartPOS.products.request(
                    endpoint,
                    {
                        method: "GET"
                    }
                );

            const data =
                response.data ||
                response;

            SmartPOS.products.state.categories =
                data.categories ||
                data.items ||
                [];

            SmartPOS.products.renderCategories();

        } catch (error) {

            console.error(
                "Categories loading error:",
                error
            );
        }
    };


/* =========================================================
   RENDER CATEGORIES
   ========================================================= */

SmartPOS.products.renderCategories =
    function () {

        const select =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .category
            );

        if (!select) {
            return;
        }

        const current =
            SmartPOS.products.state.category;

        select.innerHTML = `
            <option value="">
                كل التصنيفات
            </option>
        `;

        SmartPOS.products.state.categories
            .forEach(category => {

                const id =
                    category.id ??
                    category.value;

                const name =
                    category.name ??
                    category.title ??
                    category.label;

                if (
                    id === undefined ||
                    name === undefined
                ) {
                    return;
                }

                const option =
                    document.createElement(
                        "option"
                    );

                option.value = id;

                option.textContent =
                    name;

                option.selected =
                    String(id) ===
                    String(current);

                select.appendChild(
                    option
                );
            });
    };


/* =========================================================
   RENDER PRODUCTS
   ========================================================= */

SmartPOS.products.render =
    function () {

        SmartPOS.products.renderTable();

        SmartPOS.products.renderPagination();

        SmartPOS.products.renderTotal();

        SmartPOS.products.updateSelection();
    };


/* =========================================================
   RENDER TABLE
   ========================================================= */

SmartPOS.products.renderTable =
    function () {

        const tbody =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .tbody
            );

        if (!tbody) {
            return;
        }

        const products =
            SmartPOS.products.state.products;

        if (
            !Array.isArray(products) ||
            products.length === 0
        ) {

            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="12"
                        class="products-empty-cell"
                    >
                        <div class="products-empty">
                            <i
                                class="fa-solid fa-box-open"
                            ></i>

                            <strong>
                                لا توجد منتجات
                            </strong>

                            <span>
                                لم يتم العثور على أي منتج
                                مطابق للبحث.
                            </span>
                        </div>
                    </td>
                </tr>
            `;

            return;
        }

        tbody.innerHTML =
            products.map(
                (product, index) =>
                    SmartPOS.products
                        .renderRow(
                            product,
                            index
                        )
            ).join("");
    };


/* =========================================================
   RENDER PRODUCT ROW
   ========================================================= */

SmartPOS.products.renderRow =
    function (
        product,
        index
    ) {

        const id =
            product.id ??
            product.product_id;

        const name =
            product.name ||
            product.product_name ||
            "منتج بدون اسم";

        const sku =
            product.sku ||
            product.code ||
            "-";

        const category =
            product.category_name ||
            product.category ||
            "-";

        const price =
            product.price ??
            product.selling_price ??
            product.sale_price ??
            0;

        const purchasePrice =
            product.purchase_price ??
            product.cost_price ??
            0;

        const stock =
            product.stock ??
            product.quantity ??
            product.current_stock ??
            0;

        const minimumStock =
            product.minimum_stock ??
            product.min_stock ??
            product.reorder_level ??
            0;

        const status =
            product.status ||
            "active";

        const image =
            product.image ||
            product.image_url ||
            null;

        const stockClass =
            SmartPOS.products
                .getStockClass(
                    stock,
                    minimumStock
                );

        const statusClass =
            status === "active"
                ? "active"
                : "inactive";

        return `
            <tr
                data-product-row
                data-product-id="${SmartPOS.products.escape(id)}"
            >

                <td>
                    <input
                        type="checkbox"
                        class="product-checkbox"
                        data-product-checkbox
                        value="${SmartPOS.products.escape(id)}"
                        aria-label="اختيار المنتج"
                    >
                </td>

                <td>
                    <div class="product-table-info">

                        ${
                            image
                                ? `
                                    <img
                                        src="${SmartPOS.products.escape(image)}"
                                        alt="${SmartPOS.products.escape(name)}"
                                        class="product-table-image"
                                        loading="lazy"
                                    >
                                `
                                : `
                                    <div
                                        class="product-table-image product-placeholder"
                                    >
                                        <i
                                            class="fa-solid fa-box"
                                        ></i>
                                    </div>
                                `
                        }

                        <div>
                            <strong>
                                ${SmartPOS.products.escape(name)}
                            </strong>

                            <small>
                                ID:
                                ${SmartPOS.products.escape(id)}
                            </small>
                        </div>

                    </div>
                </td>

                <td>
                    ${SmartPOS.products.escape(sku)}
                </td>

                <td>
                    ${SmartPOS.products.escape(category)}
                </td>

                <td>
                    ${SmartPOS.products.currency(price)}
                </td>

                <td>
                    ${SmartPOS.products.currency(purchasePrice)}
                </td>

                <td>
                    <span
                        class="product-stock ${stockClass}"
                    >
                        ${SmartPOS.products.number(stock)}
                    </span>
                </td>

                <td>
                    ${SmartPOS.products.number(minimumStock)}
                </td>

                <td>
                    <span
                        class="product-status ${statusClass}"
                    >
                        ${
                            status === "active"
                                ? "نشط"
                                : "غير نشط"
                        }
                    </span>
                </td>

                <td>
                    ${
                        product.created_at ||
                        product.createdAt
                            ? SmartPOS.products
                                .formatDate(
                                    product.created_at ||
                                    product.createdAt
                                )
                            : "-"
                    }
                </td>

                <td>
                    <div class="product-actions">

                        <button
                            type="button"
                            class="btn btn-sm btn-primary"
                            data-product-edit
                            data-id="${SmartPOS.products.escape(id)}"
                            title="تعديل المنتج"
                        >
                            <i
                                class="fa-solid fa-pen"
                            ></i>
                        </button>

                        <button
                            type="button"
                            class="btn btn-sm btn-info"
                            data-product-view
                            data-id="${SmartPOS.products.escape(id)}"
                            title="عرض المنتج"
                        >
                            <i
                                class="fa-solid fa-eye"
                            ></i>
                        </button>

                        <button
                            type="button"
                            class="btn btn-sm btn-danger"
                            data-product-delete
                            data-id="${SmartPOS.products.escape(id)}"
                            data-name="${SmartPOS.products.escape(name)}"
                            title="حذف المنتج"
                        >
                            <i
                                class="fa-solid fa-trash"
                            ></i>
                        </button>

                    </div>
                </td>

            </tr>
        `;
    };


/* =========================================================
   STOCK CLASS
   ========================================================= */

SmartPOS.products.getStockClass =
    function (
        stock,
        minimum
    ) {

        const quantity =
            Number(stock) || 0;

        const min =
            Number(minimum) || 0;

        if (quantity <= 0) {
            return "stock-danger";
        }

        if (
            min > 0 &&
            quantity <= min
        ) {
            return "stock-warning";
        }

        return "stock-good";
    };


/* =========================================================
   DATE FORMAT
   ========================================================= */

SmartPOS.products.formatDate =
    function (
        value
    ) {

        if (!value) {
            return "";
        }

        const date =
            new Date(value);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "";
        }

        return date.toLocaleDateString(
            "ar-EG",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );
    };


/* =========================================================
   TOTAL
   ========================================================= */

SmartPOS.products.renderTotal =
    function () {

        const element =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .total
            );

        if (!element) {
            return;
        }

        element.textContent =
            SmartPOS.products.number(
                SmartPOS.products.state
                    .totalProducts
            );
    };


/* =========================================================
   PAGINATION
   ========================================================= */

SmartPOS.products.renderPagination =
    function () {

        const container =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .pagination
            );

        if (!container) {
            return;
        }

        const current =
            SmartPOS.products.state
                .currentPage;

        const total =
            SmartPOS.products.state
                .totalPages;

        if (total <= 1) {

            container.innerHTML = "";

            return;
        }

        let html = `
            <button
                type="button"
                class="pagination-btn"
                data-page="${current - 1}"
                ${current <= 1 ? "disabled" : ""}
            >
                <i
                    class="fa-solid fa-chevron-right"
                ></i>
            </button>
        `;

        const start =
            Math.max(
                1,
                current - 2
            );

        const end =
            Math.min(
                total,
                current + 2
            );

        if (start > 1) {

            html += `
                <button
                    type="button"
                    class="pagination-btn"
                    data-page="1"
                >
                    1
                </button>
            `;

            if (start > 2) {
                html += `
                    <span class="pagination-dots">
                        ...
                    </span>
                `;
            }
        }

        for (
            let page = start;
            page <= end;
            page++
        ) {

            html += `
                <button
                    type="button"
                    class="
                        pagination-btn
                        ${page === current
                            ? "active"
                            : ""}
                    "
                    data-page="${page}"
                >
                    ${page}
                </button>
            `;
        }

        if (end < total) {

            if (end < total - 1) {
                html += `
                    <span class="pagination-dots">
                        ...
                    </span>
                `;
            }

            html += `
                <button
                    type="button"
                    class="pagination-btn"
                    data-page="${total}"
                >
                    ${total}
                </button>
            `;
        }

        html += `
            <button
                type="button"
                class="pagination-btn"
                data-page="${current + 1}"
                ${current >= total ? "disabled" : ""}
            >
                <i
                    class="fa-solid fa-chevron-left"
                ></i>
            </button>
        `;

        container.innerHTML =
            html;
    };


/* =========================================================
   CHANGE PAGE
   ========================================================= */

SmartPOS.products.changePage =
    function (
        page
    ) {

        const number =
            Number(page);

        if (
            !Number.isFinite(number)
        ) {
            return;
        }

        if (
            number < 1 ||
            number >
                SmartPOS.products.state
                    .totalPages
        ) {
            return;
        }

        SmartPOS.products.state
            .currentPage = number;

        SmartPOS.products.load({
            force: true
        });
    };


/* =========================================================
   SEARCH
   ========================================================= */

SmartPOS.products.search =
    function (
        value
    ) {

        SmartPOS.products.state.search =
            String(value || "")
                .trim();

        SmartPOS.products.state
            .currentPage = 1;

        SmartPOS.products.load({
            force: true
        });
    };


/* =========================================================
   FILTERS
   ========================================================= */

SmartPOS.products.applyFilters =
    function () {

        const category =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .category
            );

        const status =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .status
            );

        const stockStatus =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .stockStatus
            );

        SmartPOS.products.state.category =
            category?.value || "";

        SmartPOS.products.state.status =
            status?.value || "";

        SmartPOS.products.state.stockStatus =
            stockStatus?.value || "";

        SmartPOS.products.state
            .currentPage = 1;

        SmartPOS.products.load({
            force: true
        });
    };


/* =========================================================
   OPEN PRODUCT MODAL
   ========================================================= */

SmartPOS.products.openModal =
    function (
        product = null
    ) {

        const modal =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .modal
            );

        const form =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .form
            );

        if (!modal) {
            return;
        }

        SmartPOS.products.state
            .selectedProductId =
            product?.id ||
            product?.product_id ||
            null;

        if (form) {
            form.reset();
        }

        const title =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .modalTitle
            );

        if (title) {
            title.textContent =
                product
                    ? "تعديل المنتج"
                    : "إضافة منتج جديد";
        }

        if (product) {
            SmartPOS.products
                .fillForm(product);
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

SmartPOS.products.closeModal =
    function () {

        const modal =
            SmartPOS.products.$(
                SmartPOS.products.selectors
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

        SmartPOS.products.state
            .selectedProductId = null;
    };


/* =========================================================
   FILL FORM
   ========================================================= */

SmartPOS.products.fillForm =
    function (
        product
    ) {

        const form =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .form
            );

        if (!form) {
            return;
        }

        Object.entries(
            product
        ).forEach(
            ([key, value]) => {

                const field =
                    form.querySelector(
                        `[name="${key}"]`
                    );

                if (!field) {
                    return;
                }

                field.value =
                    value ??
                    "";
            }
        );

        const aliases = {

            product_name:
                product.name,

            selling_price:
                product.price ??
                product.sale_price,

            cost_price:
                product.purchase_price,

            stock:
                product.quantity ??
                product.current_stock,

            minimum_stock:
                product.min_stock,

            category_id:
                product.category_id
        };

        Object.entries(
            aliases
        ).forEach(
            ([name, value]) => {

                const field =
                    form.querySelector(
                        `[name="${name}"]`
                    );

                if (
                    field &&
                    value !== undefined
                ) {
                    field.value =
                        value ?? "";
                }
            }
        );
    };


/* =========================================================
   GET FORM DATA
   ========================================================= */

SmartPOS.products.getFormData =
    function () {

        const form =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .form
            );

        if (!form) {
            return null;
        }

        const formData =
            new FormData(form);

        const data = {};

        formData.forEach(
            (value, key) => {

                if (
                    value instanceof File
                ) {

                    if (
                        value.name
                    ) {
                        data[key] =
                            value;
                    }

                    return;
                }

                data[key] =
                    value;
            }
        );

        return data;
    };


/* =========================================================
   SAVE PRODUCT
   ========================================================= */

SmartPOS.products.save =
    async function () {

        const form =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .form
            );

        if (!form) {
            return;
        }

        if (
            !form.checkValidity()
        ) {

            form.reportValidity();

            return;
        }

        const data =
            SmartPOS.products
                .getFormData();

        if (!data) {
            return;
        }

        const productId =
            SmartPOS.products.state
                .selectedProductId;

        const endpoint =
            productId
                ? SmartPOS.products
                    .state
                    .endpoints
                    .update
                : SmartPOS.products
                    .state
                    .endpoints
                    .create;

        if (!endpoint) {

            SmartPOS.products.showError(
                "رابط حفظ المنتج غير موجود."
            );

            return;
        }

        try {

            SmartPOS.products.setFormLoading(
                true
            );

            const url =
                productId
                    ? endpoint.replace(
                        "{id}",
                        encodeURIComponent(
                            productId
                        )
                    )
                    : endpoint;

            const response =
                await SmartPOS.products.request(
                    url,
                    {
                        method:
                            productId
                                ? "PUT"
                                : "POST",

                        body:
                            JSON.stringify(
                                data
                            )
                    }
                );

            SmartPOS.products.closeModal();

            await SmartPOS.products.load({
                force: true
            });

            SmartPOS.products.notify(
                response.message ||
                (
                    productId
                        ? "تم تعديل المنتج بنجاح."
                        : "تمت إضافة المنتج بنجاح."
                ),
                "success"
            );

        } catch (error) {

            console.error(
                "Product save error:",
                error
            );

            SmartPOS.products.showError(
                error.message ||
                "تعذر حفظ المنتج."
            );

        } finally {

            SmartPOS.products.setFormLoading(
                false
            );
        }
    };


/* =========================================================
   DELETE PRODUCT
   ========================================================= */

SmartPOS.products.delete =
    async function (
        productId,
        productName = ""
    ) {

        if (!productId) {
            return;
        }

        const confirmed =
            window.confirm(
                `هل أنت متأكد من حذف المنتج${
                    productName
                        ? ` "${productName}"`
                        : ""
                }؟\n\nهذه العملية قد تؤثر على سجلات النظام.`
            );

        if (!confirmed) {
            return;
        }

        const endpoint =
            SmartPOS.products.state
                .endpoints
                .delete;

        if (!endpoint) {

            SmartPOS.products.showError(
                "رابط حذف المنتج غير موجود."
            );

            return;
        }

        try {

            const url =
                endpoint.replace(
                    "{id}",
                    encodeURIComponent(
                        productId
                    )
                );

            const response =
                await SmartPOS.products.request(
                    url,
                    {
                        method: "DELETE"
                    }
                );

            await SmartPOS.products.load({
                force: true
            });

            SmartPOS.products.notify(
                response.message ||
                "تم حذف المنتج بنجاح.",
                "success"
            );

        } catch (error) {

            console.error(
                "Product delete error:",
                error
            );

            SmartPOS.products.showError(
                error.message ||
                "تعذر حذف المنتج."
            );
        }
    };


/* =========================================================
   EDIT PRODUCT
   ========================================================= */

SmartPOS.products.edit =
    async function (
        productId
    ) {

        if (!productId) {
            return;
        }

        const product =
            SmartPOS.products.state
                .products
                .find(
                    item =>
                        String(
                            item.id ??
                            item.product_id
                        ) ===
                        String(productId)
                );

        if (product) {

            SmartPOS.products
                .openModal(
                    product
                );

            return;
        }

        /*
         * إذا لم يكن المنتج موجودًا في الصفحة الحالية،
         * يتم فتح صفحة التعديل إذا كانت موجودة.
         */

        const root =
            SmartPOS.products.getRoot();

        const editUrl =
            root?.dataset.editUrl;

        if (editUrl) {

            window.location.href =
                editUrl.replace(
                    "{id}",
                    encodeURIComponent(
                        productId
                    )
                );
        }
    };


/* =========================================================
   VIEW PRODUCT
   ========================================================= */

SmartPOS.products.view =
    function (
        productId
    ) {

        if (!productId) {
            return;
        }

        const root =
            SmartPOS.products.getRoot();

        const viewUrl =
            root?.dataset.viewUrl;

        if (!viewUrl) {

            console.warn(
                "Product view URL is not configured."
            );

            return;
        }

        window.location.href =
            viewUrl.replace(
                "{id}",
                encodeURIComponent(
                    productId
                )
            );
    };


/* =========================================================
   SELECT ALL
   ========================================================= */

SmartPOS.products.toggleSelectAll =
    function (
        checked
    ) {

        const checkboxes =
            SmartPOS.products.$$(
                SmartPOS.products
                    .selectors
                    .rowCheckbox
            );

        checkboxes.forEach(
            checkbox => {
                checkbox.checked =
                    checked;
            }
        );

        SmartPOS.products
            .updateSelection();
    };


/* =========================================================
   UPDATE SELECTION
   ========================================================= */

SmartPOS.products.updateSelection =
    function () {

        const checkboxes =
            SmartPOS.products.$$(
                SmartPOS.products
                    .selectors
                    .rowCheckbox
            );

        const selected =
            checkboxes.filter(
                checkbox =>
                    checkbox.checked
            );

        const count =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .selectedCount
            );

        if (count) {
            count.textContent =
                selected.length;
        }

        const selectAll =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .selectAll
            );

        if (selectAll) {

            selectAll.checked =
                checkboxes.length > 0 &&
                selected.length ===
                    checkboxes.length;
        }
    };


/* =========================================================
   DELETE SELECTED
   ========================================================= */

SmartPOS.products.deleteSelected =
    async function () {

        const selected =
            SmartPOS.products.$$(
                SmartPOS.products
                    .selectors
                    .rowCheckbox
            )
            .filter(
                checkbox =>
                    checkbox.checked
            )
            .map(
                checkbox =>
                    checkbox.value
            );

        if (
            selected.length === 0
        ) {

            SmartPOS.products.notify(
                "حدد منتجًا واحدًا على الأقل.",
                "warning"
            );

            return;
        }

        const confirmed =
            window.confirm(
                `هل أنت متأكد من حذف ${selected.length} منتجات؟`
            );

        if (!confirmed) {
            return;
        }

        for (
            const productId of selected
        ) {

            try {

                const endpoint =
                    SmartPOS.products
                        .state
                        .endpoints
                        .delete;

                if (!endpoint) {
                    throw new Error(
                        "رابط الحذف غير موجود."
                    );
                }

                const url =
                    endpoint.replace(
                        "{id}",
                        encodeURIComponent(
                            productId
                        )
                    );

                await SmartPOS.products.request(
                    url,
                    {
                        method: "DELETE"
                    }
                );

            } catch (error) {

                console.error(
                    `Delete product ${productId} error:`,
                    error
                );
            }
        }

        await SmartPOS.products.load({
            force: true
        });

        SmartPOS.products.notify(
            "تم تنفيذ عملية الحذف.",
            "success"
        );
    };


/* =========================================================
   FORM LOADING
   ========================================================= */

SmartPOS.products.setFormLoading =
    function (
        loading
    ) {

        const form =
            SmartPOS.products.$(
                SmartPOS.products.selectors
                    .form
            );

        if (!form) {
            return;
        }

        form.classList.toggle(
            "is-loading",
            loading
        );

        const buttons =
            form.querySelectorAll(
                "button"
            );

        buttons.forEach(
            button => {
                button.disabled =
                    loading;
            }
        );
    };


/* =========================================================
   PAGE LOADING
   ========================================================= */

SmartPOS.products.setLoading =
    function (
        loading
    ) {

        const root =
            SmartPOS.products.getRoot();

        if (!root) {
            return;
        }

        root.classList.toggle(
            "products-loading",
            loading
        );

        const loadingElement =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .loading
            );

        if (loadingElement) {

            loadingElement.hidden =
                !loading;
        }
    };


/* =========================================================
   NOTIFICATION
   ========================================================= */

SmartPOS.products.notify =
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
   ERROR
   ========================================================= */

SmartPOS.products.showError =
    function (
        message
    ) {

        SmartPOS.products.notify(
            message,
            "error"
        );
    };


/* =========================================================
   EVENT DELEGATION
   ========================================================= */

SmartPOS.products.handleClick =
    function (
        event
    ) {

        const editButton =
            event.target.closest(
                "[data-product-edit]"
            );

        if (editButton) {

            SmartPOS.products.edit(
                editButton.dataset.id
            );

            return;
        }


        const viewButton =
            event.target.closest(
                "[data-product-view]"
            );

        if (viewButton) {

            SmartPOS.products.view(
                viewButton.dataset.id
            );

            return;
        }


        const deleteButton =
            event.target.closest(
                "[data-product-delete]"
            );

        if (deleteButton) {

            SmartPOS.products.delete(
                deleteButton.dataset.id,
                deleteButton.dataset.name
            );

            return;
        }


        const pageButton =
            event.target.closest(
                "[data-page]"
            );

        if (
            pageButton &&
            !pageButton.disabled
        ) {

            SmartPOS.products.changePage(
                pageButton.dataset.page
            );

            return;
        }
    };


/* =========================================================
   EVENT LISTENERS
   ========================================================= */

SmartPOS.products.bindEvents =
    function () {

        const root =
            SmartPOS.products.getRoot();

        if (!root) {
            return;
        }


        /* -------------------------
           CLICK EVENTS
        ------------------------- */

        root.addEventListener(
            "click",
            SmartPOS.products.handleClick
        );


        /* -------------------------
           SEARCH
        ------------------------- */

        const search =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .search
            );

        if (search) {

            let timer = null;

            search.addEventListener(
                "input",
                event => {

                    clearTimeout(timer);

                    timer =
                        setTimeout(
                            () => {

                                SmartPOS.products
                                    .search(
                                        event.target.value
                                    );

                            },
                            350
                        );
                }
            );
        }


        /* -------------------------
           CATEGORY
        ------------------------- */

        const category =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .category
            );

        if (category) {

            category.addEventListener(
                "change",
                SmartPOS.products
                    .applyFilters
            );
        }


        /* -------------------------
           STATUS
        ------------------------- */

        const status =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .status
            );

        if (status) {

            status.addEventListener(
                "change",
                SmartPOS.products
                    .applyFilters
            );
        }


        /* -------------------------
           STOCK STATUS
        ------------------------- */

        const stockStatus =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .stockStatus
            );

        if (stockStatus) {

            stockStatus.addEventListener(
                "change",
                SmartPOS.products
                    .applyFilters
            );
        }


        /* -------------------------
           REFRESH
        ------------------------- */

        const refresh =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .refresh
            );

        if (refresh) {

            refresh.addEventListener(
                "click",
                () => {

                    SmartPOS.products.load({
                        force: true
                    });
                }
            );
        }


        /* -------------------------
           ADD
        ------------------------- */

        const addButton =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .addButton
            );

        if (addButton) {

            addButton.addEventListener(
                "click",
                () => {

                    SmartPOS.products
                        .openModal();
                }
            );
        }


        /* -------------------------
           CLOSE MODAL
        ------------------------- */

        [
            SmartPOS.products.selectors.closeModal,
            SmartPOS.products.selectors.cancelModal
        ].forEach(
            selector => {

                const button =
                    SmartPOS.products.$(
                        selector
                    );

                if (button) {

                    button.addEventListener(
                        "click",
                        SmartPOS.products
                            .closeModal
                    );
                }
            }
        );


        /* -------------------------
           FORM
        ------------------------- */

        const form =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .form
            );

        if (form) {

            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    SmartPOS.products
                        .save();
                }
            );
        }


        /* -------------------------
           SELECT ALL
        ------------------------- */

        const selectAll =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .selectAll
            );

        if (selectAll) {

            selectAll.addEventListener(
                "change",
                event => {

                    SmartPOS.products
                        .toggleSelectAll(
                            event.target.checked
                        );
                }
            );
        }


        /* -------------------------
           INDIVIDUAL CHECKBOXES
        ------------------------- */

        root.addEventListener(
            "change",
            event => {

                if (
                    event.target.matches(
                        "[data-product-checkbox]"
                    )
                ) {

                    SmartPOS.products
                        .updateSelection();
                }
            }
        );


        /* -------------------------
           DELETE SELECTED
        ------------------------- */

        const deleteSelected =
            SmartPOS.products.$(
                SmartPOS.products
                    .selectors
                    .deleteSelected
            );

        if (deleteSelected) {

            deleteSelected.addEventListener(
                "click",
                SmartPOS.products
                    .deleteSelected
            );
        }


        /* -------------------------
           ESC CLOSE MODAL
        ------------------------- */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.key === "Escape"
                ) {

                    SmartPOS.products
                        .closeModal();
                }
            }
        );
    };


/* =========================================================
   INITIALIZATION
   ========================================================= */

SmartPOS.products.init =
    async function () {

        const root =
            SmartPOS.products.getRoot();

        if (!root) {
            return;
        }

        if (
            SmartPOS.products.state
                .initialized
        ) {
            return;
        }

        SmartPOS.products.state
            .initialized = true;

        SmartPOS.products
            .readEndpoints();

        SmartPOS.products
            .bindEvents();

        await SmartPOS.products
            .loadCategories();

        await SmartPOS.products
            .load();

        console.log(
            "SMART POS Products initialized."
        );
    };


/* =========================================================
   DOM READY
   ========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        SmartPOS.products.init
    );

} else {

    SmartPOS.products.init();
}