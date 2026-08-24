

/* ============================================================
   SMART POS / ERP
   notifications.js
   ------------------------------------------------------------
   نظام الإشعارات المركزي للنظام

   المسؤوليات:
   - Toast notifications
   - Success / Error / Warning / Info
   - إشعارات قابلة للإغلاق
   - Auto hide
   - Notification center
   - قراءة الإشعارات من Flask API
   - تحديد الإشعار كمقروء
   - تحديد جميع الإشعارات كمقروءة
   - حذف الإشعار
   - عداد الإشعارات غير المقروءة
   - دعم RTL
   - دعم app.js وباقي ملفات النظام
   - منع XSS
   - AbortController
   - التعامل مع أخطاء API
   ============================================================ */

(function (window, document) {

    'use strict';


    /* ============================================================
       SMART POS GLOBAL
       ============================================================ */

    window.SmartPOS =
        window.SmartPOS || {};

    var SmartPOS =
        window.SmartPOS;


    /* ============================================================
       STATE
       ============================================================ */

    var state = {

        initialized: false,

        loading: false,

        markingRead: false,

        deleting: false,

        controller: null,

        notifications: [],

        unreadCount: 0,

        page: 1,

        perPage: 20,

        totalPages: 1,

        totalItems: 0,

        soundEnabled: true,

        toastDuration: 5000
    };


    /* ============================================================
       DOM HELPERS
       ============================================================ */

    function $(selector, parent) {

        return (
            parent ||
            document
        ).querySelector(
            selector
        );
    }


    function $all(selector, parent) {

        return Array.prototype.slice.call(
            (
                parent ||
                document
            ).querySelectorAll(
                selector
            )
        );
    }


    /* ============================================================
       ROOT
       ============================================================ */

    function getRoot() {

        return (
            $('[data-notifications]') ||
            $('#notifications-center') ||
            document.body
        );
    }


    /* ============================================================
       ENDPOINTS
       ------------------------------------------------------------
       يمكن تعريفها في HTML باستخدام data attributes:

       data-notifications-endpoint
       data-notification-read-endpoint
       data-notification-read-all-endpoint
       data-notification-delete-endpoint
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
       CSRF TOKEN
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

            return (
                input.value || ''
            );
        }


        return '';
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
       DATE FORMAT
       ============================================================ */

    function formatDate(value) {

        if (!value) {

            return '';
        }


        var date =
            new Date(
                value
            );


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
       RELATIVE TIME
       ============================================================ */

    function relativeTime(value) {

        if (!value) {

            return '';
        }


        var date =
            new Date(
                value
            );


        if (
            isNaN(
                date.getTime()
            )
        ) {

            return formatDate(
                value
            );
        }


        var seconds =
            Math.floor(
                (
                    Date.now() -
                    date.getTime()
                ) / 1000
            );


        if (
            seconds < 10
        ) {

            return 'الآن';
        }


        if (
            seconds < 60
        ) {

            return (
                'منذ ' +
                seconds +
                ' ثانية'
            );
        }


        var minutes =
            Math.floor(
                seconds / 60
            );


        if (
            minutes < 60
        ) {

            return (
                'منذ ' +
                minutes +
                ' دقيقة'
            );
        }


        var hours =
            Math.floor(
                minutes / 60
            );


        if (
            hours < 24
        ) {

            return (
                'منذ ' +
                hours +
                ' ساعة'
            );
        }


        var days =
            Math.floor(
                hours / 24
            );


        if (
            days < 30
        ) {

            return (
                'منذ ' +
                days +
                ' يوم'
            );
        }


        return formatDate(
            value
        );
    }


    /* ============================================================
       NORMALIZE TYPE
       ============================================================ */

    function normalizeType(type) {

        var allowed = [
            'success',
            'error',
            'warning',
            'info'
        ];


        type =
            String(
                type || 'info'
            ).toLowerCase();


        if (
            allowed.indexOf(
                type
            ) === -1
        ) {

            return 'info';
        }


        return type;
    }


    /* ============================================================
       ICON
       ============================================================ */

    function getIcon(type) {

        switch (
            normalizeType(type)
        ) {

            case 'success':

                return 'fa-solid fa-circle-check';

            case 'error':

                return 'fa-solid fa-circle-xmark';

            case 'warning':

                return 'fa-solid fa-triangle-exclamation';

            default:

                return 'fa-solid fa-circle-info';
        }
    }


    /* ============================================================
       NOTIFICATION MESSAGE
       ============================================================ */

    function getNotificationMessage(
        notification
    ) {

        return (
            notification.message ||
            notification.body ||
            notification.description ||
            notification.text ||
            ''
        );
    }


    /* ============================================================
       NOTIFICATION TITLE
       ============================================================ */

    function getNotificationTitle(
        notification
    ) {

        return (
            notification.title ||
            notification.subject ||
            'إشعار'
        );
    }


    /* ============================================================
       NOTIFICATION ID
       ============================================================ */

    function getNotificationId(
        notification
    ) {

        return (
            notification.id ??
            notification.notification_id
        );
    }


    /* ============================================================
       READ STATUS
       ============================================================ */

    function isRead(
        notification
    ) {

        if (
            notification.is_read !==
            undefined
        ) {

            return Boolean(
                notification.is_read
            );
        }


        if (
            notification.read !==
            undefined
        ) {

            return Boolean(
                notification.read
            );
        }


        return false;
    }


    /* ============================================================
       CURRENT USER
       ============================================================ */

    function getCurrentUserId() {

        var element =
            $(
                '[data-current-user-id]'
            );


        if (element) {

            return (
                element.getAttribute(
                    'data-current-user-id'
                ) || ''
            );
        }


        var meta =
            $(
                'meta[name="current-user-id"]'
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
       API REQUEST
       ============================================================ */

    function request(
        url,
        options
    ) {

        options =
            options || {};


        if (!url) {

            return Promise.reject(
                new Error(
                    'رابط الإشعارات غير موجود.'
                )
            );
        }


        var headers = {

            'Accept':
                'application/json'
        };


        if (
            options.body !==
            undefined
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
                    options.body !==
                    undefined
                        ? options.body
                        : undefined,

                signal:
                    options.signal
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

                                } catch (
                                    error
                                ) {

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
       TOAST CONTAINER
       ============================================================ */

    function getToastContainer() {

        var container =
            $(
                '[data-toast-container]'
            );


        if (container) {

            return container;
        }


        container =
            document.createElement(
                'div'
            );


        container.className =
            'smartpos-toast-container';


        container.setAttribute(
            'data-toast-container',
            ''
        );


        container.setAttribute(
            'aria-live',
            'polite'
        );


        container.setAttribute(
            'aria-atomic',
            'true'
        );


        document.body.appendChild(
            container
        );


        return container;
    }


    /* ============================================================
       TOAST
       ============================================================ */

    function notify(
        message,
        type,
        options
    ) {

        type =
            normalizeType(
                type
            );


        options =
            options || {};


        if (
            !message
        ) {

            return null;
        }


        var container =
            getToastContainer();


        var toast =
            document.createElement(
                'div'
            );


        toast.className =
            'smartpos-toast ' +
            'smartpos-toast-' +
            type;


        toast.setAttribute(
            'role',
            type === 'error'
                ? 'alert'
                : 'status'
        );


        var title =
            options.title ||
            (
                type === 'success'
                    ? 'تم بنجاح'
                    : type === 'error'
                        ? 'حدث خطأ'
                        : type === 'warning'
                            ? 'تنبيه'
                            : 'معلومة'
            );


        var duration =
            Number(
                options.duration ??
                state.toastDuration
            );


        toast.innerHTML =

            '<div class="smartpos-toast-icon">' +

                '<i class="' +
                escapeHtml(
                    getIcon(
                        type
                    )
                ) +
                '" aria-hidden="true"></i>' +

            '</div>' +


            '<div class="smartpos-toast-content">' +

                '<div class="smartpos-toast-title">' +

                    escapeHtml(
                        title
                    ) +

                '</div>' +

                '<div class="smartpos-toast-message">' +

                    escapeHtml(
                        message
                    ) +

                '</div>' +

            '</div>' +


            '<button ' +

                'type="button" ' +

                'class="smartpos-toast-close" ' +

                'aria-label="إغلاق الإشعار">' +

                '<i class="fa-solid fa-xmark"></i>' +

            '</button>';


        container.appendChild(
            toast
        );


        var close =
            $(
                '.smartpos-toast-close',
                toast
            );


        function removeToast() {

            if (
                !toast.parentNode
            ) {

                return;
            }


            toast.classList.add(
                'is-closing'
            );


            window.setTimeout(
                function () {

                    if (
                        toast.parentNode
                    ) {

                        toast.parentNode.removeChild(
                            toast
                        );
                    }
                },
                250
            );
        }


        if (close) {

            close.addEventListener(
                'click',
                removeToast
            );
        }


        if (
            duration > 0
        ) {

            window.setTimeout(
                removeToast,
                duration
            );
        }


        return toast;
    }


    /* ============================================================
       SOUND
       ------------------------------------------------------------
       الصوت لا يتم تشغيله تلقائيًا إلا إذا سمح المتصفح بذلك.
       ============================================================ */

    function playNotificationSound() {

        if (
            !state.soundEnabled
        ) {

            return;
        }


        var audio =
            $(
                '[data-notification-sound]'
            );


        if (!audio) {

            return;
        }


        try {

            audio.currentTime =
                0;

            var promise =
                audio.play();


            if (
                promise &&
                typeof promise.catch ===
                'function'
            ) {

                promise.catch(
                    function () {
                        /* Browser autoplay policy */
                    }
                );
            }

        } catch (
            error
        ) {

            console.debug(
                'Notification sound unavailable.',
                error
            );
        }
    }


    /* ============================================================
       RENDER NOTIFICATION CENTER
       ============================================================ */

    function renderCenter() {

        var container =
            $(
                '[data-notifications-list]'
            );


        if (!container) {

            return;
        }


        if (
            state.notifications.length ===
            0
        ) {

            container.innerHTML =

                '<div class="notifications-empty">' +

                    '<i class="fa-regular fa-bell-slash" ' +
                    'aria-hidden="true"></i>' +

                    '<span>' +

                        'لا توجد إشعارات حالياً.' +

                    '</span>' +

                '</div>';

            return;
        }


        var html =
            '';


        state.notifications.forEach(
            function (
                notification
            ) {

                var id =
                    getNotificationId(
                        notification
                    );


                var type =
                    normalizeType(
                        notification.type
                    );


                var read =
                    isRead(
                        notification
                    );


                html +=

                    '<article ' +

                        'class="notification-item ' +
                        (
                            read
                                ? 'is-read'
                                : 'is-unread'
                        ) +
                        '"' +

                        'data-notification-id="' +
                        escapeHtml(
                            id
                        ) +
                        '">' +


                        '<div class="notification-item-icon">' +

                            '<i class="' +
                            escapeHtml(
                                getIcon(
                                    type
                                )
                            ) +
                            '" aria-hidden="true"></i>' +

                        '</div>' +


                        '<div class="notification-item-content">' +

                            '<div class="notification-item-header">' +

                                '<h4>' +

                                    escapeHtml(
                                        getNotificationTitle(
                                            notification
                                        )
                                    ) +

                                '</h4>' +

                                (
                                    !read
                                        ? '<span class="notification-unread-dot" ' +
                                          'aria-label="غير مقروء"></span>'
                                        : ''
                                ) +

                            '</div>' +


                            '<p>' +

                                escapeHtml(
                                    getNotificationMessage(
                                        notification
                                    )
                                ) +

                            '</p>' +


                            '<time ' +

                                'datetime="' +
                                escapeHtml(
                                    notification.created_at ||
                                    notification.created ||
                                    ''
                                ) +
                                '">' +

                                escapeHtml(
                                    relativeTime(
                                        notification.created_at ||
                                        notification.created
                                    )
                                ) +

                            '</time>' +

                        '</div>' +


                        '<div class="notification-item-actions">' +

                            (
                                !read

                                    ? '<button ' +
                                      'type="button" ' +
                                      'data-notification-action="read" ' +
                                      'data-notification-id="' +
                                      escapeHtml(id) +
                                      '">' +
                                      'تحديد كمقروء' +
                                      '</button>'

                                    : ''
                            ) +

                            '<button ' +

                                'type="button" ' +

                                'data-notification-action="delete" ' +

                                'data-notification-id="' +
                                escapeHtml(id) +
                                '">' +

                                'حذف' +

                            '</button>' +

                        '</div>' +

                    '</article>';
            }
        );


        container.innerHTML =
            html;
    }


    /* ============================================================
       UPDATE BADGES
       ============================================================ */

    function updateBadges() {

        var badges =
            $all(
                '[data-notifications-count]'
            );


        badges.forEach(
            function (badge) {

                badge.textContent =
                    String(
                        state.unreadCount
                    );


                badge.hidden =
                    state.unreadCount <= 0;
            }
        );


        var containers =
            $all(
                '[data-notifications-badge]'
            );


        containers.forEach(
            function (element) {

                element.classList.toggle(
                    'has-notifications',
                    state.unreadCount > 0
                );
            }
        );
    }


    /* ============================================================
       NORMALIZE API RESPONSE
       ============================================================ */

    function normalizeResponse(
        data
    ) {

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

            source =
                {};
        }


        if (
            Array.isArray(
                source.notifications
            )
        ) {

            state.notifications =
                source.notifications;

        } else if (
            Array.isArray(
                source.items
            )
        ) {

            state.notifications =
                source.items;

        } else if (
            Array.isArray(
                source.results
            )
        ) {

            state.notifications =
                source.results;

        } else if (
            Array.isArray(
                source
            )
        ) {

            state.notifications =
                source;

        } else {

            state.notifications =
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
                state.notifications.length
            ) || 0;


        state.unreadCount =
            Number(
                source.unread_count ??
                source.unread ??
                state.notifications.filter(
                    function (
                        notification
                    ) {

                        return !isRead(
                            notification
                        );
                    }
                ).length
            ) || 0;


        updateBadges();

        renderCenter();
    }


    /* ============================================================
       LOAD NOTIFICATIONS
       ============================================================ */

    function load(
        options
    ) {

        options =
            options || {};


        var endpoint =
            getEndpoint(
                'notificationsEndpoint'
            );


        if (!endpoint) {

            /*
             * لا نعرض إشعارات وهمية.
             * إذا لم يكن Flask قد عرّف endpoint،
             * يبقى المركز فارغًا.
             */

            state.notifications =
                [];

            state.unreadCount =
                0;

            updateBadges();

            renderCenter();

            return Promise.resolve(
                false
            );
        }


        if (
            state.controller
        ) {

            state.controller.abort();
        }


        state.controller =
            new AbortController();


        state.loading =
            true;


        var params =
            new URLSearchParams();


        params.set(
            'page',
            state.page
        );


        params.set(
            'per_page',
            state.perPage
        );


        if (
            options.unreadOnly
        ) {

            params.set(
                'unread_only',
                '1'
            );
        }


        var userId =
            getCurrentUserId();


        if (
            userId
        ) {

            params.set(
                'user_id',
                userId
            );
        }


        var separator =
            endpoint.indexOf('?') === -1
                ? '?'
                : '&';


        return request(
            endpoint +
            separator +
            params.toString(),
            {
                signal:
                    state.controller.signal
            }
        )
        .then(
            function (data) {

                normalizeResponse(
                    data
                );

                return true;
            }
        )
        .catch(
            function (error) {

                if (
                    error.name !==
                    'AbortError'
                ) {

                    console.error(
                        'SMART POS notifications:',
                        error
                    );

                    notify(
                        error.message ||
                        'تعذر تحميل الإشعارات.',
                        'error'
                    );
                }


                return false;
            }
        )
        .finally(
            function () {

                state.loading =
                    false;
            }
        );
    }


    /* ============================================================
       FIND NOTIFICATION
       ============================================================ */

    function findNotification(
        id
    ) {

        return (
            state.notifications.find(
                function (
                    notification
                ) {

                    return String(
                        getNotificationId(
                            notification
                        )
                    ) ===
                    String(id);
                }
            ) ||
            null
        );
    }


    /* ============================================================
       MARK AS READ
       ============================================================ */

    function markAsRead(
        id
    ) {

        var notification =
            findNotification(
                id
            );


        if (
            notification &&
            isRead(
                notification
            )
        ) {

            return Promise.resolve(
                true
            );
        }


        var endpoint =
            getEndpoint(
                'notificationReadEndpoint'
            );


        if (!endpoint) {

            notify(
                'لم يتم تعريف endpoint الخاص بقراءة الإشعارات.',
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
                        id
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
                            id:
                                id,

                            notification_id:
                                id,

                            is_read:
                                true
                        }
                    )
            }
        )
        .then(
            function () {

                if (
                    notification
                ) {

                    notification.is_read =
                        true;

                    notification.read =
                        true;
                }


                if (
                    state.unreadCount >
                    0
                ) {

                    state.unreadCount--;
                }


                updateBadges();

                renderCenter();

                return true;
            }
        )
        .catch(
            function (error) {

                console.error(
                    error
                );


                notify(
                    error.message ||
                    'تعذر تحديث الإشعار.',
                    'error'
                );


                return false;
            }
        );
    }


    /* ============================================================
       MARK ALL AS READ
       ============================================================ */

    function markAllAsRead() {

        var endpoint =
            getEndpoint(
                'notificationReadAllEndpoint'
            );


        if (!endpoint) {

            notify(
                'لم يتم تعريف endpoint الخاص بتحديث جميع الإشعارات.',
                'error'
            );

            return Promise.resolve(
                false
            );
        }


        if (
            state.markingRead
        ) {

            return Promise.resolve(
                false
            );
        }


        state.markingRead =
            true;


        return request(
            endpoint,
            {

                method:
                    'PATCH',

                body:
                    JSON.stringify(
                        {
                            mark_all:
                                true,

                            user_id:
                                getCurrentUserId()
                        }
                    )
            }
        )
        .then(
            function () {

                state.notifications.forEach(
                    function (
                        notification
                    ) {

                        notification.is_read =
                            true;

                        notification.read =
                            true;
                    }
                );


                state.unreadCount =
                    0;


                updateBadges();

                renderCenter();


                notify(
                    'تم تحديد جميع الإشعارات كمقروءة.',
                    'success'
                );


                return true;
            }
        )
        .catch(
            function (error) {

                console.error(
                    error
                );


                notify(
                    error.message ||
                    'تعذر تحديث الإشعارات.',
                    'error'
                );


                return false;
            }
        )
        .finally(
            function () {

                state.markingRead =
                    false;
            }
        );
    }


    /* ============================================================
       DELETE NOTIFICATION
       ============================================================ */

    function deleteNotification(
        id
    ) {

        var endpoint =
            getEndpoint(
                'notificationDeleteEndpoint'
            );


        if (!endpoint) {

            notify(
                'لم يتم تعريف endpoint الخاص بحذف الإشعار.',
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


        var notification =
            findNotification(
                id
            );


        var confirmed =
            window.confirm(
                'هل تريد حذف هذا الإشعار؟'
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
                        id
                    )
                );
        }


        return request(
            url,
            {

                method:
                    'DELETE',

                body:
                    JSON.stringify(
                        {
                            id:
                                id,

                            notification_id:
                                id
                        }
                    )
            }
        )
        .then(
            function () {

                state.notifications =
                    state.notifications.filter(
                        function (
                            item
                        ) {

                            return String(
                                getNotificationId(
                                    item
                                )
                            ) !==
                            String(id);
                        }
                    );


                if (
                    notification &&
                    !isRead(
                        notification
                    ) &&
                    state.unreadCount > 0
                ) {

                    state.unreadCount--;
                }


                updateBadges();

                renderCenter();


                notify(
                    'تم حذف الإشعار.',
                    'success'
                );


                return true;
            }
        )
        .catch(
            function (error) {

                console.error(
                    error
                );


                notify(
                    error.message ||
                    'تعذر حذف الإشعار.',
                    'error'
                );


                return false;
            }
        )
        .finally(
            function () {

                state.deleting =
                    false;
            }
        );
    }


    /* ============================================================
       NEW SERVER NOTIFICATION
       ------------------------------------------------------------
       تستخدمها الملفات الأخرى عندما يكون لديها حدث حقيقي.
       مثال:

       SmartPOS.notifications.push({
           title: 'تمت عملية البيع',
           message: 'تم إنشاء الفاتورة بنجاح',
           type: 'success'
       });
       ============================================================ */

    function push(
        notification
    ) {

        if (
            !notification ||
            typeof notification !==
            'object'
        ) {

            return null;
        }


        var type =
            normalizeType(
                notification.type
            );


        var toast =
            notify(
                getNotificationMessage(
                    notification
                ),
                type,
                {
                    title:
                        getNotificationTitle(
                            notification
                        )
                }
            );


        playNotificationSound();


        return toast;
    }


    /* ============================================================
       SUCCESS
       ============================================================ */

    function success(
        message,
        title
    ) {

        return notify(
            message,
            'success',
            {
                title:
                    title ||
                    'تم بنجاح'
            }
        );
    }


    /* ============================================================
       ERROR
       ============================================================ */

    function error(
        message,
        title
    ) {

        return notify(
            message,
            'error',
            {
                title:
                    title ||
                    'حدث خطأ'
            }
        );
    }


    /* ============================================================
       WARNING
       ============================================================ */

    function warning(
        message,
        title
    ) {

        return notify(
            message,
            'warning',
            {
                title:
                    title ||
                    'تنبيه'
            }
        );
    }


    /* ============================================================
       INFO
       ============================================================ */

    function info(
        message,
        title
    ) {

        return notify(
            message,
            'info',
            {
                title:
                    title ||
                    'معلومة'
            }
        );
    }


    /* ============================================================
       CLEAR TOASTS
       ============================================================ */

    function clearToasts() {

        var container =
            $(
                '[data-toast-container]'
            );


        if (!container) {

            return;
        }


        container.innerHTML =
            '';
    }


    /* ============================================================
       EVENTS
       ============================================================ */

    function bindEvents() {

        document.addEventListener(
            'click',
            function (event) {

                var action =
                    event.target.closest(
                        '[data-notification-action]'
                    );


                if (
                    action
                ) {

                    var type =
                        action.getAttribute(
                            'data-notification-action'
                        );


                    var id =
                        action.getAttribute(
                            'data-notification-id'
                        );


                    if (
                        type ===
                        'read'
                    ) {

                        markAsRead(
                            id
                        );

                    } else if (
                        type ===
                        'delete'
                    ) {

                        deleteNotification(
                            id
                        );


                    }


                    return;
                }


                var markAll =
                    event.target.closest(
                        '[data-notifications-read-all]'
                    );


                if (
                    markAll
                ) {

                    markAllAsRead();

                    return;
                }


                var refresh =
                    event.target.closest(
                        '[data-notifications-refresh]'
                    );


                if (
                    refresh
                ) {

                    load();

                    return;
                }


                var toggle =
                    event.target.closest(
                        '[data-notifications-toggle]'
                    );


                if (
                    toggle
                ) {

                    var panel =
                        $(
                            '[data-notifications-panel]'
                        );


                    if (
                        panel
                    ) {

                        var hidden =
                            panel.hasAttribute(
                                'hidden'
                            );


                        if (
                            hidden
                        ) {

                            panel.removeAttribute(
                                'hidden'
                            );

                            load();

                        } else {

                            panel.setAttribute(
                                'hidden',
                                ''
                            );
                        }
                    }
                }
            }
        );


        /* --------------------------------------------------------
           CLOSE PANEL WHEN CLICKING OUTSIDE
        -------------------------------------------------------- */

        document.addEventListener(
            'click',
            function (event) {

                var panel =
                    $(
                        '[data-notifications-panel]'
                    );


                var toggle =
                    event.target.closest(
                        '[data-notifications-toggle]'
                    );


                if (
                    !panel ||
                    toggle
                ) {

                    return;
                }


                if (
                    panel.hasAttribute(
                        'hidden'
                    )
                ) {

                    return;
                }


                if (
                    panel.contains(
                        event.target
                    )
                ) {

                    return;
                }


                panel.setAttribute(
                    'hidden',
                    ''
                );
            }
        );


        /* --------------------------------------------------------
           ESC KEY
        -------------------------------------------------------- */

        document.addEventListener(
            'keydown',
            function (event) {

                if (
                    event.key !==
                    'Escape'
                ) {

                    return;
                }


                var panel =
                    $(
                        '[data-notifications-panel]'
                    );


                if (
                    panel
                ) {

                    panel.setAttribute(
                        'hidden',
                        ''
                    );
                }
            }
        );
    }


    /* ============================================================
       AUTO REFRESH
       ------------------------------------------------------------
       يتم فقط إذا كان API معرفًا.
       ============================================================ */

    var refreshTimer =
        null;


    function startAutoRefresh() {

        if (
            refreshTimer
        ) {

            window.clearInterval(
                refreshTimer
            );
        }


        var endpoint =
            getEndpoint(
                'notificationsEndpoint'
            );


        if (!endpoint) {

            return;
        }


        refreshTimer =
            window.setInterval(
                function () {

                    /*
                     * تحديث صامت.
                     * لا نعرض Toast لمجرد أن البيانات تم تحديثها.
                     */

                    load();

                },
                60000
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


        state.initialized =
            true;


        bindEvents();

        updateBadges();

        renderCenter();

        startAutoRefresh();


        /*
         * إذا كان endpoint موجودًا،
         * يتم تحميل الإشعارات الحقيقية.
         */

        if (
            getEndpoint(
                'notificationsEndpoint'
            )
        ) {

            load();
        }
    }


    /* ============================================================
       PUBLIC API
       ============================================================ */

    SmartPOS.notifications = {

        init:
            init,

        load:
            load,

        refresh:
            load,

        notify:
            notify,

        success:
            success,

        error:
            error,

        warning:
            warning,

        info:
            info,

        push:
            push,

        markAsRead:
            markAsRead,

        markAllAsRead:
            markAllAsRead,

        delete:
            deleteNotification,

        clearToasts:
            clearToasts,

        playSound:
            playNotificationSound,

        state:
            state
    };


    /*
     * توافق إضافي مع app.js
     *
     * يسمح باستخدام:
     *
     * SmartPOS.notify(...)
     *
     * بدلًا من:
     *
     * SmartPOS.notifications.notify(...)
     */

    if (
        typeof SmartPOS.notify !==
        'function'
    ) {

        SmartPOS.notify =
            notify;
    }


    /* ============================================================
       AUTO INIT
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