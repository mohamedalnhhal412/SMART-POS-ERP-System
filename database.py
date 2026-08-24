# ============================================================
# SMART POS / ERP SYSTEM
# DATABASE CORE
# ============================================================
#
# نظام قاعدة بيانات شامل لإدارة:
# - المنتجات
# - التصنيفات
# - الباركود
# - المخزون
# - المستودعات
# - المبيعات
# - الفواتير
# - سلة البيع
# - العملاء
# - الموردين
# - المشتريات
# - الموظفين
# - الصلاحيات
# - المدفوعات
# - الضرائب
# - الخصومات
# - المصروفات
# - الأرباح
# - حركات المخزون
# - المرتجعات
# - التنبيهات
# - سجل العمليات
# - إعدادات النظام
# ============================================================

from datetime import datetime, date
from decimal import Decimal

from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import (
    CheckConstraint,
    UniqueConstraint,
    Index,
    event,
)
from sqlalchemy.orm import validates


# ============================================================
# DATABASE INSTANCE
# ============================================================

db = SQLAlchemy()


# ============================================================
# CONSTANTS
# ============================================================

DECIMAL_TYPE = db.Numeric(18, 2)


# ============================================================
# MIXINS
# ============================================================

class TimestampMixin:
    """
    تواريخ إنشاء وتحديث السجلات.
    """

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    updated_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False
    )


class ActiveMixin:
    """
    يستخدم للسجلات التي يمكن تعطيلها بدون حذفها.
    """

    is_active = db.Column(
        db.Boolean,
        default=True,
        nullable=False,
        index=True
    )


# ============================================================
# COMPANY / STORE
# ============================================================

class Company(TimestampMixin, ActiveMixin, db.Model):
    """
    بيانات الشركة / المتجر.
    """

    __tablename__ = "companies"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(
        db.String(200),
        nullable=False
    )

    legal_name = db.Column(
        db.String(250)
    )

    phone = db.Column(
        db.String(50)
    )

    email = db.Column(
        db.String(150)
    )

    address = db.Column(
        db.Text
    )

    country = db.Column(
        db.String(100),
        default="Palestine"
    )

    city = db.Column(
        db.String(100)
    )

    currency = db.Column(
        db.String(10),
        default="ILS",
        nullable=False
    )

    tax_number = db.Column(
        db.String(100)
    )

    logo = db.Column(
        db.String(500)
    )

    website = db.Column(
        db.String(300)
    )

    invoice_footer = db.Column(
        db.Text
    )

    tax_enabled = db.Column(
        db.Boolean,
        default=True,
        nullable=False
    )

    default_tax_rate = db.Column(
        DECIMAL_TYPE,
        default=Decimal("16.00"),
        nullable=False
    )

    warehouses = db.relationship(
        "Warehouse",
        back_populates="company",
        cascade="all, delete-orphan"
    )

    users = db.relationship(
        "User",
        back_populates="company"
    )

    products = db.relationship(
        "Product",
        back_populates="company"
    )

    customers = db.relationship(
        "Customer",
        back_populates="company"
    )

    suppliers = db.relationship(
        "Supplier",
        back_populates="company"
    )

    def __repr__(self):
        return f"<Company {self.name}>"


# ============================================================
# ROLES
# ============================================================

class Role(TimestampMixin, ActiveMixin, db.Model):
    """
    الصلاحيات الرئيسية.
    """

    __tablename__ = "roles"

    id = db.Column(db.Integer, primary_key=True)

    name = db.Column(
        db.String(100),
        nullable=False,
        unique=True
    )

    code = db.Column(
        db.String(50),
        nullable=False,
        unique=True
    )

    description = db.Column(
        db.Text
    )

    users = db.relationship(
        "User",
        back_populates="role"
    )

    def __repr__(self):
        return f"<Role {self.code}>"


# ============================================================
# USERS / EMPLOYEES
# ============================================================

class User(TimestampMixin, ActiveMixin, db.Model):
    """
    المستخدمون والموظفون.
    """

    __tablename__ = "users"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True,
        index=True
    )

    role_id = db.Column(
        db.Integer,
        db.ForeignKey("roles.id"),
        nullable=True,
        index=True
    )

    username = db.Column(
        db.String(100),
        nullable=False,
        unique=True,
        index=True
    )

    password_hash = db.Column(
        db.String(255),
        nullable=False
    )

    full_name = db.Column(
        db.String(200),
        nullable=False
    )

    email = db.Column(
        db.String(150),
        unique=True
    )

    phone = db.Column(
        db.String(50)
    )

    employee_number = db.Column(
        db.String(100),
        unique=True
    )

    last_login = db.Column(
        db.DateTime
    )

    failed_login_attempts = db.Column(
        db.Integer,
        default=0,
        nullable=False
    )

    locked_until = db.Column(
        db.DateTime
    )

    company = db.relationship(
        "Company",
        back_populates="users"
    )

    role = db.relationship(
        "Role",
        back_populates="users"
    )

    sales = db.relationship(
        "Sale",
        back_populates="cashier"
    )

    inventory_movements = db.relationship(
        "InventoryMovement",
        back_populates="user"
    )

    audit_logs = db.relationship(
        "AuditLog",
        back_populates="user"
    )

    expenses = db.relationship(
        "Expense",
        back_populates="created_by"
    )

    def __repr__(self):
        return f"<User {self.username}>"


# ============================================================
# CATEGORIES
# ============================================================

class Category(TimestampMixin, ActiveMixin, db.Model):
    """
    تصنيفات المنتجات.
    """

    __tablename__ = "categories"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True,
        index=True
    )

    parent_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id"),
        nullable=True
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    code = db.Column(
        db.String(50)
    )

    description = db.Column(
        db.Text
    )

    image = db.Column(
        db.String(500)
    )

    parent = db.relationship(
        "Category",
        remote_side=[id],
        backref=db.backref(
            "children",
            lazy="dynamic"
        )
    )

    products = db.relationship(
        "Product",
        back_populates="category"
    )

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "name",
            name="uq_category_company_name"
        ),
    )

    def __repr__(self):
        return f"<Category {self.name}>"


# ============================================================
# BRANDS
# ============================================================

