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
  Receipt,
  AlertCircle,
  RefreshCw,
  X,
} from 'lucide-react';

export const Tables = () => {
  const navigate = useNavigate();
  const [tables, setTables] = useState([]);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('floor');

  // New Order state
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [selectedTable, setSelectedTable] = useState(null);
  const [orderType, setOrderType] = useState('dine-in');
  const [cart, setCart] = useState([]);
  const [menuSearch, setMenuSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [submittingOrder, setSubmittingOrder] = useState(false);
  const [orderError, setOrderError] = useState('');

  // Running order modal state
  const [viewingOrder, setViewingOrder] = useState(null);
  const [isAddingItemsToActive, setIsAddingItemsToActive] = useState(false);
  const [extraCart, setExtraCart] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);

  const categories = ['All', 'Starters', 'Main Course', 'Breads', 'Biryani', 'Beverages', 'Desserts'];

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

  const handleStartOrder = (table = null, type = 'dine-in') => {
    setSelectedTable(table);
    setOrderType(type);
    setCart([]);
    setMenuSearch('');
    setSelectedCategory('All');
    setOrderError('');
    setIsOrderModalOpen(true);
  };

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

  const handleOpenRunningTable = (table) => {
    const activeOrder =
      table.currentOrder ||
      orders.find(
        (o) => (o.table?._id || o.table)?.toString() === table._id?.toString()
      );
    if (activeOrder) {
      setViewingOrder(activeOrder);
      setIsAddingItemsToActive(false);
      setExtraCart([]);
    }
  };

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

  const handleUpdateExtraCartQty = (dishId, delta) => {
    setExtraCart((prev) =>
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

  const handleRemoveExtraCartItem = (dishId) => {
    setExtraCart((prev) => prev.filter((i) => i._id !== dishId));
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

  const handleCancelActiveOrder = async (orderId) => {
    if (!window.confirm('Cancel this order? The table will be marked free.')) {
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

  const filteredDishes = menuItems.filter((dish) => {
    const matchesCategory = selectedCategory === 'All' || dish.category === selectedCategory;
    const matchesSearch = dish.name.toLowerCase().includes(menuSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const freeCount = tables.filter((t) => t.status === 'free').length;
  const runningCount = tables.filter((t) => t.status === 'running').length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold text-slate-900">Tables & Orders</h2>
          <div className="flex bg-slate-100 p-0.5 rounded-lg">
            <button
              onClick={() => setActiveTab('floor')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'floor'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Floor ({freeCount} Free)
            </button>
            <button
              onClick={() => setActiveTab('orders')}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                activeTab === 'orders'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Orders ({orders.length})
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchFloorData} loading={loading}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" icon={ShoppingBag} onClick={() => handleStartOrder(null, 'takeaway')}>
            Takeaway
          </Button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingSpinner text="Loading floor data..." />
      ) : activeTab === 'floor' ? (
        /* Table Grid */
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {tables.map((table) => {
            const isFree = table.status === 'free';
            const activeOrder =
              table.currentOrder ||
              orders.find(
                (o) => (o.table?._id || o.table)?.toString() === table._id?.toString()
              );

            return (
              <div
                key={table._id}
                onClick={() =>
                  isFree ? handleStartOrder(table, 'dine-in') : handleOpenRunningTable(table)
                }
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                  isFree
                    ? 'bg-white border-slate-200 hover:border-brand-500'
                    : 'bg-emerald-50/60 border-emerald-300 hover:border-emerald-400'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-base text-slate-900">{table.tableNumber}</span>
                  <span
                    className={`w-2 h-2 rounded-full ${
                      isFree ? 'bg-slate-300' : 'bg-emerald-500'
                    }`}
                  />
                </div>
                {isFree ? (
                  <p className="text-xs text-slate-400">Available</p>
                ) : (
                  <div>
                    <p className="text-sm font-semibold text-emerald-800">
                      ₹{activeOrder?.subtotal?.toFixed(2) || '0.00'}
                    </p>
                    <p className="text-[11px] text-emerald-600">
                      {activeOrder?.items?.reduce((s, i) => s + i.quantity, 0) || 0} items
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        /* Orders List */
        <Card className="p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Order #</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3">Items</th>
                  <th className="px-5 py-3 text-right">Subtotal</th>
                  <th className="px-5 py-3 text-center">Status</th>
                  <th className="px-5 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((order) => (
                  <tr key={order._id} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3 font-mono text-xs font-semibold text-slate-800">
                      {order.orderNumber}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-600">
                      {order.orderType === 'dine-in'
                        ? `Table ${order.table?.tableNumber || ''}`
                        : 'Takeaway'}
                    </td>
                    <td className="px-5 py-3 text-xs text-slate-500">
                      {order.items.map((i) => `${i.name} ×${i.quantity}`).join(', ')}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800 text-xs">
                      ₹{order.subtotal?.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <Badge variant="success" size="sm">{order.status}</Badge>
                    </td>
                    <td className="px-5 py-3 text-right">
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
                    <td colSpan="6" className="text-center py-10 text-sm text-slate-400">
                      No running orders.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* ORDER PUNCHING MODAL */}
      <Modal
        isOpen={isOrderModalOpen}
        onClose={() => setIsOrderModalOpen(false)}
        title={
          orderType === 'dine-in'
            ? `New Order — Table ${selectedTable?.tableNumber}`
            : 'New Takeaway Order'
        }
        maxWidth="max-w-5xl"
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[460px]">
          {/* Menu Catalog */}
          <div className="lg:col-span-7 flex flex-col space-y-3 lg:border-r lg:pr-5 border-slate-100">
            <Input
              placeholder="Search menu..."
              icon={Search}
              value={menuSearch}
              onChange={(e) => setMenuSearch(e.target.value)}
            />

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 text-xs font-medium rounded-md shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-brand-500 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto max-h-[360px] grid grid-cols-1 sm:grid-cols-2 gap-2 pr-1">
              {filteredDishes.map((dish) => {
                const cartItem = cart.find((i) => i._id === dish._id);
                return (
                  <div
                    key={dish._id}
                    onClick={() => handleAddToCart(dish)}
                    className="p-3 rounded-lg border border-slate-200 hover:border-brand-400 bg-white cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            dish.foodType === 'veg' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="text-xs font-semibold text-slate-800 truncate">
                          {dish.name}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400">{dish.category}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-slate-800">₹{dish.price}</span>
                      {cartItem && (
                        <span className="ml-1.5 px-1.5 py-0.5 rounded bg-brand-500 text-white font-semibold text-[10px]">
                          {cartItem.quantity}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cart */}
          <div className="lg:col-span-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
                <h4 className="text-sm font-semibold text-slate-900">Order Ticket</h4>
                <span className="text-xs text-slate-500">
                  {orderType === 'dine-in' ? `Table ${selectedTable?.tableNumber}` : 'Takeaway'}
                </span>
              </div>

              {orderError && (
                <div className="mb-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{orderError}</span>
                </div>
              )}

              <div className="overflow-y-auto max-h-[280px] space-y-2 pr-1">
                {cart.map((item) => (
                  <div
                    key={item._id}
                    className="p-2.5 bg-slate-50 rounded-lg flex items-center justify-between gap-2"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-slate-800 truncate">{item.name}</p>
                      <p className="text-[11px] text-slate-500">₹{item.price} each</p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleUpdateCartQty(item._id, -1); }}
                        className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="w-6 text-center text-xs font-bold text-slate-800">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleUpdateCartQty(item._id, 1); }}
                        className="w-6 h-6 rounded bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:bg-slate-100"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">₹{item.total.toFixed(2)}</p>
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleRemoveFromCart(item._id); }}
                        className="text-[11px] text-rose-500 hover:text-rose-700"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {cart.length === 0 && (
                  <div className="py-10 text-center text-slate-400">
                    <p className="text-xs">Select items from the menu to add</p>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="pt-3 border-t border-slate-100 space-y-3 mt-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-slate-600">Subtotal</span>
                <span className="font-bold text-slate-900">₹{cartSubtotal.toFixed(2)}</span>
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
                  className="w-2/3"
                  icon={CheckCircle2}
                >
                  Place Order
                </Button>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* RUNNING ORDER MODAL */}
      <Modal
        isOpen={!!viewingOrder}
        onClose={() => setViewingOrder(null)}
        title={`Order ${viewingOrder?.orderNumber}`}
        subtitle={`${viewingOrder?.orderType === 'dine-in' ? `Table ${viewingOrder?.table?.tableNumber || ''}` : 'Takeaway'}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          {/* Order info */}
          <div className="flex items-center justify-between text-xs text-slate-500">
            <span>Cashier: <strong className="text-slate-700">{viewingOrder?.cashier?.name}</strong></span>
            <span>{new Date(viewingOrder?.createdAt).toLocaleTimeString()}</span>
          </div>

          {/* Items */}
          <div className="border border-slate-200 rounded-lg overflow-hidden divide-y divide-slate-100">
            {viewingOrder?.items?.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between text-sm bg-white">
                <div>
                  <p className="font-medium text-slate-800">{item.name}</p>
                  <p className="text-xs text-slate-500">₹{item.price.toFixed(2)} × {item.quantity}</p>
                </div>
                <span className="font-semibold text-slate-800">
                  ₹{(item.total || item.price * item.quantity).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium text-slate-600">Subtotal</span>
            <span className="text-lg font-bold text-slate-900">₹{viewingOrder?.subtotal?.toFixed(2)}</span>
          </div>

          {/* Add items section */}
          {isAddingItemsToActive ? (
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold text-slate-700">Add Items</h4>
                <button
                  onClick={() => setIsAddingItemsToActive(false)}
                  className="text-xs text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
              </div>
              <div className="max-h-48 overflow-y-auto grid grid-cols-2 gap-2">
                {menuItems.map((dish) => (
                  <button
                    key={dish._id}
                    onClick={() => handleAddExtraToOrder(dish)}
                    className="p-2 text-left bg-white rounded-lg border border-slate-200 hover:border-brand-400 flex items-center justify-between text-xs"
                  >
                    <span className="font-medium text-slate-800 truncate mr-1">{dish.name}</span>
                    <span className="font-bold text-slate-800 shrink-0">₹{dish.price}</span>
                  </button>
                ))}
              </div>
              {extraCart.length > 0 && (
                <div className="pt-2 border-t border-slate-200 space-y-2">
                  <p className="text-xs font-semibold text-slate-700">Items to add:</p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {extraCart.map((c) => (
                      <div key={c._id} className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-200">
                        <span className="font-medium text-slate-800 truncate mr-2">{c.name}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleUpdateExtraCartQty(c._id, -1)}
                            className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                          >
                            <Minus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-5 text-center font-bold text-slate-800">{c.quantity}</span>
                          <button
                            type="button"
                            onClick={() => handleUpdateExtraCartQty(c._id, 1)}
                            className="w-5 h-5 rounded bg-slate-100 flex items-center justify-center text-slate-600 hover:bg-slate-200"
                          >
                            <Plus className="w-2.5 h-2.5" />
                          </button>
                          <span className="w-12 text-right font-bold text-slate-800">₹{(c.quantity * c.price).toFixed(2)}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveExtraCartItem(c._id)}
                            className="text-slate-400 hover:text-rose-500 ml-1 p-0.5"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    className="w-full"
                    loading={actionLoading}
                    onClick={handleConfirmExtraItems}
                  >
                    Confirm & Add to Order
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
              Add More Items
            </Button>
          )}

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <Button
              variant="danger"
              size="sm"
              onClick={() => handleCancelActiveOrder(viewingOrder._id)}
              loading={actionLoading}
            >
              Cancel Order
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => setViewingOrder(null)}>
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
                Proceed to Billing
              </Button>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
