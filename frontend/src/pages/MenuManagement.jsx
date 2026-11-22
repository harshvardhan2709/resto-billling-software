import React, { useEffect, useState } from 'react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import api from '../services/api';
import {
  Plus,
  Search,
  BookOpen,
  Edit2,
  Trash2,
  Check,
  AlertTriangle,
  Filter,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';

export const MenuManagement = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedFoodType, setSelectedFoodType] = useState('All');
  const [selectedAvailability, setSelectedAvailability] = useState('All');
  const [search, setSearch] = useState('');

  // Modal states
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Form inputs
  const [formData, setFormData] = useState({
    name: '',
    category: 'Starters',
    price: '',
    foodType: 'veg',
    isAvailable: true,
  });

  const categories = [
    'All',
    'Starters',
    'Main Course',
    'Breads',
    'Biryani',
    'Beverages',
    'Desserts',
  ];

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
    setFormData({
      name: '',
      category: 'Starters',
      price: '',
      foodType: 'veg',
      isAvailable: true,
    });
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
      setFormError('Please enter dish name and valid price');
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
      setItems((prev) =>
        prev.map((i) => (i._id === item._id ? res.data.data : i))
      );
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

  // Filtered view
  const filteredItems = items.filter((item) => {
    const matchesCategory =
      selectedCategory === 'All' || item.category === selectedCategory;
    const matchesFoodType =
      selectedFoodType === 'All' || item.foodType === selectedFoodType;
    const matchesAvailability =
      selectedAvailability === 'All' ||
      (selectedAvailability === 'Available' && item.isAvailable) ||
      (selectedAvailability === 'Unavailable' && !item.isAvailable);
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());

    return (
      matchesCategory &&
      matchesFoodType &&
      matchesAvailability &&
      matchesSearch
    );
  });

  const vegCount = items.filter((i) => i.foodType === 'veg').length;
  const nonVegCount = items.filter((i) => i.foodType === 'non-veg').length;
  const unavailableCount = items.filter((i) => !i.isAvailable).length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-900 tracking-tight">
              Menu Management
            </h2>
            <Badge variant="brand" size="sm">
              Admin Terminal
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure dishes, categories, pricing, and stock status across your catalog
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            icon={RefreshCw}
            onClick={fetchMenu}
            loading={loading}
          >
            Sync Menu
          </Button>
          <Button
            variant="primary"
            size="sm"
            icon={Plus}
            onClick={handleOpenAddModal}
          >
            Add New Dish
          </Button>
        </div>
      </div>

      {/* Catalog Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Total Dishes
          </p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{items.length}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
            Vegetarian
          </p>
          <p className="text-2xl font-bold text-emerald-700 mt-1">{vegCount}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
            Non-Veg
          </p>
          <p className="text-2xl font-bold text-rose-700 mt-1">{nonVegCount}</p>
        </div>
        <div className="p-4 bg-white rounded-xl border border-slate-200/80 shadow-2xs">
          <p className="text-xs font-semibold text-amber-600 uppercase tracking-wider">
            Out of Stock
          </p>
          <p className="text-2xl font-bold text-amber-700 mt-1">{unavailableCount}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <Card className="p-4">
        <div className="space-y-3">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1">
              Category:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg shrink-0 transition-all ${
                  selectedCategory === cat
                    ? 'bg-brand-500 text-white shadow-xs font-semibold'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          <div className="pt-2 border-t border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-3">
            {/* Search Input */}
            <div className="flex-1 max-w-md">
              <Input
                placeholder="Search dish by name..."
                icon={Search}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Additional Filter Selectors */}
            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Type:</span>
                <select
                  value={selectedFoodType}
                  onChange={(e) => setSelectedFoodType(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="All">All Types</option>
                  <option value="veg">Veg Only</option>
                  <option value="non-veg">Non-Veg Only</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span>Status:</span>
                <select
                  value={selectedAvailability}
                  onChange={(e) => setSelectedAvailability(e.target.value)}
                  className="bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-brand-500"
                >
                  <option value="All">All Status</option>
                  <option value="Available">Available Only</option>
                  <option value="Unavailable">Out of Stock</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Dishes Table */}
      <Card className="p-0 overflow-hidden shadow-sm">
        {loading ? (
          <LoadingSpinner text="Retrieving dishes..." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Dish Name</th>
                  <th className="px-6 py-3.5">Category</th>
                  <th className="px-6 py-3.5">Food Type</th>
                  <th className="px-6 py-3.5 text-right">Price (₹)</th>
                  <th className="px-6 py-3.5 text-center">Availability</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    {/* Dish Name */}
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2.5">
                        {/* Food Type Indicator (FSSAI standard green/red icon) */}
                        <div
                          className={`w-4 h-4 border flex items-center justify-center shrink-0 rounded-xs ${
                            item.foodType === 'veg'
                              ? 'border-emerald-600'
                              : 'border-rose-600'
                          }`}
                          title={item.foodType === 'veg' ? 'Vegetarian' : 'Non-Vegetarian'}
                        >
                          <div
                            className={`w-2 h-2 rounded-full ${
                              item.foodType === 'veg'
                                ? 'bg-emerald-600'
                                : 'bg-rose-600'
                            }`}
                          />
                        </div>
                        <span className="font-semibold text-slate-900 group-hover:text-brand-600 transition-colors">
                          {item.name}
                        </span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-md">
                        {item.category}
                      </span>
                    </td>

                    {/* Food Type */}
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs capitalize font-medium ${
                          item.foodType === 'veg'
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                        }`}
                      >
                        {item.foodType}
                      </span>
                    </td>

                    {/* Price */}
                    <td className="px-6 py-4 text-right font-bold text-slate-900">
                      ₹{item.price.toFixed(2)}
                    </td>

                    {/* Availability Toggle */}
                    <td className="px-6 py-4 text-center">
                      <button
                        type="button"
                        onClick={() => handleToggleAvailability(item)}
                        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border transition-all cursor-pointer ${
                          item.isAvailable
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                            : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            item.isAvailable ? 'bg-emerald-500' : 'bg-slate-400'
                          }`}
                        />
                        {item.isAvailable ? 'In Stock' : 'Disabled'}
                      </button>
                    </td>

                    {/* Action Buttons */}
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-brand-600 hover:bg-brand-50 transition-colors"
                          title="Edit Dish"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmItem(item)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Dish"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredItems.length === 0 && (
                  <tr>
                    <td
                      colSpan="6"
                      className="text-center py-12 text-sm text-slate-400"
                    >
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                      No menu items match your selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Add / Edit Item Modal */}
      <Modal
        isOpen={isFormModalOpen}
        onClose={() => setIsFormModalOpen(false)}
        title={editingItem ? 'Edit Menu Item' : 'Add New Menu Item'}
        subtitle={
          editingItem
            ? `Updating properties for ${editingItem.name}`
            : 'Register a new dish to the restaurant catalog'
        }
      >
        <form onSubmit={handleFormSubmit} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs font-medium text-rose-700">
              {formError}
            </div>
          )}

          <Input
            label="Dish Name *"
            placeholder="e.g. Paneer Tikka Masala"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            required
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Category *
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({ ...formData, category: e.target.value })
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
              >
                {categories
                  .filter((c) => c !== 'All')
                  .map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1.5">
                Price (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                placeholder="250"
                value={formData.price}
                onChange={(e) =>
                  setFormData({ ...formData, price: e.target.value })
                }
                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Food Type *
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
                  onChange={() =>
                    setFormData({ ...formData, foodType: 'veg' })
                  }
                  className="text-emerald-600 focus:ring-emerald-500"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                <span>Vegetarian</span>
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
                  onChange={() =>
                    setFormData({ ...formData, foodType: 'non-veg' })
                  }
                  className="text-rose-600 focus:ring-rose-500"
                />
                <span className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                <span>Non-Vegetarian</span>
              </label>
            </div>
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isAvailable}
                onChange={(e) =>
                  setFormData({ ...formData, isAvailable: e.target.checked })
                }
                className="w-4 h-4 rounded text-brand-600 focus:ring-brand-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Item is available immediately in POS ordering menu
              </span>
            </label>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFormModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={formSubmitting}
            >
              {editingItem ? 'Save Changes' : 'Create Dish'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirmItem}
        onClose={() => setDeleteConfirmItem(null)}
        title="Confirm Dish Removal"
        subtitle="This action will delete the item from the active menu catalog."
      >
        <div className="space-y-4">
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-800">
              <p className="font-semibold">
                Delete "{deleteConfirmItem?.name}"?
              </p>
              <p className="mt-1">
                Existing order snapshots and historical bills will remain unaffected.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmItem(null)}
            >
              Keep Item
            </Button>
            <Button variant="danger" size="sm" onClick={handleDeleteItem}>
              Delete Dish
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