class Brand(TimestampMixin, ActiveMixin, db.Model):
    """
    الشركات والعلامات التجارية.
    """

    __tablename__ = "brands"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    description = db.Column(
        db.Text
    )

    logo = db.Column(
        db.String(500)
    )

    products = db.relationship(
        "Product",
        back_populates="brand"
    )

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "name",
            name="uq_brand_company_name"
        ),
    )


# ============================================================
# UNITS
# ============================================================

class Unit(TimestampMixin, ActiveMixin, db.Model):
    """
    وحدات القياس:
    قطعة، كرتونة، كيلو، لتر...
    """

    __tablename__ = "units"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(100),
        nullable=False
    )

    abbreviation = db.Column(
        db.String(20)
    )

    products = db.relationship(
        "Product",
        back_populates="unit"
    )


# ============================================================
# PRODUCTS
# ============================================================

class Product(TimestampMixin, ActiveMixin, db.Model):
    """
    المنتج الرئيسي.

    كل عمليات البيع والمخزون تعتمد عليه.
    """

    __tablename__ = "products"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True,
        index=True
    )

    category_id = db.Column(
        db.Integer,
        db.ForeignKey("categories.id"),
        nullable=True,
        index=True
    )

    brand_id = db.Column(
        db.Integer,
        db.ForeignKey("brands.id"),
        nullable=True
    )

    unit_id = db.Column(
        db.Integer,
        db.ForeignKey("units.id"),
        nullable=True
    )

    sku = db.Column(
        db.String(100),
        nullable=False,
        unique=True,
        index=True
    )

    name = db.Column(
        db.String(250),
        nullable=False,
        index=True
    )

    description = db.Column(
        db.Text
    )

    barcode = db.Column(
        db.String(100),
        unique=True,
        nullable=True,
        index=True
    )

    secondary_barcode = db.Column(
        db.String(100),
        unique=True
    )

    cost_price = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    selling_price = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    wholesale_price = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    minimum_selling_price = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    tax_rate = db.Column(
        DECIMAL_TYPE,
        default=Decimal("16.00"),
        nullable=False
    )

    tax_included = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    stock = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    minimum_stock = db.Column(
        DECIMAL_TYPE,
        default=Decimal("5.00"),
        nullable=False
    )

    maximum_stock = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    reorder_quantity = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    weight = db.Column(
        DECIMAL_TYPE
    )

    image = db.Column(
        db.String(500)
    )

    manufacturer = db.Column(
        db.String(200)
    )

    model_number = db.Column(
        db.String(150)
    )

    serial_tracking = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    batch_tracking = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    expiry_tracking = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    expiry_date = db.Column(
        db.Date
    )

    notes = db.Column(
        db.Text
    )

    company = db.relationship(
        "Company",
        back_populates="products"
    )

    category = db.relationship(
        "Category",
        back_populates="products"
    )

    brand = db.relationship(
        "Brand",
        back_populates="products"
    )

    unit = db.relationship(
        "Unit",
        back_populates="products"
    )

    barcodes = db.relationship(
        "ProductBarcode",
        back_populates="product",
        cascade="all, delete-orphan"
    )

    sale_items = db.relationship(
        "SaleItem",
        back_populates="product"
    )

    purchase_items = db.relationship(
        "PurchaseItem",
        back_populates="product"
    )

    inventory_movements = db.relationship(
        "InventoryMovement",
        back_populates="product"
    )

    stock_records = db.relationship(
        "Stock",
        back_populates="product"
    )

    def calculate_profit(self):
        """
        هامش الربح للوحدة.
        """
        return (
            Decimal(str(self.selling_price or 0))
            - Decimal(str(self.cost_price or 0))
        )

    def calculate_profit_margin(self):
        """
        نسبة هامش الربح من سعر البيع.
        """
        selling = Decimal(str(self.selling_price or 0))

        if selling <= 0:
            return Decimal("0.00")

        profit = self.calculate_profit()

        return (
            profit / selling * Decimal("100")
        )

    def is_low_stock(self):
        """
        هل المخزون منخفض؟
        """
        return (
            Decimal(str(self.stock or 0))
            <= Decimal(str(self.minimum_stock or 0))
        )

    def __repr__(self):
        return f"<Product {self.name}>"


# ============================================================
# PRODUCT BARCODES
# ============================================================

class ProductBarcode(TimestampMixin, db.Model):
    """
    دعم أكثر من باركود للمنتج.
    """

    __tablename__ = "product_barcodes"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False,
        index=True
    )

    barcode = db.Column(
        db.String(100),
        nullable=False,
        unique=True,
        index=True
    )

    barcode_type = db.Column(
        db.String(50),
        default="CODE128"
    )

    is_primary = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    product = db.relationship(
        "Product",
        back_populates="barcodes"
    )


# ============================================================
# WAREHOUSES
# ============================================================

class Warehouse(TimestampMixin, ActiveMixin, db.Model):
    """
    المستودعات والفروع.
    """

    __tablename__ = "warehouses"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=False,
        index=True
    )

    name = db.Column(
        db.String(200),
        nullable=False
    )

    code = db.Column(
        db.String(50),
        nullable=False
    )

    address = db.Column(
        db.Text
    )

    phone = db.Column(
        db.String(50)
    )

    manager_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    company = db.relationship(
        "Company",
        back_populates="warehouses"
    )

    stocks = db.relationship(
        "Stock",
        back_populates="warehouse",
        cascade="all, delete-orphan"
    )

    inventory_movements = db.relationship(
        "InventoryMovement",
        back_populates="warehouse"
    )

    __table_args__ = (
        UniqueConstraint(
            "company_id",
            "code",
            name="uq_warehouse_company_code"
        ),
    )


# ============================================================
# STOCK
# ============================================================

class Stock(TimestampMixin, db.Model):
    """
    مخزون المنتج في مستودد محدد.

    ملاحظة:
    Product.stock يمثل إجمالي المخزون.
    Stock يمثل تفصيل المخزون حسب المستودع.
    """

    __tablename__ = "stocks"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False,
        index=True
    )

    warehouse_id = db.Column(
        db.Integer,
        db.ForeignKey("warehouses.id"),
        nullable=False,
        index=True
    )

    quantity = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    reserved_quantity = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    damaged_quantity = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    available_quantity = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    product = db.relationship(
        "Product",
        back_populates="stock_records"
    )

    warehouse = db.relationship(
        "Warehouse",
        back_populates="stocks"
    )

    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "warehouse_id",
            name="uq_product_warehouse_stock"
        ),
    )

    def recalculate_available(self):
        self.available_quantity = (
            Decimal(str(self.quantity or 0))
            - Decimal(str(self.reserved_quantity or 0))
            - Decimal(str(self.damaged_quantity or 0))
        )

        if self.available_quantity < 0:
            self.available_quantity = Decimal("0.00")


