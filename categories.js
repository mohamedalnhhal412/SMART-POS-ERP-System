/* =========================================================
   SMART POS / ERP
   categories.js
   CATEGORY MANAGEMENT MODULE
   Version: Stable / Connected / Flask Compatible
   ========================================================= */

"use strict";

/* =========================================================
   GLOBAL NAMESPACE
   ========================================================= */

window.SmartPOS = window.SmartPOS || {};
window.SmartPOS.categories =
    window.SmartPOS.categories || {};


/* =========================================================
   MODULE
   ========================================================= */

const Categories = window.SmartPOS.categories;


/* =========================================================
   STATE
   ========================================================= */

Categories.state = {

    initialized: false,

    loading: false,

    saving: false,

    deleting: false,

    categories: [],

    currentPage: 1,

    perPage: 10,

    totalPages: 1,

    totalCategories: 0,

    search: "",

    status: "",

    selectedCategoryId: null,

    selectedIds: new Set(),

    endpoints: {

        list: "/api/categories",

        create: "/api/categories",

        update: "/api/categories/{id}",

        delete: "/api/categories/{id}",

        toggleStatus: "/api/categories/{id}/status"
    }
};


/* =========================================================
   SELECTORS
   ========================================================= */

Categories.selectors = {

    root: "[data-categories]",

    table: "[data-categories-table]",

    tbody: "[data-categories-body]",

    search: "[data-category-search]",

    status: "[data-category-status]",

    refresh: "[data-categories-refresh]",

    addButton: "[data-category-add]",

    form: "[data-category-form]",

    modal: "[data-category-modal]",

    modalTitle: "[data-category-modal-title]",

    closeModal: "[data-category-modal-close]",

    cancelModal: "[data-category-modal-cancel]",

    pagination: "[data-categories-pagination]",

    total: "[data-categories-total]",

    selectedCount: "[data-categories-selected-count]",

    selectAll: "[data-categories-select-all]",

    rowCheckbox: "[data-category-checkbox]",

    deleteSelected: "[data-categories-delete-selected]",

    loading: "[data-categories-loading]"
};


/* =========================================================
   DOM HELPERS
   ========================================================= */

Categories.$ = function (selector, parent = document) {

    if (!parent) {
        return null;
    }

    return parent.querySelector(selector);
};


Categories.$$ = function (selector, parent = document) {

    if (!parent) {
        return [];
    }

    return Array.from(
        parent.querySelectorAll(selector)
    );
};


/* =========================================================
   ROOT
   ========================================================= */

Categories.getRoot = function () {

    return Categories.$(
        Categories.selectors.root
    );
};


/* =========================================================
   ESCAPE HTML
   ========================================================= */

Categories.escape = function (value) {

    if (
        typeof SmartPOS.escapeHTML ===
        "function"
    ) {
        return SmartPOS.escapeHTML(
            value
        );
    }

    if (
        value === null ||
        value === undefined
    ) {
        return "";
    }

    const element =
        document.createElement("div");

    element.textContent =
        String(value);

    return element.innerHTML;
};


/* =========================================================
   NUMBER FORMAT
   ========================================================= */

Categories.number = function (value) {

    const number = Number(value);

    if (!Number.isFinite(number)) {
        return "0";
    }

    return number.toLocaleString(
        "ar-EG"
    );
};


/* =========================================================
   BOOLEAN
   ========================================================= */

Categories.toBoolean = function (value) {

    if (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true" ||
        value === "True" ||
        value === "TRUE" ||
        value === "active" ||
        value === "نشط"
    ) {
        return true;
    }

    return false;
};


/* =========================================================
   STATUS NORMALIZATION
   ========================================================= */

Categories.normalizeStatus = function (
    category
) {

    if (!category) {
        return "active";
    }

    if (
        typeof category.status ===
        "string"
    ) {

        const status =
            category.status
                .toLowerCase()
                .trim();

        if (
            status === "inactive" ||
            status === "disabled" ||
            status === "false" ||
            status === "0" ||
            status === "غير نشط"
        ) {
            return "inactive";
        }

        if (
            status === "active" ||
            status === "enabled" ||
            status === "true" ||
            status === "1" ||
            status === "نشط"
        ) {
            return "active";
        }
    }

    if (
        category.is_active !==
        undefined
    ) {

        return Categories.toBoolean(
            category.is_active
        )
            ? "active"
            : "inactive";
    }

    if (
        category.active !==
        undefined
    ) {

        return Categories.toBoolean(
            category.active
        )
            ? "active"
            : "inactive";
    }

    return "active";
};


/* =========================================================
   CATEGORY ID
   ========================================================= */

Categories.getId = function (
    category
) {

    if (!category) {
        return null;
    }

    return (
        category.id ??
        category.category_id ??
        category.categoryId ??
        null
    );
};


/* =========================================================
   CATEGORY NAME
   ========================================================= */

Categories.getName = function (
    category
) {

    if (!category) {
        return "";
    }

    return (
        category.name ??
        category.category_name ??
        category.categoryName ??
        ""
    );
};


/* =========================================================
   READ ENDPOINTS
   ========================================================= */

Categories.readEndpoints = function () {

    const root =
        Categories.getRoot();

    const defaults = {

        list:
            "/api/categories",

        create:
            "/api/categories",

        update:
            "/api/categories/{id}",

        delete:
            "/api/categories/{id}",

        toggleStatus:
            "/api/categories/{id}/status"
    };


    if (!root) {

        Categories.state.endpoints =
            defaults;

        return;
    }


    const list =
        root.dataset.categoriesEndpoint ||
        root.dataset.listEndpoint ||
        defaults.list;


    const create =
        root.dataset.createEndpoint ||
        defaults.create;


    const update =
        root.dataset.updateEndpoint ||
        defaults.update;


    const deleteEndpoint =
        root.dataset.deleteEndpoint ||
        defaults.delete;


    const toggleStatus =
        root.dataset.toggleStatusEndpoint ||
        defaults.toggleStatus;


    Categories.state.endpoints = {

        list,

        create,

        update,

        delete:
            deleteEndpoint,

        toggleStatus
    };
};


