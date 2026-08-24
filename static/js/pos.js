

/* =========================================================
   SMART POS / ERP
   pos.js
   Point Of Sale - Sales Terminal
   ========================================================= */

"use strict";

window.SmartPOS = window.SmartPOS || {};

SmartPOS.pos = SmartPOS.pos || {};


/* =========================================================
   STATE
========================================================= */

SmartPOS.pos.state = {

    initialized: false,

    loading: false,

    processing: false,

    products: [],

    cart: [],

    customers: [],

    selectedCustomer: null,

    search: "",

    category: "",

    paymentMethod: "cash",

    discountType: "fixed",

    discountValue: 0,

    taxRate: 0,

    shipping: 0,

    paidAmount: 0,

    invoiceNumber: null,

    currency: "EGP",

    endpoints: {

        products: null,

        searchProducts: null,

        createSale: null,

        customers: null,

        invoice: null,

        stock: null

    }

};


/* =========================================================
   SELECTORS
========================================================= */

SmartPOS.pos.selectors = {

    root:
        "[data-pos]",

    productGrid:
        "[data-pos-products]",

    productSearch:
        "[data-pos-search]",

    categoryFilter:
        "[data-pos-category]",

    cart:
        "[data-pos-cart]",

    cartCount:
        "[data-pos-cart-count]",

    subtotal:
        "[data-pos-subtotal]",

    discount:
        "[data-pos-discount]",

    tax:
        "[data-pos-tax]",

    shipping:
        "[data-pos-shipping]",

    total:
        "[data-pos-total]",

    paid:
        "[data-pos-paid]",

    change:
        "[data-pos-change]",

    paymentMethod:
        "[data-pos-payment]",

    discountType:
        "[data-pos-discount-type]",

    discountValue:
        "[data-pos-discount-value]",

    taxRate:
        "[data-pos-tax-rate]",

    shippingInput:
        "[data-pos-shipping-input]",

    customer:
        "[data-pos-customer]",

    customerSearch:
        "[data-pos-customer-search]",

    checkout:
        "[data-pos-checkout]",

    clear:
        "[data-pos-clear]",

    hold:
        "[data-pos-hold]",

    held:
        "[data-pos-held]",

    loading:
        "[data-pos-loading]",

    emptyCart:
        "[data-pos-empty]",

    invoiceNumber:
        "[data-pos-invoice-number]",

    message:
        "[data-pos-message]"

};


/* =========================================================
   DOM
========================================================= */

SmartPOS.pos.$ = function (
    selector,
    parent = document
) {

    return parent.querySelector(
        selector
    );
};


SmartPOS.pos.$$ = function (
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

SmartPOS.pos.getRoot = function () {

    return SmartPOS.pos.$(
        SmartPOS.pos.selectors.root
    );

};


/* =========================================================
   ESCAPE HTML
========================================================= */

SmartPOS.pos.escape = function (
    value
) {

    if (
        typeof SmartPOS.escapeHTML ===
        "function"
    ) {

        return SmartPOS.escapeHTML(
            value
        );

    }

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
   NUMBER
========================================================= */

SmartPOS.pos.number = function (
    value
) {

    const number =
        Number(value);

    if (
        !Number.isFinite(number)
    ) {

        return 0;

    }

    return number;

};


/* =========================================================
   MONEY
========================================================= */

SmartPOS.pos.money = function (
    value
) {

    const amount =
        SmartPOS.pos.number(
            value
        );

    return amount.toLocaleString(
        "ar-EG",
        {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }
    );

};


/* =========================================================
   READ ENDPOINTS
========================================================= */

SmartPOS.pos.readEndpoints =
    function () {

        const root =
            SmartPOS.pos.getRoot();

        if (!root) {
            return;
        }

        SmartPOS.pos.state.endpoints = {

            products:
                root.dataset.productsEndpoint ||
                null,

            searchProducts:
                root.dataset.searchProductsEndpoint ||
                null,

            createSale:
                root.dataset.createSaleEndpoint ||
                null,

            customers:
                root.dataset.customersEndpoint ||
                null,

            invoice:
                root.dataset.invoiceEndpoint ||
                null,

            stock:
                root.dataset.stockEndpoint ||
                null

        };

    };


/* =========================================================
   API REQUEST
========================================================= */

SmartPOS.pos.request =
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

                    headers: {

                        "Content-Type":
                            "application/json",

                        ...(options.headers || {})

                    },

                    ...options

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
                "حدث خطأ في الاتصال بالخادم."
            );

        }

        return data;

    };


/* =========================================================
   INITIALIZE
========================================================= */

SmartPOS.pos.init =
    async function () {

        const root =
            SmartPOS.pos.getRoot();

        if (!root) {
            return;
        }

        if (
            SmartPOS.pos.state.initialized
        ) {

            return;

        }

        SmartPOS.pos.state.initialized =
            true;

        SmartPOS.pos.readEndpoints();

        SmartPOS.pos.bindEvents();

        SmartPOS.pos.restoreCart();

        SmartPOS.pos.renderCart();

        SmartPOS.pos.calculate();

        await SmartPOS.pos.loadProducts();

        SmartPOS.pos.loadCustomers();

        console.log(
            "SMART POS POS initialized."
        );

    };