# ============================================================
# INVENTORY MOVEMENTS
# ============================================================

class InventoryMovement(TimestampMixin, db.Model):
    """
    كل حركة على المخزون.

    أنواع الحركة:
    PURCHASE
    SALE
    RETURN
    ADJUSTMENT
    TRANSFER_IN
    TRANSFER_OUT
    DAMAGE
    OPENING
    STOCKTAKE
    """

    __tablename__ = "inventory_movements"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False,
        index=True
    )

    warehouse_id = db.Column(
        db.Integer,
        db.ForeignKey("warehouses.id"),
        nullable=False,
        index=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    movement_type = db.Column(
        db.String(50),
        nullable=False,
        index=True
    )

    quantity = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    quantity_before = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    quantity_after = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    unit_cost = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    reference_type = db.Column(
        db.String(50)
    )

    reference_id = db.Column(
        db.Integer
    )

    note = db.Column(
        db.Text
    )

    product = db.relationship(
        "Product",
        back_populates="inventory_movements"
    )

    warehouse = db.relationship(
        "Warehouse",
        back_populates="inventory_movements"
    )

    user = db.relationship(
        "User",
        back_populates="inventory_movements"
    )


# ============================================================
# CUSTOMERS
# ============================================================

class Customer(TimestampMixin, ActiveMixin, db.Model):
    """
    العملاء.
    """

    __tablename__ = "customers"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True,
        index=True
    )

    customer_code = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    name = db.Column(
        db.String(200),
        nullable=False,
        index=True
    )

    phone = db.Column(
        db.String(50),
        index=True
    )

    email = db.Column(
        db.String(150)
    )

    address = db.Column(
        db.Text
    )

    tax_number = db.Column(
        db.String(100)
    )

    credit_limit = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    balance = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    notes = db.Column(
        db.Text
    )

    company = db.relationship(
        "Company",
        back_populates="customers"
    )

    sales = db.relationship(
        "Sale",
        back_populates="customer"
    )

    payments = db.relationship(
        "CustomerPayment",
        back_populates="customer"
    )


# ============================================================
# SUPPLIERS
# ============================================================

class Supplier(TimestampMixin, ActiveMixin, db.Model):
    """
    الموردون.
    """

    __tablename__ = "suppliers"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True,
        index=True
    )

    supplier_code = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    name = db.Column(
        db.String(200),
        nullable=False,
        index=True
    )

    phone = db.Column(
        db.String(50)
    )

    email = db.Column(
        db.String(150)
    )

    address = db.Column(
        db.Text
    )

    tax_number = db.Column(
        db.String(100)
    )

    balance = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    notes = db.Column(
        db.Text
    )

    company = db.relationship(
        "Company",
        back_populates="suppliers"
    )

    purchases = db.relationship(
        "Purchase",
        back_populates="supplier"
    )

    payments = db.relationship(
        "SupplierPayment",
        back_populates="supplier"
    )


# ============================================================
# SALES
# ============================================================

class Sale(TimestampMixin, db.Model):
    """
    عملية بيع كاملة.

    هذه هي رأس الفاتورة.
    """

    __tablename__ = "sales"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    invoice_number = db.Column(
        db.String(100),
        nullable=False,
        unique=True,
        index=True
    )

    company_id = db.Column(
        db.Integer,
        db.ForeignKey("companies.id"),
        nullable=True
    )

    customer_id = db.Column(
        db.Integer,
        db.ForeignKey("customers.id"),
        nullable=True,
        index=True
    )

    cashier_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    warehouse_id = db.Column(
        db.Integer,
        db.ForeignKey("warehouses.id"),
        nullable=True
    )

    sale_date = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    subtotal = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    discount_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    tax_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    shipping_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    total_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    paid_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    change_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    cost_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    profit_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    status = db.Column(
        db.String(50),
        default="completed",
        nullable=False,
        index=True
    )

    payment_status = db.Column(
        db.String(50),
        default="paid",
        nullable=False
    )

    notes = db.Column(
        db.Text
    )

    customer = db.relationship(
        "Customer",
        back_populates="sales"
    )

    cashier = db.relationship(
        "User",
        back_populates="sales"
    )

    items = db.relationship(
        "SaleItem",
        back_populates="sale",
        cascade="all, delete-orphan"
    )

    payments = db.relationship(
        "SalePayment",
        back_populates="sale",
        cascade="all, delete-orphan"
    )

    returns = db.relationship(
        "SaleReturn",
        back_populates="sale"
    )

    def calculate_totals(self):
        """
        إعادة حساب إجماليات الفاتورة من الأصناف.
        """

        subtotal = Decimal("0.00")
        cost = Decimal("0.00")

        for item in self.items:

            subtotal += (
                Decimal(str(item.unit_price))
                * Decimal(str(item.quantity))
            )

            cost += (
                Decimal(str(item.unit_cost))
                * Decimal(str(item.quantity))
            )

        self.subtotal = subtotal

        discount = Decimal(
            str(self.discount_amount or 0)
        )

        tax = Decimal(
            str(self.tax_amount or 0)
        )

        shipping = Decimal(
            str(self.shipping_amount or 0)
        )

        self.total_amount = (
            subtotal
            - discount
            + tax
            + shipping
        )

        self.cost_amount = cost

        self.profit_amount = (
            self.total_amount
            - tax
            - cost
        )

        return self.total_amount


# ============================================================
# SALE ITEMS
# ============================================================