/* =========================================================
   BUILD URL
   ========================================================= */

Categories.buildUrl = function (
    endpoint,
    id = null
) {

    if (!endpoint) {
        return null;
    }

    let url =
        String(endpoint);


    if (id !== null && id !== undefined) {

        const encodedId =
            encodeURIComponent(
                String(id)
            );

        url =
            url.replace(
                /\{id\}/g,
                encodedId
            );
    }


    return url;
};


/* =========================================================
   CSRF TOKEN
   ========================================================= */

Categories.getCSRFToken = function () {

    const meta =
        document.querySelector(
            'meta[name="csrf-token"]'
        );

    if (meta) {
        return meta.getAttribute(
            "content"
        );
    }


    const input =
        document.querySelector(
            'input[name="csrf_token"]'
        );

    if (input) {
        return input.value;
    }


    return null;
};


/* =========================================================
   REQUEST
   ========================================================= */

Categories.request = async function (
    url,
    options = {}
) {

    if (!url) {

        throw new Error(
            "لم يتم تحديد رابط API للتصنيفات."
        );
    }


    /* -----------------------------------------------------
       USE GLOBAL SMARTPOS API IF AVAILABLE
       ----------------------------------------------------- */

    if (
        typeof SmartPOS.api ===
        "function"
    ) {

        try {

            return await SmartPOS.api(
                url,
                options
            );

        } catch (error) {

            /*
             * Do not silently hide the error.
             * If SmartPOS.api fails, rethrow it.
             */

            throw error;
        }
    }


    /* -----------------------------------------------------
       FETCH
       ----------------------------------------------------- */

    const headers = {

        "Accept":
            "application/json",

        ...(options.headers || {})
    };


    const hasBody =
        options.body !== undefined &&
        options.body !== null;


    if (hasBody) {

        headers[
            "Content-Type"
        ] =
            "application/json";
    }


    const csrfToken =
        Categories.getCSRFToken();


    if (csrfToken) {

        headers[
            "X-CSRFToken"
        ] =
            csrfToken;
    }


    const response =
        await fetch(
            url,
            {

                credentials:
                    "same-origin",

                ...options,

                headers
            }
        );


    /* -----------------------------------------------------
       RESPONSE TEXT
       ----------------------------------------------------- */

    const text =
        await response.text();


    let data = null;


    if (text) {

        try {

            data =
                JSON.parse(text);

        } catch {

            data = {
                raw: text
            };
        }
    }


    /* -----------------------------------------------------
       HTTP ERROR
       ----------------------------------------------------- */

    if (!response.ok) {

        let message =
            "حدث خطأ أثناء الاتصال بالخادم.";


        if (data) {

            message =
                data.message ||
                data.error ||
                data.detail ||
                message;
        }


        if (
            response.status ===
            401
        ) {

            message =
                "انتهت جلسة تسجيل الدخول. يرجى تسجيل الدخول مرة أخرى.";
        }


        if (
            response.status ===
            403
        ) {

            message =
                data?.message ||
                "ليس لديك صلاحية لتنفيذ هذه العملية.";
        }


        if (
            response.status ===
            404
        ) {

            message =
                "رابط التصنيفات غير موجود في الخادم.";
        }


        if (
            response.status >=
            500
        ) {

            message =
                "حدث خطأ داخلي في الخادم. تحقق من ملف Python وسجل الأخطاء.";
        }


        const error =
            new Error(
                message
            );


        error.status =
            response.status;


        error.data =
            data;


        throw error;
    }


    return data || {};
};


/* =========================================================
   EXTRACT API DATA
   ========================================================= */

Categories.extractData = function (
    response
) {

    if (!response) {
        return {};
    }


    /*
     * Flask may return:
     *
     * {
     *   "data": {
     *      "categories": [...]
     *   }
     * }
     *
     * OR:
     *
     * {
     *   "categories": [...]
     * }
     *
     * OR:
     *
     * [...]
     */


    if (Array.isArray(response)) {

        return {
            categories:
                response
        };
    }


    if (
        response.data &&
        typeof response.data ===
        "object"
    ) {

        if (
            Array.isArray(
                response.data
            )
        ) {

            return {
                categories:
                    response.data
            };
        }


        return {
            ...response.data,

            message:
                response.message ||
                response.data.message
        };
    }


    return response;
};


/* =========================================================
   EXTRACT CATEGORY LIST
   ========================================================= */

Categories.extractCategories =
    function (
        response
    ) {

        const data =
            Categories.extractData(
                response
            );


        const possibleLists = [

            data.categories,

            data.items,

            data.results,

            data.rows,

            data.data?.categories,

            data.data?.items,

            data.data?.results,

            data.categories_list
        ];


        for (
            const list of
            possibleLists
        ) {

            if (
                Array.isArray(list)
            ) {

                return list;
            }
        }


        return [];
    };


/* =========================================================
   LOAD CATEGORIES
   ========================================================= */