/* =========================================================
   LOAD PRODUCTS
========================================================= */

SmartPOS.pos.loadProducts =
    async function () {

        const endpoint =
            SmartPOS.pos.state
                .endpoints
                .products;

        if (!endpoint) {

            console.warn(
                "POS products endpoint is not configured."
            );

            return;

        }

        SmartPOS.pos.setLoading(
            true
        );

        try {

            const response =
                await SmartPOS.pos.request(
                    endpoint,
                    {
                        method: "GET"
                    }
                );

            const data =
                response.data ||
                response;

            SmartPOS.pos.state.products =
                data.products ||
                data.items ||
                [];

            SmartPOS.pos.renderProducts();

        } catch (error) {

            console.error(
                "POS products error:",
                error
            );

            SmartPOS.pos.notify(
                error.message ||
                "تعذر تحميل المنتجات.",
                "error"
            );

        } finally {

            SmartPOS.pos.setLoading(
                false
            );

        }

    };


/* =========================================================
   SEARCH PRODUCTS
========================================================= */

SmartPOS.pos.searchProducts =
    async function (
        value
    ) {

        SmartPOS.pos.state.search =
            String(
                value || ""
            ).trim();

        const endpoint =
            SmartPOS.pos.state
                .endpoints
                .searchProducts ||
            SmartPOS.pos.state
                .endpoints
                .products;

        if (!endpoint) {

            SmartPOS.pos.filterLocalProducts();

            return;

        }

        if (
            !SmartPOS.pos.state.search
        ) {

            SmartPOS.pos.renderProducts();

            return;

        }

        try {

            const params =
                new URLSearchParams();

            params.set(
                "search",
                SmartPOS.pos.state.search
            );

            if (
                SmartPOS.pos.state.category
            ) {

                params.set(
                    "category",
                    SmartPOS.pos.state.category
                );

            }

            const separator =
                endpoint.includes("?")
                    ? "&"
                    : "?";

            const response =
                await SmartPOS.pos.request(
                    `${endpoint}${separator}${params.toString()}`,
                    {
                        method: "GET"
                    }
                );

            const data =
                response.data ||
                response;

            SmartPOS.pos.state.products =
                data.products ||
                data.items ||
                [];

            SmartPOS.pos.renderProducts();

        } catch (error) {

            console.error(
                "Product search error:",
                error
            );

            SmartPOS.pos.filterLocalProducts();

        }

    };


/* =========================================================
   LOCAL PRODUCT FILTER
========================================================= */

SmartPOS.pos.filterLocalProducts =
    function () {

        const search =
            SmartPOS.pos.state
                .search
                .toLowerCase();

        const category =
            SmartPOS.pos.state
                .category;

        const products =
            SmartPOS.pos.state
                .products
                .filter(
                    product => {

                        const name =
                            String(
                                product.name ||
                                product.product_name ||
                                ""
                            )
                            .toLowerCase();

                        const code =
                            String(
                                product.sku ||
                                product.code ||
                                ""
                            )
                            .toLowerCase();

                        const categoryId =
                            String(
                                product.category_id ||
                                ""
                            );

                        const matchesSearch =
                            !search ||
                            name.includes(search) ||
                            code.includes(search);

                        const matchesCategory =
                            !category ||
                            categoryId ===
                                String(category);

                        return (
                            matchesSearch &&
                            matchesCategory
                        );

                    }
                );

        SmartPOS.pos.renderProductList(
            products
        );

    };


/* =========================================================
   RENDER PRODUCTS
========================================================= */

SmartPOS.pos.renderProducts =
    function () {

        SmartPOS.pos.renderProductList(
            SmartPOS.pos.state.products
        );

    };


/* =========================================================
   PRODUCT LIST
========================================================= */

SmartPOS.pos.renderProductList =
    function (
        products
    ) {

        const container =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .productGrid
            );

        if (!container) {
            return;
        }

        if (
            !Array.isArray(products) ||
            products.length === 0
        ) {

            container.innerHTML = `

                <div class="pos-empty-products">

                    <i
                        class="fa-solid fa-box-open"
                    ></i>

                    <strong>
                        لا توجد منتجات
                    </strong>

                    <span>
                        لم يتم العثور على منتجات مطابقة.
                    </span>

                </div>

            `;

            return;

        }

        container.innerHTML =
            products
                .map(
                    product =>
                        SmartPOS.pos
                            .renderProduct(
                                product
                            )
                )
                .join("");

    };


/* =========================================================
   RENDER PRODUCT
========================================================= */