class SaleItem(TimestampMixin, db.Model):
    """
    تفاصيل المنتجات داخل الفاتورة.
    """

    __tablename__ = "sale_items"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    sale_id = db.Column(
        db.Integer,
        db.ForeignKey("sales.id"),
        nullable=False,
        index=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False,
        index=True
    )

    product_name = db.Column(
        db.String(250),
        nullable=False
    )

    barcode = db.Column(
        db.String(100)
    )

    quantity = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    unit_price = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    unit_cost = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    discount_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    tax_rate = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    tax_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    total_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    profit_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    sale = db.relationship(
        "Sale",
        back_populates="items"
    )

    product = db.relationship(
        "Product",
        back_populates="sale_items"
    )

    def calculate(self):

        gross = (
            Decimal(str(self.unit_price))
            * Decimal(str(self.quantity))
        )

        discount = Decimal(
            str(self.discount_amount or 0)
        )

        taxable = gross - discount

        self.tax_amount = (
            taxable
            * Decimal(str(self.tax_rate or 0))
            / Decimal("100")
        )

        self.total_amount = (
            taxable + self.tax_amount
        )

        self.profit_amount = (
            taxable
            - (
                Decimal(str(self.unit_cost))
                * Decimal(str(self.quantity))
            )
        )

        return self.total_amount


# ============================================================
# SALE PAYMENTS
# ============================================================

class SalePayment(TimestampMixin, db.Model):
    """
    دفعات الفاتورة.

    يدعم:
    CASH
    CARD
    BANK
    WALLET
    TRANSFER
    CREDIT
    """

    __tablename__ = "sale_payments"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    sale_id = db.Column(
        db.Integer,
        db.ForeignKey("sales.id"),
        nullable=False,
        index=True
    )

    payment_method = db.Column(
        db.String(50),
        nullable=False
    )

    amount = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    reference_number = db.Column(
        db.String(150)
    )

    notes = db.Column(
        db.Text
    )

    sale = db.relationship(
        "Sale",
        back_populates="payments"
    )


# ============================================================
# CUSTOMER PAYMENTS
# ============================================================

class CustomerPayment(TimestampMixin, db.Model):
    """
    دفعات العملاء والحسابات الآجلة.
    """

    __tablename__ = "customer_payments"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    customer_id = db.Column(
        db.Integer,
        db.ForeignKey("customers.id"),
        nullable=False,
        index=True
    )

    amount = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    payment_method = db.Column(
        db.String(50),
        nullable=False
    )

    reference_number = db.Column(
        db.String(150)
    )

    notes = db.Column(
        db.Text
    )

    customer = db.relationship(
        "Customer",
        back_populates="payments"
    )


# ============================================================
# PURCHASES
# ============================================================

class Purchase(TimestampMixin, db.Model):
    """
    فواتير المشتريات من الموردين.
    """

    __tablename__ = "purchases"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    purchase_number = db.Column(
        db.String(100),
        nullable=False,
        unique=True,
        index=True
    )

    supplier_id = db.Column(
        db.Integer,
        db.ForeignKey("suppliers.id"),
        nullable=False,
        index=True
    )

    warehouse_id = db.Column(
        db.Integer,
        db.ForeignKey("warehouses.id"),
        nullable=True
    )

    purchase_date = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )

    subtotal = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    discount_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    tax_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    total_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    paid_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    due_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    status = db.Column(
        db.String(50),
        default="received"
    )

    notes = db.Column(
        db.Text
    )

    supplier = db.relationship(
        "Supplier",
        back_populates="purchases"
    )

    items = db.relationship(
        "PurchaseItem",
        back_populates="purchase",
        cascade="all, delete-orphan"
    )


# ============================================================
# PURCHASE ITEMS
# ============================================================

class PurchaseItem(TimestampMixin, db.Model):
    """
    تفاصيل فاتورة المشتريات.
    """

    __tablename__ = "purchase_items"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    purchase_id = db.Column(
        db.Integer,
        db.ForeignKey("purchases.id"),
        nullable=False,
        index=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False,
        index=True
    )

    quantity = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    unit_cost = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    discount_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    tax_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    total_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    purchase = db.relationship(
        "Purchase",
        back_populates="items"
    )

    product = db.relationship(
        "Product",
        back_populates="purchase_items"
    )


# ============================================================
# SUPPLIER PAYMENTS
# ============================================================

class SupplierPayment(TimestampMixin, db.Model):
    """
    دفعات الموردين.
    """

    __tablename__ = "supplier_payments"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    supplier_id = db.Column(
        db.Integer,
        db.ForeignKey("suppliers.id"),
        nullable=False,
        index=True
    )

    amount = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    payment_method = db.Column(
        db.String(50),
        nullable=False
    )

    reference_number = db.Column(
        db.String(150)
    )

    notes = db.Column(
        db.Text
    )

    supplier = db.relationship(
        "Supplier",
        back_populates="payments"
    )


# ============================================================
# SALE RETURNS
# ============================================================

class SaleReturn(TimestampMixin, db.Model):
    """
    مرتجعات المبيعات.
    """

    __tablename__ = "sale_returns"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    return_number = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    sale_id = db.Column(
        db.Integer,
        db.ForeignKey("sales.id"),
        nullable=False,
        index=True
    )

    return_date = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    total_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    reason = db.Column(
        db.Text
    )

    status = db.Column(
        db.String(50),
        default="completed"
    )

    sale = db.relationship(
        "Sale",
        back_populates="returns"
    )

    items = db.relationship(
        "SaleReturnItem",
        back_populates="sale_return",
        cascade="all, delete-orphan"
    )


# ============================================================
# SALE RETURN ITEMS
# ============================================================

class SaleReturnItem(db.Model):
    """
    تفاصيل المرتجع.
    """

    __tablename__ = "sale_return_items"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    return_id = db.Column(
        db.Integer,
        db.ForeignKey("sale_returns.id"),
        nullable=False
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False
    )

    quantity = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    unit_price = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    total_amount = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    sale_return = db.relationship(
        "SaleReturn",
        back_populates="items"
    )


# ============================================================
# EXPENSE CATEGORIES
# ============================================================

class ExpenseCategory(TimestampMixin, ActiveMixin, db.Model):
    """
    تصنيفات المصروفات.
    """

    __tablename__ = "expense_categories"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(150),
        nullable=False,
        unique=True
    )

    description = db.Column(
        db.Text
    )

    expenses = db.relationship(
        "Expense",
        back_populates="category"
    )


# ============================================================
# EXPENSES
# ============================================================

