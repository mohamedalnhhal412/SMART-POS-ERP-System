# ============================================================
# SMART POS / ERP SYSTEM
# app.py
# ============================================================
#
# نظام إدارة متجر ومخزون ومبيعات متكامل
#
# الوظائف الرئيسية:
# - Authentication
# - Role Based Access Control
# - Products
# - Categories
# - Inventory
# - POS
# - Sales
# - Invoices
# - Reports
# - Dashboard
# - Employees
# - Stock Movements
# - Audit Log
# - Printing
# - REST API
#
# ============================================================

import os
import secrets
from datetime import datetime, date, timedelta
from decimal import Decimal, InvalidOperation
from functools import wraps

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    flash,
    session,
    jsonify,
    abort,
    make_response
)

from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash


# ============================================================
# APPLICATION CONFIGURATION
# ============================================================

BASE_DIR = os.path.abspath(os.path.dirname(__file__))

app = Flask(
    __name__,
    template_folder="templates",
    static_folder="static"
)

app.config["SECRET_KEY"] = os.environ.get(
    "SECRET_KEY",
    "CHANGE_THIS_SECRET_KEY_IN_PRODUCTION"
)

app.config["SQLALCHEMY_DATABASE_URI"] = os.environ.get(
    "DATABASE_URL",
    "sqlite:///" + os.path.join(BASE_DIR, "smart_pos.db")
)

app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

app.config["SESSION_COOKIE_HTTPONLY"] = True
app.config["SESSION_COOKIE_SAMESITE"] = "Lax"

if os.environ.get("FLASK_ENV") == "production":
    app.config["SESSION_COOKIE_SECURE"] = True


db = SQLAlchemy(app)


# ============================================================
# DATABASE MODELS
# ============================================================
#
# ملاحظة:
# هذه الـModels يجب أن تتطابق مع database.py النهائي.
# إذا كان database.py عندك يحتوي هذه الـModels بالفعل،
# سنستخدمه بدل تعريفها مرة ثانية.
# ============================================================


class User(db.Model):

    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)

    full_name = db.Column(
        db.String(150),
        nullable=False
    )

    username = db.Column(
        db.String(100),
        unique=True,
        nullable=False,
        index=True
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    role = db.Column(
        db.String(30),
        nullable=False,
        default="cashier"
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    last_login = db.Column(
        db.DateTime,
        nullable=True
    )

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(
            self.password_hash,
            password
        )

    def __repr__(self):
        return f"<User {self.username}>"


class Category(db.Model):

    __tablename__ = "categories"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(150),
        unique=True,
        nullable=False
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    products = db.relationship(
        "Product",
        backref="category",
        lazy=True
    )


class Product(db.Model):

    __tablename__ = "products"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(255),
        nullable=False,
        index=True
    )

    barcode = db.Column(
        db.String(100),
        unique=True,
        nullable=False,
        index=True
    )

    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id"),
        nullable=True
    )

    cost_price = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        default=0
    )

    selling_price = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        default=0
    )

    stock = db.Column(
        db.Integer,
        nullable=False,
        default=0
    )

    min_stock = db.Column(
        db.Integer,
        nullable=False,
        default=5
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    image = db.Column(
        db.String(255),
        nullable=True
    )

    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow
    )

    @property
    def profit(self):

        selling = Decimal(str(self.selling_price or 0))
        cost = Decimal(str(self.cost_price or 0))

        return selling - cost

    @property
    def is_low_stock(self):

        return self.stock <= self.min_stock

    def __repr__(self):

        return f"<Product {self.name}>"