Categories.load = async function (
    options = {}
) {

    if (
        Categories.state.loading &&
        !options.force
    ) {
        return;
    }


    const endpoint =
        Categories.state
            .endpoints
            .list ||
        "/api/categories";


    Categories.state.loading =
        true;


    Categories.setLoading(
        true
    );


    try {

        const params =
            new URLSearchParams();


        params.set(
            "page",
            String(
                Categories.state.currentPage
            )
        );


        params.set(
            "per_page",
            String(
                Categories.state.perPage
            )
        );


        if (
            Categories.state.search
        ) {

            params.set(
                "search",
                Categories.state.search
            );
        }


        if (
            Categories.state.status
        ) {

            params.set(
                "status",
                Categories.state.status
            );
        }


        const separator =
            endpoint.includes("?")
                ? "&"
                : "?";


        const url =
            `${endpoint}${separator}${params.toString()}`;


        console.log(
            "SMART POS Categories GET:",
            url
        );


        const response =
            await Categories.request(
                url,
                {

                    method:
                        "GET",

                    cache:
                        "no-store"
                }
            );


        const data =
            Categories.extractData(
                response
            );


        const categories =
            Categories.extractCategories(
                response
            );


        Categories.state.categories =
            categories;


        /*
         * TOTAL
         */

        let total =
            data.total ??
            data.total_categories ??
            data.totalCategories ??
            data.count;


        if (
            total === undefined ||
            total === null
        ) {

            total =
                categories.length;
        }


        Categories.state.totalCategories =
            Number(total) || 0;


        /*
         * PAGES
         */

        let pages =
            data.pages ??
            data.total_pages ??
            data.totalPages;


        if (
            pages === undefined ||
            pages === null
        ) {

            pages =
                Math.max(
                    1,
                    Math.ceil(
                        Categories.state
                            .totalCategories /
                        Categories.state
                            .perPage
                    )
                );
        }


        Categories.state.totalPages =
            Math.max(
                1,
                Number(pages) || 1
            );


        /*
         * Protect current page
         */

        if (
            Categories.state.currentPage >
            Categories.state.totalPages
        ) {

            Categories.state.currentPage =
                Categories.state.totalPages;
        }


        Categories.render();


        return categories;


    } catch (error) {

        console.error(
            "SMART POS Categories loading error:",
            error
        );


        Categories.state.categories =
            [];


        Categories.render();


        Categories.showError(
            error.message ||
            "تعذر تحميل التصنيفات."
        );


        return [];


    } finally {

        Categories.state.loading =
            false;


        Categories.setLoading(
            false
        );
    }
};


/* =========================================================
   RENDER
   ========================================================= */

Categories.render = function () {

    Categories.renderTable();

    Categories.renderPagination();

    Categories.renderTotal();

    Categories.updateSelection();
};


/* =========================================================
   RENDER TABLE
   ========================================================= */

Categories.renderTable = function () {

    const tbody =
        Categories.$(
            Categories.selectors.tbody
        );


    if (!tbody) {
        return;
    }


    const categories =
        Categories.state.categories;


    if (
        !Array.isArray(categories) ||
        categories.length === 0
    ) {

        tbody.innerHTML = `

            <tr>

                <td
                    colspan="10"
                    class="categories-empty-cell"
                >

                    <div
                        class="categories-empty"
                    >

                        <i
                            class="fa-solid fa-folder-open"
                        ></i>

                        <strong>
                            لا توجد تصنيفات
                        </strong>

                        <span>
                            لم يتم العثور على أي تصنيف مطابق للبحث.
                        </span>

                    </div>

                </td>

            </tr>

        `;

        return;
    }


    tbody.innerHTML =
        categories
            .map(
                (
                    category,
                    index
                ) =>
                    Categories.renderRow(
                        category,
                        index
                    )
            )
            .join("");
};


/* =========================================================
   RENDER ROW
   ========================================================= */