SmartPOS.pos.renderProduct =
    function (
        product
    ) {

        const id =
            product.id ??
            product.product_id;

        const name =
            product.name ||
            product.product_name ||
            "منتج";

        const price =
            SmartPOS.pos.number(
                product.sale_price ??
                product.selling_price ??
                product.price
            );

        const stock =
            SmartPOS.pos.number(
                product.stock ??
                product.quantity ??
                product.stock_quantity
            );

        const sku =
            product.sku ||
            product.code ||
            "";

        const image =
            product.image ||
            product.image_url ||
            "";

        const outOfStock =
            stock <= 0;

        return `

            <article
                class="
                    pos-product-card
                    ${outOfStock
                        ? "out-of-stock"
                        : ""}
                "
                data-product-id="${SmartPOS.pos.escape(id)}"
            >

                <button
                    type="button"
                    class="pos-product-button"
                    data-add-product
                    data-id="${SmartPOS.pos.escape(id)}"
                    ${outOfStock ? "disabled" : ""}
                >

                    <div class="pos-product-image">

                        ${
                            image
                                ? `
                                    <img
                                        src="${SmartPOS.pos.escape(image)}"
                                        alt="${SmartPOS.pos.escape(name)}"
                                        loading="lazy"
                                    >
                                `
                                : `
                                    <i
                                        class="fa-solid fa-box"
                                    ></i>
                                `
                        }

                    </div>


                    <div class="pos-product-content">

                        <h3>
                            ${SmartPOS.pos.escape(name)}
                        </h3>

                        <span class="pos-product-sku">
                            ${SmartPOS.pos.escape(sku)}
                        </span>


                        <div class="pos-product-bottom">

                            <strong>
                                ${SmartPOS.pos.money(price)}
                                ${SmartPOS.pos.escape(
                                    SmartPOS.pos.state.currency
                                )}
                            </strong>

                            <small>

                                ${
                                    outOfStock
                                        ? "نفد المخزون"
                                        : `المخزون: ${stock}`
                                }

                            </small>

                        </div>

                    </div>

                </button>

            </article>

        `;

    };


/* =========================================================
   FIND PRODUCT
========================================================= */

SmartPOS.pos.findProduct =
    function (
        productId
    ) {

        return SmartPOS.pos.state.products
            .find(
                product =>
                    String(
                        product.id ??
                        product.product_id
                    ) ===
                    String(productId)
            );

    };


/* =========================================================
   ADD PRODUCT
========================================================= */

SmartPOS.pos.addProduct =
    function (
        productId,
        quantity = 1
    ) {

        const product =
            SmartPOS.pos.findProduct(
                productId
            );

        if (!product) {

            SmartPOS.pos.notify(
                "المنتج غير موجود.",
                "error"
            );

            return;

        }

        const stock =
            SmartPOS.pos.number(
                product.stock ??
                product.quantity ??
                product.stock_quantity
            );

        const price =
            SmartPOS.pos.number(
                product.sale_price ??
                product.selling_price ??
                product.price
            );

        const existing =
            SmartPOS.pos.state.cart
                .find(
                    item =>
                        String(
                            item.product_id
                        ) ===
                        String(productId)
                );

        if (existing) {

            if (
                stock > 0 &&
                existing.quantity >= stock
            ) {

                SmartPOS.pos.notify(
                    "لا يمكن إضافة كمية أكبر من المخزون.",
                    "warning"
                );

                return;

            }

            existing.quantity +=
                quantity;

        } else {

            SmartPOS.pos.state.cart.push({

                product_id:
                    product.id ??
                    product.product_id,

                name:
                    product.name ||
                    product.product_name ||
                    "منتج",

                sku:
                    product.sku ||
                    product.code ||
                    "",

                price,

                quantity,

                stock,

                discount: 0

            });

        }

        SmartPOS.pos.renderCart();

        SmartPOS.pos.calculate();

        SmartPOS.pos.saveCart();

        SmartPOS.pos.notify(
            "تمت إضافة المنتج إلى الفاتورة.",
            "success"
        );

    };


/* =========================================================
   REMOVE PRODUCT
========================================================= */

SmartPOS.pos.removeProduct =
    function (
        productId
    ) {

        SmartPOS.pos.state.cart =
            SmartPOS.pos.state.cart
                .filter(
                    item =>
                        String(
                            item.product_id
                        ) !==
                        String(productId)
                );

        SmartPOS.pos.renderCart();

        SmartPOS.pos.calculate();

        SmartPOS.pos.saveCart();

    };


/* =========================================================
   CHANGE QUANTITY
========================================================= */

SmartPOS.pos.changeQuantity =
    function (
        productId,
        quantity
    ) {

        const item =
            SmartPOS.pos.state.cart
                .find(
                    cartItem =>
                        String(
                            cartItem.product_id
                        ) ===
                        String(productId)
                );

        if (!item) {
            return;
        }

        let newQuantity =
            parseFloat(quantity);

        if (
            !Number.isFinite(
                newQuantity
            ) ||
            newQuantity < 1
        ) {

            newQuantity = 1;

        }

        if (
            item.stock > 0 &&
            newQuantity > item.stock
        ) {

            newQuantity =
                item.stock;

            SmartPOS.pos.notify(
                "الكمية المطلوبة أكبر من المخزون.",
                "warning"
            );

        }

        item.quantity =
            newQuantity;

        SmartPOS.pos.renderCart();

        SmartPOS.pos.calculate();

        SmartPOS.pos.saveCart();

    };