class Sale(db.Model):

    __tablename__ = "sales"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    invoice_number = db.Column(
        db.String(100),
        unique=True,
        nullable=False,
        index=True
    )

    cashier_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    subtotal = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        default=0
    )

    discount = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        default=0
    )

    tax = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        default=0
    )

    total = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        default=0
    )

    total_cost = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        default=0
    )

    profit = db.Column(
        db.Numeric(12, 2),
        nullable=False,
        default=0
    )

    payment_method = db.Column(
        db.String(50),
        nullable=False,
        default="cash"
    )

    status = db.Column(
        db.String(30),
        nullable=False,
        default="completed"
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    cashier = db.relationship(
        "User",
        backref="sales"
    )

    items = db.relationship(
        "SaleItem",
        backref="sale",
        cascade="all, delete-orphan",
        lazy=True
    )


class SaleItem(db.Model):

    __tablename__ = "sale_items"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    sale_id = db.Column(
        db.Integer,
        db.ForeignKey("sales.id"),
        nullable=False
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False
    )

    product_name = db.Column(
        db.String(255),
        nullable=False
    )

    barcode = db.Column(
        db.String(100),
        nullable=False
    )

    quantity = db.Column(
        db.Integer,
        nullable=False
    )

    unit_price = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    unit_cost = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    subtotal = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    profit = db.Column(
        db.Numeric(12, 2),
        nullable=False
    )

    product = db.relationship(
        "Product"
    )


class StockMovement(db.Model):

    __tablename__ = "stock_movements"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    movement_type = db.Column(
        db.String(50),
        nullable=False
    )

    quantity = db.Column(
        db.Integer,
        nullable=False
    )

    previous_stock = db.Column(
        db.Integer,
        nullable=False
    )

    new_stock = db.Column(
        db.Integer,
        nullable=False
    )

    reference = db.Column(
        db.String(150),
        nullable=True
    )

    note = db.Column(
        db.Text,
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    product = db.relationship(
        "Product"
    )

    user = db.relationship(
        "User"
    )


class AuditLog(db.Model):

    __tablename__ = "audit_logs"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    action = db.Column(
        db.String(100),
        nullable=False
    )

    entity_type = db.Column(
        db.String(100),
        nullable=True
    )

    entity_id = db.Column(
        db.Integer,
        nullable=True
    )

    description = db.Column(
        db.Text,
        nullable=True
    )

    ip_address = db.Column(
        db.String(100),
        nullable=True
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    user = db.relationship(
        "User"
    )


# ============================================================
# CONSTANTS
# ============================================================

TAX_RATE = Decimal("0.16")

ALLOWED_ROLES = {
    "admin",
    "cashier",
    "stock"
}

PAYMENT_METHODS = {
    "cash",
    "card",
    "bank",
    "wallet"
}


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def current_user():

    user_id = session.get("user_id")

    if not user_id:
        return None

    return db.session.get(User, user_id)


def login_required(view):

    @wraps(view)
    def wrapped_view(*args, **kwargs):

        user = current_user()

        if not user or not user.is_active:

            session.clear()

            flash(
                "يجب تسجيل الدخول أولاً.",
                "warning"
            )

            return redirect(
                url_for("login")
            )

        return view(*args, **kwargs)

    return wrapped_view


def role_required(*roles):

    def decorator(view):

        @wraps(view)
        def wrapped_view(*args, **kwargs):

            user = current_user()

            if not user or not user.is_active:

                return redirect(
                    url_for("login")
                )

            if user.role not in roles:

                flash(
                    "ليس لديك صلاحية لتنفيذ هذه العملية.",
                    "danger"
                )

                return redirect(
                    url_for("dashboard")
                )

            return view(*args, **kwargs)

        return wrapped_view

    return decorator


def money(value):

    try:

        return Decimal(str(value))

    except (InvalidOperation, TypeError, ValueError):

        return Decimal("0.00")


def generate_invoice_number():

    today = datetime.now().strftime("%Y%m%d")

    prefix = f"INV-{today}-"

    last_sale = (
        Sale.query
        .filter(
            Sale.invoice_number.like(
                prefix + "%"
            )
        )
        .order_by(
            Sale.id.desc()
        )
        .first()
    )

    if last_sale:

        try:

            last_number = int(
                last_sale.invoice_number.split("-")[-1]
            )

        except ValueError:

            last_number = 0

    else:

        last_number = 0

    return (
        f"{prefix}"
        f"{last_number + 1:05d}"
    )


def create_audit_log(
    action,
    entity_type=None,
    entity_id=None,
    description=None
):

    user = current_user()

    log = AuditLog(
        user_id=user.id if user else None,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=request.remote_addr
    )

    db.session.add(log)


def get_date_range():

    today = date.today()

    start_value = request.args.get("start")
    end_value = request.args.get("end")

    if start_value:

        try:

            start_date = datetime.strptime(
                start_value,
                "%Y-%m-%d"
            ).date()

        except ValueError:

            start_date = today

    else:

        start_date = today

    if end_value:

        try:

            end_date = datetime.strptime(
                end_value,
                "%Y-%m-%d"
            ).date()

        except ValueError:

            end_date = today

    else:

        end_date = today

    return start_date, end_date


def get_datetime_range():

    start_date, end_date = get_date_range()

    start_datetime = datetime.combine(
        start_date,
        datetime.min.time()
    )

    end_datetime = datetime.combine(
        end_date,
        datetime.max.time()
    )

    return start_datetime, end_datetime


# ============================================================
# CONTEXT PROCESSOR
# ============================================================

@app.context_processor
def inject_global_data():

    user = current_user()

    return {
        "current_user": user,
        "current_year": datetime.now().year
    }


# ============================================================
# ERROR HANDLERS
# ============================================================

@app.errorhandler(404)
def page_not_found(error):

    return render_template(
        "errors/404.html"
    ), 404


@app.errorhandler(403)
def forbidden(error):

    return render_template(
        "errors/403.html"
    ), 403


@app.errorhandler(500)
def internal_error(error):

    db.session.rollback()

    return render_template(
        "errors/500.html"
    ), 500


# ============================================================
# AUTHENTICATION
# ============================================================

@app.route("/login", methods=["GET", "POST"])
def login():

    if current_user():

        return redirect(
            url_for("dashboard")
        )

    if request.method == "POST":

        username = (
            request.form.get("username", "")
            .strip()
            .lower()
        )

        password = request.form.get(
            "password",
            ""
        )

        user = User.query.filter_by(
            username=username
        ).first()

        if not user:

            flash(
                "اسم المستخدم أو كلمة المرور غير صحيحة.",
                "danger"
            )

            return render_template(
                "login.html"
            )

        if not user.is_active:

            flash(
                "هذا الحساب غير مفعل.",
                "danger"
            )

            return render_template(
                "login.html"
            )

        if not user.check_password(password):

            flash(
                "اسم المستخدم أو كلمة المرور غير صحيحة.",
                "danger"
            )

            return render_template(
                "login.html"
            )

        session.clear()

        session["user_id"] = user.id

        user.last_login = datetime.utcnow()

        create_audit_log(
            action="login",
            entity_type="user",
            entity_id=user.id,
            description="تسجيل دخول المستخدم"
        )

        db.session.commit()

        flash(
            f"مرحباً {user.full_name}",
            "success"
        )

        return redirect(
            url_for("dashboard")
        )

    return render_template(
        "login.html"
    )


@app.route("/logout")
@login_required
def logout():

    user = current_user()

    if user:

        create_audit_log(
            action="logout",
            entity_type="user",
            entity_id=user.id,
            description="تسجيل خروج المستخدم"
        )

        db.session.commit()

    session.clear()

    flash(
        "تم تسجيل الخروج بنجاح.",
        "success"
    )

    return redirect(
        url_for("login")
    )


# ============================================================
# DASHBOARD
# ============================================================

@app.route("/")
@app.route("/dashboard")
@login_required
def dashboard():

    today = date.today()

    start = datetime.combine(
        today,
        datetime.min.time()
    )

    end = datetime.combine(
        today,
        datetime.max.time()
    )

    today_sales = (
        Sale.query
        .filter(
            Sale.created_at >= start,
            Sale.created_at <= end,
            Sale.status == "completed"
        )
        .all()
    )

    total_sales_today = sum(
        (
            money(s.total)
            for s in today_sales
        ),
        Decimal("0.00")
    )

    total_profit_today = sum(
        (
            money(s.profit)
            for s in today_sales
        ),
        Decimal("0.00")
    )

    total_products = (
        db.session.query(
            db.func.coalesce(
                db.func.sum(Product.stock),
                0
            )
        )
        .filter(
            Product.is_active.is_(True)
        )
        .scalar()
    )

    low_stock_products = (
        Product.query
        .filter(
            Product.is_active.is_(True),
            Product.stock <= Product.min_stock
        )
        .order_by(
            Product.stock.asc()
        )
        .all()
    )

    latest_sales = (
        Sale.query
        .order_by(
            Sale.created_at.desc()
        )
        .limit(10)
        .all()
    )

    return render_template(
        "dashboard.html",
        total_sales_today=total_sales_today,
        total_profit_today=total_profit_today,
        total_products=total_products or 0,
        low_stock_products=low_stock_products,
        low_stock_count=len(low_stock_products),
        latest_sales=latest_sales
    )


# ============================================================
# PRODUCTS
# ============================================================

@app.route("/products")
@login_required
def products():

    search = request.args.get(
        "search",
        ""
    ).strip()

    category_id = request.args.get(
        "category_id",
        type=int
    )

    query = Product.query.filter_by(
        is_active=True
    )

    if search:

        query = query.filter(
            db.or_(
                Product.name.ilike(
                    f"%{search}%"
                ),
                Product.barcode.ilike(
                    f"%{search}%"
                )
            )
        )

    if category_id:

        query = query.filter(
            Product.category_id == category_id
        )

    products_list = (
        query
        .order_by(
            Product.id.desc()
        )
        .all()
    )

    categories = (
        Category.query
        .filter_by(is_active=True)
        .order_by(Category.name)
        .all()
    )

    return render_template(
        "products.html",
        products=products_list,
        categories=categories,
        search=search,
        selected_category=category_id
    )


@app.route("/products/add", methods=["POST"])
@login_required
@role_required("admin", "stock")
def add_product():

    name = request.form.get(
        "name",
        ""
    ).strip()

    barcode = request.form.get(
        "barcode",
        ""
    ).strip()

    category_id = request.form.get(
        "category_id",
        type=int
    )

    cost_price = money(
        request.form.get(
            "cost_price",
            "0"
        )
    )

    selling_price = money(
        request.form.get(
            "selling_price",
            "0"
        )
    )

    stock = request.form.get(
        "stock",
        type=int
    )

    min_stock = request.form.get(
        "min_stock",
        type=int
    )

    description = request.form.get(
        "description",
        ""
    ).strip()

    if not name:

        flash(
            "اسم المنتج مطلوب.",
            "danger"
        )

        return redirect(
            url_for("products")
        )

    if not barcode:

        flash(
            "الباركود مطلوب.",
            "danger"
        )

        return redirect(
            url_for("products")
        )

    if cost_price < 0 or selling_price < 0:

        flash(
            "الأسعار لا يمكن أن تكون سالبة.",
            "danger"
        )

        return redirect(
            url_for("products")
        )

    if selling_price < cost_price:

        flash(
            "تحذير: سعر البيع أقل من سعر التكلفة.",
            "warning"
        )

    if stock is None or stock < 0:

        flash(
            "كمية المخزون غير صحيحة.",
            "danger"
        )

        return redirect(
            url_for("products")
        )

    if min_stock is None or min_stock < 0:

        min_stock = 5

    existing = Product.query.filter_by(
        barcode=barcode
    ).first()

    if existing:

        flash(
            "هذا الباركود مستخدم بالفعل.",
            "danger"
        )

        return redirect(
            url_for("products")
        )

    product = Product(
        name=name,
        barcode=barcode,
        category_id=category_id,
        cost_price=cost_price,
        selling_price=selling_price,
        stock=stock,
        min_stock=min_stock,
        description=description
    )

    db.session.add(product)

    db.session.flush()

    user = current_user()

    if stock > 0:

        movement = StockMovement(
            product_id=product.id,
            user_id=user.id,
            movement_type="initial",
            quantity=stock,
            previous_stock=0,
            new_stock=stock,
            reference="PRODUCT_CREATION",
            note="الرصيد الابتدائي للمنتج"
        )

        db.session.add(movement)

    create_audit_log(
        action="create",
        entity_type="product",
        entity_id=product.id,
        description=f"تم إنشاء المنتج: {product.name}"
    )

    db.session.commit()

    flash(
        "تم إضافة المنتج بنجاح.",
        "success"
    )

    return redirect(
        url_for("products")
    )


@app.route("/products/<int:product_id>/delete", methods=["POST"])
@login_required
@role_required("admin")
def delete_product(product_id):

    product = db.session.get(
        Product,
        product_id
    )

    if not product:

        abort(404)

    product.is_active = False

    create_audit_log(
        action="delete",
        entity_type="product",
        entity_id=product.id,
        description=f"تم تعطيل المنتج: {product.name}"
    )

    db.session.commit()

    flash(
        "تم حذف/تعطيل المنتج.",
        "success"
    )

    return redirect(
        url_for("products")
    )


# ============================================================
# PRODUCT API
# ============================================================

@app.route("/api/products/search")
@login_required
def api_products_search():

    query_text = request.args.get(
        "q",
        ""
    ).strip()

    if not query_text:

        return jsonify({
            "success": True,
            "products": []
        })

    products_list = (
        Product.query
        .filter(
            Product.is_active.is_(True),
            db.or_(
                Product.name.ilike(
                    f"%{query_text}%"
                ),
                Product.barcode.ilike(
                    f"%{query_text}%"
                )
            )
        )
        .order_by(Product.name)
        .limit(50)
        .all()
    )

    return jsonify({
        "success": True,
        "products": [
            {
                "id": p.id,
                "name": p.name,
                "barcode": p.barcode,
                "price": float(p.selling_price),
                "cost": float(p.cost_price),
                "stock": p.stock,
                "category": (
                    p.category.name
                    if p.category
                    else None
                )
            }
            for p in products_list
        ]
    })


@app.route("/api/products/barcode/<barcode>")
@login_required
def api_product_barcode(barcode):

    product = Product.query.filter_by(
        barcode=barcode,
        is_active=True
    ).first()

    if not product:

        return jsonify({
            "success": False,
            "message": "المنتج غير موجود."
        }), 404

    return jsonify({
        "success": True,
        "product": {
            "id": product.id,
            "name": product.name,
            "barcode": product.barcode,
            "price": float(product.selling_price),
            "cost": float(product.cost_price),
            "stock": product.stock,
            "min_stock": product.min_stock
        }
    })


# ============================================================
# POS
# ============================================================

@app.route("/pos")
@login_required
@role_required("admin", "cashier")
def pos():

    products_list = (
        Product.query
        .filter(
            Product.is_active.is_(True),
            Product.stock > 0
        )
        .order_by(Product.name)
        .limit(100)
        .all()
    )

    return render_template(
        "pos.html",
        products=products_list,
        tax_rate=TAX_RATE
    )


# ============================================================
# CHECKOUT API
# ============================================================

@app.route(
    "/api/checkout",
    methods=["POST"]
)
@login_required
@role_required("admin", "cashier")
def checkout():

    data = request.get_json(
        silent=True
    )

    if not data:

        return jsonify({
            "success": False,
            "message": "بيانات العملية غير صحيحة."
        }), 400

    items = data.get(
        "items",
        []
    )

    payment_method = data.get(
        "payment_method",
        "cash"
    )

    discount_value = money(
        data.get(
            "discount",
            0
        )
    )

    if not items:

        return jsonify({
            "success": False,
            "message": "السلة فارغة."
        }), 400

    if payment_method not in PAYMENT_METHODS:

        return jsonify({
            "success": False,
            "message": "طريقة الدفع غير صحيحة."
        }), 400

    if discount_value < 0:

        return jsonify({
            "success": False,
            "message": "الخصم غير صحيح."
        }), 400

    try:

        subtotal = Decimal("0.00")

        total_cost = Decimal("0.00")

        prepared_items = []

        # ----------------------------------------------------
        # VALIDATE ALL ITEMS FIRST
        # ----------------------------------------------------

        for raw_item in items:

            product_id = raw_item.get(
                "product_id"
            )

            quantity = raw_item.get(
                "quantity"
            )

            try:

                product_id = int(
                    product_id
                )

                quantity = int(
                    quantity
                )

            except (
                TypeError,
                ValueError
            ):

                raise ValueError(
                    "بيانات المنتج غير صحيحة."
                )

            if quantity <= 0:

                raise ValueError(
                    "الكمية يجب أن تكون أكبر من صفر."
                )

            product = db.session.get(
                Product,
                product_id
            )

            if not product or not product.is_active:

                raise ValueError(
                    "أحد المنتجات غير موجود."
                )

            if product.stock < quantity:

                raise ValueError(
                    f"المخزون غير كافٍ للمنتج: "
                    f"{product.name}. "
                    f"المتاح: {product.stock}"
                )

            unit_price = money(
                product.selling_price
            )

            unit_cost = money(
                product.cost_price
            )

            item_subtotal = (
                unit_price *
                Decimal(quantity)
            )

            item_cost = (
                unit_cost *
                Decimal(quantity)
            )

            item_profit = (
                item_subtotal -
                item_cost
            )

            subtotal += item_subtotal

            total_cost += item_cost

            prepared_items.append({
                "product": product,
                "quantity": quantity,
                "unit_price": unit_price,
                "unit_cost": unit_cost,
                "subtotal": item_subtotal,
                "profit": item_profit
            })

        # ----------------------------------------------------
        # DISCOUNT VALIDATION
        # ----------------------------------------------------

        if discount_value > subtotal:

            discount_value = subtotal

        taxable_amount = (
            subtotal -
            discount_value
        )

        tax = (
            taxable_amount *
            TAX_RATE
        )

        total = (
            taxable_amount +
            tax
        )

        profit = (
            subtotal -
            discount_value -
            total_cost
        )

        # ----------------------------------------------------
        # CREATE SALE
        # ----------------------------------------------------

        invoice_number = (
            generate_invoice_number()
        )

        sale = Sale(
            invoice_number=invoice_number,
            cashier_id=current_user().id,
            subtotal=subtotal,
            discount=discount_value,
            tax=tax,
            total=total,
            total_cost=total_cost,
            profit=profit,
            payment_method=payment_method,
            status="completed"
        )

        db.session.add(sale)

        db.session.flush()

        # ----------------------------------------------------
        # CREATE SALE ITEMS
        # ----------------------------------------------------

        for item in prepared_items:

            product = item["product"]

            previous_stock = product.stock

            product.stock -= item["quantity"]

            movement = StockMovement(
                product_id=product.id,
                user_id=current_user().id,
                movement_type="sale",
                quantity=-item["quantity"],
                previous_stock=previous_stock,
                new_stock=product.stock,
                reference=invoice_number,
                note="خصم مخزون نتيجة عملية بيع"
            )

            sale_item = SaleItem(
                sale_id=sale.id,
                product_id=product.id,
                product_name=product.name,
                barcode=product.barcode,
                quantity=item["quantity"],
                unit_price=item["unit_price"],
                unit_cost=item["unit_cost"],
                subtotal=item["subtotal"],
                profit=item["profit"]
            )

            db.session.add(sale_item)

            db.session.add(movement)

        # ----------------------------------------------------
        # AUDIT
        # ----------------------------------------------------

        create_audit_log(
            action="sale",
            entity_type="sale",
            entity_id=sale.id,
            description=(
                f"تم تنفيذ عملية بيع "
                f"{invoice_number} "
                f"بقيمة {total}"
            )
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "تم إتمام البيع بنجاح.",
            "sale_id": sale.id,
            "invoice_number": invoice_number,
            "subtotal": float(subtotal),
            "discount": float(discount_value),
            "tax": float(tax),
            "total": float(total),
            "profit": float(profit),
            "redirect": url_for(
                "invoice",
                sale_id=sale.id
            )
        })

    except Exception as exc:

        db.session.rollback()

        return jsonify({
            "success": False,
            "message": str(exc)
        }), 400


# ============================================================
# INVOICE
# ============================================================

@app.route(
    "/invoice/<int:sale_id>"
)
@login_required
def invoice(sale_id):

    sale = db.session.get(
        Sale,
        sale_id
    )

    if not sale:

        abort(404)

    return render_template(
        "invoice.html",
        sale=sale
    )


@app.route(
    "/invoice/<int:sale_id>/print"
)
@login_required
def print_invoice(sale_id):

    sale = db.session.get(
        Sale,
        sale_id
    )

    if not sale:

        abort(404)

    response = make_response(
        render_template(
            "invoice_print.html",
            sale=sale
        )
    )

    response.headers[
        "Content-Type"
    ] = "text/html; charset=utf-8"

    return response


# ============================================================
# SALES HISTORY
# ============================================================

@app.route("/sales")
@login_required
def sales():

    start_datetime, end_datetime = (
        get_datetime_range()
    )

    query = (
        Sale.query
        .filter(
            Sale.created_at >= start_datetime,
            Sale.created_at <= end_datetime
        )
    )

    payment_method = request.args.get(
        "payment_method"
    )

    if payment_method in PAYMENT_METHODS:

        query = query.filter(
            Sale.payment_method ==
            payment_method
        )

    sales_list = (
        query
        .order_by(
            Sale.created_at.desc()
        )
        .all()
    )

    total_sales = sum(
        (
            money(s.total)
            for s in sales_list
        ),
        Decimal("0.00")
    )

    total_profit = sum(
        (
            money(s.profit)
            for s in sales_list
        ),
        Decimal("0.00")
    )

    return render_template(
        "sales.html",
        sales=sales_list,
        total_sales=total_sales,
        total_profit=total_profit,
        start_date=start_datetime.date(),
        end_date=end_datetime.date()
    )


# ============================================================
# REPORTS
# ============================================================

@app.route("/reports")
@login_required
@role_required("admin")
def reports():

    start_datetime, end_datetime = (
        get_datetime_range()
    )

    sales_list = (
        Sale.query
        .filter(
            Sale.created_at >= start_datetime,
            Sale.created_at <= end_datetime,
            Sale.status == "completed"
        )
        .all()
    )

    total_revenue = sum(
        (
            money(s.total)
            for s in sales_list
        ),
        Decimal("0.00")
    )

    total_profit = sum(
        (
            money(s.profit)
            for s in sales_list
        ),
        Decimal("0.00")
    )

    total_cost = sum(
        (
            money(s.total_cost)
            for s in sales_list
        ),
        Decimal("0.00")
    )

    total_invoices = len(
        sales_list
    )

    total_items = sum(
        (
            item.quantity
            for sale in sales_list
            for item in sale.items
        ),
        0
    )

    return render_template(
        "reports.html",
        sales=sales_list,
        total_revenue=total_revenue,
        total_profit=total_profit,
        total_cost=total_cost,
        total_invoices=total_invoices,
        total_items=total_items,
        start_date=start_datetime.date(),
        end_date=end_datetime.date()
    )


# ============================================================
# INVENTORY
# ============================================================

@app.route("/inventory")
@login_required
@role_required("admin", "stock")
def inventory():

    products_list = (
        Product.query
        .filter_by(is_active=True)
        .order_by(Product.name)
        .all()
    )

    return render_template(
        "inventory.html",
        products=products_list
    )


@app.route(
    "/inventory/<int:product_id>/adjust",
    methods=["POST"]
)
@login_required
@role_required("admin", "stock")
def adjust_inventory(product_id):

    product = db.session.get(
        Product,
        product_id
    )

    if not product:

        abort(404)

    try:

        quantity = int(
            request.form.get(
                "quantity",
                0
            )
        )

    except ValueError:

        flash(
            "الكمية غير صحيحة.",
            "danger"
        )

        return redirect(
            url_for("inventory")
        )

    note = request.form.get(
        "note",
        ""
    ).strip()

    if quantity == 0:

        flash(
            "لا يوجد تغيير في المخزون.",
            "warning"
        )

        return redirect(
            url_for("inventory")
        )

    previous_stock = product.stock

    new_stock = (
        previous_stock +
        quantity
    )

    if new_stock < 0:

        flash(
            "لا يمكن أن يصبح المخزون سالباً.",
            "danger"
        )

        return redirect(
            url_for("inventory")
        )

    product.stock = new_stock

    movement = StockMovement(
        product_id=product.id,
        user_id=current_user().id,
        movement_type="adjustment",
        quantity=quantity,
        previous_stock=previous_stock,
        new_stock=new_stock,
        reference="MANUAL_ADJUSTMENT",
        note=note
    )

    db.session.add(movement)

    create_audit_log(
        action="inventory_adjustment",
        entity_type="product",
        entity_id=product.id,
        description=(
            f"تعديل مخزون {product.name}: "
            f"{previous_stock} -> {new_stock}"
        )
    )

    db.session.commit()

    flash(
        "تم تحديث المخزون بنجاح.",
        "success"
    )

    return redirect(
        url_for("inventory")
    )


@app.route("/inventory/movements")
@login_required
@role_required("admin", "stock")
def stock_movements():

    movements = (
        StockMovement.query
        .order_by(
            StockMovement.created_at.desc()
        )
        .limit(500)
        .all()
    )

    return render_template(
        "stock_movements.html",
        movements=movements
    )

# ============================================================
# CATEGORIES
# ============================================================

@app.route("/categories")
@login_required
@role_required("admin", "stock")
def categories():

    try:

        categories_list = (
            Category.query
            .filter(
                Category.is_active.is_(True)
            )
            .order_by(
                Category.name.asc()
            )
            .all()
        )

        return render_template(
            "categories.html",
            categories=categories_list,
            categories_list=categories_list
        )

    except Exception as exc:

        db.session.rollback()

        app.logger.exception(
            "ERROR LOADING CATEGORIES: %s",
            exc
        )

        # إذا الصفحة نفسها فشلت، لا نخلي الخطأ
        # يكسر النظام بالكامل
        flash(
            "حدث خطأ أثناء تحميل التصنيفات.",
            "danger"
        )

        return render_template(
            "categories.html",
            categories=[],
            categories_list=[]
        )


# ============================================================
# CATEGORIES API - GET
# ============================================================

@app.route("/api/categories", methods=["GET"])
@login_required
@role_required("admin", "stock")
def api_categories():

    try:

        categories_list = (
            Category.query
            .filter(
                Category.is_active.is_(True)
            )
            .order_by(
                Category.name.asc()
            )
            .all()
        )

        return jsonify({
            "success": True,
            "categories": [
                {
                    "id": category.id,
                    "name": category.name,
                    "description": category.description or "",
                    "is_active": bool(category.is_active),
                    "created_at": (
                        category.created_at.isoformat()
                        if category.created_at
                        else None
                    ),
                    "products_count": len(
                        [
                            product
                            for product in category.products
                            if product.is_active
                        ]
                    )
                }
                for category in categories_list
            ],
            "count": len(categories_list)
        })

    except Exception as exc:

        db.session.rollback()

        app.logger.exception(
            "ERROR LOADING CATEGORIES API: %s",
            exc
        )

        return jsonify({
            "success": False,
            "message": "فشل تحميل التصنيفات.",
            "error": str(exc)
        }), 500


# ============================================================
# ADD CATEGORY - FORM
# ============================================================

@app.route(
    "/categories/add",
    methods=["POST"]
)
@login_required
@role_required("admin", "stock")
def add_category():

    try:

        name = request.form.get(
            "name",
            ""
        ).strip()

        description = request.form.get(
            "description",
            ""
        ).strip()

        # ----------------------------------------------------
        # VALIDATION
        # ----------------------------------------------------

        if not name:

            flash(
                "اسم التصنيف مطلوب.",
                "danger"
            )

            return redirect(
                url_for("categories")
            )

        if len(name) > 150:

            flash(
                "اسم التصنيف طويل جداً.",
                "danger"
            )

            return redirect(
                url_for("categories")
            )

        # ----------------------------------------------------
        # CHECK DUPLICATE
        # ----------------------------------------------------

        existing = (
            Category.query
            .filter(
                db.func.lower(
                    db.func.trim(Category.name)
                ) == name.lower()
            )
            .first()
        )

        if existing:

            # إذا كان التصنيف موجود لكن معطل
            if not existing.is_active:

                existing.is_active = True

                if description:
                    existing.description = description

                create_audit_log(
                    action="restore",
                    entity_type="category",
                    entity_id=existing.id,
                    description=(
                        f"إعادة تفعيل التصنيف: {name}"
                    )
                )

                db.session.commit()

                flash(
                    "تمت إعادة تفعيل التصنيف بنجاح.",
                    "success"
                )

                return redirect(
                    url_for("categories")
                )

            flash(
                "التصنيف موجود بالفعل.",
                "warning"
            )

            return redirect(
                url_for("categories")
            )

        # ----------------------------------------------------
        # CREATE CATEGORY
        # ----------------------------------------------------

        category = Category(
            name=name,
            description=description,
            is_active=True
        )

        db.session.add(category)

        db.session.flush()

        # ----------------------------------------------------
        # AUDIT LOG
        # ----------------------------------------------------

        create_audit_log(
            action="create",
            entity_type="category",
            entity_id=category.id,
            description=(
                f"إضافة تصنيف: {category.name}"
            )
        )

        db.session.commit()

        flash(
            "تم إنشاء التصنيف بنجاح.",
            "success"
        )

        return redirect(
            url_for("categories")
        )

    except Exception as exc:

        db.session.rollback()

        app.logger.exception(
            "ERROR ADDING CATEGORY: %s",
            exc
        )

        flash(
            f"فشل حفظ التصنيف: {str(exc)}",
            "danger"
        )

        return redirect(
            url_for("categories")
        )


# ============================================================
# ADD CATEGORY - API
# ============================================================

@app.route(
    "/api/categories",
    methods=["POST"]
)
@login_required
@role_required("admin", "stock")
def api_add_category():

    try:

        data = request.get_json(
            silent=True
        )

        if data is None:

            data = request.form

        name = str(
            data.get(
                "name",
                ""
            )
        ).strip()

        description = str(
            data.get(
                "description",
                ""
            )
        ).strip()

        # ----------------------------------------------------
        # VALIDATION
        # ----------------------------------------------------

        if not name:

            return jsonify({
                "success": False,
                "message": "اسم التصنيف مطلوب."
            }), 400

        if len(name) > 150:

            return jsonify({
                "success": False,
                "message": "اسم التصنيف طويل جداً."
            }), 400

        # ----------------------------------------------------
        # DUPLICATE CHECK
        # ----------------------------------------------------

        existing = (
            Category.query
            .filter(
                db.func.lower(
                    db.func.trim(Category.name)
                ) == name.lower()
            )
            .first()
        )

        if existing:

            if not existing.is_active:

                existing.is_active = True

                if description:
                    existing.description = description

                create_audit_log(
                    action="restore",
                    entity_type="category",
                    entity_id=existing.id,
                    description=(
                        f"إعادة تفعيل التصنيف: {name}"
                    )
                )

                db.session.commit()

                return jsonify({
                    "success": True,
                    "message": "تمت إعادة تفعيل التصنيف.",
                    "category": {
                        "id": existing.id,
                        "name": existing.name,
                        "description": (
                            existing.description or ""
                        ),
                        "is_active": True
                    }
                }), 200

            return jsonify({
                "success": False,
                "message": "التصنيف موجود بالفعل."
            }), 409

        # ----------------------------------------------------
        # CREATE
        # ----------------------------------------------------

        category = Category(
            name=name,
            description=description,
            is_active=True
        )

        db.session.add(category)

        db.session.flush()

        create_audit_log(
            action="create",
            entity_type="category",
            entity_id=category.id,
            description=(
                f"إضافة تصنيف: {category.name}"
            )
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "تم إنشاء التصنيف بنجاح.",
            "category": {
                "id": category.id,
                "name": category.name,
                "description": (
                    category.description or ""
                ),
                "is_active": True,
                "created_at": (
                    category.created_at.isoformat()
                    if category.created_at
                    else None
                ),
                "products_count": 0
            }
        }), 201

    except Exception as exc:

        db.session.rollback()

        app.logger.exception(
            "ERROR ADDING CATEGORY API: %s",
            exc
        )

        return jsonify({
            "success": False,
            "message": "فشل حفظ التصنيف.",
            "error": str(exc)
        }), 500


# ============================================================
# UPDATE CATEGORY
# ============================================================

@app.route(
    "/categories/<int:category_id>/edit",
    methods=["POST"]
)
@login_required
@role_required("admin", "stock")
def edit_category(category_id):

    category = db.session.get(
        Category,
        category_id
    )

    if not category:

        abort(404)

    try:

        name = request.form.get(
            "name",
            ""
        ).strip()

        description = request.form.get(
            "description",
            ""
        ).strip()

        if not name:

            flash(
                "اسم التصنيف مطلوب.",
                "danger"
            )

            return redirect(
                url_for("categories")
            )

        duplicate = (
            Category.query
            .filter(
                Category.id != category.id,
                db.func.lower(
                    db.func.trim(Category.name)
                ) == name.lower()
            )
            .first()
        )

        if duplicate:

            flash(
                "يوجد تصنيف آخر بنفس الاسم.",
                "warning"
            )

            return redirect(
                url_for("categories")
            )

        old_name = category.name

        category.name = name
        category.description = description

        create_audit_log(
            action="update",
            entity_type="category",
            entity_id=category.id,
            description=(
                f"تعديل التصنيف: "
                f"{old_name} -> {name}"
            )
        )

        db.session.commit()

        flash(
            "تم تعديل التصنيف بنجاح.",
            "success"
        )

        return redirect(
            url_for("categories")
        )

    except Exception as exc:

        db.session.rollback()

        app.logger.exception(
            "ERROR EDITING CATEGORY: %s",
            exc
        )

        flash(
            f"فشل تعديل التصنيف: {str(exc)}",
            "danger"
        )

        return redirect(
            url_for("categories")
        )


# ============================================================
# DELETE / DEACTIVATE CATEGORY
# ============================================================

@app.route(
    "/categories/<int:category_id>/delete",
    methods=["POST"]
)
@login_required
@role_required("admin")
def delete_category(category_id):

    category = db.session.get(
        Category,
        category_id
    )

    if not category:

        abort(404)

    try:

        active_products_count = (
            Product.query
            .filter(
                Product.category_id == category.id,
                Product.is_active.is_(True)
            )
            .count()
        )

        # لا نحذف التصنيف فعلياً من قاعدة البيانات
        # حتى لا نخرب علاقات المنتجات
        category.is_active = False

        create_audit_log(
            action="delete",
            entity_type="category",
            entity_id=category.id,
            description=(
                f"تعطيل التصنيف: {category.name}. "
                f"عدد المنتجات المرتبطة: "
                f"{active_products_count}"
            )
        )

        db.session.commit()

        return jsonify({
            "success": True,
            "message": "تم حذف/تعطيل التصنيف بنجاح."
        })

    except Exception as exc:

        db.session.rollback()

        app.logger.exception(
            "ERROR DELETING CATEGORY: %s",
            exc
        )

        return jsonify({
            "success": False,
            "message": "فشل حذف التصنيف.",
            "error": str(exc)
        }), 500
# ============================================================
# USERS / EMPLOYEES
# ============================================================

@app.route("/users")
@login_required
@role_required("admin")
def users():

    users_list = (
        User.query
        .order_by(User.id)
        .all()
    )

    return render_template(
        "users.html",
        users=users_list
    )


@app.route(
    "/users/add",
    methods=["POST"]
)
@login_required
@role_required("admin")
def add_user():

    full_name = request.form.get(
        "full_name",
        ""
    ).strip()

    username = (
        request.form.get(
            "username",
            ""
        )
        .strip()
        .lower()
    )

    password = request.form.get(
        "password",
        ""
    )

    role = request.form.get(
        "role",
        "cashier"
    )

    if not full_name:

        flash(
            "الاسم الكامل مطلوب.",
            "danger"
        )

        return redirect(
            url_for("users")
        )

    if not username:

        flash(
            "اسم المستخدم مطلوب.",
            "danger"
        )

        return redirect(
            url_for("users")
        )

    if len(password) < 8:

        flash(
            "كلمة المرور يجب أن تكون 8 أحرف على الأقل.",
            "danger"
        )

        return redirect(
            url_for("users")
        )

    if role not in ALLOWED_ROLES:

        flash(
            "الصلاحية غير صحيحة.",
            "danger"
        )

        return redirect(
            url_for("users")
        )

    existing = User.query.filter_by(
        username=username
    ).first()

    if existing:

        flash(
            "اسم المستخدم موجود بالفعل.",
            "danger"
        )

        return redirect(
            url_for("users")
        )

    user = User(
        full_name=full_name,
        username=username,
        role=role
    )

    user.set_password(
        password
    )

    db.session.add(user)

    db.session.flush()

    create_audit_log(
        action="create",
        entity_type="user",
        entity_id=user.id,
        description=(
            f"إنشاء حساب مستخدم: "
            f"{username}"
        )
    )

    db.session.commit()

    flash(
        "تم إنشاء المستخدم بنجاح.",
        "success"
    )

    return redirect(
        url_for("users")
    )


@app.route(
    "/users/<int:user_id>/toggle",
    methods=["POST"]
)
@login_required
@role_required("admin")
def toggle_user(user_id):

    user = db.session.get(
        User,
        user_id
    )

    if not user:

        abort(404)

    if user.id == current_user().id:

        flash(
            "لا يمكنك تعطيل حسابك الحالي.",
            "danger"
        )

        return redirect(
            url_for("users")
        )

    user.is_active = not user.is_active

    create_audit_log(
        action="toggle_user",
        entity_type="user",
        entity_id=user.id,
        description=(
            f"تغيير حالة المستخدم "
            f"{user.username}"
        )
    )

    db.session.commit()

    flash(
        "تم تحديث حالة الحساب.",
        "success"
    )

    return redirect(
        url_for("users")
    )


# ============================================================
# AUDIT LOG
# ============================================================

@app.route("/audit-log")
@login_required
@role_required("admin")
def audit_log():

    logs = (
        AuditLog.query
        .order_by(
            AuditLog.created_at.desc()
        )
        .limit(500)
        .all()
    )

    return render_template(
        "audit_log.html",
        logs=logs
    )

# ============================================================
# SYSTEM HEALTH PAGE
# ============================================================

@app.route("/health")
@login_required
def health():

    return render_template(
        "health.html"
    )


# ============================================================
# SYSTEM HEALTH API
# ============================================================

@app.route("/api/health")
@login_required
def health_api():

    try:

        db.session.execute(
            db.text("SELECT 1")
        )

        return jsonify({
            "status": "ok",
            "database": "connected",
            "time": datetime.utcnow().isoformat(),
            "server": "running",
            "api": "available"
        })

    except Exception as e:

        return jsonify({
            "status": "error",
            "database": "disconnected",
            "server": "running",
            "api": "available",
            "error": str(e)
        }), 500

# ============================================================
# INITIAL DATABASE
# ============================================================

@app.cli.command("init-db")
def init_db():

    db.create_all()

    print(
        "Database initialized successfully."
    )


# ============================================================
# CREATE DEFAULT ADMIN
# ============================================================

@app.cli.command("create-admin")
def create_admin():

    username = os.environ.get(
        "ADMIN_USERNAME",
        "admin"
    )

    password = os.environ.get(
        "ADMIN_PASSWORD"
    )

    if not password:

        password = secrets.token_urlsafe(
            12
        )

        print(
            "Generated admin password:",
            password
        )

    existing = User.query.filter_by(
        username=username
    ).first()

    if existing:

        print(
            "Admin user already exists."
        )

        return

    admin = User(
        full_name="مدير النظام",
        username=username,
        role="admin",
        is_active=True
    )

    admin.set_password(
        password
    )

    db.session.add(admin)

    db.session.commit()

    print(
        "Admin account created successfully."
    )


# ============================================================
# DEFAULT CATEGORIES
# ============================================================

@app.cli.command("seed-categories")
def seed_categories():

    default_categories = [
        (
            "إلكترونيات وجوالات",
            "الهواتف والأجهزة الإلكترونية"
        ),
        (
            "أجهزة منزلية",
            "الأجهزة المنزلية والكهربائية"
        ),
        (
            "عطور ومستحضرات تجميل",
            "العطور ومستحضرات التجميل"
        ),
        (
            "مواد غذائية ومشروبات",
            "المواد الغذائية والمشروبات"
        ),
        (
            "ملابس وأزياء",
            "الملابس والأزياء"
        ),
        (
            "أخرى",
            "منتجات متنوعة"
        )
    ]

    added = 0

    for name, description in default_categories:

        exists = Category.query.filter_by(
            name=name
        ).first()

        if exists:

            continue

        category = Category(
            name=name,
            description=description
        )

        db.session.add(category)

        added += 1

    db.session.commit()

    print(
        f"Added {added} categories."
    )


# ============================================================
# APPLICATION STARTUP
# ============================================================

if __name__ == "__main__":

    with app.app_context():

        db.create_all()

    app.run(
        host="0.0.0.0",
        port=int(
            os.environ.get(
                "PORT",
                5000
            )
        ),
        debug=os.environ.get(
            "FLASK_DEBUG",
            "1"
        ) == "1"
    )