import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import api from '../services/api';
import {
  UtensilsCrossed,
  ShoppingBag,
  Plus,
  Minus,
  Trash2,
  Search,
  CheckCircle2,
  Clock,
  Receipt,
  AlertCircle,
  RefreshCw,
  X,
  LayoutGrid,
  ListOrdered,
  ArrowRight,
} from 'lucide-react';

export const Tables = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('floor'); // 'floor' | 'orders'

  // New Order POS Punching state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null); // Table object or null
  const [orderType, setOrderType] = useState('dine-in'); // 'dine-in' | 'takeaway'
  const [cart, setCart] = useState([]); // array of { menuItem, name, price, quantity, total }
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Active Running Order Management modal state
  const [viewingOrder, setViewingOrder] = useState(null);
  const [isAddingItemsToActive, setIsAddingItemsToActive] = useState(false);
  const [extraCart, setExtraCart] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const categories = [
    'All',
    'Starters',
    'Main Course',
    'Breads',
    'Biryani',
    'Beverages',
    'Desserts',
  ];

  const fetchFloorData = async () => {
    try {
      setLoading(true);
      const [tablesRes, ordersRes, menuRes] = await Promise.all([
        api.get('/tables'),
        api.get('/orders?status=open'),
        api.get('/menu'),
      ]);
      setTables(tablesRes.data.data || []);
      setOrders(ordersRes.data.data || []);
      setMenuItems((menuRes.data.data || []).filter((m) => m.isAvailable));
    } catch (err) {
      console.error('Failed to load floor data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFloorData();
  }, []);

  // Open POS Puncher for a specific table (or takeaway)
  const handleStartOrder = (table = null, type = 'dine-in') => {
    setSelectedTable(table);
    setOrderType(type);
    setCart([]);
    setMenuSearch('');
    setSelectedCategory('All');
    setOrderError('');
    setIsOrderModalOpen(true);
  };

  // Cart operations
  const handleAddToCart = (dish) => {
    setCart((prev) => {
      const existing = prev.find((i) => i._id === dish._id);
      if (existing) {
        return prev.map((i) =>
          i._id === dish._id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
            : i
        );
      }
      return [
        ...prev,
        {
          _id: dish._id,
          menuItem: dish._id,
          name: dish.name,
          price: dish.price,
          quantity: 1,
          total: dish.price,
          foodType: dish.foodType,
        },
      ];
    });
  };

  const handleUpdateCartQty = (dishId, delta) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item._id === dishId) {
            const newQty = item.quantity + delta;
            return newQty > 0
              ? { ...item, quantity: newQty, total: newQty * item.price }
              : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  const handleRemoveFromCart = (dishId) => {
    setCart((prev) => prev.filter((i) => i._id !== dishId));
  };

  const cartSubtotal = cart.reduce((sum, item) => sum + item.total, 0);

  // Submit Order
  const handleConfirmOrder = async () => {
    if (cart.length === 0) {
      setOrderError('Please select at least one menu item.');
      return;
    }

    try {
      setSubmittingOrder(true);
      setOrderError('');

      const payload = {
        orderType,
        tableId: orderType === 'dine-in' ? selectedTable?._id : null,
        items: cart.map((item) => ({
          menuItem: item._id,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
        })),
      };

      await api.post('/orders', payload);
      setIsOrderModalOpen(false);
      await fetchFloorData();
    } catch (err) {
      setOrderError(err.message || 'Failed to place order');
    } finally {
      setSubmittingOrder(false);
    }
  };

  // View running table's order
  const handleOpenRunningTable = (table) => {
    const activeOrder = orders.find(
      (o) => o.table?._id === table._id || o.table === table._id
    );
    if (activeOrder) {
      setViewingOrder(activeOrder);
      setIsAddingItemsToActive(false);
      setExtraCart([]);
    }
  };

  // Add extra items to active running order
  const handleAddExtraToOrder = (dish) => {
    setExtraCart((prev) => {
      const existing = prev.find((i) => i._id === dish._id);
      if (existing) {
        return prev.map((i) =>
          i._id === dish._id
            ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.price }
            : i
        );
      }
      return [
        ...prev,
        {
          _id: dish._id,
          menuItem: dish._id,
          name: dish.name,
          price: dish.price,
          quantity: 1,
          total: dish.price,
        },
      ];
    });
  };

  const handleConfirmExtraItems = async () => {
    if (extraCart.length === 0) return;
    try {
      setActionLoading(true);
      const res = await api.put(`/orders/${viewingOrder._id}/add-items`, {
        items: extraCart,
      });
      setViewingOrder(res.data.data);
      setIsAddingItemsToActive(false);
      setExtraCart([]);
      await fetchFloorData();
    } catch (err) {
      alert(err.message || 'Failed to add items to running order');
    } finally {
      setActionLoading(false);
    }
  };

  // Cancel running order
  const handleCancelActiveOrder = async (orderId) => {
    if (!window.confirm('Are you sure you want to cancel this order? Table will be marked free.')) {
      return;
    }
    try {
      setActionLoading(true);
      await api.put(`/orders/${orderId}/cancel`);
      setViewingOrder(null);
      await fetchFloorData();
    } catch (err) {
      alert(err.message || 'Failed to cancel order');
    } finally {
      setActionLoading(false);
    }
  };

  // Filter menu items for modal picker
  const filteredDishes = menuItems.filter((dish) => {
    const matchesCategory =
      selectedCategory === 'All' || dish.category === selectedCategory;
    const matchesSearch = dish.name
      .toLowerCase()
      .includes(menuSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const freeCount = tables.filter((t) => t.status === 'free').length;
  const runningCount = tables.filter((t) => t.status === 'running').length;

  return (
    <div className="space-y-6">
      {/* Top Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Floor & Order Management
            </h2>
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
              <button
                onClick={() => setActiveTab('floor')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'floor'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Floor Grid ({freeCount} Free)
              </button>
              <button
                onClick={() => setActiveTab('orders')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                  activeTab === 'orders'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <ListOrdered className="w-3.5 h-3.5" />
                Running Orders ({orders.length})
              </button>
            </div>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time table status, kitchen tickets, and instant order punching
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchFloorData}
            loading={loading}
          >
            Refresh Floor
          </Button>
          <Button
            variant="dark"
            size="sm"
            icon={ShoppingBag}
            onClick={() => handleStartOrder(null, 'takeaway')}
          >
            New Takeaway Order
          </Button>
        </div>
      </div>

      {/* Main Floor View or Orders List */}
      {loading ? (
        <LoadingSpinner text="Synchronizing table floor plan..." />
      ) : activeTab === 'floor' ? (
        <div className="space-y-6">
          {/* Tables Grid (T1–T10) */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {tables.map((table) => {
              const isFree = table.status === 'free';
              const activeOrder = orders.find(
                (o) => o.table?._id === table._id || o.table === table._id
              );

              return (
                <div
                  key={table._id}
                  onClick={() =>
                    isFree
                      ? handleStartOrder(table, 'dine-in')
                      : handleOpenRunningTable(table)
                  }
                  className={`group relative p-5 rounded-2xl border text-center transition-all duration-200 cursor-pointer select-none ${
                    isFree
                      ? 'bg-white border-slate-200/90 hover:border-brand-500 hover:shadow-md'
                      : 'bg-emerald-50/70 border-emerald-400 shadow-xs hover:border-emerald-500 hover:shadow-md'
                  }`}
                >
                  {/* Status Indicator Chip */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-extrabold text-xl text-slate-900 tracking-tight">
                      {table.tableNumber}
                    </span>
                    <Badge
                      variant={isFree ? 'default' : 'success'}
                      size="sm"
                      className="font-semibold uppercase tracking-wider text-[10px]"
                    >
                      {isFree ? 'Free' : 'Running'}
                    </Badge>
                  </div>

                  {/* Table Icon Graphic */}
                  <div className="py-3">
                    <div
                      className={`w-14 h-14 mx-auto rounded-2xl flex items-center justify-center transition-transform group-hover:scale-105 ${
                        isFree
                          ? 'bg-slate-100 text-slate-400 group-hover:bg-brand-50 group-hover:text-brand-600'
                          : 'bg-emerald-500 text-white shadow-sm'
                      }`}
                    >
                      <UtensilsCrossed className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Order snapshot summary */}
                  <div className="pt-3 border-t border-slate-200/60 text-xs">
                    {isFree ? (
                      <span className="font-medium text-slate-400 group-hover:text-brand-600">
                        + Tap to Punch Order
                      </span>
                    ) : (
                      <div className="space-y-0.5">
                        <p className="font-bold text-emerald-900">
                          ₹{activeOrder?.subtotal?.toFixed(2) || '0.00'}
                        </p>
                        <p className="text-[11px] text-emerald-700 font-medium">
                          {activeOrder?.items?.reduce((s, i) => s + i.quantity, 0) || 0} items
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Orders List View */
        <Card className="p-0 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Order #</th>
                  <th className="px-6 py-3.5">Type & Table</th>
                  <th className="px-6 py-3.5">Items Summary</th>
                  <th className="px-6 py-3.5 text-right">Subtotal</th>
                  <th className="px-6 py-3.5 text-center">Status</th>
                  <th className="px-6 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono text-xs font-bold text-slate-900">
                      {order.orderNumber}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5 font-medium text-slate-800">
                        {order.orderType === 'dine-in' ? (
                          <Badge variant="brand" size="sm">
                            Table {order.table?.tableNumber || 'Dine-In'}
                          </Badge>
                        ) : (
                          <Badge variant="default" size="sm">
                            Takeaway
                          </Badge>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-600">
                      {order.items.map((i) => `${i.name} (x${i.quantity})`).join(', ')}
                    </td>
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      ₹{order.subtotal?.toFixed(2)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Badge variant="success" size="sm">
                        {order.status}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setViewingOrder(order);
                          setIsAddingItemsToActive(false);
                          setExtraCart([]);
                        }}
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                ))}
                {orders.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-sm text-slate-400">
                      No running orders active right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ========================================================================= */}
      {/* 2-COLUMN COMMERCIAL POS ORDER PUNCHING MODAL                               */}
      {/* ========================================================================= */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title={
          orderType === 'dine-in'
            ? `New Order: Table ${selectedTable?.tableNumber}`
            : 'New Takeaway Order'
        }
        subtitle="Select dishes from menu to punch ticket and send to kitchen"
        maxWidth="max-w-5xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
          {/* Left Column: Menu Catalog (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-3 border-r lg:pr-6 border-slate-100">
            {/* Search and Category Filter */}
            <div className="space-y-2">
              <Input
                placeholder="Search dish name..."
                icon={Search}
                value={menuSearch}
                onChange={(e) => setMenuSearch(e.target.value)}
              />

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-2.5 py-1 text-xs font-semibold rounded-md shrink-0 transition-colors ${
                      selectedCategory === cat
                        ? 'bg-brand-500 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Dishes Grid */}
            <div className="flex-1 overflow-y-auto max-h-[380px] grid grid-cols-1 sm:grid-cols-2 gap-2.5 pr-1">
              {filteredDishes.map((dish) => {
                const cartItem = cart.find((i) => i._id === dish._id);
                return (
                  <div
                    key={dish._id}
                    onClick={() => handleAddToCart(dish)}
                    className="p-3 rounded-xl border border-slate-200 hover:border-brand-500 bg-white hover:bg-brand-50/20 transition-all cursor-pointer flex flex-col justify-between group shadow-2xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 mb-1">
                        <div
                          className={`w-3.5 h-3.5 border flex items-center justify-center shrink-0 rounded-2xs ${
                            dish.foodType === 'veg'
                              ? 'border-emerald-600'
                              : 'border-rose-600'
                          }`}
                        >
                          <div
                            className={`w-1.5 h-1.5 rounded-full ${
                              dish.foodType === 'veg'
                                ? 'bg-emerald-600'
                                : 'bg-rose-600'
                            }`}
                          />
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 group-hover:text-brand-600 transition-colors leading-tight">
                          {dish.name}
                        </h4>
                      </div>
                      <span className="text-[10px] text-slate-400">{dish.category}</span>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between">
                      <span className="font-extrabold text-sm text-slate-900">
                        ₹{dish.price.toFixed(2)}
                      </span>
                      {cartItem ? (
                        <span className="px-2 py-0.5 rounded-full bg-brand-500 text-white font-bold text-xs">
                          {cartItem.quantity} in Ticket
                        </span>
                      ) : (
                        <span className="text-xs font-semibold text-brand-600 group-hover:underline">
                          + Add
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Order Ticket / Cart (5 cols) */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-sm font-bold text-slate-900">Order Ticket</h4>
                  <p className="text-[11px] text-slate-500">
                    {orderType === 'dine-in'
                      ? `Table: ${selectedTable?.tableNumber}`
                      : 'Takeaway Order'}
                  </p>
                </div>
                <Badge variant={orderType === 'dine-in' ? 'brand' : 'default'} size="sm">
                  {orderType}
                </Badge>
              </div>

              {orderError && (
                <div className="mt-2 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}

              {/* Items in Cart */}
              <div className="mt-3 overflow-y-auto max-h-[300px] space-y-2 pr-1">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500">
                        ₹{item.price.toFixed(2)} each
                      </p>
                    </div>

                    {/* Qty +/- Controls */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQty(item._id, -1)}
                        className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleUpdateCartQty(item._id, 1)}
                        className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-900">
                        ₹{item.total.toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleRemoveFromCart(item._id)}
                        className="text-[11px] text-rose-500 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="py-12 text-center text-slate-400">
                    <UtensilsCrossed className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="text-xs font-semibold text-slate-600">Cart is Empty</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Click any dish on the left to add items to ticket
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Ticket Footer */}
            <div className="pt-3 border-t border-slate-100 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-semibold text-slate-600">Subtotal</span>
                <span className="font-extrabold text-base text-slate-900">
                  ₹{cartSubtotal.toFixed(2)}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsOrderModalOpen(false)}
                  className="w-1/3"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="md"
                  disabled={cart.length === 0}
                  loading={submittingOrder}
                  onClick={handleConfirmOrder}
                  className="w-2/3 font-bold"
                  icon={CheckCircle2}
                >
                  Punch Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* ========================================================================= */}
      {/* ACTIVE RUNNING ORDER MANAGEMENT MODAL                                    */}
      {/* ========================================================================= */}
      <Modal
        isOpen={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        title={`Running Order: ${viewingOrder?.orderNumber}`}
        subtitle={`Type: ${viewingOrder?.orderType.toUpperCase()} ${
          viewingOrder?.table?.tableNumber ? `(Table ${viewingOrder.table.tableNumber})` : ''
        }`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Order Details Header */}
          <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-between text-xs">
            <div>
              <span className="text-slate-500">Punched by: </span>
              <strong className="text-slate-800">{viewingOrder?.cashier?.name}</strong>
            </div>
            <div>
              <span className="text-slate-500">Order Time: </span>
              <strong className="text-slate-800">
                {new Date(viewingOrder?.createdAt).toLocaleTimeString()}
              </strong>
            </div>
          </div>

          {/* Current Items List */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
              Dishes in Current Ticket
            </h4>
            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {viewingOrder?.items?.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 flex items-center justify-between text-sm bg-white"
                >
                  <div>
                    <p className="font-semibold text-slate-800">{item.name}</p>
                    <p className="text-xs text-slate-500">
                      ₹{item.price.toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <span className="font-bold text-slate-900">
                    ₹{(item.total || item.price * item.quantity).toFixed(2)}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 flex items-center justify-between px-2">
              <span className="text-sm font-semibold text-slate-600">Current Subtotal:</span>
              <span className="text-lg font-extrabold text-slate-900">
                ₹{viewingOrder?.subtotal?.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Section: Append Extra Dishes (KOT) */}
          {isAddingItemsToActive ? (
            <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-800">
                  Select Extra Dishes to Append:
                </h4>
                <button
                  onClick={() => setIsAddingItemsToActive(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel Append
                </button>
              </div>

              {/* Dish Selector grid */}
              <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                {menuItems.map((dish) => (
                  <button
                    key={dish._id}
                    onClick={() => handleAddExtraToOrder(dish)}
                    className="p-2 text-left bg-white rounded-lg border border-slate-200 hover:border-brand-500 flex items-center justify-between text-xs"
                  >
                    <span className="font-semibold text-slate-800 truncate mr-1">
                      {dish.name}
                    </span>
                    <span className="font-bold text-slate-900 shrink-0">₹{dish.price}</span>
                  </button>
                ))}
              </div>

              {extraCart.length > 0 && (
                <div className="pt-2 border-t border-emerald-200">
                  <p className="text-xs font-bold text-emerald-900 mb-1">
                    Appending: {extraCart.map((c) => `${c.name} (x${c.quantity})`).join(', ')}
                  </p>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    loading={actionLoading}
                    onClick={handleConfirmExtraItems}
                  >
                    Confirm & Append Items to Ticket
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              icon={Plus}
              onClick={() => setIsAddingItemsToActive(true)}
              className="w-full"
            >
              Add More Dishes to this Table (KOT Append)
            </Button>
          )}

          {/* Modal Action Buttons */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleCancelActiveOrder(viewingOrder._id)}
              loading={actionLoading}
            >
              Cancel Order
            </Button>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewingOrder(null)}
              >
                Close
              </Button>
              <Button
                variant="primary"
                size="sm"
                icon={Receipt}
                onClick={() => {
                  const targetOrderId = viewingOrder._id;
                  setViewingOrder(null);
                  navigate(`/billing?orderId=${targetOrderId}`);
                }}
              >
                Proceed to Billing & Checkout
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