/* =========================================================
   CHANGE ITEM DISCOUNT
========================================================= */

SmartPOS.pos.changeItemDiscount =
    function (
        productId,
        value
    ) {

        const item =
            SmartPOS.pos.state.cart
                .find(
                    cartItem =>
                        String(
                            cartItem.product_id
                        ) ===
                        String(productId)
                );

        if (!item) {
            return;
        }

        item.discount =
            Math.max(
                0,
                SmartPOS.pos.number(
                    value
                )
            );

        SmartPOS.pos.calculate();

        SmartPOS.pos.saveCart();

    };


/* =========================================================
   RENDER CART
========================================================= */

SmartPOS.pos.renderCart =
    function () {

        const container =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .cart
            );

        if (!container) {
            return;
        }

        const cart =
            SmartPOS.pos.state.cart;

        if (
            !cart.length
        ) {

            container.innerHTML = `

                <div class="pos-empty-cart">

                    <i
                        class="fa-solid fa-cart-shopping"
                    ></i>

                    <strong>
                        السلة فارغة
                    </strong>

                    <span>
                        أضف المنتجات للبدء بعملية البيع.
                    </span>

                </div>

            `;

            SmartPOS.pos.updateCartCount();

            return;

        }

        container.innerHTML =
            cart
                .map(
                    item =>
                        SmartPOS.pos
                            .renderCartItem(
                                item
                            )
                )
                .join("");

        SmartPOS.pos.updateCartCount();

    };


/* =========================================================
   CART ITEM
========================================================= */

SmartPOS.pos.renderCartItem =
    function (
        item
    ) {

        const lineTotal =
            (
                item.price *
                item.quantity
            ) -
            SmartPOS.pos.number(
                item.discount
            );

        return `

            <div
                class="pos-cart-item"
                data-cart-item
                data-id="${SmartPOS.pos.escape(
                    item.product_id
                )}"
            >

                <div class="pos-cart-item-info">

                    <strong>
                        ${SmartPOS.pos.escape(
                            item.name
                        )}
                    </strong>

                    <small>
                        ${SmartPOS.pos.escape(
                            item.sku
                        )}
                    </small>

                </div>


                <div class="pos-cart-item-price">

                    ${SmartPOS.pos.money(
                        item.price
                    )}

                </div>


                <div class="pos-cart-quantity">

                    <button
                        type="button"
                        data-cart-minus
                        data-id="${SmartPOS.pos.escape(
                            item.product_id
                        )}"
                    >
                        −
                    </button>

                    <input
                        type="number"
                        min="1"
                        max="${SmartPOS.pos.escape(
                            item.stock
                        )}"
                        value="${SmartPOS.pos.escape(
                            item.quantity
                        )}"
                        data-cart-quantity
                        data-id="${SmartPOS.pos.escape(
                            item.product_id
                        )}"
                    >

                    <button
                        type="button"
                        data-cart-plus
                        data-id="${SmartPOS.pos.escape(
                            item.product_id
                        )}"
                    >
                        +
                    </button>

                </div>


                <div class="pos-cart-line-total">

                    ${SmartPOS.pos.money(
                        lineTotal
                    )}

                </div>


                <button
                    type="button"
                    class="pos-cart-remove"
                    data-cart-remove
                    data-id="${SmartPOS.pos.escape(
                        item.product_id
                    )}"
                    title="حذف المنتج"
                >

                    <i
                        class="fa-solid fa-trash"
                    ></i>

                </button>

            </div>

        `;

    };


/* =========================================================
   CART COUNT
========================================================= */

SmartPOS.pos.updateCartCount =
    function () {

        const element =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .cartCount
            );

        if (!element) {
            return;
        }

        const count =
            SmartPOS.pos.state.cart
                .reduce(
                    (
                        total,
                        item
                    ) =>
                        total +
                        Number(
                            item.quantity
                        ),
                    0
                );

        element.textContent =
            count;

    };


/* =========================================================
   CALCULATE
========================================================= */

SmartPOS.pos.calculate =
    function () {

        const cart =
            SmartPOS.pos.state.cart;

        const subtotal =
            cart.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    (
                        Number(item.price) *
                        Number(item.quantity)
                    ) -
                    Number(item.discount || 0),
                0
            );

        let discount =
            SmartPOS.pos.number(
                SmartPOS.pos.state
                    .discountValue
            );

        if (
            SmartPOS.pos.state
                .discountType ===
            "percent"
        ) {

            discount =
                subtotal *
                (
                    discount / 100
                );

        }

        discount =
            Math.min(
                discount,
                subtotal
            );

        const shipping =
            SmartPOS.pos.number(
                SmartPOS.pos.state
                    .shipping
            );

        const taxable =
            Math.max(
                0,
                subtotal -
                discount
            );

        const taxRate =
            SmartPOS.pos.number(
                SmartPOS.pos.state
                    .taxRate
            );

        const tax =
            taxable *
            (
                taxRate / 100
            );

        const total =
            Math.max(
                0,
                taxable +
                tax +
                shipping
            );

        const paid =
            SmartPOS.pos.number(
                SmartPOS.pos.state
                    .paidAmount
            );

        const change =
            Math.max(
                0,
                paid - total
            );

        SmartPOS.pos.updateSummary(
            {
                subtotal,
                discount,
                tax,
                shipping,
                total,
                paid,
                change
            }
        );

        return {

            subtotal,

            discount,

            tax,

            shipping,

            total,

            paid,

            change

        };

    };