Categories.renderRow = function (
    category,
    index
) {

    const id =
        Categories.getId(
            category
        );


    const name =
        Categories.getName(
            category
        ) ||
        "تصنيف بدون اسم";


    const description =
        category.description ??
        category.details ??
        category.note ??
        "-";


    const productCount =
        category.product_count ??
        category.products_count ??
        category.productsCount ??
        category.products ??
        0;


    const status =
        Categories.normalizeStatus(
            category
        );


    const createdAt =
        category.created_at ??
        category.createdAt ??
        null;


    const updatedAt =
        category.updated_at ??
        category.updatedAt ??
        null;


    const icon =
        category.icon ||
        "fa-folder";


    const statusClass =
        status === "active"
            ? "active"
            : "inactive";


    const selected =
        Categories.state
            .selectedIds
            .has(
                String(id)
            );


    return `

        <tr
            data-category-row
            data-category-id="${Categories.escape(id)}"
        >

            <td>

                <input
                    type="checkbox"
                    class="category-checkbox"
                    data-category-checkbox
                    value="${Categories.escape(id)}"
                    ${selected ? "checked" : ""}
                    aria-label="اختيار التصنيف"
                >

            </td>


            <td>

                <div class="category-table-info">

                    <div class="category-icon">

                        <i
                            class="fa-solid ${Categories.escape(icon)}"
                        ></i>

                    </div>


                    <div>

                        <strong>
                            ${Categories.escape(name)}
                        </strong>

                        <small>
                            ID:
                            ${Categories.escape(id)}
                        </small>

                    </div>

                </div>

            </td>


            <td>

                <span
                    class="category-description"
                    title="${Categories.escape(description)}"
                >

                    ${Categories.escape(
                        description
                    )}

                </span>

            </td>


            <td>

                <span
                    class="category-products-count"
                >

                    ${Categories.number(
                        productCount
                    )}

                </span>

            </td>


            <td>

                <span
                    class="category-status ${statusClass}"
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
                    createdAt
                        ? Categories.formatDate(
                            createdAt
                        )
                        : "-"
                }

            </td>


            <td>

                ${
                    updatedAt
                        ? Categories.formatDate(
                            updatedAt
                        )
                        : "-"
                }

            </td>


            <td>

                <div class="category-actions">


                    <button
                        type="button"
                        class="btn btn-sm btn-primary"
                        data-category-edit
                        data-id="${Categories.escape(id)}"
                        title="تعديل التصنيف"
                    >

                        <i
                            class="fa-solid fa-pen"
                        ></i>

                    </button>


                    <button
                        type="button"
                        class="btn btn-sm btn-warning"
                        data-category-toggle
                        data-id="${Categories.escape(id)}"
                        data-status="${Categories.escape(status)}"
                        title="${
                            status === "active"
                                ? "تعطيل التصنيف"
                                : "تفعيل التصنيف"
                        }"
                    >

                        <i
                            class="fa-solid ${
                                status === "active"
                                    ? "fa-toggle-on"
                                    : "fa-toggle-off"
                            }"
                        ></i>

                    </button>


                    <button
                        type="button"
                        class="btn btn-sm btn-danger"
                        data-category-delete
                        data-id="${Categories.escape(id)}"
                        data-name="${Categories.escape(name)}"
                        title="حذف التصنيف"
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
   DATE FORMAT
   ========================================================= */

Categories.formatDate = function (
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

        return Categories.escape(
            String(value)
        );
    }


    return date.toLocaleDateString(
        "ar-EG",
        {

            year:
                "numeric",

            month:
                "short",

            day:
                "numeric"
        }
    );
};


/* =========================================================
   TOTAL
   ========================================================= */

Categories.renderTotal = function () {

    const element =
        Categories.$(
            Categories.selectors.total
        );


    if (!element) {
        return;
    }


    element.textContent =
        Categories.number(
            Categories.state
                .totalCategories
        );
};


/* =========================================================
   SEARCH
   ========================================================= */

Categories.search = function (
    value
) {

    Categories.state.search =
        String(
            value ?? ""
        ).trim();


    Categories.state.currentPage =
        1;


    Categories.load({
        force: true
    });
};


/* =========================================================
   FILTER
   ========================================================= */

Categories.applyFilters = function () {

    const status =
        Categories.$(
            Categories.selectors.status
        );


    Categories.state.status =
        status
            ? status.value
            : "";


    Categories.state.currentPage =
        1;


    Categories.load({
        force: true
    });
};


/* =========================================================
   PAGINATION
   ========================================================= */

Categories.renderPagination =
    function () {

        const container =
            Categories.$(
                Categories.selectors.pagination
            );


        if (!container) {
            return;
        }


        const current =
            Number(
                Categories.state
                    .currentPage
            );


        const total =
            Number(
                Categories.state
                    .totalPages
            );


        if (
            total <= 1
        ) {

            container.innerHTML =
                "";

            return;
        }


        let html = `

            <button
                type="button"
                class="pagination-btn"
                data-page="${current - 1}"
                ${current <= 1 ? "disabled" : ""}
                aria-label="الصفحة السابقة"
            >

                <i
                    class="fa-solid fa-chevron-right"
                ></i>

            </button>

        `;


        let start =
            Math.max(
                1,
                current - 2
            );


        let end =
            Math.min(
                total,
                current + 2
            );


        if (
            current <= 2
        ) {

            start = 1;

            end =
                Math.min(
                    total,
                    5
                );
        }


        if (
            current >=
            total - 1
        ) {

            start =
                Math.max(
                    1,
                    total - 4
                );

            end =
                total;
        }


        if (
            start > 1
        ) {

            html += `

                <button
                    type="button"
                    class="pagination-btn"
                    data-page="1"
                >
                    1
                </button>

            `;


            if (
                start > 2
            ) {

                html += `

                    <span
                        class="pagination-dots"
                    >
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
                    class="pagination-btn ${
                        page === current
                            ? "active"
                            : ""
                    }"
                    data-page="${page}"
                    ${
                        page === current
                            ? 'aria-current="page"'
                            : ""
                    }
                >

                    ${page}

                </button>

            `;
        }


        if (
            end < total
        ) {

            if (
                end <
                total - 1
            ) {

                html += `

                    <span
                        class="pagination-dots"
                    >
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
                aria-label="الصفحة التالية"
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

Categories.changePage =
    function (
        page
    ) {

        const number =
            Number(page);


        if (
            !Number.isInteger(
                number
            )
        ) {

            return;
        }


        if (
            number < 1 ||
            number >
                Categories.state
                    .totalPages
        ) {

            return;
        }


        Categories.state.currentPage =
            number;


        Categories.load({
            force: true
        });
    };


/* =========================================================
   OPEN MODAL
   ========================================================= */

