import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import api from '../services/api';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';

export const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFoodType, setSelectedFoodType] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState('All');
  const [search, setSearch] = useState('');

  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    category: 'Starters',
    price: '',
    foodType: 'veg',
    isAvailable: true,
  });

  const categories = ['All', 'Starters', 'Main Course', 'Breads', 'Biryani', 'Beverages', 'Desserts'];

  const fetchMenu = async () => {
    try {
      setLoading(true);
      const res = await api.get('/menu');
      setItems(res.data.data || []);
    } catch (err) {
      console.error('Error fetching menu items:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({ name: '', category: 'Starters', price: '', foodType: 'veg', isAvailable: true });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      category: item.category,
      price: item.price,
      foodType: item.foodType,
      isAvailable: item.isAvailable,
    });
    setFormError('');
    setIsFormModalOpen(true);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || formData.price === '') {
      setFormError('Please enter dish name and price');
      return;
    }

    try {
      setFormSubmitting(true);
      setFormError('');

      const payload = {
        name: formData.name.trim(),
        category: formData.category,
        price: Number(formData.price),
        foodType: formData.foodType,
        isAvailable: formData.isAvailable,
      };

      if (editingItem) {
        await api.put(`/menu/${editingItem._id}`, payload);
      } else {
        await api.post('/menu', payload);
      }

      setIsFormModalOpen(false);
      await fetchMenu();
    } catch (err) {
      setFormError(err.message || 'Failed to save menu item');
    } finally {
      setFormSubmitting(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      const res = await api.patch(`/menu/${item._id}/toggle-availability`);
      setItems((prev) => prev.map((i) => (i._id === item._id ? res.data.data : i)));
    } catch (err) {
      console.error('Failed to toggle availability', err);
    }
  };

  const handleDeleteItem = async () => {
    if (!deleteConfirmItem) return;
    try {
      await api.delete(`/menu/${deleteConfirmItem._id}`);
      setDeleteConfirmItem(null);
      await fetchMenu();
    } catch (err) {
      console.error('Failed to delete menu item', err);
    }
  };

  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesFoodType = selectedFoodType === 'All' || item.foodType === selectedFoodType;
    const matchesAvailability =
      selectedAvailability === 'All' ||
      (selectedAvailability === 'Available' && item.isAvailable) ||
      (selectedAvailability === 'Unavailable' && !item.isAvailable);
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesFoodType && matchesAvailability && matchesSearch;
  });

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h2 className="text-lg font-semibold text-slate-900">Menu Management</h2>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" icon={RefreshCw} onClick={fetchMenu} loading={loading}>
            Refresh
          </Button>
          <Button variant="primary" size="sm" icon={Plus} onClick={handleOpenAddModal}>
            Add Item
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200/80 shadow-sm p-4 space-y-3">
        {/* Category pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2.5 py-1.5 text-xs font-medium rounded-md shrink-0 transition-colors ${
                selectedCategory === cat
                  ? 'bg-brand-500 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex-1 max-w-md">
            <Input
              placeholder="Search by name..."
              icon={Search}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <select
              value={selectedFoodType}
              onChange={(e) => setSelectedFoodType(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Types</option>
              <option value="veg">Veg</option>
              <option value="non-veg">Non-Veg</option>
            </select>
            <select
              value={selectedAvailability}
              onChange={(e) => setSelectedAvailability(e.target.value)}
              className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="All">All Status</option>
              <option value="Available">Available</option>
              <option value="Unavailable">Out of Stock</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <Card className="p-0 overflow-hidden">
        {loading ? (
          <LoadingSpinner text="Loading menu..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3">Name</th>
                  <th className="px-5 py-3">Category</th>
                  <th className="px-5 py-3">Type</th>
                  <th className="px-5 py-3 text-right">Price</th>
                  <th className="px-5 py-3 text-center">Availability</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item._id} className="hover:bg-slate-50/50 group">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            item.foodType === 'veg' ? 'bg-emerald-500' : 'bg-rose-500'
                          }`}
                        />
                        <span className="font-medium text-slate-800">{item.name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                        {item.category}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs capitalize ${
                        item.foodType === 'veg' ? 'text-emerald-700' : 'text-rose-700'
                      }`}>
                        {item.foodType}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right font-semibold text-slate-800">
                      ₹{item.price.toFixed(2)}
                    </td>
                    <td className="px-5 py-3 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(item)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-colors cursor-pointer ${
                          item.isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                        {item.isAvailable ? 'In Stock' : 'Out'}
                      </button>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredItems.length === 0 && (
                  <tr>
                    <td colSpan="6" className="text-center py-10 text-sm text-slate-400">
                      No items match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingItem ? 'Edit Menu Item' : 'Add Menu Item'}
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700">
              {formError}
            </div>
          )}

          <Input
            label="Name"
            placeholder="e.g. Paneer Tikka Masala"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {categories.filter((c) => c !== 'All').map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Price (₹)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="250"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Food Type
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.foodType === 'veg'
                    ? 'border-emerald-500 bg-emerald-50/50 text-emerald-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="foodType"
                  value="veg"
                  checked={formData.foodType === 'veg'}
                  onChange={() => setFormData({ ...formData, foodType: 'veg' })}
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="w-2 h-2 rounded-full bg-emerald-600" />
                <span>Veg</span>
              </label>
              <label
                className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-colors ${
                  formData.foodType === 'non-veg'
                    ? 'border-rose-500 bg-rose-50/50 text-rose-900 font-semibold'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <input
                  type="radio"
                  name="foodType"
                  value="non-veg"
                  checked={formData.foodType === 'non-veg'}
                  onChange={() => setFormData({ ...formData, foodType: 'non-veg' })}
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="w-2 h-2 rounded-full bg-rose-600" />
                <span>Non-Veg</span>
              </label>
            </div>
          </div>

          <label className="flex items-center gap-2.5 cursor-pointer pt-1">
            <input
              type="checkbox"
              checked={formData.isAvailable}
              onChange={(e) => setFormData({ ...formData, isAvailable: e.target.checked })}
              className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
            />
            <span className="text-xs font-medium text-slate-700">Available for ordering</span>
          </label>

          <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsFormModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" loading={formSubmitting}>
              {editingItem ? 'Save' : 'Create'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation */}
      <Modal
        isOpen={!!deleteConfirmItem}
        onClose={() => setDeleteConfirmItem(null)}
        title="Delete Item"
      >
        <div className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold">Delete "{deleteConfirmItem?.name}"?</p>
              <p className="mt-1">Historical bills will not be affected.</p>
            </div>
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setDeleteConfirmItem(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteItem}>
              Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