/* =========================================================
   UPDATE SUMMARY
========================================================= */

SmartPOS.pos.updateSummary =
    function (
        values
    ) {

        const map = {

            subtotal:
                values.subtotal,

            discount:
                values.discount,

            tax:
                values.tax,

            shipping:
                values.shipping,

            total:
                values.total,

            paid:
                values.paid,

            change:
                values.change

        };

        Object.entries(
            map
        ).forEach(
            ([key, value]) => {

                const selector =
                    SmartPOS.pos
                        .selectors[key];

                if (!selector) {
                    return;
                }

                const element =
                    SmartPOS.pos.$(
                        selector
                    );

                if (!element) {
                    return;
                }

                element.textContent =
                    SmartPOS.pos.money(
                        value
                    );

            }
        );

    };


/* =========================================================
   CLEAR CART
========================================================= */

SmartPOS.pos.clearCart =
    function () {

        if (
            !SmartPOS.pos.state.cart.length
        ) {

            return;

        }

        const confirmed =
            window.confirm(
                "هل تريد إفراغ الفاتورة الحالية؟"
            );

        if (!confirmed) {
            return;
        }

        SmartPOS.pos.state.cart =
            [];

        SmartPOS.pos.state
            .selectedCustomer =
            null;

        SmartPOS.pos.state
            .discountValue =
            0;

        SmartPOS.pos.state
            .shipping =
            0;

        SmartPOS.pos.state
            .paidAmount =
            0;

        SmartPOS.pos.renderCart();

        SmartPOS.pos.calculate();

        SmartPOS.pos.saveCart();

        SmartPOS.pos.notify(
            "تم إفراغ الفاتورة.",
            "success"
        );

    };


/* =========================================================
   SAVE CART
========================================================= */

SmartPOS.pos.saveCart =
    function () {

        try {

            localStorage.setItem(
                "smartpos_current_cart",
                JSON.stringify(
                    SmartPOS.pos.state.cart
                )
            );

        } catch (error) {

            console.warn(
                "Unable to save cart:",
                error
            );

        }

    };


/* =========================================================
   RESTORE CART
========================================================= */

SmartPOS.pos.restoreCart =
    function () {

        try {

            const saved =
                localStorage.getItem(
                    "smartpos_current_cart"
                );

            if (!saved) {
                return;
            }

            const cart =
                JSON.parse(
                    saved
                );

            if (
                Array.isArray(cart)
            ) {

                SmartPOS.pos.state.cart =
                    cart;

            }

        } catch (error) {

            console.warn(
                "Unable to restore cart:",
                error
            );

        }

    };


/* =========================================================
   CHECKOUT
========================================================= */

SmartPOS.pos.checkout =
    async function () {

        if (
            SmartPOS.pos.state.processing
        ) {

            return;

        }

        const cart =
            SmartPOS.pos.state.cart;

        if (
            !cart.length
        ) {

            SmartPOS.pos.notify(
                "الفاتورة فارغة.",
                "warning"
            );

            return;

        }

        const totals =
            SmartPOS.pos.calculate();

        const paymentMethod =
            SmartPOS.pos.state
                .paymentMethod;

        if (
            totals.paid <
            totals.total &&
            paymentMethod === "cash"
        ) {

            SmartPOS.pos.notify(
                "المبلغ المدفوع أقل من إجمالي الفاتورة.",
                "warning"
            );

            return;

        }

        const endpoint =
            SmartPOS.pos.state
                .endpoints
                .createSale;

        if (!endpoint) {

            SmartPOS.pos.notify(
                "لم يتم إعداد رابط إنشاء البيع في Flask.",
                "error"
            );

            return;

        }

        const payload = {

            customer_id:
                SmartPOS.pos.state
                    .selectedCustomer?.id ||
                null,

            items:
                cart.map(
                    item => ({

                        product_id:
                            item.product_id,

                        quantity:
                            Number(
                                item.quantity
                            ),

                        price:
                            Number(
                                item.price
                            ),

                        discount:
                            Number(
                                item.discount || 0
                            )

                    })
                ),

            payment_method:
                paymentMethod,

            subtotal:
                totals.subtotal,

            discount:
                totals.discount,

            tax:
                totals.tax,

            tax_rate:
                SmartPOS.pos.state
                    .taxRate,

            shipping:
                totals.shipping,

            total:
                totals.total,

            paid_amount:
                totals.paid,

            change_amount:
                totals.change

        };

        SmartPOS.pos.state.processing =
            true;

        SmartPOS.pos.setCheckoutLoading(
            true
        );

        try {

            const response =
                await SmartPOS.pos.request(
                    endpoint,
                    {

                        method:
                            "POST",

                        body:
                            JSON.stringify(
                                payload
                            )

                    }
                );

            const data =
                response.data ||
                response;

            SmartPOS.pos.state
                .invoiceNumber =
                data.invoice_number ||
                data.invoiceNumber ||
                data.sale?.invoice_number ||
                null;

            SmartPOS.pos.notify(
                response.message ||
                "تمت عملية البيع بنجاح.",
                "success"
            );

            SmartPOS.pos.clearAfterSale();

            if (
                data.invoice_url
            ) {

                window.location.href =
                    data.invoice_url;

                return;

            }

            if (
                data.redirect_url
            ) {

                window.location.href =
                    data.redirect_url;

                return;

            }

            if (
                typeof SmartPOS.invoice
                    ?.open ===
                "function" &&
                data.invoice
            ) {

                SmartPOS.invoice.open(
                    data.invoice
                );

            }

        } catch (error) {

            console.error(
                "Checkout error:",
                error
            );

            SmartPOS.pos.notify(
                error.message ||
                "فشلت عملية البيع.",
                "error"
            );

        } finally {

            SmartPOS.pos.state.processing =
                false;

            SmartPOS.pos.setCheckoutLoading(
                false
            );

        }

    };


