

/* ============================================================
   SMART POS / ERP
   inventory.js
   ------------------------------------------------------------
   نظام إدارة المخزون:
   - عرض المخزون
   - البحث
   - التصفية
   - الترتيب
   - Pagination
   - إضافة مخزون
   - خصم مخزون
   - تعديل مخزون
   - حركات المخزون
   - الإحصائيات
   - التصدير
   - CSRF
   - التعامل مع Flask API
   - التكامل مع SmartPOS / app.js / notifications.js
   ============================================================ */

(function (window, document) {

    'use strict';

    /* ============================================================
       GLOBAL APPLICATION
       ============================================================ */

    window.SmartPOS = window.SmartPOS || {};

    var SmartPOS = window.SmartPOS;


    /* ============================================================
       STATE
       ============================================================ */

    var state = {

        initialized: false,

        loading: false,

        saving: false,

        controller: null,

        page: 1,

        perPage: 25,

        totalPages: 1,

        totalItems: 0,

        search: '',

        categoryId: '',

        stockStatus: '',

        sortBy: 'name',

        sortOrder: 'asc',

        products: [],

        movements: [],

        selectedProduct: null
    };


    /* ============================================================
       DOM HELPERS
       ============================================================ */

    function $(selector, parent) {

        return (parent || document).querySelector(selector);
    }


    function $all(selector, parent) {

        return Array.prototype.slice.call(
            (parent || document).querySelectorAll(selector)
        );
    }


    function getRoot() {

        return $(
            '[data-inventory-page]'
        ) || $(
            '#inventory-page'
        ) || $(
            'main'
        );
    }


    function getValue(selector, fallback) {

        var element = $(selector);

        if (!element) {
            return fallback || '';
        }

        return element.value;
    }


    function setText(selector, value) {

        var element = $(selector);

        if (element) {
            element.textContent =
                value === undefined ||
                value === null
                    ? ''
                    : String(value);
        }
    }


    /* ============================================================
       API ENDPOINT CONFIGURATION
       ============================================================ */

    function getEndpoint(name) {

        var root = getRoot();

        if (
            root &&
            root.dataset &&
            root.dataset[name]
        ) {
            return root.dataset[name];
        }


        var meta = $(
            'meta[name="' + name + '"]'
        );

        if (meta) {
            return meta.getAttribute(
                'content'
            ) || '';
        }


        return '';
    }


    /* ============================================================
       CSRF
       ============================================================ */

    function getCSRFToken() {

        var meta = $(
            'meta[name="csrf-token"]'
        );

        if (meta) {

            return meta.getAttribute(
                'content'
            ) || '';
        }


        var input = $(
            'input[name="csrf_token"]'
        );

        if (input) {
            return input.value || '';
        }


        return '';
    }


    /* ============================================================
       NOTIFICATIONS
       ============================================================ */

    function notify(message, type) {

        type = type || 'info';


        if (
            SmartPOS &&
            typeof SmartPOS.notify === 'function'
        ) {

            SmartPOS.notify(
                message,
                type
            );

            return;
        }


        if (
            typeof window.showNotification ===
            'function'
        ) {

            window.showNotification(
                message,
                type
            );

            return;
        }


        if (type === 'error') {

            console.error(
                message
            );

        } else {

            console.log(
                message
            );
        }
    }


    /* ============================================================
       HTML ESCAPE
       ============================================================ */

    function escapeHtml(value) {

        var element =
            document.createElement(
                'div'
            );


        if (
            value === null ||
            value === undefined
        ) {

            value = '';
        }


        element.textContent =
            String(value);


        return element.innerHTML;
    }


    /* ============================================================
       FORMATTERS
       ============================================================ */

    function formatNumber(value) {

        var number =
            Number(value);


        if (
            !isFinite(number)
        ) {

            return '0';
        }


        return number.toLocaleString(
            'ar-EG'
        );
    }


    function formatMoney(value) {

        var number =
            Number(value);


        if (
            !isFinite(number)
        ) {

            return '0.00';
        }


        return number.toLocaleString(
            'ar-EG',
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            }
        );
    }


    function formatDate(value) {

        if (!value) {
            return '-';
        }


        var date =
            new Date(value);


        if (
            isNaN(
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
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit'
            }
        );
    }


    /* ============================================================
       LOADING
       ============================================================ */

    function setLoading(loading) {

        state.loading =
            loading;


        var root =
            getRoot();


        if (root) {

            root.classList.toggle(
                'is-loading',
                loading
            );
        }


        var loader =
            $(
                '[data-inventory-loading]'
            );


        if (loader) {

            loader.hidden =
                !loading;
        }
    }


    /* ============================================================
       FILTERS
       ============================================================ */

    function readFilters() {

        state.search =
            getValue(
                '[data-inventory-search]',
                ''
            ).trim();


        state.categoryId =
            getValue(
                '[data-inventory-category]',
                ''
            );


        state.stockStatus =
            getValue(
                '[data-inventory-status]',
                ''
            );


        var perPage =
            Number(
                getValue(
                    '[data-inventory-per-page]',
                    '25'
                )
            );


        if (
            isFinite(perPage) &&
            perPage > 0
        ) {

            state.perPage =
                perPage;
        }
    }


    /* ============================================================
       QUERY STRING
       ============================================================ */

    function buildQuery(extra) {

        var params =
            new URLSearchParams();


        var values = {

            search:
                state.search,

            category_id:
                state.categoryId,

            stock_status:
                state.stockStatus,

            page:
                state.page,

            per_page:
                state.perPage,

            sort_by:
                state.sortBy,

            sort_order:
                state.sortOrder
        };


        var key;


        for (
            key in values
        ) {

            if (
                Object.prototype.hasOwnProperty.call(
                    values,
                    key
                )
            ) {

                if (
                    values[key] !== '' &&
                    values[key] !== null &&
                    values[key] !== undefined
                ) {

                    params.set(
                        key,
                        values[key]
                    );
                }
            }
        }


        if (extra) {

            for (
                key in extra
            ) {

                if (
                    Object.prototype.hasOwnProperty.call(
                        extra,
                        key
                    )
                ) {

                    if (
                        extra[key] !== '' &&
                        extra[key] !== null &&
                        extra[key] !== undefined
                    ) {

                        params.set(
                            key,
                            extra[key]
                        );
                    }
                }
            }
        }


        return params.toString();
    }


    /* ============================================================
       API REQUEST
       ============================================================ */

    function request(url, options) {

        options =
            options || {};


        if (!url) {

            return Promise.reject(
                new Error(
                    'رابط API غير موجود.'
                )
            );
        }


        if (
            state.controller
        ) {

            state.controller.abort();
        }


        state.controller =
            new AbortController();


        var headers = {

            'Accept':
                'application/json'
        };


        if (
            options.body
        ) {

            headers[
                'Content-Type'
            ] =
                'application/json';
        }


        var token =
            getCSRFToken();


        if (token) {

            headers[
                'X-CSRFToken'
            ] =
                token;
        }


        return fetch(
            url,
            {

                method:
                    options.method ||
                    'GET',

                credentials:
                    'same-origin',

                headers:
                    headers,

                body:
                    options.body ||
                    undefined,

                signal:
                    state.controller.signal
            }
        )
        .then(
            function (response) {

                return response
                    .text()
                    .then(
                        function (text) {

                            var data = {};


                            try {

                                data =
                                    text
                                        ? JSON.parse(text)
                                        : {};

                            } catch (error) {

                                data = {

                                    message:
                                        text
                                };
                            }


                            if (
                                !response.ok
                            ) {

                                throw new Error(

                                    data.message ||
                                    data.error ||
                                    data.detail ||

                                    'فشل الاتصال بالخادم. HTTP ' +
                                    response.status
                                );
                            }


                            return data;
                        }
                    );
            }
        );
    }


    /* ============================================================
       NORMALIZE API RESPONSE
       ============================================================ */

    function normalizeResponse(data) {

        var source =
            data;


        if (
            data &&
            data.data &&
            typeof data.data ===
            'object'
        ) {

            source =
                data.data;
        }


        if (!source) {

            source = {};
        }


        if (
            Array.isArray(
                source.products
            )
        ) {

            state.products =
                source.products;

        } else if (
            Array.isArray(
                source.inventory
            )
        ) {

            state.products =
                source.inventory;

        } else {

            state.products =
                [];
        }


        if (
            Array.isArray(
                source.movements
            )
        ) {

            state.movements =
                source.movements;

        } else {

            state.movements =
                [];
        }


        var pagination =
            source.pagination ||
            source.meta ||
            {};


        state.page =
            Number(
                pagination.page ||
                pagination.current_page ||
                state.page
            ) || 1;


        state.totalPages =
            Number(
                pagination.pages ||
                pagination.total_pages ||
                1
            ) || 1;


        state.totalItems =
            Number(
                pagination.total ||
                source.total ||
                state.products.length
            ) || 0;


        var summary =
            source.summary ||
            source.statistics ||
            {};


        setText(
            '[data-inventory-total-products]',
            formatNumber(
                summary.total_products !==
                undefined
                    ? summary.total_products
                    : source.total_products ||
                      state.products.length
            )
        );


        setText(
            '[data-inventory-total-stock]',
            formatNumber(
                summary.total_stock !==
                undefined
                    ? summary.total_stock
                    : source.total_stock ||
                      0
            )
        );


        setText(
            '[data-inventory-total-value]',
            formatMoney(
                summary.total_value !==
                undefined
                    ? summary.total_value
                    : source.total_value ||
                      0
            )
        );


        setText(
            '[data-inventory-low-stock]',
            formatNumber(
                summary.low_stock !==
                undefined
                    ? summary.low_stock
                    : source.low_stock ||
                      0
            )
        );


        setText(
            '[data-inventory-out-of-stock]',
            formatNumber(
                summary.out_of_stock !==
                undefined
                    ? summary.out_of_stock
                    : source.out_of_stock ||
                      0
            )
        );
    }


    /* ============================================================
       PRODUCT HELPERS
       ============================================================ */

    function getProductId(product) {

        if (
            product.id !==
            undefined
        ) {

            return product.id;
        }


        return product.product_id;
    }


    function getProductName(product) {

        return (
            product.name ||
            product.product_name ||
            '-'
        );
    }


    function getStock(product) {

        var value;


        if (
            product.stock !==
            undefined
        ) {

            value =
                product.stock;

        } else if (
            product.quantity !==
            undefined
        ) {

            value =
                product.quantity;

        } else if (
            product.current_stock !==
            undefined
        ) {

            value =
                product.current_stock;

        } else {

            value =
                product.stock_quantity ||
                0;
        }


        return Number(value) || 0;
    }


    function getMinimumStock(product) {

        var value;


        if (
            product.minimum_stock !==
            undefined
        ) {

            value =
                product.minimum_stock;

        } else if (
            product.min_stock !==
            undefined
        ) {

            value =
                product.min_stock;

        } else {

            value =
                product.reorder_level ||
                0;
        }


        return Number(value) || 0;
    }


    function getCost(product) {

        if (
            product.cost_price !==
            undefined
        ) {

            return Number(
                product.cost_price
            ) || 0;
        }


        return Number(
            product.cost
        ) || 0;
    }


    /* ============================================================
       STOCK STATUS
       ============================================================ */

    function getStockStatus(product) {

        var stock =
            getStock(product);


        var minimum =
            getMinimumStock(product);


        if (
            stock <= 0
        ) {

            return {

                key: 'out',

                label:
                    'نفد المخزون'
            };
        }


        if (
            minimum > 0 &&
            stock <= minimum
        ) {

            return {

                key: 'low',

                label:
                    'مخزون منخفض'
            };
        }


        return {

            key: 'available',

            label:
                'متوفر'
        };
    }


    /* ============================================================
       RENDER PRODUCTS
       ============================================================ */

    function renderProducts() {

        var body =
            $(
                '[data-inventory-products-body]'
            );


        if (!body) {
            return;
        }


        if (
            state.products.length ===
            0
        ) {

            body.innerHTML =

                '<tr>' +

                    '<td colspan="10" ' +
                        'class="inventory-empty">' +

                        'لا توجد منتجات أو لا توجد نتائج مطابقة.' +

                    '</td>' +

                '</tr>';

            return;
        }


        var html =
            '';


        state.products.forEach(
            function (product) {

                var id =
                    getProductId(
                        product
                    );


                var name =
                    getProductName(
                        product
                    );


                var stock =
                    getStock(
                        product
                    );


                var minimum =
                    getMinimumStock(
                        product
                    );


                var cost =
                    getCost(
                        product
                    );


                var stockValue =
                    stock * cost;


                var status =
                    getStockStatus(
                        product
                    );


                var category =
                    product.category_name ||
                    (
                        product.category &&
                        product.category.name
                    ) ||
                    product.category ||
                    '-';


                html +=

                    '<tr ' +

                        'data-product-id="' +
                        escapeHtml(id) +
                        '">' +

                        '<td>' +

                            escapeHtml(
                                product.sku ||
                                product.code ||
                                '-'
                            ) +

                        '</td>' +


                        '<td>' +

                            '<strong>' +

                                escapeHtml(
                                    name
                                ) +

                            '</strong>' +

                        '</td>' +


                        '<td>' +

                            escapeHtml(
                                category
                            ) +

                        '</td>' +


                        '<td>' +

                            formatNumber(
                                stock
                            ) +

                        '</td>' +


                        '<td>' +

                            formatNumber(
                                minimum
                            ) +

                        '</td>' +


                        '<td>' +

                            formatMoney(
                                cost
                            ) +

                        '</td>' +


                        '<td>' +

                            formatMoney(
                                stockValue
                            ) +

                        '</td>' +


                        '<td>' +

                            '<span ' +

                                'class="inventory-status ' +
                                'inventory-status-' +
                                escapeHtml(
                                    status.key
                                ) +
                            '">' +

                                escapeHtml(
                                    status.label
                                ) +

                            '</span>' +

                        '</td>' +


                        '<td>' +

                            formatDate(
                                product.updated_at ||
                                product.last_updated ||
                                product.modified_at
                            ) +

                        '</td>' +


                        '<td>' +

                            '<div class="inventory-actions">' +

                                '<button ' +

                                    'type="button" ' +

                                    'data-inventory-action="add" ' +

                                    'data-product-id="' +
                                    escapeHtml(id) +
                                    '">' +

                                    'إضافة' +

                                '</button>' +


                                '<button ' +

                                    'type="button" ' +

                                    'data-inventory-action="subtract" ' +

                                    'data-product-id="' +
                                    escapeHtml(id) +
                                    '">' +

                                    'خصم' +

                                '</button>' +


                                '<button ' +

                                    'type="button" ' +

                                    'data-inventory-action="adjust" ' +

                                    'data-product-id="' +
                                    escapeHtml(id) +
                                    '">' +

                                    'تعديل' +

                                '</button>' +


                                '<button ' +

                                    'type="button" ' +

                                    'data-inventory-action="history" ' +

                                    'data-product-id="' +
                                    escapeHtml(id) +
                                    '">' +

                                    'الحركات' +

                                '</button>' +

                            '</div>' +

                        '</td>' +

                    '</tr>';
            }
        );


        body.innerHTML =
            html;
    }


    /* ============================================================
       RENDER MOVEMENTS
       ============================================================ */

    function renderMovements() {

        var body =
            $(
                '[data-inventory-movements-body]'
            );


        if (!body) {
            return;
        }


        if (
            state.movements.length ===
            0
        ) {

            body.innerHTML =

                '<tr>' +

                    '<td colspan="9" ' +
                        'class="inventory-empty">' +

                        'لا توجد حركات مخزون.' +

                    '</td>' +

                '</tr>';

            return;
        }


        var html =
            '';


        state.movements.forEach(
            function (movement) {

                var quantity =
                    Number(
                        movement.quantity !==
                        undefined

                            ? movement.quantity

                            : movement.amount ||
                              0
                    ) || 0;


                var type =
                    movement.movement_type ||
                    movement.type ||
                    movement.action ||
                    '-';


                html +=

                    '<tr>' +

                        '<td>' +

                            escapeHtml(
                                movement.reference ||
                                movement.reference_number ||
                                movement.invoice_number ||
                                movement.id ||
                                '-'
                            ) +

                        '</td>' +


                        '<td>' +

                            escapeHtml(
                                movement.product_name ||
                                (
                                    movement.product &&
                                    movement.product.name
                                ) ||
                                '-'
                            ) +

                        '</td>' +


                        '<td>' +

                            escapeHtml(
                                type
                            ) +

                        '</td>' +


                        '<td>' +

                            formatNumber(
                                quantity
                            ) +

                        '</td>' +


                        '<td>' +

                            formatNumber(
                                movement.previous_quantity ||
                                movement.previous_stock ||
                                0
                            ) +

                        '</td>' +


                        '<td>' +

                            formatNumber(
                                movement.new_quantity ||
                                movement.new_stock ||
                                movement.balance ||
                                0
                            ) +

                        '</td>' +


                        '<td>' +

                            escapeHtml(
                                movement.reason ||
                                '-'
                            ) +

                        '</td>' +


                        '<td>' +

                            escapeHtml(
                                movement.user_name ||
                                movement.created_by_name ||
                                (
                                    movement.user &&
                                    movement.user.name
                                ) ||
                                '-'
                            ) +

                        '</td>' +


                        '<td>' +

                            formatDate(
                                movement.created_at ||
                                movement.date ||
                                movement.movement_date
                            ) +

                        '</td>' +

                    '</tr>';
            }
        );


        body.innerHTML =
            html;
    }


    /* ============================================================
       PAGINATION
       ============================================================ */

    function renderPagination() {

        var container =
            $(
                '[data-inventory-pagination]'
            );


        if (!container) {
            return;
        }


        var current =
            Number(
                state.page
            ) || 1;


        var total =
            Number(
                state.totalPages
            ) || 1;


        if (
            total <= 1
        ) {

            container.innerHTML =
                '';

            return;
        }


        var html =
            '';


        if (
            current > 1
        ) {

            html +=

                '<button ' +

                    'type="button" ' +

                    'data-inventory-page="' +
                    (current - 1) +
                    '">' +

                    'السابق' +

                '</button>';
        }


        var start =
            Math.max(
                1,
                current - 2
            );


        var end =
            Math.min(
                total,
                current + 2
            );


        var page;


        for (
            page = start;
            page <= end;
            page++
        ) {

            html +=

                '<button ' +

                    'type="button" ' +

                    'data-inventory-page="' +
                    page +
                    '"' +

                    (
                        page === current
                            ? ' aria-current="page"'
                            : ''
                    ) +

                '>' +

                    page +

                '</button>';
        }


        if (
            current < total
        ) {

            html +=

                '<button ' +

                    'type="button" ' +

                    'data-inventory-page="' +
                    (current + 1) +
                    '">' +

                    'التالي' +

                '</button>';
        }


        container.innerHTML =
            html;
    }


    /* ============================================================
       RENDER
       ============================================================ */

    function render() {

        renderProducts();

        renderMovements();

        renderPagination();
    }


    /* ============================================================
       LOAD INVENTORY
       ============================================================ */

    function load() {

        readFilters();


        var url =
            getEndpoint(
                'inventoryEndpoint'
            );


        if (!url) {

            notify(
                'لم يتم تعريف inventoryEndpoint في صفحة المخزون.',
                'error'
            );

            return Promise.resolve();
        }


        setLoading(
            true
        );


        var query =
            buildQuery();


        var separator =
            url.indexOf('?') === -1
                ? '?'
                : '&';


        return request(
            url +
            separator +
            query
        )
        .then(
            function (data) {

                normalizeResponse(
                    data
                );


                render();
            }
        )
        .catch(
            function (error) {

                if (
                    error.name !==
                    'AbortError'
                ) {

                    console.error(
                        'SMART POS inventory.js:',
                        error
                    );


                    notify(
                        error.message ||
                        'تعذر تحميل بيانات المخزون.',
                        'error'
                    );
                }
            }
        )
        .then(
            function () {

                setLoading(
                    false
                );
            }
        );
    }


    /* ============================================================
       FIND PRODUCT
       ============================================================ */

    function findProduct(productId) {

        var found =
            null;


        state.products.some(
            function (product) {

                var id =
                    getProductId(
                        product
                    );


                if (
                    String(id) ===
                    String(productId)
                ) {

                    found =
                        product;

                    return true;
                }


                return false;
            }
        );


        return found;
    }


    /* ============================================================
       STOCK MOVEMENT
       ============================================================ */

    function createMovement(
        product,
        type,
        quantity,
        reason
    ) {

        var url =
            getEndpoint(
                'inventoryMovementEndpoint'
            );


        if (!url) {

            notify(
                'لم يتم تعريف inventoryMovementEndpoint.',
                'error'
            );

            return Promise.resolve(
                false
            );
        }


        if (
            state.saving
        ) {

            return Promise.resolve(
                false
            );
        }


        quantity =
            Number(
                quantity
            );


        if (
            !isFinite(quantity) ||
            quantity <= 0
        ) {

            notify(
                'الكمية يجب أن تكون رقمًا أكبر من صفر.',
                'error'
            );

            return Promise.resolve(
                false
            );
        }


        state.saving =
            true;


        var productId =
            getProductId(
                product
            );


        var payload = {

            product_id:
                productId,

            movement_type:
                type,

            type:
                type,

            quantity:
                quantity,

            reason:
                reason ||
                'تعديل من شاشة المخزون'
        };


        return request(
            url,
            {

                method:
                    'POST',

                body:
                    JSON.stringify(
                        payload
                    )
            }
        )
        .then(
            function () {

                notify(
                    'تم تحديث المخزون بنجاح.',
                    'success'
                );


                return load()
                    .then(
                        function () {

                            return true;
                        }
                    );
            }
        )
        .catch(
            function (error) {

                if (
                    error.name !==
                    'AbortError'
                ) {

                    notify(
                        error.message ||
                        'تعذر تحديث المخزون.',
                        'error'
                    );
                }


                return false;
            }
        )
        .then(
            function (result) {

                state.saving =
                    false;


                return result;
            }
        );
    }


    /* ============================================================
       QUICK ACTION
       ============================================================ */

    function quickAction(
        productId,
        type
    ) {

        var product =
            findProduct(
                productId
            );


        if (!product) {

            notify(
                'لم يتم العثور على المنتج.',
                'error'
            );

            return;
        }


        var quantity =
            window.prompt(
                'أدخل الكمية للمنتج: ' +
                getProductName(
                    product
                )
            );


        if (
            quantity === null
        ) {

            return;
        }


        quantity =
            Number(
                quantity
            );


        if (
            !isFinite(quantity) ||
            quantity <= 0
        ) {

            notify(
                'الكمية غير صحيحة.',
                'error'
            );

            return;
        }


        var reason =
            window.prompt(
                'سبب حركة المخزون:',
                ''
            );


        if (
            reason === null
        ) {

            reason =
                '';
        }


        createMovement(
            product,
            type,
            quantity,
            reason
        );
    }


    /* ============================================================
       LOAD PRODUCT HISTORY
       ============================================================ */

    function loadHistory(
        productId
    ) {

        var url =
            getEndpoint(
                'inventoryMovementsEndpoint'
            );


        if (!url) {

            notify(
                'لم يتم تعريف inventoryMovementsEndpoint.',
                'error'
            );

            return;
        }


        var separator =
            url.indexOf('?') === -1
                ? '?'
                : '&';


        request(
            url +
            separator +
            'product_id=' +
            encodeURIComponent(
                productId
            )
        )
        .then(
            function (data) {

                var source =
                    data;


                if (
                    data &&
                    data.data &&
                    typeof data.data ===
                    'object'
                ) {

                    source =
                        data.data;
                }


                if (
                    source &&
                    Array.isArray(
                        source.movements
                    )
                ) {

                    state.movements =
                        source.movements;

                } else if (
                    Array.isArray(
                        source
                    )
                ) {

                    state.movements =
                        source;

                } else {

                    state.movements =
                        [];
                }


                renderMovements();
            }
        )
        .catch(
            function (error) {

                if (
                    error.name !==
                    'AbortError'
                ) {

                    notify(
                        error.message ||
                        'تعذر تحميل حركات المنتج.',
                        'error'
                    );
                }
            }
        );
    }


    /* ============================================================
       RESET FILTERS
       ============================================================ */

    function resetFilters() {

        var search =
            $(
                '[data-inventory-search]'
            );


        var category =
            $(
                '[data-inventory-category]'
            );


        var status =
            $(
                '[data-inventory-status]'
            );


        if (search) {
            search.value =
                '';
        }


        if (category) {
            category.value =
                '';
        }


        if (status) {
            status.value =
                '';
        }


        state.page =
            1;


        state.search =
            '';

        state.categoryId =
            '';

        state.stockStatus =
            '';


        load();
    }


    /* ============================================================
       EXPORT
       ============================================================ */

    function exportInventory() {

        var url =
            getEndpoint(
                'inventoryExportEndpoint'
            );


        if (!url) {

            notify(
                'لم يتم تعريف inventoryExportEndpoint.',
                'error'
            );

            return;
        }


        var query =
            buildQuery(
                {
                    format:
                        'csv'
                }
            );


        var separator =
            url.indexOf('?') === -1
                ? '?'
                : '&';


        window.location.href =
            url +
            separator +
            query;
    }


    /* ============================================================
       PRINT
       ============================================================ */

    function printInventory() {

        var root =
            getRoot();


        if (!root) {
            return;
        }


        document.body.classList.add(
            'printing-inventory'
        );


        window.print();


        window.setTimeout(
            function () {

                document.body.classList.remove(
                    'printing-inventory'
                );

            },
            1000
        );
    }


    /* ============================================================
       EVENTS
       ============================================================ */

    function bindEvents() {

        var root =
            getRoot();


        if (!root) {
            return;
        }


        /* --------------------------------------------------------
           FILTER FORM
        -------------------------------------------------------- */

        var form =
            $(
                '[data-inventory-filter-form]',
                root
            );


        if (form) {

            form.addEventListener(
                'submit',
                function (event) {

                    event.preventDefault();

                    state.page =
                        1;

                    load();
                }
            );
        }


        /* --------------------------------------------------------
           RESET
        -------------------------------------------------------- */

        var reset =
            $(
                '[data-inventory-reset]',
                root
            );


        if (reset) {

            reset.addEventListener(
                'click',
                resetFilters
            );
        }


        /* --------------------------------------------------------
           REFRESH
        -------------------------------------------------------- */

        var refresh =
            $(
                '[data-inventory-refresh]',
                root
            );


        if (refresh) {

            refresh.addEventListener(
                'click',
                load
            );
        }


        /* --------------------------------------------------------
           EXPORT
        -------------------------------------------------------- */

        var exportButton =
            $(
                '[data-inventory-export]',
                root
            );


        if (exportButton) {

            exportButton.addEventListener(
                'click',
                exportInventory
            );
        }


        /* --------------------------------------------------------
           PRINT
        -------------------------------------------------------- */

        var printButton =
            $(
                '[data-inventory-print]',
                root
            );


        if (printButton) {

            printButton.addEventListener(
                'click',
                printInventory
            );
        }


        /* --------------------------------------------------------
           SEARCH
        -------------------------------------------------------- */

        var search =
            $(
                '[data-inventory-search]',
                root
            );


        if (search) {

            var timer;


            search.addEventListener(
                'input',
                function () {

                    window.clearTimeout(
                        timer
                    );


                    timer =
                        window.setTimeout(
                            function () {

                                state.page =
                                    1;

                                load();

                            },
                            350
                        );
                }
            );
        }


        /* --------------------------------------------------------
           TABLE ACTIONS
        -------------------------------------------------------- */

        root.addEventListener(
            'click',
            function (event) {

                var actionButton =
                    event.target.closest(
                        '[data-inventory-action]'
                    );


                if (
                    actionButton
                ) {

                    var action =
                        actionButton.getAttribute(
                            'data-inventory-action'
                        );


                    var productId =
                        actionButton.getAttribute(
                            'data-product-id'
                        );


                    if (
                        action ===
                        'add'
                    ) {

                        quickAction(
                            productId,
                            'in'
                        );

                    } else if (
                        action ===
                        'subtract'
                    ) {

                        quickAction(
                            productId,
                            'out'
                        );

                    } else if (
                        action ===
                        'adjust'
                    ) {

                        quickAction(
                            productId,
                            'adjustment'
                        );

                    } else if (
                        action ===
                        'history'
                    ) {

                        loadHistory(
                            productId
                        );
                    }


                    return;
                }


                /* ------------------------------------------------
                   PAGINATION
                ------------------------------------------------ */

                var pageButton =
                    event.target.closest(
                        '[data-inventory-page]'
                    );


                if (
                    pageButton
                ) {

                    state.page =
                        Number(
                            pageButton.getAttribute(
                                'data-inventory-page'
                            )
                        ) || 1;


                    load();


                    return;
                }


                /* ------------------------------------------------
                   SORT
                ------------------------------------------------ */

                var sortButton =
                    event.target.closest(
                        '[data-inventory-sort]'
                    );


                if (
                    sortButton
                ) {

                    var column =
                        sortButton.getAttribute(
                            'data-inventory-sort'
                        );


                    if (
                        state.sortBy ===
                        column
                    ) {

                        state.sortOrder =
                            state.sortOrder ===
                            'asc'
                                ? 'desc'
                                : 'asc';

                    } else {

                        state.sortBy =
                            column;

                        state.sortOrder =
                            'asc';
                    }


                    state.page =
                        1;


                    load();
                }
            }
        );
    }


    /* ============================================================
       INITIALIZATION
       ============================================================ */

    function init() {

        if (
            state.initialized
        ) {

            return;
        }


        if (
            !getRoot()
        ) {

            return;
        }


        state.initialized =
            true;


        bindEvents();


        load();
    }


    /* ============================================================
       PUBLIC API
       ============================================================ */

    SmartPOS.inventory = {

        init:
            init,

        load:
            load,

        refresh:
            load,

        reset:
            resetFilters,

        export:
            exportInventory,

        print:
            printInventory,

        add:
            function (productId) {

                quickAction(
                    productId,
                    'in'
                );
            },

        subtract:
            function (productId) {

                quickAction(
                    productId,
                    'out'
                );
            },

        adjust:
            function (productId) {

                quickAction(
                    productId,
                    'adjustment'
                );
            },

        history:
            loadHistory,

        createMovement:
            createMovement,

        state:
            state
    };


    /* ============================================================
       AUTO START
       ============================================================ */

    if (
        document.readyState ===
        'loading'
    ) {

        document.addEventListener(
            'DOMContentLoaded',
            init
        );

    } else {

        init();
    }


})(window, document);