class Expense(TimestampMixin, db.Model):
    """
    مصروفات المتجر.
    """

    __tablename__ = "expenses"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    category_id = db.Column(
        db.Integer,
        db.ForeignKey("expense_categories.id"),
        nullable=True
    )

    created_by_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    title = db.Column(
        db.String(200),
        nullable=False
    )

    description = db.Column(
        db.Text
    )

    amount = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    expense_date = db.Column(
        db.Date,
        default=date.today,
        nullable=False,
        index=True
    )

    payment_method = db.Column(
        db.String(50),
        default="cash"
    )

    reference_number = db.Column(
        db.String(150)
    )

    category = db.relationship(
        "ExpenseCategory",
        back_populates="expenses"
    )

    created_by = db.relationship(
        "User",
        back_populates="expenses"
    )


# ============================================================
# NOTIFICATIONS
# ============================================================

class Notification(TimestampMixin, db.Model):
    """
    إشعارات النظام.
    """

    __tablename__ = "notifications"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    notification_type = db.Column(
        db.String(50),
        nullable=False
    )

    title = db.Column(
        db.String(250),
        nullable=False
    )

    message = db.Column(
        db.Text,
        nullable=False
    )

    is_read = db.Column(
        db.Boolean,
        default=False,
        nullable=False,
        index=True
    )

    read_at = db.Column(
        db.DateTime
    )


# ============================================================
# AUDIT LOG
# ============================================================

class AuditLog(db.Model):
    """
    سجل أمني لكل العمليات المهمة.
    """

    __tablename__ = "audit_logs"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True,
        index=True
    )

    action = db.Column(
        db.String(100),
        nullable=False,
        index=True
    )

    table_name = db.Column(
        db.String(100)
    )

    record_id = db.Column(
        db.Integer
    )

    old_values = db.Column(
        db.JSON
    )

    new_values = db.Column(
        db.JSON
    )

    ip_address = db.Column(
        db.String(100)
    )

    user_agent = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False,
        index=True
    )

    user = db.relationship(
        "User",
        back_populates="audit_logs"
    )


# ============================================================
# SYSTEM SETTINGS
# ============================================================

class SystemSetting(TimestampMixin, db.Model):
    """
    إعدادات النظام الديناميكية.
    """

    __tablename__ = "system_settings"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    setting_key = db.Column(
        db.String(150),
        unique=True,
        nullable=False,
        index=True
    )

    setting_value = db.Column(
        db.Text
    )

    setting_type = db.Column(
        db.String(50),
        default="string"
    )

    description = db.Column(
        db.Text
    )


# ============================================================
# TAX RATES
# ============================================================

class TaxRate(TimestampMixin, ActiveMixin, db.Model):
    """
    نسب الضرائب.
    """

    __tablename__ = "tax_rates"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(100),
        nullable=False
    )

    rate = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    is_default = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    description = db.Column(
        db.Text
    )


# ============================================================
# DISCOUNTS
# ============================================================

class Discount(TimestampMixin, ActiveMixin, db.Model):
    """
    الخصومات.
    """

    __tablename__ = "discounts"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    discount_type = db.Column(
        db.String(30),
        nullable=False
    )

    value = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    minimum_amount = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    maximum_discount = db.Column(
        DECIMAL_TYPE
    )

    start_date = db.Column(
        db.DateTime
    )

    end_date = db.Column(
        db.DateTime
    )

    usage_limit = db.Column(
        db.Integer
    )

    usage_count = db.Column(
        db.Integer,
        default=0,
        nullable=False
    )

    coupon_code = db.Column(
        db.String(100),
        unique=True
    )

    description = db.Column(
        db.Text
    )


# ============================================================
# CASH REGISTERS
# ============================================================

class CashRegister(TimestampMixin, ActiveMixin, db.Model):
    """
    صناديق الكاشير.
    """

    __tablename__ = "cash_registers"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    name = db.Column(
        db.String(150),
        nullable=False
    )

    code = db.Column(
        db.String(50),
        nullable=False,
        unique=True
    )

    warehouse_id = db.Column(
        db.Integer,
        db.ForeignKey("warehouses.id"),
        nullable=True
    )

    current_balance = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    opened = db.Column(
        db.Boolean,
        default=False,
        nullable=False
    )

    opened_at = db.Column(
        db.DateTime
    )

    closed_at = db.Column(
        db.DateTime
    )

    sessions = db.relationship(
        "CashRegisterSession",
        back_populates="register"
    )


# ============================================================
# CASH REGISTER SESSIONS
# ============================================================

class CashRegisterSession(TimestampMixin, db.Model):
    """
    جلسة الكاشير.
    """

    __tablename__ = "cash_register_sessions"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    register_id = db.Column(
        db.Integer,
        db.ForeignKey("cash_registers.id"),
        nullable=False
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=False
    )

    opening_balance = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00"),
        nullable=False
    )

    closing_balance = db.Column(
        DECIMAL_TYPE
    )

    expected_balance = db.Column(
        DECIMAL_TYPE
    )

    difference = db.Column(
        DECIMAL_TYPE
    )

    opened_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    closed_at = db.Column(
        db.DateTime
    )

    status = db.Column(
        db.String(50),
        default="open"
    )

    register = db.relationship(
        "CashRegister",
        back_populates="sessions"
    )


# ============================================================
# CASH MOVEMENTS
# ============================================================

class CashMovement(TimestampMixin, db.Model):
    """
    إدخال وإخراج الأموال من الصندوق.
    """

    __tablename__ = "cash_movements"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    register_id = db.Column(
        db.Integer,
        db.ForeignKey("cash_registers.id"),
        nullable=False
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    movement_type = db.Column(
        db.String(50),
        nullable=False
    )

    amount = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    reason = db.Column(
        db.Text
    )

    reference_number = db.Column(
        db.String(150)
    )


# ============================================================
# PRODUCT SERIAL NUMBERS
# ============================================================

class ProductSerial(TimestampMixin, db.Model):
    """
    أرقام السيريال للمنتجات التي تحتاج تتبعًا فرديًا.
    """

    __tablename__ = "product_serials"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False
    )

    serial_number = db.Column(
        db.String(200),
        nullable=False,
        unique=True,
        index=True
    )

    status = db.Column(
        db.String(50),
        default="available"
    )

    purchase_id = db.Column(
        db.Integer,
        db.ForeignKey("purchases.id"),
        nullable=True
    )

    sale_id = db.Column(
        db.Integer,
        db.ForeignKey("sales.id"),
        nullable=True
    )

    notes = db.Column(
        db.Text
    )