/* =========================================================
   CLEAR AFTER SALE
========================================================= */

SmartPOS.pos.clearAfterSale =
    function () {

        SmartPOS.pos.state.cart =
            [];

        SmartPOS.pos.state
            .selectedCustomer =
            null;

        SmartPOS.pos.state
            .discountValue =
            0;

        SmartPOS.pos.state
            .shipping =
            0;

        SmartPOS.pos.state
            .paidAmount =
            0;

        SmartPOS.pos.saveCart();

        SmartPOS.pos.renderCart();

        SmartPOS.pos.calculate();

        const paid =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .paid
            );

        if (paid) {

            paid.value = "";

        }

    };


/* =========================================================
   PAYMENT METHOD
========================================================= */

SmartPOS.pos.setPaymentMethod =
    function (
        method
    ) {

        const allowed = [

            "cash",

            "card",

            "bank",

            "wallet",

            "credit"

        ];

        if (
            !allowed.includes(
                method
            )
        ) {

            method = "cash";

        }

        SmartPOS.pos.state
            .paymentMethod =
            method;

        SmartPOS.pos.calculate();

    };


/* =========================================================
   CUSTOMER LOADING
========================================================= */

SmartPOS.pos.loadCustomers =
    async function () {

        const endpoint =
            SmartPOS.pos.state
                .endpoints
                .customers;

        if (!endpoint) {
            return;
        }

        try {

            const response =
                await SmartPOS.pos.request(
                    endpoint,
                    {
                        method: "GET"
                    }
                );

            const data =
                response.data ||
                response;

            SmartPOS.pos.state.customers =
                data.customers ||
                data.items ||
                [];

            SmartPOS.pos.renderCustomers();

        } catch (error) {

            console.warn(
                "Customers loading error:",
                error
            );

        }

    };


/* =========================================================
   RENDER CUSTOMERS
========================================================= */

SmartPOS.pos.renderCustomers =
    function () {

        const container =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .customer
            );

        if (
            !container ||
            container.tagName !==
                "SELECT"
        ) {

            return;

        }

        const current =
            container.value;

        container.innerHTML = `

            <option value="">
                عميل نقدي / بدون عميل
            </option>

        `;

        SmartPOS.pos.state
            .customers
            .forEach(
                customer => {

                    const id =
                        customer.id;

                    const name =
                        customer.name ||
                        customer.full_name ||
                        "عميل";

                    const option =
                        document.createElement(
                            "option"
                        );

                    option.value =
                        id;

                    option.textContent =
                        name;

                    container.appendChild(
                        option
                    );

                }
            );

        if (current) {

            container.value =
                current;

        }

    };


/* =========================================================
   SELECT CUSTOMER
========================================================= */

SmartPOS.pos.selectCustomer =
    function (
        customerId
    ) {

        const customer =
            SmartPOS.pos.state
                .customers
                .find(
                    item =>
                        String(
                            item.id
                        ) ===
                        String(
                            customerId
                        )
                );

        SmartPOS.pos.state
            .selectedCustomer =
            customer ||
            null;

    };


/* =========================================================
   HOLD SALE
========================================================= */

SmartPOS.pos.holdSale =
    function () {

        if (
            !SmartPOS.pos.state.cart.length
        ) {

            SmartPOS.pos.notify(
                "لا توجد منتجات لحفظ الفاتورة.",
                "warning"
            );

            return;

        }

        const heldSales =
            SmartPOS.pos
                .getHeldSales();

        const sale = {

            id:
                Date.now(),

            created_at:
                new Date()
                    .toISOString(),

            customer:
                SmartPOS.pos.state
                    .selectedCustomer,

            cart:
                SmartPOS.pos.state
                    .cart,

            paymentMethod:
                SmartPOS.pos.state
                    .paymentMethod,

            discountType:
                SmartPOS.pos.state
                    .discountType,

            discountValue:
                SmartPOS.pos.state
                    .discountValue,

            taxRate:
                SmartPOS.pos.state
                    .taxRate,

            shipping:
                SmartPOS.pos.state
                    .shipping

        };

        heldSales.push(
            sale
        );

        SmartPOS.pos.saveHeldSales(
            heldSales
        );

        SmartPOS.pos.state.cart =
            [];

        SmartPOS.pos.renderCart();

        SmartPOS.pos.calculate();

        SmartPOS.pos.notify(
            "تم تعليق الفاتورة.",
            "success"
        );

    };


