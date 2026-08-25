

/* ============================================================
   SMART POS / ERP
   users.js
   ------------------------------------------------------------
   إدارة المستخدمين والصلاحيات
   - Load users
   - Search
   - Filters
   - Pagination
   - Create user
   - Update user
   - Delete user
   - Activate / deactivate
   - Change role
   - CSRF protection
   - Flask API integration
   - Notifications integration
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

        deleting: false,

        controller: null,

        page: 1,

        perPage: 25,

        totalPages: 1,

        totalItems: 0,

        search: '',

        role: '',

        status: '',

        sortBy: 'created_at',

        sortOrder: 'desc',

        users: [],

        selectedUser: null
    };


    /* ============================================================
       DOM HELPERS
       ============================================================ */

    function $(selector, parent) {

        return (parent || document).querySelector(
            selector
        );
    }


    function $all(selector, parent) {

        return Array.prototype.slice.call(
            (parent || document).querySelectorAll(
                selector
            )
        );
    }


    function getRoot() {

        return $(
            '[data-users-page]'
        ) || $(
            '#users-page'
        ) || $(
            'main'
        );
    }


    function getValue(selector, fallback) {

        var element =
            $(selector);


        if (!element) {
            return fallback || '';
        }


        return element.value;
    }


    function setText(selector, value) {

        var element =
            $(selector);


        if (!element) {
            return;
        }


        element.textContent =
            value === null ||
            value === undefined
                ? ''
                : String(value);
    }


    /* ============================================================
       ENDPOINTS
       ============================================================ */

    function getEndpoint(name) {

        var root =
            getRoot();


        if (
            root &&
            root.dataset &&
            root.dataset[name]
        ) {

            return root.dataset[name];
        }


        var meta =
            $(
                'meta[name="' +
                name +
                '"]'
            );


        if (meta) {

            return (
                meta.getAttribute(
                    'content'
                ) || ''
            );
        }


        return '';
    }


    /* ============================================================
       CSRF
       ============================================================ */

    function getCSRFToken() {

        var meta =
            $(
                'meta[name="csrf-token"]'
            );


        if (meta) {

            return (
                meta.getAttribute(
                    'content'
                ) || ''
            );
        }


        var input =
            $(
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

        type =
            type || 'info';


        if (
            SmartPOS &&
            typeof SmartPOS.notify ===
            'function'
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


        if (
            type === 'error'
        ) {

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

    function setLoading(value) {

        state.loading =
            Boolean(value);


        var root =
            getRoot();


        if (root) {

            root.classList.toggle(
                'is-loading',
                state.loading
            );
        }


        var loader =
            $(
                '[data-users-loading]'
            );


        if (loader) {

            loader.hidden =
                !state.loading;
        }
    }


    /* ============================================================
       READ FILTERS
       ============================================================ */

    function readFilters() {

        state.search =
            getValue(
                '[data-users-search]',
                ''
            ).trim();


        state.role =
            getValue(
                '[data-users-role]',
                ''
            );


        state.status =
            getValue(
                '[data-users-status]',
                ''
            );


        var perPage =
            Number(
                getValue(
                    '[data-users-per-page]',
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
       QUERY BUILDER
       ============================================================ */

    function buildQuery(extra) {

        var params =
            new URLSearchParams();


        var values = {

            search:
                state.search,

            role:
                state.role,

            status:
                state.status,

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
                    'رابط API المطلوب غير موجود.'
                )
            );
        }


        if (
            state.controller &&
            options.cancelPrevious !== false
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
            options.body !== undefined
        ) {

            headers[
                'Content-Type'
            ] =
                'application/json';
        }


        var csrf =
            getCSRFToken();


        if (csrf) {

            headers[
                'X-CSRFToken'
            ] =
                csrf;
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
                    options.body !== undefined
                        ? options.body
                        : undefined,

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

                            var data =
                                {};


                            if (text) {

                                try {

                                    data =
                                        JSON.parse(
                                            text
                                        );

                                } catch (error) {

                                    data = {

                                        message:
                                            text
                                    };
                                }
                            }


                            if (
                                !response.ok
                            ) {

                                throw new Error(

                                    data.message ||
                                    data.error ||
                                    data.detail ||

                                    'حدث خطأ في الخادم. HTTP ' +
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
       NORMALIZE RESPONSE
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
                source.users
            )
        ) {

            state.users =
                source.users;

        } else if (
            Array.isArray(
                source.results
            )
        ) {

            state.users =
                source.results;

        } else if (
            Array.isArray(
                source.items
            )
        ) {

            state.users =
                source.items;

        } else if (
            Array.isArray(
                source
            )
        ) {

            state.users =
                source;

        } else {

            state.users =
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
                state.users.length
            ) || 0;


        var summary =
            source.summary ||
            source.statistics ||
            {};


        setText(
            '[data-users-total]',
            summary.total_users !==
            undefined

                ? summary.total_users

                : source.total_users !==
                  undefined

                    ? source.total_users

                    : state.totalItems
        );


        setText(
            '[data-users-active]',
            summary.active_users !==
            undefined

                ? summary.active_users

                : source.active_users !==
                  undefined

                    ? source.active_users

                    : ''
        );


        setText(
            '[data-users-inactive]',
            summary.inactive_users !==
            undefined

                ? summary.inactive_users

                : source.inactive_users !==
                  undefined

                    ? source.inactive_users

                    : ''
        );
    }


    /* ============================================================
       USER HELPERS
       ============================================================ */

    function getUserId(user) {

        if (
            user.id !== undefined
        ) {

            return user.id;
        }


        return user.user_id;
    }


    function getUserName(user) {

        return (
            user.name ||
            user.full_name ||
            user.username ||
            '-'
        );
    }


    function getUsername(user) {

        return (
            user.username ||
            user.email ||
            '-'
        );
    }


    function getRole(user) {

        return (
            user.role_name ||
            user.role ||
            '-'
        );
    }


    function isActive(user) {

        if (
            user.is_active !==
            undefined
        ) {

            return Boolean(
                user.is_active
            );
        }


        if (
            user.active !==
            undefined
        ) {

            return Boolean(
                user.active
            );
        }


        if (
            user.status !==
            undefined
        ) {

            return (
                user.status ===
                'active'
            );
        }


        return true;
    }


    /* ============================================================
       STATUS
       ============================================================ */

    function getStatus(user) {

        if (
            isActive(user)
        ) {

            return {

                key:
                    'active',

                label:
                    'نشط'
            };
        }


        return {

            key:
                'inactive',

            label:
                'غير نشط'
        };
    }


    /* ============================================================
       RENDER USERS
       ============================================================ */

    function renderUsers() {

        var body =
            $(
                '[data-users-body]'
            );


        if (!body) {
            return;
        }


        if (
            state.users.length ===
            0
        ) {

            body.innerHTML =

                '<tr>' +

                    '<td colspan="9" ' +
                        'class="users-empty">' +

                        'لا يوجد مستخدمون مطابقون للبحث.' +

                    '</td>' +

                '</tr>';

            return;
        }


        var html =
            '';


        state.users.forEach(
            function (user) {

                var id =
                    getUserId(
                        user
                    );


                var status =
                    getStatus(
                        user
                    );


                var role =
                    getRole(
                        user
                    );


                html +=

                    '<tr ' +

                        'data-user-id="' +
                        escapeHtml(id) +
                        '">' +

                        '<td>' +

                            escapeHtml(
                                id
                            ) +

                        '</td>' +


                        '<td>' +

                            '<strong>' +

                                escapeHtml(
                                    getUserName(
                                        user
                                    )
                                ) +

                            '</strong>' +

                        '</td>' +


                        '<td>' +

                            escapeHtml(
                                getUsername(
                                    user
                                )
                            ) +

                        '</td>' +


                        '<td>' +

                            escapeHtml(
                                user.email ||
                                '-'
                            ) +

                        '</td>' +


                        '<td>' +

                            escapeHtml(
                                role
                            ) +

                        '</td>' +


                        '<td>' +

                            '<span ' +

                                'class="user-status ' +
                                'user-status-' +
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

                            escapeHtml(
                                user.phone ||
                                '-'
                            ) +

                        '</td>' +


                        '<td>' +

                            formatDate(
                                user.last_login ||
                                user.last_login_at
                            ) +

                        '</td>' +


                        '<td>' +

                            '<div class="users-actions">' +

                                '<button ' +

                                    'type="button" ' +

                                    'data-user-action="edit" ' +

                                    'data-user-id="' +
                                    escapeHtml(id) +
                                    '">' +

                                    'تعديل' +

                                '</button>' +


                                '<button ' +

                                    'type="button" ' +

                                    'data-user-action="' +
                                    (
                                        isActive(user)
                                            ? 'deactivate'
                                            : 'activate'
                                    ) +
                                    '"' +

                                    ' data-user-id="' +
                                    escapeHtml(id) +
                                    '">' +

                                    (
                                        isActive(user)
                                            ? 'تعطيل'
                                            : 'تفعيل'
                                    ) +

                                '</button>' +


                                '<button ' +

                                    'type="button" ' +

                                    'data-user-action="delete" ' +

                                    'data-user-id="' +
                                    escapeHtml(id) +
                                    '">' +

                                    'حذف' +

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
       PAGINATION
       ============================================================ */

    function renderPagination() {

        var container =
            $(
                '[data-users-pagination]'
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

                    'data-users-page="' +
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

                    'data-users-page="' +
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

                    'data-users-page="' +
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

        renderUsers();

        renderPagination();
    }


    /* ============================================================
       LOAD USERS
       ============================================================ */

    function load() {

        readFilters();


        var endpoint =
            getEndpoint(
                'usersEndpoint'
            );


        if (!endpoint) {

            notify(
                'لم يتم تعريف usersEndpoint في users.html.',
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
            endpoint.indexOf('?') === -1
                ? '?'
                : '&';


        return request(
            endpoint +
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
                        'SMART POS users.js:',
                        error
                    );


                    notify(
                        error.message ||
                        'تعذر تحميل المستخدمين.',
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
       FIND USER
       ============================================================ */

    function findUser(userId) {

        var found =
            null;


        state.users.some(
            function (user) {

                var id =
                    getUserId(
                        user
                    );


                if (
                    String(id) ===
                    String(userId)
                ) {

                    found =
                        user;

                    return true;
                }


                return false;
            }
        );


        return found;
    }


    /* ============================================================
       CREATE USER
       ============================================================ */

    function createUser(data) {

        var endpoint =
            getEndpoint(
                'usersCreateEndpoint'
            );


        if (!endpoint) {

            notify(
                'لم يتم تعريف usersCreateEndpoint.',
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


        if (
            !data ||
            typeof data !==
            'object'
        ) {

            notify(
                'بيانات المستخدم غير صحيحة.',
                'error'
            );

            return Promise.resolve(
                false
            );
        }


        state.saving =
            true;


        return request(
            endpoint,
            {

                method:
                    'POST',

                body:
                    JSON.stringify(
                        data
                    ),

                cancelPrevious:
                    false
            }
        )
        .then(
            function () {

                notify(
                    'تم إنشاء المستخدم بنجاح.',
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
                        'تعذر إنشاء المستخدم.',
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
       UPDATE USER
       ============================================================ */

    function updateUser(
        userId,
        data
    ) {

        var endpoint =
            getEndpoint(
                'usersUpdateEndpoint'
            );


        if (!endpoint) {

            notify(
                'لم يتم تعريف usersUpdateEndpoint.',
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


        if (
            !data ||
            typeof data !==
            'object'
        ) {

            notify(
                'بيانات التعديل غير صحيحة.',
                'error'
            );

            return Promise.resolve(
                false
            );
        }


        state.saving =
            true;


        var url =
            endpoint;


        if (
            endpoint.indexOf(
                '{id}'
            ) !== -1
        ) {

            url =
                endpoint.replace(
                    '{id}',
                    encodeURIComponent(
                        userId
                    )
                );

        } else {

            var separator =
                endpoint.indexOf('?') === -1
                    ? '?'
                    : '&';


            url +=
                separator +
                'id=' +
                encodeURIComponent(
                    userId
                );
        }


        return request(
            url,
            {

                method:
                    'PUT',

                body:
                    JSON.stringify(
                        data
                    ),

                cancelPrevious:
                    false
            }
        )
        .then(
            function () {

                notify(
                    'تم تحديث المستخدم بنجاح.',
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
                        'تعذر تحديث المستخدم.',
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
       DELETE USER
       ============================================================ */

    function deleteUser(
        userId
    ) {

        var endpoint =
            getEndpoint(
                'usersDeleteEndpoint'
            );


        if (!endpoint) {

            notify(
                'لم يتم تعريف usersDeleteEndpoint.',
                'error'
            );

            return Promise.resolve(
                false
            );
        }


        if (
            state.deleting
        ) {

            return Promise.resolve(
                false
            );
        }


        var user =
            findUser(
                userId
            );


        var name =
            user
                ? getUserName(user)
                : 'هذا المستخدم';


        var confirmed =
            window.confirm(
                'هل أنت متأكد من حذف ' +
                name +
                '؟\n\n' +
                'هذه العملية قد تكون غير قابلة للتراجع.'
            );


        if (
            !confirmed
        ) {

            return Promise.resolve(
                false
            );
        }


        state.deleting =
            true;


        var url =
            endpoint;


        if (
            endpoint.indexOf(
                '{id}'
            ) !== -1
        ) {

            url =
                endpoint.replace(
                    '{id}',
                    encodeURIComponent(
                        userId
                    )
                );

        } else {

            var separator =
                endpoint.indexOf('?') === -1
                    ? '?'
                    : '&';


            url +=
                separator +
                'id=' +
                encodeURIComponent(
                    userId
                );
        }


        return request(
            url,
            {

                method:
                    'DELETE',

                cancelPrevious:
                    false
            }
        )
        .then(
            function () {

                notify(
                    'تم حذف المستخدم بنجاح.',
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
                        'تعذر حذف المستخدم.',
                        'error'
                    );
                }


                return false;
            }
        )
        .then(
            function (result) {

                state.deleting =
                    false;


                return result;
            }
        );
    }


    /* ============================================================
       CHANGE STATUS
       ============================================================ */

    function changeStatus(
        userId,
        active
    ) {

        var endpoint =
            getEndpoint(
                'usersStatusEndpoint'
            );


        if (!endpoint) {

            notify(
                'لم يتم تعريف usersStatusEndpoint.',
                'error'
            );

            return Promise.resolve(
                false
            );
        }


        var url =
            endpoint;


        if (
            endpoint.indexOf(
                '{id}'
            ) !== -1
        ) {

            url =
                endpoint.replace(
                    '{id}',
                    encodeURIComponent(
                        userId
                    )
                );
        }


        return request(
            url,
            {

                method:
                    'PATCH',

                body:
                    JSON.stringify(
                        {
                            user_id:
                                userId,

                            is_active:
                                Boolean(
                                    active
                                ),

                            active:
                                Boolean(
                                    active
                                )
                        }
                    ),

                cancelPrevious:
                    false
            }
        )
        .then(
            function () {

                notify(
                    active
                        ? 'تم تفعيل المستخدم.'
                        : 'تم تعطيل المستخدم.',
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
                        'تعذر تغيير حالة المستخدم.',
                        'error'
                    );
                }


                return false;
            }
        );
    }


    /* ============================================================
       CHANGE ROLE
       ============================================================ */

    function changeRole(
        userId,
        role
    ) {

        var endpoint =
            getEndpoint(
                'usersRoleEndpoint'
            );


        if (!endpoint) {

            notify(
                'لم يتم تعريف usersRoleEndpoint.',
                'error'
            );

            return Promise.resolve(
                false
            );
        }


        if (
            !role
        ) {

            notify(
                'الدور المطلوب غير محدد.',
                'error'
            );

            return Promise.resolve(
                false
            );
        }


        var url =
            endpoint;


        if (
            endpoint.indexOf(
                '{id}'
            ) !== -1
        ) {

            url =
                endpoint.replace(
                    '{id}',
                    encodeURIComponent(
                        userId
                    )
                );
        }


        return request(
            url,
            {

                method:
                    'PATCH',

                body:
                    JSON.stringify(
                        {
                            user_id:
                                userId,

                            role:
                                role
                        }
                    ),

                cancelPrevious:
                    false
            }
        )
        .then(
            function () {

                notify(
                    'تم تحديث صلاحيات المستخدم.',
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
                        'تعذر تغيير دور المستخدم.',
                        'error'
                    );
                }


                return false;
            }
        );
    }


    /* ============================================================
       EDIT
       ============================================================ */

    function editUser(
        userId
    ) {

        var user =
            findUser(
                userId
            );


        if (!user) {

            notify(
                'المستخدم غير موجود.',
                'error'
            );

            return;
        }


        state.selectedUser =
            user;


        var event =
            new CustomEvent(
                'smartpos:user-edit',
                {
                    detail:
                        user
                }
            );


        document.dispatchEvent(
            event
        );


        var modal =
            $(
                '[data-user-modal]'
            );


        if (
            modal
        ) {

            modal.classList.add(
                'is-open'
            );

            modal.removeAttribute(
                'hidden'
            );


            var form =
                $(
                    '[data-user-form]',
                    modal
                );


            if (
                form
            ) {

                populateForm(
                    form,
                    user
                );
            }
        }
    }


    /* ============================================================
       POPULATE FORM
       ============================================================ */

    function populateForm(
        form,
        user
    ) {

        var fields =
            form.querySelectorAll(
                '[name]'
            );


        Array.prototype.forEach.call(
            fields,
            function (field) {

                var name =
                    field.name;


                if (
                    name ===
                    'id' ||
                    name ===
                    'user_id'
                ) {

                    field.value =
                        getUserId(
                            user
                        );

                    return;
                }


                if (
                    user[name] !==
                    undefined
                ) {

                    field.value =
                        user[name];

                    return;
                }


                if (
                    name ===
                    'full_name' &&
                    user.name !==
                    undefined
                ) {

                    field.value =
                        user.name;
                }
            }
        );
    }


    /* ============================================================
       CLOSE MODAL
       ============================================================ */

    function closeModal() {

        var modal =
            $(
                '[data-user-modal]'
            );


        if (!modal) {
            return;
        }


        modal.classList.remove(
            'is-open'
        );


        modal.setAttribute(
            'hidden',
            ''
        );


        state.selectedUser =
            null;
    }


    /* ============================================================
       FORM SUBMIT
       ============================================================ */

    function handleFormSubmit(
        form
    ) {

        var formData =
            new FormData(
                form
            );


        var data =
            {};


        formData.forEach(
            function (value, key) {

                data[key] =
                    value;
            }
        );


        var id =
            data.id ||
            data.user_id;


        delete data.id;


        delete data.user_id;


        if (id) {

            return updateUser(
                id,
                data
            )
            .then(
                function (success) {

                    if (
                        success
                    ) {

                        closeModal();
                    }


                    return success;
                }
            );
        }


        return createUser(
            data
        )
        .then(
            function (success) {

                if (
                    success
                ) {

                    closeModal();
                }


                return success;
            }
        );
    }


    /* ============================================================
       RESET FILTERS
       ============================================================ */

    function resetFilters() {

        var search =
            $(
                '[data-users-search]'
            );


        var role =
            $(
                '[data-users-role]'
            );


        var status =
            $(
                '[data-users-status]'
            );


        if (search) {
            search.value =
                '';
        }


        if (role) {
            role.value =
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

        state.role =
            '';

        state.status =
            '';


        load();
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

        var filterForm =
            $(
                '[data-users-filter-form]',
                root
            );


        if (filterForm) {

            filterForm.addEventListener(
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
           SEARCH
        -------------------------------------------------------- */

        var search =
            $(
                '[data-users-search]',
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
           RESET
        -------------------------------------------------------- */

        var reset =
            $(
                '[data-users-reset]',
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
                '[data-users-refresh]',
                root
            );


        if (refresh) {

            refresh.addEventListener(
                'click',
                load
            );
        }


        /* --------------------------------------------------------
           ADD USER
        -------------------------------------------------------- */

        var addButton =
            $(
                '[data-user-add]',
                root
            );


        if (addButton) {

            addButton.addEventListener(
                'click',
                function () {

                    state.selectedUser =
                        null;


                    var modal =
                        $(
                            '[data-user-modal]'
                        );


                    if (modal) {

                        modal.classList.add(
                            'is-open'
                        );

                        modal.removeAttribute(
                            'hidden'
                        );


                        var form =
                            $(
                                '[data-user-form]',
                                modal
                            );


                        if (form) {

                            form.reset();
                        }
                    }
                }
            );
        }


        /* --------------------------------------------------------
           USER FORM
        -------------------------------------------------------- */

        var form =
            $(
                '[data-user-form]',
                root
            );


        if (form) {

            form.addEventListener(
                'submit',
                function (event) {

                    event.preventDefault();

                    handleFormSubmit(
                        form
                    );
                }
            );
        }


        /* --------------------------------------------------------
           CLOSE MODAL
        -------------------------------------------------------- */

        $all(
            '[data-user-modal-close]',
            root
        ).forEach(
            function (button) {

                button.addEventListener(
                    'click',
                    closeModal
                );
            }
        );


        /* --------------------------------------------------------
           TABLE ACTIONS
        -------------------------------------------------------- */

        root.addEventListener(
            'click',
            function (event) {

                var actionButton =
                    event.target.closest(
                        '[data-user-action]'
                    );


                if (
                    actionButton
                ) {

                    var action =
                        actionButton.getAttribute(
                            'data-user-action'
                        );


                    var userId =
                        actionButton.getAttribute(
                            'data-user-id'
                        );


                    if (
                        action ===
                        'edit'
                    ) {

                        editUser(
                            userId
                        );

                    } else if (
                        action ===
                        'delete'
                    ) {

                        deleteUser(
                            userId
                        );

                    } else if (
                        action ===
                        'activate'
                    ) {

                        changeStatus(
                            userId,
                            true
                        );

                    } else if (
                        action ===
                        'deactivate'
                    ) {

                        changeStatus(
                            userId,
                            false
                        );
                    }


                    return;
                }


                /* ------------------------------------------------
                   PAGINATION
                ------------------------------------------------ */

                var pageButton =
                    event.target.closest(
                        '[data-users-page]'
                    );


                if (
                    pageButton
                ) {

                    state.page =
                        Number(
                            pageButton.getAttribute(
                                'data-users-page'
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
                        '[data-users-sort]'
                    );


                if (
                    sortButton
                ) {

                    var column =
                        sortButton.getAttribute(
                            'data-users-sort'
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

    SmartPOS.users = {

        init:
            init,

        load:
            load,

        refresh:
            load,

        reset:
            resetFilters,

        create:
            createUser,

        update:
            updateUser,

        delete:
            deleteUser,

        activate:
            function (id) {

                return changeStatus(
                    id,
                    true
                );
            },

        deactivate:
            function (id) {

                return changeStatus(
                    id,
                    false
                );
            },

        changeRole:
            changeRole,

        edit:
            editUser,

        closeModal:
            closeModal,

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