Categories.openModal =
    function (
        category = null
    ) {

        const modal =
            Categories.$(
                Categories.selectors.modal
            );


        const form =
            Categories.$(
                Categories.selectors.form
            );


        if (!modal) {
            return;
        }


        Categories.state
            .selectedCategoryId =
                category
                    ? Categories.getId(
                        category
                    )
                    : null;


        if (form) {

            form.reset();
        }


        const title =
            Categories.$(
                Categories.selectors
                    .modalTitle
            );


        if (title) {

            title.textContent =
                category
                    ? "تعديل التصنيف"
                    : "إضافة تصنيف جديد";
        }


        if (category) {

            Categories.fillForm(
                category
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


        setTimeout(
            () => {

                const firstInput =
                    form?.querySelector(
                        "input:not([type='hidden']), textarea, select"
                    );


                if (firstInput) {

                    firstInput.focus();
                }

            },
            50
        );
    };


/* =========================================================
   CLOSE MODAL
   ========================================================= */

Categories.closeModal =
    function () {

        const modal =
            Categories.$(
                Categories.selectors.modal
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


        Categories.state
            .selectedCategoryId =
            null;


        Categories.state.saving =
            false;


        Categories.setFormLoading(
            false
        );
    };


/* =========================================================
   FILL FORM
   ========================================================= */

Categories.fillForm =
    function (
        category
    ) {

        const form =
            Categories.$(
                Categories.selectors.form
            );


        if (
            !form ||
            !category
        ) {

            return;
        }


        /*
         * Standard aliases
         */

        const values = {

            id:
                Categories.getId(
                    category
                ),

            category_id:
                Categories.getId(
                    category
                ),

            name:
                Categories.getName(
                    category
                ),

            category_name:
                Categories.getName(
                    category
                ),

            description:
                category.description ??
                "",

            icon:
                category.icon ??
                "fa-folder",

            status:
                Categories.normalizeStatus(
                    category
                ),

            is_active:
                Categories.normalizeStatus(
                    category
                ) === "active"
        };


        Object.entries(
            values
        ).forEach(
            ([name, value]) => {

                const field =
                    form.querySelector(
                        `[name="${name}"]`
                    );


                if (!field) {
                    return;
                }


                if (
                    field.type ===
                    "checkbox"
                ) {

                    field.checked =
                        Categories.toBoolean(
                            value
                        );

                } else {

                    field.value =
                        value ??
                        "";
                }
            }
        );


        /*
         * Generic API fields
         */

        Object.entries(
            category
        ).forEach(
            ([key, value]) => {

                const field =
                    form.querySelector(
                        `[name="${key}"]`
                    );


                if (!field) {
                    return;
                }


                if (
                    field.type ===
                    "checkbox"
                ) {

                    field.checked =
                        Categories.toBoolean(
                            value
                        );

                } else if (
                    value !== null &&
                    value !== undefined
                ) {

                    field.value =
                        value;
                }
            }
        );
    };


/* =========================================================
   GET FORM DATA
   ========================================================= */

Categories.getFormData =
    function () {

        const form =
            Categories.$(
                Categories.selectors.form
            );


        if (!form) {
            return null;
        }


        const formData =
            new FormData(
                form
            );


        const data = {};


        formData.forEach(
            (
                value,
                key
            ) => {

                data[key] =
                    value;
            }
        );


        /*
         * Always include checkboxes
         */

        form.querySelectorAll(
            'input[type="checkbox"]'
        ).forEach(
            checkbox => {

                if (
                    checkbox.name
                ) {

                    data[
                        checkbox.name
                    ] =
                        checkbox.checked;
                }
            }
        );


        /*
         * Convert empty strings consistently
         */

        Object.keys(
            data
        ).forEach(
            key => {

                if (
                    typeof data[key] ===
                    "string"
                ) {

                    data[key] =
                        data[key].trim();
                }
            }
        );


        return data;
    };


/* =========================================================
   NORMALIZE FORM DATA
   ========================================================= */

Categories.normalizeFormData =
    function (
        data
    ) {

        if (!data) {
            return null;
        }


        const normalized = {
            ...data
        };


        /*
         * If HTML uses category_name,
         * backend can still receive name.
         */

        if (
            !normalized.name &&
            normalized.category_name
        ) {

            normalized.name =
                normalized.category_name;
        }


        /*
         * If HTML uses name,
         * also provide category_name.
         */

        if (
            normalized.name &&
            !normalized.category_name
        ) {

            normalized.category_name =
                normalized.name;
        }


        /*
         * Status compatibility
         */

        if (
            normalized.is_active !==
            undefined
        ) {

            normalized.status =
                normalized.is_active
                    ? "active"
                    : "inactive";
        }


        if (
            normalized.status ===
            undefined
        ) {

            normalized.status =
                "active";
        }


        if (
            normalized.is_active ===
            undefined
        ) {

            normalized.is_active =
                normalized.status ===
                "active";
        }


        return normalized;
    };


/* =========================================================
   SAVE
   ========================================================= */

Categories.save =
    async function () {

        if (
            Categories.state.saving
        ) {

            return;
        }


        const form =
            Categories.$(
                Categories.selectors.form
            );


        if (!form) {

            Categories.showError(
                "لم يتم العثور على نموذج التصنيف."
            );

            return;
        }


        if (
            !form.checkValidity()
        ) {

            form.reportValidity();

            return;
        }


        let data =
            Categories.getFormData();


        if (!data) {
            return;
        }


        data =
            Categories.normalizeFormData(
                data
            );


        const categoryId =
            Categories.state
                .selectedCategoryId;


        const endpoint =
            categoryId
                ? Categories.state
                    .endpoints
                    .update
                : Categories.state
                    .endpoints
                    .create;


        if (!endpoint) {

            Categories.showError(
                "رابط حفظ التصنيف غير موجود."
            );

            return;
        }


        Categories.state.saving =
            true;


        Categories.setFormLoading(
            true
        );


        try {

            const url =
                Categories.buildUrl(
                    endpoint,
                    categoryId
                );


            console.log(
                "SMART POS Categories SAVE:",
                {
                    method:
                        categoryId
                            ? "PUT"
                            : "POST",

                    url,

                    data
                }
            );


            const response =
                await Categories.request(
                    url,
                    {

                        method:
                            categoryId
                                ? "PUT"
                                : "POST",

                        body:
                            JSON.stringify(
                                data
                            )
                    }
                );


            const message =
                response?.message ||
                response?.data?.message ||
                (
                    categoryId
                        ? "تم تعديل التصنيف بنجاح."
                        : "تمت إضافة التصنيف بنجاح."
                );


            Categories.closeModal();


            Categories.state.currentPage =
                1;


            await Categories.load({
                force: true
            });


            Categories.notify(
                message,
                "success"
            );


        } catch (error) {

            console.error(
                "SMART POS Category save error:",
                error
            );


            Categories.showError(
                error.message ||
                "تعذر حفظ التصنيف."
            );


        } finally {

            Categories.state.saving =
                false;


            Categories.setFormLoading(
                false
            );
        }
    };


/* =========================================================
   EDIT
   ========================================================= */

Categories.edit =
    function (
        categoryId
    ) {

        if (
            categoryId ===
            null ||
            categoryId ===
            undefined ||
            categoryId === ""
        ) {

            return;
        }


        const category =
            Categories.state
                .categories
                .find(
                    item =>
                        String(
                            Categories.getId(
                                item
                            )
                        ) ===
                        String(
                            categoryId
                        )
                );


        if (category) {

            Categories.openModal(
                category
            );

            return;
        }


        /*
         * If category isn't on current page,
         * try optional endpoint.
         */

        const root =
            Categories.getRoot();


        const editUrl =
            root?.dataset.editUrl;


        if (editUrl) {

            window.location.href =
                Categories.buildUrl(
                    editUrl,
                    categoryId
                );

            return;
        }


        Categories.showError(
            "لم يتم العثور على بيانات التصنيف."
        );
    };


/* =========================================================
   DELETE
   ========================================================= */

Categories.delete =
    async function (
        categoryId,
        categoryName = ""
    ) {

        if (
            categoryId ===
            null ||
            categoryId ===
            undefined ||
            categoryId === ""
        ) {

            return;
        }


        if (
            Categories.state.deleting
        ) {

            return;
        }


        const confirmed =
            window.confirm(
                `هل أنت متأكد من حذف التصنيف${
                    categoryName
                        ? ` "${categoryName}"`
                        : ""
                }؟\n\nتأكد من عدم وجود منتجات مرتبطة به.`
            );


        if (!confirmed) {
            return;
        }


        const endpoint =
            Categories.state
                .endpoints
                .delete;


        if (!endpoint) {

            Categories.showError(
                "رابط حذف التصنيف غير موجود."
            );

            return;
        }


        Categories.state.deleting =
            true;


        try {

            const url =
                Categories.buildUrl(
                    endpoint,
                    categoryId
                );


            console.log(
                "SMART POS Categories DELETE:",
                url
            );


            const response =
                await Categories.request(
                    url,
                    {

                        method:
                            "DELETE"
                    }
                );


            /*
             * Remove from selected IDs
             */

            Categories.state
                .selectedIds
                .delete(
                    String(
                        categoryId
                    )
                );


            await Categories.load({
                force: true
            });


            Categories.notify(
                response?.message ||
                "تم حذف التصنيف بنجاح.",
                "success"
            );


        } catch (error) {

            console.error(
                "SMART POS Category delete error:",
                error
            );


            Categories.showError(
                error.message ||
                "تعذر حذف التصنيف."
            );


        } finally {

            Categories.state.deleting =
                false;
        }
    };


/* =========================================================
   TOGGLE STATUS
   ========================================================= */

Categories.toggleStatus =
    async function (
        categoryId,
        currentStatus
    ) {

        if (
            categoryId ===
            null ||
            categoryId ===
            undefined ||
            categoryId === ""
        ) {

            return;
        }


        const endpoint =
            Categories.state
                .endpoints
                .toggleStatus ||
            "/api/categories/{id}/status";


        const normalizedStatus =
            String(
                currentStatus ||
                "active"
            ).toLowerCase();


        const newStatus =
            normalizedStatus ===
            "active"
                ? "inactive"
                : "active";


        try {

            const url =
                Categories.buildUrl(
                    endpoint,
                    categoryId
                );


            console.log(
                "SMART POS Categories STATUS:",
                {
                    url,

                    status:
                        newStatus
                }
            );


            const response =
                await Categories.request(
                    url,
                    {

                        method:
                            "PATCH",

                        body:
                            JSON.stringify({

                                status:
                                    newStatus,

                                is_active:
                                    newStatus ===
                                    "active"
                            })
                    }
                );


            await Categories.load({
                force: true
            });


            Categories.notify(
                response?.message ||
                (
                    newStatus ===
                    "active"
                        ? "تم تفعيل التصنيف."
                        : "تم تعطيل التصنيف."
                ),
                "success"
            );


        } catch (error) {

            console.error(
                "SMART POS Category status error:",
                error
            );


            Categories.showError(
                error.message ||
                "تعذر تغيير حالة التصنيف."
            );
        }
    };


/* =========================================================
   SELECT ALL
   ========================================================= */

Categories.toggleSelectAll =
    function (
        checked
    ) {

        const checkboxes =
            Categories.$$(
                Categories.selectors
                    .rowCheckbox
            );


        checkboxes.forEach(
            checkbox => {

                checkbox.checked =
                    Boolean(
                        checked
                    );


                const id =
                    checkbox.value;


                if (checked) {

                    Categories.state
                        .selectedIds
                        .add(
                            String(id)
                        );

                } else {

                    Categories.state
                        .selectedIds
                        .delete(
                            String(id)
                        );
                }
            }
        );


        Categories.updateSelection();
    };


/* =========================================================
   UPDATE SELECTION
   ========================================================= */

Categories.updateSelection =
    function () {

        const checkboxes =
            Categories.$$(
                Categories.selectors
                    .rowCheckbox
            );


        const selected =
            checkboxes.filter(
                checkbox =>
                    checkbox.checked
            );


        /*
         * Sync Set
         */

        selected.forEach(
            checkbox => {

                Categories.state
                    .selectedIds
                    .add(
                        String(
                            checkbox.value
                        )
                    );
            }
        );


        checkboxes
            .filter(
                checkbox =>
                    !checkbox.checked
            )
            .forEach(
                checkbox => {

                    Categories.state
                        .selectedIds
                        .delete(
                            String(
                                checkbox.value
                            )
                        );
                }
            );


        const count =
            Categories.$(
                Categories.selectors
                    .selectedCount
            );


        if (count) {

            count.textContent =
                Categories.number(
                    Categories.state
                        .selectedIds
                        .size
                );
        }


        const selectAll =
            Categories.$(
                Categories.selectors
                    .selectAll
            );


        if (selectAll) {

            selectAll.checked =
                checkboxes.length > 0 &&
                selected.length ===
                    checkboxes.length;


            selectAll.indeterminate =
                selected.length > 0 &&
                selected.length <
                    checkboxes.length;
        }


        const deleteSelected =
            Categories.$(
                Categories.selectors
                    .deleteSelected
            );


        if (deleteSelected) {

            deleteSelected.disabled =
                Categories.state
                    .selectedIds
                    .size === 0;
        }
    };


/* =========================================================
   DELETE SELECTED
   ========================================================= */

Categories.deleteSelected =
    async function () {

        const selected =
            Array.from(
                Categories.state
                    .selectedIds
            );


        if (
            selected.length === 0
        ) {

            Categories.notify(
                "حدد تصنيفًا واحدًا على الأقل.",
                "warning"
            );

            return;
        }


        const confirmed =
            window.confirm(
                `هل أنت متأكد من حذف ${selected.length} تصنيف؟`
            );


        if (!confirmed) {
            return;
        }


        const endpoint =
            Categories.state
                .endpoints
                .delete;


        if (!endpoint) {

            Categories.showError(
                "رابط الحذف غير موجود."
            );

            return;
        }


        let successCount = 0;

        let failedCount = 0;


        for (
            const categoryId of selected
        ) {

            try {

                const url =
                    Categories.buildUrl(
                        endpoint,
                        categoryId
                    );


                await Categories.request(
                    url,
                    {

                        method:
                            "DELETE"
                    }
                );


                successCount++;


            } catch (error) {

                failedCount++;


                console.error(
                    `Delete category ${categoryId} error:`,
                    error
                );
            }
        }


        Categories.state
            .selectedIds
            .clear();


        await Categories.load({
            force: true
        });


        if (
            failedCount === 0
        ) {

            Categories.notify(
                `تم حذف ${successCount} تصنيف بنجاح.`,
                "success"
            );

        } else {

            Categories.notify(
                `تم حذف ${successCount} تصنيف، وفشل حذف ${failedCount}.`,
                "warning"
            );
        }
    };


/* =========================================================
   FORM LOADING
   ========================================================= */

Categories.setFormLoading =
    function (
        loading
    ) {

        const form =
            Categories.$(
                Categories.selectors.form
            );


        if (!form) {
            return;
        }


        form.classList.toggle(
            "is-loading",
            Boolean(loading)
        );


        form.setAttribute(
            "aria-busy",
            loading
                ? "true"
                : "false"
        );


        form.querySelectorAll(
            "button, input, textarea, select"
        ).forEach(
            element => {

                /*
                 * Don't disable hidden fields.
                 */

                if (
                    element.type ===
                    "hidden"
                ) {
                    return;
                }


                element.disabled =
                    Boolean(
                        loading
                    );
            }
        );


        const submit =
            form.querySelector(
                'button[type="submit"]'
            );


        if (submit) {

            if (
                loading
            ) {

                if (
                    !submit.dataset
                        .originalText
                ) {

                    submit.dataset
                        .originalText =
                        submit.innerHTML;
                }


                submit.innerHTML = `

                    <i
                        class="fa-solid fa-spinner fa-spin"
                    ></i>

                    جاري الحفظ...

                `;

            } else {

                if (
                    submit.dataset
                        .originalText
                ) {

                    submit.innerHTML =
                        submit.dataset
                            .originalText;
                }
            }
        }
    };


/* =========================================================
   PAGE LOADING
   ========================================================= */

Categories.setLoading =
    function (
        loading
    ) {

        const root =
            Categories.getRoot();


        if (!root) {
            return;
        }


        root.classList.toggle(
            "categories-loading",
            Boolean(
                loading
            )
        );


        const element =
            Categories.$(
                Categories.selectors
                    .loading
            );


        if (element) {

            element.hidden =
                !loading;
        }


        const refresh =
            Categories.$(
                Categories.selectors
                    .refresh
            );


        if (refresh) {

            refresh.disabled =
                Boolean(
                    loading
                );
        }
    };


/* =========================================================
   NOTIFICATION
   ========================================================= */

Categories.notify =
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


        /*
         * Fallback notification
         */

        let container =
            document.querySelector(
                "[data-smartpos-notifications]"
            );


        if (!container) {

            container =
                document.createElement(
                    "div"
                );


            container.setAttribute(
                "data-smartpos-notifications",
                ""
            );


            container.style.position =
                "fixed";


            container.style.top =
                "20px";


            container.style.right =
                "20px";


            container.style.zIndex =
                "99999";


            container.style.display =
                "flex";


            container.style.flexDirection =
                "column";


            container.style.gap =
                "10px";


            document.body.appendChild(
                container
            );
        }


        const notification =
            document.createElement(
                "div"
            );


        notification.className =
            `smartpos-notification smartpos-notification-${type}`;


        notification.textContent =
            message;


        notification.style.padding =
            "12px 18px";


        notification.style.borderRadius =
            "10px";


        notification.style.background =
            "#ffffff";


        notification.style.boxShadow =
            "0 8px 30px rgba(0,0,0,.12)";


        notification.style.fontFamily =
            "inherit";


        notification.style.direction =
            "rtl";


        container.appendChild(
            notification
        );


        setTimeout(
            () => {

                notification.remove();

            },
            3500
        );
    };


/* =========================================================
   ERROR
   ========================================================= */

Categories.showError =
    function (
        message
    ) {

        Categories.notify(
            message ||
            "حدث خطأ غير متوقع.",
            "error"
        );
    };


/* =========================================================
   HANDLE CLICK
   ========================================================= */

Categories.handleClick =
    function (
        event
    ) {

        const editButton =
            event.target.closest(
                "[data-category-edit]"
            );


        if (
            editButton
        ) {

            Categories.edit(
                editButton.dataset.id
            );

            return;
        }


        const deleteButton =
            event.target.closest(
                "[data-category-delete]"
            );


        if (
            deleteButton
        ) {

            Categories.delete(
                deleteButton.dataset.id,
                deleteButton.dataset.name
            );

            return;
        }


        const toggleButton =
            event.target.closest(
                "[data-category-toggle]"
            );


        if (
            toggleButton
        ) {

            Categories.toggleStatus(
                toggleButton.dataset.id,
                toggleButton.dataset.status
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

            Categories.changePage(
                pageButton.dataset.page
            );

            return;
        }
    };


/* =========================================================
   BIND EVENTS
   ========================================================= */

Categories.bindEvents =
    function () {

        const root =
            Categories.getRoot();


        if (!root) {
            return;
        }


        /*
         * Prevent duplicate event binding
         */

        if (
            root.dataset.categoriesBound ===
            "true"
        ) {

            return;
        }


        root.dataset.categoriesBound =
            "true";


        /* -------------------------------------------------
           CLICK
           ------------------------------------------------- */

        root.addEventListener(
            "click",
            Categories.handleClick
        );


        /* -------------------------------------------------
           SEARCH
           ------------------------------------------------- */

        const search =
            Categories.$(
                Categories.selectors
                    .search
            );


        if (search) {

            let timer =
                null;


            search.addEventListener(
                "input",
                event => {

                    clearTimeout(
                        timer
                    );


                    timer =
                        setTimeout(
                            () => {

                                Categories
                                    .search(
                                        event.target
                                            .value
                                    );

                            },
                            350
                        );
                }
            );
        }


        /* -------------------------------------------------
           STATUS
           ------------------------------------------------- */

        const status =
            Categories.$(
                Categories.selectors
                    .status
            );


        if (status) {

            status.addEventListener(
                "change",
                () => {

                    Categories
                        .applyFilters();
                }
            );
        }


        /* -------------------------------------------------
           REFRESH
           ------------------------------------------------- */

        const refresh =
            Categories.$(
                Categories.selectors
                    .refresh
            );


        if (refresh) {

            refresh.addEventListener(
                "click",
                () => {

                    Categories.load({
                        force: true
                    });

                }
            );
        }


        /* -------------------------------------------------
           ADD
           ------------------------------------------------- */

        const addButton =
            Categories.$(
                Categories.selectors
                    .addButton
            );


        if (addButton) {

            addButton.addEventListener(
                "click",
                () => {

                    Categories.openModal();

                }
            );
        }


        /* -------------------------------------------------
           CLOSE MODAL
           ------------------------------------------------- */

        const closeButton =
            Categories.$(
                Categories.selectors
                    .closeModal
            );


        if (closeButton) {

            closeButton.addEventListener(
                "click",
                () => {

                    Categories.closeModal();

                }
            );
        }


        const cancelButton =
            Categories.$(
                Categories.selectors
                    .cancelModal
            );


        if (cancelButton) {

            cancelButton.addEventListener(
                "click",
                () => {

                    Categories.closeModal();

                }
            );
        }


        /* -------------------------------------------------
           MODAL BACKDROP
           ------------------------------------------------- */

        const modal =
            Categories.$(
                Categories.selectors.modal
            );


        if (modal) {

            modal.addEventListener(
                "click",
                event => {

                    if (
                        event.target ===
                        modal
                    ) {

                        Categories
                            .closeModal();
                    }
                }
            );
        }


        /* -------------------------------------------------
           FORM
           ------------------------------------------------- */

        const form =
            Categories.$(
                Categories.selectors.form
            );


        if (form) {

            form.addEventListener(
                "submit",
                event => {

                    event.preventDefault();

                    Categories.save();
                }
            );
        }


        /* -------------------------------------------------
           SELECT ALL
           ------------------------------------------------- */

        const selectAll =
            Categories.$(
                Categories.selectors
                    .selectAll
            );


        if (selectAll) {

            selectAll.addEventListener(
                "change",
                event => {

                    Categories
                        .toggleSelectAll(
                            event.target.checked
                        );
                }
            );
        }


        /* -------------------------------------------------
           INDIVIDUAL CHECKBOXES
           ------------------------------------------------- */

        root.addEventListener(
            "change",
            event => {

                if (
                    event.target.matches(
                        "[data-category-checkbox]"
                    )
                ) {

                    Categories
                        .updateSelection();
                }
            }
        );


        /* -------------------------------------------------
           DELETE SELECTED
           ------------------------------------------------- */

        const deleteSelected =
            Categories.$(
                Categories.selectors
                    .deleteSelected
            );


        if (deleteSelected) {

            deleteSelected.addEventListener(
                "click",
                () => {

                    Categories
                        .deleteSelected();
                }
            );
        }


        /* -------------------------------------------------
           ESCAPE
           ------------------------------------------------- */

        if (
            !document.body.dataset
                .categoriesEscapeBound
        ) {

            document.body.dataset
                .categoriesEscapeBound =
                "true";


            document.addEventListener(
                "keydown",
                event => {

                    if (
                        event.key ===
                        "Escape"
                    ) {

                        const modal =
                            Categories.$(
                                Categories
                                    .selectors
                                    .modal
                            );


                        if (
                            modal &&
                            modal.classList
                                .contains(
                                    "is-open"
                                )
                        ) {

                            Categories
                                .closeModal();
                        }
                    }
                }
            );
        }
    };


/* =========================================================
   INITIALIZATION
   ========================================================= */

Categories.init =
    async function () {

        const root =
            Categories.getRoot();


        if (!root) {

            /*
             * This JS file can be loaded globally.
             * No categories page = do nothing.
             */

            return;
        }


        if (
            Categories.state
                .initialized
        ) {

            return;
        }


        Categories.state
            .initialized =
            true;


        console.log(
            "SMART POS: Initializing Categories..."
        );


        /*
         * Read HTML endpoints.
         */

        Categories.readEndpoints();


        console.log(
            "SMART POS Categories endpoints:",
            Categories.state.endpoints
        );


        /*
         * Bind UI.
         */

        Categories.bindEvents();


        /*
         * Initial load.
         */

        await Categories.load({
            force: true
        });


        console.log(
            "SMART POS Categories initialized successfully."
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
        Categories.init,
        {
            once: true
        }
    );

} else {

    Categories.init();
}


/* =========================================================
   GLOBAL DEBUG HELPERS
   ========================================================= */

SmartPOS.categories.reload =
    function () {

        return Categories.load({
            force: true
        });
    };


SmartPOS.categories.refresh =
    SmartPOS.categories.reload;