/* =========================================================
   HELD SALES
========================================================= */

SmartPOS.pos.getHeldSales =
    function () {

        try {

            const data =
                localStorage.getItem(
                    "smartpos_held_sales"
                );

            return data
                ? JSON.parse(data)
                : [];

        } catch {

            return [];

        }

    };


SmartPOS.pos.saveHeldSales =
    function (
        sales
    ) {

        localStorage.setItem(
            "smartpos_held_sales",
            JSON.stringify(
                sales
            )
        );

    };


/* =========================================================
   RESTORE HELD SALE
========================================================= */

SmartPOS.pos.restoreHeldSale =
    function (
        saleId
    ) {

        const sales =
            SmartPOS.pos
                .getHeldSales();

        const sale =
            sales.find(
                item =>
                    String(
                        item.id
                    ) ===
                    String(
                        saleId
                    )
            );

        if (!sale) {

            SmartPOS.pos.notify(
                "الفاتورة المعلقة غير موجودة.",
                "error"
            );

            return;

        }

        SmartPOS.pos.state.cart =
            sale.cart || [];

        SmartPOS.pos.state
            .selectedCustomer =
            sale.customer || null;

        SmartPOS.pos.state
            .paymentMethod =
            sale.paymentMethod ||
            "cash";

        SmartPOS.pos.state
            .discountType =
            sale.discountType ||
            "fixed";

        SmartPOS.pos.state
            .discountValue =
            sale.discountValue ||
            0;

        SmartPOS.pos.state
            .taxRate =
            sale.taxRate ||
            0;

        SmartPOS.pos.state
            .shipping =
            sale.shipping ||
            0;

        const remaining =
            sales.filter(
                item =>
                    String(
                        item.id
                    ) !==
                    String(
                        saleId
                    )
            );

        SmartPOS.pos.saveHeldSales(
            remaining
        );

        SmartPOS.pos.renderCart();

        SmartPOS.pos.calculate();

        SmartPOS.pos.notify(
            "تم استرجاع الفاتورة المعلقة.",
            "success"
        );

    };


/* =========================================================
   CHECKOUT LOADING
========================================================= */

SmartPOS.pos.setCheckoutLoading =
    function (
        loading
    ) {

        const button =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .checkout
            );

        if (!button) {
            return;
        }

        button.disabled =
            loading;

        button.classList.toggle(
            "is-loading",
            loading
        );

        const text =
            button.querySelector(
                "[data-checkout-text]"
            );

        if (text) {

            text.textContent =
                loading
                    ? "جاري تنفيذ البيع..."
                    : "إتمام البيع";

        }

    };


/* =========================================================
   GENERAL LOADING
========================================================= */

SmartPOS.pos.setLoading =
    function (
        loading
    ) {

        const root =
            SmartPOS.pos.getRoot();

        if (!root) {
            return;
        }

        root.classList.toggle(
            "pos-loading",
            loading
        );

        const indicator =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .loading
            );

        if (indicator) {

            indicator.hidden =
                !loading;

        }

    };


/* =========================================================
   NOTIFICATION
========================================================= */

SmartPOS.pos.notify =
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
   HANDLE CLICKS
========================================================= */

SmartPOS.pos.handleClick =
    function (
        event
    ) {

        const addButton =
            event.target.closest(
                "[data-add-product]"
            );

        if (addButton) {

            SmartPOS.pos.addProduct(
                addButton.dataset.id
            );

            return;

        }


        const removeButton =
            event.target.closest(
                "[data-cart-remove]"
            );

        if (removeButton) {

            SmartPOS.pos.removeProduct(
                removeButton.dataset.id
            );

            return;

        }


        const plusButton =
            event.target.closest(
                "[data-cart-plus]"
            );

        if (plusButton) {

            const item =
                SmartPOS.pos.state.cart
                    .find(
                        cartItem =>
                            String(
                                cartItem.product_id
                            ) ===
                            String(
                                plusButton.dataset.id
                            )
                    );

            if (item) {

                SmartPOS.pos.changeQuantity(
                    item.product_id,
                    item.quantity + 1
                );

            }

            return;

        }


        const minusButton =
            event.target.closest(
                "[data-cart-minus]"
            );

        if (minusButton) {

            const item =
                SmartPOS.pos.state.cart
                    .find(
                        cartItem =>
                            String(
                                cartItem.product_id
                            ) ===
                            String(
                                minusButton.dataset.id
                            )
                    );

            if (item) {

                SmartPOS.pos.changeQuantity(
                    item.product_id,
                    item.quantity - 1
                );

            }

            return;

        }

    };


