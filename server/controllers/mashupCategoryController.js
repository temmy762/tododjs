import MashupCategory from '../models/MashupCategory.js';
import Mashup from '../models/Mashup.js';

// @desc  Get all active mashup categories with live mashup counts
// @route GET /api/mashup-categories
// @access Public
export const getMashupCategories = async (req, res) => {
  try {
    const includeInactive = req.query.all === 'true' && req.user?.role === 'admin';
    const filter = includeInactive ? {} : { isActive: true };
    const categories = await MashupCategory.find(filter).sort('sortOrder name').lean();

    const [mashupCounts, totalMashups] = await Promise.all([
      Mashup.aggregate([
        { $match: { isPublished: true, category: { $nin: [null, 'Others', ''] } } },
        { $group: { _id: '$category', count: { $sum: 1 } } }
      ]),
      Mashup.countDocuments({ isPublished: true })
    ]);
    const countMap = Object.fromEntries(mashupCounts.map(c => [c._id, c.count]));

    const data = categories.map(c => ({
      ...c,
      mashupCount: countMap[c.name] || 0
    }));

    res.json({ success: true, data, totalMashups });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// @desc  Create mashup category
// @route POST /api/mashup-categories
// @access Admin
export const createMashupCategory = async (req, res) => {
  try {
    const { name, description, color, thumbnail, sortOrder } = req.body;
    const category = await MashupCategory.create({
      name, description, color, thumbnail, sortOrder,
      createdBy: req.user.id
    });
    res.status(201).json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc  Update mashup category
// @route PUT /api/mashup-categories/:id
// @access Admin
export const updateMashupCategory = async (req, res) => {
  try {
    const category = await MashupCategory.findById(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    const { name, description, color, thumbnail, sortOrder, isActive } = req.body;
    if (name       !== undefined) category.name        = name;
    if (description !== undefined) category.description = description;
    if (color      !== undefined) category.color       = color;
    if (thumbnail  !== undefined) category.thumbnail   = thumbnail;
    if (sortOrder  !== undefined) category.sortOrder   = sortOrder;
    if (isActive   !== undefined) category.isActive    = isActive;
    await category.save();
    res.json({ success: true, data: category });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// @desc  Delete mashup category
// @route DELETE /api/mashup-categories/:id
// @access Admin
export const deleteMashupCategory = async (req, res) => {
  try {
    const category = await MashupCategory.findByIdAndDelete(req.params.id);
    if (!category) return res.status(404).json({ success: false, message: 'Category not found' });
    res.json({ success: true, message: 'Mashup category deleted' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};