# ============================================================
# PRODUCT BATCHES
# ============================================================

class ProductBatch(TimestampMixin, db.Model):
    """
    تشغيلات المنتجات.
    مهم للمواد الغذائية والأدوية ومستحضرات التجميل وغيرها.
    """

    __tablename__ = "product_batches"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False
    )

    batch_number = db.Column(
        db.String(150),
        nullable=False
    )

    quantity = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    manufacturing_date = db.Column(
        db.Date
    )

    expiry_date = db.Column(
        db.Date
    )

    unit_cost = db.Column(
        DECIMAL_TYPE,
        default=Decimal("0.00")
    )

    __table_args__ = (
        UniqueConstraint(
            "product_id",
            "batch_number",
            name="uq_product_batch"
        ),
    )


# ============================================================
# STOCKTAKES / INVENTORY COUNTS
# ============================================================

class Stocktake(TimestampMixin, db.Model):
    """
    جرد المخزون.
    """

    __tablename__ = "stocktakes"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    warehouse_id = db.Column(
        db.Integer,
        db.ForeignKey("warehouses.id"),
        nullable=False
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    stocktake_number = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    status = db.Column(
        db.String(50),
        default="draft"
    )

    started_at = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    completed_at = db.Column(
        db.DateTime
    )

    notes = db.Column(
        db.Text
    )

    items = db.relationship(
        "StocktakeItem",
        back_populates="stocktake",
        cascade="all, delete-orphan"
    )


# ============================================================
# STOCKTAKE ITEMS
# ============================================================

class StocktakeItem(db.Model):
    """
    تفاصيل الجرد.
    """

    __tablename__ = "stocktake_items"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    stocktake_id = db.Column(
        db.Integer,
        db.ForeignKey("stocktakes.id"),
        nullable=False
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False
    )

    expected_quantity = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    actual_quantity = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    difference = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    note = db.Column(
        db.Text
    )

    stocktake = db.relationship(
        "Stocktake",
        back_populates="items"
    )


# ============================================================
# PURCHASE ORDERS
# ============================================================

class PurchaseOrder(TimestampMixin, db.Model):
    """
    طلب شراء قبل إصدار فاتورة المورد.
    """

    __tablename__ = "purchase_orders"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    order_number = db.Column(
        db.String(100),
        unique=True,
        nullable=False
    )

    supplier_id = db.Column(
        db.Integer,
        db.ForeignKey("suppliers.id"),
        nullable=True
    )

    warehouse_id = db.Column(
        db.Integer,
        db.ForeignKey("warehouses.id"),
        nullable=True
    )

    order_date = db.Column(
        db.DateTime,
        default=datetime.utcnow
    )

    expected_date = db.Column(
        db.Date
    )

    status = db.Column(
        db.String(50),
        default="draft"
    )

    notes = db.Column(
        db.Text
    )

    items = db.relationship(
        "PurchaseOrderItem",
        back_populates="order",
        cascade="all, delete-orphan"
    )


# ============================================================
# PURCHASE ORDER ITEMS
# ============================================================

class PurchaseOrderItem(db.Model):
    """
    تفاصيل طلب الشراء.
    """

    __tablename__ = "purchase_order_items"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    order_id = db.Column(
        db.Integer,
        db.ForeignKey("purchase_orders.id"),
        nullable=False
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False
    )

    quantity = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    expected_cost = db.Column(
        DECIMAL_TYPE,
        nullable=False
    )

    order = db.relationship(
        "PurchaseOrder",
        back_populates="items"
    )


# ============================================================
# PRODUCT PRICE HISTORY
# ============================================================

class ProductPriceHistory(db.Model):
    """
    تاريخ تغييرات أسعار المنتجات.
    """

    __tablename__ = "product_price_history"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=False,
        index=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    old_cost_price = db.Column(
        DECIMAL_TYPE
    )

    new_cost_price = db.Column(
        DECIMAL_TYPE
    )

    old_selling_price = db.Column(
        DECIMAL_TYPE
    )

    new_selling_price = db.Column(
        DECIMAL_TYPE
    )

    reason = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# BARCODE SCANS
# ============================================================

class BarcodeScan(db.Model):
    """
    تسجيل عمليات قراءة الباركود.
    """

    __tablename__ = "barcode_scans"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    barcode = db.Column(
        db.String(150),
        nullable=False,
        index=True
    )

    product_id = db.Column(
        db.Integer,
        db.ForeignKey("products.id"),
        nullable=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    scan_type = db.Column(
        db.String(50),
        nullable=False
    )

    scanned_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# LOGIN HISTORY
# ============================================================

class LoginHistory(db.Model):
    """
    سجل تسجيل الدخول.
    """

    __tablename__ = "login_history"

    id = db.Column(
        db.Integer,
        primary_key=True
    )

    user_id = db.Column(
        db.Integer,
        db.ForeignKey("users.id"),
        nullable=True
    )

    username = db.Column(
        db.String(100)
    )

    success = db.Column(
        db.Boolean,
        nullable=False
    )

    ip_address = db.Column(
        db.String(100)
    )

    user_agent = db.Column(
        db.Text
    )

    created_at = db.Column(
        db.DateTime,
        default=datetime.utcnow,
        nullable=False
    )


# ============================================================
# NOTIFICATION HELPERS
# ============================================================

def create_notification(
    title,
    message,
    notification_type="info",
    user_id=None
):
    """
    إنشاء إشعار للنظام.
    """

    notification = Notification(
        user_id=user_id,
        notification_type=notification_type,
        title=title,
        message=message
    )

    db.session.add(notification)

    return notification


# ============================================================
# PRODUCT HELPERS
# ============================================================

def get_product_by_barcode(barcode):
    """
    البحث عن منتج باستخدام الباركود.
    """

    if not barcode:
        return None

    barcode = str(barcode).strip()

    product = Product.query.filter(
        Product.barcode == barcode
    ).first()

    if product:
        return product

    return ProductBarcode.query.filter(
        ProductBarcode.barcode == barcode
    ).first().product if ProductBarcode.query.filter(
        ProductBarcode.barcode == barcode
    ).first() else None


def get_product_by_sku(sku):
    """
    البحث باستخدام SKU.
    """

    if not sku:
        return None

    return Product.query.filter(
        Product.sku == str(sku).strip()
    ).first()


# ============================================================
# STOCK HELPERS
# ============================================================

def increase_product_stock(
    product,
    quantity,
    warehouse=None,
    user=None,
    movement_type="ADJUSTMENT",
    reference_type=None,
    reference_id=None,
    note=None
):
    """
    زيادة المخزون بطريقة منظمة.
    """

    quantity = Decimal(str(quantity))

    if quantity <= 0:
        raise ValueError(
            "Quantity must be greater than zero."
        )

    before = Decimal(
        str(product.stock or 0)
    )

    product.stock = before + quantity

    if warehouse:

        stock = Stock.query.filter_by(
            product_id=product.id,
            warehouse_id=warehouse.id
        ).first()

        if not stock:

            stock = Stock(
                product_id=product.id,
                warehouse_id=warehouse.id,
                quantity=Decimal("0.00")
            )

            db.session.add(stock)

        stock.quantity = (
            Decimal(str(stock.quantity or 0))
            + quantity
        )

        stock.recalculate_available()

    movement = InventoryMovement(
        product_id=product.id,
        warehouse_id=warehouse.id if warehouse else None,
        user_id=user.id if user else None,
        movement_type=movement_type,
        quantity=quantity,
        quantity_before=before,
        quantity_after=product.stock,
        unit_cost=product.cost_price,
        reference_type=reference_type,
        reference_id=reference_id,
        note=note
    )

    db.session.add(movement)

    return product


def decrease_product_stock(
    product,
    quantity,
    warehouse=None,
    user=None,
    movement_type="SALE",
    reference_type=None,
    reference_id=None,
    note=None
):
    """
    تخفيض المخزون مع منع المخزون السالب.
    """

    quantity = Decimal(str(quantity))

    if quantity <= 0:
        raise ValueError(
            "Quantity must be greater than zero."
        )

    before = Decimal(
        str(product.stock or 0)
    )

    if before < quantity:

        raise ValueError(
            f"Insufficient stock for product: {product.name}"
        )

    product.stock = before - quantity

    if warehouse:

        stock = Stock.query.filter_by(
            product_id=product.id,
            warehouse_id=warehouse.id
        ).first()

        if not stock:

            raise ValueError(
                "Product does not exist in this warehouse."
            )

        available = Decimal(
            str(stock.available_quantity or 0)
        )

        if available < quantity:

            raise ValueError(
                f"Insufficient warehouse stock for: {product.name}"
            )

        stock.quantity -= quantity

        stock.recalculate_available()

    movement = InventoryMovement(
        product_id=product.id,
        warehouse_id=warehouse.id if warehouse else None,
        user_id=user.id if user else None,
        movement_type=movement_type,
        quantity=-quantity,
        quantity_before=before,
        quantity_after=product.stock,
        unit_cost=product.cost_price,
        reference_type=reference_type,
        reference_id=reference_id,
        note=note
    )

    db.session.add(movement)

    return product


# ============================================================
# FINANCIAL HELPERS
# ============================================================

def calculate_tax(amount, tax_rate):
    """
    حساب الضريبة.
    """

    amount = Decimal(str(amount or 0))
    tax_rate = Decimal(str(tax_rate or 0))

    return (
        amount
        * tax_rate
        / Decimal("100")
    ).quantize(Decimal("0.01"))


def calculate_profit(
    selling_price,
    cost_price,
    quantity=1
):
    """
    حساب الربح.
    """

    selling_price = Decimal(
        str(selling_price or 0)
    )

    cost_price = Decimal(
        str(cost_price or 0)
    )

    quantity = Decimal(
        str(quantity or 0)
    )

    return (
        selling_price - cost_price
    ) * quantity


# ============================================================
# DATABASE INITIALIZATION
# ============================================================

def init_db(app):
    """
    ربط قاعدة البيانات بتطبيق Flask.

    في app.py:

        from database import db, init_db

        app.config["SQLALCHEMY_DATABASE_URI"] = "sqlite:///smartpos.db"
        app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False

        init_db(app)
    """

    db.init_app(app)

    with app.app_context():
        db.create_all()

    return db


# ============================================================
# DEFAULT DATA
# ============================================================

def create_default_data():
    """
    إنشاء البيانات الأساسية للنظام لأول تشغيل فقط.
    """

    # --------------------------------------------------------
    # Roles
    # --------------------------------------------------------

    roles = [
        {
          
            "code": "admin",
            "description": "صلاحيات كاملة على النظام"
        },
        {
            "name": "كاشير",
            "code": "cashier",
            "description": "إدارة المبيعات ونقطة البيع"
        },
        {
            "name": "مسؤول مخازن",
            "code": "warehouse",
            "description": "إدارة المنتجات والمخزون والجرد"
        },
        {
            "name": "محاسب",
            "code": "accountant",
            "description": "إدارة الحسابات والتقارير المالية"
        },
        {
            "name": "مدير",
            "code": "manager",
            "description": "إدارة العمليات والتقارير"
        }
    ]

    for role_data in roles:

        existing = Role.query.filter_by(
            code=role_data["code"]
        ).first()

        if not existing:

            db.session.add(
                Role(**role_data)
            )

    # --------------------------------------------------------
    # Default Company
    # --------------------------------------------------------

    company = Company.query.first()

    if not company:

        company = Company(
            name="Smart POS Store",
            legal_name="Smart POS Store",
            country="Palestine",
            currency="ILS",
            tax_enabled=True,
            default_tax_rate=Decimal("16.00"),
            invoice_footer=(
                "شكراً لتعاملكم معنا."
            )
        )

        db.session.add(company)

        db.session.flush()

    # --------------------------------------------------------
    # Categories
    # --------------------------------------------------------

    default_categories = [
        (
            "إلكترونيات وجوالات ذكية",
            "electronics"
        ),
        (
            "أجهزة منزلية متطورة",
            "home"
        ),
        (
            "عطور ومستحضرات تجميل",
            "perfumes"
        ),
        (
            "مواد غذائية ومشروبات",
            "foods"
        ),
        (
            "ملابس وأزياء عصرية",
            "clothes"
        ),
    ]

    for name, code in default_categories:

        exists = Category.query.filter_by(
            company_id=company.id,
            name=name
        ).first()

        if not exists:

            db.session.add(
                Category(
                    company_id=company.id,
                    name=name,
                    code=code
                )
            )

    # --------------------------------------------------------
    # Units
    # --------------------------------------------------------

    default_units = [
        ("قطعة", "PCS"),
        ("كرتونة", "BOX"),
        ("كيلوغرام", "KG"),
        ("غرام", "G"),
        ("لتر", "L"),
        ("ملليلتر", "ML"),
        ("متر", "M"),
    ]

    for name, abbreviation in default_units:

        exists = Unit.query.filter_by(
            name=name
        ).first()

        if not exists:

            db.session.add(
                Unit(
                    name=name,
                    abbreviation=abbreviation
                )
            )

    # --------------------------------------------------------
    # Tax
    # --------------------------------------------------------

    default_tax = TaxRate.query.filter_by(
        rate=Decimal("16.00"),
        is_default=True
    ).first()

    if not default_tax:

        db.session.add(
            TaxRate(
                name="ضريبة القيمة المضافة",
                rate=Decimal("16.00"),
                is_default=True,
                description="النسبة الافتراضية"
            )
        )

    # --------------------------------------------------------
    # Expense Categories
    # --------------------------------------------------------

    expenses = [
        "إيجار",
        "كهرباء",
        "مياه",
        "إنترنت",
        "رواتب",
        "صيانة",
        "نقل",
        "تسويق",
        "أخرى"
    ]

    for name in expenses:

        exists = ExpenseCategory.query.filter_by(
            name=name
        ).first()

        if not exists:

            db.session.add(
                ExpenseCategory(
                    name=name
                )
            )

    # --------------------------------------------------------
    # Settings
    # --------------------------------------------------------

    settings = {
        "store_name": company.name,
        "currency": "₪",
        "currency_code": "ILS",
        "default_tax_rate": "16",
        "low_stock_default": "5",
        "invoice_prefix": "INV",
        "purchase_prefix": "PUR",
        "return_prefix": "RET",
        "timezone": "Asia/Gaza",
        "date_format": "YYYY-MM-DD",
        "allow_negative_stock": "false",
        "tax_enabled": "true",
    }

    for key, value in settings.items():

        exists = SystemSetting.query.filter_by(
            setting_key=key
        ).first()

        if not exists:

            db.session.add(
                SystemSetting(
                    setting_key=key,
                    setting_value=str(value)
                )
            )

    db.session.commit()


# ============================================================
# DATABASE RESET - DEVELOPMENT ONLY
# ============================================================

def reset_database(app):
    """
    حذف وإعادة بناء قاعدة البيانات.

    تحذير:
    لا تستخدم هذه الدالة في الإنتاج.
    """

    with app.app_context():

        db.drop_all()

        db.create_all()

        create_default_data()


# ============================================================
# QUERY HELPERS
# ============================================================

def get_low_stock_products():
    """
    جميع المنتجات التي تحتاج إعادة تخزين.
    """

    return Product.query.filter(
        Product.is_active.is_(True),
        Product.stock <= Product.minimum_stock
    ).order_by(
        Product.stock.asc()
    ).all()


def get_active_products():
    """
    المنتجات النشطة.
    """

    return Product.query.filter_by(
        is_active=True
    ).order_by(
        Product.name.asc()
    ).all()


def search_products(search_term):
    """
    البحث بالاسم أو SKU أو الباركود.
    """

    search_term = (
        str(search_term or "")
        .strip()
    )

    if not search_term:
        return []

    pattern = f"%{search_term}%"

    return Product.query.filter(
        Product.is_active.is_(True)
    ).filter(
        db.or_(
            Product.name.ilike(pattern),
            Product.sku.ilike(pattern),
            Product.barcode.ilike(pattern)
        )
    ).order_by(
        Product.name.asc()
    ).all()


# ============================================================
# REPORTING HELPERS
# ============================================================

def get_sales_summary(start_date=None, end_date=None):
    """
    ملخص المبيعات.
    """

    query = Sale.query.filter(
        Sale.status == "completed"
    )

    if start_date:

        query = query.filter(
            Sale.sale_date >= start_date
        )

    if end_date:

        query = query.filter(
            Sale.sale_date <= end_date
        )

    sales = query.all()

    total_sales = Decimal("0.00")
    total_cost = Decimal("0.00")
    total_profit = Decimal("0.00")
    invoice_count = 0

    for sale in sales:

        total_sales += Decimal(
            str(sale.total_amount or 0)
        )

        total_cost += Decimal(
            str(sale.cost_amount or 0)
        )

        total_profit += Decimal(
            str(sale.profit_amount or 0)
        )

        invoice_count += 1

    return {
        "total_sales": total_sales,
        "total_cost": total_cost,
        "total_profit": total_profit,
        "invoice_count": invoice_count
    }


# ============================================================
# DATABASE INDEXES
# ============================================================

Index(
    "idx_product_name_barcode",
    Product.name,
    Product.barcode
)

Index(
    "idx_sales_date_status",
    Sale.sale_date,
    Sale.status
)

Index(
    "idx_inventory_product_date",
    InventoryMovement.product_id,
    InventoryMovement.created_at
)

Index(
    "idx_audit_user_date",
    AuditLog.user_id,
    AuditLog.created_at
)


# ============================================================
# VALIDATION
# ============================================================

@validates("cost_price")
def validate_cost_price(
    self,
    key,
    value
):
    """
    منع أسعار التكلفة السالبة.
    """

    value = Decimal(str(value))

    if value < 0:

        raise ValueError(
            "Cost price cannot be negative."
        )

    return value


@validates("selling_price")
def validate_selling_price(
    self,
    key,
    value
):
    """
    منع أسعار البيع السالبة.
    """

    value = Decimal(str(value))

    if value < 0:

        raise ValueError(
            "Selling price cannot be negative."
        )

    return value


# ============================================================
# FINAL DATABASE UTILITIES
# ============================================================

def commit_database():
    """
    حفظ المعاملات.
    """

    try:

        db.session.commit()

    except Exception:

        db.session.rollback()

        raise


def rollback_database():
    """
    التراجع عن المعاملة الحالية.
    """

    db.session.rollback()


def close_database():
    """
    إغلاق جلسة قاعدة البيانات.
    """

    db.session.remove()