/* =========================================================
   BIND EVENTS
========================================================= */

SmartPOS.pos.bindEvents =
    function () {

        const root =
            SmartPOS.pos.getRoot();

        if (!root) {
            return;
        }


        /* CLICK */

        root.addEventListener(
            "click",
            SmartPOS.pos.handleClick
        );


        /* SEARCH */

        const search =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .productSearch
            );

        if (search) {

            let timer = null;

            search.addEventListener(
                "input",
                event => {

                    clearTimeout(
                        timer
                    );

                    timer =
                        setTimeout(
                            () => {

                                SmartPOS.pos
                                    .searchProducts(
                                        event.target.value
                                    );

                            },
                            300
                        );

                }
            );

        }


        /* CATEGORY */

        const category =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .categoryFilter
            );

        if (category) {

            category.addEventListener(
                "change",
                event => {

                    SmartPOS.pos.state
                        .category =
                        event.target.value;

                    SmartPOS.pos
                        .filterLocalProducts();

                }
            );

        }


        /* PAYMENT */

        const payment =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .paymentMethod
            );

        if (payment) {

            payment.addEventListener(
                "change",
                event => {

                    SmartPOS.pos
                        .setPaymentMethod(
                            event.target.value
                        );

                }
            );

        }


        /* CUSTOMER */

        const customer =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .customer
            );

        if (customer) {

            customer.addEventListener(
                "change",
                event => {

                    SmartPOS.pos
                        .selectCustomer(
                            event.target.value
                        );

                }
            );

        }


        /* DISCOUNT TYPE */

        const discountType =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .discountType
            );

        if (discountType) {

            discountType.addEventListener(
                "change",
                event => {

                    SmartPOS.pos.state
                        .discountType =
                        event.target.value;

                    SmartPOS.pos
                        .calculate();

                }
            );

        }


        /* DISCOUNT VALUE */

        const discountValue =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .discountValue
            );

        if (discountValue) {

            discountValue.addEventListener(
                "input",
                event => {

                    SmartPOS.pos.state
                        .discountValue =
                        SmartPOS.pos.number(
                            event.target.value
                        );

                    SmartPOS.pos
                        .calculate();

                }
            );

        }


        /* TAX */

        const taxRate =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .taxRate
            );

        if (taxRate) {

            taxRate.addEventListener(
                "input",
                event => {

                    SmartPOS.pos.state
                        .taxRate =
                        SmartPOS.pos.number(
                            event.target.value
                        );

                    SmartPOS.pos
                        .calculate();

                }
            );

        }


        /* SHIPPING */

        const shipping =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .shippingInput
            );

        if (shipping) {

            shipping.addEventListener(
                "input",
                event => {

                    SmartPOS.pos.state
                        .shipping =
                        SmartPOS.pos.number(
                            event.target.value
                        );

                    SmartPOS.pos
                        .calculate();

                }
            );

        }


        /* PAID */

        const paid =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .paid
            );

        if (paid) {

            paid.addEventListener(
                "input",
                event => {

                    SmartPOS.pos.state
                        .paidAmount =
                        SmartPOS.pos.number(
                            event.target.value
                        );

                    SmartPOS.pos
                        .calculate();

                }
            );

        }


        /* CLEAR */

        const clear =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .clear
            );

        if (clear) {

            clear.addEventListener(
                "click",
                SmartPOS.pos.clearCart
            );

        }


        /* CHECKOUT */

        const checkout =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .checkout
            );

        if (checkout) {

            checkout.addEventListener(
                "click",
                SmartPOS.pos.checkout
            );

        }


        /* HOLD */

        const hold =
            SmartPOS.pos.$(
                SmartPOS.pos
                    .selectors
                    .hold
            );

        if (hold) {

            hold.addEventListener(
                "click",
                SmartPOS.pos.holdSale
            );

        }


        /* CART QUANTITY */

        root.addEventListener(
            "change",
            event => {

                if (
                    event.target.matches(
                        "[data-cart-quantity]"
                    )
                ) {

                    SmartPOS.pos
                        .changeQuantity(
                            event.target.dataset.id,
                            event.target.value
                        );

                }

            }
        );


        /* KEYBOARD SHORTCUTS */

        document.addEventListener(
            "keydown",
            event => {

                if (
                    event.ctrlKey &&
                    event.key.toLowerCase() ===
                        "enter"
                ) {

                    event.preventDefault();

                    SmartPOS.pos.checkout();

                }


                if (
                    event.key === "F2"
                ) {

                    event.preventDefault();

                    search?.focus();

                }


                if (
                    event.key === "Escape"
                ) {

                    const active =
                        document.activeElement;

                    if (
                        active &&
                        active.tagName ===
                            "INPUT"
                    ) {

                        active.blur();

                    }

                }

            }
        );

    };


/* =========================================================
   START
========================================================= */

if (
    document.readyState ===
    "loading"
) {

    document.addEventListener(
        "DOMContentLoaded",
        SmartPOS.pos.init
    );

} else {

    SmartPOS.pos.init();

}